#!/bin/bash

# setup-native-infra.sh
# Installs necessary dependencies for running StackLens locally on macOS using Homebrew.

set -e

echo "🚀 Setting up native infrastructure for StackLens..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install it first: https://brew.sh/"
    exit 1
fi

echo "📦 Updating Homebrew..."
brew update

# Function to install if not present
install_if_missing() {
    if ! brew list $1 &> /dev/null; then
        echo "⬇️  Installing $1..."
        brew install $1
    else
        echo "✅ $1 is already installed."
    fi
}

# Install Dependencies
echo "📦 Installing services..."
install_if_missing postgresql@15
install_if_missing kafka
install_if_missing zookeeper
install_if_missing python@3.11
install_if_missing redis

# Link Postgres if needed (force link to put it in path)
brew link --force postgresql@15

# Initialize Postgres Data Directory (if not exists)
# Default brew location: /usr/local/var/postgres or /opt/homebrew/var/postgres
PG_DATA_DIR="$(brew --prefix)/var/postgres"
if [ ! -d "$PG_DATA_DIR" ]; then
    echo "⚙️  Initializing Postgres database..."
    initdb "$PG_DATA_DIR" -E utf8
else
    echo "✅ Postgres data directory exists."
fi

# Start Services to create DB/User
echo "🚀 Starting Postgres to configure user/db..."
brew services start postgresql@15
sleep 5

# Create User and DB
if ! psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='stacklens'" | grep -q 1; then
    echo "👤 Creating 'stacklens' user..."
    createuser -s stacklens
else
    echo "✅ User 'stacklens' already exists."
fi

if ! psql -lqt | cut -d \| -f 1 | grep -qw stacklens; then
    echo "🗄️  Creating 'stacklens' database..."
    createdb stacklens
else
    echo "✅ Database 'stacklens' already exists."
fi

# Set password for stacklens user
psql postgres -c "ALTER USER stacklens WITH PASSWORD 'password';"

echo "✅ Infrastructure setup complete!"
echo "👉 You can now run './start-native.sh' to start the stack."
