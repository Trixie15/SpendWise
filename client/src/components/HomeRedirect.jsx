import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Sends each role to its own home page after login
export default function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}
