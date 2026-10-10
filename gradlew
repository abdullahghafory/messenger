#!/bin/sh
set -e
if command -v gradle >/dev/null 2>&1; then
  exec gradle "$@"
fi
echo "Gradle is not installed. On GitHub Actions, use the included workflow; it installs Gradle 8.7 automatically." >&2
exit 1
