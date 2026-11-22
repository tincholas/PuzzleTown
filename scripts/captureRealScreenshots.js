import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const baseOutDir = path.join(rootDir, 'release/ios/screenshots');

const PROFILES = [
  {
    id: 'iphone',
    folder: 'iphone_1206x2622',
    viewport: {
      width: 402,
      height: 874,
      deviceScaleFactor: 3, // 402 * 3 = 1206, 874 * 3 = 2622
      isMobile: true,
      hasTouch: true
    },
    expected: '1206x2622'
  },
  {
    id: 'duo',
    folder: 'duo_2007x2853',
    viewport: {
      width: 669,
      height: 951,
      deviceScaleFactor: 3, // 669 * 3 = 2007, 951 * 3 = 2853
      isMobile: true,
      hasTouch: true
    },
    expected: '2007x2853'
  },
  {
    id: 'ipad',
    folder: 'ipad_2064x2752',
    viewport: {
      width: 1032,
      height: 1376,
      deviceScaleFactor: 2, // 1032 * 2 = 2064, 1376 * 2 = 2752
      isMobile: false,
      hasTouch: true
    },
    expected: '2064x2752'
  }
];

// Simple local static HTTP server for dist/
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

  const levels = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'src/engine/prebakedLevels.json'), 'utf8')
  );
  const lvl12 = levels.find((l) => l.id === 12);

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

  for (const profile of PROFILES) {
    const targetDir = path.join(baseOutDir, profile.folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\n========================================`);
    console.log(`Capturing profile: ${profile.id} -> ${profile.expected} (${targetDir})`);
    console.log(`========================================`);

    const page = await browser.newPage();
    await page.setViewport(profile.viewport);

    // 1. Core Gameplay Board
    console.log('Capturing Screenshot 1: Gameplay Board...');
    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await page.evaluate((prog, sess) => {
      localStorage.setItem('puzzletown_progress_v1', JSON.stringify(prog));
      localStorage.setItem('puzzletown_active_session_v1', JSON.stringify(sess));
      localStorage.setItem('puzzletown_sfx_enabled', 'false');
      localStorage.setItem('puzzletown_music_enabled', 'false');
    }, sampleProgress, sampleSession);

    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.board-wrapper');
    await new Promise((r) => setTimeout(r, 600));

    await page.screenshot({ path: path.join(targetDir, 'screenshot-1-gameplay.png') });
    console.log(`✓ [${profile.id}] Saved screenshot-1-gameplay.png`);

    // 2. Rules Modal
    console.log('Capturing Screenshot 2: Rules Modal...');
    const rulesBtn = await page.waitForSelector('button[aria-label="Rules"]');
    if (rulesBtn) {
      await rulesBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(targetDir, 'screenshot-2-rules.png') });
      console.log(`✓ [${profile.id}] Saved screenshot-2-rules.png`);

      const closeBtn = await page.$('.modal-close-btn');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    // 3. Hint Walkthrough
    console.log('Capturing Screenshot 3: Hint Walkthrough...');
    const hintBtn = await page.waitForSelector('button[aria-label="Hint"]');
    if (hintBtn) {
      await hintBtn.click();
      await new Promise((r) => setTimeout(r, 600));
      await page.screenshot({ path: path.join(targetDir, 'screenshot-3-hints.png') });
      console.log(`✓ [${profile.id}] Saved screenshot-3-hints.png`);

      await page.keyboard.press('Escape');
      await new Promise((r) => setTimeout(r, 300));
    }

    // 4. Level Select Modal
    console.log('Capturing Screenshot 4: Level Select Modal...');
    const levelBtn = await page.waitForSelector('button[aria-label="Select Level"]');
    if (levelBtn) {
      await levelBtn.click();
      await new Promise((r) => setTimeout(r, 500));
      await page.screenshot({ path: path.join(targetDir, 'screenshot-4-levels.png') });
      console.log(`✓ [${profile.id}] Saved screenshot-4-levels.png`);

      const closeBtn = await page.$('.modal-close-btn');
      if (closeBtn) {
        await closeBtn.click();
        await new Promise((r) => setTimeout(r, 350));
      }
    }

    // 5. Victory Celebration
    console.log('Capturing Screenshot 5: Victory Celebration...');
    await page.evaluate((sess) => {
      localStorage.setItem('puzzletown_active_session_v1', JSON.stringify(sess));
    }, solvedSession);

    await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.board-wrapper');
    await new Promise((r) => setTimeout(r, 1200));

    await page.screenshot({ path: path.join(targetDir, 'screenshot-5-victory.png') });
    console.log(`✓ [${profile.id}] Saved screenshot-5-victory.png`);

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('\nAll profiles captured successfully!');
}

run().catch((err) => {
  console.error('Error during capture:', err);
  server.close();
  process.exit(1);
});
