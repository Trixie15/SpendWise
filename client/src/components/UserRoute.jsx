import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Personal finance pages are for regular users. Admins only monitor accounts.
export default function UserRoute({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return children;
}
