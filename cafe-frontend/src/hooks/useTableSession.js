import { useEffect, useState } from 'react';
import { TABLE_EVENT, readTableSession } from '../utils/table';

/** Sesi meja (hasil scan QR) yang ikut berubah saat pelanggan scan QR lain atau keluar dari meja. */
export const useTableSession = () => {
    const [table, setTable] = useState(readTableSession);
    useEffect(() => {
        const update = () => setTable(readTableSession());
        window.addEventListener(TABLE_EVENT, update);
        window.addEventListener('storage', update);
        return () => {
            window.removeEventListener(TABLE_EVENT, update);
            window.removeEventListener('storage', update);
        };
    }, []);
    return table;
};
