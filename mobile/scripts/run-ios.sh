#!/usr/bin/env bash
set -euo pipefail

export LANG=en_US.UTF-8
export PATH="/usr/local/opt/ruby/bin:/usr/local/lib/ruby/gems/4.0.0/bin:/usr/local/Cellar/cocoapods/1.16.2_2/bin:$PATH"

if [ ! -d "/Applications/Xcode.app" ]; then
  echo "Xcode is required for iOS builds. Install from the Mac App Store, then run:"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

cd "$(dirname "$0")/.."
npx expo run:ios "$@"
