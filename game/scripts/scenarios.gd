class_name UhrScenarios
extends RefCounted
## Fight setups for "Kampf ansehen" and the showcase towers on the start screen: grid towers
## (ADR 0008). Not game rules, only demo setups; deterministic per seed.

## Showcases: hand-placed grid towers. x/y is the cell of the room's first shape cell after
## rotation (row 0 is the foundation), rot as in UhrContent.cells_of.
const SHOWCASES := [
	{ "name": "Glockenturm", "hour": 6, "rooms": [
		{ "id": "kleineGlocke", "tier": 3, "x": 0, "y": 0 },
		{ "id": "glockenseil", "tier": 3, "x": 1, "y": 0 },
		{ "id": "laeutwerk", "tier": 3, "x": 2, "y": 0 },
		{ "id": "grosseGlocke", "tier": 3, "x": 0, "y": 1, "rot": 1 },
		{ "id": "turmuhr", "tier": 3, "x": 2, "y": 1 },
		{ "id": "resonanz", "tier": 1, "x": 0, "y": 2 },
		{ "id": "giesserei", "tier": 1, "x": 0, "y": 3 } ] },
	{ "name": "Uhrwerk-Kette", "hour": 6, "rooms": [
		{ "id": "schmiede", "tier": 3, "x": 0, "y": 0 },
		{ "id": "quecksilber", "tier": 1, "x": 1, "y": 0 },
		{ "id": "feder", "tier": 3, "x": 2, "y": 0 },
		{ "id": "zahnrad", "tier": 3, "x": 0, "y": 1 },
		{ "id": "echo", "tier": 3, "x": 1, "y": 1 },
		{ "id": "pendel", "tier": 3, "x": 2, "y": 1 },
		{ "id": "ballista", "tier": 3, "x": 0, "y": 2, "alloy": "kupfer" },
		{ "id": "unruh", "tier": 1, "x": 1, "y": 3 } ] },
	{ "name": "Feuer und Gift", "hour": 6, "rooms": [
		{ "id": "brennofen", "tier": 2, "x": 0, "y": 0 },
		{ "id": "salamander", "tier": 2, "x": 1, "y": 0 },
		{ "id": "katalysator", "tier": 2, "x": 2, "y": 0 },
		{ "id": "giftkueche", "tier": 2, "x": 0, "y": 1 },
		{ "id": "phiolen", "tier": 1, "x": 2, "y": 1, "rot": 1 },
		{ "id": "destille", "tier": 1, "x": 0, "y": 2 },
		{ "id": "rostkammer", "tier": 2, "x": 0, "y": 3 },
		{ "id": "saeurebad", "tier": 1, "x": 1, "y": 3 } ] },
	{ "name": "Wehr", "hour": 6, "rooms": [
		{ "id": "waffenkammer", "tier": 2, "x": 0, "y": 0 },
		{ "id": "schmiede", "tier": 2, "x": 1, "y": 0 },
		{ "id": "wachturm", "tier": 2, "x": 2, "y": 0 },
		{ "id": "ballista", "tier": 2, "x": 0, "y": 1 },
		{ "id": "bollwerk", "tier": 2, "x": 1, "y": 2 },
		{ "id": "lazarett", "tier": 1, "x": 0, "y": 3 } ] },
]


## A complete matchup: a showcase or, with showcase < 0, two random grid towers. Returns
## { title, hour, mine: tower, foe: tower, hp_mine, hp_foe, seed }.
static func build(seed: int, showcase := -1, hour := 0) -> Dictionary:
	var rng := UhrRng.new(UhrRng.hash_seed(["scenario", seed]))
	var mine: Dictionary
	var title: String
	if showcase >= 0 and showcase < SHOWCASES.size():
		var sc: Dictionary = SHOWCASES[showcase]
		if hour <= 0:
			hour = int(sc.hour)
		mine = showcase_tower(showcase, hour)
		title = sc.name
	else:
		if hour <= 0:
			hour = 3 + rng.next_int(8)
		mine = UhrRasterRun.generate_rival(UhrRng.hash_seed(["scenario-a", seed]), hour, 1.0).tower
		title = "Zufall"
	var foe: Dictionary = UhrRasterRun.generate_rival(UhrRng.hash_seed(["scenario-b", seed]), hour, 1.0)
	var hp := UhrRasterRun.player_hp(hour)
	return { "title": title, "hour": hour, "mine": mine, "foe": foe.tower, "hp_mine": hp, "hp_foe": int(foe.hp), "seed": seed }


## The showcase as a grid tower with the rows of the given hour, recipes already fused.
static func showcase_tower(index: int, hour := 0) -> Dictionary:
	var sc: Dictionary = SHOWCASES[index]
	if hour <= 0:
		hour = int(sc.hour)
	var rooms: Array = []
	for r in sc.rooms:
		rooms.append({ "id": r.id, "tier": int(r.tier), "alloy": r.get("alloy", null),
			"x": int(r.x), "y": int(r.y), "rot": int(r.get("rot", 0)) })
	var t := UhrRasterTower.with_rooms(UhrRasterTower.empty_grid(UhrRasterTower.rows_for(hour)), rooms)
	return UhrRasterTower.apply_fusions(t).tower
