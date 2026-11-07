class_name GridView
extends Control
## The 3-wide grid tower (ADR 0008), drawn by hand: rooms with their shapes in guild colours, the
## spark's direction per row, rows still locked, and a ghost preview for placing or moving.
## Only displays and reports taps; the rules live in game/core.

signal cell_tapped(x: int, y: int)
## A tap on a placed room (index into tower.rooms), e.g. for details during a fight.
signal room_tapped(index: int)

const MAX_ROWS := 8
const GAP := 3.0
## Word endings where a long room name may break onto a second line.
const WORD_PARTS := ["kammer", "gießerei", "glocke", "horst", "lager", "werk", "ofen", "küche", "hemmung", "getriebe", "feder", "turm", "bad", "schleife", "uhr", "seil", "spiel", "hemmung", "stille", "lysator"]

var tower: Dictionary = UhrRasterTower.empty_grid(3)
var selected := -1
## Ghost preview: { id, x, y, rot, ok } or empty.
var ghost: Dictionary = {}
## Text on the first locked row, e.g. "ab Stunde 3".
var locked_text := ""
## Compact mode for fights: no locked rows, smaller text, room details on tap.
var compact := false

# ---- fight playback (apply_frame, flash, pop), same interface as TowerView
## Room states of the current frame: [{ broken, charge, counter }].
var _states: Array = []
## First cell of each step on the spark's path (the engine's path, see UhrCombat._grid_layout).
var _path_cells: Array = []
var _sparks: Array[Panel] = []
var _flash := {}
var _rising := {}
## Rooms that just landed: 1.0 at the start of the pop, 0.0 at rest.
var _land := {}
## A row that just opened glows: row index -> strength 1..0.
var _row_glow := {}
## Rows to draw; -1 means the open rows plus one.
var rows_shown := -1
## Rooms outlined as neighbours of the ghost or the selected room.
var highlight: Array = []
## The ghost would complete a recipe: drawn in brass.
var ghost_fuses := false
var shake_offset := Vector2.ZERO:
	set(v):
		shake_offset = v
		queue_redraw()


func setup(t: Dictionary) -> void:
	tower = t
	_states = []
	_flash = {}
	for sp in _sparks:
		sp.queue_free()
	_sparks.clear()
	_path_cells = _compute_path_cells()
	queue_redraw()


## Mirrors the engine's path: cells in snake order, consecutive cells of the same owner (or
## empty) form one step. The spark position in a frame is an index into these steps.
func _compute_path_cells() -> Array:
	var occ := UhrRasterTower._occupancy(tower)
	var out: Array = []
	var last := -2
	for cell in UhrCombat.snake_order(int(tower.width), int(tower.rows)):
		var o: int = occ[cell[1] * int(tower.width) + cell[0]]
		if o != last:
			out.append(cell)
			last = o
	return out


func show_static() -> void:
	queue_redraw()


func apply_frame(side: Dictionary, animate: float) -> void:
	_states = side.rooms
	var positions: Array = side.sparks
	while _sparks.size() < positions.size():
		var sp := _make_spark()
		add_child(sp)
		sp.position = _spark_point(int(positions[_sparks.size()])) - sp.size / 2
		_sparks.append(sp)
	for k in positions.size():
		var target := _spark_point(int(positions[k])) - _sparks[k].size / 2
		if animate > 0.0:
			create_tween().tween_property(_sparks[k], "position", target, animate).set_trans(Tween.TRANS_SINE)
		else:
			_sparks[k].position = target
	queue_redraw()


func _spark_point(pos: int) -> Vector2:
	if _path_cells.is_empty():
		return Vector2.ZERO
	var cell: Array = _path_cells[clampi(pos, 0, _path_cells.size() - 1)]
	var r := cell_rect(cell[0], cell[1])
	# Rows to the right start at the left edge, rows to the left at the right edge.
	var x := r.position.x + 8.0 if int(cell[1]) % 2 == 0 else r.end.x - 8.0
	return Vector2(x, r.get_center().y)


func _make_spark() -> Panel:
	var sp := Panel.new()
	sp.size = Vector2(12, 12)
	sp.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var b := StyleBoxFlat.new()
	b.bg_color = Color(1.0, 0.95, 0.8)
	b.set_corner_radius_all(6)
	b.shadow_color = Color(UhrStyle.BRASS, 0.9)
	b.shadow_size = 8
	sp.add_theme_stylebox_override("panel", b)
	sp.z_index = 2
	return sp


