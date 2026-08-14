import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const Reviews = () => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState({
        customer_name: '',
        rating: 5,
        comment: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const res = await api.get('/reviews');
            setReviews(res.data.data);
        } catch (error) {
            console.error("Backend Error Details:", error.response?.data);
            console.error("Failed to fetch reviews", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingClick = (rating) => {
        setFormData({ ...formData, rating });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccessMessage('');

        try {
            await api.post('/reviews', formData);
            setSuccessMessage('Terima kasih! Ulasan Anda telah berhasil dikirim.');
            setFormData({ customer_name: '', rating: 5, comment: '' });
            fetchReviews(); // Refresh the list
        } catch (error) {
            console.error("Backend Error Details:", error.response?.data);
            console.error("Failed to submit review", error);
            const errorMsg = error.response?.data?.message || 'Gagal mengirim ulasan. Silakan coba lagi.';
            alert(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="min-h-[50vh] flex items-center justify-center font-label-caps text-on-surface-variant">Loading...</div>;
    }

    return (
        <div className="animate-fade-in pb-20">
            {/* Header Area */}
            <div className="w-full bg-surface-container-low/70 py-16 text-center border-b border-outline-variant/30 mb-12">
                <h1 className="font-display-lg text-4xl md:text-5xl text-on-surface font-bold tracking-tight">Apa Kata Mereka</h1>
                <p className="font-body-lg text-lg text-on-surface-variant mt-4 max-w-2xl mx-auto">Pengalaman berkesan dari para penikmat kopi yang telah singgah di CafeNusantara.</p>
            </div>

            {/* Form Section */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="font-headline-lg text-2xl font-bold text-gray-900 mb-6 text-center">Bagikan Pengalaman Anda</h2>
                    
                    {successMessage && (
                        <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl text-center font-medium">
                            {successMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Anda</label>
                            <input 
                                type="text" 
                                required
                                value={formData.customer_name}
                                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                placeholder="Tuliskan nama Anda..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Penilaian</label>
                            <div className="flex gap-2 text-3xl">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        type="button" 
                                        key={star} 
                                        onClick={() => handleRatingClick(star)}
                                        className={`material-symbols-outlined transition-colors ${star <= formData.rating ? 'text-primary' : 'text-gray-200 hover:text-primary/50'}`}
                                        style={{ fontVariationSettings: star <= formData.rating ? "'FILL' 1" : "'FILL' 0" }}
                                    >
                                        star
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Ulasan</label>
                            <textarea 
                                required
                                value={formData.comment}
                                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
                                rows="4"
                                placeholder="Ceritakan pengalaman Anda di CafeNusantara..."
                            ></textarea>
                        </div>

                        <button 
                            type="submit" 
                            disabled={submitting}
                            className="w-full bg-primary text-white font-bold tracking-widest uppercase py-4 rounded-xl hover:bg-[#7a3c28] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Mengirim...' : 'Kirim Ulasan'}
                        </button>
                    </form>
                </div>
            </section>

            {/* Customer Review Section */}
            <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 font-body-lg">
                        Belum ada ulasan. Jadilah yang pertama memberikan ulasan!
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                        {reviews.map((review) => (
                            <div key={review.id} className="bg-surface/80 backdrop-blur-md p-8 rounded-xl shadow-sm border border-outline-variant/20 hover:border-primary/50 transition-colors flex flex-col">
                                <div className="flex text-primary mb-4">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: star <= review.rating ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                                    ))}
                                </div>
                                <p className="font-body-md text-lg text-on-surface-variant mb-6 min-h-[100px] italic flex-grow">
                                    "{review.comment}"
                                </p>
                                <div className="flex items-center gap-4 mt-auto">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl uppercase">
                                        {review.customer_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-label-sm text-sm font-bold text-on-surface">{review.customer_name}</div>
                                        <div className="font-label-caps text-xs tracking-wider text-on-surface-variant opacity-70">
                                            {new Date(review.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

export default Reviews;
