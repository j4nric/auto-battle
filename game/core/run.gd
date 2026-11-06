class_name UhrRun
extends RefCounted
## Port of lab/src/run/run.ts: the run as a state machine driven by actions. Seed + actions
## reproduce a run exactly (save game, bug report replay); tests/golden/runs.json is the contract.
##
## Actions are Dictionaries like the lab's: { t: "buy", offer, pos, upgrade }, { t: "sell", idx },
## { t: "move", from, to }, { t: "reroll" }, { t: "endShop" }, { t: "omen", id }, { t: "alloy", idx }.
## Rooms in the tower are Dictionaries { id, tier, alloy }. The game has no ghost towers (M7).

const HOURS := 12
const LIVES := 3
const ACTIVE_GUILDS := 3
const HP_TABLE := [80, 260, 555, 918, 1334, 1793, 2291, 2824, 3388, 3981, 4601, 5247, 5916, 6608]
## Same knobs as SHOP in the lab.
const OWNED_WEIGHT := 1
const RECIPE_PULL := 4

var seed: int
var rng: UhrRng
var guilds: Array = []
var phase := "shop"
var hour := 0
var gold := 0
var lives := LIVES
var wins := 0
var tower: Array = []
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
	return HP_TABLE[mini(h, HP_TABLE.size() - 1)]


static func income(h: int) -> int:
	return 9 + int(ceilf(h / 2.0))


static func price(id: String, tier: int) -> int:
	return int(UhrContent.room(id).height) * 3 * (tier + 1)


static func sell_price(id: String, tier: int) -> int:
	return int(floorf(price(id, tier) / 2.0))


static func create(p_seed: int) -> UhrRun:
	var r := UhrRun.new()
	r.seed = p_seed
	r.rng = UhrRng.new(UhrRng.hash_seed(["run", p_seed]))
	r.guilds = r.rng.shuffle(UhrContent.data().guilds.keys()).slice(0, ACTIVE_GUILDS)
	r._start_hour()
	return r


## Rebuilds a run from seed and actions. Returns null if any action is rejected.
static func replay(p_seed: int, p_actions: Array) -> UhrRun:
	var r := create(p_seed)
	for a in p_actions:
		if not r.act(a):
			return null
	return r


static func _tier_of(room: Dictionary) -> int:
	return int(room.tier) if room.get("tier") != null else 0


# ------------------------------------------------------------------ workshop


func _roll_tier() -> int:
	var x := rng.next_float()
	if hour >= 9 and x < 0.25:
		return 2
	if hour >= 5 and x < 0.45:
		return 1
	return 0


func _called_rooms() -> Dictionary:
	var ids: Array = tower.map(func(r: Dictionary) -> String: return r.id)
	var called := {}
	for f in UhrContent.fusions():
		var pattern: Array = f.pattern
		var L := pattern.size()
		for miss in L:
			var rest: Array = []
			for k in L:
				if k != miss:
					rest.append(pattern[k])
			for i in range(0, ids.size() - (L - 1) + 1):
				if ids.slice(i, i + L - 1) == rest:
					called[pattern[miss]] = true
	return called


func _roll_offers() -> void:
	var pool: Array = UhrContent.data().rooms.filter(func(r: Dictionary) -> bool: return not r.get("fusion", false) and guilds.has(r.guild))
	var owned := {}
	for r in tower:
		owned[r.id] = true
	var called := _called_rooms()
	var n := 3 + merchant
	offers = []
	for k in n:
		var total := 0
		for d in pool:
			total += _weight(d, owned, called)
		var x := rng.next_float() * total
		var pick: Dictionary = pool[pool.size() - 1]
		for d in pool:
			x -= _weight(d, owned, called)
			if x < 0:
				pick = d
				break
		var tier := _roll_tier()
		var p := float(price(pick.id, tier)) * (0.75 if merchant > 0 else 1.0)
		offers.append({ "id": pick.id, "tier": tier, "price": UhrCombat.rnd(p) })


static func _weight(d: Dictionary, owned: Dictionary, called: Dictionary) -> int:
	return (OWNED_WEIGHT if owned.has(d.id) else 1) * (RECIPE_PULL if called.has(d.id) else 1)


func _start_hour() -> void:
	hour += 1
	gold += income(hour)
	reroll_cost = 1
	_roll_offers()
	merchant = 0
	phase = "shop"


func _commit(rooms: Array) -> void:
	var res := UhrTower.apply_fusions(rooms)
	tower = res.rooms
	for f in res.fused:
		if not fusions_found.has(f):
			fusions_found.append(f)


## The tower after a purchase, or null if it is not possible (see previewBuy in the lab).
func preview_buy(offer_idx: int, pos: int, upgrade: bool) -> Variant:
	if offer_idx < 0 or offer_idx >= offers.size():
		return null
	var o: Dictionary = offers[offer_idx]
	if o.price > gold:
		return null
	var dup := -1
	for i in tower.size():
		if tower[i].id == o.id:
			dup = i
			break
	if dup >= 0 and upgrade:
		var cur := _tier_of(tower[dup])
		if cur >= 3:
			return null
		var t := tower.duplicate(true)
		t[dup].tier = mini(3, maxi(cur, int(o.tier)) + 1)
		return t
	if UhrTower.floors_used(tower) + int(UhrContent.room(o.id).height) > UhrTower.BASE_FLOORS:
		return null
	var t2 := tower.duplicate(true)
	t2.insert(clampi(pos, 0, t2.size()), { "id": o.id, "tier": int(o.tier), "alloy": null })
	return t2


# ------------------------------------------------------------------ omens and opponents


