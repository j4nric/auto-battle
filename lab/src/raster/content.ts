// Raster prototype content (ADR 0008): rooms with shapes for the 3-wide tower.
// Lab only for now; the game keeps the single column until the prototype is decided.
import data from '../../../game/data/raster.json' with { type: 'json' };
import type { RoomDef } from '../content.ts';

export interface ShapedRoomDef extends RoomDef {
  /** Cells [x, y] relative to the room's origin, y pointing up. */
  shape?: Array<[number, number]>;
}
export interface PatternFusion {
  /** Lower room first: pattern[1] must sit directly on top of pattern[0] (same column). */
  pattern: [string, string];
  result: string;
  text: string;
}

const raw = data as unknown as { rooms: ShapedRoomDef[]; fusions: PatternFusion[] };

export const RASTER_ROOMS: Readonly<Record<string, ShapedRoomDef>> = Object.fromEntries(raw.rooms.map((r) => [r.id, r]));
export const RASTER_SHOP: readonly ShapedRoomDef[] = raw.rooms.filter((r) => !r.fusion);
export const RASTER_FUSIONS: readonly PatternFusion[] = raw.fusions;

/**
 * Cells of a room after rotating it `rot` quarter turns clockwise, shifted so the smallest x
 * and y are 0. Rooms without a shape are a single column of `height` cells.
 */
export function cellsOf(def: RoomDef, rot = 0): Array<[number, number]> {
  let cells: Array<[number, number]> = (def as ShapedRoomDef).shape?.map(([x, y]) => [x, y] as [number, number])
    ?? Array.from({ length: def.height }, (_, i) => [0, i] as [number, number]);
  for (let k = 0; k < ((rot % 4) + 4) % 4; k++) cells = cells.map(([x, y]) => [y, -x] as [number, number]);
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
