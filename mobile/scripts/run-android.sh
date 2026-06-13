#!/usr/bin/env bash
set -euo pipefail

export JAVA_HOME="${JAVA_HOME:-/Users/mac/Library/Java/JavaVirtualMachines/ms-21.0.7/Contents/Home}"
export PATH="$JAVA_HOME/bin:$PATH"

cd "$(dirname "$0")/.."

# Release APK bundles JS inside the app — works on any network without Metro/Wi-Fi.
# Use: npm run android -- --device   (optional: pass a connected device id)
npx expo run:android --variant release "$@"
