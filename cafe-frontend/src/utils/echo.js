import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import axios from 'axios';
import { API_ORIGIN } from '../api/axios';

window.Pusher = Pusher;

/**
 * Channel pesanan bersifat private: setiap langganan diotorisasi ke backend
 * dengan token login staf yang sedang aktif.
 * Server Reverb diaktifkan pada Fase 1; tanpa server, Echo hanya gagal terhubung.
 */
export const echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'local_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
    wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel) => ({
        authorize: (socketId, callback) => {
            axios
                .post(
                    `${API_ORIGIN}/api/broadcasting/auth`,
                    { socket_id: socketId, channel_name: channel.name },
                    {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
                            Accept: 'application/json',
                        },
                    }
                )
                .then((response) => callback(null, response.data))
                .catch((error) => callback(error));
        },
    }),
});

export const STAFF_ORDERS_CHANNEL = 'staff.orders';
