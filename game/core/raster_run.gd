class_name UhrRasterRun
extends RefCounted
## Port of lab/src/raster/run.ts (ADR 0008): the run on the 3-wide grid. Same economy, omens and
## rivals as UhrRun; the tower grows by one row every two hours. tests/golden/raster.json "runs"
## is the contract: the state must match the lab after every single action.
## Random draws must happen in exactly the lab's order.

const HP_MULT := 2.0
const RIVAL_TIER_DIV := 1.25

var seed: int
var rng: UhrRng
var guilds: Array = []
var phase := "shop"
var hour := 0
var gold := 0
var lives := UhrRun.LIVES
var wins := 0
var tower: Dictionary = UhrRasterTower.empty_grid(UhrRasterTower.rows_for(1))
var offers: Array = []
var reroll_cost := 1
var merchant := 0
var omens: Array = []
var pending_alloy: Variant = null
var fusions_found: Array = []
var fights: Array = []
var actions: Array = []
var over := false
var midnight := false


static func player_hp(h: int) -> int:
	return UhrCombat.rnd(UhrRun.player_hp(h) * HP_MULT)


static func price(id: String, tier: int) -> int:
	return UhrRasterTower.area(id) * 3 * (tier + 1)


static func sell_price(id: String, tier: int) -> int:
	return int(floorf(price(id, tier) / 2.0))


static func create(p_seed: int) -> UhrRasterRun:
	var r := UhrRasterRun.new()
	r.seed = p_seed
	r.rng = UhrRng.new(UhrRng.hash_seed(["run", p_seed]))
	r.guilds = r.rng.shuffle(UhrContent.data().guilds.keys()).slice(0, UhrRun.ACTIVE_GUILDS)
	r._start_hour()
	return r


## Rebuilds a run from seed and actions. Returns null if any action is rejected.
static func replay(p_seed: int, p_actions: Array) -> UhrRasterRun:
	var r := create(p_seed)
	for a in p_actions:
		if not r.act(a):
			return null
	return r


static func _tier_of(room: Dictionary) -> int:
	return int(room.tier) if room.get("tier") != null else 0


static func _shop_rooms() -> Array:
	return UhrContent.raster().rooms.filter(func(r: Dictionary) -> bool: return not r.get("fusion", false))


# ------------------------------------------------------------------ workshop
func _roll_tier() -> int:
	var x := rng.next_float()
	if hour >= 9 and x < 0.25:
		return 2
	if hour >= 5 and x < 0.45:
		return 1
	return 0


## A recipe part in the tower calls its partner into the shop.
func _called_rooms() -> Dictionary:
	var ids := {}
	for r in tower.rooms:
		ids[r.id] = true
	var called := {}
	for f in UhrContent.raster_fusions():
		if ids.has(f.pattern[0]):
			called[f.pattern[1]] = true
		if ids.has(f.pattern[1]):
			called[f.pattern[0]] = true
	return called


func _roll_offers() -> void:
	var pool: Array = _shop_rooms().filter(func(r: Dictionary) -> bool: return guilds.has(r.guild))
	var called := _called_rooms()
	var n := 3 + merchant
	offers = []
	for k in n:
		var total := 0
		for d in pool:
			total += 4 if called.has(d.id) else 1
		var x := rng.next_float() * total
		var pick: Dictionary = pool[pool.size() - 1]
		for d in pool:
			x -= 4 if called.has(d.id) else 1
			if x < 0:
				pick = d
				break
		var tier := _roll_tier()
		var p := float(price(pick.id, tier)) * (0.75 if merchant > 0 else 1.0)
		offers.append({ "id": pick.id, "tier": tier, "price": UhrCombat.rnd(p) })


func _start_hour() -> void:
	hour += 1
	tower = tower.duplicate()
	tower.rows = UhrRasterTower.rows_for(hour)
	gold += UhrRun.income(hour)
	reroll_cost = 1
	_roll_offers()
	merchant = 0
	phase = "shop"


func _commit(t: Dictionary) -> void:
	var res := UhrRasterTower.apply_fusions(t)
	tower = res.tower
	for f in res.fused:
		if not fusions_found.has(f):
			fusions_found.append(f)


