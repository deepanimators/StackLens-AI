#!/bin/bash

# Script to clean up test upload directories
# This should be run after tests complete to ensure test files don't accumulate

echo "🧹 Cleaning up test upload directory..."

# Remove test-uploads directory if it exists
if [ -d "test-uploads" ]; then
    rm -rf test-uploads
    echo "✅ Removed test-uploads directory"
else
    echo "ℹ️  No test-uploads directory found"
fi

echo "✨ Cleanup complete!"
