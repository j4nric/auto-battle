extends "res://tests/test_case.gd"
## Synthesised sounds: every name the UI plays exists, is short and stays within full scale.

const NAMES := ["tick", "fire", "hit", "bighit", "bell", "shield", "heal", "burn", "place", "pick", "coin", "fusion", "win", "lose", "row"]


func test_every_sound_synthesises() -> void:
	for n in NAMES:
		var s: PackedFloat32Array = UhrSound._synth(n)
		check(s.size() > 100 and s.size() < UhrSound.RATE * 2, "%s has %d samples" % [n, s.size()])
		var peak := 0.0
		for v in s:
			peak = maxf(peak, absf(v))
		check(peak > 0.05 and peak <= 1.0, "%s peaks at %.2f" % [n, peak])


func test_unknown_sound_is_silent() -> void:
	check(UhrSound._synth("nope").is_empty(), "unknown names give no samples")
