extends "res://tests/test_case.gd"
## The grid engine (ADR 0008) must reproduce tests/golden/raster.json exactly: every grid fight
## tick by tick and every pattern recipe.

const MAX_REPORTS := 5


func test_raster_fights_match_lab() -> void:
	var g := load_golden("raster.json")
	var reports := 0
	var mismatches := 0
	for gf in g.get("fights", []):
		var res := UhrCombat.fight(gf.a, int(gf.hpA), gf.b, int(gf.hpB), true)
		var problem := _compare(gf, res)
		if problem != "":
			mismatches += 1
			if reports < MAX_REPORTS:
				fail("%s: %s" % [gf.name, problem])
				reports += 1
	if mismatches > MAX_REPORTS:
		fail("%d more fights differ" % (mismatches - MAX_REPORTS))
	check(g.get("fights", []).size() > 0, "no golden raster fights found")


func _compare(gf: Dictionary, res: Dictionary) -> String:
	var trace: Array = gf.trace
	var frames: Array = res.frames.slice(1)
	for t in mini(trace.size(), frames.size()):
		var want: Array = trace[t]
		var fr: Dictionary = frames[t]
		var got := [fr.a.hp, fr.a.shield, fr.b.hp, fr.b.shield]
		for k in 4:
			if int(want[k]) != int(got[k]):
				return "tick %d differs: lab %s, game %s" % [t + 1, str(want), str(got)]
	if int(gf.ticks) != res.ticks:
		return "ticks: lab %d, game %d" % [int(gf.ticks), res.ticks]
	if gf.winner != res.winner:
		return "winner: lab %s, game %s" % [gf.winner, res.winner]
	for side in ["A", "B"]:
		var want_stats: Array = gf["stats" + side]
		var got_stats: Array = res["stats" + side]
		for i in want_stats.size():
			for k in 6:
				if int(want_stats[i][k]) != int(got_stats[i][k]):
					return "stats%s room %d column %d: lab %s, game %s" % [side, i, k, str(want_stats[i]), str(got_stats[i])]
	return ""


func test_raster_fusions_match_lab() -> void:
	var g := load_golden("raster.json")
	for c in g.get("fusions", []):
		var res := UhrRasterTower.apply_fusions(c.input)
		check_eq(res.fused, Array(c.fused).map(func(x: Variant) -> String: return str(x)), "fused")
		var want: Array = c.output.rooms
		var got: Array = res.tower.rooms
		check_eq(got.size(), want.size(), "room count")
		for i in mini(got.size(), want.size()):
			for key in ["x", "y", "rot", "tier"]:
				check_eq(int(got[i].get(key, 0)), int(want[i].get(key, 0)), "room %d %s" % [i, key])
			check_eq(got[i].id, want[i].id, "room %d id" % i)


func test_rotation_matches_lab() -> void:
	var ball := UhrContent.raster_room("ballista")
	check_eq(UhrContent.cells_of(ball, 0), [[0, 0], [1, 0], [0, 1]], "rot 0")
	check_eq(UhrContent.cells_of(ball, 1), [[0, 0], [0, 1], [1, 1]], "rot 1")
	check_eq(UhrCombat.snake_order(3, 2), [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1]], "snake")


func test_raster_runs_match_lab_after_every_action() -> void:
	var g := load_golden("raster.json")
	check(g.get("runs", []).size() > 0, "no golden raster runs found")
	for gr in g.get("runs", []):
		var run := UhrRasterRun.create(int(gr.seed))
		var problem := _compare_state(gr.states[0], run.digest())
		if problem != "":
			fail("%s seed %d start: %s" % [gr.kind, int(gr.seed), problem])
			continue
		for i in gr.actions.size():
			var a: Dictionary = gr.actions[i]
			if not run.act(a):
				fail("%s seed %d action %d rejected: %s" % [gr.kind, int(gr.seed), i, str(a)])
				break
			problem = _compare_state(gr.states[i + 1], run.digest())
			if problem != "":
				fail("%s seed %d after action %d %s: %s" % [gr.kind, int(gr.seed), i, str(a), problem])
				break


func test_raster_run_replays_from_json() -> void:
	var run := UhrRasterRun.create(11)
	run.act({ "t": "buy", "offer": 0, "upgrade": false, "x": 0, "y": 0, "rot": 0 })
	run.act({ "t": "endShop" })
	var d: Dictionary = JSON.parse_string(JSON.stringify({ "seed": run.seed, "actions": run.actions }))
	var again := UhrRasterRun.replay(int(d.seed), d.actions)
	check(again != null, "replay after JSON round trip was rejected")
	if again != null:
		check_eq(_compare_state(again.digest(), run.digest()), "", "state after replay")


func _compare_state(want: Dictionary, got: Dictionary) -> String:
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
