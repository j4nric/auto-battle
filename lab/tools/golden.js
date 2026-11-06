// Writes golden vectors to tests/golden/. The Godot port must reproduce them exactly.
// Run: node tools/golden.js (from lab/). CI fails if the committed files are stale.
import { writeFileSync, mkdirSync } from 'node:fs';
import { Rng, hashSeed } from '../src/rng.js';

const out = new URL('../../tests/golden/', import.meta.url);
mkdirSync(out, { recursive: true });

const hashes = [
  ['run', 1], ['run', 42], ['monster', 7, 3], ['bench', 99, 2], ['omen', 123456, 12], [''], ['Uhrturm', 'Mitternacht'],
].map((parts) => ({ parts, hash: hashSeed(...parts) }));

const streams = [0, 1, 42, 2147483647, 4294967295].map((seed) => {
  const rng = new Rng(seed);
  // Floats as exact uint32 numerators (float * 2^32): JSON parsers differ in the last bits of
  // decimal fractions, integers are exact everywhere.
  const floats = Array.from({ length: 8 }, () => rng.float() * 4294967296);
  const ints = Array.from({ length: 8 }, () => rng.int(1000));
  return { seed, floats, ints };
});

const file = { generator: 'lab/tools/golden.js', hashes, streams };
writeFileSync(new URL('rng.json', out), JSON.stringify(file, null, 2) + '\n');
console.log(`tests/golden/rng.json: ${hashes.length} hashes, ${streams.length} streams`);
