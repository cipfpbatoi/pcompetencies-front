#!/usr/bin/env bash
# Build the app and deploy dist/ to the production server.
#
# Usage:
#   ./deploy.sh           build + rsync
#   ./deploy.sh --dry-run build + rsync --dry-run (show what would change, no upload)
#   ./deploy.sh --no-build rsync only, skip the build step

set -euo pipefail

REMOTE_USER="pcompetencies"
REMOTE_HOST="programacions.cipfpbatoi.es"
REMOTE_PATH="/home/pcompetencies/var/www-pcompetencies/"
LOCAL_DIST="dist/"

RSYNC_OPTS=(-av --no-perms --progress)
RUN_BUILD=1

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      RSYNC_OPTS+=(--dry-run)
      ;;
    --no-build)
      RUN_BUILD=0
      ;;
    *)
      echo "Opció desconeguda: $arg" >&2
      exit 1
      ;;
  esac
done

cd "$(dirname "$0")"

if [ "$RUN_BUILD" -eq 1 ]; then
  echo "==> npm run build"
  npm run build
fi

echo "==> rsync dist/ -> ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"
rsync "${RSYNC_OPTS[@]}" "$LOCAL_DIST" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}"

echo "==> Deploy completat"
