class_name CombatView
extends Control
## Combat screen: both towers side by side, the fight computed once by UhrCombat and then
## replayed tick by tick from the recorded frames. Bottom row = thumb zone for the controls.

const TICK := 0.6
const SPEEDS := [0.5, 1.0, 2.0, 4.0]

## Set by the caller before changing to this scene (see UhrScenarios.build). In run mode it also
## carries the fight already computed by the run ("result") and the rival's name ("foe_name").
static var pending: Dictionary = {}

const RUN_SCENE := "res://scenes/run.tscn"
const MAIN_SCENE := "res://scenes/main.tscn"

var setup: Dictionary
var result: Dictionary
var frames: Array = []
var frame := 0
var speed_idx := 1
var playing := false
var timer: Timer

var title_label: Label
var tick_label: Label
var bars := {}
var status_labels := {}
var towers := {}
var play_button: Button
var speed_button: Button
var overlay: Control
var sheet: PanelContainer


class HpBar:
	extends Control
	var max_hp := 1
	var hp := 1
	var shield := 0
	var color := Color.WHITE
	var _shown := 1.0

	func set_values(p_hp: int, p_shield: int, animate: float) -> void:
		hp = p_hp
		shield = p_shield
		var target := clampf(float(hp) / max_hp, 0.0, 1.0)
		if animate > 0.0:
			create_tween().tween_method(func(v: float) -> void:
				_shown = v
				queue_redraw(), _shown, target, animate)
		else:
			_shown = target
			queue_redraw()

	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), UhrStyle.PANEL)
		draw_rect(Rect2(0, 0, size.x * _shown, size.y), color)
		var sh := clampf(float(shield) / max_hp, 0.0, 1.0)
		if sh > 0.0:
			draw_rect(Rect2(0, size.y - 5, size.x * sh, 5), UhrStyle.SHIELD)
		var font := get_theme_default_font()
		var text := "%d / %d" % [maxi(0, hp), max_hp]
		if shield > 0:
			text += "  Schild %d" % shield
		draw_string(font, Vector2(6, size.y - 7), text, HORIZONTAL_ALIGNMENT_LEFT, size.x - 8, 13, UhrStyle.NIGHT if _shown > 0.45 else UhrStyle.TEXT)


func _ready() -> void:
	if pending.is_empty():
		pending = UhrScenarios.build(1)
	setup = pending
	_build_ui()
	timer = Timer.new()
	timer.timeout.connect(_step)
	add_child(timer)
	_start_fight()


