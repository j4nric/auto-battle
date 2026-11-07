class_name UhrHaptics
extends RefCounted
## Short vibrations on phones (Android browsers and the later store builds; iOS Safari ignores
## them). Rate-limited so a busy fight does not buzz constantly.

const MIN_GAP := 0.12

static var _last := -1.0


static func buzz(ms: int) -> void:
	if not UhrSettings.vibration():
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last < MIN_GAP:
		return
	_last = now
	Input.vibrate_handheld(ms)
