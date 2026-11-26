import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build100Configs } from '../src/engine/campaignLevels';
import { generateVerifiedLevel } from '../src/engine/generator';
import { LevelDefinition } from '../src/engine/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function main() {
  const outPath = path.join(__dirname, '../src/engine/prebakedLevels.json');
  const existing: LevelDefinition[] = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf-8'))
    : [];
  const existingById = new Map<number, LevelDefinition>();
  for (const lvl of existing) {
    existingById.set(lvl.id, {
      ...lvl,
      inventory: {
        ...lvl.inventory,
        windmill: lvl.inventory.windmill ?? 0
      }
    });
  }

  const configs = build100Configs();
  console.log(`Building ${configs.length} pre-baked verified campaign levels (preserving 1..100)...`);
  const levels: LevelDefinition[] = [];
  const startTime = Date.now();

  for (const cfg of configs) {
    if (cfg.id <= 125 && existingById.has(cfg.id)) {
      levels.push(existingById.get(cfg.id)!);
      continue;
    }
    const seed = cfg.id * 104729 + 7919;
    const lvlStart = Date.now();
    const lvl = generateVerifiedLevel(cfg, seed, 4500);
    levels.push(lvl);
    const ms = Date.now() - lvlStart;
    const densPct = Math.round((lvl.density ?? 0) * 100);
    console.log(
      `[${lvl.id}/${configs.length}] ${lvl.title} (${lvl.size}x${lvl.size}) — ${lvl.difficulty} (Score: ${lvl.difficultyScore}) • Density: ${densPct}% [${ms}ms]`
    );
  }

  fs.writeFileSync(outPath, JSON.stringify(levels, null, 2), 'utf-8');
  console.log(
    `Successfully saved all ${levels.length} levels to ${outPath} in ${Date.now() - startTime}ms!`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
