import { Navigate, Outlet } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

export const Protected = () => {
  const token = localStorage.getItem('access_token');

  const isAuthenticated = () => {
    if (!token) return false;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch (err) {
      return false;
    }
  };

  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

