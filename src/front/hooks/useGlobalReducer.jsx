// src/front/hooks/useGlobalReducer.jsx

import React, { useContext, useReducer, createContext } from "react";
// REVISED: We ONLY import the reducer logic, not any old action creators.
import storeReducer, { initialStore } from "../store/store";

const StoreContext = createContext();

// This is the main component that will wrap your entire application.
export function StoreProvider({ children }) {
    // REVISED: The provider's ONLY job now is to create the 'store' and 'dispatch'
    // function. All of the conflicting useEffects and authentication logic
    // have been completely removed from this file.
    const [store, dispatch] = useReducer(storeReducer, initialStore());

    // The value provided to all child components is now simple and clean.
    const contextValue = { store, dispatch };
    
    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
}

// This is the custom hook that your components will use to access the store.
function useGlobalReducer() {
    const context = useContext(StoreContext);
    if (!context) {
        throw new Error('useGlobalReducer must be used within a StoreProvider');
    }
    // REVISED: The hook now returns the raw context. Components that use this
    // hook will destructure what they need (e.g., const { store } = useGlobalReducer();).
    return context;
}

export default useGlobalReducer;