## Brief highlight when a room fires.
func flash(i: int, strong := false) -> void:
	if i < 0 or i >= tower.rooms.size():
		return
	_flash[i] = 2 if strong else 1
	queue_redraw()
	get_tree().create_timer(0.14).timeout.connect(func() -> void:
		_flash.erase(i)
		queue_redraw())


## Sparks flying out of room i, in the room's guild colour.
func burst(i: int, amount := 10, color := Color()) -> void:
	if i < 0 or i >= tower.rooms.size():
		return
	var cells := _abs_cells(tower.rooms[i])
	var center := Vector2.ZERO
	for cc in cells:
		center += cell_rect(cc[0], cc[1]).get_center()
	center /= cells.size()
	if color == Color():
		color = UhrStyle.guild_color(UhrContent.raster_room(tower.rooms[i].id).guild)
	burst_at(center, amount, color)


func burst_at(pos: Vector2, amount: int, color: Color) -> void:
	var p := CPUParticles2D.new()
	p.position = pos
	p.one_shot = true
	p.explosiveness = 0.9
	p.amount = amount
	p.lifetime = 0.5
	p.direction = Vector2.UP
	p.spread = 180.0
	p.gravity = Vector2(0, 420)
	p.initial_velocity_min = 70.0
	p.initial_velocity_max = 170.0
	p.scale_amount_min = 3.0
	p.scale_amount_max = 6.0
	var ramp := Gradient.new()
	ramp.set_color(0, color.lightened(0.35))
	ramp.set_color(1, Color(color, 0.0))
	p.color_ramp = ramp
	p.z_index = 4
	add_child(p)
	p.emitting = true
	p.finished.connect(p.queue_free)


## Shakes the drawing for a moment (rooms and frame; sparks and numbers stay put).
func shake(strength := 4.0) -> void:
	var tw := create_tween()
	for k in 4:
		var s := strength * (1.0 - k / 4.0)
		tw.tween_property(self, "shake_offset", Vector2(s if k % 2 == 0 else -s, 0), 0.035)
	tw.tween_property(self, "shake_offset", Vector2.ZERO, 0.035)


## Lets a freshly opened row glow up and fade (the tower grew).
func glow_row(y: int) -> void:
	_row_glow[y] = 1.0
	var tw := create_tween()
	tw.tween_method(func(v: float) -> void:
		_row_glow[y] = v
		queue_redraw(), 1.0, 0.0, 1.2).set_delay(0.2)
	tw.tween_callback(func() -> void: _row_glow.erase(y))


## Pops room i in: used when a room is placed or fused in the workshop.
func land(i: int) -> void:
	_land[i] = 0.0
	var tw := create_tween()
	tw.tween_method(func(v: float) -> void:
		_land[i] = v
		queue_redraw(), 1.0, 0.0, 0.25).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_callback(func() -> void: _land.erase(i))


## A small number rising from room i.
func pop(i: int, text: String, color: Color) -> void:
	if i < 0 or i >= tower.rooms.size():
		return
	var first: Array = _abs_cells(tower.rooms[i])[0]
	var r := cell_rect(first[0], first[1])
	var l := UhrStyle.label(text, 13 if compact else 15, color, false)
	l.add_theme_color_override("font_outline_color", UhrStyle.NIGHT)
	l.add_theme_constant_override("outline_size", 5)
	var stack: int = _rising.get(i, 0)
	_rising[i] = stack + 1
	l.size = Vector2(r.size.x, 18)
	l.position = Vector2(r.position.x, r.position.y + 2 + stack * 14)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.z_index = 3
	add_child(l)
	var tw := create_tween().set_parallel()
	tw.tween_property(l, "position:y", l.position.y - 22, 0.7).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, "modulate:a", 0.0, 0.7).set_delay(0.25)
	tw.chain().tween_callback(func() -> void:
		_rising[i] = maxi(0, _rising.get(i, 1) - 1)
		l.queue_free())


func set_ghost(g: Dictionary) -> void:
	ghost = g
	queue_redraw()


func set_selected(i: int) -> void:
	selected = i
	queue_redraw()


## Rows on screen: the open rows plus one locked row that shows the next growth. A fight sets
## rows_shown so both towers have the same height.
func _shown_rows() -> int:
	if rows_shown > 0:
		return rows_shown
	return mini(MAX_ROWS, int(tower.rows) + 1)


func cell_size() -> Vector2:
	var w := size.x / UhrRasterTower.WIDTH
	var h := minf(w * (2.0 if compact else 1.0), size.y / _shown_rows())
	return Vector2(w, h)


