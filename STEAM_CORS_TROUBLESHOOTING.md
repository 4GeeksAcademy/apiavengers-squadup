# Steam CORS Troubleshooting Guide

## Problem
CORS (Cross-Origin Resource Sharing) errors when accessing Steam APIs from the frontend.

## Root Cause
- Frontend trying to access Steam APIs directly
- Steam APIs don't allow cross-origin requests
- Need backend proxy for all Steam API calls

## Solution Applied

### 1. Backend Proxy Endpoints ✅
- Created `src/api/steam_status.py` for comprehensive Steam status
- All Steam API calls now go through backend
- Proper error handling and rate limiting

### 2. Frontend Service Update ✅
- Updated `steamService.js` to use backend proxy
- Removed direct Steam API calls
- Added proper error handling for network issues

### 3. CORS-Aware Components ✅
- Created `SteamManagerCORS.jsx` with proper error handling
- Handles network errors gracefully
- Provides user feedback for connection issues

## Testing the Fix

1. **Check Backend Endpoints**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/steam/status
   ```

2. **Check Frontend Integration**:
   - Open browser console
   - Look for Steam-related requests
   - Should see calls to `/api/steam/*` instead of `steamcommunity.com`

3. **Test Steam Connection**:
   - Go to Profile page
   - Try connecting Steam account
   - Should redirect to Steam without CORS errors

## Manual Steps Required

1. **Update app.py**:
   ```python
   from api.steam_status import steam_status
   app.register_blueprint(steam_status, url_prefix='/api/steam')
   ```

2. **Replace SteamManager imports**:
   ```javascript
   // Replace this:
   import SteamManager from '../components/SteamManager';
   
   // With this:
   import SteamManager from '../components/SteamManagerCORS';
   ```

3. **Environment Variables**:
   ```bash
   VITE_BACKEND_URL=http://localhost:5000
   STEAM_API_KEY=your_steam_api_key
   ```

## Common Issues

### Still seeing CORS errors?
- Check that all Steam requests go through `/api/steam/*`
- Verify backend endpoints are registered
- Check network tab for direct Steam API calls

### Steam connection fails?
- Verify `STEAM_API_KEY` is set
- Check Steam service initialization
- Ensure user is authenticated

### Sync not working?
- Check rate limiting (5-minute cooldown)
- Verify Steam profile is public
- Check backend logs for API errors

## Verification Commands

```bash
# Check if new endpoints exist
ls -la src/api/steam_status.py
ls -la src/front/services/steamServiceProxy.js
ls -la src/front/components/SteamManagerCORS.jsx

# Check for old direct Steam API calls (should return nothing)
grep -r "steamcommunity.com" src/front/

# Check for proper backend proxy usage
grep -r "/api/steam/" src/front/
```

## Success Indicators

✅ No CORS errors in browser console
✅ Steam status loads properly
✅ Steam connection works without errors
✅ Library sync functions correctly
✅ Common games feature works in groups

## Need Help?

1. Check browser console for specific errors
2. Check backend logs: `tail -f logs/app.log`
3. Verify environment variables are set
4. Test individual API endpoints with curl
