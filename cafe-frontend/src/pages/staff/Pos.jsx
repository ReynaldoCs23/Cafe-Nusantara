import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { EmptyState, Icon, LoadingBlock, Modal, Segmented, useToast } from '../../components/ui';
import { ConnectionDot } from '../../components/staff/StaffShell';
import { useStaffOrders } from '../../hooks/useStaffOrders';
import { apiErrorMessage, calculateTotals, formatPrice, modifierSummary, newIdempotencyKey } from '../../utils/pos';
import { getPaperWidth, printReceipt, setPaperWidth } from '../../utils/print';
import { playChime } from '../../utils/sound';
import ModifierSheet from './pos/ModifierSheet';
import OrderListPanel from './pos/OrderListPanel';
import PaymentModal from './pos/PaymentModal';
import { OpenShiftScreen, ShiftModal } from './pos/ShiftPanels';

const lineKey = (productId, modifiers, notes) =>
    `${productId}|${modifiers.map((m) => m.id).sort((a, b) => a - b).join('.')}|${notes}`;

const unitPrice = (line) => line.product.price + line.modifiers.reduce((s, m) => s + m.price_delta, 0);

const readAutoPrint = () => {
    try {
        return localStorage.getItem('cafe_auto_print') !== '0';
    } catch {
        return true;
    }
};

/**
 * Layar kasir (PRD POS-01..11): menu di kiri, keranjang di kanan,
 * plus tab tagihan tertunda dan pesanan siap diambil.
 */
