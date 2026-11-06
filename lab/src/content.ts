// Loads the shared content file (game/data/content.json). The game reads the same file, so
// lab and game always play with identical rooms, fusions and alloys.
import data from '../../game/data/content.json' with { type: 'json' };

/** One summand of a value. Values are the sum of their terms, evaluated left to right. */
export type Term =
  | { scaled: number }
  | { scaledPerTag: { tag: string; n: number } }
  | { flat: number }
  | { tier: number }
  | { charge: number }
  | { myOil: number }
  | { foeBurn: number };

export type Op =
  | { op: 'damage' | 'shield' | 'heal' | 'burn' | 'poison' | 'rust' | 'oil' | 'breakShield' | 'addCharge';
      value: Term[]; timesIfBelowTag?: { tag: string; times: number } }
  | { op: 'chargeOthers'; tag: string; value: Term[] }
  | { op: 'retrigger'; bonus: Term[] }
  | { op: 'freeNext'; amount: number }
  | { op: 'firstTime'; then: Op[]; else: Op[] }
  | { op: 'spawnSpark' }
  | { op: 'advanceCounter' }
  | { op: 'advanceAllBells' };

export type Trigger = 'activate' | 'strike' | 'strikeEvent' | 'loopEvent';

export interface Aura {
  /** Where the target sits relative to the aura's source: 'above' or any neighbour. */
  rel: 'above' | 'any';
  targetTags?: string[];
  value: Term[];
}

export interface RoomDef {
  id: string;
  name: string;
  guild: string;
  height: number;
  tags: string[];
  text: string;
  counterMax?: number;
  fusion?: boolean;
  aura?: Aura;
  on: Partial<Record<Trigger, Op[]>>;
}

export interface AlloyDef {
  id: string;
  name: string;
  text: string;
  times?: number;
  shieldPerFloor?: number;
  costMult?: number;
  conduct?: boolean;
  mult?: number;
  breaksAfter?: number;
  glass?: boolean;
}

export interface FusionDef {
  pattern: string[];
  result: string;
}

export interface GuildDef {
  name: string;
  color: string;
}

export interface Omen {
  id: string;
  name: string;
  text: string;
  diff?: number;
  gold: number;
  alloy?: boolean;
  fight?: boolean;
  merchant?: number;
}

export interface Rival {
  name: string;
  title: string;
}

interface ContentFile {
  version: number;
  tiers: { mult: number[]; names: string[] };
  guilds: Record<string, GuildDef>;
  rooms: RoomDef[];
  fusions: FusionDef[];
  alloys: AlloyDef[];
  rivals: Record<string, Rival>;
  omens: Omen[];
}

export const content = data as unknown as ContentFile;

export const TIER_MULT: readonly number[] = content.tiers.mult;
export const TIER_NAMES: readonly string[] = content.tiers.names;
export const GUILDS: Readonly<Record<string, GuildDef>> = content.guilds;
export const ROOMS: Readonly<Record<string, RoomDef>> = Object.fromEntries(content.rooms.map((r) => [r.id, r]));
export const FUSIONS: readonly FusionDef[] = content.fusions;
export const ALLOYS: Readonly<Record<string, AlloyDef>> = Object.fromEntries(content.alloys.map((a) => [a.id, a]));
export const ALLOY_IDS: readonly string[] = content.alloys.map((a) => a.id);
export const SHOP_ROOMS: readonly RoomDef[] = content.rooms.filter((r) => !r.fusion);
export const RIVALS: Readonly<Record<string, Rival>> = content.rivals;
export const OMENS: Readonly<Record<string, Omen>> = Object.fromEntries(content.omens.map((o) => [o.id, o]));
