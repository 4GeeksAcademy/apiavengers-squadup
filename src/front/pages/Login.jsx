import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useGlobalReducer from "../hooks/useGlobalReducer";
import { loginFetch } from "../fetch";



export const Login = () => {
  const { store, dispatch } = useGlobalReducer();
  const [username, setUsername] = useState(''); // Changed from email to username
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {

      const userData = await loginFetch(username, password, dispatch);

      navigate('/single');

    } catch (err) {
      setError(err.message || 'Login failed');

    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/Single');
    }
  }, [isLoggedIn, navigate]);

  
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.has("openid.claimed_id")) {
    fetch("/api/steam/authorize" + window.location.search)
      .then(res => res.json())
      .then(data => setSteamData(data));
  }
}, []);


  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} >
        <h2>Login</h2>

        <div className="error-message">{error}</div>

        <div id="username-group">
          <label id="username">Username</label>
          <input type="text" id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>

        <div id="password-group">
          <label htmlFor="password">Password</label>
          <input type="password" id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}

