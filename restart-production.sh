#!/bin/bash

# StackLens AI - Restart Production Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🔄 Restarting StackLens AI Production"
echo ""

# Stop application
echo "Stopping application..."
"$SCRIPT_DIR/stop-production.sh"

# Wait a moment
sleep 2

# Start application (skip infra and build by default)
echo ""
echo "Starting application..."
"$SCRIPT_DIR/deploy-production.sh" --skip-infra --skip-build

exit 0