## Screen rectangle of a cell; row 0 is the foundation at the bottom.
func cell_rect(x: int, y: int) -> Rect2:
	var c := cell_size()
	return Rect2(Vector2(x * c.x, size.y - (y + 1) * c.y), c)


func _gui_input(event: InputEvent) -> void:
	# Only mouse buttons: on phones, touches arrive as emulated mouse events too, and handling
	# both made one tap count twice (preview and confirm at once).
	if not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return
	var cell := cell_at(event.position)
	if cell.is_empty():
		return
	accept_event()
	cell_tapped.emit(cell[0], cell[1])
	var i := room_at(cell[0], cell[1])
	if i >= 0:
		room_tapped.emit(i)


## The open cell under a point, or [] outside the tower.
func cell_at(pos: Vector2) -> Array:
	var c := cell_size()
	var x := int(floorf((pos.x - shake_offset.x) / c.x))
	var y := int(floorf((size.y - pos.y) / c.y))
	if x >= 0 and x < UhrRasterTower.WIDTH and y >= 0 and y < int(tower.rows):
		return [x, y]
	return []


func room_at(x: int, y: int) -> int:
	for i in tower.rooms.size():
		if _abs_cells(tower.rooms[i]).has([x, y]):
			return i
	return -1


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()


func _draw() -> void:
	draw_set_transform(shake_offset)
	var font := get_theme_default_font()
	var c := cell_size()
	var rows := int(tower.rows)
	# Cells: open rows with the spark's direction, locked rows dimmed.
	for y in _shown_rows():
		for x in UhrRasterTower.WIDTH:
			var r := cell_rect(x, y).grow(-GAP)
			if y < rows:
				draw_rect(r, UhrStyle.PANEL.darkened(0.25).lerp(UhrStyle.BRASS, 0.45 * float(_row_glow.get(y, 0.0))))
				var arrow := "›" if y % 2 == 0 else "‹"
				draw_string(font, r.position + Vector2(0, r.size.y * 0.5 + 6), arrow, HORIZONTAL_ALIGNMENT_CENTER, r.size.x, 14 if compact else 18, UhrStyle.LINE.lightened(0.15))
			else:
				draw_rect(r, UhrStyle.NIGHT.lightened(0.03))
	if not compact and rows < MAX_ROWS and locked_text != "":
		var lr := cell_rect(0, rows)
		draw_string(font, lr.position + Vector2(0, lr.size.y * 0.5 + 5), locked_text, HORIZONTAL_ALIGNMENT_CENTER, c.x * UhrRasterTower.WIDTH, 13, UhrStyle.MUTED)
	# Rooms.
	for i in tower.rooms.size():
		var room: Dictionary = tower.rooms[i]
		var def := UhrContent.raster_room(room.id)
		var col := UhrStyle.guild_color(def.guild)
		var fill := UhrStyle.PANEL.lerp(col, 0.28)
		if _flash.has(i):
			fill = UhrStyle.BRASS.darkened(0.3) if _flash[i] == 2 else UhrStyle.PANEL.lerp(col, 0.6)
		var st: Dictionary = _states[i] if i < _states.size() else {}
		if st.get("broken", false):
			fill = Color(fill, 0.35)
		var land: float = _land.get(i, 0.0)
		if land > 0.0:
			fill = fill.lerp(col.lightened(0.3), land * 0.7)
		var border_w := (3.0 if i == selected or highlight.has(i) else 1.5) + land * 4.0
		var border := UhrStyle.BRASS if i == selected or land > 0.0 else (col.lightened(0.45) if highlight.has(i) else col)
		if highlight.has(i):
			fill = fill.lerp(col, 0.25)
		_draw_cells(_abs_cells(room), fill, border, border_w)
		var first: Array = _abs_cells(room)[0]
		var fr := cell_rect(first[0], first[1]).grow(-GAP - (2 if compact else 4))
		var tier := int(room.tier) if room.get("tier") != null else 0
		var name: String = def.name
		# Long names (Quecksilberhemmung) get a smaller font instead of being cut off.
		var fs := 11 if compact else 13
		var lines := _name_lines(font, name, fr.size.x, fs, 9 if compact else 10)
		fs = int(lines[0])
		for k in range(1, lines.size()):
			draw_string(font, fr.position + Vector2(0, fs + 3 + (k - 1) * (fs + 1)), lines[k], HORIZONTAL_ALIGNMENT_LEFT, fr.size.x, fs, UhrStyle.TEXT)
		var name_h := (lines.size() - 2) * (fs + 1)
		var sub: String = ["I", "II", "III", "IV"][tier]
		if not compact and room.get("alloy") != null and room.get("alloy") != "":
			sub += " · " + str(UhrContent.alloy(room.alloy).name)
		if def.has("counterMax") and int(def.counterMax) > 1 and st.has("counter"):
			sub += " · %d/%d" % [int(st.counter), int(def.counterMax)]
		if float(st.get("charge", 0.0)) > 0.0:
			sub += " · +%d" % int(floorf(float(st.charge) + 0.5))
		draw_string(font, fr.position + Vector2(0, fs + 17 + name_h), sub, HORIZONTAL_ALIGNMENT_LEFT, fr.size.x, 10 if compact else 11, UhrStyle.TIER_COLORS[tier])
	# Ghost.
	if not ghost.is_empty():
		var cells: Array = []
		for cc in UhrContent.cells_of(UhrContent.raster_room(ghost.id), int(ghost.rot)):
			cells.append([int(ghost.x) + cc[0], int(ghost.y) + cc[1]])
		var tint := (UhrStyle.BRASS if ghost_fuses else UhrStyle.MINE) if ghost.ok else UhrStyle.FOE
		# Opaque fill: semi-transparent cells would darken where they join.
		_draw_cells(cells, UhrStyle.PANEL.darkened(0.25).lerp(tint, 0.3), tint, 2.5)


