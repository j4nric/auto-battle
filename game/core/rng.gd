class_name UhrRng
extends RefCounted
## Port of lab/src/rng.js (mulberry32 + FNV-style hashSeed). Must match the lab bit for bit:
## tests/golden/rng.json is the contract. All arithmetic is kept in unsigned 32-bit range;
## multiplication goes through imul() so no 64-bit overflow can occur.

const MASK := 0xFFFFFFFF

var state: int


func _init(seed: int) -> void:
	state = seed & MASK


## Math.imul for unsigned 32-bit inputs, result as unsigned 32-bit.
static func imul(a: int, b: int) -> int:
	a &= MASK
	b &= MASK
	var a_hi := (a >> 16) & 0xFFFF
	var a_lo := a & 0xFFFF
	var b_hi := (b >> 16) & 0xFFFF
	var b_lo := b & 0xFFFF
	var hi := ((a_hi * b_lo + a_lo * b_hi) & 0xFFFF) << 16
	return (hi + a_lo * b_lo) & MASK


## Same as hashSeed(...parts) in the lab. Integral numbers are formatted like JavaScript's
## String(), so 1.0 becomes "1".
static func hash_seed(parts: Array) -> int:
	var h := 2166136261
	for p in parts:
		var s := js_string(p)
		for i in s.length():
			h = (h ^ s.unicode_at(i)) & MASK
			h = imul(h, 16777619)
		h = (h ^ 0x9E3779B9) & MASK
		h = imul(h, 16777619)
	return h


static func js_string(p: Variant) -> String:
	if p is float and is_finite(p) and p == floorf(p) and absf(p) < 9.0e15:
		return str(int(p))
	return str(p)


## Uniform float in [0, 1), identical to Rng.float() in the lab.
func next_float() -> float:
	state = (state + 0x6D2B79F5) & MASK
	var t := state
	t = imul(t ^ (t >> 15), t | 1)
	t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & MASK)) & MASK
	return float((t ^ (t >> 14)) & MASK) / 4294967296.0


func next_int(n: int) -> int:
	return int(floorf(next_float() * n))


func chance(p: float) -> bool:
	return next_float() < p


func pick(arr: Array) -> Variant:
	return arr[next_int(arr.size())]


func shuffle(arr: Array) -> Array:
	var a := arr.duplicate()
	for i in range(a.size() - 1, 0, -1):
		var j := next_int(i + 1)
		var tmp: Variant = a[i]
		a[i] = a[j]
		a[j] = tmp
	return a
