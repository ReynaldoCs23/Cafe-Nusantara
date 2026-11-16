import { useEffect, useState } from 'react';
import api from '../api/axios';

// Cache sederhana di level modul agar /store/status tidak dipanggil berulang.
let cache = null;
let inflight = null;

export const fetchStoreSettings = (force = false) => {
    if (cache && !force) return Promise.resolve(cache);
    if (!inflight || force) {
        inflight = api.get('/store/status')
            .then((res) => {
                cache = res.data.data;
                return cache;
            })
            .finally(() => {
                inflight = null;
            });
    }
    return inflight;
};

export const useStoreSettings = () => {
    const [settings, setSettings] = useState(cache);

    useEffect(() => {
        let active = true;
        fetchStoreSettings()
            .then((data) => active && setSettings(data))
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    return settings;
};
