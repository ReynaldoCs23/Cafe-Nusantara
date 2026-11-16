import { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import { apiErrorMessage } from '../../utils/pos';
import { EmptyState, Field, Icon, LoadingBlock, PageHeader, useToast } from '../../components/ui';
import { ContentTabs } from './ReviewsManagement';

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

const Switch = ({ checked, onChange, label }) => (
    <label className="flex items-center justify-between gap-4 text-sm cursor-pointer">
        <span>{label}</span>
        <button type="button" role="switch" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-sage' : 'bg-surface-container-highest'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
    </label>
);

const ImagePicker = ({ id, src, onFile, aspect = 'aspect-video', label = 'Unggah gambar' }) => (
    <label htmlFor={id} className={`relative block w-full ${aspect} rounded-xl overflow-hidden border border-dashed border-hairline bg-surface-container-low cursor-pointer hover:border-ink/40 group`}>
        <input id={id} type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
        {src ? (
            <>
                <img src={src} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-espresso/60 text-cream text-xs py-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">Ganti gambar</span>
            </>
        ) : (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-on-surface-variant">
                <Icon name="add_photo_alternate" className="text-3xl" /> {label}
            </span>
        )}
    </label>
);

/** Konten website: hero slide beranda, galeri foto, dan bagian konten (Tentang Kami, dll). */
const ContentManagement = () => {
    const { notify } = useToast();
    const [section, setSection] = useState('hero');
    const [blocks, setBlocks] = useState(null);
    const [galleries, setGalleries] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [galleryFile, setGalleryFile] = useState(null);
    const [galleryPreview, setGalleryPreview] = useState(null);
    const [busyKey, setBusyKey] = useState(null);

    const fetchBlocks = useCallback(async () => {
        const res = await api.get('/admin/content');
        setBlocks(res.data?.data || []);
    }, []);
    const fetchGalleries = useCallback(async () => {
        const res = await api.get('/galleries');
        setGalleries(res.data?.data || []);
    }, []);
    const fetchHeroSlides = useCallback(async () => {
        const res = await api.get('/hero-slides');
        setHeroSlides(res.data?.data || []);
    }, []);

    useEffect(() => {
        Promise.all([fetchBlocks(), fetchGalleries(), fetchHeroSlides()])
            .catch((err) => notify(apiErrorMessage(err, 'Gagal memuat konten.'), 'error'));
    }, [fetchBlocks, fetchGalleries, fetchHeroSlides, notify]);

    const run = async (key, fn, message) => {
        setBusyKey(key);
        try {
            await fn();
            if (message) notify(message);
        } catch (err) {
            notify(apiErrorMessage(err, 'Gagal menyimpan.'), 'error');
        } finally {
            setBusyKey(null);
        }
    };

    /* ----- Hero slide ----- */
    const updateSlide = (index, patch) => setHeroSlides((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

    const saveSlide = (slide, index) => {
        if (slide.isNew && !slide.imageFile) return notify('Gambar wajib diisi untuk slide baru.', 'error');
        const data = new FormData();
        data.append('title', slide.title || '');
        data.append('subtitle', slide.subtitle || '');
        data.append('button_text', slide.button_text || '');
        data.append('sort_order', slide.sort_order || 0);
        data.append('is_active', slide.is_active ? 1 : 0);
        if (slide.imageFile) data.append('image', slide.imageFile);
        return run(`slide-${index}`, async () => {
            if (slide.isNew) await api.post('/admin/hero-slides', data, multipart);
            else await api.post(`/admin/hero-slides/${slide.id}`, data, multipart);
            await fetchHeroSlides();
        }, slide.isNew ? 'Slide ditambahkan' : 'Slide disimpan');
    };

    const deleteSlide = (slide, index) => {
        if (slide.isNew) return setHeroSlides((prev) => prev.filter((_, i) => i !== index));
        if (!window.confirm('Hapus slide ini?')) return null;
        return run(`slide-${index}`, async () => {
            await api.delete(`/admin/hero-slides/${slide.id}`);
            await fetchHeroSlides();
        }, 'Slide dihapus');
    };

    /* ----- Galeri ----- */
    const uploadGallery = (e) => {
        e.preventDefault();
        if (!galleryFile) return;
        const data = new FormData();
        data.append('image', galleryFile);
        run('gallery', async () => {
            await api.post('/admin/galleries', data, multipart);
            setGalleryFile(null);
            setGalleryPreview(null);
            await fetchGalleries();
        }, 'Foto ditambahkan ke galeri');
    };

    const deleteGallery = (id) => window.confirm('Hapus foto ini dari galeri?') && run(`g-${id}`, async () => {
        await api.delete(`/admin/galleries/${id}`);
        await fetchGalleries();
    }, 'Foto dihapus');

    /* ----- Bagian konten ----- */
    const updateBlock = (index, patch) => setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));

    const saveBlock = (block, index) => {
        const data = new FormData();
        data.append('section_name', block.section_name || '');
        data.append('title', block.title || '');
        data.append('body', block.body || '');
        data.append('sort_order', block.sort_order || 0);
        data.append('is_active', block.is_active ? 1 : 0);
        data.append('show_on_home', block.show_on_home ? 1 : 0);
        if (block.imageFile) data.append('image', block.imageFile);
        return run(`block-${index}`, async () => {
            if (block.isNew) {
                await api.post('/admin/content', data, multipart);
            } else {
                data.append('_method', 'PUT');
                await api.post(`/admin/content/${block.id}`, data, multipart);
            }
            await fetchBlocks();
        }, block.isNew ? 'Bagian ditambahkan' : 'Bagian disimpan');
    };

    const deleteBlock = (block, index) => {
        if (block.isNew) return setBlocks((prev) => prev.filter((_, i) => i !== index));
        if (!window.confirm('Hapus bagian ini secara permanen?')) return null;
        return run(`block-${index}`, async () => {
            await api.delete(`/admin/content/${block.id}`);
            await fetchBlocks();
        }, 'Bagian dihapus');
    };

    if (!blocks) return <LoadingBlock />;

    const addAction = {
        hero: () => setHeroSlides((prev) => [{ isNew: true, title: '', subtitle: '', button_text: '', sort_order: prev.length + 1, is_active: true }, ...prev]),
        blocks: () => setBlocks((prev) => [{ isNew: true, section_name: '', title: '', body: '', sort_order: prev.length + 1, is_active: true, show_on_home: false }, ...prev]),
    }[section];

    return (
        <div className="animate-fade-in max-w-5xl">
            <PageHeader eyebrow="Toko" title="Konten Website" description="Atur tampilan beranda, galeri, dan cerita cafe di website publik."
                actions={addAction && (
                    <button className="btn-primary" onClick={addAction}><Icon name="add" className="text-[18px]" /> {section === 'hero' ? 'Tambah slide' : 'Tambah bagian'}</button>
                )} />
            <ContentTabs />

            <div className="flex gap-1.5 mb-8">
                {[['hero', 'Hero beranda', heroSlides.length], ['gallery', 'Galeri', galleries.length], ['blocks', 'Bagian konten', blocks.length]].map(([key, label, count]) => (
                    <button key={key} className={section === key ? 'tab-active' : 'tab'} onClick={() => setSection(key)}>{label} <span className="opacity-60 tabular">{count}</span></button>
                ))}
            </div>

            {section === 'hero' && (
                <div className="space-y-6">
                    {heroSlides.length === 0 && <div className="card"><EmptyState icon="view_carousel" title="Belum ada slide" description="Slide tampil sebagai gambar besar di bagian atas beranda." /></div>}
                    {heroSlides.map((slide, index) => (
                        <article key={slide.id || `new-${index}`} className="card p-6 grid md:grid-cols-[1fr_1.1fr] gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="label-caps">{slide.isNew ? 'Slide baru' : `Slide ${index + 1}`}</p>
                                    {slide.isNew && <span className="chip border-primary/30 text-primary">Belum disimpan</span>}
                                </div>
                                <Field label="Judul"><input className="input" value={slide.title || ''} onChange={(e) => updateSlide(index, { title: e.target.value })} /></Field>
                                <Field label="Subjudul"><textarea className="input resize-none" rows="3" value={slide.subtitle || ''} onChange={(e) => updateSlide(index, { subtitle: e.target.value })} /></Field>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Teks tombol"><input className="input" value={slide.button_text || ''} onChange={(e) => updateSlide(index, { button_text: e.target.value })} placeholder="Pesan sekarang" /></Field>
                                    <Field label="Urutan"><input className="input tabular" type="number" value={slide.sort_order || 0} onChange={(e) => updateSlide(index, { sort_order: parseInt(e.target.value, 10) || 0 })} /></Field>
                                </div>
                                <Switch label="Tampilkan slide ini" checked={slide.is_active ?? true} onChange={(v) => updateSlide(index, { is_active: v })} />
                            </div>
                            <div className="flex flex-col gap-4">
                                <ImagePicker id={`slide-${index}`} src={slide.previewUrl || (slide.image_path ? getImageUrl(slide.image_path) : null)} label="Unggah gambar latar (wajib)"
                                    onFile={(file) => updateSlide(index, { imageFile: file, previewUrl: URL.createObjectURL(file) })} />
                                <div className="flex justify-end gap-2 mt-auto">
                                    <button className="btn-ghost hover:text-error" onClick={() => deleteSlide(slide, index)} disabled={busyKey === `slide-${index}`}>
                                        <Icon name={slide.isNew ? 'close' : 'delete'} className="text-[18px]" /> {slide.isNew ? 'Batal' : 'Hapus'}
                                    </button>
                                    <button className="btn-primary" onClick={() => saveSlide(slide, index)} disabled={busyKey === `slide-${index}`}>
                                        {busyKey === `slide-${index}` ? 'Menyimpan...' : 'Simpan slide'}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {section === 'gallery' && (
                <div>
                    <form onSubmit={uploadGallery} className="card p-5 mb-6 flex flex-wrap items-center gap-4">
                        <div className="h-14 w-14 rounded-lg overflow-hidden bg-surface-container shrink-0">
                            {galleryPreview ? <img src={galleryPreview} alt="" className="h-full w-full object-cover" /> : <Icon name="image" className="m-4 text-on-surface-variant/50" />}
                        </div>
                        <label className="btn-outline cursor-pointer">
                            <Icon name="folder_open" className="text-[18px]" /> {galleryFile ? galleryFile.name : 'Pilih foto'}
                            <input type="file" accept="image/*" className="sr-only" onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) { setGalleryFile(file); setGalleryPreview(URL.createObjectURL(file)); }
                            }} />
                        </label>
                        <button className="btn-primary ml-auto" disabled={!galleryFile || busyKey === 'gallery'}>
                            <Icon name="upload" className="text-[18px]" /> {busyKey === 'gallery' ? 'Mengunggah...' : 'Tambah ke galeri'}
                        </button>
                    </form>
                    {galleries.length === 0 ? <div className="card"><EmptyState icon="photo_library" title="Galeri masih kosong" /></div> : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {galleries.map((item) => (
                                <div key={item.id} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-container">
                                    <img src={getImageUrl(item.image_path)} alt="" className="h-full w-full object-cover" />
                                    <button onClick={() => deleteGallery(item.id)} disabled={busyKey === `g-${item.id}`} aria-label="Hapus foto"
                                        className="absolute top-2 right-2 h-9 w-9 rounded-full bg-paper/90 text-error flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Icon name="delete" className="text-[18px]" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {section === 'blocks' && (
                <div className="space-y-6">
                    {blocks.length === 0 && <div className="card"><EmptyState icon="article" title="Belum ada bagian konten" /></div>}
                    {blocks.map((block, index) => (
                        <article key={block.id || `new-${index}`} className="card p-6 grid md:grid-cols-[1.2fr_1fr] gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="label-caps">{block.isNew ? 'Bagian baru' : block.section_name || `Bagian #${block.id}`}</p>
                                    {block.isNew && <span className="chip border-primary/30 text-primary">Belum disimpan</span>}
                                </div>
                                <Field label="Nama bagian" hint="Hanya terlihat oleh admin, mis. “Tentang Kami”."><input className="input" value={block.section_name || ''} onChange={(e) => updateBlock(index, { section_name: e.target.value })} /></Field>
                                <Field label="Judul"><input className="input" value={block.title || ''} onChange={(e) => updateBlock(index, { title: e.target.value })} /></Field>
                                <Field label="Isi"><textarea className="input resize-y" rows="7" value={block.body || ''} onChange={(e) => updateBlock(index, { body: e.target.value })} /></Field>
                                <div className="grid grid-cols-[120px_1fr] gap-6 items-end">
                                    <Field label="Urutan"><input className="input tabular" type="number" value={block.sort_order || 0} onChange={(e) => updateBlock(index, { sort_order: parseInt(e.target.value, 10) || 0 })} /></Field>
                                    <div className="space-y-3 pb-1">
                                        <Switch label="Aktif" checked={block.is_active} onChange={(v) => updateBlock(index, { is_active: v })} />
                                        <Switch label="Tampilkan di beranda" checked={block.show_on_home} onChange={(v) => updateBlock(index, { show_on_home: v })} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <ImagePicker id={`block-${index}`} aspect="aspect-[4/3]" src={block.previewUrl || block.image_url || null}
                                    onFile={(file) => updateBlock(index, { imageFile: file, previewUrl: URL.createObjectURL(file) })} />
                                <div className="flex justify-end gap-2 mt-auto">
                                    <button className="btn-ghost hover:text-error" onClick={() => deleteBlock(block, index)} disabled={busyKey === `block-${index}`}>
                                        <Icon name={block.isNew ? 'close' : 'delete'} className="text-[18px]" /> {block.isNew ? 'Batal' : 'Hapus'}
                                    </button>
                                    <button className="btn-primary" onClick={() => saveBlock(block, index)} disabled={busyKey === `block-${index}`}>
                                        {busyKey === `block-${index}` ? 'Menyimpan...' : 'Simpan bagian'}
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContentManagement;
