extends Control
## Start screen: title, an idle tower with the spark climbing floor by floor, and the
## build info at the bottom so a phone tester always knows which build is running.
## The real combat screen arrives in M2; this scene only proves layout, timing and deploy.

const TICK := 0.6
## Room ids from the shared content file; names and guild colours come from res://data/content.json.
const FLOORS := ["waffenkammer", "schmiede", "kleineGlocke", "feder", "brennofen", "echo", "bollwerk", "laeutwerk"]
const BRASS := Color(0.89, 0.71, 0.31)
const NIGHT := Color(0.071, 0.067, 0.102)
const PANEL := Color(0.15, 0.14, 0.2)
const PANEL_LIT := Color(0.27, 0.23, 0.3)
const MUTED := Color(0.63, 0.61, 0.71)

var floor_panels: Array[PanelContainer] = []
var spark := 0
var loops := 0
var loop_label: Label


func _ready() -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 20)
	margin.add_theme_constant_override("margin_top", 36)
	margin.add_theme_constant_override("margin_bottom", 20)
	add_child(margin)

	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 6)
	margin.add_child(col)

	col.add_child(_label("Uhrturm", 44, BRASS))
	col.add_child(_label("Der Funke steigt. Um Mitternacht schlägt der Turm.", 15, MUTED))

	var spacer := Control.new()
	spacer.custom_minimum_size.y = 14
	col.add_child(spacer)

	var tower := VBoxContainer.new()
	tower.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tower.alignment = BoxContainer.ALIGNMENT_END
	tower.add_theme_constant_override("separation", 4)
	col.add_child(tower)
	# Floor 0 is the foundation and sits at the bottom, so add from the top down.
	for i in range(FLOORS.size() - 1, -1, -1):
		var p := _floor_panel(UhrContent.room(FLOORS[i]))
		tower.add_child(p)
		floor_panels.push_front(p)

	loop_label = _label("Runde 0", 13, MUTED)
	loop_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(loop_label)
	var rooms_total: int = UhrContent.data().rooms.size()
	var info := _label("%s · %d Räume" % [_build_info(), rooms_total], 12, MUTED)
	info.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(info)

	var timer := Timer.new()
	timer.wait_time = TICK
	timer.autostart = true
	timer.timeout.connect(_on_tick)
	add_child(timer)
	_light(0)


func _on_tick() -> void:
	spark += 1
	if spark >= floor_panels.size():
		spark = 0
		loops += 1
		loop_label.text = "Runde %d" % loops
	_light(spark)


func _light(index: int) -> void:
	for i in floor_panels.size():
		var lit := i == index
		var box: StyleBoxFlat = floor_panels[i].get_theme_stylebox("panel")
		box.bg_color = PANEL_LIT if lit else PANEL
		box.border_width_left = 8 if lit else 4
	var p := floor_panels[index]
	p.pivot_offset = p.size / 2
	var tw := create_tween()
	tw.tween_property(p, "scale", Vector2(1.03, 1.03), 0.08)
	tw.tween_property(p, "scale", Vector2.ONE, 0.18)


func _floor_panel(room: Dictionary) -> PanelContainer:
	var p := PanelContainer.new()
	var box := StyleBoxFlat.new()
	box.bg_color = PANEL
	box.border_color = Color(UhrContent.guild(room.guild).color)
	box.set_border_width_all(0)
	box.border_width_left = 4
	box.set_corner_radius_all(6)
	box.content_margin_left = 12
	box.content_margin_top = 10
	box.content_margin_bottom = 10
	p.add_theme_stylebox_override("panel", box)
	p.custom_minimum_size.y = 52
	p.add_child(_label(room.name, 16, Color(0.93, 0.91, 0.96)))
	return p


func _label(text: String, size: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


## build_info.json is written by CI right before the export; locally it is missing.
func _build_info() -> String:
	if not FileAccess.file_exists("res://build_info.json"):
		return "Lokaler Build"
	var d: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://build_info.json"))
	if typeof(d) != TYPE_DICTIONARY:
		return "Build unbekannt"
	return "Build %s · %s" % [d.get("commit", "?"), d.get("built", "?")]
