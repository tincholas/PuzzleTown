import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const outDir = path.join(rootDir, 'release/ios/screenshots');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Simple local static HTTP server for dist/
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(500);
    res.end('Error reading file: ' + err.message);
  }
});

const PORT = 4173;

async function run() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Static server running at http://127.0.0.1:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  const page = await browser.newPage();

  // iPhone 16 Pro Max viewport: 430 x 932 @ 3x = exactly 1290 x 2796
  await page.setViewport({
    width: 430,
    height: 932,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true
  });

  console.log('Viewport set to 430x932 @ 3x (1290x2796 pixels).');

  // Load levels to create authentic in-progress session
  const levels = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/engine/prebakedLevels.json'), 'utf8')
  );
  const lvl12 = levels.find((l) => l.id === 12);

  // Partial session for Level 12 (mid-game with realistic placements)
  const partialGrid = [
    ['empty', 'empty', 'empty', 'empty', 'house'],
    ['empty', 'empty', 'tree', 'tree', 'empty'],
    ['empty', 'tree', 'woodcutter', 'empty', 'tree'],
    ['empty', 'rock', 'empty', 'rock', 'empty'],
    ['woodcutter', 'tree', 'empty', 'empty', 'empty']
  ];
  const marks = [
    [true, true, true, true, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, true, true, true]
  ];
  const buildingMarks = Array.from({ length: 5 }, () => Array(5).fill(false));
  const excludedByCell = Array.from({ length: 5 }, () =>
    Array.from({ length: 5 }, () => [])
  );
  // Mark column 1 cells as excluded for Woodcutter (since col 1 limit is 0)
  excludedByCell[0][1] = ['woodcutter', 'house'];
  excludedByCell[1][1] = ['woodcutter', 'house'];

  const sampleProgress = {
    currentLevelId: 12,
    starsByLevel: {
      1: 3, 2: 3, 3: 3, 4: 3, 5: 3,
      6: 3, 7: 3, 8: 3, 9: 3, 10: 3, 11: 3
    }
  };

  const sampleSession = {
    levelId: 12,
    grid: partialGrid,
    marks,
    buildingMarks,
    excludedByCell,
    history: [],
    hintsUsed: 0,
    mistakesMade: 0
  };

  // -------------------------------------------------------------------------
  // SCREENSHOT 1: Core Gameplay Board (Level 12 In-Progress)
  // -------------------------------------------------------------------------
  console.log('Capturing Screenshot 1: Core Gameplay Board...');
  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
  await page.evaluate((prog, sess) => {
    localStorage.setItem('puzzletown_progress_v1', JSON.stringify(prog));
    localStorage.setItem('puzzletown_active_session_v1', JSON.stringify(sess));
    localStorage.setItem('puzzletown_sfx_enabled', 'false');
    localStorage.setItem('puzzletown_music_enabled', 'false');
  }, sampleProgress, sampleSession);

  // Reload with state active
  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.board-wrapper');
  await new Promise((r) => setTimeout(r, 600));

  const shot1Path = path.join(outDir, 'screenshot-1-gameplay.png');
  await page.screenshot({ path: shot1Path });
  console.log('✓ Saved screenshot-1-gameplay.png');

  // -------------------------------------------------------------------------
  // SCREENSHOT 2: Neighborhood Building Rules Modal
  // -------------------------------------------------------------------------
  console.log('Capturing Screenshot 2: Neighborhood Rules Modal...');
  const rulesBtn = await page.waitForSelector('button[aria-label="Rules"]');
  if (rulesBtn) {
    await rulesBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    const shot2Path = path.join(outDir, 'screenshot-2-rules.png');
    await page.screenshot({ path: shot2Path });
    console.log('✓ Saved screenshot-2-rules.png');

    // Close rules modal
    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // -------------------------------------------------------------------------
  // SCREENSHOT 3: Smart Step-by-Step Hint Walkthrough
  // -------------------------------------------------------------------------
  console.log('Capturing Screenshot 3: Interactive Hint Walkthrough...');
  const hintBtn = await page.waitForSelector('button[aria-label="Hint"]');
  if (hintBtn) {
    await hintBtn.click();
    await new Promise((r) => setTimeout(r, 600));
    const shot3Path = path.join(outDir, 'screenshot-3-hints.png');
    await page.screenshot({ path: shot3Path });
    console.log('✓ Saved screenshot-3-hints.png');

    // Dismiss or close hint
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 300));
  }

  // -------------------------------------------------------------------------
  // SCREENSHOT 4: Campaign Level Select Modal
  // -------------------------------------------------------------------------
  console.log('Capturing Screenshot 4: Campaign Level Select Modal...');
  const levelBtn = await page.waitForSelector('button[aria-label="Select Level"]');
  if (levelBtn) {
    await levelBtn.click();
    await new Promise((r) => setTimeout(r, 500));
    const shot4Path = path.join(outDir, 'screenshot-4-levels.png');
    await page.screenshot({ path: shot4Path });
    console.log('✓ Saved screenshot-4-levels.png');

    // Close levels modal
    const closeBtn = await page.$('.modal-close-btn');
    if (closeBtn) {
      await closeBtn.click();
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  // -------------------------------------------------------------------------
  // SCREENSHOT 5: Victory Celebration (Village Complete!)
  // -------------------------------------------------------------------------
  console.log('Capturing Screenshot 5: Victory Celebration...');
  // Solution for level 12
  const solvedSession = {
    levelId: 12,
    grid: lvl12.solution,
    marks,
    buildingMarks,
    excludedByCell,
    history: [],
    hintsUsed: 0,
    mistakesMade: 0
  };

  await page.evaluate((sess) => {
    localStorage.setItem('puzzletown_active_session_v1', JSON.stringify(sess));
  }, solvedSession);

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.board-wrapper');
  // Wait for victory modal and confetti animation
  await new Promise((r) => setTimeout(r, 1200));

  const shot5Path = path.join(outDir, 'screenshot-5-victory.png');
  await page.screenshot({ path: shot5Path });
  console.log('✓ Saved screenshot-5-victory.png');

  await browser.close();
  server.close();
  console.log('\nAll 5 authentic in-game screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  server.close();
  process.exit(1);
});
