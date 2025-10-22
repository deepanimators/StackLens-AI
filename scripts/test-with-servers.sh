#!/bin/bash

# Test Setup Script - Starts both frontend and backend servers for testing

echo "🚀 Starting StackLens AI Test Environment..."

# Kill any existing processes on ports 5173 and 4000
echo "📋 Cleaning up existing processes..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Start backend server
echo "🔧 Starting backend server on port 4000..."
NODE_ENV=development node --import tsx --no-warnings apps/api/src/index.ts > server-test.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend server..."
for i in {1..30}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo "✅ Backend server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Backend server failed to start"
        kill $BACKEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# Start frontend server
echo "🎨 Starting frontend server on port 5173..."
npm run dev:client > client-test.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend server..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Frontend server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Frontend server failed to start"
        kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

echo "🎉 Test environment is ready!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Save PIDs for cleanup
echo "$BACKEND_PID $FRONTEND_PID" > .test-pids

# Run tests
echo "🧪 Running Playwright tests..."
npx playwright test "$@"
TEST_EXIT_CODE=$?

# Cleanup
echo "🧹 Cleaning up test environment..."
if [ -f .test-pids ]; then
    read BACKEND_PID FRONTEND_PID < .test-pids
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    rm .test-pids
fi

exit $TEST_EXIT_CODE
