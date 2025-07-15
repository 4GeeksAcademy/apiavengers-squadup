import React, { useState } from 'react';
// 1. ADD THE TOAST IMPORT
import toast from 'react-hot-toast';

const GroupInviteLink = ({ group }) => {
    const [copied, setCopied] = useState(false);
    
    const frontendUrl = window.location.origin;
    const shareLink = `${frontendUrl}/join/${group.invite_code}`;
    
    // 2. ENHANCE THIS FUNCTION WITH TOASTS
    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            // Provide a success message to the user
            toast.success('Invite link copied to clipboard!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy link:", err);
            // Provide an error message if copying fails
            toast.error("Could not copy the link.");
        }
    };
    
    const shareViaWhatsApp = () => {
        const text = `Join my SquadUp group "${group.name}"! Let's find games to play together: ${shareLink}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };
    
    // 3. SIMPLIFY THIS FUNCTION
    const shareViaDiscord = () => {
        // This function now just calls copyToClipboard.
        // The toast notification from that function provides all the necessary feedback.
        // The redundant alert() is no longer needed.
        copyToClipboard();
    };
    
    // --- The rest of your JSX remains completely unchanged ---
    return (
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center">
                <span className="text-xl mr-2">🔗</span>
                Invite Friends
            </h3>
            
            <div className="space-y-4">
                {/* Copy Link Section */}
                <div>
                    <label className="text-white/70 text-sm mb-2 block">Share Link</label>
                    <div className="flex items-center space-x-2">
                        <input 
                            type="text" 
                            value={shareLink} 
                            readOnly 
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm font-mono"
                            onClick={(e) => e.target.select()}
                        />
                        <button 
                            onClick={copyToClipboard}
                            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                                copied 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-coral-500 hover:bg-coral-600 text-white'
                            }`}
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                
                {/* Invite Code Section */}
                <div>
                    <label className="text-white/70 text-sm mb-2 block">Invite Code</label>
                    <div className="flex items-center justify-between bg-white/5 border border-white/20 rounded-lg px-4 py-3">
                        <span className="text-white font-mono text-lg tracking-wider">
                            {group.invite_code}
                        </span>
                        <span className="text-white/50 text-sm">
                            {group.max_members - group.current_members} spots left
                        </span>
                    </div>
                </div>
                
                {/* Quick Share Buttons */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={shareViaWhatsApp}
                        className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-600/30 text-green-300 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                        <span>📱</span>
                        <span>WhatsApp</span>
                    </button>
                    <button
                        onClick={shareViaDiscord}
                        className="flex-1 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-600/30 text-indigo-300 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                        <span>💬</span>
                        <span>Discord</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupInviteLink;