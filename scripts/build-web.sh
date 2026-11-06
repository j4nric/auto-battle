#!/usr/bin/env bash
# Exports the Godot project for the web into build/web/.
# BUILD_COMMIT and BUILD_BRANCH (optional) end up in the build info shown in the game.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
godot="${GODOT:-$(command -v godot || echo "$HOME/.local/bin/godot")}"

commit="${BUILD_COMMIT:-$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo lokal)}"
built="$(date -u +%Y-%m-%dT%H:%MZ)"
printf '{ "commit": "%s", "built": "%s", "branch": "%s" }\n' "$commit" "$built" "${BUILD_BRANCH:-}" > "$root/game/build_info.json"

# Web templates are large (1.3 GB download), so they are installed on first export only.
ver="$("$godot" --headless --version 2>/dev/null | cut -d. -f1-3)"
[ -f "$HOME/.local/share/godot/export_templates/${ver}.stable/web_nothreads_release.zip" ] || "$root/scripts/install-godot.sh" --templates

rm -rf "$root/build/web" && mkdir -p "$root/build/web"
"$godot" --headless --path "$root/game" --import >/dev/null 2>&1 || true
"$godot" --headless --path "$root/game" --export-release "Web" "$root/build/web/index.html"
test -s "$root/build/web/index.wasm" || { echo "export failed: index.wasm missing" >&2; exit 1; }
# Home screen support: manifest and icons (see game/web/README.txt).
cp "$root"/game/web/manifest.webmanifest "$root"/game/web/icon-*.png "$root/build/web/"
echo "build/web: $(du -sh "$root/build/web" | cut -f1), wasm gzip $(gzip -9 -c "$root/build/web/index.wasm" | wc -c | awk '{printf "%.1f MB", $1/1e6}')"
