// Builds the room wiki for the cockpit from game/data/raster.json (the grid rooms, ADR 0008).
// Writes one JSON file per room to lab/sim/output/wiki/rooms/<id>.json; Claude uploads them to the
// cockpit's "rooms" collection. Usage: node tools/wiki.ts
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { content } from '../src/content.ts';
import { RASTER_ROOMS, RASTER_FUSIONS, cellsOf } from '../src/raster/content.ts';
import { price } from '../src/raster/run.ts';

const out = new URL('../sim/output/wiki/rooms/', import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const name = (id: string): string => RASTER_ROOMS[id]?.name ?? id;

/** Shape as text: "1 Feld", "2 Felder, 2×1", "3 Felder, L-Form", "4 Felder, 2×2". */
function shapeText(id: string): string {
  const cells = cellsOf(RASTER_ROOMS[id]);
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const n = cells.length;
  const form = n === 1 ? '' : w * h === n ? `, ${w}×${h}` : ', L-Form';
  return `${n} ${n === 1 ? 'Feld' : 'Felder'}${form}`;
}

Object.values(RASTER_ROOMS).forEach((r, order) => {
  const guild = content.guilds[r.guild];
  const recipe = RASTER_FUSIONS.find((f) => f.result === r.id);
  const partOf = RASTER_FUSIONS.filter((f) => f.parts.some((p) => p.id === r.id)).map((f) => name(f.result));
  const doc = {
    order,
    name: r.name,
    guild: r.guild,
    guildName: guild.name,
    color: guild.color,
    height: cellsOf(r).length,
    shape: shapeText(r.id),
    tags: r.tags,
    text: r.text,
    shop: !r.fusion,
    price: r.fusion ? null : price(r.id),
    madeFrom: recipe ? recipe.parts.map((p) => name(p.id)) : [],
    recipe: recipe ? recipe.text : null,
    partOf,
    contentVersion: 2,
  };
  writeFileSync(new URL(`${r.id}.json`, out), JSON.stringify(doc, null, 2));
});
console.log(`${Object.keys(RASTER_ROOMS).length} Räume nach ${out.pathname}`);
