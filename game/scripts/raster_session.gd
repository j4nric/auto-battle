class_name UhrRasterSession
extends RefCounted
## The current raster preview run (ADR 0008) and its save game: seed + actions, saved after every
## action, loaded by replay (ADR 0007). Separate from the column run's save until the raster
## replaces it.

const SAVE_PATH := "user://raster-run.json"

static var run: UhrRasterRun = null


static func new_run(seed: int) -> UhrRasterRun:
	run = UhrRasterRun.create(seed)
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
	f.store_string(JSON.stringify({ "v": 1, "seed": run.seed, "hour": run.hour, "wins": run.wins, "actions": run.actions }))
	# Close explicitly: on the web the file only reaches IndexedDB when it is closed.
	f.close()


static func has_save() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


## Loads the saved run by replaying it, or null if there is none or it no longer replays.
static func load_saved() -> UhrRasterRun:
	if not has_save():
		return null
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if typeof(d) != TYPE_DICTIONARY or not d.has("seed"):
		return null
	var r := UhrRasterRun.replay(int(d.seed), d.get("actions", []))
	if r == null:
		push_warning("Saved raster run no longer replays")
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


## Bug report code: seed and actions, base64. The lab replays it: node tools/replay.ts UHR2.…
static func report_code() -> String:
	var payload := { "v": 2, "kind": "raster", "build": UhrSession.build_id(), "seed": run.seed, "hour": run.hour, "wins": run.wins, "actions": run.actions }
	return "UHR2." + Marshalls.utf8_to_base64(JSON.stringify(payload))
