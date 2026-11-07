extends Control
## Start screen: title, a small idle grid tower with the spark walking its snake path, the way
## into a run or a fight and the build info. A long press on the title opens the debug menu (seed, hour, scenario).

const TICK := 0.6
const LONG_PRESS := 0.7
## The idle tower is a showcase (UhrScenarios), shown with the rows it has at that hour.
const DECO_SHOWCASE := 1

var deco: GridView
var spark := 0
var debug_panel: PanelContainer
var debug_seed := 1
var debug_hour := 6
var debug_scenario := -1
var debug_labels := {}
var _press_started := -1.0


func _ready() -> void:
	UhrSound.warm()
	var bg := ColorRect.new()
	bg.color = UhrStyle.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 20)
	margin.add_theme_constant_override("margin_top", 36)
	margin.add_theme_constant_override("margin_bottom", 18)
	add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)

	var title := UhrStyle.label("Uhrturm", 44, UhrStyle.BRASS)
	title.mouse_filter = Control.MOUSE_FILTER_STOP
	title.gui_input.connect(_on_title_input)
	col.add_child(title)
	col.add_child(UhrStyle.label("Der Funke steigt. Um Mitternacht schlägt der Turm.", 15, UhrStyle.MUTED))

	deco = GridView.new()
	deco.size_flags_vertical = Control.SIZE_EXPAND_FILL
	deco.mouse_filter = Control.MOUSE_FILTER_IGNORE
	col.add_child(deco)
	deco.setup(UhrScenarios.showcase_tower(DECO_SHOWCASE))

	# The run is the 3-wide grid (ADR 0008). Saves of the old single column are no longer offered.
	var saved := UhrRasterSession.saved_summary()
	if saved != "":
		var cont := UhrStyle.button("Weiterspielen · %s" % saved, true)
		cont.custom_minimum_size.y = 58
		cont.pressed.connect(_continue_run)
		col.add_child(cont)
	var start := UhrStyle.button("Neuer Run", saved == "")
	start.custom_minimum_size.y = 58
	start.pressed.connect(func() -> void: _start_run(int(Time.get_unix_time_from_system()) % 1000000))
	col.add_child(start)

	var fight := UhrStyle.button("Kampf ansehen")
	fight.pressed.connect(func() -> void: _open_fight(int(Time.get_unix_time_from_system()) % 100000, -1, 0))
	col.add_child(fight)

	col.add_child(UhrStyle.label("Vorführ-Türme", 13, UhrStyle.MUTED))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 8)
	grid.add_theme_constant_override("v_separation", 8)
	for i in UhrScenarios.SHOWCASES.size():
		var b := UhrStyle.button(UhrScenarios.SHOWCASES[i].name)
		b.add_theme_font_size_override("font_size", 15)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		b.pressed.connect(_open_fight.bind(i + 1, i, 0))
		grid.add_child(b)
	col.add_child(grid)

	var toggles := HBoxContainer.new()
	toggles.add_theme_constant_override("separation", 8)
	toggles.add_child(_toggle("Klang", "sound", UhrSettings.sound()))
	toggles.add_child(_toggle("Vibration", "vibration", UhrSettings.vibration()))
	col.add_child(toggles)

	var rooms_total: int = UhrContent.raster().rooms.size()
	var info := UhrStyle.label("%s · %d Räume" % [_build_info(), rooms_total], 12, UhrStyle.MUTED)
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(info)

	var timer := Timer.new()
	timer.wait_time = TICK
	timer.autostart = true
	timer.timeout.connect(_on_tick)
	add_child(timer)
	await get_tree().process_frame
	_light(0)


## A settings switch: "Klang an" / "Klang aus".
func _toggle(title: String, key: String, on: bool) -> Button:
	var b := UhrStyle.button("%s %s" % [title, "an" if on else "aus"])
	b.add_theme_font_size_override("font_size", 14)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.pressed.connect(func() -> void:
		var now: bool = not (UhrSettings.sound() if key == "sound" else UhrSettings.vibration())
		UhrSettings.set_value(key, now)
		b.text = "%s %s" % [title, "an" if now else "aus"]
		if key == "sound":
			UhrSound.play("pick")
		else:
			UhrHaptics.buzz(30))
	return b


func _start_run(seed: int) -> void:
	UhrRasterSession.new_run(seed)
	get_tree().change_scene_to_file("res://scenes/raster.tscn")


func _continue_run() -> void:
	if UhrRasterSession.load_saved() == null:
		# The save no longer replays (rules changed since): start fresh instead of failing.
		UhrRasterSession.clear()
		_start_run(int(Time.get_unix_time_from_system()) % 1000000)
		return
	get_tree().change_scene_to_file("res://scenes/raster.tscn")


