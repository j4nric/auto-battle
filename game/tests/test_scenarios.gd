extends "res://tests/test_case.gd"
## Combat screen setups: deterministic per seed, valid grid towers, every fight fully recorded.


func test_same_seed_same_setup() -> void:
	for seed in [1, 2, 99, 12345]:
		check_eq(UhrScenarios.build(seed), UhrScenarios.build(seed), "seed %d" % seed)


func test_showcase_rooms_fit_their_cells() -> void:
	for i in UhrScenarios.SHOWCASES.size():
		var sc: Dictionary = UhrScenarios.SHOWCASES[i]
		var t := UhrRasterTower.empty_grid(UhrRasterTower.rows_for(int(sc.hour)))
		for r in sc.rooms:
			check(UhrRasterTower.can_place(t, r.id, int(r.x), int(r.y), int(r.get("rot", 0))),
				"%s: %s does not fit at %d,%d" % [sc.name, r.id, int(r.x), int(r.y)])
			var rooms: Array = t.rooms.duplicate()
			rooms.append({ "id": r.id, "tier": int(r.tier), "x": int(r.x), "y": int(r.y), "rot": int(r.get("rot", 0)) })
			t = UhrRasterTower.with_rooms(t, rooms)


func test_towers_are_grids_and_fights_record_every_tick() -> void:
	for seed in 40:
		for showcase in [-1, 0, 1, 2, 3]:
			var s := UhrScenarios.build(seed, showcase)
			for side in ["mine", "foe"]:
				check_eq(s[side].get("kind", ""), "grid", "seed %d %s is a grid" % [seed, side])
				check(UhrRasterTower.used_cells(s[side]) > 0, "seed %d %s is empty" % [seed, side])
			var res := UhrCombat.fight(s.mine, s.hp_mine, s.foe, s.hp_foe, true)
			check_eq(res.frames.size(), int(res.ticks) + 1, "seed %d showcase %d frames" % [seed, showcase])
			check(int(res.ticks) > 5, "seed %d showcase %d ends after %d ticks" % [seed, showcase, int(res.ticks)])


func test_showcases_contain_their_fusion() -> void:
	var expect := { 0: "glockenspiel", 1: "zeitschleife", 2: "hoellenkueche" }
	for i in expect:
		var t := UhrScenarios.showcase_tower(i)
		check(t.rooms.any(func(r: Dictionary) -> bool: return r.id == expect[i]),
			"%s should fuse into %s" % [UhrScenarios.SHOWCASES[i].name, expect[i]])
