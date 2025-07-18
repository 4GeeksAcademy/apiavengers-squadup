#!/bin/bash
echo "🔥 Stress testing Steam endpoints (requires auth token)..."
echo "⚠️  Make sure you're logged in and replace YOUR_TOKEN below"

# Replace with your actual auth token
TOKEN="YOUR_TOKEN_HERE"

if [ "$TOKEN" = "YOUR_TOKEN_HERE" ]; then
    echo "❌ Please update the TOKEN variable with your actual auth token"
    echo "   You can get it from browser dev tools → Application → Local Storage"
    exit 1
fi

echo "Testing 10 rapid requests to Steam endpoints..."

for i in {1..10}; do
    echo "Request $i..."
    curl -s -H "Authorization: Bearer $TOKEN" \
         -H "Content-Type: application/json" \
         "http://localhost:3001/api/steam/owned-games" > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Request $i succeeded"
    else
        echo "  ❌ Request $i failed"
    fi
    
    sleep 0.5
done

echo "✅ Stress test completed"
