class_name RunView
extends Control
## The run screen: workshop (offers, building, selling, moving), omen choice, alloy reward and
## the end of the run. Every tap becomes an action on UhrSession (saved right away); fights are
## replayed on the combat screen and come back here.

const COMBAT_SCENE := "res://scenes/combat.tscn"
const MAIN_SCENE := "res://scenes/main.tscn"

var run: UhrRun
var tower_view: TowerView
var title_label: Label
var stats_label: Label
var hint_label: Label
var floors_label: Label
var bottom: VBoxContainer
var toast: Label
var sheet: Control
var selected_offer := -1
var selected_room := -1
## Set right before switching to the combat screen, so the result is announced on return only.
static var returning_from_fight := false


func _ready() -> void:
	run = UhrSession.run
	if run == null:
		run = UhrSession.load_saved()
	if run == null:
		run = UhrSession.new_run(int(Time.get_unix_time_from_system()) % 1000000)
	_build_ui()
	_refresh()
	# Coming back from a fight: say how it went.
	if returning_from_fight and not run.fights.is_empty():
		returning_from_fight = false
		var f: Dictionary = run.fights[run.fights.size() - 1]
		_toast(("Sieg gegen %s" if f.get("won", false) else "Niederlage gegen %s") % f.get("opponent", "?"))


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
	hint_label.custom_minimum_size.y = 40
	col.add_child(hint_label)

	tower_view = TowerView.new()
	tower_view.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tower_view.room_tapped.connect(_on_room_tapped)
	tower_view.slot_tapped.connect(_on_slot_tapped)
	var tower_box := MarginContainer.new()
	tower_box.size_flags_vertical = Control.SIZE_EXPAND_FILL
	tower_box.add_theme_constant_override("margin_left", 14)
	tower_box.add_theme_constant_override("margin_right", 70)
	tower_box.add_child(tower_view)
	col.add_child(tower_box)

	floors_label = UhrStyle.label("", 12, UhrStyle.MUTED, false)
	col.add_child(floors_label)

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
	tower_view.setup({ "rooms": run.tower })
	await get_tree().process_frame
	tower_view.show_static()
	tower_view.select_room(selected_room)
	floors_label.text = "%d von %d Etagen belegt" % [UhrTower.floors_used(run.tower), UhrTower.BASE_FLOORS]
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


func _render_shop() -> void:
	var offer_ok := selected_offer >= 0 and selected_offer < run.offers.size()
	if not offer_ok:
		selected_offer = -1
	tower_view.show_slots(offer_ok and run.preview_buy(selected_offer, 0, false) != null)
	if offer_ok:
		var o: Dictionary = run.offers[selected_offer]
		var def := UhrContent.room(o.id)
		var where := "Tippe auf „hier einbauen“." if run.preview_buy(selected_offer, 0, false) != null else "Kein Platz: erst einen Raum verkaufen."
		hint_label.text = "%s: %s. %s" % [def.name, str(def.text).trim_suffix("."), where]
	elif selected_room >= 0:
		hint_label.text = UhrContent.room(run.tower[selected_room].id).text
	else:
		hint_label.text = "Kaufe Räume für deinen Turm. Tippe auf ein Angebot, dann auf die Stelle im Turm."

	if selected_room >= 0 and selected_room < run.tower.size():
		_render_room_actions()
		return

	var grid := GridContainer.new()
	grid.columns = mini(3, maxi(1, run.offers.size()))
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	for i in run.offers.size():
		grid.add_child(_offer_card(i))
	bottom.add_child(grid)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	if offer_ok and _duplicate_index(run.offers[selected_offer].id) >= 0:
		var up := UhrStyle.button("Aufwerten")
		up.disabled = run.preview_buy(selected_offer, 0, true) == null
		up.pressed.connect(_upgrade)
		row.add_child(up)
	var reroll := UhrStyle.button("Neu würfeln (%d)" % run.reroll_cost)
	reroll.disabled = run.gold < run.reroll_cost
	reroll.pressed.connect(func() -> void: _act({ "t": "reroll" }))
	reroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(reroll)
	var next := UhrStyle.button("Weiter", true)
	next.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	next.pressed.connect(func() -> void:
		selected_offer = -1
		_act({ "t": "endShop" }))
	row.add_child(next)
	bottom.add_child(row)


func _offer_card(i: int) -> Button:
	var o: Dictionary = run.offers[i]
	var def := UhrContent.room(o.id)
	var b := Button.new()
	b.custom_minimum_size = Vector2(0, 74)
	b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	b.clip_text = true
	var affordable := int(o.price) <= run.gold
	var dup := _duplicate_index(o.id) >= 0
	b.text = "%s\n%s · %d Et.\n%d Gold%s" % [def.name, ["I", "II", "III", "IV"][int(o.tier)], int(def.height), int(o.price), " · im Turm" if dup else ""]
	b.add_theme_font_size_override("font_size", 13)
	var sb := UhrStyle.box(UhrStyle.PANEL_LIT if i == selected_offer else UhrStyle.PANEL, 8, 4, UhrStyle.guild_color(def.guild))
	if i == selected_offer:
		sb.border_width_top = 2
		sb.border_width_right = 2
		sb.border_width_bottom = 2
		sb.border_color = UhrStyle.BRASS
	for st in ["normal", "hover", "pressed", "focus"]:
		b.add_theme_stylebox_override(st, sb)
	var fg := UhrStyle.TEXT if affordable else UhrStyle.MUTED
	for st in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(st, fg)
	b.pressed.connect(_on_offer_tapped.bind(i))
	return b


