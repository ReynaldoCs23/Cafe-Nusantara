import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { getImageUrl } from '../../utils/imageHelper';
import ContentCard from '../../components/ui/ContentCard';

const ContentManagement = () => {
    const [blocks, setBlocks] = useState([]);
    const [galleries, setGalleries] = useState([]);
    const [heroSlides, setHeroSlides] = useState([]);
    const [galleryFile, setGalleryFile] = useState(null);
    const [galleryPreview, setGalleryPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');

    useEffect(() => {
        fetchBlocks();
        fetchGalleries();
        fetchHeroSlides();
    }, []);

    const fetchBlocks = async () => {
        try {
            const res = await api.get('/admin/content');
            setBlocks(res.data?.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch blocks', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGalleries = async () => {
        try {
            const res = await api.get('/galleries');
            setGalleries(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch galleries', err);
        }
    };

    const fetchHeroSlides = async () => {
        try {
            const res = await api.get('/hero-slides');
            setHeroSlides(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch hero slides', err);
        }
    };

    const handleAddHeroSlide = () => {
        const newSlide = {
            isNew: true,
            title: '',
            subtitle: '',
            button_text: '',
            sort_order: heroSlides.length + 1,
            is_active: true,
            imageFile: null
        };
        setHeroSlides([newSlide, ...heroSlides]);
    };

    const handleRemoveNewHeroSlide = (index) => {
        const updated = [...heroSlides];
        updated.splice(index, 1);
        setHeroSlides(updated);
    };

    const handleDeleteHeroSlide = async (id) => {
        if (!window.confirm('Yakin ingin menghapus hero slide ini?')) return;
        try {
            await api.delete(`/admin/hero-slides/${id}`);
            showToast('Hero slide berhasil dihapus');
            fetchHeroSlides();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal menghapus hero slide');
        }
    };

    const handleSaveHeroSlide = async (slide, index) => {
        try {
            const formData = new FormData();
            formData.append('title', slide.title || '');
            formData.append('subtitle', slide.subtitle || '');
            formData.append('button_text', slide.button_text || '');
            formData.append('sort_order', slide.sort_order || 0);
            formData.append('is_active', slide.is_active ? 1 : 0);
            
            if (slide.imageFile) {
                formData.append('image', slide.imageFile);
            }

            if (slide.isNew) {
                if (!slide.imageFile) {
                    alert('Gambar wajib diisi untuk slide baru');
                    return;
                }
                await api.post('/admin/hero-slides', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showToast('Hero slide baru berhasil ditambahkan');
            } else {
                await api.post(`/admin/hero-slides/${slide.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showToast('Perubahan berhasil disimpan');
            }
            
            fetchHeroSlides();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal menyimpan hero slide');
        }
    };

    const handleHeroSlideChange = (index, field, value) => {
        const updated = [...heroSlides];
        updated[index] = { ...updated[index], [field]: value };
        setHeroSlides(updated);
    };

    const handleHeroSlideFileChange = (index, file) => {
        const updated = [...heroSlides];
        if (file) {
            updated[index] = { 
                ...updated[index], 
                imageFile: file,
                previewUrl: URL.createObjectURL(file) 
            };
        }
        setHeroSlides(updated);
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleAddBlock = () => {
        const newBlock = {
            isNew: true,
            section_name: '',
            title: '',
            body: '',
            sort_order: blocks.length + 1,
            is_active: true,
            show_on_home: false,
            image: null
        };
        // Prepend to list
        setBlocks([newBlock, ...blocks]);
    };

    const handleRemoveNewBlock = (index) => {
        const updated = [...blocks];
        updated.splice(index, 1);
        setBlocks(updated);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus bagian ini secara permanen?')) return;
        try {
            await api.delete(`/admin/content/${id}`);
            showToast('Bagian berhasil dihapus');
            fetchBlocks();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal menghapus konten');
        }
    };

    const handleSave = async (block, index) => {
        try {
            const formData = new FormData();
            formData.append('section_name', block.section_name || '');
            formData.append('title', block.title || '');
            formData.append('body', block.body || '');
            formData.append('sort_order', block.sort_order || 0);
            formData.append('is_active', block.is_active ? 1 : 0);
            formData.append('show_on_home', block.show_on_home ? 1 : 0);
            
            if (block.imageFile) {
                formData.append('image', block.imageFile);
            }

            if (block.isNew) {
                await api.post('/admin/content', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showToast('Bagian baru berhasil ditambahkan');
            } else {
                // crucial fix: fake PUT via POST for Laravel file upload
                formData.append('_method', 'PUT');
                await api.post(`/admin/content/${block.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                showToast('Perubahan berhasil disimpan');
            }
            
            fetchBlocks();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal menyimpan konten');
        }
    };

    const handleInputChange = (index, field, value) => {
        const updated = [...blocks];
        updated[index] = { ...updated[index], [field]: value };
        setBlocks(updated);
    };

    const handleFileChange = (index, file) => {
        const updated = [...blocks];
        if (file) {
            updated[index] = { 
                ...updated[index], 
                imageFile: file,
                previewUrl: URL.createObjectURL(file) 
            };
        }
        setBlocks(updated);
    };

    const handleGalleryUpload = async (e) => {
        e.preventDefault();
        if (!galleryFile) return;

        try {
            const formData = new FormData();
            formData.append('image', galleryFile);
            
            await api.post('/admin/galleries', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            showToast('Gambar galeri berhasil ditambahkan');
            setGalleryFile(null);
            setGalleryPreview(null);
            fetchGalleries();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Gagal mengunggah gambar');
        }
    };

    const handleDeleteGallery = async (id) => {
        if (!window.confirm('Hapus gambar ini dari galeri?')) return;
        try {
            await api.delete(`/admin/galleries/${id}`);
            showToast('Gambar berhasil dihapus');
            fetchGalleries();
        } catch (err) {
            console.error(err);
            alert('Gagal menghapus gambar');
        }
    };

    if (loading) return <div className="p-12 text-center text-on-surface-variant font-label-caps">Loading content...</div>;

    return (
        <div className="animate-fade-in font-body-md text-on-surface max-w-5xl mx-auto pb-24">
            {toast && (
                <div className="fixed top-20 right-8 bg-secondary text-on-secondary px-6 py-3 rounded shadow-md z-50 animate-fade-in font-label-caps flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    {toast}
                </div>
            )}

            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="font-headline-lg text-[32px] text-on-surface mb-8">Content Management</h2>
                    <div className="flex space-x-8 border-b border-outline-variant">
                        <Link to="/admin/content" className="pb-4 font-label-caps text-primary border-b-2 border-primary tracking-widest uppercase">
                            Konten Website
                        </Link>
                        <Link to="/admin/reviews" className="pb-4 font-label-caps text-on-surface-variant hover:text-on-surface transition-colors tracking-widest uppercase">
                            Moderasi Ulasan
                        </Link>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleAddHeroSlide} className="bg-secondary text-white px-6 py-3 rounded font-bold uppercase tracking-wider text-sm hover:bg-[#4b5924] transition-colors flex items-center gap-2 shadow-md">
                        <span className="material-symbols-outlined">add_photo_alternate</span>
                        Tambah Hero Slide
                    </button>
                    <button onClick={handleAddBlock} className="bg-primary text-white px-6 py-3 rounded font-bold uppercase tracking-wider text-sm hover:bg-amber-800 transition-colors flex items-center gap-2 shadow-md">
                        <span className="material-symbols-outlined">add</span>
                        Tambah Bagian Baru
                    </button>
                </div>
            </div>

            <div className="space-y-12">
                {/* Hero Slides Management Section */}
                <section className="bg-surface border border-outline-variant rounded-xl p-8 shadow-sm">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="font-headline-md text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">view_carousel</span>
                            Manajemen Hero Slides
                        </h3>
                    </div>

                    <div className="space-y-8">
                        {heroSlides.map((slide, index) => (
                            <div key={slide.id || `new-slide-${index}`} className="border border-gray-200 rounded-xl p-6 bg-white relative">
                                <div className="absolute top-6 right-6 flex gap-4">
                                    {slide.isNew ? (
                                        <button onClick={() => handleRemoveNewHeroSlide(index)} className="text-red-500 hover:text-red-700 font-bold uppercase text-sm tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">close</span> Batal
                                        </button>
                                    ) : (
                                        <button onClick={() => handleDeleteHeroSlide(slide.id)} className="text-red-500 hover:text-red-700 font-bold uppercase text-sm tracking-wider flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">delete</span> Hapus
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Title (Besar)</label>
                                            <input 
                                                value={slide.title || ''} 
                                                onChange={(e) => handleHeroSlideChange(index, 'title', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                                type="text" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Subtitle (Kecil)</label>
                                            <textarea 
                                                value={slide.subtitle || ''} 
                                                onChange={(e) => handleHeroSlideChange(index, 'subtitle', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600 resize-none" 
                                                rows="3"
                                            ></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Button Text</label>
                                                <input 
                                                    value={slide.button_text || ''} 
                                                    onChange={(e) => handleHeroSlideChange(index, 'button_text', e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                                    type="text" placeholder="Pesan Sekarang"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Sort Order</label>
                                                <input 
                                                    value={slide.sort_order || 0} 
                                                    onChange={(e) => handleHeroSlideChange(index, 'sort_order', parseInt(e.target.value) || 0)}
                                                    className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                                    type="number" 
                                                />
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700 mt-4">
                                            <input 
                                                type="checkbox" 
                                                checked={slide.is_active ?? true} 
                                                onChange={(e) => handleHeroSlideChange(index, 'is_active', e.target.checked)}
                                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                            />
                                            Aktifkan Slide Ini
                                        </label>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Gambar Background (Wajib)</label>
                                        <div className="relative">
                                            <input type="file" id={`slide-image-${index}`} className="hidden" accept="image/*" onChange={(e) => handleHeroSlideFileChange(index, e.target.files[0])} />
                                            <label htmlFor={`slide-image-${index}`} className={`w-full aspect-video border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-colors ${(slide.previewUrl || slide.image_path) ? 'border-amber-600 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                                                {(slide.previewUrl || slide.image_path) ? (
                                                    <img src={slide.previewUrl || getImageUrl(slide.image_path)} alt="Preview" className="w-full h-full object-cover rounded" />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">add_photo_alternate</span>
                                                        <p className="text-sm text-gray-500">Klik untuk unggah gambar latar</p>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                                    <button 
                                        onClick={() => handleSaveHeroSlide(slide, index)}
                                        className="bg-primary text-white px-8 py-2 rounded font-bold tracking-wider hover:bg-amber-800 transition-all shadow-sm flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">save</span>
                                        {slide.isNew ? 'Simpan Slide Baru' : 'Update Slide'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {heroSlides.length === 0 && (
                            <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-xl">Belum ada Hero Slide. Klik "Tambah Hero Slide" untuk membuat.</div>
                        )}
                    </div>
                </section>

                {/* Gallery Management Section */}
                <section className="bg-surface border border-outline-variant rounded-xl p-8 shadow-sm">
                    <div className="mb-6 border-b border-gray-100 pb-4">
                        <h3 className="font-headline-md text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-600">photo_library</span>
                            Galeri #CeritaNusantara
                        </h3>
                    </div>

                    <form onSubmit={handleGalleryUpload} className="mb-8 flex items-end gap-4 bg-gray-50 p-6 rounded-xl border border-gray-100">
                        <div className="flex-grow max-w-md">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Unggah Gambar Baru</label>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files[0]) {
                                        setGalleryFile(e.target.files[0]);
                                        setGalleryPreview(URL.createObjectURL(e.target.files[0]));
                                    }
                                }}
                                className="w-full bg-white border border-gray-300 rounded px-4 py-2"
                            />
                        </div>
                        {galleryPreview && (
                            <img src={galleryPreview} alt="Preview" className="w-12 h-12 object-cover rounded border border-gray-300 shadow-sm" />
                        )}
                        <button 
                            type="submit" 
                            disabled={!galleryFile}
                            className="bg-primary text-white px-6 py-2 rounded font-bold tracking-wider hover:bg-amber-800 transition-colors shadow-sm disabled:opacity-50 h-[42px] flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">upload</span>
                            Tambah Gambar
                        </button>
                    </form>

                    {galleries.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">Belum ada gambar di galeri.</div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {galleries.map(item => (
                                <div key={item.id} className="relative group aspect-square rounded overflow-hidden shadow-sm border border-gray-200">
                                    <img 
                                        src={getImageUrl(item.image_path)} 
                                        alt="Gallery" 
                                        className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            onClick={() => handleDeleteGallery(item.id)}
                                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 shadow-lg flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Content Blocks */}
                {blocks.map((block, index) => (
                    <section key={block.id || `new-${index}`} className="bg-surface border border-outline-variant rounded-xl p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                            <h3 className="font-headline-md text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <span className="material-symbols-outlined text-gray-400">drag_indicator</span>
                                {block.isNew ? 'Bagian Baru' : (block.section_name || `Section #${block.id}`)}
                            </h3>
                            <div className="flex items-center gap-4">
                                {block.isNew ? (
                                    <button onClick={() => handleRemoveNewBlock(index)} className="text-red-500 hover:text-red-700 font-bold uppercase text-sm tracking-wider flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">close</span> Batal
                                    </button>
                                ) : (
                                    <button onClick={() => handleDelete(block.id)} className="text-red-500 hover:text-red-700 font-bold uppercase text-sm tracking-wider flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[18px]">delete</span> Hapus
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Nama Section <span className="text-gray-400 font-normal text-xs">(Internal Admin)</span></label>
                                    <input 
                                        value={block.section_name || ''} 
                                        onChange={(e) => handleInputChange(index, 'section_name', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                        type="text" placeholder="Misal: Hero Section"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Headline / Title</label>
                                    <input 
                                        value={block.title || ''} 
                                        onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                        type="text" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Body Text</label>
                                    <textarea 
                                        value={block.body || ''} 
                                        onChange={(e) => handleInputChange(index, 'body', e.target.value)}
                                        className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600 resize-none" 
                                        rows="8"
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Urutan (Sort Order)</label>
                                        <input 
                                            value={block.sort_order || 0} 
                                            onChange={(e) => handleInputChange(index, 'sort_order', parseInt(e.target.value) || 0)}
                                            className="w-full border border-gray-300 rounded px-4 py-2 focus:outline-none focus:border-amber-600" 
                                            type="number" 
                                        />
                                    </div>
                                    <div className="flex flex-col gap-4 pt-6 justify-center">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700">
                                            <input 
                                                type="checkbox" 
                                                checked={block.is_active} 
                                                onChange={(e) => handleInputChange(index, 'is_active', e.target.checked)}
                                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500"
                                            />
                                            Aktifkan Seksi Ini
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700">
                                            <div className="relative">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only" 
                                                    checked={block.show_on_home || false}
                                                    onChange={(e) => handleInputChange(index, 'show_on_home', e.target.checked)}
                                                />
                                                <div className={`block w-10 h-6 rounded-full transition-colors ${block.show_on_home ? 'bg-amber-600' : 'bg-gray-300'}`}></div>
                                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${block.show_on_home ? 'transform translate-x-4' : ''}`}></div>
                                            </div>
                                            Tampilkan di Beranda
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Gambar</label>
                                <div className="relative">
                                    <input type="file" id={`image-${index}`} className="hidden" accept="image/*" onChange={(e) => handleFileChange(index, e.target.files[0])} />
                                    <label htmlFor={`image-${index}`} className={`w-full aspect-[4/3] border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer transition-colors ${(block.previewUrl || block.image_url) ? 'border-amber-600 bg-amber-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`}>
                                        {(block.previewUrl || block.image_url) ? (
                                            <img src={block.previewUrl || block.image_url} alt="Preview" className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <div className="text-center p-6">
                                                <span className="material-symbols-outlined text-gray-400 text-3xl mb-2">add_photo_alternate</span>
                                                <p className="text-sm text-gray-500">Klik untuk unggah gambar</p>
                                            </div>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => handleSave(block, index)}
                                className="bg-amber-700 text-white px-8 py-3 rounded font-bold tracking-wider hover:bg-amber-800 transition-all shadow-sm flex items-center gap-2 mb-8"
                            >
                                <span className="material-symbols-outlined">save</span>
                                {block.isNew ? 'Simpan Bagian Baru' : 'Update Bagian Ini'}
                            </button>
                        </div>
                        
                        {/* Live Preview for the Admin */}
                        <div className="mt-8">
                            <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-widest border-b border-gray-100 pb-2">Preview (Tampilan Pengunjung)</h4>
                            <div className="bg-[#fdfbf7] p-4 md:p-8 rounded-xl border border-gray-200">
                                <ContentCard block={{
                                    ...block, 
                                    image_url: block.previewUrl || block.image_url 
                                }} index={index} />
                            </div>
                        </div>
                    </section>
                ))}

                {blocks.length === 0 && (
                    <div className="text-center py-24 bg-surface border border-dashed border-outline-variant rounded-xl">
                        <span className="material-symbols-outlined text-gray-400 text-6xl mb-4">post_add</span>
                        <p className="text-gray-500 text-lg">Belum ada konten. Klik "Tambah Bagian Baru" untuk memulai.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContentManagement;
