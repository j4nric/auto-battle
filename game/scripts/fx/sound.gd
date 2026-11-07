class_name UhrSound
extends RefCounted
## Sound effects, synthesised once at first use (no audio files): ticks, room clicks, hits, bells,
## shields, placing and fanfares. Presentation only, never part of the game rules, so the maths
## here may use sin/exp freely.

const RATE := 22050
## Minimum seconds between two plays of the same sound, so a busy tick does not turn into noise.
const MIN_GAP := 0.06
const VOICES := 8

static var _streams: Dictionary = {}
static var _players: Array[AudioStreamPlayer] = []
static var _next := 0
static var _last: Dictionary = {}
static var _vary := 0


## Plays a sound by name. volume in dB relative to the sound's own level.
static func play(name: String, volume := 0.0) -> void:
	if not UhrSettings.sound():
		return
	var now := Time.get_ticks_msec() / 1000.0
	if now - float(_last.get(name, -1.0)) < MIN_GAP:
		return
	_last[name] = now
	var stream := _stream(name)
	if stream == null:
		return
	var p := _player()
	if p == null:
		return
	p.stream = stream
	p.volume_db = volume
	# Small pitch steps keep repeated clicks from sounding mechanical.
	_vary = (_vary + 1) % 5
	p.pitch_scale = 1.0 + (_vary - 2) * 0.02
	p.play()


## Creates the voices early (the first frame cannot add nodes to the root directly).
static func warm() -> void:
	_player()


static func _player() -> AudioStreamPlayer:
	if _players.is_empty() or not is_instance_valid(_players[0]):
		_players.clear()
		var tree := Engine.get_main_loop() as SceneTree
		if tree == null or tree.root == null:
			return null
		for i in VOICES:
			var p := AudioStreamPlayer.new()
			tree.root.add_child.call_deferred(p)
			_players.append(p)
		return null if not _players[0].is_inside_tree() else _players[0]
	var p := _players[_next]
	_next = (_next + 1) % _players.size()
	return p if p.is_inside_tree() else null


static func _stream(name: String) -> AudioStreamWAV:
	if not _streams.has(name):
		var samples := _synth(name)
		if samples.is_empty():
			return null
		_streams[name] = _wav(samples)
	return _streams[name]


static func _wav(samples: PackedFloat32Array) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in samples.size():
		bytes.encode_s16(i * 2, int(clampf(samples[i], -1.0, 1.0) * 32000.0))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = RATE
	w.stereo = false
	w.data = bytes
	return w


static func _synth(name: String) -> PackedFloat32Array:
	match name:
		"tick":
			return _mix([_tone(2400.0, 0.025, 120.0, 0.25), _noise(0.02, 200.0, 0.15, 0.3)])
		"fire":
			return _mix([_tone(620.0, 0.08, 45.0, 0.35), _tone(1240.0, 0.05, 70.0, 0.1)])
		"hit":
			return _mix([_tone(110.0, 0.16, 22.0, 0.6), _noise(0.12, 30.0, 0.45, 0.15)])
		"bighit":
			return _mix([_tone(70.0, 0.3, 12.0, 0.8), _noise(0.25, 14.0, 0.5, 0.08)])
		"bell":
			return _bell(660.0, 1.1, 0.5)
		"shield":
			return _sweep(380.0, 760.0, 0.16, 0.3)
		"heal":
			return _mix([_tone(880.0, 0.22, 12.0, 0.2), _tone(1320.0, 0.22, 16.0, 0.12)])
		"burn":
			return _noise(0.18, 14.0, 0.25, 0.6)
		"place":
			return _mix([_tone(200.0, 0.1, 35.0, 0.6), _noise(0.05, 70.0, 0.25, 0.25)])
		"pick":
			return _tone(900.0, 0.04, 80.0, 0.25)
		"coin":
			return _seq([_tone(1320.0, 0.06, 30.0, 0.3), _tone(1760.0, 0.12, 20.0, 0.3)], 0.055)
		"fusion":
			return _seq([_bell(523.0, 0.7, 0.3), _bell(659.0, 0.7, 0.3), _bell(784.0, 0.7, 0.3), _bell(1047.0, 0.9, 0.35)], 0.09)
		"win":
			return _seq([_bell(523.0, 0.8, 0.3), _bell(659.0, 0.8, 0.3), _bell(784.0, 1.2, 0.4)], 0.13)
		"lose":
			return _seq([_tone(330.0, 0.35, 5.0, 0.35), _tone(247.0, 0.6, 4.0, 0.35)], 0.22)
		"row":
			return _seq([_tone(440.0, 0.1, 20.0, 0.3), _tone(660.0, 0.16, 15.0, 0.3)], 0.08)
	return PackedFloat32Array()


## Sine with exponential decay (rate per second) and a 2 ms attack against clicks.
static func _tone(freq: float, dur: float, decay: float, amp: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	for i in n:
		var t := float(i) / RATE
		out[i] = sin(TAU * freq * t) * exp(-decay * t) * amp * minf(1.0, t / 0.002)
	return out


## Struck metal: inharmonic partials that die at different speeds.
static func _bell(freq: float, dur: float, amp: float) -> PackedFloat32Array:
	return _mix([
		_tone(freq, dur, 3.5, amp * 0.6),
		_tone(freq * 2.0, dur, 5.0, amp * 0.25),
		_tone(freq * 2.76, dur, 7.0, amp * 0.18),
		_tone(freq * 5.4, dur * 0.5, 12.0, amp * 0.1),
	])


static func _sweep(f0: float, f1: float, dur: float, amp: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var phase := 0.0
	for i in n:
		var k := float(i) / n
		phase += TAU * lerpf(f0, f1, k) / RATE
		out[i] = sin(phase) * amp * sin(PI * k)
	return out


## Filtered noise from a fixed-seed LCG, so the sound is the same on every start.
static func _noise(dur: float, decay: float, amp: float, smooth: float) -> PackedFloat32Array:
	var n := int(dur * RATE)
	var out := PackedFloat32Array()
	out.resize(n)
	var s := 12345
	var y := 0.0
	for i in n:
		s = (s * 1103515245 + 12345) & 0x7fffffff
		var x := float(s) / 0x7fffffff * 2.0 - 1.0
		y += (x - y) * smooth
		out[i] = y * exp(-decay * float(i) / RATE) * amp
	return out


static func _mix(parts: Array) -> PackedFloat32Array:
	var n := 0
	for p in parts:
		n = maxi(n, p.size())
	var out := PackedFloat32Array()
	out.resize(n)
	for p in parts:
		for i in p.size():
			out[i] += p[i]
	return out


## Parts one after another, each starting `step` seconds after the previous one.
static func _seq(parts: Array, step: float) -> PackedFloat32Array:
	var shift := int(step * RATE)
	var n := 0
	for k in parts.size():
		n = maxi(n, k * shift + parts[k].size())
	var out := PackedFloat32Array()
	out.resize(n)
	for k in parts.size():
		for i in parts[k].size():
			out[k * shift + i] += parts[k][i]
	return out
