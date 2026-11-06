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
