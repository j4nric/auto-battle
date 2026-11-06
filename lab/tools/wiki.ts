// Builds the room wiki for the cockpit from game/data/content.json.
// Writes one JSON file per room to lab/sim/output/wiki/rooms/<id>.json; Claude uploads them to the
// cockpit's "rooms" collection. Usage: node tools/wiki.ts
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { content, ROOMS, FUSIONS } from '../src/content.ts';
import { price } from '../src/run/run.ts';

const out = new URL('../sim/output/wiki/rooms/', import.meta.url);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const name = (id: string): string => ROOMS[id]?.name ?? id;

content.rooms.forEach((r, order) => {
  const guild = content.guilds[r.guild];
  const madeFrom = FUSIONS.find((f) => f.result === r.id)?.pattern.map(name) ?? [];
  const partOf = FUSIONS.filter((f) => f.pattern.includes(r.id)).map((f) => name(f.result));
  const doc = {
    order,
    name: r.name,
    guild: r.guild,
    guildName: guild.name,
    color: guild.color,
    height: r.height,
    tags: r.tags,
    text: r.text,
    shop: !r.fusion,
    price: r.fusion ? null : price(r.id),
    madeFrom,
    partOf,
    contentVersion: content.version,
  };
  writeFileSync(new URL(`${r.id}.json`, out), JSON.stringify(doc, null, 2));
});
console.log(`${content.rooms.length} Räume nach ${out.pathname}`);
