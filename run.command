#!/bin/sh
set -eu
cd "$(dirname "$0")"

SVG_NODE="$(command -v node || true)"
if [ -z "$SVG_NODE" ]; then
  SVG_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$SVG_NODE" ]; then
  echo "请先安装 Node.js 22.18+，然后在项目目录运行 npm ci。"
  exit 1
fi
if [ ! -d node_modules/tsx ]; then
  echo "请先在项目目录运行 npm ci 安装依赖，然后重新启动。"
  exit 1
fi
exec "$SVG_NODE" --import tsx src/Main.ts
