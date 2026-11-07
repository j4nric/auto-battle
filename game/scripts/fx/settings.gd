class_name UhrSettings
extends RefCounted
## Player settings that are not part of a run: sound and vibration. Stored in user://settings.json.

const PATH := "user://settings.json"

static var _data: Dictionary = {}
static var _loaded := false


static func sound() -> bool:
	return bool(_read("sound", true))


static func vibration() -> bool:
	return bool(_read("vibration", true))


static func set_value(key: String, value: Variant) -> void:
	_read(key, null)
	_data[key] = value
	var f := FileAccess.open(PATH, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(_data))


static func _read(key: String, fallback: Variant) -> Variant:
	if not _loaded:
		_loaded = true
		if FileAccess.file_exists(PATH):
			var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string(PATH))
			if typeof(parsed) == TYPE_DICTIONARY:
				_data = parsed
	return _data.get(key, fallback)
