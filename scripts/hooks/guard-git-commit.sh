#!/usr/bin/env bash
# PreToolUse hook for Bash: before `git commit`, require that lab tests and Godot tests
# pass in the repository being committed. Exit 2 blocks the command and shows stderr.
set -u
input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)
case "$cmd" in
  *"git commit"*|*"git -c "*" commit"*|*"git -C "*" commit"*) ;;
  *) exit 0 ;;
esac

base=$(printf '%s' "$input" | jq -r '.cwd // empty' 2>/dev/null)
base=${base:-${CLAUDE_PROJECT_DIR:-.}}
target=$(printf '%s' "$cmd" | grep -oE 'git -C [^ ;&|]+' | head -n1 | cut -d' ' -f3)
[ -n "$target" ] || target=$(printf '%s' "$cmd" | grep -oE '(^|[;&|] *)cd [^ ;&|]+' | head -n1 | sed -E 's/.*cd //')
target=${target:-$base}
case "$target" in /*) ;; *) target="$base/$target" ;; esac
cd "$target" 2>/dev/null || exit 0
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -f "$root/lab/package.json" ] || exit 0

fail() { echo "commit blocked (checked in $root): $1" >&2; exit 2; }

(cd "$root/lab" && node --test >/tmp/lab-test.log 2>&1) \
  || fail "lab tests failed:
$(tail -n 30 /tmp/lab-test.log)"

godot="$(command -v godot || echo "$HOME/.local/bin/godot")"
if [ -x "$godot" ]; then
  "$godot" --headless --path "$root/game" --import >/dev/null 2>&1 || true
  "$godot" --headless --path "$root/game" --script res://tests/run_tests.gd >/tmp/godot-test.log 2>&1 \
    || fail "Godot tests failed:
$(grep -E 'FAIL|failures|ERROR' /tmp/godot-test.log | tail -n 30)"
fi
exit 0
