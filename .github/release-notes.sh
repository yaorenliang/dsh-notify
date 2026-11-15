#!/usr/bin/env bash
# Print the CHANGELOG entry for one version. Empty output means "no entry", and
# the caller falls back to notes generated from the commit range.
set -euo pipefail
version="${1#v}"
awk -v v="$version" '
  $0 ~ "^## " v " " { inside = 1; next }
  inside && /^## / { exit }
  inside { print }
' CHANGELOG.md
