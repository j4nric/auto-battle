extends RefCounted
## Base for tests: extend this file and call check()/check_eq().

var runner: Object


func fail(msg: String) -> void:
	runner.report(msg)


func check(cond: bool, msg: String) -> void:
	if not cond:
		fail(msg)


func check_eq(actual: Variant, expected: Variant, msg: String = "") -> void:
	if actual != expected:
		fail("%s expected %s, got %s" % [msg, str(expected), str(actual)])


func load_golden(name: String) -> Dictionary:
	# tests/golden/ lives next to the Godot project; read it from the repository.
	var path := ProjectSettings.globalize_path("res://").path_join("../tests/golden/" + name)
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		fail("golden file missing: " + path)
		return {}
	return JSON.parse_string(text)
