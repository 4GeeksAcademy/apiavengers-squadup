// src/front/components/CommonGamesList.jsx
import React, { useState, useEffect } from 'react';
import authService from '../store/authService';
import GameImage from './GameImage'; // 🔧 MISSING IMPORT - ADDED

const CommonGamesList = ({ groupId }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCommonGames = async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL;
                const response = await authService.authenticatedFetch(`${backendUrl}/api/gaming/groups/${groupId}/common-games`);
                if (response.ok) {
                    const data = await response.json();
                    setGames(data.games);
                }
            } catch (error) {
                console.error("Error fetching common games:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCommonGames();
    }, [groupId]);

    if (loading) return <p className="text-white/70">Finding common games...</p>;

    return (
        <div className="space-y-3">
            <h3 className="text-xl font-semibold text-white">Games Your Squad Owns</h3>
            {games.length > 0 ? (
                games.map(game => (
                    <div key={game.id} className="flex items-center p-3 bg-white/5 rounded-lg">
                        <GameImage 
                            src={game.header_image} 
                            alt={game.name}
                            fallbackText={game.name}
                            className="w-24 h-12 object-cover rounded-md mr-4"
                        />
                        <div className="flex-grow">
                            <p className="font-bold text-white">{game.name}</p>
                            <p className="text-sm text-green-300">{game.ownership_stats.coverage_percentage.toFixed(0)}% ownership</p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-white/70">No common multiplayer games found.</p>
            )}
        </div>
    );
};

export default CommonGamesList;