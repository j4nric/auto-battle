class_name UhrRasterTower
extends RefCounted
## Grid tower operations (ADR 0008), port of lab/src/raster/tower.ts. Grid towers are
## Dictionaries { kind: "grid", width, rows, rooms: [{ id, tier, alloy, x, y, rot }] }.


## Pattern recipes: pattern[1] directly on top of pattern[0] (both single cells) fuse into the
## result, a 1x2 column at the lower part's position, with the highest tier and the first alloy.
## Returns { tower, fused }.
static func apply_fusions(tower: Dictionary) -> Dictionary:
	var rooms: Array = tower.rooms.duplicate(true)
	var fused: Array[String] = []
	var changed := true
	while changed:
		changed = false
		for f in UhrContent.raster_fusions():
			var lo := -1
			var hi := -1
			for i in rooms.size():
				if rooms[i].id != f.pattern[0]:
					continue
				hi = _above(rooms, i, f.pattern[1])
				if hi >= 0:
					lo = i
					break
			if lo < 0:
				continue
			var a: Dictionary = rooms[lo]
			var b: Dictionary = rooms[hi]
			var alloy: Variant = a.get("alloy") if a.get("alloy") != null else b.get("alloy")
			var merged := {
				"id": f.result, "tier": maxi(_tier(a), _tier(b)), "alloy": alloy,
				"x": int(a.x), "y": int(a.y), "rot": 0,
			}
			var rest: Array = []
			for i in rooms.size():
				if i != lo and i != hi:
					rest.append(rooms[i])
			rest.append(merged)
			rooms = rest
			fused.append(f.result)
			changed = true
			break
	var out := tower.duplicate()
	out.rooms = rooms
	return { "tower": out if not fused.is_empty() else tower, "fused": fused }


static func _above(rooms: Array, lo: int, id: String) -> int:
	for j in rooms.size():
		var b: Dictionary = rooms[j]
		if b.id == id and int(b.x) == int(rooms[lo].x) and int(b.y) == int(rooms[lo].y) + 1:
			return j
	return -1


static func _tier(r: Dictionary) -> int:
	return int(r.tier) if r.get("tier") != null else 0
