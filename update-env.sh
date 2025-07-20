#!/bin/bash
# update-env.sh - Updates .env file with current Codespace URLs

if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
    echo "🔄 Updating .env with current Codespace URLs..."
    
    # Create the dynamic URLs
    BACKEND_URL="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
    STEAM_CALLBACK="https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}/api/auth/steam/callback"
    
    # Backup .env file (optional safety measure)
    cp .env .env.backup 2>/dev/null || true
    
    # Update .env file using sed
    sed -i "s|^STEAM_CALLBACK_URL=.*|STEAM_CALLBACK_URL=${STEAM_CALLBACK}|" .env
    sed -i "s|^APP_BASE_URL=.*|APP_BASE_URL=${BACKEND_URL}|" .env
    sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${FRONTEND_URL}|" .env
    sed -i "s|^VITE_BACKEND_URL=.*|VITE_BACKEND_URL=${BACKEND_URL}|" .env
    sed -i "s|^CODESPACE_NAME=.*|CODESPACE_NAME=${CODESPACE_NAME}|" .env
    sed -i "s|^GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=.*|GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}|" .env
    sed -i "s|^VITE_CODESPACE_NAME=.*|VITE_CODESPACE_NAME=${CODESPACE_NAME}|" .env
    sed -i "s|^VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=.*|VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN=${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}|" .env
    
    # Verify the updates worked
    if grep -q "$BACKEND_URL" .env; then
        echo "✅ Updated URLs:"
        echo "   Backend: ${BACKEND_URL}"
        echo "   Frontend: ${FRONTEND_URL}"
        echo "   Steam Callback: ${STEAM_CALLBACK}"
        echo "   💾 Backup saved as .env.backup"
    else
        echo "❌ Failed to update .env file"
        exit 1
    fi
else
    echo "⚠️  Not in Codespaces environment - keeping existing URLs"
    echo "   Current CODESPACE_NAME: ${CODESPACE_NAME:-'not set'}"
    echo "   Current GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN: ${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-'not set'}"
fi