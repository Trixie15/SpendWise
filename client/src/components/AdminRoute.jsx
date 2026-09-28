import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Hides admin pages from regular users. The server enforces this too.
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