func _render_room_actions() -> void:
	var r: Dictionary = run.tower[selected_room]
	var tier := int(r.get("tier", 0)) if r.get("tier") != null else 0
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)
	var sell := UhrStyle.button("Verkaufen +%d" % UhrRun.sell_price(r.id, tier))
	sell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sell.pressed.connect(func() -> void:
		var idx := selected_room
		selected_room = -1
		_act({ "t": "sell", "idx": idx }))
	var up := UhrStyle.button("Hoch")
	up.disabled = selected_room >= run.tower.size() - 1
	up.pressed.connect(_move.bind(1))
	var down := UhrStyle.button("Runter")
	down.disabled = selected_room <= 0
	down.pressed.connect(_move.bind(-1))
	var done := UhrStyle.button("Fertig", true)
	done.pressed.connect(func() -> void:
		selected_room = -1
		_refresh())
	for b in [sell, up, down, done]:
		row.add_child(b)
	bottom.add_child(row)


func _render_omens() -> void:
	tower_view.show_slots(false)
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
	tower_view.show_slots(false)
	var al := UhrContent.alloy(run.pending_alloy)
	hint_label.text = "Belohnung: Legierung %s. %s Tippe auf den Raum, der sie bekommt." % [al.name, al.text]
	bottom.add_child(UhrStyle.label("Eine Legierung pro Raum. Eine vorhandene wird ersetzt.", 12, UhrStyle.MUTED))


func _render_over() -> void:
	tower_view.show_slots(false)
	var text := "Mitternacht! Dein Turm schlägt." if run.midnight else "Dein Turm ist eingestürzt."
	hint_label.text = "%s %d Siege in %d Stunden." % [text, run.wins, run.hour]
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	var report := UhrStyle.button("Run melden")
	report.pressed.connect(_show_report)
	var again := UhrStyle.button("Neuer Run", true)
	again.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	again.pressed.connect(func() -> void:
		UhrSession.new_run(int(Time.get_unix_time_from_system()) % 1000000)
		get_tree().reload_current_scene())
	row.add_child(report)
	row.add_child(again)
	bottom.add_child(row)


# ------------------------------------------------------------------ input


func _act(a: Dictionary, record := false) -> bool:
	var fused_before := run.fusions_found.size()
	var ok := UhrSession.act(a, record)
	if not ok:
		_toast("Das geht gerade nicht.")
	elif run.fusions_found.size() > fused_before:
		var id: String = run.fusions_found[run.fusions_found.size() - 1]
		_toast("Verschmelzung: %s!" % UhrContent.room(id).name)
	_refresh()
	return ok


func _on_offer_tapped(i: int) -> void:
	selected_room = -1
	if int(run.offers[i].price) > run.gold:
		selected_offer = -1
		_toast("Zu teuer.")
	else:
		selected_offer = -1 if selected_offer == i else i
	_refresh()


func _on_slot_tapped(pos: int) -> void:
	if selected_offer < 0:
		return
	var i := selected_offer
	selected_offer = -1
	_act({ "t": "buy", "offer": i, "pos": pos, "upgrade": false })


func _upgrade() -> void:
	var i := selected_offer
	selected_offer = -1
	_act({ "t": "buy", "offer": i, "pos": 0, "upgrade": true })


func _on_room_tapped(i: int) -> void:
	match run.phase:
		"shop":
			selected_offer = -1
			selected_room = -1 if selected_room == i else i
			_refresh()
		"alloy":
			_act({ "t": "alloy", "idx": i })
		_:
			pass


func _move(dir: int) -> void:
	var to := selected_room + dir
	if _act({ "t": "move", "from": selected_room, "to": to }):
		selected_room = to if to < run.tower.size() else -1
		_refresh()


func _choose_omen(id: String) -> void:
	if not UhrSession.act({ "t": "omen", "id": id }, true):
		return
	var f: Dictionary = run.fights[run.fights.size() - 1]
	if f.get("skipped", false):
		_toast("Der Händler zieht weiter. Die nächste Werkstatt ist größer.")
		_refresh()
		return
	CombatView.pending = {
		"mode": "run", "title": UhrRun._omen(f.omen).get("name", ""), "hour": int(f.hour), "seed": run.seed,
		"mine": f.tower, "foe": f.oppTower, "hp_mine": int(f.hp), "hp_foe": int(f.oppHp),
		"foe_name": f.opponent, "result": f,
	}
	returning_from_fight = true
	get_tree().change_scene_to_file(COMBAT_SCENE)


func _duplicate_index(id: String) -> int:
	for i in run.tower.size():
		if run.tower[i].id == id:
			return i
	return -1


# ------------------------------------------------------------------ toast and report


func _toast(text: String) -> void:
	toast.text = text
	toast.reset_size()
	toast.position.x = (size.x - toast.size.x) / 2.0
	var tw := create_tween()
	tw.tween_property(toast, "modulate:a", 1.0, 0.15)
	tw.tween_interval(1.6)
	tw.tween_property(toast, "modulate:a", 0.0, 0.4)


func _show_report() -> void:
	if sheet:
		sheet.queue_free()
	var code := UhrSession.report_code()
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
