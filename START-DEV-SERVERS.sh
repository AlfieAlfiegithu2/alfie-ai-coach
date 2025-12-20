#!/bin/bash

# Sentence Mastery + Main App Development Server Startup Script
# This script properly starts both dev servers for the pnpm monorepo

set -e

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║     Starting English AIdol + Sentence Mastery Dev Servers     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

cd "$PROJECT_ROOT"

# Kill any existing processes
echo "🧹 Cleaning up old processes..."
pkill -f "vite" || true
pkill -f "nuxt dev" || true
pkill -f "earthworm" || true
sleep 2

# Install dependencies if needed
echo "📦 Ensuring dependencies are installed..."
pnpm install --frozen-lockfile 2>&1 | tail -5

echo ""
echo "🚀 Starting development servers..."
echo ""

# Start Earthworm (Sentence Mastery) dev server
echo "▶️  Starting Sentence Mastery (Earthworm) on port 3000..."
pnpm --filter earthworm dev:client > /tmp/earthworm.log 2>&1 &
EARTHWORM_PID=$!
sleep 5

# Start main app dev server
echo "▶️  Starting Main App on port 3009..."
pnpm --filter main dev > /tmp/vite.log 2>&1 &
VITE_PID=$!
sleep 5

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              ✅ All servers are running!                       ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Main App: http://localhost:3009                              ║"
echo "║  Earthworm: http://localhost:3000                             ║"
echo "║  Proxy: http://localhost:3009/earthworm/ → localhost:3000     ║"
echo "╠════════════════════════════════════════════════════════════════╣"
echo "║  Logs:                                                         ║"
echo "║  - Earthworm: tail -f /tmp/earthworm.log                      ║"
echo "║  - Main:      tail -f /tmp/vite.log                           ║"
echo "║                                                                ║"
echo "║  To stop:     killall vite nuxt node                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Wait for both processes
wait $EARTHWORM_PID $VITE_PID
