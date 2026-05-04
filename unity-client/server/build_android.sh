#!/usr/bin/env bash
set -euo pipefail

: "${UNITY_PATH:=unity-editor}"
: "${UNITY_PROJECT_PATH:=$(pwd)/unity-client}"
: "${KOSCHEI_OUTPUT_PATH:=/builds/output.aab}"

mkdir -p /builds

"$UNITY_PATH" -batchmode -nographics -quit \
  -projectPath "$UNITY_PROJECT_PATH" \
  -executeMethod KoscheiBuilder.BuildAndroid \
  -logFile /builds/unity-build.log

if [ -f "$UNITY_PROJECT_PATH/Builds/Android/game.aab" ]; then
  cp "$UNITY_PROJECT_PATH/Builds/Android/game.aab" "$KOSCHEI_OUTPUT_PATH"
fi

echo "Build output ready at: $KOSCHEI_OUTPUT_PATH"
