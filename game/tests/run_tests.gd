extends SceneTree
## Minimal headless test runner, no plugins needed.
## Run: godot --headless --path game --script res://tests/run_tests.gd
## Every file res://tests/test_*.gd is loaded; each method starting with "test_" is called
## on a fresh instance. A test fails by calling fail(). Exit code 1 on any failure.

var failures: Array[String] = []
var current := ""


func _init() -> void:
	var dir := DirAccess.open("res://tests")
	var files := Array(dir.get_files()).filter(func(f: String) -> bool: return f.begins_with("test_") and f.ends_with(".gd"))
	files.sort()
	var count := 0
	for f in files:
		var script: GDScript = load("res://tests/" + f)
		for m in script.get_script_method_list():
			var name: String = m.name
			if not name.begins_with("test_"):
				continue
			var inst: Object = script.new()
			inst.set("runner", self)
			current = "%s::%s" % [f, name]
			var before := failures.size()
			inst.call(name)
			count += 1
			print(("ok   " if failures.size() == before else "FAIL ") + current)
	print("\n%d tests, %d failures" % [count, failures.size()])
	for msg in failures:
		printerr(msg)
	quit(1 if failures.size() else 0)


func report(msg: String) -> void:
	failures.append("%s: %s" % [current, msg])
