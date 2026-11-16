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
import StoreSettings from './pages/admin/StoreSettings';
import TableManagement from './pages/admin/TableManagement';
import ShiftHistory from './pages/admin/ShiftHistory';
import AuditLog from './pages/admin/AuditLog';
import PromotionManagement from './pages/admin/PromotionManagement';
import StaffShell from './components/staff/StaffShell';
import Pos from './pages/staff/Pos';
import Kitchen from './pages/staff/Kitchen';
import Handoff from './pages/staff/Handoff';
import ReadyBoard from './pages/public/ReadyBoard';
import TableEntry from './pages/public/TableEntry';
import { CartProvider } from './context/CartContext';
import { useAuth, landingPathFor } from './context/AuthContext';
import PublicLayout from './components/PublicLayout';
import Menu from './pages/public/Menu';
import Checkout from './pages/public/Checkout';
import Home from './pages/public/Home';
import Cart from './pages/public/Cart';
import About from './pages/public/About';
import Reviews from './pages/public/Reviews';
import Locations from './pages/public/Locations';
import Profile from './pages/public/Profile';
import OrderStatus from './pages/public/OrderStatus';
import CustomerRegister from './pages/public/CustomerRegister';

const OWNER_MANAGER = ['owner', 'manager'];

const AdminIndex = () => {
    const { user } = useAuth();
    return <Navigate replace to={landingPathFor(user)} />;
};

function App() {
    return (
        <CartProvider>
            <Routes>
                {/* Storefront & pemesanan pelanggan */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/order/:orderNumber" element={<OrderStatus />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/reviews" element={<Reviews />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/profile" element={<Profile />} />
                </Route>

                <Route path="/login" element={<Login />} />
                <Route path="/antrean" element={<ReadyBoard />} />
                <Route path="/t/:token" element={<TableEntry />} />

                {/* Layar operasional full-screen */}
                <Route element={<ProtectedRoute roles={['owner', 'manager', 'cashier']} />}>
                    <Route element={<StaffShell />}>
                        <Route path="/pos" element={<Pos />} />
                    </Route>
                </Route>
                <Route element={<ProtectedRoute roles={['owner', 'manager', 'cashier', 'barista']} />}>
                    <Route element={<StaffShell dark />}>
                        <Route path="/kds" element={<Kitchen />} />
                    </Route>
                </Route>
                <Route element={<ProtectedRoute />}>
                    <Route element={<StaffShell />}>
                        <Route path="/antar" element={<Handoff />} />
                    </Route>
                </Route>
                <Route path="/register" element={<CustomerRegister />} />

                {/* Back-office staf, dibatasi per peran */}
                <Route path="/admin" element={<ProtectedRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route index element={<AdminIndex />} />
                        <Route path="orders" element={<OrderManagement />} />

                        <Route element={<ProtectedRoute roles={OWNER_MANAGER} />}>
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="reports" element={<Reports />} />
                            <Route path="catalog" element={<CatalogManagement />} />
                            <Route path="content" element={<ContentManagement />} />
                            <Route path="reviews" element={<ReviewsManagement />} />
                            <Route path="tables" element={<TableManagement />} />
                            <Route path="shifts" element={<ShiftHistory />} />
                            <Route path="audit" element={<AuditLog />} />
                            <Route path="promotions" element={<PromotionManagement />} />
                        </Route>

                        <Route element={<ProtectedRoute roles={['owner']} />}>
                            <Route path="users" element={<UserManagement />} />
                            <Route path="settings" element={<StoreSettings />} />
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </CartProvider>
    );
}

export default App;
