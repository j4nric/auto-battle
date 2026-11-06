class_name UhrSession
extends RefCounted
## The current run and its save game. A save is seed + actions (ADR 0007): saving writes them
## after every action, loading replays them. The same data, base64-encoded, is the bug report
## code that the lab can replay (node tools/replay.ts <code>).

const SAVE_PATH := "user://run.json"
const CODE_PREFIX := "UHR1."

static var run: UhrRun = null


static func new_run(seed: int) -> UhrRun:
	run = UhrRun.create(seed)
	save()
	return run


## Applies an action to the current run and saves. Returns false if it was rejected.
static func act(a: Dictionary, record := false) -> bool:
	if run == null or not run.act(a, record):
		return false
	save()
	return true


static func save() -> void:
	if run == null:
		return
	var f := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if f == null:
		return
	f.store_string(JSON.stringify(_payload()))
	# Close explicitly: on the web the file only reaches IndexedDB when it is closed.
	f.close()


static func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


## Loads the saved run by replaying it. Returns null if there is none or it no longer replays
## (for example after a rule change).
static func load_saved() -> UhrRun:
	if not has_save():
		return null
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or not d.has("seed"):
		return null
	var r := UhrRun.replay(int(d.seed), d.get("actions", []))
	if r == null:
		push_warning("Saved run no longer replays: %s" % JSON.stringify(d))
		return null
	run = r
	return run


static func clear() -> void:
	run = null
	if has_save():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))


## Short summary of the saved run for the start screen, or "" if there is none.
static func saved_summary() -> String:
	if not has_save():
		return ""
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY:
		return ""
	return "Stunde %d, %d Siege" % [int(d.get("hour", 1)), int(d.get("wins", 0))]


static func report_code() -> String:
	return CODE_PREFIX + Marshalls.utf8_to_base64(JSON.stringify(_payload()))


static func _payload() -> Dictionary:
	return {
		"v": 1,
		"build": build_id(),
		"seed": run.seed,
		"hour": run.hour,
		"wins": run.wins,
		"actions": run.actions,
	}


static func build_id() -> String:
	if not FileAccess.file_exists("res://build_info.json"):
		return "lokal"
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://build_info.json"))
	return str(d.get("commit", "?")) if typeof(d) == TYPE_DICTIONARY else "?"
