extends "res://tests/test_case.gd"
## The GDScript run must reach exactly the lab's state after every action in
## tests/golden/runs.json, and reject actions that are not allowed.


func test_runs_match_lab_after_every_action() -> void:
	var g := load_golden("runs.json")
	for gr in g.get("runs", []):
		var run := UhrRun.create(int(gr.seed))
		var problem := _compare(gr.states[0], run.digest())
		if problem != "":
			fail("%s seed %d start: %s" % [gr.kind, int(gr.seed), problem])
			continue
		for i in gr.actions.size():
			var a: Dictionary = gr.actions[i]
			if not run.act(a):
				fail("%s seed %d action %d rejected: %s" % [gr.kind, int(gr.seed), i, str(a)])
				break
			problem = _compare(gr.states[i + 1], run.digest())
			if problem != "":
				fail("%s seed %d after action %d %s: %s" % [gr.kind, int(gr.seed), i, str(a), problem])
				break


## Compares a golden digest (JSON, numbers as floats) with the game's digest field by field.
func _compare(want: Dictionary, got: Dictionary) -> String:
	for key in want.keys():
		if not _same(want[key], got.get(key)):
			return "%s: lab %s, game %s" % [key, str(want[key]), str(got.get(key))]
	return ""


func _same(x: Variant, y: Variant) -> bool:
	if x is float or y is float or x is int or y is int:
		return (x is float or x is int) and (y is float or y is int) and float(x) == float(y)
	if x is Array and y is Array:
		if x.size() != y.size():
			return false
		for i in x.size():
			if not _same(x[i], y[i]):
				return false
		return true
	return x == y


func test_rejected_actions_change_nothing() -> void:
	var run := UhrRun.create(5)
	var before := run.digest()
	check(not run.act({ "t": "omen", "id": "normal" }), "omen in the workshop")
	check(not run.act({ "t": "sell", "idx": 0 }), "sell from an empty tower")
	check(not run.act({ "t": "buy", "offer": 99, "pos": 0, "upgrade": false }), "unknown offer")
	check_eq(run.digest(), before, "state after rejected actions")
	check_eq(run.actions.size(), 0, "no actions recorded")


func test_replay_rebuilds_the_same_run() -> void:
	var g := load_golden("runs.json")
	var gr: Dictionary = g.runs[g.runs.size() - 1]
	var run := UhrRun.replay(int(gr.seed), gr.actions)
	check(run != null, "replay rejected an action")
	if run != null:
		check_eq(_compare(gr.states[gr.states.size() - 1], run.digest()), "", "final state")
