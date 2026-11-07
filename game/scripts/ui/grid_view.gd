class_name GridView
extends Control
## The 3-wide grid tower (ADR 0008), drawn by hand: rooms with their shapes in guild colours, the
## spark's direction per row, rows still locked, and a ghost preview for placing or moving.
## Only displays and reports taps; the rules live in game/core.

signal cell_tapped(x: int, y: int)

const MAX_ROWS := 8
const GAP := 3.0

var tower: Dictionary = UhrRasterTower.empty_grid(3)
var selected := -1
## Ghost preview: { id, x, y, rot, ok } or empty.
var ghost: Dictionary = {}
## Text on the first locked row, e.g. "ab Stunde 3".
var locked_text := ""


func setup(t: Dictionary) -> void:
	tower = t
	queue_redraw()


func set_ghost(g: Dictionary) -> void:
	ghost = g
	queue_redraw()


func set_selected(i: int) -> void:
	selected = i
	queue_redraw()


func cell_size() -> Vector2:
	var w := size.x / UhrRasterTower.WIDTH
	var h := minf(w * 0.7, size.y / MAX_ROWS)
	return Vector2(w, h)


## Screen rectangle of a cell; row 0 is the foundation at the bottom.
func cell_rect(x: int, y: int) -> Rect2:
	var c := cell_size()
	return Rect2(Vector2(x * c.x, size.y - (y + 1) * c.y), c)


func _gui_input(event: InputEvent) -> void:
	var pos := Vector2.ZERO
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pos = event.position
	elif event is InputEventScreenTouch and event.pressed:
		pos = event.position
	else:
		return
	var c := cell_size()
	var x := int(floorf(pos.x / c.x))
	var y := int(floorf((size.y - pos.y) / c.y))
	if x >= 0 and x < UhrRasterTower.WIDTH and y >= 0 and y < int(tower.rows):
		accept_event()
		cell_tapped.emit(x, y)


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		queue_redraw()


func _draw() -> void:
	var font := get_theme_default_font()
	var c := cell_size()
	var rows := int(tower.rows)
	# Cells: open rows with the spark's direction, locked rows dimmed.
	for y in MAX_ROWS:
		for x in UhrRasterTower.WIDTH:
			var r := cell_rect(x, y).grow(-GAP)
			if y < rows:
				draw_rect(r, UhrStyle.PANEL.darkened(0.25))
				var arrow := "›" if y % 2 == 0 else "‹"
				draw_string(font, r.position + Vector2(0, r.size.y * 0.5 + 6), arrow, HORIZONTAL_ALIGNMENT_CENTER, r.size.x, 18, UhrStyle.LINE.lightened(0.15))
			else:
				draw_rect(r, UhrStyle.NIGHT.lightened(0.03))
	if rows < MAX_ROWS and locked_text != "":
		var lr := cell_rect(0, rows)
		draw_string(font, lr.position + Vector2(0, lr.size.y * 0.5 + 5), locked_text, HORIZONTAL_ALIGNMENT_CENTER, c.x * UhrRasterTower.WIDTH, 13, UhrStyle.MUTED)
	# Rooms.
	for i in tower.rooms.size():
		var room: Dictionary = tower.rooms[i]
		var def := UhrContent.raster_room(room.id)
		var col := UhrStyle.guild_color(def.guild)
		_draw_cells(_abs_cells(room), UhrStyle.PANEL.lerp(col, 0.28), UhrStyle.BRASS if i == selected else col, 3.0 if i == selected else 1.5)
		var first: Array = _abs_cells(room)[0]
		var fr := cell_rect(first[0], first[1]).grow(-GAP - 4)
		var tier := int(room.tier) if room.get("tier") != null else 0
		var name: String = def.name
		# Long names (Quecksilberhemmung) get a smaller font instead of being cut off.
		var fs := 13
		while fs > 9 and font.get_string_size(name, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x > fr.size.x:
			fs -= 1
		draw_string(font, fr.position + Vector2(0, 16), name, HORIZONTAL_ALIGNMENT_LEFT, fr.size.x, fs, UhrStyle.TEXT)
		var sub: String = ["I", "II", "III", "IV"][tier]
		if room.get("alloy") != null and room.get("alloy") != "":
			sub += " · " + str(UhrContent.alloy(room.alloy).name)
		draw_string(font, fr.position + Vector2(0, 32), sub, HORIZONTAL_ALIGNMENT_LEFT, fr.size.x, 11, UhrStyle.TIER_COLORS[tier])
	# Ghost.
	if not ghost.is_empty():
		var cells: Array = []
		for cc in UhrContent.cells_of(UhrContent.raster_room(ghost.id), int(ghost.rot)):
			cells.append([int(ghost.x) + cc[0], int(ghost.y) + cc[1]])
		var tint := UhrStyle.MINE if ghost.ok else UhrStyle.FOE
		# Opaque fill: semi-transparent cells would darken where they join.
		_draw_cells(cells, UhrStyle.PANEL.darkened(0.25).lerp(tint, 0.3), tint, 2.5)


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
