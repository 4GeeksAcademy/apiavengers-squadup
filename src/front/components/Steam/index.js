// src/front/components/Steam/index.js
// Barrel export for all Steam components

export { default as SteamManager } from '../SteamManager';
export { default as EnhancedSteamFeatures } from './EnhancedSteamFeatures';
export { default as SteamComponents } from './SteamComponents';

// Re-export individual components for convenience
export { 
    SteamStatusIndicator, 
    SteamConnectButton,
    SteamGameCard,
    SteamLibraryGrid,
    SteamConnectionPrompt,
    SteamSyncButton,
    SteamUserProfile,
    SteamGameSearch,
    SteamStatsCard
} from './SteamComponents';