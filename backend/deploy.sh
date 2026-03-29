#!/bin/bash
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NO_COLOR='\033[0m'

step() {
  echo -e "\n${BLUE}▶ $1${NO_COLOR}"
}

ok() {
  echo -e "${GREEN}  ✓ $1${NO_COLOR}"
}

warn() {
  echo -e "${YELLOW}  ⚠ $1${NO_COLOR}"
}

echo ""
echo "========================================"
echo "  🚀 Deployment Started"
echo "  📅 $(date)"
echo "========================================"

step "Setting up Node.js environment"
source ~/.nvm/nvm.sh
nvm use 24
ok "Node.js $(node -v)"

step "Pulling latest code"
cd /home/kano/blog || exit 1
git checkout . || true
git pull
ok "Git pull completed"

step "Updating backend dependencies"
cd backend || exit 1
/home/kano/.local/bin/uv sync
ok "Dependencies synced"

step "Running database migrations"
/home/kano/.local/bin/uv run alembic upgrade head
ok "Migrations applied"

step "Building frontend"
cd ../frontend || exit 1
pnpm i
pnpm run build
ok "Frontend built"

step "Restarting services"
sudo supervisorctl reload || true
sudo supervisorctl update || true
ok "Services restarted"

echo ""
echo "========================================"
echo "  ✅ Deployment Completed Successfully"
echo "  📅 $(date)"
echo "========================================"
echo ""
