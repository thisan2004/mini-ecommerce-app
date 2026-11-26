import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  User,
  Package,
  MapPin,
  X,
  Plus,
  Minus,
  Trash2,
  LogOut,
  Search,
  Star,
  Laptop,
  Headphones,
  Watch,
  Home,
  Sparkles,
  Grid,
} from 'lucide-react';
import { api, clearSession, getSavedEmail, getToken, saveSession } from './api';
import { CATEGORIES_LIST, generateCatalog } from './catalogData';

const CATALOG_ITEMS = generateCatalog();
const ORDERS_STORAGE_KEY = 'thisan_orders_history_v1';
const ADDRESSES_STORAGE_KEY = 'thisan_saved_addresses_v1';

const DEFAULT_ADDRESSES = [
  {
    id: 'addr-1',
    fullName: 'Thisan S',
    phone: '9042525806',
    line1: '14 Temple View Street, Near Bus Stand',
    city: 'Rameswaram',
    state: 'Tamil Nadu',
    pincode: '623526',
  },
];

function formatINR(val) {
  const num = Number(val ?? 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.content)) return raw.content;
  if (raw && Array.isArray(raw.items)) return raw.items;
  return [];
}

function getProductPrices(p) {
  const base = Number(
    p.originalPrice ?? p.basePrice ?? p.mrp ?? p.regularPrice ?? p.price ?? 0
  );
  const sale = Number(
    p.sellingPrice ??
      p.salePrice ??
      p.discountPrice ??
      p.finalPrice ??
      p.price ??
      base
  );
  const original = base > 0 ? base : sale;
  const selling = sale > 0 ? sale : original;
  return { original, selling };
}

function CategoryIcon({ name }) {
  const label = (name || '').toLowerCase();
  if (label.includes('elect') || label.includes('mobile')) return <Laptop size={17} />;
  if (label.includes('audio')) return <Headphones size={17} />;
  if (label.includes('wear')) return <Watch size={17} />;
  if (label.includes('home') || label.includes('kitchen')) return <Home size={17} />;
  if (label.includes('beauty')) return <Sparkles size={17} />;
  return <Grid size={17} />;
}

