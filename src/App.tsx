import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  supabase,
  isCloudEnabled,
  fetchProducts,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  uploadProductPhoto,
  fetchOrders,
  createOrderRecord,
  fetchVouchers,
  getSessionProfile,
  signInUser,
  signUpUser,
  signOutUser
} from './supabaseClient';

export interface Product {
  id: string;
  brand: string;
  cat: string;
  category?: string;
  name: string;
  price: number;
  stock: number;
  specs?: string;
  description?: string;
  image_url?: string;
  photo_url?: string;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

const CAT_LABELS: Record<string, string> = {
  G: 'Graphics cards',
  M: 'Monitors',
  L: 'Laptops',
  R: 'Memory',
  S: 'Storage',
  A: 'Accessories'
};

function getProductImage(item: Product): string {
  return (item.image_url || item.photo_url || '').trim();
}

function getCategoryLabel(cat: string): string {
  return CAT_LABELS[cat] || cat || 'Accessories';
}

function formatPhp(amount: number): string {
  return `₱${Number(amount || 0).toLocaleString('en-PH')}`;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string>('');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [placingOrder, setPlacingOrder] = useState<boolean>(false);

  const [profile, setProfile] = useState<any>(null);
  const [authOpen, setAuthOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authSubmitting, setAuthSubmitting] = useState<boolean>(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const swipeTrackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const scrollLeftRef = useRef<number>(0);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev));
    }, 3500);
  };

  const loadStoreData = async () => {
    setLoadingProducts(true);
    setErrorMsg('');
    try {
      const list = await fetchProducts();
      setProducts(Array.isArray(list) ? list : []);
      setBrokenImages({});
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load products from Supabase.');
    } finally {
      setLoadingProducts(false);
    }

    try {
      const vList = await fetchVouchers();
      setVouchers(Array.isArray(vList) ? vList : []);
    } catch {
      // Optional vouchers
    }
  };

  useEffect(() => {
    loadStoreData();

    getSessionProfile()
      .then((sess) => {
        if (sess) setProfile(sess);
      })
      .catch(() => {});

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setProfile(null);
        setOrders([]);
      } else {
        getSessionProfile()
          .then((p) => setProfile(p))
          .catch(() => {});
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profile) return;
    fetchOrders()
      .then((rows) => setOrders(Array.isArray(rows) ? rows : []))
      .catch(() => {});
  }, [profile]);

  const categories = useMemo(() => {
    const uniqueCats = Array.from(
      new Set(products.map((p) => p.cat).filter(Boolean))
    );
    const ordered = Object.keys(CAT_LABELS).filter((k) => uniqueCats.includes(k));
    const extras = uniqueCats.filter((k) => !CAT_LABELS[k]);
    return ['ALL', ...ordered, ...extras];
  }, [products]);

  const brands = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.brand).filter(Boolean))
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCat = selectedCat === 'ALL' || item.cat === selectedCat;
      const matchesBrand = selectedBrand === 'ALL' || item.brand === selectedBrand;
      const matchesSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.brand?.toLowerCase().includes(q) ||
        (item.specs || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);
      return matchesCat && matchesBrand && matchesSearch;
    });
  }, [products, selectedCat, selectedBrand, searchQuery]);

  const cartCount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.qty, 0),
    [cart]
  );

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, entry) => sum + Number(entry.product.price || 0) * entry.qty, 0),
    [cart]
  );

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast('Out of stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast('Reached available stock limit');
          return prev;
        }
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    showToast(`Added ${product.name} to cart`);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.product.id !== productId) return c;
          const nextQty = c.qty + delta;
          if (nextQty <= 0) return null;
          if (nextQty > c.product.stock) {
            showToast('Reached available stock limit');
            return c;
          }
          return { ...c, qty: nextQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 || placingOrder) return;
    setPlacingOrder(true);
    setErrorMsg('');

    try {
      const orderPayload = {
        user_id: profile?.id || null,
        customer_email: profile?.email || '',
        customer_name: profile?.name || 'Guest Customer',
        phone: profile?.phone || '',
        address: '',
        payment_method: 'COD',
        subtotal: cartSubtotal,
        discount: 0,
        total: cartSubtotal,
        status: 'Pending',
        items: cart.map((c) => ({
          id: c.product.id,
          name: c.product.name,
          brand: c.product.brand,
          price: c.product.price,
          qty: c.qty
        }))
      };

      const created = await createOrderRecord(orderPayload);

      for (const entry of cart) {
        const nextStock = Math.max(0, Number(entry.product.stock || 0) - entry.qty);
        await updateProductRecord(entry.product.id, { stock: nextStock });
      }

      setCart([]);
      setCartOpen(false);
      if (created) {
        setOrders((prev) => [created, ...prev]);
      }
      await loadStoreData();
      showToast('Order placed successfully!');
    } catch (err: any) {
      const msg = err?.message || 'Failed to place order';
      setErrorMsg(msg);
      showToast(msg);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePhotoUpload = async (product: Product, file?: File) => {
    if (!file) return;
    setUploadingId(product.id);
    setErrorMsg('');
    try {
      const publicUrl = await uploadProductPhoto(product.id, file);
      if (!publicUrl) throw new Error('No public URL returned from storage');
      await updateProductRecord(product.id, {
        image_url: publicUrl,
        photo_url: publicUrl
      });
      setBrokenImages((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, image_url: publicUrl, photo_url: publicUrl } : p
        )
      );
      showToast(`Updated photo for ${product.name}`);
    } catch (err: any) {
      const msg = err?.message || 'Photo upload failed';
      setErrorMsg(msg);
      showToast(msg);
    } finally {
      setUploadingId(null);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setErrorMsg('');
    try {
      if (authMode === 'login') {
        const userProfile = await signInUser({
          email: authEmail,
          password: authPassword
        });
        setProfile(userProfile);
        setAuthOpen(false);
        showToast(`Welcome back, ${userProfile?.name || 'User'}!`);
      } else {
        const userProfile = await signUpUser({
          name: authName,
          email: authEmail,
          password: authPassword,
          phone: authPhone
        });
        setProfile(userProfile);
        setAuthOpen(false);
        showToast(
          userProfile
            ? 'Account created and signed in!'
            : 'Account created! Check your email if confirmation is required.'
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed';
      setErrorMsg(msg);
      showToast(msg);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setProfile(null);
      setOrders([]);
      showToast('Signed out');
    } catch (err: any) {
      showToast(err?.message || 'Failed to sign out');
    }
  };

  const onPointerDownTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    const track = swipeTrackRef.current;
    if (!track) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - track.offsetLeft;
    scrollLeftRef.current = track.scrollLeft;
  };

  const onPointerMoveTrack = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const track = swipeTrackRef.current;
    if (!track) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startXRef.current) * 1.4;
    track.scrollLeft = scrollLeftRef.current - walk;
  };

  const stopDraggingTrack = () => {
    isDraggingRef.current = false;
  };

  const scrollCategoriesBy = (offset: number) => {
    swipeTrackRef.current?.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="app-root">
      <header className="topbar">
        <div className="brand-block">
          <span className="brand-logo">TECHHUB</span>
          <span className="cloud-badge">
            {isCloudEnabled() ? 'Supabase Live' : 'Offline'}
          </span>
        </div>

        <div className="topbar-controls">
          <input
            type="search"
            className="search-input"
            placeholder="Search RTX 5070, Odyssey, DDR5..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {profile ? (
            <div className="user-chip">
              <span>{profile.name || profile.email}</span>
              <button type="button" onClick={handleLogout}>
                Log out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthOpen(true);
              }}
            >
              Log in
            </button>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => setCartOpen(true)}
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      <main className="app-shell">
        <section className="hero-banner">
          <h1>TechHub Hardware Store</h1>
          <p>
            GPUs, monitors, laptops, memory, and storage dynamically loaded from Supabase.
          </p>
        </section>

        {errorMsg && <div className="error-text">{errorMsg}</div>}

        <div className="cat-swipe-wrapper">
          <button
            type="button"
            className="cat-arrow left"
            aria-label="Scroll categories left"
            onClick={() => scrollCategoriesBy(-220)}
          >
            ‹
          </button>

          <div
            ref={swipeTrackRef}
            className="cat-swipe-track"
            onPointerDown={onPointerDownTrack}
            onPointerMove={onPointerMoveTrack}
            onPointerUp={stopDraggingTrack}
            onPointerLeave={stopDraggingTrack}
          >
            {categories.map((catCode) => {
              const active = selectedCat === catCode;
              const label =
                catCode === 'ALL' ? 'All' : getCategoryLabel(catCode);
              return (
                <button
                  key={catCode}
                  type="button"
                  className={`cat-pill ${active ? 'active' : ''}`}
                  onClick={() => setSelectedCat(catCode)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="cat-arrow right"
            aria-label="Scroll categories right"
            onClick={() => scrollCategoriesBy(220)}
          >
            ›
          </button>
        </div>

        <div className="filter-bar">
          <select
            className="filter-select"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="ALL">All brands ({brands.length})</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <span className="item-count">
            {loadingProducts
              ? 'Loading products...'
              : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'item' : 'items'}`}
          </span>

          <button type="button" onClick={loadStoreData}>
            Refresh
          </button>
        </div>

        {loadingProducts ? (
          <div className="empty-state">Loading products from database...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-state">No products match your current filter.</div>
        ) : (
          <section className="products-grid">
            {filteredProducts.map((item) => {
              const imgUrl = getProductImage(item);
              const showImage = Boolean(imgUrl) && !brokenImages[item.id];
              const specsList = (item.specs || item.description || '')
                .split(';')
                .map((s) => s.trim())
                .filter(Boolean);

              return (
                <article key={item.id} className="product-card">
                  {showImage ? (
                    <img
                      src={imgUrl}
                      alt={item.name}
                      className="product-thumb"
                      loading="lazy"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [item.id]: true }))
                      }
                    />
                  ) : (
                    <div className="product-placeholder">
                      {item.brand || 'TechHub'} • {getCategoryLabel(item.cat)}
                    </div>
                  )}

                  <div className="product-meta">
                    <span className="product-brand">{item.brand}</span>
                    <h3 className="product-title">{item.name}</h3>
                    {specsList.length > 0 && (
                      <p className="product-specs">{specsList.join(' • ')}</p>
                    )}
                  </div>

                  <div className="product-footer">
                    <div className="price-stock-row">
                      <strong className="product-price">
                        {formatPhp(item.price)}
                      </strong>
                      <span className="product-stock">
                        {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    <div className="product-actions">
                      <button
                        type="button"
                        className="add-to-cart-btn"
                        disabled={item.stock <= 0}
                        onClick={() => addToCart(item)}
                      >
                        Add to cart
                      </button>

                      {profile && (
                        <label className="upload-photo-btn">
                          {uploadingId === item.id ? 'Uploading...' : 'Photo'}
                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            disabled={uploadingId === item.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              handlePhotoUpload(item, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {profile && orders.length > 0 && (
          <section className="orders-section">
            <h2>Recent Orders ({orders.length})</h2>
            <div className="orders-list">
              {orders.map((ord) => (
                <div key={ord.id} className="order-card">
                  <div>
                    <strong>{ord.id}</strong> • <span>{ord.status || 'Pending'}</span>
                  </div>
                  <div>Total: {formatPhp(ord.total)}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {cartOpen && (
        <div className="modal-backdrop" onClick={() => setCartOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cart ({cartCount})</h2>
              <button type="button" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="empty-state">Your cart is empty.</p>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(({ product, qty }) => (
                    <div key={product.id} className="cart-row">
                      <div>
                        <div className="cart-item-name">{product.name}</div>
                        <div className="cart-item-sub">
                          {qty} × {formatPhp(product.price)}
                        </div>
                      </div>
                      <div className="cart-qty-controls">
                        <button
                          type="button"
                          onClick={() => updateCartQty(product.id, -1)}
                        >
                          -
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="cart-row-total">
                        {formatPhp(product.price * qty)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cart-subtotal-row">
                  <span>Subtotal</span>
                  <strong>{formatPhp(cartSubtotal)}</strong>
                </div>

                <button
                  type="button"
                  className="btn-primary full-width"
                  disabled={placingOrder}
                  onClick={handlePlaceOrder}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{authMode === 'login' ? 'Log in' : 'Sign up'}</h2>
              <button type="button" onClick={() => setAuthOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authMode === 'signup' && (
                <>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                  />
                </>
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn-primary full-width"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? 'Please wait...'
                  : authMode === 'login'
                    ? 'Log in'
                    : 'Create account'}
              </button>
            </form>

            <button
              type="button"
              className="switch-auth-btn"
              onClick={() =>
                setAuthMode((m) => (m === 'login' ? 'signup' : 'login'))
              }
            >
              {authMode === 'login'
                ? 'Need an account? Sign up'
                : 'Already have an account? Log in'}
            </button>
          </div>
        </div>
      )}

      {toastMsg && <div className="toast-banner">{toastMsg}</div>}
    </div>
  );
}