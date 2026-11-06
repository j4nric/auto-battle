extends "res://tests/test_case.gd"
## The GDScript combat engine must reproduce every fight in tests/golden/combat.json exactly:
## winner, duration, integrity and shield on every tick, and each room's contributions.

const MAX_REPORTS := 5


func test_fights_match_lab() -> void:
	var g := load_golden("combat.json")
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
	check(g.get("fights", []).size() > 0, "no golden fights found")


func _compare(gf: Dictionary, res: Dictionary) -> String:
	# Trace first: the first diverging tick is the most useful hint.
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
					return "stats%s room %d (%s) column %d: lab %s, game %s" % [side, i, gf[side.to_lower()].rooms[i].id, k, str(want_stats[i]), str(got_stats[i])]
	return ""


func test_fusions_match_lab() -> void:
	var g := load_golden("fusions.json")
	for c in g.get("fusions", []):
		var res := UhrTower.apply_fusions(c.input)
		check_eq(res.fused, Array(c.fused).map(func(x: Variant) -> String: return str(x)), "fused for %s" % str(c.input.map(func(r: Dictionary) -> String: return r.id)))
		check_eq(res.rooms.size(), c.output.size(), "room count")
		for i in mini(res.rooms.size(), c.output.size()):
			var want: Dictionary = c.output[i]
			var got: Dictionary = res.rooms[i]
			check_eq(got.id, want.id, "room %d id" % i)
			check_eq(int(got.tier), int(want.tier), "room %d tier" % i)
			check_eq(got.alloy, want.alloy, "room %d alloy" % i)
