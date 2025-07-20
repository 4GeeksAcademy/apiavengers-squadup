// src/front/components/LazyComponents.jsx - Lazy Loading Exports for Large Components

import React, { Suspense } from 'react';

/**
 * Component-specific loading fallbacks
 * Optimized for each component's typical loading time and purpose
 */

// Voting-specific loading fallback
const VotingLoadingFallback = () => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 border-2 border-coral-500/30 border-t-coral-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold text-white mb-2">Loading Voting System</h3>
        <p className="text-white/60 text-sm">Setting up live voting interface...</p>
        <div className="mt-4 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-coral-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
    </div>
);

// Members management loading fallback
const MembersLoadingFallback = () => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold text-white mb-2">Loading Members</h3>
        <p className="text-white/60 text-sm">Fetching squad member data...</p>
    </div>
);

// Quick vote loading fallback
const QuickVoteLoadingFallback = () => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold text-white mb-2">Loading Quick Vote</h3>
        <p className="text-white/60 text-sm">Preparing voting session...</p>
    </div>
);

// Live voting session loading fallback  
const LiveVotingLoadingFallback = () => (
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="text-xl font-bold text-white mb-2">Loading Live Voting</h3>
        <p className="text-white/60 text-sm">Connecting to live voting session...</p>
        <div className="mt-4 text-red-400 text-sm flex items-center justify-center">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2"></div>
            Setting up real-time updates...
        </div>
    </div>
);

/**
 * Higher-order component for lazy loading with enhanced error handling
 */
const createLazyComponent = (importFn, fallbackComponent, componentName) => {
    const LazyComponent = React.lazy(importFn);
    
    const LazyWrapper = React.forwardRef((props, ref) => {
        const [hasError, setHasError] = React.useState(false);

        const handleError = () => {
            setHasError(true);
            console.error(`Failed to load ${componentName}`);
        };

        if (hasError) {
            return (
                <div className="backdrop-blur-xl bg-white/10 border border-red-500/30 rounded-2xl p-6 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <h3 className="text-white font-bold mb-2">Failed to Load {componentName}</h3>
                    <p className="text-white/70 text-sm mb-4">
                        There was an error loading this component.
                    </p>
                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={() => setHasError(false)}
                            className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white font-medium rounded-lg text-sm transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg text-sm transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <Suspense fallback={fallbackComponent}>
                <LazyComponent ref={ref} {...props} onError={handleError} />
            </Suspense>
        );
    });

    LazyWrapper.displayName = `Lazy(${componentName})`;
    return LazyWrapper;
};

/**
 * Lazy-loaded large components
 * These components are loaded on-demand to improve initial bundle size
 */

// LiveVotingSession - Large component with real-time features (~1000+ lines)
export const LazyLiveVotingSession = createLazyComponent(
    () => import('./LiveVotingSession.jsx'),
    <LiveVotingLoadingFallback />,
    'LiveVotingSession'
);

// QuickVote - Large component with complex voting logic (~1000+ lines) 
export const LazyQuickVote = createLazyComponent(
    () => import('./QuickVote.jsx'),
    <QuickVoteLoadingFallback />,
    'QuickVote'
);

// GroupMembersTab - Large component with member management (~800+ lines)
export const LazyGroupMembersTab = createLazyComponent(
    () => import('./GroupMembersTab.jsx'),
    <MembersLoadingFallback />,
    'GroupMembersTab'
);

// SteamManager - Steam integration component 
export const LazySteamManager = createLazyComponent(
    () => import('./SteamManager.jsx'),
    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 text-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-white/70 text-sm">Loading Steam integration...</p>
    </div>,
    'SteamManager'
);

// CreateGroupModal - Modal component
export const LazyCreateGroupModal = createLazyComponent(
    () => import('./CreateGroupModal.jsx'),
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-white/70 text-sm">Loading group creation...</p>
        </div>
    </div>,
    'CreateGroupModal'
);

/**
 * Preload critical components
 * These components are likely to be needed soon, so we preload them
 */
export const preloadCriticalComponents = () => {
    // Preload components that are likely to be used immediately
    const criticalComponents = [
        () => import('./QuickVote.jsx'),
        () => import('./GroupMembersTab.jsx'),
    ];

    criticalComponents.forEach(importFn => {
        // Start loading but don't wait for completion
        importFn().catch(err => {
            console.warn('Failed to preload component:', err);
        });
    });
};

/**
 * Preload components based on user interaction
 * Call this when user shows intent to use a feature
 */
export const preloadOnIntent = {
    voting: () => {
        import('./LiveVotingSession.jsx').catch(console.warn);
        import('./QuickVote.jsx').catch(console.warn);
    },
    
    members: () => {
        import('./GroupMembersTab.jsx').catch(console.warn);
    },
    
    steam: () => {
        import('./SteamManager.jsx').catch(console.warn);
        import('./.jsx').catch(console.warn);
    },
    
    modals: () => {
        import('./CreateGroupModal.jsx').catch(console.warn);
    }
};

/**
 * Component size tracking for optimization
 * Use this to identify components that should be lazy-loaded
 */
export const COMPONENT_SIZES = {
    LiveVotingSession: 'Large (~1200 lines)', 
    QuickVote: 'Large (~1000 lines)',
    GroupMembersTab: 'Large (~800 lines)',
    SteamManager: 'Medium (~400 lines)',
    CreateGroupModal: 'Medium (~300 lines)',
};

/**
 * Lazy loading statistics
 * Track loading performance for optimization
 */
let lazyLoadStats = {
    componentsLoaded: 0,
    totalLoadTime: 0,
    failures: 0
};

export const getLazyLoadStats = () => ({ ...lazyLoadStats });

export const recordLazyLoadEvent = (componentName, loadTime, success = true) => {
    if (success) {
        lazyLoadStats.componentsLoaded++;
        lazyLoadStats.totalLoadTime += loadTime;
    } else {
        lazyLoadStats.failures++;
    }
    
    console.log(`Lazy Load: ${componentName} ${success ? 'loaded' : 'failed'} in ${loadTime}ms`);
};

// Auto-preload critical components when this module loads
if (typeof window !== 'undefined') {
    // Delay preloading to not interfere with initial page load
    setTimeout(preloadCriticalComponents, 2000);
}