func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = UhrStyle.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 16)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_bottom", 14)
	add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)

	var head := HBoxContainer.new()
	var back := UhrStyle.button("Zurück")
	back.pressed.connect(_leave)
	head.add_child(back)
	var titles := VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_theme_constant_override("separation", 0)
	title_label = UhrStyle.label("", 17, UhrStyle.BRASS, false)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	tick_label = UhrStyle.label("", 12, UhrStyle.MUTED, false)
	tick_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	titles.add_child(title_label)
	titles.add_child(tick_label)
	head.add_child(titles)
	col.add_child(head)

	var sides := HBoxContainer.new()
	sides.add_theme_constant_override("separation", 14)
	for side in ["a", "b"]:
		var box := VBoxContainer.new()
		box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		box.add_theme_constant_override("separation", 3)
		var who := "Dein Turm" if side == "a" else str(setup.get("foe_name", "Gegner"))
		var name_label := UhrStyle.label(who, 15, UhrStyle.TEXT, false)
		name_label.clip_text = true
		name_label.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		box.add_child(name_label)
		var bar := HpBar.new()
		bar.custom_minimum_size.y = 24
		bar.color = UhrStyle.MINE if side == "a" else UhrStyle.FOE
		box.add_child(bar)
		bars[side] = bar
		var st := UhrStyle.label("", 12, UhrStyle.MUTED)
		st.custom_minimum_size.y = 32
		box.add_child(st)
		status_labels[side] = st
		sides.add_child(box)
	col.add_child(sides)

	var tower_row := HBoxContainer.new()
	tower_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tower_row.add_theme_constant_override("separation", 22)
	for side in ["a", "b"]:
		# Grid towers (ADR 0008) get the grid view in compact mode; it offers the same playback
		# interface as TowerView (setup, apply_frame, flash, pop, room_tapped).
		var tv: Control
		if _is_grid():
			var gv := GridView.new()
			gv.compact = true
			tv = gv
		else:
			tv = TowerView.new()
		tv.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tv.size_flags_vertical = Control.SIZE_EXPAND_FILL
		tv.room_tapped.connect(_show_room.bind(side))
		tower_row.add_child(tv)
		towers[side] = tv
	var spacer_left := Control.new()
	spacer_left.custom_minimum_size.x = 2
	tower_row.add_child(spacer_left)
	tower_row.move_child(spacer_left, 0)
	col.add_child(tower_row)

	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation", 8)
	var again := UhrStyle.button("Nochmal")
	again.pressed.connect(func() -> void: _restart())
	play_button = UhrStyle.button("Start", true)
	play_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_button.pressed.connect(_toggle_play)
	var step := UhrStyle.button("Takt")
	step.pressed.connect(func() -> void:
		_pause()
		_step())
	speed_button = UhrStyle.button("1×")
	speed_button.pressed.connect(_cycle_speed)
	var next := UhrStyle.button("Weiter" if _is_run() else "Neu")
	next.pressed.connect(_leave if _is_run() else _new_fight)
	for b in [again, play_button, step, speed_button, next]:
		# Five buttons must fit 358 px: smaller text and padding than the default button.
		b.add_theme_font_size_override("font_size", 16)
		for st in ["normal", "hover", "pressed", "focus", "disabled"]:
			var sb: StyleBoxFlat = b.get_theme_stylebox(st).duplicate()
			sb.content_margin_left = 8
			sb.content_margin_right = 8
			b.add_theme_stylebox_override(st, sb)
		b.custom_minimum_size.x = 0
		controls.add_child(b)
	col.add_child(controls)


func _is_run() -> bool:
	return setup.get("mode", "") == "run"


func _is_grid() -> bool:
	return setup.mine.get("kind", "") == "grid"


## Room definition from the content the tower uses (grid towers: raster.json).
func _def(id: String) -> Dictionary:
	return UhrContent.raster_room(id) if _is_grid() else UhrContent.room(id)


func _leave() -> void:
	get_tree().change_scene_to_file(str(setup.get("return_scene", RUN_SCENE)) if _is_run() else MAIN_SCENE)


func _start_fight() -> void:
	if setup.has("result"):
		result = setup.result
	else:
		result = UhrCombat.fight(setup.mine, int(setup.hp_mine), setup.foe, int(setup.hp_foe), true)
	frames = result.frames
	title_label.text = "Stunde %d · %s" % [int(setup.hour), setup.title]
	towers.a.setup(setup.mine)
	towers.b.setup(setup.foe)
	bars.a.max_hp = int(setup.hp_mine)
	bars.b.max_hp = int(setup.hp_foe)
	if overlay:
		overlay.queue_free()
		overlay = null
	frame = 0
	await get_tree().process_frame
	_apply(frames[0], 0.0)
	_play()


func _restart() -> void:
	_pause()
	frame = 0
	if overlay:
		overlay.queue_free()
		overlay = null
	towers.a.setup(setup.mine)
	towers.b.setup(setup.foe)
	await get_tree().process_frame
	_apply(frames[0], 0.0)
	_play()


func _new_fight() -> void:
	_pause()
	var seed := int(setup.seed) + 1
	setup = UhrScenarios.build(seed, -1, 0)
	pending = setup
	_start_fight()


func _toggle_play() -> void:
	if playing:
		_pause()
	elif frame >= frames.size() - 1:
		_restart()
	else:
		_play()


