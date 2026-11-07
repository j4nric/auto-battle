class_name UhrContent
extends RefCounted
## Shared content (res://data/content.json), the same file the lab reads. Loaded once and
## cached. Numbers from JSON are floats; heights and tiers are converted with int() where used.

const PATH := "res://data/content.json"

static var _data: Dictionary = {}
static var _rooms: Dictionary = {}
static var _alloys: Dictionary = {}


static func data() -> Dictionary:
	if _data.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
		assert(typeof(parsed) == TYPE_DICTIONARY, "content.json missing or invalid")
		_data = parsed
		for r in _data.rooms:
			_rooms[r.id] = r
		for a in _data.alloys:
			_alloys[a.id] = a
	return _data


static func room(id: String) -> Dictionary:
	data()
	return _rooms[id]


static func alloy(id: String) -> Dictionary:
	data()
	return _alloys[id]


static func tier_mult(tier: int) -> float:
	return float(data().tiers.mult[tier])


static func tier_name(tier: int) -> String:
	return data().tiers.names[tier]


static func fusions() -> Array:
	return data().fusions


static func guild(id: String) -> Dictionary:
	return data().guilds[id]


# ------------------------------------------------------------------ raster prototype (ADR 0008)
const RASTER_PATH := "res://data/raster.json"

static var _raster: Dictionary = {}
static var _raster_rooms: Dictionary = {}


static func raster() -> Dictionary:
	if _raster.is_empty():
		var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(RASTER_PATH))
		assert(typeof(parsed) == TYPE_DICTIONARY, "raster.json missing or invalid")
		_raster = parsed
		for r in _raster.rooms:
			_raster_rooms[r.id] = r
	return _raster


static func raster_room(id: String) -> Dictionary:
	raster()
	return _raster_rooms[id]


static func raster_fusions() -> Array:
	return raster().fusions


## Port of cellsOf (lab/src/raster/content.ts): cells [x, y] after `rot` quarter turns clockwise,
## shifted to x, y >= 0 and sorted by y, then x. Rooms without a shape are a column of `height`.
static func cells_of(def: Dictionary, rot := 0) -> Array:
	var cells: Array = []
	if def.has("shape"):
		for c in def.shape:
			cells.append([int(c[0]), int(c[1])])
	else:
		for i in int(def.height):
			cells.append([0, i])
	for k in posmod(rot, 4):
		cells = cells.map(func(c: Array) -> Array: return [c[1], -c[0]])
	var mx: int = cells[0][0]
	var my: int = cells[0][1]
	for c in cells:
		mx = mini(mx, c[0])
		my = mini(my, c[1])
	cells = cells.map(func(c: Array) -> Array: return [c[0] - mx, c[1] - my])
	cells.sort_custom(func(p: Array, q: Array) -> bool: return p[1] < q[1] or (p[1] == q[1] and p[0] < q[0]))
	return cells
