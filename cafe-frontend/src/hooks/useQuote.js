import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { apiErrorMessage } from '../utils/pos';

/**
 * Minta perkiraan total ke server (promo otomatis, voucher, diskon, tukar poin) dengan jeda singkat
 * setiap kali isi keranjang berubah. Mengembalikan { quote, error, fieldErrors, loading }.
 */
export const useQuote = (endpoint, payload, enabled = true) => {
    const [state, setState] = useState({ quote: null, error: '', fieldErrors: {}, loading: false });
    const key = JSON.stringify(payload);
    const seq = useRef(0);

    useEffect(() => {
        if (!enabled || !payload?.items?.length) {
            setState({ quote: null, error: '', fieldErrors: {}, loading: false });
            return undefined;
        }
        const id = ++seq.current;
        setState((s) => ({ ...s, loading: true }));
        const timer = setTimeout(() => {
            api.post(endpoint, JSON.parse(key))
                .then((res) => id === seq.current && setState({ quote: res.data.data, error: '', fieldErrors: {}, loading: false }))
                .catch((err) => id === seq.current && setState({
                    quote: null,
                    error: apiErrorMessage(err, 'Gagal menghitung total.'),
                    fieldErrors: err.response?.data?.errors || {},
                    loading: false,
                }));
        }, 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, key, enabled]);

    return state;
};
