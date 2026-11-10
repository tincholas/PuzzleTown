import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build100Configs } from '../src/engine/campaignLevels';
import { generateVerifiedLevel } from '../src/engine/generator';
import { LevelDefinition } from '../src/engine/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function main() {
  console.log('Generating 100 dense, pre-baked verified campaign levels...');
  const configs = build100Configs();
  const levels: LevelDefinition[] = [];
  const startTime = Date.now();

  for (const cfg of configs) {
    const seed = cfg.id * 104729 + 7919;
    const lvlStart = Date.now();
    const lvl = generateVerifiedLevel(cfg, seed, 3500);
    levels.push(lvl);
    const ms = Date.now() - lvlStart;
    const densPct = Math.round((lvl.density ?? 0) * 100);
    console.log(
      `[${lvl.id}/100] ${lvl.title} (${lvl.size}x${lvl.size}) — ${lvl.difficulty} (Score: ${lvl.difficultyScore}) • Density: ${densPct}% [${ms}ms]`
    );
  }

  const outPath = path.join(__dirname, '../src/engine/prebakedLevels.json');
  fs.writeFileSync(outPath, JSON.stringify(levels, null, 2), 'utf-8');
  console.log(
    `Successfully generated and saved all 100 levels to ${outPath} in ${Date.now() - startTime}ms!`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
