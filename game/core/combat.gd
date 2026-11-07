class_name UhrCombat
extends RefCounted
## Port of lab/src/engine/combat.ts. Must produce identical results; tests/golden/combat.json is
## the contract. Every floating point expression keeps the lab's order of operations, because a
## different order can change the last bits and with them a rounding decision.
##
## Towers are Dictionaries: { rooms: [{ id, tier, alloy }], maxFloors } from the foundation up,
## or grid towers (ADR 0008): { kind: "grid", width, rows, rooms: [{ id, tier, alloy, x, y, rot }] }.
## The spark's path, each room's neighbours and its predecessor come from a layout, so the single
## column is just the width-1 case.

const DECAY_START := 30
const MAX_TICKS := 200
const MAX_DEPTH := 4
const MAX_SPARKS := 3

## Tuning knobs, same names and defaults as CONFIG in the lab.
static var empty_floor_cost := 0.5
static var decay_pct_per_tick := 1.0


class RoomInst:
	var id: String
	var def: Dictionary
	var tier: int
	var alloy: Dictionary
	var idx: int
	var charge := 0.0
	var counter := 0
	var activations := 0
	var broken := false
	var spawned := false
	# dmg, shield, heal, burn, poison, activations
	var stats := [0, 0, 0, 0, 0, 0]
	## [[source room index, "above" | "below"]]: neighbours whose auras reach this room, with this
	## room's position relative to them. Indices, not references: RefCounted cycles would leak.
	var nbrs: Array = []
	## Index of the room the spark fires before this one ("the room below" in a column), or -1.
	var prev := -1

	func has_any_tag(tags: Array) -> bool:
		for t in tags:
			if def.tags.has(t):
				return true
		return false


class Spark:
	var pos := 0
	var meter := 0.0
	var discount := 0.0
	## The room just fired was entered with a discount: it passes no discount on (no chains).
	var chained := false
	var loops := 0
	var fresh := false


class Fighter:
	var side: String
	var rooms: Array[RoomInst] = []
	var hp: int
	var max_hp: int
	## Path steps [room index or -1, cells (tempo cost), fires on this step].
	var path: Array = []
	## Tempo per tick multiplier: the tower width.
	var speed := 1
	var shield := 0
	var burn := 0
	var poison := 0
	var rust := 0
	var oil := 0
	var sparks: Array[Spark] = []


var a: Fighter
var b: Fighter
var tick := 0
var record := false
var frames: Array = []
var events: Array = []


## Lab: round() = Math.floor(x + 0.5).
static func rnd(x: float) -> int:
	return int(floorf(x + 0.5))


static func fight(tower_a: Dictionary, hp_a: int, tower_b: Dictionary, hp_b: int, p_record := false) -> Dictionary:
	var c := UhrCombat.new()
	c.a = _make_fighter("a", tower_a, hp_a)
	c.b = _make_fighter("b", tower_b, hp_b)
	c.record = p_record
	var winner := c.run()
	return {
		"winner": winner,
		"ticks": c.tick,
		"a": { "hp": c.a.hp, "maxHp": c.a.max_hp },
		"b": { "hp": c.b.hp, "maxHp": c.b.max_hp },
		"statsA": c.a.rooms.map(func(r: RoomInst) -> Array: return r.stats.duplicate()),
		"statsB": c.b.rooms.map(func(r: RoomInst) -> Array: return r.stats.duplicate()),
		"frames": c.frames,
	}


static func _make_fighter(side: String, tower: Dictionary, hp: int) -> Fighter:
	var f := Fighter.new()
	f.side = side
	f.hp = hp
	f.max_hp = hp
	var grid: bool = tower.get("kind", "") == "grid"
	var i := 0
	for r in tower.rooms:
		var inst := RoomInst.new()
		inst.id = r.id
		inst.def = UhrContent.raster_room(r.id) if grid else UhrContent.room(r.id)
		inst.tier = int(r.get("tier", 0)) if r.get("tier") != null else 0
		var alloy_id: Variant = r.get("alloy")
		inst.alloy = UhrContent.alloy(alloy_id) if alloy_id != null and alloy_id != "" else {}
		inst.idx = i
		f.rooms.append(inst)
		i += 1
	if grid:
		f.path = _grid_layout(tower, f.rooms)
		f.speed = int(tower.width)
	else:
		f.path = _column_layout(tower, f.rooms)
	if not f.rooms.is_empty():
		f.sparks.append(Spark.new())
	return f


func foe_of(f: Fighter) -> Fighter:
	return b if f == a else a


func _log(side: String, idx: int, type: String, n: Variant = null) -> void:
	if not record:
		return
	var ev := { "side": side, "idx": idx, "type": type }
	if n != null:
		ev["n"] = n
	events.append(ev)


