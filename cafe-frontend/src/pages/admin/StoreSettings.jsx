import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { apiErrorMessage, calculateTotals, formatPrice } from '../../utils/pos';
import { fetchStoreSettings } from '../../hooks/useStoreSettings';
import { LoadingBlock, PageHeader } from '../../components/ui';

const DAYS = [
    ['mon', 'Senin'], ['tue', 'Selasa'], ['wed', 'Rabu'], ['thu', 'Kamis'],
    ['fri', 'Jumat'], ['sat', 'Sabtu'], ['sun', 'Minggu'],
];

const fieldClass = 'input';

// Tata letak editorial: judul & penjelasan di kiri, isian di kanan
const Section = ({ title, description, children }) => (
    <section className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-12 py-10 border-t border-hairline first:border-t-0 first:pt-2">
        <div>
            <h3 className="font-display text-xl text-ink">{title}</h3>
            {description && <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{description}</p>}
        </div>
        <div className="space-y-5">{children}</div>
    </section>
);

const Toggle = ({ label, checked, onChange, hint }) => (
    <div className="flex items-start justify-between gap-6">
        <span>
            <span className="text-sm font-medium text-ink">{label}</span>
            {hint && <span className="block text-xs text-on-surface-variant mt-0.5">{hint}</span>}
        </span>
        <button type="button" role="switch" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-sage' : 'bg-surface-container-highest'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
    </div>
);

const NumberField = ({ label, value, onChange, hint, ...props }) => (
    <label className="block">
        <span className="label-caps block mb-1.5">{label}</span>
        <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} className="input tabular" {...props} />
        {hint && <span className="block text-xs text-on-surface-variant mt-1">{hint}</span>}
    </label>
);

/**
 * Pengaturan operasional toko (khusus owner): pajak, service, jam buka, pemesanan, fitur opsional.
 */
