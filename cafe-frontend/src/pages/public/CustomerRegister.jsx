import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const CustomerRegister = () => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        if (formData.password !== formData.password_confirmation) {
            setError('Konfirmasi kata sandi tidak cocok.');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/register', formData);
            if (response.data.access_token) {
                login(response.data.access_token, response.data.user);
                if (response.data.user?.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mendaftar. Silakan coba lagi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col font-body-md text-on-surface bg-[#F9F8F6]">
            {/* Top Navigation */}
            <header className="w-full top-0 flex justify-center py-12 px-grid-margin">
                <div className="text-center">
                    <h1 className="font-headline-md text-headline-md text-primary tracking-tight mb-2">CafeNusantara</h1>
                    <p className="font-label-caps text-label-caps text-on-surface-variant tracking-widest">PORTAL PELANGGAN</p>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center px-4 pb-24">
                <div className="w-full max-w-[480px] bg-surface p-8 md:p-12 border border-[#E5E5E5] rounded-sm shadow-sm">
                    <div className="mb-10 text-center">
                        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Buat Akun Baru</h2>
                        <p className="font-body-md text-body-md text-on-surface-variant">Bergabung dengan kami untuk mendapatkan penawaran eksklusif.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="name">Nama Lengkap</label>
                            <input 
                                className="w-full bg-transparent border-b border-outline-variant py-3 font-body-md text-body-md transition-all duration-300 focus:border-primary focus:outline-none" 
                                id="name" 
                                name="name" 
                                type="text" 
                                required 
                                placeholder="Masukkan nama lengkap Anda"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="username">Username</label>
                            <input 
                                className="w-full bg-transparent border-b border-outline-variant py-3 font-body-md text-body-md transition-all duration-300 focus:border-primary focus:outline-none" 
                                id="username" 
                                name="username" 
                                type="text" 
                                required 
                                placeholder="Pilih username unik"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="email">Email</label>
                            <input 
                                className="w-full bg-transparent border-b border-outline-variant py-3 font-body-md text-body-md transition-all duration-300 focus:border-primary focus:outline-none" 
                                id="email" 
                                name="email" 
                                type="email" 
                                required 
                                placeholder="nama@email.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="password">Kata Sandi</label>
                            <div className="relative group">
                                <input 
                                    className="w-full bg-transparent border-b border-outline-variant py-3 pr-10 font-body-md text-body-md transition-all duration-300 focus:border-primary focus:outline-none" 
                                    id="password" 
                                    name="password" 
                                    type={showPassword ? "text" : "password"}
                                    required 
                                    placeholder="Minimal 8 karakter"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button 
                                    type="button" 
                                    className="absolute right-0 top-3 text-on-surface-variant hover:text-primary transition-colors focus:outline-none"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
                                </button>
                            </div>
                        </div>

                        {/* Password Confirmation */}
                        <div className="space-y-2">
                            <label className="font-label-caps text-label-caps text-on-surface-variant" htmlFor="password_confirmation">Konfirmasi Kata Sandi</label>
                            <input 
                                className="w-full bg-transparent border-b border-outline-variant py-3 font-body-md text-body-md transition-all duration-300 focus:border-primary focus:outline-none" 
                                id="password_confirmation" 
                                name="password_confirmation" 
                                type={showPassword ? "text" : "password"}
                                required 
                                placeholder="Ulangi kata sandi"
                                value={formData.password_confirmation}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-6">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-primary text-on-primary py-4 px-6 font-label-caps text-label-caps tracking-widest hover:bg-[#7a3c28] transition-all duration-500 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? 'MENDAFTAR...' : 'DAFTAR SEKARANG'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="font-body-md text-on-surface-variant">
                            Sudah punya akun? <Link to="/login" className="text-primary font-bold hover:underline">Masuk di sini</Link>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CustomerRegister;
