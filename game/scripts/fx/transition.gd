class_name UhrTransition
extends RefCounted
## Scene changes with a short fade through the night colour. A CanvasLayer on the root survives
## the change: it fades in, the scene switches under it, then it fades out and frees itself.

const OUT := 0.14
const IN := 0.2

static var _busy := false


static func go(path: String) -> void:
	var tree := Engine.get_main_loop() as SceneTree
	if tree == null:
		return
	if _busy:
		return
	_busy = true
	var layer := CanvasLayer.new()
	layer.layer = 100
	var cover := ColorRect.new()
	cover.color = UhrStyle.NIGHT
	cover.set_anchors_preset(Control.PRESET_FULL_RECT)
	cover.mouse_filter = Control.MOUSE_FILTER_STOP
	cover.modulate.a = 0.0
	layer.add_child(cover)
	tree.root.add_child(layer)
	var tw := layer.create_tween()
	tw.tween_property(cover, "modulate:a", 1.0, OUT)
	tw.tween_callback(func() -> void: tree.change_scene_to_file(path))
	# Two frames for the new scene to build its layout before it shows.
	tw.tween_interval(0.05)
	tw.tween_property(cover, "modulate:a", 0.0, IN)
	tw.tween_callback(func() -> void:
		_busy = false
		layer.queue_free())
