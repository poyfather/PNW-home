#!/bin/sh
# Builds the Android TV / Google TV / Fire TV APK.
# Needs JAVA_HOME (JDK 17) and ANDROID_HOME (platform 34, build-tools 34). If a
# ~/android-toolchain/env.sh exists (see docs/ANDROID.md) it is sourced first.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
[ -f "$HOME/android-toolchain/env.sh" ] && . "$HOME/android-toolchain/env.sh"
: "${JAVA_HOME:?Set JAVA_HOME to a JDK 17}"
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform 34 and build-tools 34}"
variant=${1:-Debug}
cd "$here"
./gradlew -q "assemble$variant"
apk=$(ls -t app/build/outputs/apk/*/*.apk | head -1)
mkdir -p ../dist
cp "$apk" "../dist/PnwHome-$(echo "$variant" | tr '[:upper:]' '[:lower:]').apk"
echo "Built ../dist/PnwHome-$(echo "$variant" | tr '[:upper:]' '[:lower:]').apk"
