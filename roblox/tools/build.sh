#!/usr/bin/env bash
# Bangun place lobi dan Pasar Ejaan. Butuh `rokit install` di folder roblox/.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${HOME}/.rokit/bin:${PATH}"
mkdir -p build
rojo build default.project.json -o build/KotaAksara-Lobby.rbxl
rojo build places/pasar-ejaan.project.json -o build/KotaAksara-PasarEjaan.rbxl
echo "build/KotaAksara-Lobby.rbxl"
echo "build/KotaAksara-PasarEjaan.rbxl"
