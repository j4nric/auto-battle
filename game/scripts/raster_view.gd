extends Control
## The run on the 3-wide grid (ADR 0008): workshop, omens, alloys, run end. Tap an offer, tap a
## cell to see where it would go (green fits, red does not), rotate, then tap again or
## "Einbauen". Tap a placed room to sell, rotate or move it. Fights play in the combat view.

const MAIN_SCENE := "res://scenes/main.tscn"

var run: UhrRasterRun
var grid: GridView
var title_label: Label
var stats_label: Label
var hint_label: Label
var cells_label: Label
var bottom: VBoxContainer
var toast: Label
var sheet: Control

var selected_offer := -1
var selected_room := -1
var moving := false
## Placement preview: { id, x, y, rot, ok, ax, ay } (ax, ay: the tapped cell).
var ghost: Dictionary = {}


func _ready() -> void:
	UhrSound.warm()
	run = UhrRasterSession.run
	if run == null:
		run = UhrRasterSession.load_saved()
	if run == null:
		run = UhrRasterSession.new_run(int(Time.get_unix_time_from_system()) % 1000000)
	_build_ui()
	_refresh()


func _build_ui() -> void:
	var bg := ColorRect.new()
	bg.color = UhrStyle.NIGHT
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right"]:
		margin.add_theme_constant_override("margin_" + side, 16)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_bottom", 14)
	add_child(margin)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	margin.add_child(col)

	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 8)
	var back := UhrStyle.button("Menü")
	back.pressed.connect(func() -> void: get_tree().change_scene_to_file(MAIN_SCENE))
	head.add_child(back)
	var titles := VBoxContainer.new()
	titles.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	titles.add_theme_constant_override("separation", 0)
	title_label = UhrStyle.label("", 18, UhrStyle.BRASS, false)
	stats_label = UhrStyle.label("", 13, UhrStyle.MUTED, false)
	titles.add_child(title_label)
	titles.add_child(stats_label)
	head.add_child(titles)
	var report := UhrStyle.button("Melden")
	report.add_theme_font_size_override("font_size", 14)
	report.pressed.connect(_show_report)
	head.add_child(report)
	col.add_child(head)

	hint_label = UhrStyle.label("", 14, UhrStyle.TEXT)
	hint_label.custom_minimum_size.y = 50
	col.add_child(hint_label)

	grid = GridView.new()
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.cell_tapped.connect(_on_cell_tapped)
	grid.set_drag_forwarding(_grid_drag, _grid_can_drop, _grid_drop)
	col.add_child(grid)

	cells_label = UhrStyle.label("", 12, UhrStyle.MUTED, false)
	col.add_child(cells_label)

	bottom = VBoxContainer.new()
	bottom.add_theme_constant_override("separation", 8)
	col.add_child(bottom)

	toast = UhrStyle.label("", 16, UhrStyle.NIGHT, false)
	toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var tb := UhrStyle.box(UhrStyle.BRASS, 10)
	tb.set_content_margin_all(10)
	toast.add_theme_stylebox_override("normal", tb)
	toast.set_anchors_preset(Control.PRESET_CENTER_TOP)
	toast.position.y = 70
	toast.modulate.a = 0.0
	toast.z_index = 10
	toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(toast)


# ------------------------------------------------------------------ rendering
func _refresh() -> void:
	title_label.text = "Stunde %d von %d" % [run.hour, UhrRun.HOURS]
	stats_label.text = "%d Gold · Leben %d von %d · %d Siege" % [run.gold, run.lives, UhrRun.LIVES, run.wins]
	var rows := int(run.tower.rows)
	grid.locked_text = "ab Stunde %d: eine Reihe mehr" % _next_growth_hour() if rows < GridView.MAX_ROWS else ""
	grid.setup(run.tower)
	grid.set_selected(selected_room)
	grid.set_ghost(ghost)
	cells_label.text = "%d von %d Feldern belegt · der Funke läuft Reihe für Reihe nach oben" % [UhrRasterTower.used_cells(run.tower), UhrRasterTower.WIDTH * rows]
	for c in bottom.get_children():
		c.queue_free()
	match run.phase:
		"shop":
			_render_shop()
		"omen":
			_render_omens()
		"alloy":
			_render_alloy()
		"over":
			_render_over()
	_update_preview()


