import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import UserRoute from './components/UserRoute';
import HomeRedirect from './components/HomeRedirect';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Privacy from './pages/Privacy';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Budgets from './pages/Budgets';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

const asUser = (page) => <UserRoute>{page}</UserRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/privacy" element={<Privacy />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomeRedirect />} />

        {/* Regular users only */}
        <Route path="/dashboard" element={asUser(<Dashboard />)} />
        <Route path="/transactions" element={asUser(<Transactions />)} />
        <Route path="/budgets" element={asUser(<Budgets />)} />
        <Route path="/categories" element={asUser(<Categories />)} />

        {/* Admins only */}
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

        {/* Everyone */}
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