const StoreSettings = () => {
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        api.get('/admin/settings')
            .then((res) => setSettings(res.data.data))
            .catch((err) => setMessage({ type: 'error', text: apiErrorMessage(err, 'Gagal memuat pengaturan.') }));
    }, []);

    if (!settings) {
        return message ? <p className="p-12 text-center text-error">{message.text}</p> : <LoadingBlock label="Memuat pengaturan..." />;
    }

    const set = (key, value) => setSettings((s) => ({ ...s, [key]: value }));
    const setHours = (day, patch) => setSettings((s) => ({
        ...s,
        opening_hours: { ...s.opening_hours, [day]: { ...s.opening_hours[day], ...patch } },
    }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await api.put('/admin/settings', settings);
            setSettings(res.data.data);
            fetchStoreSettings(true).catch(() => {});
            setMessage({ type: 'success', text: 'Pengaturan disimpan.' });
        } catch (err) {
            setMessage({ type: 'error', text: apiErrorMessage(err, 'Gagal menyimpan pengaturan.') });
        } finally {
            setSaving(false);
        }
    };

    const example = calculateTotals(25000, settings);

    return (
        <form onSubmit={save} className="animate-fade-in max-w-5xl pb-28">
            <PageHeader eyebrow="Toko" title="Pengaturan" description="Berlaku untuk kasir, pemesanan QR, dan pemesanan online." />

            <Section title="Status toko">
                <Toggle label="Tutup sementara" checked={settings.temporarily_closed} onChange={(v) => set('temporarily_closed', v)}
                    hint="Menghentikan pesanan QR dan online seketika, misalnya saat bahan habis atau acara privat." />
            </Section>

            <Section title="Pajak & biaya" description="Harga menu disimpan belum termasuk pajak, kecuali opsi “harga sudah termasuk pajak” dicentang.">
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberField label="Tarif PB1/PBJT (%)" value={settings.tax_rate} onChange={(v) => set('tax_rate', v)} min="0" max="100" step="0.5" required />
                    <NumberField label="Service charge (%)" value={settings.service_charge_rate} onChange={(v) => set('service_charge_rate', v)} min="0" max="100" step="0.5" />
                    <label className="block"><span className="label-caps block mb-1.5">Pembulatan total</span>
                        <select value={settings.rounding} onChange={(e) => set('rounding', Number(e.target.value))} className={fieldClass}>
                            <option value={0}>Tanpa pembulatan</option>
                            <option value={100}>Rp100 terdekat</option>
                            <option value={500}>Rp500 terdekat</option>
                            <option value={1000}>Rp1.000 terdekat</option>
                        </select>
                    </label>
                </div>
                <Toggle label="Aktifkan service charge" checked={settings.service_charge_enabled} onChange={(v) => set('service_charge_enabled', v)} />
                <Toggle label="Harga menu sudah termasuk pajak" checked={settings.tax_inclusive} onChange={(v) => set('tax_inclusive', v)} />
                <p className="text-sm text-on-surface-variant bg-surface-container-low rounded-xl px-4 py-3">
                    Contoh pesanan {formatPrice(25000)}: service {formatPrice(example.service)}, pajak {formatPrice(example.tax)}
                    {example.rounding !== 0 && `, pembulatan ${formatPrice(example.rounding)}`}, total <strong>{formatPrice(example.total)}</strong>.
                </p>
            </Section>

            <Section title="Jam buka" description="Pesanan QR dan online hanya diterima pada jam buka. Jam tutup lebih awal dari jam buka berarti buka sampai lewat tengah malam.">
                <div className="space-y-2">
                    {DAYS.map(([key, label]) => {
                        const hours = settings.opening_hours[key];
                        return (
                            <div key={key} className="grid grid-cols-[100px_1fr_1fr_auto] gap-3 items-center text-sm">
                                <span className="font-medium">{label}</span>
                                <input type="time" value={hours.open} disabled={hours.closed} onChange={(e) => setHours(key, { open: e.target.value })} className={fieldClass} aria-label={`Buka ${label}`} />
                                <input type="time" value={hours.close} disabled={hours.closed} onChange={(e) => setHours(key, { close: e.target.value })} className={fieldClass} aria-label={`Tutup ${label}`} />
                                <label className="flex items-center gap-2 text-xs">
                                    <input type="checkbox" checked={hours.closed} onChange={(e) => setHours(key, { closed: e.target.checked })} /> Libur
                                </label>
                            </div>
                        );
                    })}
                </div>
                <label className="block max-w-xs"><span className="label-caps block mb-1.5">Zona waktu</span>
                    <select value={settings.timezone} onChange={(e) => set('timezone', e.target.value)} className={fieldClass}>
                        <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                        <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                        <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
                    </select>
                </label>
            </Section>

            <Section title="Pemesanan mandiri (QR & online)">
                <Toggle label="Izinkan bayar di kasir" checked={settings.pay_at_cashier_enabled} onChange={(v) => set('pay_at_cashier_enabled', v)}
                    hint="Pesanan baru masuk antrean bar/dapur setelah kasir menerima pembayaran." />
                <Toggle label="Izinkan bayar online (Midtrans)" checked={settings.online_payment_enabled} onChange={(v) => set('online_payment_enabled', v)}
                    hint="Butuh kunci Midtrans di server. Aktif penuh pada Fase 3." />
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberField label="Batas waktu bayar (menit)" value={settings.qr_payment_timeout_minutes} onChange={(v) => set('qr_payment_timeout_minutes', v)} min="5" max="120" required />
                    <NumberField label="Pre-order tampil di KDS (menit sebelum)" value={settings.preorder_lead_minutes} onChange={(v) => set('preorder_lead_minutes', v)} min="0" max="180" />
                    <NumberField label="Maks. pesanan online/QR per jam" value={settings.max_orders_per_hour} onChange={(v) => set('max_orders_per_hour', v)} min="0" hint="0 = tanpa batas" />
                </div>
            </Section>

            <Section title="Layar bar/dapur">
                <div className="grid md:grid-cols-3 gap-4">
                    <NumberField label="Peringatan kuning (menit)" value={settings.kds_warning_minutes} onChange={(v) => set('kds_warning_minutes', v)} min="1" />
                    <NumberField label="Peringatan merah (menit)" value={settings.kds_critical_minutes} onChange={(v) => set('kds_critical_minutes', v)} min="1" />
                    <NumberField label="Pesanan siap belum diserahkan (menit)" value={settings.ready_overdue_minutes} onChange={(v) => set('ready_overdue_minutes', v)} min="1" />
                </div>
            </Section>

            <Section title="Identitas struk">
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        ['store_name', 'Nama toko', true, ''],
                        ['store_phone', 'Telepon', false, ''],
                        ['store_address', 'Alamat', false, 'md:col-span-2'],
                        ['receipt_footer', 'Catatan kaki struk', false, 'md:col-span-2'],
                    ].map(([key, label, required, span]) => (
                        <label key={key} className={`block ${span}`}>
                            <span className="label-caps block mb-1.5">{label}</span>
                            <input required={required} value={settings[key] || ''} onChange={(e) => set(key, e.target.value)} className={fieldClass} />
                        </label>
                    ))}
                </div>
            </Section>

            <Section title="Fitur opsional">
                <Toggle label="Program member/loyalty" checked={settings.loyalty_enabled} onChange={(v) => set('loyalty_enabled', v)}
                    hint="Nonaktif secara default. Fitur poin dibangun pada fase lanjutan." />
            </Section>

            <div className="fixed bottom-0 left-64 right-0 bg-paper/95 backdrop-blur border-t border-hairline px-10 py-4 flex items-center justify-end gap-4 z-30">
                {message && <p className={`text-sm ${message.type === 'error' ? 'text-error' : 'text-sage'}`} role="status">{message.text}</p>}
                <button type="submit" disabled={saving} className="btn-primary min-w-[200px]">
                    {saving ? 'Menyimpan...' : 'Simpan pengaturan'}
                </button>
            </div>
        </form>
    );
};

export default StoreSettings;