func _open_fight(seed: int, showcase: int, hour: int) -> void:
	CombatView.pending = UhrScenarios.build(seed, showcase, hour)
	get_tree().change_scene_to_file("res://scenes/combat.tscn")


func _on_tick() -> void:
	var steps: int = deco._path_cells.size()
	if steps == 0:
		return
	spark = (spark + 1) % steps
	_light(spark)


## Moves the spark to a step of the path and lights the room it enters.
func _light(index: int) -> void:
	deco.apply_frame({ "rooms": [], "sparks": [index] }, TICK * 0.8 if index > 0 else 0.0)
	if deco._path_cells.is_empty():
		return
	var cell: Array = deco._path_cells[index]
	var owner: int = UhrRasterTower._occupancy(deco.tower)[int(cell[1]) * UhrRasterTower.WIDTH + int(cell[0])]
	if owner >= 0:
		deco.flash(owner)


## build_info.json is written by CI right before the export; locally it is missing.
func _build_info() -> String:
	if not FileAccess.file_exists("res://build_info.json"):
		return "Lokaler Build"
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://build_info.json"))
	if typeof(d) != TYPE_DICTIONARY:
		return "Build unbekannt"
	return "Build %s · %s" % [d.get("commit", "?"), d.get("built", "?")]


# ------------------------------------------------------------------ debug menu


func _on_title_input(event: InputEvent) -> void:
	var down: bool = (event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT) or event is InputEventScreenTouch
	if not down:
		return
	if event.pressed:
		_press_started = Time.get_ticks_msec() / 1000.0
	elif _press_started >= 0.0:
		if Time.get_ticks_msec() / 1000.0 - _press_started >= LONG_PRESS:
			_toggle_debug()
		_press_started = -1.0


func _toggle_debug() -> void:
	if debug_panel:
		debug_panel.queue_free()
		debug_panel = null
		return
	debug_panel = PanelContainer.new()
	var sb := UhrStyle.box(Color(0.19, 0.17, 0.25), 14)
	sb.set_content_margin_all(16)
	debug_panel.add_theme_stylebox_override("panel", sb)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	col.add_child(UhrStyle.label("Debug", 20, UhrStyle.BRASS))
	col.add_child(_stepper("Seed", "seed", [-100, -1, 1, 100]))
	col.add_child(_stepper("Stunde", "hour", [-1, 1]))
	col.add_child(_stepper("Szenario", "scenario", [-1, 1]))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var close := UhrStyle.button("Schließen")
	close.pressed.connect(_toggle_debug)
	var go := UhrStyle.button("Kampf", true)
	go.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	go.pressed.connect(func() -> void: _open_fight(debug_seed, debug_scenario, debug_hour))
	var run_btn := UhrStyle.button("Run mit Seed")
	run_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	run_btn.pressed.connect(func() -> void: _start_run(debug_seed))
	row.add_child(close)
	row.add_child(run_btn)
	row.add_child(go)
	col.add_child(row)
	debug_panel.add_child(col)
	debug_panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	debug_panel.offset_top = -300
	add_child(debug_panel)
	_refresh_debug()


func _stepper(title: String, key: String, steps: Array) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	var name := UhrStyle.label(title, 15, UhrStyle.MUTED, false)
	name.custom_minimum_size.x = 76
	row.add_child(name)
	var value := UhrStyle.label("", 17, UhrStyle.TEXT, false)
	value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	debug_labels[key] = value
	for st in steps:
		var b := UhrStyle.button(("+%d" % st) if st > 0 else str(st))
		b.add_theme_font_size_override("font_size", 14)
		b.custom_minimum_size.x = 50
		b.pressed.connect(_debug_step.bind(key, st))
		row.add_child(b)
	row.add_child(value)
	row.move_child(value, 1)
	return row


func _debug_step(key: String, delta: int) -> void:
	match key:
		"seed":
			debug_seed = maxi(0, debug_seed + delta)
		"hour":
			debug_hour = clampi(debug_hour + delta, 1, 12)
		"scenario":
			debug_scenario = wrapi(debug_scenario + delta, -1, UhrScenarios.SHOWCASES.size())
	_refresh_debug()


func _refresh_debug() -> void:
	debug_labels.seed.text = str(debug_seed)
	debug_labels.hour.text = str(debug_hour)
	debug_labels.scenario.text = "Zufall" if debug_scenario < 0 else UhrScenarios.SHOWCASES[debug_scenario].name
