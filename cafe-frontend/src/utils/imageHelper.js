export const getImageUrl = (path) => {
    if (!path) {
        return 'https://via.placeholder.com/400x300?text=No+Image';
    }
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    return `${cleanBaseUrl}/storage/${cleanPath}`;
};