static func _below(f: Fighter, room: RoomInst) -> RoomInst:
	return f.rooms[room.prev] if room.prev >= 0 else null


## Single column: rooms from the foundation up, then the empty floors. Top and foundation are
## neighbours in the loop.
static func _column_layout(tower: Dictionary, rooms: Array[RoomInst]) -> Array:
	var n := rooms.size()
	var used := 0
	for r in rooms:
		used += int(r.def.height)
		if n < 2:
			continue
		var up := rooms[(r.idx + 1) % n]
		var down := rooms[(r.idx - 1 + n) % n]
		r.nbrs = [[up.idx, "below"]] if up == down else [[up.idx, "below"], [down.idx, "above"]]
		r.prev = down.idx
	var path: Array = []
	for r in rooms:
		path.append([r.idx, float(r.def.height), true])
	var max_floors: int = int(tower.maxFloors) if tower.get("maxFloors") != null else used
	path.append([-1, maxi(0, max_floors - used) * empty_floor_cost, false])
	return path


## Cells in the order the spark visits them: row by row from the bottom, alternating direction.
static func snake_order(width: int, rows: int) -> Array:
	var out: Array = []
	for y in rows:
		for k in width:
			out.append([k if y % 2 == 0 else width - 1 - k, y])
	return out


## Grid (ADR 0008), port of gridLayout in the lab.
static func _grid_layout(tower: Dictionary, rooms: Array[RoomInst]) -> Array:
	var w := int(tower.width)
	var h := int(tower.rows)
	var owner: Array[int] = []
	owner.resize(w * h)
	owner.fill(-1)
	for ri in rooms.size():
		var r: Dictionary = tower.rooms[ri]
		var rot := int(r.get("rot", 0)) if r.get("rot") != null else 0
		for c in UhrContent.cells_of(rooms[ri].def, rot):
			owner[(int(r.y) + c[1]) * w + int(r.x) + c[0]] = ri
	var at := func(x: int, y: int) -> int:
		return -1 if x < 0 or y < 0 or x >= w or y >= h else owner[y * w + x]
	var path: Array = []
	for cell in snake_order(w, h):
		var o: int = at.call(cell[0], cell[1])
		var cost := empty_floor_cost if o < 0 else 1.0
		if not path.is_empty() and path[-1][0] == o:
			path[-1][1] += cost
		else:
			path.append([o, cost, false])
	var order: Array[int] = []
	for st in path:
		if st[0] >= 0 and not order.has(st[0]):
			order.append(st[0])
			st[2] = true
	if order.size() > 1:
		for k in order.size():
			rooms[order[k]].prev = order[(k - 1 + order.size()) % order.size()]
	for ti in rooms.size():
		var rel := {}
		for y in h:
			for x in w:
				if at.call(x, y) != ti:
					continue
				for d in [[0, -1], [0, 1], [-1, 0], [1, 0]]:
					var si: int = at.call(x + d[0], y + d[1])
					if si < 0 or si == ti:
						continue
					if d[1] == -1:
						rel[si] = "above"
					elif not rel.has(si):
						rel[si] = "below"
		var keys := rel.keys()
		keys.sort()
		rooms[ti].nbrs = keys.map(func(si: int) -> Array: return [si, rel[si]])
	return path


static func _count_tag(f: Fighter, tag: String) -> int:
	var s := 0
	for r in f.rooms:
		if not r.broken and r.def.tags.has(tag):
			s += 1
	return s


## Sum of terms, left to right. `room` supplies tier and charge (for auras: the source).
static func _eval_terms(terms: Array, me: Fighter, foe: Fighter, room: RoomInst, mult: float) -> float:
	var sum := 0.0
	for t in terms:
		if t.has("scaled"):
			sum += float(t.scaled) * mult
		elif t.has("scaledPerTag"):
			sum += float(t.scaledPerTag.n) * _count_tag(me, t.scaledPerTag.tag) * mult
		elif t.has("flat"):
			sum += float(t.flat)
		elif t.has("tier"):
			sum += float(t.tier) * room.tier
		elif t.has("charge"):
			sum += float(t.charge) * room.charge
		elif t.has("myOil"):
			sum += float(t.myOil) * me.oil
		elif t.has("foeBurn"):
			sum += float(t.foeBurn) * foe.burn
	return sum


