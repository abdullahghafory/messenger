#!/usr/bin/env bash
set -euo pipefail
if ! command -v gradle >/dev/null 2>&1; then
  echo "Gradle نصب نیست؛ برای ساخت خودکار از GitHub Actions استفاده کنید." >&2
  exit 1
fi
if [[ -z "${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}" ]]; then
  echo "ANDROID_HOME/ANDROID_SDK_ROOT تنظیم نشده است." >&2
  exit 1
fi
gradle --no-daemon wrapper --gradle-version 8.7 --distribution-type bin
chmod +x ./gradlew
./gradlew --no-daemon clean assembleDebug
echo "APK: app/build/outputs/apk/debug/app-debug.apk"
