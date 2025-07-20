// src/front/components/QuickVote.jsx - Quick voting interface

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameImage from './GameImage';
import { GamingButton } from './GamingAnimations';
import LoadingState from './LoadingState';
import toast from 'react-hot-toast';

const QuickVote = ({ 
    session,
    games = [],
    onVoteSubmit,
    userVotes = [],
    isLoading = false,
    maxChoices = 3,
    className = ""
}) => {
    const [selectedGames, setSelectedGames] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name');

    // Initialize with existing votes
    useEffect(() => {
        if (userVotes && userVotes.length > 0) {
            const votedGames = userVotes.map(vote => ({
                game_id: vote.game_id,
                priority: vote.priority,
                game: vote.game
            })).sort((a, b) => b.priority - a.priority);
            
            setSelectedGames(votedGames);
        }
    }, [userVotes]);

    // Filter and sort games
    const filteredGames = games
        .filter(game => 
            game.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'multiplayer':
                    return (b.multiplayer || b.co_op ? 1 : 0) - (a.multiplayer || a.co_op ? 1 : 0);
                default:
                    return 0;
            }
        });

    const handleGameSelect = (game) => {
        if (isSubmitting) return;

        const isSelected = selectedGames.find(sg => sg.game_id === game.id);
        
        if (isSelected) {
            // Remove game
            setSelectedGames(prev => prev.filter(sg => sg.game_id !== game.id));
        } else {
            // Add game if under limit
            if (selectedGames.length < maxChoices) {
                const newGame = {
                    game_id: game.id,
                    priority: maxChoices - selectedGames.length, // Higher number = higher priority
                    game: game
                };
                setSelectedGames(prev => [...prev, newGame]);
            } else {
                toast.error(`You can only select up to ${maxChoices} games`);
            }
        }
    };

    const handlePriorityChange = (gameId, newPriority) => {
        if (isSubmitting) return;

        setSelectedGames(prev => 
            prev.map(sg => 
                sg.game_id === gameId 
                    ? { ...sg, priority: newPriority }
                    : sg
            )
        );
    };

    const handleSubmitVotes = async () => {
        if (selectedGames.length === 0) {
            toast.error('Please select at least one game');
            return;
        }

        setIsSubmitting(true);

        try {
            // Format votes for submission
            const gameVotes = selectedGames.map(sg => ({
                game_id: sg.game_id,
                priority: sg.priority
            }));

            await onVoteSubmit(gameVotes);
            toast.success('Votes submitted successfully!');
        } catch (error) {
            console.error('Vote submission failed:', error);
            toast.error(error.message || 'Failed to submit votes');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearVotes = () => {
        if (isSubmitting) return;
        setSelectedGames([]);
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 3: return '1st Choice';
            case 2: return '2nd Choice';
            case 1: return '3rd Choice';
            default: return `${4 - priority} Choice`;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 3: return 'text-yellow-400 border-yellow-400 bg-yellow-400/20';
            case 2: return 'text-orange-400 border-orange-400 bg-orange-400/20';
            case 1: return 'text-blue-400 border-blue-400 bg-blue-400/20';
            default: return 'text-gray-400 border-gray-400 bg-gray-400/20';
        }
    };

    if (isLoading) {
        return (
            <div className={`${className}`}>
                <LoadingState message="Loading voting session..." />
            </div>
        );
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Header */}
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                    {session?.session_name || 'Quick Vote'}
                </h2>
                <p className="text-white/70">
                    Select up to {maxChoices} games in order of preference
                </p>
            </div>

            {/* Selected Games Display */}
            {selectedGames.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-4"
                >
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                        <span className="mr-2">🗳️</span>
                        Your Votes ({selectedGames.length}/{maxChoices})
                    </h3>
                    
                    <div className="space-y-2">
                        {selectedGames
                            .sort((a, b) => b.priority - a.priority)
                            .map((selectedGame, index) => (
                                <motion.div
                                    key={selectedGame.game_id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={`
                                        flex items-center space-x-3 p-3 rounded-lg border
                                        ${getPriorityColor(selectedGame.priority)}
                                    `}
                                >
                                    <div className="flex-shrink-0">
                                        <GameImage 
                                            game={selectedGame.game}
                                            size="sm"
                                            className="w-12 h-12 rounded"
                                        />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-white truncate">
                                            {selectedGame.game?.name || `Game ${selectedGame.game_id}`}
                                        </h4>
                                        <p className={`text-sm ${getPriorityColor(selectedGame.priority).split(' ')[0]}`}>
                                            {getPriorityLabel(selectedGame.priority)}
                                        </p>
                                    </div>

                                    {/* Priority Controls */}
                                    <div className="flex items-center space-x-1">
                                        {[3, 2, 1].map(priority => (
                                            <button
                                                key={priority}
                                                onClick={() => handlePriorityChange(selectedGame.game_id, priority)}
                                                disabled={isSubmitting}
                                                className={`
                                                    w-8 h-8 rounded-full text-xs font-medium transition-all
                                                    ${selectedGame.priority === priority
                                                        ? getPriorityColor(priority)
                                                        : 'text-white/50 border border-white/20 hover:border-white/40'
                                                    }
                                                    disabled:opacity-50 disabled:cursor-not-allowed
                                                `}
                                            >
                                                {4 - priority}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleGameSelect(selectedGame.game)}
                                        disabled={isSubmitting}
                                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                        title="Remove vote"
                                    >
                                        ✕
                                    </button>
                                </motion.div>
                            ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 mt-4">
                        <GamingButton
                            onClick={handleSubmitVotes}
                            disabled={isSubmitting || selectedGames.length === 0}
                            variant="primary"
                            className="flex-1"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Submitting...
                                </>
                            ) : (
                                `Submit ${selectedGames.length} Vote${selectedGames.length !== 1 ? 's' : ''}`
                            )}
                        </GamingButton>

                        <button
                            onClick={handleClearVotes}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-xl transition-colors disabled:opacity-50"
                        >
                            Clear
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search games..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-coral-500/50"
                    />
                </div>
                
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-coral-500/50"
                >
                    <option value="name">Sort by Name</option>
                    <option value="multiplayer">Multiplayer First</option>
                </select>
            </div>

            {/* Games Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredGames.map((game) => {
                        const isSelected = selectedGames.find(sg => sg.game_id === game.id);
                        const selectedGame = selectedGames.find(sg => sg.game_id === game.id);
                        
                        return (
                            <motion.div
                                key={game.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`
                                    relative bg-white/5 hover:bg-white/10 border rounded-xl p-4 cursor-pointer transition-all
                                    ${isSelected 
                                        ? `border-coral-500/50 bg-coral-500/10 ${getPriorityColor(selectedGame.priority)}` 
                                        : 'border-white/20 hover:border-white/40'
                                    }
                                    ${isSubmitting ? 'pointer-events-none opacity-50' : ''}
                                `}
                                onClick={() => handleGameSelect(game)}
                            >
                                {/* Selection Indicator */}
                                {isSelected && (
                                    <div className={`
                                        absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                        ${getPriorityColor(selectedGame.priority)}
                                    `}>
                                        {4 - selectedGame.priority}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <GameImage 
                                        game={game}
                                        className="w-full h-24 object-cover rounded-lg"
                                    />
                                    
                                    <div>
                                        <h4 className="font-medium text-white truncate">
                                            {game.name}
                                        </h4>
                                        
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex space-x-1">
                                                {game.multiplayer && (
                                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                                        Multiplayer
                                                    </span>
                                                )}
                                                {game.co_op && (
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                                        Co-op
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredGames.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                        {searchTerm ? 'No games found' : 'No games available'}
                    </h3>
                    <p className="text-white/70">
                        {searchTerm 
                            ? `No games match "${searchTerm}"`
                            : 'No games are available for voting'
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default QuickVote;