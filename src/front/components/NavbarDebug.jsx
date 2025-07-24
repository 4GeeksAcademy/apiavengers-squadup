// src/front/components/NavbarDebug.jsx - Debug component for navbar issues

import React from 'react';
import { useLocation } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService';

const NavbarDebug = () => {
    const { store } = useGlobalReducer();
    const location = useLocation();
    
    // Only show in development
    if (import.meta.env.PROD) return null;
    
    const debugInfo = {
        // Current route
        currentPath: location.pathname,
        
        // Auth states
        storeAuth: store?.isAuthenticated,
        storeUser: store?.user?.username,
        storeLoading: store?.authLoading,
        
        // Service states
        serviceAuth: authService.isAuthenticated(),
        serviceUser: authService.getCurrentUser()?.username,
        
        // Tokens
        hasToken: !!authService.getAccessToken(),
        hasRefreshToken: !!authService.getRefreshToken(),
        tokenInStorage: !!localStorage.getItem('token'),
        
        // Steam
        steamConnected: store?.user?.steam_connected || store?.user?.is_steam_connected,
        
        // Protected routes available
        shouldShowProtectedLinks: store?.isAuthenticated && store?.user
    };
    
    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '11px',
            fontFamily: 'monospace',
            zIndex: 10000,
            border: '1px solid #333',
            maxWidth: '300px'
        }}>
            <div style={{ fontWeight: 'bold', color: '#00ff00', marginBottom: '8px' }}>
                🐛 Navbar Debug Panel
            </div>
            
            <div style={{ marginBottom: '6px' }}>
                <strong>Current Route:</strong> {debugInfo.currentPath}
            </div>
            
            <div style={{ marginBottom: '6px' }}>
                <strong>Auth Status:</strong>
                <div style={{ marginLeft: '10px' }}>
                    Store Auth: {debugInfo.storeAuth ? '✅' : '❌'}<br/>
                    Service Auth: {debugInfo.serviceAuth ? '✅' : '❌'}<br/>
                    User: {debugInfo.storeUser || 'None'}<br/>
                    Loading: {debugInfo.storeLoading ? '⏳' : '✅'}
                </div>
            </div>
            
            <div style={{ marginBottom: '6px' }}>
                <strong>Tokens:</strong>
                <div style={{ marginLeft: '10px' }}>
                    Access: {debugInfo.hasToken ? '✅' : '❌'}<br/>
                    Refresh: {debugInfo.hasRefreshToken ? '✅' : '❌'}<br/>
                    Storage: {debugInfo.tokenInStorage ? '✅' : '❌'}
                </div>
            </div>
            
            <div style={{ marginBottom: '6px' }}>
                <strong>Features:</strong>
                <div style={{ marginLeft: '10px' }}>
                    Steam: {debugInfo.steamConnected ? '✅' : '❌'}<br/>
                    Show Protected: {debugInfo.shouldShowProtectedLinks ? '✅' : '❌'}
                </div>
            </div>
            
            <div style={{ marginTop: '8px', padding: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                <strong>Expected Navbar Links:</strong>
                <div style={{ marginLeft: '10px', fontSize: '10px' }}>
                    {debugInfo.shouldShowProtectedLinks ? (
                        <>
                            ✅ Dashboard<br/>
                            ✅ Game Library<br/>
                            ✅ Find Games<br/>
                            ✅ Friends<br/>
                            ✅ Profile<br/>
                            ✅ Logout
                        </>
                    ) : (
                        <>
                            ✅ Explore<br/>
                            ✅ Login<br/>
                            ✅ Sign Up
                        </>
                    )}
                </div>
            </div>
            
            <button
                onClick={() => window.location.reload()}
                style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: '#007acc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer'
                }}
            >
                Reload Page
            </button>
            
            <button
                onClick={() => {
                    console.log('🐛 Debug Info:', debugInfo);
                    console.log('🐛 Full Store:', store);
                    console.log('🐛 AuthService State:', {
                        isAuth: authService.isAuthenticated(),
                        user: authService.getCurrentUser(),
                        token: authService.getAccessToken()
                    });
                }}
                style={{
                    marginTop: '4px',
                    marginLeft: '4px',
                    padding: '4px 8px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10px',
                    cursor: 'pointer'
                }}
            >
                Log Debug
            </button>
        </div>
    );
};

export default NavbarDebug;