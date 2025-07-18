import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client'; // Install with npm i socket.io-client if not already
import { AuthContext } from '../store/context'; // Adjust path to your auth context (assuming you have one for token/user)

// Backend URL for socket connection (adjust if needed, e.g., process.env.REACT_APP_BACKEND_URL)
const SOCKET_URL = 'http://localhost:5000'; // Or your deployed URL

const GroupPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext); // Assuming AuthContext provides token and user info (e.g., user.id)

  const [games, setGames] = useState([]);
  const [status, setStatus] = useState([]); // [{user_id, user_email, is_online, has_voted}]
  const [sessionId, setSessionId] = useState(null);
  const [myVote, setMyVote] = useState(null);
  const [error, setError] = useState(null);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [socket, setSocket] = useState(null);

  // Fetch common games
  const fetchGames = async () => {
    setLoadingGames(true);
    try {
      const res = await fetch(`/api/group/${groupId}/games`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch games');
      const data = await res.json();
      setGames(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGames(false);
    }
  };

  // Fetch or create session
  const initSession = async () => {
    try {
      const res = await fetch(`/api/group/${groupId}/session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      setSessionId(data.session_id);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch initial status
  const fetchStatus = async () => {
    if (!sessionId) return;
    setLoadingStatus(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    fetchGames();
    initSession();

    const newSocket = io(SOCKET_URL, {
      auth: { token }, // Pass token for auth if your backend requires it
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to socket');
      newSocket.emit('join_group', { group_id: groupId, user_id: user.id });
    });

    newSocket.on('status_update', (data) => {
      setStatus((prev) =>
        prev.map((s) =>
          s.user_id === data.user_id ? { ...s, is_online: data.is_online, has_voted: data.has_voted } : s
        )
      );
    });

    newSocket.on('vote_update', (data) => {
      setStatus((prev) =>
        prev.map((s) => (s.user_id === data.user_id ? { ...s, has_voted: true } : s))
      );
    });

    // Cleanup on unmount
    return () => {
      newSocket.emit('leave_group', { group_id: groupId, user_id: user.id });
      newSocket.disconnect();
    };
  }, [groupId, token, user.id]);

  // Fetch status once session is ready (initial load + after socket setup)
  useEffect(() => {
    if (sessionId) {
      fetchStatus();
    }
  }, [sessionId]);

  const handleVote = async (gameId) => {
    if (!sessionId || myVote !== null) return;
    try {
      const res = await fetch(`/api/session/${sessionId}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_id: gameId }),
      });
      if (!res.ok) throw new Error('Failed to vote');
      setMyVote(gameId);
      // Emit socket event for live update
      if (socket) {
        socket.emit('vote', { session_id: sessionId, user_id: user.id });
      }
      fetchStatus(); // Fallback refresh
    } catch (err) {
      setError(err.message);
    }
  };

  // Check if all voted
  const allVoted = status.length > 0 && status.every((s) => s.has_voted);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8">
      {error && <div className="text-red-500 mb-4 p-4 bg-red-900/50 rounded-xl">{error}</div>}
      
      <h2 className="text-3xl font-bold text-white mb-8">Group Voting</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Games List */}
        <div>
          <h3 className="text-2xl text-white mb-4">Common Games</h3>
          {loadingGames ? (
            <p className="text-white/70">Loading games...</p>
          ) : games.length === 0 ? (
            <p className="text-white/70">No common games found. Ensure all members have synced their Steam libraries and joined the group.</p>
          ) : (
            <ul className="space-y-4">
              {games.map((game) => (
                <li
                  key={game.id}
                  className={`p-4 rounded-xl border-4 ${
                    game.color === 'green'
                      ? 'border-green-500'
                      : game.color === 'yellow'
                      ? 'border-yellow-500'
                      : 'border-red-500'
                  } bg-slate-800`}
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={game.img_url || 'placeholder-image-url.jpg'} // Fallback if img_url missing
                      alt={game.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{game.name}</h4>
                      <p className="text-white/70 text-sm">Shared by {game.count} members</p>
                    </div>
                    <button
                      onClick={() => handleVote(game.id)}
                      disabled={myVote !== null}
                      className="px-4 py-2 bg-coral-500 hover:bg-coral-600 text-white rounded-xl disabled:opacity-50"
                    >
                      Vote
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Group Status */}
        <div>
          <h3 className="text-2xl text-white mb-4">Group Members</h3>
          {loadingStatus ? (
            <p className="text-white/70">Loading member status...</p>
          ) : status.length === 0 ? (
            <p className="text-white/70">No members found. Invite friends to join!</p>
          ) : (
            <ul className="space-y-4">
              {status.map((s) => (
                <li
                  key={s.user_id}
                  className="p-4 bg-slate-800 rounded-xl flex justify-between items-center"
                >
                  <span className="text-white">{s.user_email}</span>
                  <div className="flex gap-4">
                    <span className={`text-sm ${s.is_online ? 'text-green-500' : 'text-red-500'}`}>
                      {s.is_online ? 'Online' : 'Offline'}
                    </span>
                    <span className={`text-sm ${s.has_voted ? 'text-green-500' : 'text-yellow-500'}`}>
                      {s.has_voted ? 'Voted' : 'Pending'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate(`/groups/${groupId}/results`)}
          disabled={!allVoted}
          className="px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-semibold rounded-xl disabled:opacity-50"
        >
          View Results
        </button>
      </div>
    </div>
  );
};

export default GroupPage;