import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import PageIntro from '../../components/public/PageIntro';
import { Field, Icon, Spinner } from '../../components/ui';
import { apiErrorMessage } from '../../utils/pos';

const Stars = ({ rating, size = 'text-[18px]' }) => (
    <span className="flex text-primary" aria-label={`${rating} dari 5 bintang`}>
        {[1, 2, 3, 4, 5].map((s) => <Icon key={s} name="star" filled={s <= rating} className={`${size} ${s <= rating ? '' : 'opacity-25'}`} />)}
    </span>
);

/** Ulasan pelanggan dan formulir untuk mengirim ulasan baru. */
const Reviews = () => {
    const [reviews, setReviews] = useState(null);
    const [form, setForm] = useState({ customer_name: '', rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState(null);

    const load = useCallback(async () => {
        const res = await api.get('/reviews');
        setReviews(res.data.data || []);
    }, []);

    useEffect(() => {
        load().catch(() => setReviews([]));
    }, [load]);

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage(null);
        try {
            await api.post('/reviews', form);
            setMessage({ type: 'success', text: 'Terima kasih! Ulasan Anda sudah kami terima.' });
            setForm({ customer_name: '', rating: 5, comment: '' });
            await load();
        } catch (err) {
            setMessage({ type: 'error', text: apiErrorMessage(err, 'Gagal mengirim ulasan. Silakan coba lagi.') });
        } finally {
            setSubmitting(false);
        }
    };

    const average = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow="Ulasan" title="Kata mereka yang pernah singgah.">
                {reviews?.length > 0 && (
                    <div className="mt-8 flex items-center gap-4">
                        <span className="font-display text-5xl tabular">{average.toFixed(1)}</span>
                        <div>
                            <Stars rating={Math.round(average)} size="text-[20px]" />
                            <p className="text-sm text-on-surface-variant mt-1">dari {reviews.length} ulasan</p>
                        </div>
                    </div>
                )}
            </PageIntro>

            <div className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-[1fr_400px] gap-12 lg:gap-20 items-start">
                <div>
                    {!reviews ? (
                        <div className="py-20 flex justify-center text-on-surface-variant"><Spinner /></div>
                    ) : reviews.length === 0 ? (
                        <p className="py-20 text-on-surface-variant">Belum ada ulasan. Jadilah yang pertama berbagi cerita.</p>
                    ) : (
                        <div className="columns-1 md:columns-2 gap-6 [&>*]:mb-6">
                            {reviews.map((r) => (
                                <figure key={r.id} className="break-inside-avoid card p-7">
                                    <Stars rating={r.rating} />
                                    <blockquote className="mt-5 font-display text-xl leading-relaxed text-ink">“{r.comment}”</blockquote>
                                    <figcaption className="mt-6 flex items-center gap-3">
                                        <span className="h-10 w-10 rounded-full bg-surface-container text-ink font-semibold flex items-center justify-center">{r.customer_name.charAt(0).toUpperCase()}</span>
                                        <span>
                                            <span className="block text-sm font-semibold">{r.customer_name}</span>
                                            <span className="block text-xs text-on-surface-variant">{new Date(r.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                                        </span>
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    )}
                </div>

                <aside className="card p-8 lg:sticky lg:top-28">
                    <h2 className="font-display text-2xl">Bagikan pengalaman Anda</h2>
                    <p className="text-sm text-on-surface-variant mt-2">Masukan Anda membantu kami menyeduh lebih baik.</p>
                    <form onSubmit={submit} className="mt-6 space-y-5">
                        <Field label="Nama">
                            <input className="input" required maxLength={100} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                        </Field>
                        <div>
                            <span className="label-caps block mb-2">Penilaian</span>
                            <div className="flex gap-1" role="radiogroup" aria-label="Penilaian">
                                {[1, 2, 3, 4, 5].map((s) => (
                                    <button type="button" key={s} role="radio" aria-checked={form.rating === s} aria-label={`${s} bintang`} onClick={() => setForm({ ...form, rating: s })}
                                        className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-surface-container text-primary">
                                        <Icon name="star" filled={s <= form.rating} className={`text-[28px] ${s <= form.rating ? '' : 'opacity-30'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Field label="Ulasan">
                            <textarea className="input resize-none" rows="4" required maxLength={1000} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} placeholder="Ceritakan pengalaman Anda..." />
                        </Field>
                        {message && (
                            <p className={`text-sm rounded-xl px-4 py-3 ${message.type === 'success' ? 'bg-sage-soft text-sage' : 'bg-[#fff4f2] text-error'}`} role="status">{message.text}</p>
                        )}
                        <button className="btn-primary btn-lg rounded-full w-full" disabled={submitting}>{submitting ? 'Mengirim...' : 'Kirim ulasan'}</button>
                    </form>
                </aside>
            </div>
        </div>
    );
};

export default Reviews;
