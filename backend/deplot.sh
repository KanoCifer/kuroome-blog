set -e  # 任何命令失败就退出

echo "====================================="
echo "Starting deployment at $(date)"
echo "====================================="

cd /home/kano/blog || exit 1
git pull

cd backend || exit 1

uv sync
uv run alembic upgrade head

cd ../frontend || exit 1
npm i pnpm -g
pnpm i
pnpm run build

sudo supervisorctl update
sudo supervisorctl reload

echo "====================================="
echo "Deployment completed successfully at $(date)"
echo "====================================="
