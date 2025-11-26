#!/bin/bash

# install-all.sh
# Installs dependencies for EVERY package.json found in the repository
# This ensures all folders are covered, regardless of workspace configuration.

echo "📦 StackLens Recursive Dependency Installer"
echo "==========================================="

# 1. Check/Enable pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚠️  pnpm is not installed."
    echo "🔄 Enabling corepack to install pnpm..."
    corepack enable
    if ! command -v pnpm &> /dev/null; then
        echo "❌ Failed to enable pnpm via corepack."
        echo "   Please install pnpm manually: npm install -g pnpm"
        exit 1
    fi
    echo "✅ pnpm enabled."
fi

# 2. Find and Install
echo "🔍 Scanning for package.json files..."

# Find all package.json files, excluding node_modules
# We use a while loop to process each found file
find . -name "package.json" -not -path "*/node_modules/*" | sort | while read package_file; do
    dir=$(dirname "$package_file")
    
    # Skip the known empty/invalid file in infrastructure
    if [[ "$dir" == *"infrastructure/deployment/windows"* ]]; then
        echo "⚠️  Skipping known invalid package in: $dir"
        continue
    fi

    echo ""
    echo "➡️  Processing: $dir"
    echo "   Running 'pnpm install'..."
    
    # Navigate to directory, install, and return
    (cd "$dir" && pnpm install)
    
    if [ $? -eq 0 ]; then
        echo "✅ Success: $dir"
    else
        echo "❌ Failed: $dir"
        # We continue to try other packages even if one fails
    fi
done

echo ""
echo "🎉 Recursive installation complete!"