func _next_growth_hour() -> int:
	for h in range(run.hour + 1, UhrRun.HOURS + 1):
		if UhrRasterTower.rows_for(h) > int(run.tower.rows):
			return h
	return UhrRun.HOURS


func _render_shop() -> void:
	if selected_offer >= run.offers.size():
		selected_offer = -1
	if selected_room >= run.tower.rooms.size():
		selected_room = -1
	if selected_room >= 0:
		_render_room_actions()
		return
	if selected_offer >= 0:
		var o: Dictionary = run.offers[selected_offer]
		var def := UhrContent.raster_room(o.id)
		if ghost.is_empty():
			hint_label.text = "%s: %s. Tippe auf ein Feld im Turm." % [def.name, str(def.text).trim_suffix(".")]
		elif ghost.ok:
			hint_label.text = "Passt. Nochmal tippen oder „Einbauen“. Mit „Drehen“ änderst du die Lage."
		else:
			hint_label.text = "Passt dort nicht. Tippe auf ein anderes Feld oder drehe den Raum."
	else:
		var last := _last_fight_text()
		hint_label.text = (last + " " if last != "" else "") + "Ziehe ein Angebot in den Turm oder tippe es an. Räume im Turm kannst du ziehen oder antippen."

	var cards := VBoxContainer.new()
	cards.add_theme_constant_override("separation", 5)
	for i in run.offers.size():
		cards.add_child(_offer_card(i))
	bottom.add_child(cards)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	if selected_offer >= 0:
		var rot := UhrStyle.button("Drehen")
		rot.disabled = UhrRasterTower.rotations(run.offers[selected_offer].id).size() < 2
		rot.pressed.connect(_rotate_ghost)
		row.add_child(rot)
		if _duplicate_index(run.offers[selected_offer].id) >= 0:
			var up := UhrStyle.button("Aufwerten")
			up.disabled = run.preview_buy(selected_offer, true) == null
			up.pressed.connect(_upgrade)
			row.add_child(up)
		var place := UhrStyle.button("Einbauen", true)
		place.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		place.disabled = ghost.is_empty() or not ghost.ok
		place.pressed.connect(_confirm_place)
		row.add_child(place)
	else:
		var reroll := UhrStyle.button("Neu würfeln (%d)" % run.reroll_cost)
		reroll.disabled = run.gold < run.reroll_cost
		reroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		reroll.pressed.connect(func() -> void: _act({ "t": "reroll" }))
		row.add_child(reroll)
		var next := UhrStyle.button("Weiter", true)
		next.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		next.pressed.connect(func() -> void: _act({ "t": "endShop" }))
		row.add_child(next)
	bottom.add_child(row)


## One offer as a full-width row: name, tier, size and price on top, the effect below. Tap to
## select it, or drag it straight into the tower.
func _offer_card(i: int) -> Control:
	var o: Dictionary = run.offers[i]
	var def := UhrContent.raster_room(o.id)
	var row := PanelContainer.new()
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.mouse_filter = Control.MOUSE_FILTER_STOP
	var affordable := int(o.price) <= run.gold
	var dup := _duplicate_index(o.id) >= 0
	var n := UhrRasterTower.area(o.id)
	var sb := UhrStyle.box(UhrStyle.PANEL_LIT if i == selected_offer else UhrStyle.PANEL, 8, 5, UhrStyle.guild_color(def.guild))
	sb.content_margin_left = 12
	sb.content_margin_right = 10
	sb.content_margin_top = 6
	sb.content_margin_bottom = 6
	if i == selected_offer:
		sb.border_width_top = 2
		sb.border_width_right = 2
		sb.border_width_bottom = 2
		sb.border_color = UhrStyle.BRASS
	row.add_theme_stylebox_override("panel", sb)
	var fg := UhrStyle.TEXT if affordable else UhrStyle.MUTED
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 1)
	var top := HBoxContainer.new()
	var name_l := UhrStyle.label("%s %s" % [def.name, ["I", "II", "III", "IV"][int(o.tier)]], 15, fg, false)
	name_l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_l.clip_text = true
	top.add_child(name_l)
	top.add_child(UhrStyle.label("%d %s · %d Gold%s" % [n, "Feld" if n == 1 else "Felder", int(o.price), " · im Turm" if dup else ""], 13, UhrStyle.BRASS if affordable else UhrStyle.MUTED, false))
	v.add_child(top)
	var text_l := UhrStyle.label(str(def.text), 12, UhrStyle.MUTED)
	text_l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	v.add_child(text_l)
	row.add_child(v)
	for c in [v, top, name_l, text_l] + top.get_children():
		c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Tap = press and release without a drag in between.
	row.gui_input.connect(func(ev: InputEvent) -> void:
		if ev is InputEventMouseButton and ev.button_index == MOUSE_BUTTON_LEFT and not ev.pressed:
			if not get_viewport().gui_is_dragging() and Rect2(Vector2.ZERO, row.size).has_point(ev.position):
				_on_offer_tapped(i))
	row.set_drag_forwarding(func(_at: Vector2) -> Variant: return _offer_drag(i), Callable(), Callable())
	return row