## Tower after a purchase, or null. upgrade=true raises the tier of a duplicate already in the
## tower; otherwise the room is placed at (x, y, rot).
func preview_buy(offer_idx: int, upgrade: bool, x := 0, y := 0, rot := 0) -> Variant:
	if offer_idx < 0 or offer_idx >= offers.size():
		return null
	var o: Dictionary = offers[offer_idx]
	if int(o.price) > gold:
		return null
	if upgrade:
		var dup := -1
		for i in tower.rooms.size():
			if tower.rooms[i].id == o.id:
				dup = i
				break
		if dup < 0:
			return null
		var cur := _tier_of(tower.rooms[dup])
		if cur >= 3:
			return null
		var rooms: Array = tower.rooms.duplicate(true)
		rooms[dup].tier = mini(3, maxi(cur, int(o.tier)) + 1)
		return UhrRasterTower.with_rooms(tower, rooms)
	if not UhrRasterTower.can_place(tower, o.id, x, y, rot):
		return null
	var placed: Array = tower.rooms.duplicate(true)
	placed.append({ "id": o.id, "tier": int(o.tier), "alloy": null, "x": x, "y": y, "rot": rot })
	return UhrRasterTower.with_rooms(tower, placed)


# ------------------------------------------------------------------ opponents
func omens_for() -> Array:
	if hour == UhrRun.HOURS:
		return [UhrRun._omen("boss")]
	if hour == 4 or hour == 8:
		return [UhrRun._omen("elite")]
	var r := UhrRng.new(UhrRng.hash_seed([seed, "omen", hour]))
	return r.shuffle(["schwach", "normal", "elite", "haendler"]).slice(0, 3).map(func(k: String) -> Dictionary: return UhrRun._omen(k))


static func generate_rival(p_seed: int, h: int, diff: float) -> Dictionary:
	var r := UhrRng.new(UhrRng.hash_seed(["raster-rival", p_seed, h]))
	var guild: String = r.pick(UhrContent.data().guilds.keys())
	var shop := _shop_rooms()
	var pool: Array = shop.filter(func(x: Dictionary) -> bool: return x.guild == guild)
	var t := UhrRasterTower.empty_grid(UhrRasterTower.rows_for(h))
	var cap := int(t.width) * int(t.rows)
	# Same budget as the single column: one cell per floor the rival would have there.
	var target := mini(cap, 2 + h)
	var base := (h - 1) / RIVAL_TIER_DIV
	var alloy_ids: Array = UhrContent.data().alloys.map(func(a: Dictionary) -> String: return a.id)
	for tries in 60:
		if UhrRasterTower.used_cells(t) >= target:
			break
		var def: Dictionary = r.pick(pool) if r.chance(0.6) else r.pick(shop)
		if UhrRasterTower.used_cells(t) + UhrRasterTower.area(def.id) > target:
			continue
		var spots := UhrRasterTower.drop_spots(t, def.id)
		if spots.is_empty():
			continue
		var s: Dictionary = r.pick(spots)
		var tier := mini(3, int(floorf(base + r.next_float())))
		var alloy: Variant = r.pick(alloy_ids) if h >= 7 and r.chance(0.15) else null
		var rooms: Array = t.rooms.duplicate()
		rooms.append({ "id": def.id, "tier": tier, "alloy": alloy, "x": s.x, "y": s.y, "rot": s.rot })
		t = UhrRasterTower.with_rooms(t, rooms)
	t = UhrRasterTower.apply_fusions(t).tower
	return { "name": UhrRun.rival_name(guild), "tower": t, "hp": UhrCombat.rnd(player_hp(h) * diff), "ghost": false }


func _next_hour() -> void:
	if over:
		phase = "over"
	else:
		_start_hour()


func _resolve_omen(omen: Dictionary, record: bool) -> void:
	gold += int(omen.get("gold", 0))
	if omen.get("fight", true) == false:
		merchant = int(omen.get("merchant", 0))
		fights.append({ "hour": hour, "omen": omen.id, "skipped": true })
		if hour >= UhrRun.HOURS:
			over = true
		_next_hour()
		return
	var opp := generate_rival(UhrRng.hash_seed([seed, omen.id]), hour, float(omen.get("diff", 1.0)))
	var res := UhrCombat.fight(tower, player_hp(hour), opp.tower, int(opp.hp), record)
	var won: bool = res.winner == "a"
	var entry := {
		"hour": hour, "omen": omen.id, "opponent": opp.name, "won": won, "ticks": res.ticks,
		"tower": tower, "oppTower": opp.tower, "hp": player_hp(hour), "oppHp": opp.hp,
		"winner": res.winner, "statsA": res.statsA, "frames": res.frames,
	}
	fights.append(entry)
	if won:
		wins += 1
		if hour == UhrRun.HOURS:
			midnight = true
	else:
		lives -= 1
		if lives <= 0:
			over = true
	if hour >= UhrRun.HOURS:
		over = true
	if won and omen.get("alloy", false) and not tower.rooms.is_empty():
		var alloy_ids: Array = UhrContent.data().alloys.map(func(a: Dictionary) -> String: return a.id)
		pending_alloy = rng.pick(alloy_ids)
		entry["alloy"] = pending_alloy
		phase = "alloy"
	else:
		_next_hour()


