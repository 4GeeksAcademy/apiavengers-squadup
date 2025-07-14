import React, { useEffect, useState } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';  // Import to access store
import authService from '../store/authService.js';  // For authenticated API calls

const FindGames = () => {
    const { store } = useGlobalReducer();  // Get global store
    const [commonGames, setCommonGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCommonGames = async () => {
            console.log('Fetching common games');  // Debug to trace calls
            try {
                // Use current user's ID from store; add more IDs (e.g., from friends/group) later
                const userIds = [store.user?.id || 1, 2];  // Placeholder for multiple users
                const response = await authService.authenticatedFetch('/api/steam/common-games', {
                    method: 'POST',
                    body: JSON.stringify({ user_ids: userIds })
                });
                if (!response.ok) throw new Error('Failed to fetch games');
                const data = await response.json();
                setCommonGames(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCommonGames();
    }, []);  // Empty dependency prevents re-fetches

    return (
        <div className="page-container">
            <div className="content-wrapper">
                <h1 className="text-4xl font-bold mb-8">Find Games</h1>
                {loading && <p>Loading matching games from Steam...</p>}
                {error && <p className="text-red-500">Error: {error}</p>}
                {commonGames.length > 0 ? (
                    <ul>
                        {commonGames.map(game => (
                            <li key={game.id}>{game.name} (Owned by {game.ownership_stats.owners} users)</li>
                        ))}
                    </ul>
                ) : (
                    <p>No common games found yet. Connect Steam and sync your library!</p>
                )}
            </div>
        </div>
    );
};

export default FindGames;