func _render_room_actions() -> void:
	var r: Dictionary = run.tower.rooms[selected_room]
	var def := UhrContent.raster_room(r.id)
	if moving:
		hint_label.text = "Tippe auf das Feld, wo %s hin soll, und dann nochmal zum Bestätigen." % def.name if ghost.is_empty() else ("Passt. Nochmal tippen oder „Hier hin“." if ghost.ok else "Passt dort nicht.")
	else:
		hint_label.text = "%s: %s" % [def.name, def.text]
	var tier := int(r.tier) if r.get("tier") != null else 0
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	if moving:
		var rot := UhrStyle.button("Drehen")
		rot.disabled = UhrRasterTower.rotations(r.id).size() < 2
		rot.pressed.connect(_rotate_ghost)
		var here := UhrStyle.button("Hier hin", true)
		here.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		here.disabled = ghost.is_empty() or not ghost.ok
		here.pressed.connect(_confirm_move)
		var cancel := UhrStyle.button("Abbrechen")
		cancel.pressed.connect(_clear_selection)
		for b in [rot, here, cancel]:
			row.add_child(b)
	else:
		var sell := UhrStyle.button("Verkaufen +%d" % UhrRasterRun.sell_price(r.id, tier))
		sell.add_theme_font_size_override("font_size", 15)
		sell.pressed.connect(func() -> void:
			var idx := selected_room
			_clear_selection(false)
			_act({ "t": "sell", "idx": idx }))
		var rot := UhrStyle.button("Drehen")
		rot.disabled = UhrRasterTower.rotations(r.id).size() < 2
		rot.pressed.connect(_rotate_in_place)
		var mv := UhrStyle.button("Verschieben")
		mv.pressed.connect(func() -> void:
			moving = true
			ghost = {}
			_refresh())
		var done := UhrStyle.button("Fertig", true)
		done.pressed.connect(_clear_selection)
		# Two rows of two: four buttons side by side do not fit a phone's width.
		var row2 := HBoxContainer.new()
		row2.add_theme_constant_override("separation", 6)
		for b in [sell, rot]:
			b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(b)
		for b in [mv, done]:
			b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row2.add_child(b)
		bottom.add_child(row)
		bottom.add_child(row2)
		return
	bottom.add_child(row)


func _render_omens() -> void:
	hint_label.text = "Wer fordert dich heraus? Wähle ein Vorzeichen."
	for o in run.omens:
		var b := Button.new()
		b.custom_minimum_size = Vector2(0, 64)
		b.text = "%s\n%s" % [o.name, o.text]
		b.add_theme_font_size_override("font_size", 14)
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		var sb := UhrStyle.box(UhrStyle.PANEL, 10, 4, UhrStyle.BRASS if o.get("alloy", false) else UhrStyle.LINE)
		sb.set_content_margin_all(10)
		for st in ["normal", "hover", "pressed", "focus"]:
			b.add_theme_stylebox_override(st, sb)
		for st in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
			b.add_theme_color_override(st, UhrStyle.TEXT)
		b.pressed.connect(_choose_omen.bind(o.id))
		bottom.add_child(b)


