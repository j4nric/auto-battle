extends "res://tests/test_case.gd"
## Save game round trip: actions go through JSON (numbers become floats) and must still replay.


func test_actions_survive_json_round_trip() -> void:
	var run := UhrRun.create(43473)
	check(run.act({ "t": "buy", "offer": 0, "pos": 0, "upgrade": false }), "first buy")
	check(run.act({ "t": "endShop" }), "end shop")
	var text := JSON.stringify({ "seed": run.seed, "actions": run.actions })
	var d: Dictionary = JSON.parse_string(text)
	var again := UhrRun.replay(int(d.seed), d.actions)
	check(again != null, "replay after JSON round trip was rejected")
	if again != null:
		check_eq(again.digest(), run.digest(), "state after replay")