## Fits a room name into width: shrinks the font down to min_fs, then breaks into two lines
## (at a space or, for one long word, with a hyphen). Returns [font size, line, line...].
func _name_lines(font: Font, name: String, width: float, fs: int, min_fs: int) -> Array:
	var fits := func(t: String, f: int) -> bool: return font.get_string_size(t, HORIZONTAL_ALIGNMENT_LEFT, -1, f).x <= width
	for f in range(fs, min_fs - 1, -1):
		if fits.call(name, f):
			return [f, name]
	var f := min_fs
	var sp := name.find(" ")
	if sp > 0 and fits.call(name.substr(0, sp), f):
		return [f, name.substr(0, sp), name.substr(sp + 1)]
	# Prefer the joint of a compound word (Waffen-kammer, Brenn-ofen).
	var lower := name.to_lower()
	for part in WORD_PARTS:
		var at := lower.rfind(part)
		if at > 2 and at + part.length() == name.length() and fits.call(name.substr(0, at) + "-", f):
			return [f, name.substr(0, at) + "-", name.substr(at)]
	var cut := name.length() - 3
	while cut > 2 and not fits.call(name.substr(0, cut) + "-", f):
		cut -= 1
	return [f, name.substr(0, cut) + "-", name.substr(cut)]


func _abs_cells(room: Dictionary) -> Array:
	var rot := int(room.rot) if room.get("rot") != null else 0
	var out: Array = []
	for cc in UhrContent.cells_of(UhrContent.raster_room(room.id), rot):
		out.append([int(room.x) + cc[0], int(room.y) + cc[1]])
	return out


## Fills the cells of one shape as one piece: neighbouring cells are joined across the gap.
func _draw_cells(cells: Array, fill: Color, border: Color, width: float) -> void:
	var has := func(x: int, y: int) -> bool: return cells.has([x, y])
	# Each cell's rectangle reaches across the gap to neighbours of the same shape, so fill and
	# border form one piece.
	var rects: Array[Rect2] = []
	for cc in cells:
		var r := cell_rect(cc[0], cc[1]).grow(-GAP)
		if has.call(cc[0] - 1, cc[1]):
			r = r.grow_side(SIDE_LEFT, GAP)
		if has.call(cc[0] + 1, cc[1]):
			r = r.grow_side(SIDE_RIGHT, GAP)
		if has.call(cc[0], cc[1] + 1):
			r = r.grow_side(SIDE_TOP, GAP)
		if has.call(cc[0], cc[1] - 1):
			r = r.grow_side(SIDE_BOTTOM, GAP)
		rects.append(r)
		draw_rect(r, fill)
	for k in cells.size():
		var cc: Array = cells[k]
		var r := rects[k]
		if not has.call(cc[0] - 1, cc[1]):
			draw_line(r.position, Vector2(r.position.x, r.end.y), border, width)
		if not has.call(cc[0] + 1, cc[1]):
			draw_line(Vector2(r.end.x, r.position.y), r.end, border, width)
		if not has.call(cc[0], cc[1] + 1):
			draw_line(r.position, Vector2(r.end.x, r.position.y), border, width)
		if not has.call(cc[0], cc[1] - 1):
			draw_line(Vector2(r.position.x, r.end.y), r.end, border, width)