func _render_alloy() -> void:
	var al := UhrContent.alloy(run.pending_alloy)
	hint_label.text = "Belohnung: Legierung %s. %s Tippe auf den Raum, der sie bekommt." % [al.name, al.text]
	bottom.add_child(UhrStyle.label("Eine Legierung pro Raum. Eine vorhandene wird ersetzt.", 12, UhrStyle.MUTED))


func _render_over() -> void:
	var text := "Mitternacht! Dein Turm schlägt." if run.midnight else "Dein Turm ist eingestürzt."
	hint_label.text = "%s %d Siege in %d Stunden." % [text, run.wins, run.hour]
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var report := UhrStyle.button("Run melden")
	report.pressed.connect(_show_report)
	var again := UhrStyle.button("Neuer Run", true)
	again.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	again.pressed.connect(func() -> void:
		UhrRasterSession.new_run(int(Time.get_unix_time_from_system()) % 1000000)
		get_tree().reload_current_scene())
	row.add_child(report)
	row.add_child(again)
	bottom.add_child(row)


func _last_fight_text() -> String:
	for i in range(run.fights.size() - 1, -1, -1):
		var f: Dictionary = run.fights[i]
		if f.get("skipped", false):
			return ""
		return "%s gegen %s nach %d Takten." % ["Sieg" if f.won else "Niederlage", f.opponent, int(f.ticks)]
	return ""


## Resolves the omen with a recorded fight and shows it in the combat view (grid mode).
func _choose_omen(id: String) -> void:
	_clear_selection(false)
	if not UhrRasterSession.act({ "t": "omen", "id": id }, true):
		_toast("Das geht gerade nicht.")
		return
	var f: Dictionary = run.fights[run.fights.size() - 1]
	if f.get("skipped", false):
		_toast("Der Händler zieht weiter. Die nächste Werkstatt ist größer.")
		_refresh()
		return
	CombatView.pending = {
		"mode": "run", "return_scene": "res://scenes/raster.tscn",
		"title": UhrRun._omen(f.omen).get("name", ""), "hour": int(f.hour), "seed": run.seed,
		"mine": f.tower, "foe": f.oppTower, "hp_mine": int(f.hp), "hp_foe": int(f.oppHp),
		"foe_name": f.opponent, "result": f,
	}
	get_tree().change_scene_to_file("res://scenes/combat.tscn")


# ------------------------------------------------------------------ input
func _act(a: Dictionary) -> bool:
	var fused_before := run.fusions_found.size()
	var rows_before := int(run.tower.rows)
	# The placed room's id, read before the action (a bought offer leaves the shop).
	var placed_id := ""
	if a.t == "buy" and a.has("x"):
		placed_id = run.offers[int(a.offer)].id
	elif a.t == "move":
		placed_id = run.tower.rooms[int(a.idx)].id
	var ok := UhrRasterSession.act(a)
	if not ok:
		_toast("Das geht gerade nicht.")
		UhrSound.play("pick", -6.0)
	elif run.fusions_found.size() > fused_before:
		_toast("Verschmelzung: %s!" % UhrContent.raster_room(run.fusions_found[-1]).name)
	_refresh()
	if ok:
		_feedback(a, placed_id, run.fusions_found.size() > fused_before, int(run.tower.rows) > rows_before)
	return ok


## Sound, vibration and a little motion for an action that went through.
func _feedback(a: Dictionary, placed_id: String, fused: bool, grew: bool) -> void:
	if fused:
		var id: String = run.fusions_found[-1]
		for i in run.tower.rooms.size():
			if run.tower.rooms[i].id == id:
				grid.land(i)
				grid.burst(i, 30, UhrStyle.BRASS)
		UhrSound.play("fusion")
		UhrHaptics.buzz(40)
		return
	if grew:
		UhrSound.play("row")
	match a.t:
		"buy", "move":
			var i := -1
			if placed_id != "":
				var first: Array = UhrContent.cells_of(UhrContent.raster_room(placed_id), int(a.rot))[0]
				i = _room_at(int(a.x) + first[0], int(a.y) + first[1])
			if i >= 0:
				grid.land(i)
				grid.burst(i, 10)
			UhrSound.play("place")
			if a.t == "buy":
				UhrSound.play("coin", -6.0)
			UhrHaptics.buzz(12)
		"sell":
			UhrSound.play("coin", -4.0)
			UhrHaptics.buzz(12)
		"reroll":
			UhrSound.play("tick")
		"alloy":
			var i := int(a.idx)
			if i >= 0 and i < run.tower.rooms.size():
				grid.land(i)
				grid.burst(i, 16, UhrStyle.BRASS)
			UhrSound.play("bell", -4.0)
			UhrHaptics.buzz(25)
		"endShop":
			UhrSound.play("pick")