const Pos = () => {
    const { user } = useAuth();
    const { notify } = useToast();

    const [shift, setShift] = useState(undefined); // undefined = memuat, null = belum buka
    const [menu, setMenu] = useState(null);
    const [view, setView] = useState('order');
    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState([]);
    const [customerName, setCustomerName] = useState('');
    const [fulfillment, setFulfillment] = useState('pickup');
    const [tableId, setTableId] = useState('');
    const [orderNotes, setOrderNotes] = useState('');
    const [sheetProduct, setSheetProduct] = useState(null);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [success, setSuccess] = useState(null);
    const [shiftOpen, setShiftOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [unpaid, setUnpaid] = useState([]);
    const [ready, setReady] = useState([]);
    const [busy, setBusy] = useState(false);
    const idempotencyKey = useRef(newIdempotencyKey());
    const searchRef = useRef(null);

    const loadShift = useCallback(async () => {
        const res = await api.get('/admin/pos/shift');
        setShift(res.data.data);
    }, []);

    const loadMenu = useCallback(async () => {
        const res = await api.get('/admin/pos/menu');
        setMenu(res.data.data);
    }, []);

    const loadQueues = useCallback(async () => {
        const [u, r] = await Promise.all([
            api.get('/admin/orders', { params: { status: 'pending_payment' } }),
            api.get('/admin/handoff', { params: { fulfillment: 'pickup' } }),
        ]);
        setUnpaid(u.data.data);
        setReady(r.data.data.orders);
    }, []);

    useEffect(() => {
        Promise.all([loadShift(), loadMenu(), loadQueues()]).catch((err) => notify(apiErrorMessage(err, 'Gagal memuat data kasir.'), 'error'));
    }, [loadShift, loadMenu, loadQueues, notify]);

    const connection = useStaffOrders((event, order) => {
        if (event === 'created' && order.channel !== 'pos') {
            playChime('new');
            notify(`Pesanan baru #${order.queue_number} dari ${order.channel === 'qr' ? 'QR meja' : 'online'}`);
        }
        loadQueues().catch(() => {});
    }, { pollMs: 15000, onPoll: () => loadQueues().catch(() => {}) });

    const settings = menu?.settings;
    const subtotal = lines.reduce((s, l) => s + unitPrice(l) * l.quantity, 0);
    const totals = calculateTotals(subtotal, settings);

    const products = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (menu?.products || []).filter((p) =>
            (category === 'all' || p.category_id === category)
            && (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)));
    }, [menu, category, search]);

    const qtyInCart = (productId) => lines.filter((l) => l.product.id === productId).reduce((s, l) => s + l.quantity, 0);

    const addLine = (product, quantity, modifiers, notes) => {
        const key = lineKey(product.id, modifiers, notes);
        setLines((prev) => {
            const existing = prev.find((l) => l.key === key);
            if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
            return [...prev, { key, product, quantity, modifiers, notes }];
        });
        setSheetProduct(null);
    };

    const tapProduct = (product) => {
        if (product.is_sold_out) return notify(`${product.name} sedang habis`, 'error');
        if (product.track_stock && qtyInCart(product.id) >= product.stock_quantity) {
            return notify(`Stok ${product.name} tinggal ${product.stock_quantity}`, 'error');
        }
        if ((product.modifier_groups || []).length > 0) setSheetProduct(product);
        else addLine(product, 1, [], '');
    };

    const changeQty = (key, delta) => setLines((prev) => prev
        .map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0));

    const resetOrder = () => {
        setLines([]);
        setCustomerName('');
        setOrderNotes('');
        setFulfillment('pickup');
        setTableId('');
        idempotencyKey.current = newIdempotencyKey();
    };

    const validateOrder = () => {
        if (lines.length === 0) return 'Keranjang masih kosong.';
        if (!customerName.trim()) return 'Isi nama pelanggan untuk dipanggil.';
        if (fulfillment === 'table' && !tableId) return 'Pilih meja tujuan.';
        return '';
    };

    const orderPayload = (extra) => ({
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity, modifier_ids: l.modifiers.map((m) => m.id), notes: l.notes || null })),
        customer_name: customerName.trim(),
        fulfillment,
        dining_table_id: fulfillment === 'table' ? Number(tableId) : null,
        notes: orderNotes.trim() || null,
        ...extra,
    });

    const startCheckout = () => {
        const problem = validateOrder();
        if (problem) return notify(problem, 'error');
        setCheckoutOpen(true);
    };

    const afterOrder = async (order, change = 0) => {
        resetOrder();
        setSuccess({ order, change });
        loadMenu().catch(() => {});
        loadQueues().catch(() => {});
        if (order.payment_status === 'paid' && readAutoPrint()) {
            printReceipt(order.id).catch(() => notify('Struk gagal dicetak. Coba cetak ulang.', 'error'));
        }
    };

    const submitPaid = async (payments) => {
        const res = await api.post('/admin/pos/orders', orderPayload({ payments }), { headers: { 'Idempotency-Key': idempotencyKey.current } });
        setCheckoutOpen(false);
        const change = payments.reduce((s, p) => s + (p.method === 'cash' ? (p.tendered || p.amount) - p.amount : 0), 0);
        await afterOrder(res.data.data, change);
    };

    const submitPayLater = async () => {
        const problem = validateOrder();
        if (problem) return notify(problem, 'error');
        setBusy(true);
        try {
            const res = await api.post('/admin/pos/orders', orderPayload({ pay_later: true }), { headers: { 'Idempotency-Key': idempotencyKey.current } });
            await afterOrder(res.data.data);
        } catch (err) {
            notify(apiErrorMessage(err), 'error');
        } finally {
            setBusy(false);
        }
    };

    // Pintasan keyboard: "/" untuk cari menu
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    if (shift === undefined || !menu) return <LoadingBlock label="Menyiapkan kasir..." />;
    if (shift === null) return <OpenShiftScreen user={user} onOpened={(s) => { setShift(s); notify('Shift dibuka. Selamat bertugas!'); }} />;

    return (
        <div className="h-full flex flex-col">
            {/* Sub-header */}
            <div className="h-14 shrink-0 flex items-center gap-4 px-4 border-b border-hairline bg-cream">
                <Segmented value={view} onChange={setView} options={[
                    ['order', 'Pesanan baru', 'add_shopping_cart'],
                    ['unpaid', `Belum dibayar${unpaid.length ? ` · ${unpaid.length}` : ''}`, 'receipt_long'],
                    ['ready', `Siap diambil${ready.length ? ` · ${ready.length}` : ''}`, 'shopping_bag'],
                ]} />
                <div className="ml-auto flex items-center gap-3">
                    <ConnectionDot state={connection} />
                    <button className="btn-ghost text-sm" onClick={() => setSettingsOpen(true)} title="Pengaturan printer">
                        <Icon name="print" className="text-[20px]" />
                    </button>
                    <button className="btn-outline text-sm" onClick={async () => { await loadShift(); setShiftOpen(true); }}>
                        <Icon name="account_balance_wallet" className="text-[18px]" /> Shift & kas
                    </button>
                </div>
            </div>

            {view === 'unpaid' && (
                <div className="flex-1 min-h-0">
                    <OrderListPanel mode="unpaid" orders={unpaid} onChanged={loadQueues}
                        onPaid={(order) => {
                            notify(`Pesanan #${order.queue_number} lunas dan masuk antrean`);
                            if (readAutoPrint()) printReceipt(order.id).catch(() => {});
                        }} />
                </div>
            )}

            {view === 'ready' && (
                <div className="flex-1 min-h-0">
                    <OrderListPanel mode="ready" orders={ready} onChanged={loadQueues} onPaid={() => {}} />
                </div>
            )}

            {view === 'order' && (
                <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px] xl:grid-cols-[1fr_440px]">
                    {/* Menu */}
                    <section className="flex flex-col min-h-0">
                        <div className="px-5 pt-4 pb-3 space-y-3">
                            <div className="relative">
                                <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
                                <input ref={searchRef} className="input pl-11 py-3" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari menu atau SKU  ( / )" />
                            </div>
                            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                                <button className={category === 'all' ? 'tab-active' : 'tab'} onClick={() => setCategory('all')}>Semua</button>
                                {menu.categories.map((c) => (
                                    <button key={c.id} className={category === c.id ? 'tab-active' : 'tab'} onClick={() => setCategory(c.id)}>{c.name}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto scroll-thin px-5 pb-5">
                            {products.length === 0 ? (
                                <EmptyState icon="search_off" title="Menu tidak ditemukan" description="Coba kata kunci atau kategori lain." />
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                                    {products.map((p) => {
                                        const inCart = qtyInCart(p.id);
                                        const lowStock = p.track_stock && !p.is_sold_out && p.stock_quantity <= 5;
                                        return (
                                            <button key={p.id} onClick={() => tapProduct(p)}
                                                className={`group relative text-left rounded-xl border bg-paper overflow-hidden transition-all ${
                                                    p.is_sold_out ? 'opacity-45 cursor-not-allowed border-hairline' : inCart ? 'border-primary ring-1 ring-primary' : 'border-hairline hover:border-ink/30'
                                                }`}>
                                                <div className="aspect-[4/3] bg-surface-container overflow-hidden">
                                                    {p.image_url
                                                        ? <img src={p.image_url} alt="" className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${p.is_sold_out ? 'grayscale' : ''}`} />
                                                        : <div className="h-full w-full flex items-center justify-center text-on-surface-variant/40"><Icon name="local_cafe" className="text-4xl" /></div>}
                                                </div>
                                                <div className="p-3">
                                                    <p className="font-medium leading-snug line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <span className="text-primary font-semibold tabular">{formatPrice(p.price)}</span>
                                                        {p.is_sold_out
                                                            ? <span className="chip border-ink/20 text-ink">Habis</span>
                                                            : lowStock ? <span className="chip border-amber-300 text-amber-800 bg-amber-soft">Sisa {p.stock_quantity}</span> : null}
                                                    </div>
                                                </div>
                                                {inCart > 0 && (
                                                    <span className="absolute top-2 right-2 h-7 min-w-7 px-2 rounded-full bg-primary text-white text-sm font-semibold flex items-center justify-center tabular">{inCart}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Keranjang */}
                    <aside className="flex flex-col min-h-0 border-l border-hairline bg-paper">
                        <div className="p-5 space-y-3 border-b border-hairline">
                            <input className="input-lg" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan" maxLength={100} />
                            <div className="flex items-center gap-3">
                                <Segmented value={fulfillment} onChange={setFulfillment} options={[['pickup', 'Ambil di kasir', 'shopping_bag'], ['table', 'Antar ke meja', 'table_restaurant']]} />
                            </div>
                            {fulfillment === 'table' && (
                                menu.tables.length === 0
                                    ? <p className="text-xs text-amber-800">Belum ada meja. Tambahkan di Back-office → Meja.</p>
                                    : <select className="input" value={tableId} onChange={(e) => setTableId(e.target.value)}>
                                        <option value="">Pilih meja</option>
                                        {menu.tables.map((t) => <option key={t.id} value={t.id}>{t.name}{t.area ? ` · ${t.area}` : ''}</option>)}
                                    </select>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto scroll-thin px-5">
                            {lines.length === 0 ? (
                                <EmptyState icon="shopping_basket" title="Keranjang kosong" description="Ketuk menu di sebelah kiri untuk menambahkan." />
                            ) : (
                                <ul className="divide-y divide-hairline">
                                    {lines.map((l) => (
                                        <li key={l.key} className="py-4 flex gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium leading-snug">{l.product.name}</p>
                                                {l.modifiers.length > 0 && <p className="text-xs text-on-surface-variant mt-0.5">{modifierSummary(l.modifiers)}</p>}
                                                {l.notes && <p className="text-xs italic text-on-surface-variant">“{l.notes}”</p>}
                                                <p className="text-sm text-primary font-semibold tabular mt-1">{formatPrice(unitPrice(l) * l.quantity)}</p>
                                            </div>
                                            <div className="flex items-center self-center rounded-full border border-hairline">
                                                <button className="h-9 w-9 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => changeQty(l.key, -1)} aria-label="Kurangi">
                                                    <Icon name={l.quantity === 1 ? 'delete' : 'remove'} className="text-[18px]" />
                                                </button>
                                                <span className="w-6 text-center text-sm font-semibold tabular">{l.quantity}</span>
                                                <button className="h-9 w-9 flex items-center justify-center text-on-surface-variant hover:text-ink" onClick={() => {
                                                    if (l.product.track_stock && qtyInCart(l.product.id) >= l.product.stock_quantity) return notify(`Stok ${l.product.name} tinggal ${l.product.stock_quantity}`, 'error');
                                                    changeQty(l.key, 1);
                                                }} aria-label="Tambah">
                                                    <Icon name="add" className="text-[18px]" />
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="border-t border-hairline p-5 space-y-3 bg-cream">
                            <input className="input text-sm" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Catatan pesanan (opsional)" maxLength={500} />
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between text-on-surface-variant"><span>Subtotal</span><span className="tabular">{formatPrice(totals.subtotal)}</span></div>
                                {totals.service > 0 && <div className="flex justify-between text-on-surface-variant"><span>Service</span><span className="tabular">{formatPrice(totals.service)}</span></div>}
                                <div className="flex justify-between text-on-surface-variant"><span>PB1 {totals.taxRate}%</span><span className="tabular">{formatPrice(totals.tax)}</span></div>
                                {totals.rounding !== 0 && <div className="flex justify-between text-on-surface-variant"><span>Pembulatan</span><span className="tabular">{formatPrice(totals.rounding)}</span></div>}
                            </div>
                            <div className="flex items-end justify-between">
                                <span className="label-caps">Total</span>
                                <span className="font-display text-3xl tabular">{formatPrice(totals.total)}</span>
                            </div>
                            <div className="grid grid-cols-[auto_1fr] gap-2">
                                <button className="btn-outline" onClick={submitPayLater} disabled={busy || lines.length === 0} title="Simpan sebagai tagihan, bayar nanti">
                                    <Icon name="schedule" className="text-[18px]" /> Nanti
                                </button>
                                <button className="btn-primary btn-lg" onClick={startCheckout} disabled={busy || lines.length === 0}>
                                    <Icon name="payments" /> Bayar {formatPrice(totals.total)}
                                </button>
                            </div>
                            {lines.length > 0 && (
                                <button className="w-full text-xs text-on-surface-variant hover:text-error" onClick={() => window.confirm('Kosongkan keranjang?') && resetOrder()}>
                                    Kosongkan keranjang
                                </button>
                            )}
                        </div>
                    </aside>
                </div>
            )}

            {sheetProduct && <ModifierSheet product={sheetProduct} onClose={() => setSheetProduct(null)} onAdd={addLine} />}

            {checkoutOpen && (
                <PaymentModal
                    title="Pembayaran"
                    subtitle={`${customerName} · ${lines.reduce((s, l) => s + l.quantity, 0)} item`}
                    total={totals.total}
                    onClose={() => setCheckoutOpen(false)}
                    onSubmit={submitPaid}
                />
            )}

            {success && (
                <Modal title="Pesanan berhasil" onClose={() => setSuccess(null)} size="sm"
                    footer={
                        <>
                            <button className="btn-outline" onClick={() => printReceipt(success.order.id).catch(() => notify('Struk gagal dicetak', 'error'))}>
                                <Icon name="print" className="text-[18px]" /> Cetak struk
                            </button>
                            <button className="btn-primary" onClick={() => setSuccess(null)} autoFocus>Pesanan baru</button>
                        </>
                    }>
                    <div className="text-center py-4">
                        <p className="label-caps mb-2">Nomor antrean</p>
                        <p className="font-display text-7xl text-primary tabular leading-none">{success.order.queue_number}</p>
                        <p className="mt-4 text-on-surface-variant">{success.order.customer_name}</p>
                        {success.order.payment_status === 'paid' ? (
                            success.change > 0 && (
                                <div className="mt-6 rounded-xl bg-sage-soft px-5 py-4">
                                    <p className="text-sm text-sage">Kembalian</p>
                                    <p className="font-display text-4xl text-sage tabular">{formatPrice(success.change)}</p>
                                </div>
                            )
                        ) : (
                            <p className="mt-6 rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-900">Disimpan sebagai tagihan. Terima pembayarannya di tab “Belum dibayar”.</p>
                        )}
                    </div>
                </Modal>
            )}

            {shiftOpen && shift && (
                <ShiftModal shift={shift} onClose={() => setShiftOpen(false)}
                    onChanged={(s) => { setShift(s); notify('Kas dicatat'); }}
                    onClosed={() => { setShiftOpen(false); setShift(null); notify('Shift ditutup. Laporan dikirim ke printer.'); }} />
            )}

            {settingsOpen && <PrinterSettings onClose={() => setSettingsOpen(false)} />}
        </div>
    );
};

const PrinterSettings = ({ onClose }) => {
    const [paper, setPaper] = useState(getPaperWidth());
    const [auto, setAuto] = useState(readAutoPrint());
    return (
        <Modal title="Printer struk" subtitle="Pengaturan tersimpan di perangkat ini." onClose={onClose} size="sm"
            footer={<button className="btn-primary" onClick={() => {
                setPaperWidth(paper);
                try { localStorage.setItem('cafe_auto_print', auto ? '1' : '0'); } catch { /* abaikan */ }
                onClose();
            }}>Simpan</button>}>
            <div className="space-y-5">
                <div>
                    <p className="label-caps mb-2">Lebar kertas</p>
                    <Segmented value={paper} onChange={setPaper} options={[['58', '58 mm'], ['80', '80 mm']]} />
                </div>
                <label className="flex items-start gap-3">
                    <input type="checkbox" className="mt-1" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                    <span className="text-sm">Cetak struk otomatis setelah pembayaran</span>
                </label>
                <p className="text-xs text-on-surface-variant">
                    Saat dialog print muncul pertama kali, pilih printer thermal, atur margin “Tidak ada”, lalu nonaktifkan header/footer browser.
                </p>
            </div>
        </Modal>
    );
};

export default Pos;
