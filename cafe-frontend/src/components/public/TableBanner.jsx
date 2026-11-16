import { Link } from 'react-router-dom';
import { Icon } from '../ui';
import { clearTableSession, readRecentOrders } from '../../utils/table';

/**
 * Pita tipis di bawah header saat pelanggan memesan dari meja (scan QR).
 */
const TableBanner = ({ table }) => {
    const latest = readRecentOrders()[0];
    const latestLink = latest ? `/order/${latest.orderNumber}?token=${encodeURIComponent(latest.token)}` : null;

    return (
        <div className="bg-ink text-cream">
            <div className="max-w-7xl mx-auto px-5 md:px-10 h-11 flex items-center gap-4 text-sm">
                <Icon name="table_restaurant" className="text-[18px] text-primary-fixed-dim" />
                <span className="truncate">Memesan dari <strong className="font-semibold">{table.name}</strong><span className="hidden sm:inline text-stone-400"> · pesanan diantar ke meja</span></span>
                <div className="ml-auto flex items-center gap-4 shrink-0">
                    {latestLink && <Link to={latestLink} className="underline underline-offset-4 decoration-stone-500 hover:decoration-cream">Pesanan saya</Link>}
                    <button onClick={() => window.confirm(`Berhenti memesan dari ${table.name}?`) && clearTableSession()} className="text-stone-400 hover:text-cream" aria-label="Keluar dari meja">
                        <Icon name="close" className="text-[18px]" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableBanner;
