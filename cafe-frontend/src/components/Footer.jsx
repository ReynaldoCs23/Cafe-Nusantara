import { Link } from 'react-router-dom';
import { useStoreSettings } from '../hooks/useStoreSettings';
import { formatOpeningHours } from '../utils/store';

const SOCIALS = [
    ['Instagram', 'https://instagram.com', <path key="ig" d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm5.25-1.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />],
    ['YouTube', 'https://youtube.com', <path key="yt" d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z" />],
    ['X', 'https://x.com', <path key="x" d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" />],
];

/** Footer gelap bergaya editorial. Alamat, telepon, dan jam buka diambil dari Pengaturan Toko. */
const Footer = () => {
    const settings = useStoreSettings();
    const hours = formatOpeningHours(settings?.opening_hours);

    return (
        <footer className="bg-espresso text-stone-300">
            <div className="max-w-7xl mx-auto px-5 md:px-10 pt-20 pb-12 grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <p className="font-display text-3xl text-cream">{settings?.store_name || 'Cafe Nusantara'}</p>
                    <p className="mt-4 text-sm leading-relaxed max-w-xs">Kopi nusantara yang diseduh pelan, untuk hari-hari yang ingin dinikmati.</p>
                    <div className="flex gap-3 mt-6">
                        {SOCIALS.map(([label, href, path]) => (
                            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                                className="h-10 w-10 rounded-full border border-espresso-3 flex items-center justify-center hover:border-stone-400 hover:text-cream transition-colors">
                                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">{path}</svg>
                            </a>
                        ))}
                    </div>
                </div>

                <div>
                    <p className="label-caps text-stone-500 mb-5">Kunjungi</p>
                    <p className="text-sm leading-relaxed">{settings?.store_address || 'Alamat belum diatur'}</p>
                    {settings?.store_phone && <p className="text-sm mt-3">{settings.store_phone}</p>}
                    <Link to="/locations" className="inline-block mt-4 text-sm text-cream border-b border-stone-500 hover:border-cream">Petunjuk arah</Link>
                </div>

                <div>
                    <p className="label-caps text-stone-500 mb-5">Jam buka</p>
                    <ul className="space-y-2 text-sm">
                        {hours.map(({ label, value }) => (
                            <li key={label} className="flex justify-between gap-4"><span>{label}</span><span className="text-cream tabular">{value}</span></li>
                        ))}
                    </ul>
                </div>

                <div>
                    <p className="label-caps text-stone-500 mb-5">Jelajahi</p>
                    <ul className="space-y-2 text-sm">
                        {[['/menu', 'Menu & pesan'], ['/about', 'Cerita kami'], ['/reviews', 'Ulasan'], ['/profile', 'Akun saya']].map(([to, label]) => (
                            <li key={to}><Link to={to} className="hover:text-cream transition-colors">{label}</Link></li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-5 md:px-10 py-8 border-t border-espresso-3 grid gap-4 md:grid-cols-2 text-xs text-stone-500">
                <p>© {new Date().getFullYear()} {settings?.store_name || 'Cafe Nusantara'}. Hak cipta dilindungi.</p>
                <p className="md:text-right leading-relaxed">
                    Layanan pengaduan konsumen: Direktorat Jenderal Perlindungan Konsumen dan Tertib Niaga, Kementerian Perdagangan RI · WhatsApp 0853-1111-1010
                </p>
            </div>
        </footer>
    );
};

export default Footer;
