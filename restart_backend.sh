#!/bin/bash
echo "�� Restarting backend with new rate limits..."

# Kill any existing Flask processes
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "pipenv run start" 2>/dev/null || true

# Wait a moment for processes to clean up
sleep 2

# Start the backend
echo "🚀 Starting backend..."
pipenv run start &

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Test if backend is running
if curl -s http://localhost:3001/api/status > /dev/null; then
    echo "✅ Backend is running successfully"
else
    echo "❌ Backend failed to start. Check the logs above."
fi
