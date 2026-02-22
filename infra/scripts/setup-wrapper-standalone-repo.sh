#!/usr/bin/env bash
# Copies wrapper code to a standalone directory and connects it to the Wrapper GitHub repo.
# Run from MegaRepo root: ./wrapper/scripts/setup-wrapper-standalone-repo.sh
# Or from wrapper: ./scripts/setup-wrapper-standalone-repo.sh

set -e

WRAPPER_SRC="${1:-$(cd "$(dirname "$0")/../.." && pwd)/wrapper}"
# Default destination: Desktop/WrapperStandalone
DEST="${2:-$HOME/Desktop/WrapperStandalone}"
WRAPPER_REPO_URL="https://github.com/Cdineshreddy12/Wrapper.git"

echo "Source:      $WRAPPER_SRC"
echo "Destination: $DEST"
echo "Remote:      $WRAPPER_REPO_URL"
echo ""

# Resolve wrapper path: script lives in wrapper/scripts/
if [[ ! -d "$WRAPPER_SRC/frontend" ]]; then
  WRAPPER_SRC="$(cd "$(dirname "$0")/.." && pwd)"
fi
if [[ ! -d "$WRAPPER_SRC/frontend" ]]; then
  echo "Error: Could not find wrapper folder (expected frontend/ and backend/)."
  echo "Usage: $0 [path-to-wrapper] [destination]"
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"

echo "Copying wrapper (excluding node_modules, .git, dist, build, .env)..."
echo "This may take 1-2 minutes. Progress:"
rsync -a --progress \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='dist' \
  --exclude='build' \
  --exclude='.next' \
  --exclude='coverage' \
  --exclude='.cache' \
  --exclude='.turbo' \
  --exclude='.vite' \
  --exclude='*.log' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  --exclude='*.tsbuildinfo' \
  --exclude='.eslintcache' \
  --exclude='*.local' \
  --exclude='backend/logs' \
  --exclude='backend/uploads' \
  "$WRAPPER_SRC/" \
  "$DEST/"

echo "Initializing git and adding Wrapper remote..."
cd "$DEST"
git init
git remote add origin "$WRAPPER_REPO_URL"

# Create .env.example if .env was excluded, so user knows what to add
if [[ ! -f backend/.env ]] && [[ -f "$WRAPPER_SRC/backend/.env" ]]; then
  echo "Note: backend/.env was not copied (excluded). Copy it manually or create from backend/.env.example"
fi

echo ""
echo "Done. Next steps:"
echo "  cd $DEST"
echo "  pnpm install   # installs all workspace packages"
echo "  git fetch origin"
echo "  git branch -M main   # or 'working' if that's your branch"
echo "  git reset --soft origin/main   # keep your files, align to remote history"
echo "  # OR: git pull origin main --allow-unrelated-histories   # merge remote"
echo "  git add -A && git commit -m 'Sync from MegaRepo: loading states, breadcrumbs, billing/onboarding'"
echo "  git push -u origin main"
echo ""
echo "If the remote has different history and you want to overwrite:"
echo "  git push -u origin main --force   # use with care"
echo ""
