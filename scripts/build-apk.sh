#!/usr/bin/env bash
set -euo pipefail
if ! command -v java >/dev/null 2>&1; then
  echo "Java is required. Use JDK 17." >&2
  exit 1
fi
if ! command -v sdkmanager >/dev/null 2>&1; then
  echo "Android SDK command-line tools (sdkmanager) are required." >&2
  exit 1
fi
sdkmanager --install "platform-tools" "platforms;android-35" "build-tools;35.0.0"
if ! command -v gradle >/dev/null 2>&1; then
  echo "Gradle is not installed. Run the GitHub Actions workflow to build the APK." >&2
  exit 1
fi
gradle --no-daemon wrapper --gradle-version 8.7 --distribution-type bin
chmod +x ./gradlew
./gradlew --no-daemon --stacktrace clean assembleDebug
echo "APK: app/build/outputs/apk/debug/app-debug.apk"