# ------------------------------------------------------------------ drag and drop
## Drag data: { kind: "offer" | "room", id, rot, dx, dy, i | idx }. dx/dy: the dragged cell
## relative to the shape's first cell, so the shape stays under the finger.
func _offer_drag(i: int) -> Variant:
	if run.phase != "shop" or i >= run.offers.size() or int(run.offers[i].price) > run.gold:
		return null
	selected_offer = i
	selected_room = -1
	moving = false
	ghost = {}
	var rot := 0
	_drag_preview(run.offers[i].id)
	return { "kind": "offer", "i": i, "id": run.offers[i].id, "rot": rot, "dx": 0, "dy": 0 }


func _grid_drag(at: Vector2) -> Variant:
	if run.phase != "shop":
		return null
	var cell := grid.cell_at(at)
	if cell.is_empty():
		return null
	var idx := grid.room_at(cell[0], cell[1])
	if idx < 0:
		return null
	var r: Dictionary = run.tower.rooms[idx]
	var first: Array = grid._abs_cells(r)[0]
	selected_offer = -1
	selected_room = idx
	moving = true
	ghost = {}
	_drag_preview(r.id)
	return { "kind": "room", "idx": idx, "id": r.id, "rot": int(r.get("rot", 0)), "dx": cell[0] - first[0], "dy": cell[1] - first[1] }


func _drag_preview(id: String) -> void:
	var def := UhrContent.raster_room(id)
	var l := UhrStyle.label(def.name, 14, UhrStyle.TEXT, false)
	var sb := UhrStyle.box(UhrStyle.PANEL_LIT, 6, 4, UhrStyle.guild_color(def.guild))
	sb.set_content_margin_all(6)
	l.add_theme_stylebox_override("normal", sb)
	l.modulate.a = 0.85
	var holder := Control.new()
	holder.add_child(l)
	# Above the finger, so the cell under it stays visible.
	l.position = Vector2(-40, -70)
	set_drag_preview(holder)


func _grid_can_drop(at: Vector2, data: Variant) -> bool:
	if typeof(data) != TYPE_DICTIONARY or not data.has("kind"):
		return false
	var cell := grid.cell_at(at)
	if cell.is_empty():
		ghost = {}
	else:
		_set_ghost(data.id, cell[0] - int(data.dx), cell[1] - int(data.dy), int(data.rot))
	grid.set_ghost(ghost)
	_update_preview()
	return true


func _grid_drop(_at: Vector2, data: Variant) -> void:
	if ghost.is_empty() or not ghost.ok:
		_toast("Passt dort nicht.")
		_clear_selection()
		return
	if data.kind == "room":
		_confirm_move()
	else:
		_confirm_place()


func _notification(what: int) -> void:
	# A drag that ended outside the tower leaves nothing half-done.
	if what == NOTIFICATION_DRAG_END and run != null and not get_viewport().gui_is_drag_successful():
		ghost = {}
		moving = false
		_refresh()


