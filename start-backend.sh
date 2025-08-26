#!/bin/bash

# 🚀 Backend Startup Script
# Starts the backend server with proper environment setup

echo "🚀 Starting Wrapper Backend Server..."

# Navigate to backend directory
cd backend

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from example..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "✅ Created .env from env.example"
    else
        echo "❌ env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server in development mode
echo "🔄 Starting backend server on port 3000..."
npm run dev