export default function App() {
  const [token, setToken] = useState(() => getToken());
  const [userEmail, setUserEmail] = useState(() => getSavedEmail());

  const [backendProducts, setBackendProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const [activeProduct, setActiveProduct] = useState(null);

  const [backendCart, setBackendCart] = useState(null);
  const [localBagItems, setLocalBagItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [addresses, setAddresses] = useState(() => {
    try {
      const saved = localStorage.getItem(ADDRESSES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_ADDRESSES;
    } catch {
      return DEFAULT_ADDRESSES;
    }
  });
  const [selectedAddressId, setSelectedAddressId] = useState(() => {
    try {
      const saved = localStorage.getItem(ADDRESSES_STORAGE_KEY);
      const list = saved ? JSON.parse(saved) : DEFAULT_ADDRESSES;
      return list[0]?.id || 'addr-1';
    } catch {
      return 'addr-1';
    }
  });
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addrForm, setAddrForm] = useState({
    fullName: '',
    phone: '',
    line1: '',
    city: '',
    state: 'Tamil Nadu',
    pincode: '',
  });

  const [ordersOpen, setOrdersOpen] = useState(false);
  const [backendOrders, setBackendOrders] = useState([]);
  const [localOrders, setLocalOrders] = useState(() => {
    try {
      const saved = localStorage.getItem(ORDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  function notify(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  function persistAddresses(nextList) {
    setAddresses(nextList);
    try {
      localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  }

  function persistOrders(nextList) {
    setLocalOrders(nextList);
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  }

  async function loadBackendCatalog() {
    try {
      const prods = await api.getProducts();
      setBackendProducts(normalizeList(prods));
    } catch {
      setBackendProducts([]);
    }
  }

  async function loadCart() {
    if (!getToken()) {
      setBackendCart(null);
      return;
    }
    try {
      const data = await api.getCart();
      setBackendCart(data);
    } catch {
      setBackendCart(null);
    }
  }

  async function loadOrders() {
    if (!getToken()) return;
    try {
      const data = await api.getOrders();
      setBackendOrders(normalizeList(data));
    } catch {
      // fallback to localOrders
    }
  }

  useEffect(() => {
    loadBackendCatalog();
  }, []);

  useEffect(() => {
    loadCart();
  }, [token]);

  const allProducts = useMemo(() => {
    const mappedBackend = backendProducts.map((p, idx) => ({
      ...p,
      id: p.id ?? `be-${idx}`,
      sku: p.sku || `API-${101 + idx}`,
      categoryName: p.categoryName || p.category?.name || 'Electronics',
      brand: p.brand || 'Featured',
      spec: p.spec || 'Verified Storefront Item',
      description:
        p.description ||
        'Quality product from your connected catalog with fast checkout support.',
      rating: p.rating ?? 4.8,
      reviews: p.reviews ?? 120,
      imageUrl:
        p.imageUrl ||
        p.thumbnailUrl ||
        p.image ||
        CATALOG_ITEMS[idx % CATALOG_ITEMS.length].imageUrl,
      _isBackend: typeof p.id === 'number',
    }));
    return [...mappedBackend, ...CATALOG_ITEMS];
  }, [backendProducts]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const catMatch =
        selectedCategory === 'ALL' ||
        String(p.categoryName || '').toLowerCase() ===
          String(selectedCategory).toLowerCase();
      const q = search.trim().toLowerCase();
      const searchMatch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        (p.categoryName || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q);
      return catMatch && searchMatch;
    });
  }, [allProducts, selectedCategory, search]);

  const relatedProducts = useMemo(() => {
    if (!activeProduct) return [];
    const sameCat = allProducts.filter(
      (p) =>
        p.id !== activeProduct.id &&
        String(p.categoryName).toLowerCase() ===
          String(activeProduct.categoryName).toLowerCase()
    );
    const others = allProducts.filter(
      (p) =>
        p.id !== activeProduct.id &&
        String(p.categoryName).toLowerCase() !==
          String(activeProduct.categoryName).toLowerCase()
    );
    return [...sameCat, ...others].slice(0, 10);
  }, [allProducts, activeProduct]);

  const combinedBagItems = useMemo(() => {
    const be = Array.isArray(backendCart?.items)
      ? backendCart.items.map((item) => ({
          ...item,
          _source: 'backend',
          _key: `be-${item.id}`,
          _name: item.productName || item.product?.name || 'Item',
          _unitPrice: getProductPrices(item.product || item).selling,
          _qty: Number(item.quantity || 1),
          _img: item.product?.imageUrl || CATALOG_ITEMS[0].imageUrl,
        }))
      : [];

    const loc = localBagItems.map((item) => ({
      ...item,
      _source: 'local',
      _key: `loc-${item.id}`,
      _name: item.name,
      _unitPrice: Number(item.sellingPrice || 0),
      _qty: Number(item.quantity || 1),
      _img: item.imageUrl || CATALOG_ITEMS[0].imageUrl,
    }));

    return [...be, ...loc];
  }, [backendCart, localBagItems]);

  const totalBagQty = combinedBagItems.reduce((sum, i) => sum + i._qty, 0);
  const bagSubtotal = combinedBagItems.reduce((sum, i) => sum + i._unitPrice * i._qty, 0);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) || addresses[0] || null,
    [addresses, selectedAddressId]
  );

  const allOrders = useMemo(() => {
    const be = backendOrders.map((o) => ({
      id: `be-${o.id}`,
      orderNumber: o.orderNumber || `ORD-${o.id}`,
      status: o.status || 'PLACED',
      paymentMethod: o.paymentMethod || 'COD',
      totalAmount: Number(o.totalAmount ?? o.subtotalAmount ?? 0),
      placedAt: o.createdAt || 'Recent',
      addressSummary: o.shippingAddress || 'Saved Address',
      items: Array.isArray(o.items)
        ? o.items.map((it) => ({
            name: it.productName || 'Product',
            qty: it.quantity || 1,
            price: it.unitPrice || 0,
            imageUrl: CATALOG_ITEMS[0].imageUrl,
          }))
        : [
            {
              name: o.notes || 'Order Items',
              qty: 1,
              price: Number(o.totalAmount ?? o.subtotalAmount ?? 0),
              imageUrl: CATALOG_ITEMS[0].imageUrl,
            },
          ],
    }));
    return [...localOrders, ...be];
  }, [backendOrders, localOrders]);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      const cleanEmail = emailInput.trim();
      const cleanName = fullName.trim();
      const cleanPhone = phoneInput.trim();

      const res =
        authMode === 'login'
          ? await api.login({ email: cleanEmail, password: passwordInput })
          : await api.register({
              fullName: cleanName,
              name: cleanName,
              phone: cleanPhone || undefined,
              phoneNumber: cleanPhone || undefined,
              email: cleanEmail,
              password: passwordInput,
            });

      const jwt =
        res?.token ||
        res?.accessToken ||
        res?.jwt ||
        res?.data?.token ||
        (typeof res === 'string' ? res : '');

      if (!jwt) {
        if (authMode === 'register') {
          setAuthMode('login');
          setPasswordInput('');
          notify('Account created! Please login.');
          return;
        }
        throw new Error('Logged in, but no token returned.');
      }

      saveSession(jwt, cleanEmail);
      setToken(jwt);
      setUserEmail(cleanEmail);
      setAuthOpen(false);
      setPasswordInput('');
      notify('Logged in successfully');
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    clearSession();
    setToken(null);
    setUserEmail('');
    setBackendCart(null);
    setBackendOrders([]);
    notify('Logged out');
  }

  async function handleAddToBag(product) {
    const { selling } = getProductPrices(product);

    if (product._isBackend && typeof product.id === 'number' && token) {
      try {
        const updated = await api.addToCart(product.id, 1);
        if (updated && Array.isArray(updated.items)) {
          setBackendCart(updated);
        } else {
          await loadCart();
        }
        notify(`Added "${product.name}" to bag`);
        return;
      } catch {
        // fallback to local bag
      }
    }

    setLocalBagItems((prev) => {
      const idx = prev.findIndex((i) => i.id === product.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          sellingPrice: selling,
          imageUrl: product.imageUrl,
          quantity: 1,
        },
      ];
    });
    notify(`Added "${product.name}" to bag`);
  }

  async function handleQtyChange(item, nextQty) {
    if (nextQty < 1) {
      await handleRemoveItem(item);
      return;
    }
    if (item._source === 'backend' && token) {
      try {
        await api.updateCartItem(item.id, nextQty);
        await loadCart();
        return;
      } catch {
        // ignore
      }
    }
    setLocalBagItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
    );
  }

  async function handleRemoveItem(item) {
    if (item._source === 'backend' && token) {
      try {
        await api.removeCartItem(item.id);
        await loadCart();
        return;
      } catch {
        // ignore
      }
    }
    setLocalBagItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  function handleSaveAddress(e) {
    e.preventDefault();
    const created = {
      id: `addr-${Date.now()}`,
      fullName: addrForm.fullName.trim(),
      phone: addrForm.phone.trim(),
      line1: addrForm.line1.trim(),
      city: addrForm.city.trim(),
      state: addrForm.state.trim() || 'Tamil Nadu',
      pincode: addrForm.pincode.trim(),
    };
    const next = [created, ...addresses];
    persistAddresses(next);
    setSelectedAddressId(created.id);
    setAddrForm({
      fullName: '',
      phone: '',
      line1: '',
      city: '',
      state: 'Tamil Nadu',
      pincode: '',
    });
    setAddressModalOpen(false);
    notify('Address saved');
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!selectedAddress) {
      setAddressModalOpen(true);
      notify('Please add a delivery address first');
      return;
    }
    setPlacingOrder(true);
    try {
      let created = null;
      if (token && Array.isArray(backendCart?.items) && backendCart.items.length > 0) {
        created = await api
          .placeOrder({
            addressId: 1,
            paymentMethod,
            notes: notes.trim() || undefined,
          })
          .catch(() => null);
        await loadCart();
      }

      const orderRecord = {
        id: `ord-${Date.now()}`,
        orderNumber:
          created?.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
        status: created?.status || 'CONFIRMED',
        paymentMethod,
        totalAmount: Number(created?.totalAmount ?? bagSubtotal),
        placedAt: new Date().toLocaleString('en-IN'),
        addressSummary: `${selectedAddress.fullName} (${selectedAddress.phone}) — ${selectedAddress.line1}, ${selectedAddress.city}, ${selectedAddress.state} - ${selectedAddress.pincode}`,
        notes: notes.trim(),
        items: combinedBagItems.map((i) => ({
          name: i._name,
          qty: i._qty,
          price: i._unitPrice,
          imageUrl: i._img,
        })),
      };

      persistOrders([orderRecord, ...localOrders]);
      setLocalBagItems([]);
      setNotes('');
      setCartOpen(false);
      notify(`Order ${orderRecord.orderNumber} placed`);
      await loadOrders();
      setOrdersOpen(true);
    } finally {
      setPlacingOrder(false);
    }
  }

  function renderProductCard(p) {
    const { original, selling } = getProductPrices(p);
    const hasDiscount = original > selling && selling > 0;
    const offPct = hasDiscount ? Math.round(((original - selling) / original) * 100) : 0;

    return (
      <article className="prod-card" key={p.id}>
        <div>
          <div className="prod-media" onClick={() => setActiveProduct(p)}>
            <img
              src={p.imageUrl}
              alt={p.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = CATALOG_ITEMS[0].imageUrl;
              }}
            />
            {hasDiscount && <span className="badge-off num">{offPct}% OFF</span>}
          </div>

          <div className="prod-body" onClick={() => setActiveProduct(p)}>
            <div className="prod-cat">
              {p.categoryName} · {p.brand}
            </div>
            <h3 className="prod-title">{p.name}</h3>
            <div className="prod-spec">{p.spec}</div>
            <div className="rating-row num">
              <Star size={12} fill="#f59e0b" color="#f59e0b" />
              <span>{p.rating}</span>
              <span>({p.reviews} reviews)</span>
            </div>
          </div>
        </div>

        <div className="prod-foot">
          <div className="num">
            <span className="price-now">{formatINR(selling)}</span>
            {hasDiscount && <span className="price-old">{formatINR(original)}</span>}
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => handleAddToBag(p)}>
            Add
          </button>
        </div>
      </article>
    );
  }

  return (
    <div>
      <header className="topbar">
        <div className="container topbar-inner">
          <button
            className="brand"
            onClick={() => {
              setSelectedCategory('ALL');
              setSearch('');
            }}
          >
            <span className="brand-dot" />
            Thisan Mini Ecommerce
          </button>

          <div className="search-box">
            <input
              type="search"
              className="search-input"
              placeholder="Search product, brand, category, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search size={15} color="#71717a" style={{ position: 'absolute', right: 11 }} />
          </div>

          <div className="nav-actions">
            <button className="btn btn-ghost btn-sm num" onClick={() => setAddressModalOpen(true)}>
              <MapPin size={14} />
              Address ({addresses.length})
            </button>

            <button
              className="btn btn-ghost btn-sm num"
              onClick={async () => {
                await loadOrders();
                setOrdersOpen(true);
              }}
            >
              <Package size={14} />
              Orders ({allOrders.length})
            </button>

            {token ? (
              <button className="btn btn-ghost btn-sm" onClick={handleLogout} title={userEmail}>
                <LogOut size={14} />
                Logout
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setAuthError('');
                  setAuthMode('login');
                  setAuthOpen(true);
                }}
              >
                <User size={14} />
                Login
              </button>
            )}

            <button className="btn btn-accent btn-sm num" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={14} />
              Bag ({totalBagQty})
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        {toast && <div className="alert alert-ok">{toast}</div>}

        <section className="hero-banner">
          <div>
            <span className="hero-tag">12 Categories · 15 Unique Products Each</span>
            <h1 className="hero-title">Smart Gear &amp; Everyday Essentials</h1>
            <p className="hero-sub">
              Click any product to view full specifications and scroll related picks below, manage saved addresses, and track orders.
            </p>
          </div>
          <div className="hero-visual">
            <img src={CATALOG_ITEMS[15].imageUrl} alt="Featured Spotlight" />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Shop by Category</h2>
            {selectedCategory !== 'ALL' && (
              <button className="link-btn" onClick={() => setSelectedCategory('ALL')}>
                Reset Filter
              </button>
            )}
          </div>

          <div className="cat-grid">
            <button
              className={`cat-card ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              <div className="cat-icon-box">
                <Grid size={17} />
              </div>
              <span className="cat-name">All (15/Cat)</span>
            </button>

            {CATEGORIES_LIST.map((catName) => {
              const active =
                String(selectedCategory).toLowerCase() === catName.toLowerCase();
              return (
                <button
                  key={catName}
                  className={`cat-card ${active ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(catName)}
                >
                  <div className="cat-icon-box">
                    <CategoryIcon name={catName} />
                  </div>
                  <span className="cat-name">{catName}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">
              {selectedCategory === 'ALL' ? 'Featured Storefront' : selectedCategory}
            </h2>
            <span className="num" style={{ fontSize: 12.5, color: 'var(--ink-subtle)' }}>
              {filteredProducts.length} unique products
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">No products found for this filter.</div>
          ) : (
            <div className="prod-grid">{filteredProducts.map(renderProductCard)}</div>
          )}
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <h4>Thisan Mini Ecommerce</h4>
              <p>Curated storefront with product details, horizontal recommendations, saved addresses, and order tracking.</p>
            </div>
            <div>
              <h4>Categories</h4>
              <ul>
                <li>Electronics &amp; Mobile</li>
                <li>Wearables &amp; Audio</li>
                <li>Home, Kitchen &amp; Fashion</li>
                <li>Footwear, Bags, Beauty &amp; Books</li>
              </ul>
            </div>
            <div>
              <h4>Shopping</h4>
              <ul>
                <li>Instant Bag &amp; Quantity Controls</li>
                <li>Saved Delivery Addresses</li>
                <li>COD, UPI &amp; Card Checkout</li>
              </ul>
            </div>
            <div>
              <h4>Contact</h4>
              <ul>
                <li>Rameswaram &amp; Chennai, TN</li>
                <li>support@thisanminiecommerce.in</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Thisan Mini Ecommerce. All rights reserved.</span>
            <span>12 Categories × 15 Products</span>
          </div>
        </div>
      </footer>

      {activeProduct && (
        <div className="backdrop center" onClick={() => setActiveProduct(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head" style={{ padding: '0 0 14px', marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                {activeProduct.categoryName} · {activeProduct.sku}
              </div>
              <button onClick={() => setActiveProduct(null)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="detail-top">
              <div className="detail-img">
                <img src={activeProduct.imageUrl} alt={activeProduct.name} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div className="prod-cat">{activeProduct.brand}</div>
                  <h2 style={{ fontSize: 21, fontWeight: 700, marginTop: 4, marginBottom: 8 }}>
                    {activeProduct.name}
                  </h2>

                  <div className="rating-row num" style={{ marginBottom: 12 }}>
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <strong>{activeProduct.rating}</strong>
                    <span>({activeProduct.reviews} verified ratings)</span>
                  </div>

                  <p style={{ fontSize: 13.5, color: 'var(--ink-muted)', marginBottom: 12 }}>
                    {activeProduct.description}
                  </p>

                  <div
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--line)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '9px 12px',
                      fontSize: 12.5,
                    }}
                  >
                    <strong>Key Specs:</strong> {activeProduct.spec}
                  </div>
                </div>

                <div>
                  <div className="num" style={{ marginBottom: 12 }}>
                    <span className="price-now" style={{ fontSize: 22 }}>
                      {formatINR(getProductPrices(activeProduct).selling)}
                    </span>
                    {getProductPrices(activeProduct).original >
                      getProductPrices(activeProduct).selling && (
                      <span className="price-old" style={{ fontSize: 13.5 }}>
                        {formatINR(getProductPrices(activeProduct).original)}
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn-accent"
                    style={{ width: '100%' }}
                    onClick={() => handleAddToBag(activeProduct)}
                  >
                    <ShoppingBag size={15} />
                    Add to Bag
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="section-head" style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                  Related Products (Scroll Horizontally)
                </h3>
                <span style={{ fontSize: 11.5, color: 'var(--ink-subtle)' }}>
                  Swipe / scroll →
                </span>
              </div>

              <div className="related-strip">
                {relatedProducts.map((rel) => {
                  const { selling } = getProductPrices(rel);
                  return (
                    <div className="related-card" key={rel.id}>
                      <div>
                        <img
                          src={rel.imageUrl}
                          alt={rel.name}
                          onClick={() => setActiveProduct(rel)}
                        />
                        <div style={{ padding: '10px 10px 6px' }}>
                          <div style={{ fontSize: 10.5, color: 'var(--ink-subtle)', fontWeight: 700 }}>
                            {rel.categoryName}
                          </div>
                          <div
                            onClick={() => setActiveProduct(rel)}
                            style={{
                              fontSize: 12.5,
                              fontWeight: 600,
                              marginTop: 2,
                              cursor: 'pointer',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {rel.name}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '8px 10px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 6,
                        }}
                      >
                        <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>
                          {formatINR(selling)}
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ height: 28, padding: '0 9px', fontSize: 11 }}
                          onClick={() => handleAddToBag(rel)}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="backdrop" onClick={() => setCartOpen(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Shopping Bag ({totalBagQty})</h2>
              <button onClick={() => setCartOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {combinedBagItems.length === 0 ? (
                <div className="empty-state">
                  Your bag is empty. Click &ldquo;Add&rdquo; on any product card.
                </div>
              ) : (
                combinedBagItems.map((item) => (
                  <div className="cart-item" key={item._key}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={item._img} alt={item._name} className="cart-thumb" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item._name}</div>
                        <div className="num" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                          {formatINR(item._unitPrice)} each
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div className="qty-box num">
                        <button onClick={() => handleQtyChange(item, item._qty - 1)}>
                          <Minus size={12} />
                        </button>
                        <span>{item._qty}</span>
                        <button onClick={() => handleQtyChange(item, item._qty + 1)}>
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => handleRemoveItem(item)} title="Remove">
                        <Trash2 size={14} color="#71717a" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {combinedBagItems.length > 0 && (
              <form className="drawer-foot" onSubmit={handlePlaceOrder}>
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px',
                    marginBottom: 12,
                    fontSize: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <strong>Delivery Address</strong>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setAddressModalOpen(true)}
                    >
                      Change / Add
                    </button>
                  </div>
                  {selectedAddress ? (
                    <div style={{ color: 'var(--ink-muted)' }}>
                      {selectedAddress.fullName} ({selectedAddress.phone}) · {selectedAddress.line1},{' '}
                      {selectedAddress.city} - {selectedAddress.pincode}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent)' }}>No address selected</div>
                  )}
                </div>

                <div className="field">
                  <label>Payment Method</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>

                <div className="field">
                  <label>Delivery Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Landmark or delivery instructions"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="summary-row total num">
                  <span>Total Payable</span>
                  <span>{formatINR(bagSubtotal)}</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-accent"
                  style={{ width: '100%', marginTop: 10 }}
                  disabled={placingOrder}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
              </form>
            )}
          </aside>
        </div>
      )}

      {addressModalOpen && (
        <div className="backdrop center" onClick={() => setAddressModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head" style={{ padding: '0 0 14px', marginBottom: 14 }}>
              <h2>Delivery Addresses ({addresses.length})</h2>
              <button onClick={() => setAddressModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              {addresses.map((addr) => {
                const isSel = addr.id === selectedAddress?.id;
                return (
                  <div
                    key={addr.id}
                    className={`addr-card ${isSel ? 'selected' : ''}`}
                    onClick={() => setSelectedAddressId(addr.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 12.5 }}>
                      <strong>{addr.fullName}</strong> · <span className="num">{addr.phone}</span>
                      <div style={{ color: 'var(--ink-muted)', marginTop: 3 }}>
                        {addr.line1}, {addr.city}, {addr.state} -{' '}
                        <span className="num">{addr.pincode}</span>
                      </div>
                    </div>
                    <span className="status-tag">{isSel ? 'SELECTED' : 'SELECT'}</span>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSaveAddress}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>
                Add New Address
              </h3>
              <div className="field">
                <label>Recipient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Thisan S"
                  value={addrForm.fullName}
                  onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="9042525806"
                  value={addrForm.phone}
                  onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Street / Door No. / Landmark</label>
                <input
                  type="text"
                  required
                  placeholder="House / Street / Area"
                  value={addrForm.line1}
                  onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>City</label>
                  <input
                    type="text"
                    required
                    placeholder="Chennai / Rameswaram"
                    value={addrForm.city}
                    onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="600001"
                    value={addrForm.pincode}
                    onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Save Address
              </button>
            </form>
          </div>
        </div>
      )}

      {ordersOpen && (
        <div className="backdrop center" onClick={() => setOrdersOpen(false)}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head" style={{ padding: '0 0 14px', marginBottom: 14 }}>
              <h2>Your Orders ({allOrders.length})</h2>
              <button onClick={() => setOrdersOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {allOrders.length === 0 ? (
              <div className="empty-state">
                No orders yet. Add items to your bag and place an order to see full order details here.
              </div>
            ) : (
              allOrders.map((ord) => (
                <div className="order-box" key={ord.id}>
                  <div className="order-top num">
                    <span>{ord.orderNumber}</span>
                    <span className="status-tag">{ord.status}</span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>
                    Placed: <span className="num">{ord.placedAt}</span> · Payment:{' '}
                    <strong>{ord.paymentMethod}</strong>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                    {(ord.items || []).map((it, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          background: 'var(--surface)',
                          padding: 8,
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img
                            src={it.imageUrl || CATALOG_ITEMS[0].imageUrl}
                            alt={it.name}
                            className="cart-thumb"
                          />
                          <div>
                            <div style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</div>
                            <div className="num" style={{ fontSize: 11.5, color: 'var(--ink-subtle)' }}>
                              Qty: {it.qty} × {formatINR(it.price)}
                            </div>
                          </div>
                        </div>
                        <div className="num" style={{ fontSize: 12.5, fontWeight: 700 }}>
                          {formatINR(Number(it.price || 0) * Number(it.qty || 1))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>
                    <strong>Deliver to:</strong> {ord.addressSummary}
                  </div>

                  <div
                    className="num"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: 8,
                      borderTop: '1px solid var(--line)',
                      fontSize: 14,
                    }}
                  >
                    <strong>Order Total</strong>
                    <strong>{formatINR(ord.totalAmount)}</strong>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div className="backdrop center" onClick={() => setAuthOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head" style={{ padding: '0 0 14px', marginBottom: 14 }}>
              <h2>{authMode === 'login' ? 'Login' : 'Create Account'}</h2>
              <button onClick={() => setAuthOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {authError && (
              <div className="alert alert-err" style={{ marginTop: 0, marginBottom: 12 }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <>
                  <div className="field">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Phone (Optional)</label>
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="field">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={authBusy}
              >
                {authBusy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-muted)', textAlign: 'center' }}>
              {authMode === 'login' ? (
                <>
                  New here?{' '}
                  <button
                    style={{ fontWeight: 700, color: 'var(--accent)' }}
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('register');
                    }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    style={{ fontWeight: 700, color: 'var(--accent)' }}
                    onClick={() => {
                      setAuthError('');
                      setAuthMode('login');
                    }}
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}