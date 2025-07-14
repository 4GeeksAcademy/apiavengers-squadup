import React, { useEffect, useState } from 'react';
import authService from '../store/authService.js';  // For authenticated API calls

const FindGames = () => {
    const [commonGames, setCommonGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCommonGames = async () => {
            try {
                // Example: Call backend to get common games (add user_ids as needed, e.g., from group/friends)
                const response = await authService.authenticatedFetch('/api/steam/common-games', {
                    method: 'POST',
                    body: JSON.stringify({ user_ids: [1, 2] })  // Placeholder; get real IDs from store/context
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
    }, []);

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