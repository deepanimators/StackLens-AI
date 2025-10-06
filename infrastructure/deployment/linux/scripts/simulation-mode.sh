#!/bin/bash
# StackLens AI - Simulation Mode Controller

case "$1" in
    "enable"|"on")
        echo "🔧 Enabling StackLens AI Simulation Mode..."
        export STACKLENS_SIMULATION_MODE=true
        echo "export STACKLENS_SIMULATION_MODE=true" >> .env
        echo "✅ Simulation mode enabled. Deep learning models will use simulation instead of PyTorch."
        echo "📝 To disable: ./simulation-mode.sh disable"
        ;;
    "disable"|"off")
        echo "🔧 Disabling StackLens AI Simulation Mode..."
        export STACKLENS_SIMULATION_MODE=false
        sed -i '' '/STACKLENS_SIMULATION_MODE/d' .env 2>/dev/null || true
        echo "✅ Simulation mode disabled. Will attempt to use real PyTorch models."
        echo "📝 To enable: ./simulation-mode.sh enable"
        ;;
    "status")
        if [ "$STACKLENS_SIMULATION_MODE" = "true" ]; then
            echo "🟢 Simulation Mode: ENABLED"
        else
            echo "🔴 Simulation Mode: DISABLED"
        fi
        ;;
    *)
        echo "StackLens AI - Simulation Mode Controller"
        echo ""
        echo "Usage: $0 {enable|disable|status}"
        echo ""
        echo "Commands:"
        echo "  enable   - Enable simulation mode (no PyTorch required)"
        echo "  disable  - Disable simulation mode (use real models)"  
        echo "  status   - Check current simulation mode status"
        echo ""
        echo "Environment: STACKLENS_SIMULATION_MODE=$STACKLENS_SIMULATION_MODE"
        exit 1
        ;;
esac
