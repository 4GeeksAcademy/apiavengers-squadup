import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import authService from '../store/authService.js';
import { actions } from '../store/actions.js';
import SteamConnectModal from '../components/SteamConnectModal.jsx';

const GameLibrary = () => {
  const { store, dispatch } = useGlobalReducer();
  const user = store.user;
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user?.is_steam_connected) {
      fetchGames();
    }
  }, [user]);

  const fetchGames = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${authService.getApiUrl()}/api/steam/library`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to load library');
      const data = await res.json();
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const res = await fetch(`${authService.getApiUrl()}/api/steam/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Sync failed');
      fetchGames(); // Refresh games after sync
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenIDConnect = async () => {
    try {
      const res = await fetch(`${authService.getApiUrl()}/api/auth/steam/login?return_to=/library`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const { steam_auth_url } = await res.json();
      window.location.href = steam_auth_url;
    } catch (err) {
      setError('Failed to start Steam connect');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Steam? This will clear your game library.')) return;
    try {
      const res = await fetch(`${authService.getApiUrl()}/api/auth/steam/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Disconnect failed');
      dispatch(actions.loadUser());
      setGames([]);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConnectSuccess = () => {
    dispatch(actions.loadUser());
    fetchGames();
  };

  if (loading) return <p>Loading library...</p>;

  return (
    <div className="game-library">
      {user?.is_steam_connected ? (
        <>
          <button onClick={handleSync} disabled={syncing}>
            {syncing ? 'Syncing...' : 'Sync Steam Library'}
          </button>
          <button onClick={handleDisconnect}>Disconnect Steam</button>
          {error && <p className="error">{error}</p>}
          <div className="games-grid">
            {games.map((game) => (
              <div key={game.app_id} className="game-card">
                <img
                  src={`http://media.steampowered.com/steamcommunity/public/images/apps/${game.app_id}/${game.header_image || 'default.jpg'}.jpg`}
                  alt={`${game.name} cover`}
                />
                <h4>{game.name}</h4>
                <p>Playtime: {game.playtime_forever} mins</p>
                {/* Add more details as needed */}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={handleOpenIDConnect}>Connect with Steam OpenID</button>
          <button onClick={() => setModalOpen(true)}>Manual Steam Connect</button>
          <SteamConnectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={handleConnectSuccess} />
        </>
      )}
    </div>
  );
};

export default GameLibrary;