import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import { Icon, Spinner } from '../../components/ui';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { saveTableSession } from '../../utils/table';

/**
 * Halaman tujuan QR di meja (/t/:token). Memvalidasi meja, menyimpan sesi meja,
 * lalu mengajak pelanggan melihat menu (PRD QR-01, QR-08).
 */
const TableEntry = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const settings = useStoreSettings();
    const [table, setTable] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get(`/tables/${encodeURIComponent(token)}`)
            .then((res) => {
                saveTableSession(res.data.data, token);
                setTable(res.data.data);
            })
            .catch((err) => setError(err.response?.status === 404
                ? 'QR ini sudah tidak berlaku atau mejanya sedang tidak aktif. Silakan minta bantuan staf kami.'
                : 'Tidak dapat terhubung. Periksa koneksi internet Anda lalu coba lagi.'));
    }, [token]);

    const closed = settings && !settings.is_open;

    return (
        <div className="min-h-screen bg-espresso text-cream flex flex-col">
            <div className="absolute inset-0 opacity-[0.06] bg-[url('/bg-pattern.svg')] bg-repeat pointer-events-none" aria-hidden="true" />
            <header className="relative px-6 pt-10 text-center">
                <p className="font-display text-2xl">{settings?.store_name || 'Cafe Nusantara'}</p>
            </header>

            <main className="relative flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
                {!table && !error && <Spinner className="text-stone-300" />}

                {error && (
                    <div className="max-w-sm animate-slide-up">
                        <Icon name="qr_code_2" className="text-6xl text-stone-500" />
                        <p className="font-display text-3xl mt-6">QR tidak dapat digunakan</p>
                        <p className="mt-3 text-stone-300 leading-relaxed">{error}</p>
                        <Link to="/menu" className="btn btn-lg rounded-full mt-10 bg-cream text-ink hover:bg-primary hover:text-white">Lihat menu tanpa meja</Link>
                    </div>
                )}

                {table && (
                    <div className="max-w-sm w-full animate-slide-up">
                        <p className="label-caps text-stone-400">Selamat datang di</p>
                        <p className="font-display text-7xl mt-4 leading-none">{table.name}</p>
                        {table.area && <p className="mt-3 text-stone-400">{table.area}</p>}

                        {closed ? (
                            <p className="mt-10 rounded-2xl bg-cream/10 px-5 py-4 text-sm text-stone-200">
                                {settings.temporarily_closed ? 'Pemesanan sedang dihentikan sementara.' : 'Kami sedang tutup.'} Anda tetap dapat melihat menu.
                            </p>
                        ) : (
                            <ol className="mt-12 space-y-4 text-left">
                                {[
                                    ['restaurant_menu', 'Pilih menu dan kirim pesanan dari HP Anda'],
                                    ['point_of_sale', 'Bayar di kasir dengan menyebutkan nomor pesanan'],
                                    ['room_service', 'Pesanan diantar ke meja Anda'],
                                ].map(([icon, text]) => (
                                    <li key={icon} className="flex items-center gap-4 text-stone-200">
                                        <span className="h-10 w-10 shrink-0 rounded-full border border-espresso-3 flex items-center justify-center"><Icon name={icon} className="text-[20px]" /></span>
                                        {text}
                                    </li>
                                ))}
                            </ol>
                        )}

                        <button onClick={() => navigate('/menu', { replace: true })} className="btn btn-lg rounded-full w-full mt-12 bg-cream text-ink hover:bg-primary hover:text-white">
                            Lihat menu <Icon name="arrow_forward" />
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TableEntry;
