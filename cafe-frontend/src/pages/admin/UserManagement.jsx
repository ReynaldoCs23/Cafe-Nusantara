import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'admin'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(res.data.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.delete(`/admin/users/${id}`);
            setUsers(users.filter(u => u.id !== id));
            showToast('User deleted successfully');
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const openModal = (user = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                username: user.username || '',
                email: user.email,
                password: '',
                role: user.role
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: '',
                username: '',
                email: '',
                password: '',
                role: 'admin'
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                const payload = { ...formData };
                if (!payload.password) delete payload.password; // Don't send empty password
                const res = await api.put(`/admin/users/${editingUser.id}`, payload);
                setUsers(users.map(u => u.id === editingUser.id ? res.data.data : u));
                showToast('User updated');
            } else {
                const res = await api.post('/admin/users', formData);
                setUsers([...users, res.data.data]);
                showToast(`User created with username: ${res.data.data.username}`);
            }
            setIsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Failed to save user. Check inputs.');
        }
    };

    const showToast = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    if (loading) return <div className="p-12 text-center text-on-surface-variant font-label-caps">Loading users...</div>;

    return (
        <div className="animate-fade-in font-body-md text-on-surface">
            {toast && (
                <div className="fixed top-20 right-8 bg-secondary text-on-secondary px-6 py-3 rounded shadow-md z-50 animate-fade-in font-label-caps flex items-center gap-2">
                    <span className="material-symbols-outlined">check_circle</span>
                    {toast}
                </div>
            )}

            <div className="flex justify-between items-end mb-12">
                <div>
                    <h2 className="font-headline-lg text-[32px] text-on-surface mb-2">User Management</h2>
                    <p className="font-body-md text-on-surface-variant">Manage administrator and staff accounts.</p>
                </div>
                <button onClick={() => openModal()} className="bg-primary text-on-primary px-6 py-3 font-label-caps rounded flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm">
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    Tambah User
                </button>
            </div>

            <div className="w-full bg-surface rounded border border-outline-variant overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-surface-container-low border-b border-outline-variant">
                            <th className="font-label-caps text-on-surface-variant py-4 px-6">Name</th>
                            <th className="font-label-caps text-on-surface-variant py-4 px-6">Username</th>
                            <th className="font-label-caps text-on-surface-variant py-4 px-6">Email</th>
                            <th className="font-label-caps text-on-surface-variant py-4 px-6">Role</th>
                            <th className="font-label-caps text-on-surface-variant py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-surface-container-lowest transition-colors group">
                                <td className="py-4 px-6 font-medium">{user.name}</td>
                                <td className="py-4 px-6 text-primary">{user.username}</td>
                                <td className="py-4 px-6">{user.email}</td>
                                <td className="py-4 px-6">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${user.role === 'admin' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-high text-on-surface'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openModal(user)} className="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded">
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                        <button onClick={() => handleDelete(user.id)} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded">
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface rounded max-w-md w-full p-6 animate-fade-in shadow-lg">
                        <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
                            <h3 className="font-headline-md text-on-surface">{editingUser ? 'Edit User' : 'Tambah User Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-error">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block font-label-sm text-on-surface-variant mb-1">Nama Lengkap</label>
                                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-outline-variant rounded p-2 focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                                <label className="block font-label-sm text-on-surface-variant mb-1">Username</label>
                                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-outline-variant rounded p-2 focus:border-primary focus:outline-none" placeholder={editingUser ? '' : 'Auto-generated if empty'} />
                            </div>
                            <div>
                                <label className="block font-label-sm text-on-surface-variant mb-1">Email</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-outline-variant rounded p-2 focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                                <label className="block font-label-sm text-on-surface-variant mb-1">
                                    Password {editingUser && <span className="text-[10px] text-primary">(Kosongkan jika tidak ingin mengubah)</span>}
                                </label>
                                <input type={editingUser ? "password" : "text"} required={!editingUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-outline-variant rounded p-2 focus:border-primary focus:outline-none" />
                            </div>
                            <div>
                                <label className="block font-label-sm text-on-surface-variant mb-1">Role</label>
                                <select required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border border-outline-variant rounded p-2 focus:border-primary focus:outline-none bg-surface">
                                    <option value="admin">Admin</option>
                                    <option value="customer">Customer</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-4 pt-4 border-t border-outline-variant">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-label-caps text-on-surface-variant hover:text-on-surface">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-primary text-on-primary rounded font-label-caps hover:bg-primary-container">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
