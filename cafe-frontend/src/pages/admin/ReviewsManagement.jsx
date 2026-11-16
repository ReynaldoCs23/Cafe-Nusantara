import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../../api/axios';
import { EmptyState, Icon, LoadingBlock, PageHeader, useToast } from '../../components/ui';
import { apiErrorMessage } from '../../utils/pos';

/** Tab bersama untuk halaman Konten Website dan Moderasi Ulasan. */
export const ContentTabs = () => (
    <div className="flex gap-1.5 mb-8 border-b border-hairline">
        {[['/admin/content', 'Konten website'], ['/admin/reviews', 'Moderasi ulasan']].map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${isActive ? 'border-primary text-ink' : 'border-transparent text-on-surface-variant hover:text-ink'}`}>
                {label}
            </NavLink>
        ))}
    </div>
);

const Stars = ({ rating }) => (
    <span className="flex text-primary" aria-label={`${rating} dari 5 bintang`}>
        {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" filled={i <= rating} className={`text-[16px] ${i <= rating ? '' : 'opacity-30'}`} />)}
    </span>
);

/** Moderasi ulasan pelanggan: tampilkan atau sembunyikan dari website. */
const ReviewsManagement = () => {
    const { notify } = useToast();
    const [reviews, setReviews] = useState(null);
    const [rating, setRating] = useState('all');
    const [visibility, setVisibility] = useState('all');

    useEffect(() => {
        api.get('/admin/reviews')
            .then((res) => setReviews(res.data.data || []))
            .catch((err) => notify(apiErrorMessage(err, 'Gagal memuat ulasan.'), 'error'));
    }, [notify]);

    const toggle = async (review) => {
        setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, is_visible: !r.is_visible } : r)));
        try {
            await api.put(`/admin/reviews/${review.id}/visibility`, { is_visible: !review.is_visible });
            notify(review.is_visible ? 'Ulasan disembunyikan' : 'Ulasan ditampilkan di website');
        } catch (err) {
            setReviews((prev) => prev.map((r) => (r.id === review.id ? review : r)));
            notify(apiErrorMessage(err, 'Gagal mengubah visibilitas.'), 'error');
        }
    };

    if (!reviews) return <LoadingBlock />;

    const visible = reviews
        .filter((r) => rating === 'all' || r.rating === Number(rating))
        .filter((r) => visibility === 'all' || (visibility === 'shown' ? r.is_visible : !r.is_visible));
    const average = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '–';

    return (
        <div className="animate-fade-in">
            <PageHeader eyebrow="Toko" title="Konten Website" description={`${reviews.length} ulasan · rata-rata ${average} bintang`} />
            <ContentTabs />

            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-1.5">
                    {[['all', 'Semua'], ['shown', 'Tampil'], ['hidden', 'Tersembunyi']].map(([key, label]) => (
                        <button key={key} className={visibility === key ? 'tab-active' : 'tab'} onClick={() => setVisibility(key)}>{label}</button>
                    ))}
                </div>
                <select className="input w-auto ml-auto" value={rating} onChange={(e) => setRating(e.target.value)}>
                    <option value="all">Semua rating</option>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} bintang</option>)}
                </select>
            </div>

            {visible.length === 0 ? (
                <div className="card"><EmptyState icon="reviews" title="Belum ada ulasan" description="Ulasan yang dikirim pelanggan dari website akan muncul di sini." /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visible.map((r) => (
                        <article key={r.id} className={`card p-6 flex flex-col ${r.is_visible ? '' : 'opacity-60'}`}>
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div>
                                    <p className="font-display text-xl">{r.customer_name}</p>
                                    <p className="text-xs text-on-surface-variant mt-1">{new Date(r.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                                </div>
                                <Stars rating={r.rating} />
                            </div>
                            <p className="text-on-surface-variant leading-relaxed flex-1">“{r.comment}”</p>
                            <div className="flex items-center justify-between pt-4 mt-5 border-t border-hairline">
                                <span className="text-sm">{r.is_visible ? 'Tampil di website' : 'Disembunyikan'}</span>
                                <button type="button" role="switch" aria-checked={r.is_visible} aria-label="Tampilkan di website" onClick={() => toggle(r)}
                                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${r.is_visible ? 'bg-sage' : 'bg-surface-container-highest'}`}>
                                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${r.is_visible ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsManagement;
