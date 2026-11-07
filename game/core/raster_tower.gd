class_name UhrRasterTower
extends RefCounted
## Grid tower operations (ADR 0008), port of lab/src/raster/tower.ts. Grid towers are
## Dictionaries { kind: "grid", width, rows, rooms: [{ id, tier, alloy, x, y, rot }] }.


## Pattern recipes (raster.json "fusions"): when every part of a recipe sits on exactly its cells
## (relative to the first part's first cell), the parts fuse into the result there, rotation 0,
## with the highest tier and the first alloy in part order. Returns { tower, fused }.
static func apply_fusions(tower: Dictionary) -> Dictionary:
	var rooms: Array = tower.rooms.duplicate(true)
	var fused: Array[String] = []
	var changed := true
	while changed:
		changed = false
		for f in UhrContent.raster_fusions():
			var hit := _match(rooms, f)
			if hit.is_empty():
				continue
			var used: Array = hit.used
			var tier := 0
			var alloy: Variant = null
			for k in used:
				tier = maxi(tier, _tier(rooms[k]))
				if alloy == null and rooms[k].get("alloy") != null:
					alloy = rooms[k].alloy
			var rest: Array = []
			for k in rooms.size():
				if not used.has(k):
					rest.append(rooms[k])
			rest.append({ "id": f.result, "tier": tier, "alloy": alloy, "x": hit.x, "y": hit.y, "rot": 0 })
			rooms = rest
			fused.append(f.result)
			changed = true
			break
	var out := tower.duplicate()
	out.rooms = rooms
	return { "tower": out if not fused.is_empty() else tower, "fused": fused }


## First match of recipe f: { used: [room indices in part order], x, y } or empty.
static func _match(rooms: Array, f: Dictionary) -> Dictionary:
	for a in rooms.size():
		if rooms[a].id != f.parts[0].id:
			continue
		var anchor: Array = _abs_cells(rooms[a])[0]
		var used: Array = []
		for part in f.parts:
			var want: Array = []
			for c in part.cells:
				want.append([anchor[0] + int(c[0]), anchor[1] + int(c[1])])
			want.sort()
			var found := -1
			for k in rooms.size():
				if used.has(k) or rooms[k].id != part.id:
					continue
				var got := _abs_cells(rooms[k])
				got.sort()
				if got == want:
					found = k
					break
			if found < 0:
				break
			used.append(found)
		if used.size() == f.parts.size():
			return { "used": used, "x": anchor[0], "y": anchor[1] }
	return {}


static func _abs_cells(r: Dictionary) -> Array:
	var out: Array = []
	for c in UhrContent.cells_of(UhrContent.raster_room(r.id), _rot(r)):
		out.append([int(r.x) + c[0], int(r.y) + c[1]])
	return out


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
