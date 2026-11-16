import React, { createContext, useState, useContext } from 'react';
import { STAFF_ROLES } from '../utils/pos';

const AuthContext = createContext();

const readUser = () => {
    try {
        return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
        return null;
    }
};

// eslint-disable-next-line react-refresh/only-export-components
export { landingPathFor } from '../utils/pos';

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('access_token') || null);
    const [user, setUser] = useState(readUser);
    const [isAuthenticated, setIsAuthenticated] = useState(!!token);

    const login = (newToken, userData) => {
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const updateUser = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
    };

    const isStaff = !!user && STAFF_ROLES.includes(user.role);
    const hasRole = (...roles) => !!user && roles.includes(user.role);

    return (
        <AuthContext.Provider value={{ token, user, isAuthenticated, isStaff, hasRole, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
