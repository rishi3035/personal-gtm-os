#!/usr/bin/env bash
# Personal GTM Operating System - Unified Runner Script
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "========================================================"
echo "    Personal GTM Operating System (₹0/mo Local-First)   "
echo "    Entity: AIVI Intelligence Private Limited           "
echo "========================================================"

case "$1" in
  backend)
    echo "Starting FastAPI Backend on http://localhost:8000..."
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ;;
  frontend)
    echo "Starting Next.js Frontend on http://localhost:3000..."
    cd "$FRONTEND_DIR"
    exec npm run dev
    ;;
  all|"")
    echo "Starting Backend & Frontend concurrently..."
    trap 'kill $(jobs -p)' EXIT
    
    cd "$BACKEND_DIR"
    source .venv/bin/activate
    uvicorn app.main:app --host 127.0.0.1 --port 8000 &
    BACKEND_PID=$!
    
    cd "$FRONTEND_DIR"
    npm run dev &
    FRONTEND_PID=$!
    
    echo "Backend PID: $BACKEND_PID (http://localhost:8000)"
    echo "Frontend PID: $FRONTEND_PID (http://localhost:3000)"
    echo "Press Ctrl+C to stop both services."
    wait
    ;;
  *)
    echo "Usage: ./run.sh [backend|frontend|all]"
    exit 1
    ;;
esac