## Outlines the neighbours of the preview (or of the selected room) and tells whether the
## preview completes a recipe. Reads the tower only; the rules stay in game/core.
func _update_preview() -> void:
	var cells: Array = []
	var skip := -1
	if not ghost.is_empty():
		for cc in UhrContent.cells_of(UhrContent.raster_room(ghost.id), int(ghost.rot)):
			cells.append([int(ghost.x) + cc[0], int(ghost.y) + cc[1]])
		if moving:
			skip = selected_room
	elif selected_room >= 0 and selected_room < run.tower.rooms.size():
		cells = grid._abs_cells(run.tower.rooms[selected_room])
		skip = selected_room
	var near: Array = []
	for i in run.tower.rooms.size():
		if i == skip:
			continue
		for cc in grid._abs_cells(run.tower.rooms[i]):
			if near.has(i):
				break
			for g in cells:
				if absi(int(cc[0]) - int(g[0])) + absi(int(cc[1]) - int(g[1])) == 1:
					near.append(i)
					break
	grid.highlight = near
	var fuses := ""
	if not ghost.is_empty() and ghost.ok:
		var t: Variant = null
		if moving:
			var rooms: Array = run.tower.rooms.duplicate(true)
			rooms[selected_room].x = int(ghost.x)
			rooms[selected_room].y = int(ghost.y)
			rooms[selected_room].rot = int(ghost.rot)
			t = UhrRasterTower.with_rooms(run.tower, rooms)
		elif selected_offer >= 0:
			t = run.preview_buy(selected_offer, false, int(ghost.x), int(ghost.y), int(ghost.rot))
		if t != null:
			var fused: Array = UhrRasterTower.apply_fusions(t).fused
			if not fused.is_empty():
				fuses = UhrContent.raster_room(fused[0]).name
	grid.ghost_fuses = fuses != ""
	grid.queue_redraw()
	if not ghost.is_empty():
		var parts: Array[String] = []
		if fuses != "":
			parts.append("Rezept: %s entsteht!" % fuses)
		elif not ghost.ok:
			parts.append("Passt dort nicht.")
		if not near.is_empty():
			parts.append("Nachbarn: " + ", ".join(near.map(func(i: int) -> String: return UhrContent.raster_room(run.tower.rooms[i].id).name)))
		if ghost.ok and fuses == "":
			parts.append("Zum Einbauen nochmal tippen oder loslassen.")
		hint_label.text = " ".join(parts)


func _clear_selection(refresh := true) -> void:
	selected_offer = -1
	selected_room = -1
	moving = false
	ghost = {}
	if refresh:
		_refresh()


func _on_offer_tapped(i: int) -> void:
	if int(run.offers[i].price) > run.gold:
		_toast("Zu teuer.")
		return
	UhrSound.play("pick")
	var same := i == selected_offer
	_clear_selection(false)
	if not same:
		selected_offer = i
	_refresh()


func _room_at(x: int, y: int) -> int:
	for i in run.tower.rooms.size():
		for cc in grid._abs_cells(run.tower.rooms[i]):
			if cc[0] == x and cc[1] == y:
				return i
	return -1


func _on_cell_tapped(x: int, y: int) -> void:
	match run.phase:
		"alloy":
			var i := _room_at(x, y)
			if i >= 0:
				_act({ "t": "alloy", "idx": i })
			return
		"shop":
			pass
		_:
			return
	var placing := selected_offer >= 0 or moving
	if placing:
		# A second tap inside a fitting preview confirms it.
		if not ghost.is_empty() and ghost.ok and _ghost_covers(x, y):
			if moving:
				_confirm_move()
			else:
				_confirm_place()
			return
		var id: String = run.tower.rooms[selected_room].id if moving else run.offers[selected_offer].id
		var rot := int(ghost.get("rot", 0)) if not ghost.is_empty() else (int(run.tower.rooms[selected_room].get("rot", 0)) if moving else 0)
		_set_ghost(id, x, y, rot)
		_refresh()
		return
	var hit := _room_at(x, y)
	_clear_selection(false)
	selected_room = hit
	_refresh()


func _ghost_covers(x: int, y: int) -> bool:
	for cc in UhrContent.cells_of(UhrContent.raster_room(ghost.id), int(ghost.rot)):
		if int(ghost.x) + cc[0] == x and int(ghost.y) + cc[1] == y:
			return true
	return false


## Places the shape so that its lowest-left cell sits on the tapped cell.
func _set_ghost(id: String, ax: int, ay: int, rot: int) -> void:
	var first: Array = UhrContent.cells_of(UhrContent.raster_room(id), rot)[0]
	var x: int = ax - first[0]
	var y: int = ay - first[1]
	var skip := selected_room if moving else -1
	ghost = { "id": id, "x": x, "y": y, "rot": rot, "ax": ax, "ay": ay, "ok": UhrRasterTower.can_place(run.tower, id, x, y, rot, skip) }


