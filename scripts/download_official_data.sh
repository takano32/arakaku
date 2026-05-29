#!/bin/bash
# Download data files from official site repository via GitHub API

set -euo pipefail

REPO="kobayashi856/arakaku-site"
API_BASE="https://api.github.com/repos/${REPO}/contents"
RAW_BASE="https://raw.githubusercontent.com/${REPO}/main"
DEST="tmp/arakaku-site"

fetch_dir() {
  local path="$1"
  local dest="$2"

  mkdir -p "$dest"

  local api_url="${API_BASE}/${path}"
  local entries
  entries=$(curl -sSf \
    -H "Accept: application/vnd.github.v3+json" \
    "$api_url")

  local names types
  mapfile -t names < <(echo "$entries" | python3 -c "import sys,json; [print(e['name']) for e in json.load(sys.stdin)]")
  mapfile -t types < <(echo "$entries" | python3 -c "import sys,json; [print(e['type']) for e in json.load(sys.stdin)]")

  local i
  for i in "${!names[@]}"; do
    local name="${names[$i]}"
    local type="${types[$i]}"
    if [ "$type" = "file" ]; then
      echo "Downloading ${path}/${name}"
      curl -sSf --globoff "${RAW_BASE}/${path}/${name}" -o "${dest}/${name}"
    elif [ "$type" = "dir" ]; then
      fetch_dir "${path}/${name}" "${dest}/${name}"
    fi
  done
}

fetch_dir "src" "$DEST"
fetch_dir "public" "$DEST/public"
echo "Done. Files saved to ${DEST}/"
