/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { ORDER_STATUS } from '../../utils/pos';

/* ---------- Ikon ---------- */
export const Icon = ({ name, className = '', filled = false }) => (
    <span
        className={`material-symbols-outlined ${className}`}
        style={filled ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : undefined}
        aria-hidden="true"
    >
        {name}
    </span>
);

/* ---------- Badge status pesanan ---------- */
export const StatusBadge = ({ status, className = '' }) => {
    const s = ORDER_STATUS[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
    return <span className={`chip ${s.className} ${className}`}>{s.label}</span>;
};

/* ---------- Header halaman ---------- */
export const PageHeader = ({ eyebrow, title, description, actions }) => (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
            {eyebrow && <p className="label-caps mb-2">{eyebrow}</p>}
            <h1 className="page-title">{title}</h1>
            {description && <p className="text-on-surface-variant mt-2 max-w-2xl">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
);

/* ---------- Kartu statistik ---------- */
export const StatCard = ({ label, value, hint, icon, tone = 'default' }) => {
    const tones = {
        default: 'text-ink',
        primary: 'text-primary',
        sage: 'text-sage',
        warning: 'text-amber-700',
    };
    return (
        <div className="card p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <p className="label-caps">{label}</p>
                {icon && <Icon name={icon} className="text-on-surface-variant/70 text-[20px]" />}
            </div>
            <p className={`font-display text-[32px] leading-none tabular ${tones[tone]}`}>{value}</p>
            {hint && <p className="text-xs text-on-surface-variant">{hint}</p>}
        </div>
    );
};

/* ---------- Kosong ---------- */
export const EmptyState = ({ icon = 'inbox', title, description, action, dark = false }) => (
    <div className={`flex flex-col items-center justify-center text-center py-16 px-6 ${dark ? 'text-stone-400' : 'text-on-surface-variant'}`}>
        <Icon name={icon} className="text-5xl opacity-40 mb-4" />
        <p className={`font-display text-xl mb-1 ${dark ? 'text-stone-200' : 'text-ink'}`}>{title}</p>
        {description && <p className="text-sm max-w-sm">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </div>
);

/* ---------- Spinner ---------- */
export const Spinner = ({ className = '' }) => (
    <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} role="status" aria-label="Memuat" />
);

export const LoadingBlock = ({ label = 'Memuat...' }) => (
    <div className="flex items-center justify-center gap-3 py-24 text-on-surface-variant">
        <Spinner /> <span className="text-sm">{label}</span>
    </div>
);

/* ---------- Modal ---------- */
export const Modal = ({ open = true, title, subtitle, onClose, children, footer, size = 'md' }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose?.();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

    return (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-espresso/45 backdrop-blur-[2px] p-0 sm:p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0" onClick={onClose} />
            <div className={`relative w-full ${widths[size]} bg-cream rounded-t-2xl sm:rounded-2xl border border-hairline animate-slide-up max-h-[92vh] flex flex-col`}>
                <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-hairline">
                    <div>
                        <h2 className="font-display text-2xl text-ink leading-tight">{title}</h2>
                        {subtitle && <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>}
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="btn-icon btn-ghost -mr-2" aria-label="Tutup">
                            <Icon name="close" />
                        </button>
                    )}
                </div>
                <div className="px-6 py-5 overflow-y-auto scroll-thin">{children}</div>
                {footer && <div className="px-6 py-4 border-t border-hairline flex flex-wrap justify-end gap-3">{footer}</div>}
            </div>
        </div>
    );
};

/* ---------- Field ---------- */
export const Field = ({ label, hint, error, children, className = '' }) => (
    <label className={`block ${className}`}>
        {label && <span className="label-caps block mb-1.5">{label}</span>}
        {children}
        {hint && !error && <span className="block text-xs text-on-surface-variant mt-1">{hint}</span>}
        {error && <span className="block text-xs text-error mt-1">{error}</span>}
    </label>
);

/* ---------- Segmented control ---------- */
export const Segmented = ({ options, value, onChange, size = 'md', dark = false }) => (
    <div className={`inline-flex rounded-full p-1 ${dark ? 'bg-espresso-3' : 'bg-surface-container'}`}>
        {options.map(([key, label, icon]) => {
            const active = value === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => onChange(key)}
                    className={`flex items-center gap-1.5 rounded-full font-medium transition-colors ${size === 'lg' ? 'px-5 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'} ${
                        active
                            ? dark ? 'bg-cream text-espresso' : 'bg-paper text-ink shadow-[0_1px_0_rgba(0,0,0,0.04)]'
                            : dark ? 'text-stone-300 hover:text-white' : 'text-on-surface-variant hover:text-ink'
                    }`}
                >
                    {icon && <Icon name={icon} className="text-[18px]" />}
                    {label}
                </button>
            );
        })}
    </div>
);

/* ---------- Toast ---------- */
const ToastContext = createContext({ notify: () => {} });

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const notify = useCallback((message, type = 'success') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), type === 'error' ? 5000 : 3200);
    }, []);

    return (
        <ToastContext.Provider value={{ notify }}>
            {children}
            <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]" aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`animate-slide-up flex items-start gap-3 rounded-xl px-4 py-3 text-sm border ${
                        t.type === 'error' ? 'bg-[#fff4f2] border-error/30 text-error' : 'bg-espresso text-cream border-espresso'
                    }`}>
                        <Icon name={t.type === 'error' ? 'error' : 'check_circle'} className="text-[20px]" />
                        <span className="leading-snug">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

/* ---------- Jam berjalan ---------- */
export const useNow = (intervalMs = 15000) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(timer);
    }, [intervalMs]);
    return now;
};

export const minutesSince = (value, now = Date.now()) =>
    value ? Math.max(0, Math.floor((now - new Date(value).getTime()) / 60000)) : 0;
