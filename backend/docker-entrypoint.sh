#!/bin/sh
set -e

# Optional schema sync before the main process starts (API container only).
# Set RUN_SCHEMA_SYNC=false on worker containers.
if [ "${RUN_SCHEMA_SYNC}" = "true" ]; then
  case "${PRISMA_SCHEMA_SYNC:-push}" in
    deploy)
      echo "[entrypoint] prisma migrate deploy"
      npx prisma migrate deploy
      ;;
    push)
      echo "[entrypoint] prisma db push"
      npx prisma db push --skip-generate
      ;;
    none)
      echo "[entrypoint] skipping Prisma schema sync"
      ;;
    *)
      echo "[entrypoint] unknown PRISMA_SCHEMA_SYNC=${PRISMA_SCHEMA_SYNC}" >&2
      exit 1
      ;;
  esac
fi

exec "$@"
