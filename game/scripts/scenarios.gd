class_name UhrScenarios
extends RefCounted
## Fight setups for the combat screen until the run loop arrives (M3): a few showcase towers
## and random matchups from a seed. Not game rules, only test setups; deterministic per seed.

## Integrity per hour, same table as HP_TABLE in lab/src/run/run.ts.
const HP_TABLE := [80, 260, 555, 918, 1334, 1793, 2291, 2824, 3388, 3981, 4601, 5247, 5916, 6608]

const SHOWCASES := [
	{ "name": "Glockenturm", "hour": 6, "rooms": [
		{ "id": "glockenseil", "tier": 1 }, { "id": "kleineGlocke", "tier": 1 }, { "id": "grosseGlocke", "tier": 1 },
		{ "id": "resonanz", "tier": 0 }, { "id": "turmuhr", "tier": 1 } ] },
	{ "name": "Uhrwerk-Kette", "hour": 6, "rooms": [
		{ "id": "schmiede", "tier": 1 }, { "id": "ballista", "tier": 1, "alloy": "kupfer" },
		{ "id": "quecksilber", "tier": 0 }, { "id": "echo", "tier": 1 }, { "id": "feder", "tier": 1 } ] },
	{ "name": "Feuer und Gift", "hour": 6, "rooms": [
		{ "id": "brennofen", "tier": 1 }, { "id": "giftkueche", "tier": 1 }, { "id": "salamander", "tier": 1 },
		{ "id": "katalysator", "tier": 1 }, { "id": "phiolen", "tier": 0 } ] },
	{ "name": "Wehr", "hour": 6, "rooms": [
		{ "id": "schmiede", "tier": 1 }, { "id": "ballista", "tier": 1 }, { "id": "bollwerk", "tier": 1 },
		{ "id": "lazarett", "tier": 0 } ] },
]


## A complete matchup. kind: "random" or a showcase index. Returns
## { title, hour, mine: tower, foe: tower, hp_mine, hp_foe, seed }.
static func build(seed: int, showcase := -1, hour := 0) -> Dictionary:
	var rng := UhrRng.new(UhrRng.hash_seed(["scenario", seed]))
	var mine: Dictionary
	var title: String
	if showcase >= 0 and showcase < SHOWCASES.size():
		var sc: Dictionary = SHOWCASES[showcase]
		mine = _tower(sc.rooms.duplicate(true))
		title = sc.name
		if hour <= 0:
			hour = int(sc.hour)
	else:
		if hour <= 0:
			hour = 3 + rng.next_int(8)
		mine = random_tower(rng, hour)
		title = "Zufall"
	var foe := random_tower(rng, hour)
	var hp: int = HP_TABLE[hour]
	return { "title": title, "hour": hour, "mine": mine, "foe": foe, "hp_mine": hp, "hp_foe": hp, "seed": seed }


## Fills 8 floors, mostly from one guild, tiers growing with the hour.
static func random_tower(rng: UhrRng, hour: int) -> Dictionary:
	var shop: Array = UhrContent.data().rooms.filter(func(r: Dictionary) -> bool: return not r.get("fusion", false))
	var guilds: Array = UhrContent.data().guilds.keys()
	var guild: String = rng.pick(guilds)
	var own: Array = shop.filter(func(r: Dictionary) -> bool: return r.guild == guild)
	var rooms: Array = []
	var used := 0
	var base := (hour - 1) / 3.0
	for tries in 40:
		if used >= UhrTower.BASE_FLOORS:
			break
		var def: Dictionary = rng.pick(own) if rng.chance(0.65) else rng.pick(shop)
		# Distinct rooms only: in a run a duplicate upgrades the room instead of adding one.
		if used + int(def.height) > UhrTower.BASE_FLOORS or rooms.any(func(x: Dictionary) -> bool: return x.id == def.id):
			continue
		var tier := mini(3, int(floorf(base + rng.next_float())))
		var alloy: Variant = null
		if hour >= 5 and rng.chance(0.15):
			alloy = rng.pick(UhrContent.data().alloys).id
		rooms.append({ "id": def.id, "tier": tier, "alloy": alloy })
		used += int(def.height)
	return _tower(rooms)


static func _tower(rooms: Array) -> Dictionary:
	return { "rooms": UhrTower.apply_fusions(rooms).rooms, "maxFloors": UhrTower.BASE_FLOORS }
