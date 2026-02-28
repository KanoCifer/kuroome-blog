#!/usr/bin/env bash
# manage_services.sh
#
# Simple helper to start or stop Redis, MongoDB and PostgreSQL on macOS.
# It uses Homebrew services by default.  If you manage these services
# some other way (docker, manual binaries, systemd, etc.) you can
# customize the commands below.
#
# Usage:
#   ./manage_services.sh start
#   ./manage_services.sh stop
#   ./manage_services.sh restart
#   ./manage_services.sh status

set -e

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 {start|stop|restart|status}"
  exit 1
fi

ACTION=$1
SERVICES=(redis mongodb postgresql)

# If you installed packages with specific names (e.g. mongodb-community),
# you can override the array above or set a mapping here.

for svc in "${SERVICES[@]}"; do
  case "$ACTION" in
    start)
      echo "Starting $svc..."
      brew services start "$svc" || true
      ;;
    stop)
      echo "Stopping $svc..."
      brew services stop "$svc" || true
      ;;
    restart)
      echo "Restarting $svc..."
      brew services restart "$svc" || true
      ;;
    status)
      brew services list | grep -E "${svc}" || true
      ;;
    *)
      echo "Unknown action: $ACTION"
      exit 2
      ;;
  esac
done

exit 0
