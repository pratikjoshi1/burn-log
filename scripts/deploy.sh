#!/bin/sh
# Publishes www/ to the gh-pages branch, which GitHub Pages serves as the web link.
# The branch only ever holds the built site, so it is replaced on each deploy.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node scripts/build.mjs
NAME="$(git config user.name)"; EMAIL="$(git config user.email)"
TMP="$(mktemp -d)"
cp -R www/. "$TMP"/
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="$NAME" -c user.email="$EMAIL" commit -q --no-gpg-sign -m "Deploy Burn Log $(date +%Y-%m-%d\ %H:%M)"
cd "$ROOT"
# push from this repo so its own credential settings (the pratikjoshi1 account) apply
git fetch -q -f "$TMP" gh-pages:gh-pages
git push -q -f origin gh-pages
rm -rf "$TMP"
echo "Deployed. GitHub Pages updates in about a minute."
