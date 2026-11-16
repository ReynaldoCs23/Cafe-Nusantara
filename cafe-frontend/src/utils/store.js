// Format informasi toko untuk tampilan publik.
const DAY_LABELS = { mon: 'Senin', tue: 'Selasa', wed: 'Rabu', thu: 'Kamis', fri: 'Jumat', sat: 'Sabtu', sun: 'Minggu' };
const ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Ringkas jam buka: hari berurutan dengan jam sama digabung, mis. "Senin – Kamis  08:00 – 22:00".
 */
export const formatOpeningHours = (hours) => {
    if (!hours) return [];
    const groups = [];
    ORDER.forEach((day) => {
        const h = hours[day];
        if (!h) return;
        const value = h.closed ? 'Tutup' : `${h.open} – ${h.close}`;
        const last = groups[groups.length - 1];
        if (last && last.value === value) last.days.push(day);
        else groups.push({ days: [day], value });
    });
    return groups.map(({ days, value }) => ({
        label: days.length === 1 ? DAY_LABELS[days[0]] : `${DAY_LABELS[days[0]]} – ${DAY_LABELS[days[days.length - 1]]}`,
        value,
    }));
};

export const mapEmbedUrl = (address) =>
    address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed` : null;

export const mapLinkUrl = (address) =>
    address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
