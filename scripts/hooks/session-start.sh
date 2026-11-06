#!/usr/bin/env bash
# SessionStart hook: in Claude Code cloud sessions, install the pinned Godot binary so
# Godot tests and exports work. Web templates follow lazily on the first export.
set -u
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
"$CLAUDE_PROJECT_DIR/scripts/install-godot.sh" >/tmp/install-godot.log 2>&1 || {
  echo "Godot install failed, see /tmp/install-godot.log" >&2
  exit 0
}
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export PATH=\"$HOME/.local/bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
echo "Godot ready: $("$HOME/.local/bin/godot" --headless --version 2>/dev/null | head -n1)"