func _play() -> void:
	playing = true
	play_button.text = "Pause"
	timer.start(TICK / SPEEDS[speed_idx])


func _pause() -> void:
	playing = false
	play_button.text = "Start"
	timer.stop()


func _cycle_speed() -> void:
	speed_idx = (speed_idx + 1) % SPEEDS.size()
	var s: float = SPEEDS[speed_idx]
	speed_button.text = ("%s×" % ("½" if s == 0.5 else str(int(s))))
	if playing:
		timer.start(TICK / s)


func _step() -> void:
	if frame >= frames.size() - 1:
		_pause()
		return
	frame += 1
	_apply(frames[frame], TICK / SPEEDS[speed_idx] * 0.8)
	if frame >= frames.size() - 1:
		_pause()
		_show_summary()


func _apply(fr: Dictionary, animate: float) -> void:
	tick_label.text = "Takt %d%s" % [int(fr.tick), " · Zeitzerfall" if int(fr.tick) > UhrCombat.DECAY_START else ""]
	for side in ["a", "b"]:
		var s: Dictionary = fr[side]
		bars[side].set_values(int(s.hp), int(s.shield), animate)
		towers[side].apply_frame(s, animate)
		var st: Array[String] = []
		if int(s.burn) > 0:
			st.append("Brand %d" % int(s.burn))
		if int(s.poison) > 0:
			st.append("Gift %d" % int(s.poison))
		if int(s.oil) > 0:
			st.append("Öl %d" % int(s.oil))
		if int(s.rust) > 0:
			st.append("Rost %d" % int(s.rust))
		status_labels[side].text = " · ".join(st)
	var events: Array = fr.events
	var n := events.size()
	for k in n:
		var ev: Dictionary = events[k]
		var delay := animate * float(k) / maxf(1.0, float(n))
		if delay <= 0.0:
			_show_event(ev)
		else:
			get_tree().create_timer(delay).timeout.connect(_show_event.bind(ev))


func _show_event(ev: Dictionary) -> void:
	var tv = towers[ev.side]  # TowerView or GridView
	var idx := int(ev.idx)
	var n := int(ev.get("n", 0))
	match ev.type:
		"fire":
			tv.flash(idx)
		"strike":
			tv.flash(idx, true)
			tv.pop(idx, "Schlag", UhrStyle.BRASS)
		"dmg":
			if n > 0:
				tv.pop(idx, str(n), UhrStyle.BRASS)
		"shield":
			if n > 0:
				tv.pop(idx, "+%d" % n, UhrStyle.SHIELD)
		"heal":
			if n > 0:
				tv.pop(idx, "+%d" % n, UhrStyle.HEAL)
		"burn":
			tv.pop(idx, "Brand %d" % n, UhrStyle.BURN)
		"poison":
			tv.pop(idx, "Gift %d" % n, UhrStyle.POISON)
		"rust":
			tv.pop(idx, "Rost %d" % n, UhrStyle.MUTED)
		"oil":
			tv.pop(idx, "Öl %d" % n, UhrStyle.MUTED)


func _show_summary() -> void:
	var w: String = result.winner
	var text := "Sieg" if w == "a" else ("Niederlage" if w == "b" else "Unentschieden")
	var panel := PanelContainer.new()
	var sb := UhrStyle.box(Color(0.19, 0.17, 0.25), 12, 0)
	sb.set_content_margin_all(16)
	sb.shadow_color = Color(0, 0, 0, 0.5)
	sb.shadow_size = 16
	panel.add_theme_stylebox_override("panel", sb)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	col.add_child(UhrStyle.label(text, 28, UhrStyle.MINE if w == "a" else (UhrStyle.FOE if w == "b" else UhrStyle.BRASS)))
	col.add_child(UhrStyle.label("%d Takte, %.0f Sekunden" % [int(result.ticks), result.ticks * TICK], 13, UhrStyle.MUTED))
	col.add_child(UhrStyle.label("Deine stärksten Räume", 14, UhrStyle.TEXT))
	for line in _top_rooms(3):
		col.add_child(UhrStyle.label(line, 13, UhrStyle.MUTED))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var again := UhrStyle.button("Nochmal")
	again.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	again.pressed.connect(func() -> void: _restart())
	var next := UhrStyle.button("Weiter" if _is_run() else "Neuer Kampf", true)
	next.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	next.pressed.connect(_leave if _is_run() else _new_fight)
	row.add_child(again)
	row.add_child(next)
	col.add_child(row)
	panel.add_child(col)
	overlay = CenterContainer.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.custom_minimum_size.x = 320
	overlay.add_child(panel)
	add_child(overlay)


