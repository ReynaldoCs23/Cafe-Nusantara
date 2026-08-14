import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const CatalogManagement = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        category_id: '',
        price: '',
        stock_quantity: '',
        description: '',
        is_active: true,
        is_recommended: false,
        image: null
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [prodRes, catRes] = await Promise.all([
                api.get('/admin/products'),
                api.get('/admin/categories')
            ]);
            setProducts(prodRes.data?.data || prodRes.data || []);
            setCategories(catRes.data?.data || catRes.data || []);
        } catch (err) {
            console.error('Fetch Error Catalog:', err.response || err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (product) => {
        try {
            await api.put(`/admin/products/${product.id}`, {
                ...product,
                category_id: product.category_id,
                is_active: !product.is_active
            });
            setProducts(products.map(p => 
                p.id === product.id ? { ...p, is_active: !p.is_active } : p
            ));
            showToast(`Status updated for ${product.name}`);
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/admin/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
            showToast('Product deleted successfully');
        } catch (err) {
            alert('Failed to delete product');
        }
    };

    const openModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                ...product,
                category_id: product.category?.id || '',
                image: null
            });
            setImagePreview(product.image_url || null);
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                category_id: categories.length > 0 ? categories[0].id : '',
                price: '',
                stock_quantity: '',
                description: '',
                is_active: true,
                is_recommended: false,
                image: null
            });
            setImagePreview(null);
        }
        setIsModalOpen(true);
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, image: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            for (const key in formData) {
                if (key === 'is_active' || key === 'is_recommended') {
                    data.append(key, formData[key] ? 1 : 0);
                } else if (key === 'image' && formData[key]) {
                    data.append(key, formData[key]);
                } else if (key !== 'image' && formData[key] !== null && formData[key] !== '') {
                    data.append(key, formData[key]);
                }
            }

            if (editingProduct) {
                data.append('_method', 'PUT'); // Laravel FormData PUT workaround
                const res = await api.post(`/admin/products/${editingProduct.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProducts(products.map(p => p.id === editingProduct.id ? res.data.data : p));
                showToast('Product updated');
            } else {
                const res = await api.post('/admin/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setProducts([...products, res.data.data]);
                showToast('Product added');
                fetchData(); 
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save product. Check inputs.');
        }
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    if (loading) return <div className="p-12 text-center text-on-surface-variant animate-pulse font-label-caps">Loading catalog...</div>;

    return (
        <div className="animate-fade-in font-body-md text-on-surface">
            {toast && (
                <div className="fixed top-20 right-8 bg-secondary text-on-secondary px-6 py-3 rounded shadow-md z-50 animate-fade-in font-label-caps flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    {toast}
                </div>
            )}

            {/* Page Header */}
            <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="font-headline-lg text-[32px] text-on-surface mb-2">Manajemen Menu</h2>
                    <p className="font-body-md text-on-surface-variant">Manage your product catalog, monitor stock levels, and update pricing.</p>
                </div>
                <button onClick={() => openModal()} className="bg-primary text-on-primary px-6 py-3 font-label-caps rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">add</span>
                    Tambah Menu Baru
                </button>
            </div>

            {/* Data Table */}
            <div className="w-full bg-surface rounded border border-outline-variant overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-surface-container-low border-b border-outline-variant">
                                <th className="font-label-caps text-on-surface-variant py-4 px-6 w-16">Image</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6">Product Details</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6">Category</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6">Price</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6">Stock</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6 text-center">Rekomendasi</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6">Status</th>
                                <th className="font-label-caps text-on-surface-variant py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                            {products.map(product => {
                                const isOutOfStock = product.stock_quantity <= 0;
                                return (
                                    <tr key={product.id} className={`hover:bg-surface-container-lowest transition-colors group ${isOutOfStock ? 'bg-error-container/10' : ''}`}>
                                        <td className="py-4 px-6">
                                            {product.image_url ? (
                                                <img src={product.image_url} alt={product.name} className={`w-12 h-12 rounded object-cover ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
                                            ) : (
                                                <div className="w-12 h-12 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
                                                    <span className="material-symbols-outlined text-outline opacity-50">image</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className={`font-body-md font-medium text-on-surface ${isOutOfStock ? 'opacity-60' : ''}`}>{product.name}</div>
                                            <div className={`font-label-sm text-on-surface-variant ${isOutOfStock ? 'opacity-60' : ''}`}>SKU: PROD-{product.id.toString().padStart(3, '0')}</div>
                                        </td>
                                        <td className={`py-4 px-6 font-label-sm text-on-surface-variant ${isOutOfStock ? 'opacity-60' : ''}`}>
                                            {product.category?.name || 'Uncategorized'}
                                        </td>
                                        <td className={`py-4 px-6 font-body-md ${isOutOfStock ? 'opacity-60' : ''}`}>Rp {Number(product.price).toLocaleString('id-ID')}</td>
                                        <td className="py-4 px-6 font-label-sm">
                                            <span className={isOutOfStock ? 'text-error font-bold' : 'text-on-surface font-medium'}>{product.stock_quantity}</span> pcs
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <label className="relative inline-flex items-center cursor-not-allowed">
                                                <input type="checkbox" className="sr-only peer" checked={product.is_recommended} readOnly />
                                                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </td>
                                        <td className="py-4 px-6">
                                            <label className="relative inline-flex items-center cursor-pointer mb-1 mr-3 block">
                                                <input type="checkbox" className="sr-only peer" checked={product.is_active} onChange={() => handleToggleActive(product)} />
                                                <div className="w-9 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
                                            </label>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase ${isOutOfStock ? 'bg-error-container text-on-error-container' : (product.is_active ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant')}`}>
                                                {isOutOfStock ? 'Stok Habis' : (product.is_active ? 'Tersedia' : 'Nonaktif')}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openModal(product)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded">
                                                    <span className="material-symbols-outlined text-[20px]">edit</span>
                                                </button>
                                                <button onClick={() => handleDelete(product.id)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded">
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-on-surface-variant">Belum ada produk di katalog.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Professional Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded-lg max-w-4xl w-full animate-fade-in shadow-xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-8 border-b border-outline-variant bg-surface-container-low shrink-0 rounded-t-lg">
                            <div>
                                <h3 className="font-headline-md text-on-surface">{editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}</h3>
                                <p className="font-body-md text-on-surface-variant mt-1">Lengkapi informasi detail produk di bawah ini.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-error transition-colors p-2 bg-surface rounded-full border border-outline-variant">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <form id="productForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                
                                {/* Left Column: Image & Status */}
                                <div className="space-y-8">
                                    {/* Image Upload Area */}
                                    <div>
                                        <label className="block font-label-caps text-outline mb-3 tracking-widest">Foto Produk</label>
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                id="imageUpload" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleImageChange} 
                                            />
                                            <label htmlFor="imageUpload" className={`w-full aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${imagePreview ? 'border-primary bg-surface-container-lowest' : 'border-outline-variant bg-surface-container-low hover:bg-surface-container'}`}>
                                                {imagePreview ? (
                                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    <div className="text-center p-6">
                                                        <span className="material-symbols-outlined text-outline text-4xl mb-2">cloud_upload</span>
                                                        <p className="font-label-sm text-on-surface-variant">Klik untuk mengunggah gambar</p>
                                                        <p className="font-label-caps text-outline mt-1 text-[10px]">JPG, PNG, WEBP max 2MB</p>
                                                    </div>
                                                )}
                                                {imagePreview && (
                                                    <div className="absolute inset-0 bg-on-surface bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                                                        <span className="bg-surface text-on-surface font-label-sm px-4 py-2 rounded shadow flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                                            Ganti Foto
                                                        </span>
                                                    </div>
                                                )}
                                            </label>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="bg-surface-container-low p-6 rounded-lg border border-outline-variant space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-label-sm text-on-surface font-bold">Status Produk</p>
                                                <p className="font-label-caps text-outline text-[10px]">Tampilkan produk di menu publik</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} />
                                                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                                            </label>
                                        </div>
                                        
                                        <div className="border-t border-outline-variant pt-6 flex items-center justify-between">
                                            <div>
                                                <p className="font-label-sm text-on-surface font-bold flex items-center gap-1">
                                                    Rekomendasi <span className="material-symbols-outlined text-primary text-[14px]">star</span>
                                                </p>
                                                <p className="font-label-caps text-outline text-[10px]">Tandai sebagai menu andalan</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={formData.is_recommended} onChange={e => setFormData({...formData, is_recommended: e.target.checked})} />
                                                <div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Details */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block font-label-caps text-outline mb-2 tracking-widest">Nama Produk</label>
                                        <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-transparent border-b border-outline-variant py-2 focus:outline-none focus:border-primary text-body-lg font-body-lg transition-colors placeholder:text-outline-variant" placeholder="Mis. Signature Iced Latte" />
                                    </div>
                                    
                                    <div>
                                        <label className="block font-label-caps text-outline mb-2 tracking-widest">Kategori</label>
                                        <div className="relative">
                                            <select required value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} className="w-full bg-transparent border-b border-outline-variant py-2 focus:outline-none focus:border-primary text-body-lg font-body-lg appearance-none cursor-pointer">
                                                <option value="" disabled>Pilih Kategori</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-3 text-outline pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-6">
                                        <div className="flex-1">
                                            <label className="block font-label-caps text-outline mb-2 tracking-widest">Harga (Rp)</label>
                                            <div className="relative">
                                                <span className="absolute left-0 top-2.5 text-on-surface-variant font-body-lg">Rp</span>
                                                <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full bg-transparent border-b border-outline-variant py-2 pl-8 focus:outline-none focus:border-primary text-body-lg font-body-lg transition-colors" placeholder="0" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block font-label-caps text-outline mb-2 tracking-widest">Stok (Pcs)</label>
                                            <input type="number" required min="0" value={formData.stock_quantity} onChange={e => setFormData({...formData, stock_quantity: e.target.value})} className="w-full bg-transparent border-b border-outline-variant py-2 focus:outline-none focus:border-primary text-body-lg font-body-lg transition-colors" placeholder="0" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block font-label-caps text-outline mb-2 tracking-widest">Deskripsi (Opsional)</label>
                                        <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-4 focus:outline-none focus:border-primary text-body-md font-body-md resize-none h-32 custom-scrollbar transition-colors" placeholder="Tuliskan deskripsi rasa dan komposisi produk..."></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="flex justify-end gap-4 p-6 border-t border-outline-variant bg-surface-container-lowest shrink-0 rounded-b-lg">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-label-caps text-on-surface-variant hover:text-on-surface transition-colors">Batal</button>
                            <button type="submit" form="productForm" className="px-8 py-3 bg-primary text-on-primary rounded font-label-caps tracking-widest hover:bg-primary-container transition-colors shadow-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Simpan Produk
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CatalogManagement;
