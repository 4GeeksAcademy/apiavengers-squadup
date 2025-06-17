import { useState,useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


export const Login = () => {
  const [username, setUsername] = useState(''); // Changed from email to username
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

   const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    
    try {
      const response = await fetch('https://animated-eureka-5grpx4q7wvpgf66g-3001.app.github.dev/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || 'Login failed');
      }

      // Save  access token 
      localStorage.setItem('access_token', data.access_token);
      setIsLoggedIn(true)
      console.log("login success")
      setError(err.message || 'Failed to login. Please try again.');
      
    } catch (err) {
      setError(err.message || "You didn't say the magic word")
    } 
 
  };
    
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/Single'); 
    }
  }, [isLoggedIn, navigate]);

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} >
        <h2>Login</h2>
        
        <div className="error-message">{error}</div>
        
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input type="text" id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
        </div>
        
        <div className="form-group">
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

