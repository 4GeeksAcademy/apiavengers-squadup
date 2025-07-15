import React, { useState } from 'react';
import authService from '../store/authService.js'; // Adjust if your authService is elsewhere

const SteamConnectModal = ({ isOpen, onClose, onSuccess }) => {
  const [steamId, setSteamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${authService.getApiUrl()}/api/auth/steam/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Adjust token key if different
        },
        body: JSON.stringify({ steam_id: steamId })
      });
      if (!res.ok) throw new Error('Connection failed');
      onSuccess(); // Reload user/games
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay"> {/* Style like your other modals */}
      <div className="modal-content">
        <h2>Connect Steam Manually</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="Enter your Steam ID (e.g., 76561197960287930)"
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Connecting...' : 'Connect'}</button>
          <button onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

export default SteamConnectModal;