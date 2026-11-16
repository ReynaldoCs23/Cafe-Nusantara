import PageIntro from '../../components/public/PageIntro';
import { Icon } from '../../components/ui';
import { useStoreSettings } from '../../hooks/useStoreSettings';
import { formatOpeningHours, mapEmbedUrl, mapLinkUrl } from '../../utils/store';

/**
 * Lokasi & jam buka. Alamat, telepon, dan jam diambil dari Pengaturan Toko
 * sehingga selalu sama dengan footer dan aturan pemesanan.
 */
const Locations = () => {
    const settings = useStoreSettings();
    const address = settings?.store_address;
    const hours = formatOpeningHours(settings?.opening_hours);
    const embed = mapEmbedUrl(address);

    return (
        <div className="animate-fade-in pb-32">
            <PageIntro eyebrow="Kunjungi kami" title="Ada kursi kosong untuk Anda."
                description="Datang untuk secangkir kopi, bekerja dengan tenang, atau sekadar bercengkerama." />

            <div className="max-w-7xl mx-auto px-5 md:px-10 grid lg:grid-cols-[380px_1fr] gap-12 lg:gap-16 items-start">
                <div className="space-y-10">
                    {settings && (
                        <p className={`inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium ${settings.is_open ? 'bg-sage-soft text-sage' : 'bg-[#fff4f2] text-error'}`}>
                            <span className={`h-2 w-2 rounded-full ${settings.is_open ? 'bg-sage' : 'bg-error'}`} />
                            {settings.temporarily_closed ? 'Tutup sementara' : settings.is_open ? 'Sedang buka' : 'Sedang tutup'}
                        </p>
                    )}

                    <section>
                        <p className="label-caps text-primary mb-4">Alamat</p>
                        <p className="font-display text-2xl leading-snug">{settings?.store_name || 'Cafe Nusantara'}</p>
                        <p className="mt-2 text-on-surface-variant leading-relaxed">{address || 'Alamat belum diatur. Owner dapat mengisinya di Pengaturan Toko.'}</p>
                        {address && (
                            <a href={mapLinkUrl(address)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] border-b border-primary pb-1 hover:text-primary">
                                Buka di Google Maps <Icon name="north_east" className="text-[16px]" />
                            </a>
                        )}
                    </section>

                    <section className="border-t border-hairline pt-10">
                        <p className="label-caps text-primary mb-4">Jam buka</p>
                        <dl className="divide-y divide-hairline">
                            {hours.map(({ label, value }) => (
                                <div key={label} className="flex justify-between py-3">
                                    <dt className="text-on-surface-variant">{label}</dt>
                                    <dd className="tabular font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    {settings?.store_phone && (
                        <section className="border-t border-hairline pt-10">
                            <p className="label-caps text-primary mb-4">Kontak</p>
                            <a href={`tel:${settings.store_phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 text-lg hover:text-primary">
                                <Icon name="call" className="text-on-surface-variant" /> {settings.store_phone}
                            </a>
                        </section>
                    )}
                </div>

                <div className="aspect-[4/3] lg:aspect-auto lg:h-[620px] overflow-hidden rounded-3xl bg-surface-container border border-hairline">
                    {embed ? (
                        <iframe src={embed} title={`Peta ${settings?.store_name || 'Cafe Nusantara'}`} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
                    ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center text-on-surface-variant gap-3">
                            <Icon name="map" className="text-5xl opacity-40" />
                            <p className="text-sm">Peta tampil setelah alamat diisi di Pengaturan Toko.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Locations;
