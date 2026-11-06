class_name TowerView
extends Control
## One tower on the combat screen: rooms stacked from the foundation (bottom) upwards, each as
## tall as its floors. Shows tier, alloy, bell counter and spring charge, moves the sparks and
## shows small numbers when a room acts. Purely visual; all numbers come from UhrCombat frames.

signal room_tapped(index: int)
## Placement mode: the player tapped the gap at position pos (0 = below the foundation).
signal slot_tapped(pos: int)

const FLOORS := 8
const GAP := 4.0

var rooms: Array = []
var panels: Array[PanelContainer] = []
var infos: Array[Label] = []
var sparks: Array[Panel] = []
var _layout_done := false
## Pops currently rising per room, so several numbers in one tick stack instead of overlapping.
var _rising := {}
var _slots: Array[Button] = []
var _selected := -1


func setup(tower: Dictionary) -> void:
	rooms = tower.rooms
	for c in get_children():
		c.queue_free()
	panels.clear()
	infos.clear()
	sparks.clear()
	for i in rooms.size():
		var r: Dictionary = rooms[i]
		var def := UhrContent.room(r.id)
		var p := PanelContainer.new()
		p.add_theme_stylebox_override("panel", UhrStyle.box(UhrStyle.PANEL, 6, 4, UhrStyle.guild_color(def.guild)))
		p.mouse_filter = Control.MOUSE_FILTER_STOP
		p.gui_input.connect(_on_room_input.bind(i))
		var col := VBoxContainer.new()
		col.add_theme_constant_override("separation", 0)
		col.alignment = BoxContainer.ALIGNMENT_CENTER
		# No autowrap: manually placed panels give wrapping labels no width to measure.
		var name := UhrStyle.label(def.name, 14, UhrStyle.TEXT, false)
		name.clip_text = true
		name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		col.add_child(name)
		var info := UhrStyle.label("", 11, UhrStyle.MUTED, false)
		info.clip_text = true
		col.add_child(info)
		p.add_child(col)
		add_child(p)
		panels.append(p)
		infos.append(info)
	_layout_done = false
	queue_sort_rooms()


func queue_sort_rooms() -> void:
	if is_inside_tree():
		_layout.call_deferred()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_layout()


func floor_height() -> float:
	return (size.y - GAP * (FLOORS - 1)) / FLOORS


## Rect of room i in local coordinates.
func room_rect(i: int) -> Rect2:
	var fh := floor_height()
	var below := 0
	for k in i:
		below += int(UhrContent.room(rooms[k].id).height)
	var h := int(UhrContent.room(rooms[i].id).height)
	var bottom := size.y - below * (fh + GAP)
	var height := h * fh + (h - 1) * GAP
	return Rect2(0, bottom - height, size.x, height)


## Where a spark waits: left edge of the room it fires next, or above the top room.
func spark_point(pos: int) -> Vector2:
	if pos < rooms.size():
		var r := room_rect(pos)
		return Vector2(-4, r.position.y + r.size.y / 2)
	var top := room_rect(rooms.size() - 1) if not rooms.is_empty() else Rect2(0, size.y, size.x, 0)
	return Vector2(-4, top.position.y - floor_height() / 2)


func _layout() -> void:
	for i in panels.size():
		var r := room_rect(i)
		panels[i].position = r.position
		panels[i].size = r.size
	_layout_slots()
	_layout_done = true


## Workshop view: tier, alloy and bell counters without a running fight.
func show_static() -> void:
	for i in panels.size():
		infos[i].text = _info_text(i, { "broken": false, "counter": 0, "charge": 0.0 })


## Highlights one room (selected for selling, moving or an alloy), -1 for none.
func select_room(i: int) -> void:
	_selected = i
	for k in panels.size():
		var sb: StyleBoxFlat = panels[k].get_theme_stylebox("panel")
		sb.bg_color = UhrStyle.PANEL_LIT if k == i else UhrStyle.PANEL
		sb.border_width_right = 2 if k == i else 0
		sb.border_width_top = 2 if k == i else 0
		sb.border_width_bottom = 2 if k == i else 0


## Placement mode: shows tappable gaps between the rooms, or hides them.
func show_slots(enabled: bool) -> void:
	for b in _slots:
		b.queue_free()
	_slots.clear()
	if not enabled:
		return
	for pos in rooms.size() + 1:
		var b := Button.new()
		b.text = "hier einbauen"
		b.add_theme_font_size_override("font_size", 12)
		var sb := UhrStyle.box(Color(UhrStyle.BRASS, 0.85), 8)
		for st in ["normal", "hover", "pressed", "focus"]:
			b.add_theme_stylebox_override(st, sb)
		for st in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
			b.add_theme_color_override(st, UhrStyle.NIGHT)
		b.z_index = 4
		b.pressed.connect(func() -> void: slot_tapped.emit(pos))
		add_child(b)
		_slots.append(b)
	_layout_slots()