func omens_for() -> Array:
	if hour == HOURS:
		return [_omen("boss")]
	if hour == 4 or hour == 8:
		return [_omen("elite")]
	var r := UhrRng.new(UhrRng.hash_seed([seed, "omen", hour]))
	return r.shuffle(["schwach", "normal", "elite", "haendler"]).slice(0, 3).map(func(k: String) -> Dictionary: return _omen(k))


static func _omen(id: String) -> Dictionary:
	for o in UhrContent.data().omens:
		if o.id == id:
			return o
	return {}


static func rival_name(guild: String) -> String:
	var r: Dictionary = UhrContent.data().rivals[guild]
	return "%s, %s" % [r.name, r.title]


static func generate_monster(p_seed: int, h: int, diff: float) -> Dictionary:
	var r := UhrRng.new(UhrRng.hash_seed(["monster", p_seed, h]))
	var guild: String = r.pick(UhrContent.data().guilds.keys())
	var all: Array = UhrContent.data().rooms.filter(func(x: Dictionary) -> bool: return not x.get("fusion", false))
	var pool: Array = all.filter(func(x: Dictionary) -> bool: return x.guild == guild)
	var target := mini(UhrTower.BASE_FLOORS, 2 + h)
	var rooms: Array = []
	var base := (h - 1) / 3.0
	var alloy_ids: Array = UhrContent.data().alloys.map(func(a: Dictionary) -> String: return a.id)
	for tries in 40:
		if UhrTower.floors_used(rooms) >= target:
			break
		var def: Dictionary = r.pick(pool) if r.chance(0.6) else r.pick(all)
		if UhrTower.floors_used(rooms) + int(def.height) > target:
			continue
		var tier := mini(3, int(floorf(base + r.next_float())))
		var alloy: Variant = r.pick(alloy_ids) if h >= 7 and r.chance(0.15) else null
		rooms.append({ "id": def.id, "tier": tier, "alloy": alloy })
	var fused: Array = UhrTower.apply_fusions(rooms).rooms
	return { "name": rival_name(guild), "tower": { "rooms": fused, "maxFloors": UhrTower.BASE_FLOORS }, "hp": UhrCombat.rnd(player_hp(h) * diff), "ghost": false }


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
		if hour >= HOURS:
			over = true
		_next_hour()
		return
	var opp := generate_monster(UhrRng.hash_seed([seed, omen.id]), hour, float(omen.get("diff", 1.0)))
	var mine := { "rooms": tower, "maxFloors": UhrTower.BASE_FLOORS }
	var res := UhrCombat.fight(mine, player_hp(hour), opp.tower, int(opp.hp), record)
	var won: bool = res.winner == "a"
	var entry := {
		"hour": hour, "omen": omen.id, "opponent": opp.name, "won": won, "ticks": res.ticks,
		"tower": mine, "oppTower": opp.tower, "hp": player_hp(hour), "oppHp": opp.hp,
		"winner": res.winner, "statsA": res.statsA, "frames": res.frames,
	}
	fights.append(entry)
	if won:
		wins += 1
		if hour == HOURS:
			midnight = true
	else:
		lives -= 1
		if lives <= 0:
			over = true
	if hour >= HOURS:
		over = true
	if won and omen.get("alloy", false) and not tower.is_empty():
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
					var nt: Variant = preview_buy(int(a.offer), int(a.pos), bool(a.upgrade))
					if nt == null:
						return false
					gold -= int(offers[int(a.offer)].price)
					offers.remove_at(int(a.offer))
					_commit(nt)
					return true
				"sell":
					var idx := int(a.idx)
					if idx < 0 or idx >= tower.size():
						return false
					var r: Dictionary = tower[idx]
					gold += sell_price(r.id, _tier_of(r))
					tower = tower.duplicate(true)
					tower.remove_at(idx)
					return true
				"move":
					var n := tower.size()
					var from := int(a.from)
					var to := int(a.to)
					if from == to or from < 0 or to < 0 or from >= n or to >= n:
						return false
					var mv := tower.duplicate(true)
					var room: Dictionary = mv.pop_at(from)
					mv.insert(to, room)
					_commit(mv)
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
			return false
		"omen":
			if t != "omen":
				return false
			var chosen: Dictionary = {}
			for o in omens:
				if o.id == a.get("id"):
					chosen = o
			if chosen.is_empty():
				return false
			omens = []
			_resolve_omen(chosen, record)
			return true
		"alloy":
			var idx := int(a.get("idx", -1))
			if t != "alloy" or idx < 0 or idx >= tower.size() or pending_alloy == null:
				return false
			tower = tower.duplicate(true)
			tower[idx].alloy = pending_alloy
			pending_alloy = null
			_next_hour()
			return true
	return false


## Compact state, same shape as the lab's golden digest.
func digest() -> Dictionary:
	return {
		"phase": phase, "hour": hour, "gold": gold, "lives": lives, "wins": wins,
		"rerollCost": reroll_cost, "merchant": merchant,
		"tower": tower.map(func(x: Dictionary) -> Array: return [x.id, _tier_of(x), x.get("alloy")]),
		"offers": offers.map(func(o: Dictionary) -> Array: return [o.id, int(o.tier), int(o.price)]),
		"omens": omens.map(func(o: Dictionary) -> String: return o.id),
		"pendingAlloy": pending_alloy,
		"fusions": fusions_found.duplicate(),
		"fights": fights.map(func(f: Dictionary) -> Array: return [f.omen] if f.get("skipped", false) else [f.omen, f.opponent, 1 if f.won else 0, f.ticks]),
		"midnight": midnight,
	}