func _aura_mult(f: Fighter, room: RoomInst) -> float:
	var m := 1.0
	for pair in room.nbrs:
		var src: RoomInst = f.rooms[pair[0]]
		var rel: String = pair[1]
		var aura: Variant = src.def.get("aura")
		if src.broken or aura == null:
			continue
		if aura.rel == "above" and rel != "above":
			continue
		if aura.has("targetTags") and not room.has_any_tag(aura.targetTags):
			continue
		m *= _eval_terms(aura.value, f, foe_of(f), src, 1.0)
	return m




func _hp_damage(target: Fighter, amount: int) -> void:
	if amount <= 0:
		return
	target.hp -= amount
	for r in target.rooms:
		if r.alloy.get("glass", false) and not r.broken:
			r.broken = true


func _damage(target: Fighter, amount: float) -> int:
	var dmg := maxi(0, rnd(amount))
	var absorbed := mini(target.shield, dmg)
	target.shield -= absorbed
	_hp_damage(target, dmg - absorbed)
	return dmg


func _effect_mult(me: Fighter, room: RoomInst, bonus: float) -> float:
	return UhrContent.tier_mult(room.tier) * _aura_mult(me, room) * float(room.alloy.get("mult", 1.0)) * bonus


func _run_ops(ops: Variant, me: Fighter, room: RoomInst, bonus: float, depth: int, spark: Spark) -> void:
	if ops == null:
		return
	var mult := _effect_mult(me, room, bonus)
	for op in ops:
		_run_op(op, me, room, mult, depth, spark)


func _run_op(op: Dictionary, me: Fighter, room: RoomInst, mult: float, depth: int, spark: Spark) -> void:
	var foe := foe_of(me)
	var side := me.side
	match op.op:
		"firstTime":
			if not room.spawned:
				room.spawned = true
				for o in op.then:
					_run_op(o, me, room, mult, depth, spark)
			else:
				for o in op["else"]:
					_run_op(o, me, room, mult, depth, spark)
		"spawnSpark":
			if me.sparks.size() < MAX_SPARKS:
				var s := Spark.new()
				s.fresh = true
				me.sparks.append(s)
		"advanceCounter":
			_advance_counter(me, room, depth, spark)
		"advanceAllBells":
			if depth >= MAX_DEPTH:
				return
			for r in me.rooms:
				# Bells with counter 1 strike every time anyway; advancing them ping-pongs.
				if r != room and not r.broken and int(r.def.get("counterMax", 0)) > 1:
					_advance_counter(me, r, depth + 1, spark)
		"retrigger":
			# Echo rooms never repeat other echo rooms (exponential chains otherwise).
			var target := _below(me, room)
			if target == null or target == room or depth >= MAX_DEPTH or target.def.tags.has("echo"):
				return
			activate(me, target, depth + 1, spark, _eval_terms(op.bonus, me, foe, room, mult))
		"freeNext":
			if spark != null and not spark.chained:
				spark.discount += float(op.amount)
		"chargeOthers":
			var add := _eval_terms(op.value, me, foe, room, mult)
			for r in me.rooms:
				if r != room and r.def.tags.has(op.tag):
					r.charge += add
		_:
			var n := _eval_terms(op.value, me, foe, room, mult)
			if op.has("timesIfBelowTag"):
				var bl := _below(me, room)
				if bl != null and bl.def.tags.has(op.timesIfBelowTag.tag):
					n *= float(op.timesIfBelowTag.times)
			match op.op:
				"damage":
					var d := _damage(foe, n)
					room.stats[0] += d
					_log(side, room.idx, "dmg", d)
				"shield":
					var s := rnd(n)
					me.shield += s
					room.stats[1] += s
					_log(side, room.idx, "shield", s)
				"heal":
					var healed := mini(rnd(n), me.max_hp - me.hp)
					me.hp += healed
					me.burn = maxi(0, me.burn - 1)
					me.poison = maxi(0, me.poison - 1)
					room.stats[2] += healed
					_log(side, room.idx, "heal", healed)
				"burn":
					var bu := rnd(n)
					foe.burn += bu
					room.stats[3] += bu
					_log(side, room.idx, "burn", bu)
				"poison":
					var p := rnd(n)
					foe.poison += p
					room.stats[4] += p
					_log(side, room.idx, "poison", p)
				"rust":
					foe.rust += rnd(n)
					_log(side, room.idx, "rust", rnd(n))
				"oil":
					me.oil += rnd(n)
					_log(side, room.idx, "oil", rnd(n))
				"breakShield":
					foe.shield = maxi(0, foe.shield - rnd(n))
				"addCharge":
					room.charge += n
				_:
					push_error("unknown op " + str(op.op))


func _advance_counter(me: Fighter, room: RoomInst, depth: int, spark: Spark) -> void:
	room.counter += 1
	if room.counter < int(room.def.get("counterMax", 0)):
		return
	room.counter = 0
	_run_ops(room.def.on.get("strike"), me, room, 1.0, depth, spark)
	_log(me.side, room.idx, "strike")
	_emit(me, "strikeEvent", depth + 1, spark)


