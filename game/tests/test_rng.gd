extends "res://tests/test_case.gd"
## The GDScript RNG must reproduce the lab's golden vectors exactly.


func test_hash_seed_matches_lab() -> void:
	var g := load_golden("rng.json")
	for h in g.get("hashes", []):
		check_eq(UhrRng.hash_seed(h.parts), int(h.hash), "hash_seed(%s)" % str(h.parts))


func test_float_and_int_streams_match_lab() -> void:
	var g := load_golden("rng.json")
	for s in g.get("streams", []):
		var rng := UhrRng.new(int(s.seed))
		for i in s.floats.size():
			# Golden floats are stored as exact uint32 numerators (float * 2^32).
			check_eq(int(rng.next_float() * 4294967296.0), int(s.floats[i]), "seed %d float #%d" % [int(s.seed), i])
		for i in s.ints.size():
			check_eq(rng.next_int(1000), int(s.ints[i]), "seed %d int #%d" % [int(s.seed), i])


func test_imul_wraps_like_javascript() -> void:
	check_eq(UhrRng.imul(0xFFFFFFFF, 0xFFFFFFFF), 1, "imul(-1, -1)")
	check_eq(UhrRng.imul(0x7FFFFFFF, 2), 0xFFFFFFFE, "imul(max, 2)")
