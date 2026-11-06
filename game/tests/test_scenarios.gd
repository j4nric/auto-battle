extends "res://tests/test_case.gd"
## Combat screen setups: deterministic per seed, valid towers, every fight fully recorded.


func test_same_seed_same_setup() -> void:
	for seed in [1, 2, 99, 12345]:
		check_eq(UhrScenarios.build(seed), UhrScenarios.build(seed), "seed %d" % seed)


func test_towers_fit_and_fights_record_every_tick() -> void:
	for seed in 40:
		for showcase in [-1, 0, 1, 2, 3]:
			var s := UhrScenarios.build(seed, showcase)
			for side in ["mine", "foe"]:
				var used := UhrTower.floors_used(s[side].rooms)
				check(used <= UhrTower.BASE_FLOORS and used > 0, "seed %d %s uses %d floors" % [seed, side, used])
			var res := UhrCombat.fight(s.mine, s.hp_mine, s.foe, s.hp_foe, true)
			check_eq(res.frames.size(), int(res.ticks) + 1, "seed %d showcase %d frames" % [seed, showcase])
			check(int(res.ticks) > 5, "seed %d showcase %d ends after %d ticks" % [seed, showcase, int(res.ticks)])


func test_showcases_contain_their_fusion() -> void:
	var bells := UhrScenarios.build(1, 0)
	check(bells.mine.rooms.any(func(r: Dictionary) -> bool: return r.id == "glockenspiel"), "Glockenturm should fuse into a Glockenspiel")
	var chain := UhrScenarios.build(1, 1)
	check(chain.mine.rooms.any(func(r: Dictionary) -> bool: return r.id == "zeitschleife"), "Uhrwerk-Kette should fuse into a Zeitschleife")
	var fire := UhrScenarios.build(1, 2)
	check(fire.mine.rooms.any(func(r: Dictionary) -> bool: return r.id == "hoellenkueche"), "Feuer und Gift should fuse into a Höllenküche")
