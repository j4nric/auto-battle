#!/usr/bin/env bash
# Installs the pinned Godot version (headless-capable Linux editor binary) to
# ~/.local/bin/godot. With --templates it also installs the Web export templates
# (single-threaded variant only, which is what the project exports).
# Idempotent: does nothing when the right version is already there.
set -euo pipefail

VERSION="${GODOT_VERSION:-4.7.2}"
TAG="${VERSION}-stable"
BIN_DIR="${HOME}/.local/bin"
CACHE="${GODOT_CACHE:-${HOME}/.cache/godot}"
TPL_DIR="${HOME}/.local/share/godot/export_templates/${VERSION}.stable"
BASE="https://github.com/godotengine/godot/releases/download/${TAG}"

mkdir -p "$BIN_DIR" "$CACHE"

if ! "$BIN_DIR/godot" --headless --version 2>/dev/null | grep -q "^${VERSION}\.stable"; then
  echo "Installing Godot ${VERSION} ..."
  zip="$CACHE/Godot_v${TAG}_linux.x86_64.zip"
  [ -f "$zip" ] || curl -fsSL --retry 3 -o "$zip" "$BASE/Godot_v${TAG}_linux.x86_64.zip"
  unzip -oq "$zip" -d "$CACHE"
  install -m 755 "$CACHE/Godot_v${TAG}_linux.x86_64" "$BIN_DIR/godot"
fi
echo "Godot: $("$BIN_DIR/godot" --headless --version 2>/dev/null | head -n1)"

if [ "${1:-}" = "--templates" ]; then
  if [ ! -f "$TPL_DIR/web_nothreads_release.zip" ]; then
    echo "Installing Web export templates for ${VERSION} (about 1.3 GB download) ..."
    tpz="$CACHE/templates-${TAG}.tpz"
    [ -f "$tpz" ] || curl -fsSL --retry 3 -o "$tpz" "$BASE/Godot_v${TAG}_export_templates.tpz"
    mkdir -p "$TPL_DIR" "$CACHE/tpl"
    unzip -oq "$tpz" 'templates/web_nothreads_release.zip' 'templates/web_nothreads_debug.zip' 'templates/version.txt' -d "$CACHE/tpl"
    cp "$CACHE"/tpl/templates/* "$TPL_DIR/"
    rm -f "$tpz"
  fi
  echo "Web templates: $TPL_DIR"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "Note: add $BIN_DIR to PATH" ;;
esac
