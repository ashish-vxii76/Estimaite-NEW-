#!/bin/bash
# Start Estimaite on this computer at http://localhost:3456
set -u

REPO="https://github.com/ashish-vxii76/Estimaite-NEW-.git"
BRANCH="cursor/agile-estimator-mvp-cce6"
DIR="${ESTIMAITE_DIR:-$HOME/estimaite}"

if ! command -v git >/dev/null; then
  echo "Install Git first: https://git-scm.com/downloads"
  exit 1
fi
if ! command -v node >/dev/null; then
  echo "Install Node.js 20+ first: https://nodejs.org/"
  exit 1
fi

if [ ! -d "$DIR/.git" ]; then
  git clone -b "$BRANCH" "$REPO" "$DIR" || exit 1
fi

cd "$DIR" || exit 1
git fetch origin "$BRANCH" || exit 1
git checkout "$BRANCH" || exit 1
git pull origin "$BRANCH" || true

npm install || exit 1
npm run db:seed || echo "Seed skipped or already applied — continuing."
echo
echo "Open http://localhost:3456  (landing)"
echo "After sign-in: http://localhost:3456/home"
echo "Login: admin@estimaite.local  /  demo1234"
echo
exec npm run dev
