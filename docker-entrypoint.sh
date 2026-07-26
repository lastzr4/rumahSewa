#!/bin/sh
set -e

# Whatever gets mounted at /app/uploads (a Railway volume, or nothing in
# local dev) always shows up owned by root, even if the image chowned this
# path at build time. Fix it here, as root, before dropping to the
# unprivileged app user.
mkdir -p /app/uploads
chown -R nextjs:nodejs /app/uploads

exec su-exec nextjs "$@"