func _emit(me: Fighter, trigger: String, depth: int, spark: Spark) -> void:
	if depth > MAX_DEPTH:
		return
	for r in me.rooms:
		if not r.broken and r.def.on.has(trigger):
			_run_ops(r.def.on[trigger], me, r, 1.0, depth, spark)


func activate(me: Fighter, room: RoomInst, depth: int, spark: Spark, bonus := 1.0) -> void:
	if room.broken or me.hp <= 0:
		return
	var times := int(room.alloy.get("times", 1))
	for t in times:
		room.activations += 1
		room.stats[5] += 1
		_log(me.side, room.idx, "fire")
		if room.def.on.has("activate"):
			_run_ops(room.def.on.activate, me, room, bonus, depth, spark)
		if room.alloy.has("shieldPerFloor"):
			var s := int(room.alloy.shieldPerFloor) * int(room.def.height) * int(UhrContent.tier_mult(room.tier))
			me.shield += s
			room.stats[1] += s
		# Copper conducts only when the spark fires the room directly (loop via the wrap otherwise).
		if room.alloy.get("conduct", false) and depth == 0:
			var prev := _below(me, room)
			if prev != null and prev != room:
				activate(me, prev, depth + 1, spark)
	if room.alloy.has("breaksAfter") and room.activations >= int(room.alloy.breaksAfter):
		room.broken = true


func _step_fighter(f: Fighter) -> void:
	if f.rooms.is_empty():
		return
	var gain := minf(1.6, maxf(0.6, 1.0 + 0.06 * f.oil - 0.06 * f.rust))
	var sparks := f.sparks.duplicate()
	for spark: Spark in sparks:
		if spark.fresh:
			spark.fresh = false
			continue
		spark.meter += gain * f.speed
		var guard := 0
		while guard < 24 * f.speed:
			guard += 1
			var step: Array = f.path[spark.pos]
			var room: RoomInst = f.rooms[step[0]] if step[0] >= 0 else null
			var cost: float = step[1]
			if room != null:
				cost = maxf(0.0, step[1] * float(room.alloy.get("costMult", 1.0)) - spark.discount)
			if spark.meter < cost:
				break
			spark.meter -= cost
			if room != null:
				spark.chained = spark.discount > 0.0
				spark.discount = 0.0
				if step[2]:
					activate(f, room, 0, spark)
			spark.pos += 1
			if spark.pos >= f.path.size():
				spark.pos = 0
				spark.loops += 1
				_emit(f, "loopEvent", 1, spark)
			if room != null and (f.hp <= 0 or foe_of(f).hp <= 0):
				return


func _status_tick(f: Fighter) -> void:
	if f.burn > 0:
		_damage(f, f.burn)
		f.burn -= 1
	if f.poison > 0:
		_hp_damage(f, f.poison)
	if tick % 3 == 0:
		f.oil = maxi(0, f.oil - 1)
		f.rust = maxi(0, f.rust - 1)
	if tick > DECAY_START:
		_hp_damage(f, int(ceilf(((tick - DECAY_START) * decay_pct_per_tick * f.max_hp) / 100.0)))


func _snapshot() -> void:
	var s := func(f: Fighter) -> Dictionary:
		return {
			"hp": f.hp, "shield": f.shield, "burn": f.burn, "poison": f.poison, "rust": f.rust, "oil": f.oil,
			"sparks": f.sparks.map(func(sp: Spark) -> int: return sp.pos),
			"rooms": f.rooms.map(func(r: RoomInst) -> Dictionary: return { "broken": r.broken, "charge": r.charge, "counter": r.counter }),
		}
	frames.append({ "tick": tick, "a": s.call(a), "b": s.call(b), "events": events })
	events = []


func run() -> String:
	if record:
		_snapshot()
	while tick < MAX_TICKS:
		tick += 1
		# The order alternates every tick so neither side has a fixed advantage.
		var order := [a, b] if tick % 2 == 1 else [b, a]
		for f: Fighter in order:
			if a.hp > 0 and b.hp > 0:
				_step_fighter(f)
		if a.hp > 0 and b.hp > 0:
			_status_tick(a)
			_status_tick(b)
		if record:
			_snapshot()
		if a.hp <= 0 or b.hp <= 0:
			break
	if a.hp <= 0 and b.hp <= 0:
		return "draw"
	if b.hp <= 0:
		return "a"
	if a.hp <= 0:
		return "b"
	return "a" if a.hp * b.max_hp >= b.hp * a.max_hp else "b"
