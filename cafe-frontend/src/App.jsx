import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/admin/Login';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import OrderManagement from './pages/admin/OrderManagement';
import CatalogManagement from './pages/admin/CatalogManagement';
import ContentManagement from './pages/admin/ContentManagement';
import ReviewsManagement from './pages/admin/ReviewsManagement';
import UserManagement from './pages/admin/UserManagement';
import Reports from './pages/admin/Reports';
import { CartProvider } from './context/CartContext';
import PublicLayout from './components/PublicLayout';
import Menu from './pages/public/Menu';
import Checkout from './pages/public/Checkout';
import Home from './pages/public/Home';
import Cart from './pages/public/Cart';
import About from './pages/public/About';
import Reviews from './pages/public/Reviews';
import Locations from './pages/public/Locations';
import Profile from './pages/public/Profile';

import CustomerRegister from './pages/public/CustomerRegister';

function App() {
  return (
    <CartProvider>
      <Routes>
        {/* Public Storefront Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/about" element={<About />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<CustomerRegister />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="catalog" element={<CatalogManagement />} />
            <Route path="content" element={<ContentManagement />} />
            <Route path="reviews" element={<ReviewsManagement />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route index element={<Navigate replace to="dashboard" />} />
          </Route>
        </Route>
      </Routes>
    </CartProvider>
  );
}

export default App;
