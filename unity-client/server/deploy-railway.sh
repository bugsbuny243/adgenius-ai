#!/usr/bin/env bash
set -euo pipefail

: "${RAILWAY_TOKEN:?RAILWAY_TOKEN is required}"
: "${RAILWAY_PROJECT_ID:?RAILWAY_PROJECT_ID is required}"

SERVICE_NAME="${SERVICE_NAME:-unity-dedicated-server}"
BUILD_DIR="${BUILD_DIR:-../Builds/LinuxDedicatedServer}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNITY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ ! -d "${UNITY_ROOT}/Builds/LinuxDedicatedServer" ]; then
  echo "[ERROR] Build folder not found at ${UNITY_ROOT}/Builds/LinuxDedicatedServer"
  echo "Run Unity build first: LinuxDedicatedServerBuilder.BuildFromCli"
  exit 1
fi

pushd "${UNITY_ROOT}" >/dev/null

echo "[1/4] Railway login token set"
railway login --token "${RAILWAY_TOKEN}" >/dev/null

echo "[2/4] Linking project"
railway link --project "${RAILWAY_PROJECT_ID}" >/dev/null

if railway service --json | jq -e ".[] | select(.name == \"${SERVICE_NAME}\")" >/dev/null 2>&1; then
  echo "[3/4] Service exists: ${SERVICE_NAME}"
  railway service "${SERVICE_NAME}" >/dev/null
else
  echo "[3/4] Creating service: ${SERVICE_NAME}"
  railway add --service "${SERVICE_NAME}" >/dev/null
  railway service "${SERVICE_NAME}" >/dev/null
fi

echo "[4/4] Deploying dockerized dedicated server"
railway up --detach

echo "Deployment started for ${SERVICE_NAME}."
popd >/dev/null
