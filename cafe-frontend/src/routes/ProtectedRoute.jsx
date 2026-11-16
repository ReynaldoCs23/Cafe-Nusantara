import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, landingPathFor } from '../context/AuthContext';
import { STAFF_ROLES } from '../utils/pos';

/**
 * roles: daftar peran yang boleh membuka rute ini (default: semua staf).
 * Backend tetap memeriksa hak akses; ini hanya mencegah halaman yang tidak relevan tampil.
 */
const ProtectedRoute = ({ roles = STAFF_ROLES }) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    if (!roles.includes(user.role)) {
        const fallback = landingPathFor(user);
        return <Navigate to={fallback === window.location.pathname ? '/' : fallback} replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
