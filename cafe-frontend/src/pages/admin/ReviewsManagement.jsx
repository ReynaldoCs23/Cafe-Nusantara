import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const ReviewsManagement = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await api.get('/admin/reviews');
            // If empty, generate some mock data for showcase since no public review submission exists yet
            if (res.data.data && res.data.data.length > 0) {
                setReviews(res.data.data);
            } else {
                setReviews([
                    { id: 'mock1', customer_name: 'Elena R.', rating: 5, comment: 'Sangat luar biasa. Rasa earthy dan hint of chocolate-nya sangat terasa saat diseduh dengan metode pour-over. Pengalaman kopi paling menenangkan bulan ini.', is_visible: true, created_at: new Date().toISOString() },
                    { id: 'mock2', customer_name: 'Budi S.', rating: 4, comment: 'Floral notes yang sangat kuat, acidity-nya pas. Cocok untuk pagi hari. Kemasannya juga sangat premium dan menjaga kesegaran biji kopi.', is_visible: false, created_at: new Date().toISOString() }
                ]);
            }
        } catch (err) {
            console.error('Failed to fetch reviews', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = async (review) => {
        // Toggle locally first for fast UI
        const updated = reviews.map(r => r.id === review.id ? { ...r, is_visible: !r.is_visible } : r);
        setReviews(updated);
        
        if (typeof review.id !== 'string') { // Not a mock
            try {
                await api.put(`/admin/reviews/${review.id}/visibility`, { is_visible: !review.is_visible });
            } catch (err) {
                alert('Gagal mengubah status visibilitas');
                fetchReviews(); // revert
            }
        }
    };

    const renderStars = (rating) => {
        return (
            <div className="flex text-primary">
                {[...Array(5)].map((_, i) => (
                    <span key={i} className={`material-symbols-outlined text-[16px] ${i < rating ? 'font-variation-fill' : ''}`}>
                        {i < rating ? 'star' : 'star_border'}
                    </span>
                ))}
            </div>
        );
    };

    if (loading) return <div className="p-12 text-center text-on-surface-variant font-label-caps">Loading reviews...</div>;

    return (
        <div className="animate-fade-in font-body-md text-on-surface max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="font-headline-lg text-[32px] text-on-surface mb-8">Content & Reviews</h2>
                <div className="flex space-x-8 border-b border-outline-variant">
                    <Link to="/admin/content" className="pb-4 font-label-caps text-on-surface-variant hover:text-on-surface transition-colors tracking-widest uppercase">
                        Konten Website
                    </Link>
                    <Link to="/admin/reviews" className="pb-4 font-label-caps text-primary border-b-2 border-primary tracking-widest uppercase">
                        Moderasi Ulasan
                    </Link>
                </div>
            </div>

            <div className="flex justify-between items-center mb-8">
                <p className="font-label-sm text-outline">Menampilkan ulasan terbaru yang menunggu moderasi.</p>
                <div className="flex space-x-4">
                    <select className="bg-transparent border-b border-outline-variant py-2 focus:outline-none focus:border-primary text-label-sm font-label-sm cursor-pointer appearance-none bg-surface">
                        <option>Semua Rating</option>
                        <option>5 Bintang</option>
                        <option>4 Bintang</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map(review => (
                    <div key={review.id} className="bg-surface p-6 border border-outline-variant rounded hover:border-primary transition-colors duration-300 flex flex-col justify-between shadow-sm">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-headline-md text-[24px] text-on-surface">{review.customer_name}</h3>
                                    <p className="font-label-sm text-outline mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                                </div>
                                {renderStars(review.rating)}
                            </div>
                            <p className="font-body-md text-on-surface-variant mb-6 italic">
                                "{review.comment}"
                            </p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-outline-variant mt-auto">
                            <label className="flex items-center cursor-pointer space-x-3">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={review.is_visible} onChange={() => toggleVisibility(review)} />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${review.is_visible ? 'bg-secondary' : 'bg-surface-container-high'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-surface w-4 h-4 rounded-full transition transform ${review.is_visible ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className={`font-label-sm ${review.is_visible ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                                    Tampilkan di Website
                                </span>
                            </label>
                            <button className="font-label-caps text-error hover:text-on-error-container transition-colors flex items-center space-x-1">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                                <span>Hapus</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReviewsManagement;