## Same weighting as the lab report: burn and poison keep hurting, shield and heal count less.
func _top_rooms(k: int) -> Array[String]:
	var rows: Array = []
	var stats: Array = result.statsA
	for i in stats.size():
		var s: Array = stats[i]
		var v := float(s[0]) + float(s[3]) * 2.5 + float(s[4]) * 8.0 + float(s[1]) * 0.6 + float(s[2]) * 0.6
		rows.append([v, i])
	rows.sort_custom(func(x: Array, y: Array) -> bool: return x[0] > y[0])
	var out: Array[String] = []
	for row in rows.slice(0, k):
		var i: int = row[1]
		var s: Array = stats[i]
		var parts: Array[String] = []
		if s[0] > 0: parts.append("%d Schaden" % s[0])
		if s[3] > 0: parts.append("%d Brand" % s[3])
		if s[4] > 0: parts.append("%d Gift" % s[4])
		if s[1] > 0: parts.append("%d Schild" % s[1])
		if s[2] > 0: parts.append("%d Heilung" % s[2])
		if parts.is_empty(): parts.append("%d× ausgelöst" % s[5])
		out.append("%s: %s" % [_def(setup.mine.rooms[i].id).name, ", ".join(parts)])
	return out


func _show_room(i: int, side: String) -> void:
	if sheet:
		sheet.queue_free()
	var tower: Dictionary = setup.mine if side == "a" else setup.foe
	var r: Dictionary = tower.rooms[i]
	var def := _def(r.id)
	var tier := int(r.get("tier", 0)) if r.get("tier") != null else 0
	sheet = PanelContainer.new()
	var sb := UhrStyle.box(Color(0.19, 0.17, 0.25), 14, 0)
	sb.set_content_margin_all(16)
	sheet.add_theme_stylebox_override("panel", sb)
	var col := VBoxContainer.new()
	col.add_child(UhrStyle.label(def.name, 20, UhrStyle.TEXT))
	var unit := ("Feld" if int(def.height) == 1 else "Felder") if _is_grid() else ("Etage" if int(def.height) == 1 else "Etagen")
	var facts := "%s · Stufe %s (%s) · %d %s" % [UhrContent.guild(def.guild).name, ["I", "II", "III", "IV"][tier], UhrContent.tier_name(tier), int(def.height), unit]
	if def.get("fusion", false):
		facts += " · Verschmelzung"
	col.add_child(UhrStyle.label(facts, 13, UhrStyle.MUTED))
	col.add_child(UhrStyle.label(def.text, 15, UhrStyle.TEXT))
	if r.get("alloy") != null and r.get("alloy") != "":
		var al := UhrContent.alloy(r.alloy)
		col.add_child(UhrStyle.label("Legierung %s: %s" % [al.name, al.text], 13, UhrStyle.BRASS))
	col.add_child(UhrStyle.label("Tippen zum Schließen", 11, UhrStyle.MUTED))
	sheet.add_child(col)
	sheet.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	sheet.offset_top = -200
	sheet.gui_input.connect(func(e: InputEvent) -> void:
		if (e is InputEventMouseButton and e.pressed) or (e is InputEventScreenTouch and e.pressed):
			sheet.queue_free()
			sheet = null)
	add_child(sheet)