# ------------------------------------------------------------------ actions
## Applies one action. Returns false and changes nothing if it is not allowed right now.
func act(a: Dictionary, record := false) -> bool:
	if not _apply(a, record):
		return false
	actions.append(a.duplicate(true))
	return true


func _apply(a: Dictionary, record: bool) -> bool:
	var t: String = a.get("t", "")
	match phase:
		"shop":
			match t:
				"buy":
					var nt: Variant = preview_buy(int(a.offer), bool(a.upgrade), int(a.get("x", 0)), int(a.get("y", 0)), int(a.get("rot", 0)))
					if nt == null:
						return false
					gold -= int(offers[int(a.offer)].price)
					offers.remove_at(int(a.offer))
					_commit(nt)
					return true
				"sell":
					var idx := int(a.idx)
					if idx < 0 or idx >= tower.rooms.size():
						return false
					var r: Dictionary = tower.rooms[idx]
					gold += sell_price(r.id, _tier_of(r))
					var rooms: Array = tower.rooms.duplicate(true)
					rooms.remove_at(idx)
					tower = UhrRasterTower.with_rooms(tower, rooms)
					return true
				"move":
					var idx := int(a.idx)
					if idx < 0 or idx >= tower.rooms.size():
						return false
					var x := int(a.x)
					var y := int(a.y)
					var rot := int(a.rot)
					if not UhrRasterTower.can_place(tower, tower.rooms[idx].id, x, y, rot, idx):
						return false
					var rooms: Array = tower.rooms.duplicate(true)
					rooms[idx].x = x
					rooms[idx].y = y
					rooms[idx].rot = rot
					_commit(UhrRasterTower.with_rooms(tower, rooms))
					return true
				"reroll":
					if gold < reroll_cost:
						return false
					gold -= reroll_cost
					reroll_cost += 1
					_roll_offers()
					return true
				"endShop":
					omens = omens_for()
					phase = "omen"
					return true
		"omen":
			if t != "omen":
				return false
			var chosen: Dictionary = {}
			for o in omens:
				if o.id == a.get("id", ""):
					chosen = o
			if chosen.is_empty():
				return false
			omens = []
			_resolve_omen(chosen, record)
			return true
		"alloy":
			var idx := int(a.get("idx", -1))
			if t != "alloy" or idx < 0 or idx >= tower.rooms.size() or pending_alloy == null:
				return false
			var rooms: Array = tower.rooms.duplicate(true)
			rooms[idx].alloy = pending_alloy
			tower = UhrRasterTower.with_rooms(tower, rooms)
			pending_alloy = null
			_next_hour()
			return true
	return false


## Compact state, same shape as the lab's golden digest.
func digest() -> Dictionary:
	return {
		"phase": phase, "hour": hour, "gold": gold, "lives": lives, "wins": wins,
		"rerollCost": reroll_cost, "merchant": merchant, "rows": int(tower.rows),
		"tower": tower.rooms.map(func(x: Dictionary) -> Array: return [x.id, _tier_of(x), x.get("alloy"), int(x.x), int(x.y), int(x.get("rot", 0)) if x.get("rot") != null else 0]),
		"offers": offers.map(func(o: Dictionary) -> Array: return [o.id, int(o.tier), int(o.price)]),
		"omens": omens.map(func(o: Dictionary) -> String: return o.id),
		"pendingAlloy": pending_alloy,
		"fusions": fusions_found.duplicate(),
		"fights": fights.map(func(f: Dictionary) -> Array: return [f.omen] if f.get("skipped", false) else [f.omen, f.opponent, 1 if f.won else 0, f.ticks]),
		"midnight": midnight,
	}