func _rotate_ghost() -> void:
	var id: String = run.tower.rooms[selected_room].id if moving else run.offers[selected_offer].id
	var rots := UhrRasterTower.rotations(id)
	if ghost.is_empty():
		_toast("Tippe zuerst auf ein Feld.")
		return
	var k := rots.find(int(ghost.rot))
	_set_ghost(id, int(ghost.ax), int(ghost.ay), rots[(k + 1) % rots.size()])
	_refresh()


func _rotate_in_place() -> void:
	var r: Dictionary = run.tower.rooms[selected_room]
	var rots := UhrRasterTower.rotations(r.id)
	var cur := int(r.rot) if r.get("rot") != null else 0
	var k := rots.find(cur)
	for step in range(1, rots.size()):
		var rot: int = rots[(k + step) % rots.size()]
		if UhrRasterTower.can_place(run.tower, r.id, int(r.x), int(r.y), rot, selected_room):
			_act({ "t": "move", "idx": selected_room, "x": int(r.x), "y": int(r.y), "rot": rot })
			return
	_toast("Zum Drehen ist hier kein Platz. Verschiebe den Raum.")


func _confirm_place() -> void:
	if ghost.is_empty() or not ghost.ok:
		return
	var a := { "t": "buy", "offer": selected_offer, "upgrade": false, "x": int(ghost.x), "y": int(ghost.y), "rot": int(ghost.rot) }
	_clear_selection(false)
	_act(a)


func _confirm_move() -> void:
	if ghost.is_empty() or not ghost.ok:
		return
	var a := { "t": "move", "idx": selected_room, "x": int(ghost.x), "y": int(ghost.y), "rot": int(ghost.rot) }
	_clear_selection(false)
	_act(a)


func _upgrade() -> void:
	var i := selected_offer
	_clear_selection(false)
	var id: String = run.offers[i].id
	if _act({ "t": "buy", "offer": i, "upgrade": true }):
		_toast("Aufgewertet.")
		var k := _duplicate_index(id)
		if k >= 0:
			grid.land(k)
			grid.burst(k, 14, UhrStyle.BRASS)


func _duplicate_index(id: String) -> int:
	for i in run.tower.rooms.size():
		if run.tower.rooms[i].id == id:
			return i
	return -1


func _toast(text: String) -> void:
	toast.text = text
	toast.reset_size()
	toast.position.x = (size.x - toast.size.x) * 0.5
	var tw := create_tween()
	tw.tween_property(toast, "modulate:a", 1.0, 0.15)
	tw.tween_interval(1.6)
	tw.tween_property(toast, "modulate:a", 0.0, 0.3)


func _show_report() -> void:
	if sheet:
		sheet.queue_free()
	var code := UhrRasterSession.report_code()
	var panel := PanelContainer.new()
	var sb := UhrStyle.box(Color(0.19, 0.17, 0.25), 14)
	sb.set_content_margin_all(16)
	panel.add_theme_stylebox_override("panel", sb)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 8)
	col.add_child(UhrStyle.label("Fehler melden", 20, UhrStyle.BRASS))
	col.add_child(UhrStyle.label("Der Code enthält Seed und alle deine Züge. Damit spielt Claude deinen Run exakt nach. Kopiere ihn in den Chat oder in eine Spieltest-Notiz im Cockpit.", 14, UhrStyle.TEXT))
	var field := TextEdit.new()
	field.text = code
	field.editable = false
	field.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	field.custom_minimum_size.y = 110
	col.add_child(field)
	var status := UhrStyle.label("", 13, UhrStyle.MUTED)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var close := UhrStyle.button("Schließen")
	close.pressed.connect(func() -> void:
		sheet.queue_free()
		sheet = null)
	var copy := UhrStyle.button("Kopieren", true)
	copy.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	copy.pressed.connect(func() -> void:
		DisplayServer.clipboard_set(code)
		field.select_all()
		status.text = "Kopiert. Falls nicht, den Code markieren und kopieren.")
	row.add_child(close)
	row.add_child(copy)
	col.add_child(row)
	col.add_child(status)
	panel.add_child(col)
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_top = -340
	sheet = panel
	add_child(panel)