func _layout_slots() -> void:
	var h := 26.0
	for pos in _slots.size():
		var y: float
		if pos < rooms.size():
			y = room_rect(pos).end.y - h / 2.0
		else:
			y = (room_rect(rooms.size() - 1).position.y if not rooms.is_empty() else size.y) - h / 2.0 - GAP
		y = clampf(y, 0.0, size.y - h)
		_slots[pos].position = Vector2(size.x * 0.2, y)
		_slots[pos].size = Vector2(size.x * 0.6, h)


## Applies one side of a combat frame: broken rooms, bell counters, charge and spark positions.
func apply_frame(side: Dictionary, animate: float) -> void:
	var states: Array = side.rooms
	for i in mini(states.size(), panels.size()):
		var st: Dictionary = states[i]
		panels[i].modulate.a = 0.35 if st.broken else 1.0
		infos[i].text = _info_text(i, st)
	var positions: Array = side.sparks
	while sparks.size() < positions.size():
		var s := _make_spark()
		add_child(s)
		s.position = spark_point(int(positions[sparks.size()])) - s.size / 2
		sparks.append(s)
	for k in positions.size():
		var target := spark_point(int(positions[k])) - sparks[k].size / 2
		if animate > 0.0:
			create_tween().tween_property(sparks[k], "position", target, animate).set_trans(Tween.TRANS_SINE)
		else:
			sparks[k].position = target


func _info_text(i: int, st: Dictionary) -> String:
	var r: Dictionary = rooms[i]
	var def := UhrContent.room(r.id)
	var tier := int(r.get("tier", 0)) if r.get("tier") != null else 0
	# Tier as a roman numeral: the tier names Silber and Gold would read like the alloys.
	var parts: Array[String] = [["I", "II", "III", "IV"][tier]]
	if r.get("alloy") != null and r.get("alloy") != "":
		parts.append(UhrContent.alloy(r.alloy).name)
	if def.has("counterMax") and int(def.counterMax) > 1:
		parts.append("%d/%d" % [int(st.counter), int(def.counterMax)])
	if float(st.charge) > 0.0:
		parts.append("Spannung %d" % int(floorf(float(st.charge) + 0.5)))
	if st.broken:
		parts.append("zerbrochen")
	return " · ".join(parts)


func _make_spark() -> Panel:
	var s := Panel.new()
	s.size = Vector2(12, 12)
	s.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var b := StyleBoxFlat.new()
	b.bg_color = Color(1.0, 0.95, 0.8)
	b.set_corner_radius_all(6)
	b.shadow_color = Color(UhrStyle.BRASS, 0.9)
	b.shadow_size = 8
	s.add_theme_stylebox_override("panel", b)
	s.z_index = 2
	return s


## Brief highlight when a room fires.
func flash(i: int, strong := false) -> void:
	if i < 0 or i >= panels.size():
		return
	var p := panels[i]
	var sb: StyleBoxFlat = p.get_theme_stylebox("panel")
	sb.bg_color = UhrStyle.BRASS.darkened(0.35) if strong else UhrStyle.PANEL_LIT
	var tw := create_tween()
	tw.tween_interval(0.12)
	tw.tween_callback(func() -> void: sb.bg_color = UhrStyle.PANEL)


## A small number rising from room i.
func pop(i: int, text: String, color: Color) -> void:
	if i < 0 or i >= panels.size():
		return
	var r := room_rect(i)
	var l := UhrStyle.label(text, 15, color, false)
	l.add_theme_color_override("font_outline_color", UhrStyle.NIGHT)
	l.add_theme_constant_override("outline_size", 5)
	var stack: int = _rising.get(i, 0)
	_rising[i] = stack + 1
	l.position = Vector2(r.size.x - 70, r.position.y + 2 + stack * 16)
	l.size = Vector2(64, 20)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.z_index = 3
	add_child(l)
	var tw := create_tween().set_parallel()
	tw.tween_property(l, "position:y", l.position.y - 26, 0.7).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, "modulate:a", 0.0, 0.7).set_delay(0.25)
	tw.chain().tween_callback(func() -> void:
		_rising[i] = maxi(0, _rising.get(i, 1) - 1)
		l.queue_free())


func _on_room_input(event: InputEvent, i: int) -> void:
	if (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT) or (event is InputEventScreenTouch and event.pressed):
		room_tapped.emit(i)
