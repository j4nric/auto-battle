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


const WIDTH := 3


## Rows by hour: 3x3 in hours 1 and 2, one more row every two hours up to 3x8.
static func rows_for(hour: int) -> int:
	return mini(8, 3 + int(floorf((maxi(1, hour) - 1) / 2.0)))


static func empty_grid(rows: int) -> Dictionary:
	return { "kind": "grid", "width": WIDTH, "rows": rows, "rooms": [] }


static func area(id: String) -> int:
	return UhrContent.cells_of(UhrContent.raster_room(id)).size()


static func used_cells(t: Dictionary) -> int:
	var n := 0
	for r in t.rooms:
		n += area(r.id)
	return n


static func _rot(r: Dictionary) -> int:
	return int(r.rot) if r.get("rot") != null else 0


static func _occupancy(t: Dictionary, skip := -1) -> Array[int]:
	var w := int(t.width)
	var occ: Array[int] = []
	occ.resize(w * int(t.rows))
	occ.fill(-1)
	for i in t.rooms.size():
		if i == skip:
			continue
		var r: Dictionary = t.rooms[i]
		for c in UhrContent.cells_of(UhrContent.raster_room(r.id), _rot(r)):
			occ[(int(r.y) + c[1]) * w + int(r.x) + c[0]] = i
	return occ


## Whether room `id` fits at (x, y, rot), ignoring room `skip` (for moves).
static func can_place(t: Dictionary, id: String, x: int, y: int, rot: int, skip := -1) -> bool:
	var w := int(t.width)
	var h := int(t.rows)
	var occ := _occupancy(t, skip)
	for c in UhrContent.cells_of(UhrContent.raster_room(id), rot):
		var ax: int = x + c[0]
		var ay: int = y + c[1]
		if ax < 0 or ay < 0 or ax >= w or ay >= h or occ[ay * w + ax] >= 0:
			return false
	return true


## Distinct rotations of a room.
static func rotations(id: String) -> Array[int]:
	var seen: Array = []
	var out: Array[int] = []
	for rot in 4:
		var cells := UhrContent.cells_of(UhrContent.raster_room(id), rot)
		if not seen.has(cells):
			seen.append(cells)
			out.append(rot)
	return out


## Placements as low as possible per rotation and column, in the lab's order.
static func drop_spots(t: Dictionary, id: String, skip := -1) -> Array:
	var out: Array = []
	for rot in rotations(id):
		for x in int(t.width):
			for y in int(t.rows):
				if can_place(t, id, x, y, rot, skip):
					out.append({ "x": x, "y": y, "rot": rot })
					break
	return out


static func with_rooms(t: Dictionary, rooms: Array) -> Dictionary:
	var out := t.duplicate()
	out.rooms = rooms
	return out
