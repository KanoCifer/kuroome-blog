set -e  # 任何命令失败就退出

echo "====================================="
echo "Starting deployment at $(date)"
echo "====================================="

source ~/.nvm/nvm.sh
nvm use 24


cd /home/kano/blog || exit 1
git checkout .
git pull

cd backend || exit 1

/home/kano/.local/bin/uv sync
/home/kano/.local/bin/uv run alembic upgrade head

cd ../frontend || exit 1
pnpm i
pnpm run build

sudo supervisorctl reload
sudo supervisorctl update
sudo supervisorctl status


echo "====================================="
echo "Deployment completed successfully at $(date)"
echo "====================================="
