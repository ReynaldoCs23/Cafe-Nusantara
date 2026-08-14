import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/login', { username, password });
            if (response.data.access_token) {
                login(response.data.access_token, response.data.user);
                
                if (response.data.user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-body-md text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
            {/* Top Navigation */}
            <header className="w-full top-0 flex justify-center py-12 px-grid-margin">
                <div className="text-center">
                    <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">CafeNusantara</h1>
                    <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">PORTAL PELANGGAN</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center px-4 pb-24">
                <div className="w-full max-w-[440px] bg-surface p-8 md:p-12 border border-[#E5E5E5] rounded-sm animate-fade-in shadow-sm">
                    <div className="mb-10 text-center">
                        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Selamat Datang</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">Masuk ke akun Anda untuk melanjutkan.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-error-container text-on-error-container text-sm rounded">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Username */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="username">Username</label>
                            <div className="relative group">
                                <input 
                                    className="w-full bg-transparent border-b border-outline-variant py-3 pr-10 font-body-md text-body-md transition-all duration-300 focus:border-on-surface" 
                                    id="username" 
                                    name="username" 
                                    type="text" 
                                    required 
                                    placeholder="Masukkan username Anda"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <span className="material-symbols-outlined absolute right-0 top-3 text-on-surface-variant group-hover:text-primary transition-colors">person</span>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-end">
                                <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="password">Kata Sandi</label>
                                <a className="font-label-caps text-label-caps text-primary hover:opacity-70 transition-opacity" href="#">Lupa Kata Sandi?</a>
                            </div>
                            <div className="relative group">
                                <input 
                                    className="w-full bg-transparent border-b border-outline-variant py-3 pr-10 font-body-md text-body-md transition-all duration-300 focus:border-on-surface" 
                                    id="password" 
                                    name="password" 
                                    type={showPassword ? "text" : "password"}
                                    required 
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-0 top-3 text-on-surface-variant hover:text-primary transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center space-x-3 group cursor-pointer">
                            <div className="relative flex items-center">
                                <input className="w-4 h-4 rounded-none border-outline text-primary focus:ring-0 cursor-pointer" id="remember" name="remember" type="checkbox"/>
                            </div>
                            <label className="font-body-md text-body-md text-on-surface-variant cursor-pointer group-hover:text-on-surface transition-colors" htmlFor="remember">
                                Ingat Saya
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-primary text-on-primary py-4 px-6 font-label-caps text-label-caps tracking-widest hover:bg-primary-container transition-all duration-500 transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'MENGOTENTIKASI...' : 'MASUK SEKARANG'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="font-body-md text-on-surface-variant">
                            Belum punya akun? <a href="/register" className="text-primary font-bold hover:underline">Daftar sekarang</a>
                        </p>
                    </div>

                    {/* Decorative Divider */}
                    <div className="mt-12 flex items-center justify-center space-x-4">
                        <div className="h-[1px] w-8 bg-outline-variant"></div>
                        <div className="w-6 h-6 bg-cover bg-center opacity-30" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_ENW5JZDPBrWoccWSv-VF4HIGkufG2ksaV7BMwpqtFyeji99O10fzG9EZt-ySThItmKaECHDFbN99YJNhI9H9lbxsch4iznERu_KrnKyITFMITtAS-GL2gwSn96TEupJUMl1B27WScNbvDsrrlUr3LJdgG84HIsezqnJBfCIOoVxgh0oErz-BSx2yeFSZr9-qi3qFiErUSWrUHp_jjcgmW5o4fE7fgXyx3PTYm1Od0mgt7o0wRlkLkYtdEqeFooSYbU1ETuBCcPM')"}}></div>
                        <div className="h-[1px] w-8 bg-outline-variant"></div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full px-grid-margin py-8 mt-auto flex flex-col md:flex-row justify-between items-center gap-4 bg-surface-container-low border-t border-outline-variant">
                <div className="font-label-caps text-label-caps tracking-widest text-on-surface-variant">
                    © 2026 CafeNusantara Admin. All rights reserved.
                </div>
                <div className="flex gap-8">
                    <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Privacy Policy</a>
                    <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Terms of Service</a>
                    <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors" href="#">Support</a>
                </div>
            </footer>

            {/* Background Effect */}
            <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-primary opacity-[0.03] blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[60%] bg-secondary opacity-[0.03] blur-[120px] rounded-full"></div>
            </div>
        </div>
    );
};

export default Login;
