#!/usr/bin/env bash
set -euo pipefail

: "${UNITY_PATH:=unity-editor}"
: "${UNITY_PROJECT_PATH:=$(pwd)/unity-client}"
: "${KOSCHEI_OUTPUT_PATH:=/builds/webgl.zip}"

mkdir -p /builds

"$UNITY_PATH" -batchmode -nographics -quit \
  -projectPath "$UNITY_PROJECT_PATH" \
  -executeMethod KoscheiBuilder.BuildWebGL \
  -logFile /builds/unity-build-webgl.log

if [ -d "$UNITY_PROJECT_PATH/Builds/WebGL" ]; then
  (cd "$UNITY_PROJECT_PATH/Builds" && zip -r "$KOSCHEI_OUTPUT_PATH" WebGL >/dev/null)
fi

echo "WebGL build output ready at: $KOSCHEI_OUTPUT_PATH"
