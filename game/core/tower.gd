class_name UhrTower
extends RefCounted
## Port of the tower operations in lab/src/engine/tower.ts that the game needs.
## Rooms are Dictionaries { id, tier, alloy }, index 0 is the foundation.

const BASE_FLOORS := 8


static func floors_used(rooms: Array) -> int:
	var s := 0
	for r in rooms:
		s += int(UhrContent.room(r.id).height)
	return s


## Applies the hidden fusion recipes until none matches. Returns { rooms, fused }.
static func apply_fusions(rooms: Array) -> Dictionary:
	var cur := rooms.duplicate(true)
	var fused: Array[String] = []
	var changed := true
	while changed:
		changed = false
		for f in UhrContent.fusions():
			var pattern: Array = f.pattern
			var L := pattern.size()
			var hit := -1
			for i in range(0, cur.size() - L + 1):
				var ok := true
				for k in L:
					if cur[i + k].id != pattern[k]:
						ok = false
						break
				if ok:
					hit = i
					break
			if hit < 0:
				continue
			var tier := 0
			var alloy: Variant = null
			for k in L:
				var p: Dictionary = cur[hit + k]
				tier = maxi(tier, int(p.get("tier", 0)) if p.get("tier") != null else 0)
				if alloy == null and p.get("alloy") != null and p.get("alloy") != "":
					alloy = p.alloy
			var merged := { "id": f.result, "tier": tier, "alloy": alloy }
			cur = cur.slice(0, hit) + [merged] + cur.slice(hit + L)
			fused.append(f.result)
			changed = true
			break
	return { "rooms": cur, "fused": fused }
