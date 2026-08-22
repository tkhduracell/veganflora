#!/usr/bin/env bash
#
# Regenerate (or verify) functions/package-lock.json.
#
# Cloud Build uploads functions/ with devDependencies stripped (see the predeploy
# hook in firebase.json) and installs with `npm ci`. Without a committed lockfile
# the buildpack runs `npm install --package-lock-only` first, re-resolving every
# caret range on each deploy — so transitive versions drift between deploys even
# when nothing in the repo changed.
#
# The lockfile therefore has to match the *stripped* package.json, not the one in
# git: devDependencies use pnpm's `catalog:` protocol, which npm cannot resolve.
#
#   bash functions/scripts/gen-lockfile.sh           regenerate
#   bash functions/scripts/gen-lockfile.sh --check    fail if out of sync
set -euo pipefail

FUNCTIONS_DIR="${BASH_SOURCE[0]%/*}/.."
WORK_DIR="$FUNCTIONS_DIR/.lockfile-tmp"
LOCKFILE="$FUNCTIONS_DIR/package-lock.json"

rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

jq 'del(.devDependencies)' "$FUNCTIONS_DIR/package.json" > "$WORK_DIR/package.json"

if [ "${1:-}" = "--check" ]; then
	if [ ! -f "$LOCKFILE" ]; then
		echo "functions/package-lock.json is missing. Run: pnpm --filter functions lockfile" >&2
		exit 1
	fi
	# Compare the production dependency set the lockfile was built from against
	# what package.json declares now. Purely local — no network, no install.
	if ! jq -e -n \
		--slurpfile pkg "$WORK_DIR/package.json" \
		--slurpfile lock "$LOCKFILE" \
		'($pkg[0].dependencies // {}) == ($lock[0].packages[""].dependencies // {})' > /dev/null; then
		echo "functions/package-lock.json is out of sync with package.json dependencies." >&2
		echo "Run: pnpm --filter functions lockfile" >&2
		exit 1
	fi
	echo "functions/package-lock.json is in sync."
	exit 0
fi

( cd "$WORK_DIR" && npm install --package-lock-only --quiet --no-fund --no-audit )
mv "$WORK_DIR/package-lock.json" "$LOCKFILE"
echo "Wrote $LOCKFILE"
