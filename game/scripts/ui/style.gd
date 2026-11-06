class_name UhrStyle
extends RefCounted
## Shared colours and small UI builders. Night sky with brass accents, guild colours from the
## content file. Reference size 390 × 844 (portrait phone).

const NIGHT := Color(0.071, 0.067, 0.102)
const PANEL := Color(0.15, 0.14, 0.2)
const PANEL_LIT := Color(0.29, 0.25, 0.33)
const LINE := Color(0.23, 0.21, 0.3)
const TEXT := Color(0.93, 0.91, 0.96)
const MUTED := Color(0.63, 0.61, 0.71)
const BRASS := Color(0.89, 0.71, 0.31)
const MINE := Color(0.44, 0.81, 0.54)
const FOE := Color(0.88, 0.4, 0.4)
const SHIELD := Color(0.5, 0.7, 0.84)
const BURN := Color(1.0, 0.54, 0.24)
const POISON := Color(0.61, 0.8, 0.4)
const HEAL := Color(0.44, 0.81, 0.54)
const TIER_COLORS := [Color(0.72, 0.5, 0.3), Color(0.78, 0.8, 0.84), Color(0.89, 0.71, 0.31), Color(0.55, 0.85, 0.93)]

const MIN_TAP := 48.0


static func label(text: String, size: int, color: Color = TEXT, wrap := true) -> Label:
	var l := Label.new()
	l.text = text
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


static func box(bg: Color, radius := 6, border_left := 0, border_color := Color.TRANSPARENT) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.set_corner_radius_all(radius)
	s.border_width_left = border_left
	s.border_color = border_color
	s.content_margin_left = 8
	s.content_margin_right = 6
	s.content_margin_top = 4
	s.content_margin_bottom = 4
	return s


static func button(text: String, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(MIN_TAP, MIN_TAP + 4)
	b.add_theme_font_size_override("font_size", 18)
	var bg := BRASS if primary else PANEL
	var fg := Color(0.1, 0.08, 0.02) if primary else TEXT
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		var s := box(bg.lightened(0.08) if state == "hover" else bg, 10)
		s.content_margin_left = 12
		s.content_margin_right = 12
		if state == "disabled":
			s.bg_color = PANEL.darkened(0.2)
		b.add_theme_stylebox_override(state, s)
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		b.add_theme_color_override(state, fg)
	b.add_theme_color_override("font_disabled_color", MUTED)
	return b


static func guild_color(guild_id: String) -> Color:
	return Color(UhrContent.guild(guild_id).color)
