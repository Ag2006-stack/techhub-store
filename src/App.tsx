import { type FormEvent, useEffect, useMemo, useState } from 'react';
import './styles.css';
import {
  isCloudEnabled,
  fetchProducts,
  createProductRecord,
  updateProductRecord,
  deleteProductRecord,
  uploadProductPhoto,
  fetchVouchers,
  updateVoucherRecord,
  fetchOrders,
  createOrderRecord,
  updateOrderRecord,
  signUpUser,
  signInUser,
  signOutUser,
  getSessionProfile,
  fetchAllProfiles,
  updateProfileRecord,
  type Product,
  type Voucher,
  type OrderRecord,
  type UserProfile
} from './supabaseClient';

const RAW = `ASUS|G|Dual GeForce RTX 5060 OC 8GB|27995|NVIDIA GeForce RTX 5060;8GB GDDR7;PCIe 5.0 x8
ASUS|G|ROG Strix GeForce RTX 5070 Ti OC 16GB|69995|NVIDIA GeForce RTX 5070 Ti;16GB GDDR7;PCIe 5.0 x16
MSI|G|GeForce RTX 5060 Ventus 2X OC 8GB|27495|NVIDIA GeForce RTX 5060;8GB GDDR7;PCIe 5.0 x8
MSI|G|GeForce RTX 5070 Gaming Trio OC 12GB|49995|NVIDIA GeForce RTX 5070;12GB GDDR7;PCIe 5.0 x16
Acer|M|Nitro XV272U V3 27" QHD 180Hz|13995|27" IPS;2560×1440;180Hz
Samsung|M|Odyssey G5 27" QHD 165Hz|16995|27" VA curved;2560×1440;165Hz
Lenovo|L|LOQ 15IAX9 Gaming Laptop|52990|Intel Core i5;RTX 4050 6GB;16GB RAM, 512GB SSD
ASUS|L|TUF Gaming A15 FA507|59990|AMD Ryzen 7;RTX 4050 6GB;16GB RAM, 512GB SSD
Corsair|R|Vengeance DDR5-6000 32GB (2×16GB) CL30|6495|DDR5-6000;32GB (2×16GB);CL30
Samsung|S|990 PRO 1TB NVMe SSD|7995|1TB;NVMe PCIe 4.0;Up to 7,450 MB/s read
Kingston|S|KC3000 1TB NVMe SSD|5995|1TB;NVMe PCIe 4.0;Up to 7,000 MB/s read
GAMDIAS|A|ZEUS E3 RGB Gaming Mouse|1190|Wired gaming mouse;RGB lighting;USB`;

const CATS: Record<string, string> = {
  G: 'Graphics cards',
  M: 'Monitors',
  L: 'Laptops',
  R: 'Memory',
  S: 'Storage',
  A: 'Accessories'
};

const PHOTO_MAP: Record<string, string> = {
  'Dual GeForce RTX 5060 OC 8GB': 'https://dlcdnwebimgs.asus.com/gain/86b4328e-2023-4c9a-9f5c-08862849982c/w800',
  'ROG Strix GeForce RTX 5070 Ti OC 16GB': 'https://dlcdnwebimgs.asus.com/gain/72186e56-6f15-4a12-8b9f-4e8513c8791a/w800',
  'GeForce RTX 5060 Ventus 2X OC 8GB': 'https://asset.msi.com/resize/image/global/product/product_17447021810968098229058957825702.png62405b38c58fe0f07fcef2367d8a9ba1/600.png',
  'GeForce RTX 5070 Gaming Trio OC 12GB': 'https://asset.msi.com/resize/image/global/product/product_17361458559562844522424295248477.png62405b38c58fe0f07fcef2367d8a9ba1/600.png',
  'Nitro XV272U V3 27" QHD 180Hz': 'https://images.acer.com/is/image/acer/Nitro-XV272U-V3-01?$Product-Cards-XL$',
  'Odyssey G5 27" QHD 165Hz': 'https://images.samsung.com/is/image/samsung/p6pim/ph/ls27cg552eexxp/gallery/ph-odyssey-g5-g55c-ls27cg552eexxp-539359498?$650_519_PNG$',
  'LOQ 15IAX9 Gaming Laptop': 'https://p3-ofp.static.pub/fes/cms/2024/05/17/056771019370003711689143902935613895.png',
  'TUF Gaming A15 FA507': 'https://dlcdnwebimgs.asus.com/gain/1b28801c-3f55-4349-9072-182079803371/w800',
  'Vengeance DDR5-6000 32GB (2×16GB) CL30': 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_600,w_600/products/Memory/vengeance-ddr5-blk-config/Gallery/Vengeance-DDR5-2UP-32GB-BLACK_01.webp',
  '990 PRO 1TB NVMe SSD': 'https://images.samsung.com/is/image/samsung/p6pim/ph/mz-v9p1t0bw/gallery/ph-990-pro-nvme-m2-ssd-mz-v9p1t0bw-534292116?$650_519_PNG$',
  'KC3000 1TB NVMe SSD': 'https://media.kingston.com/kingston/product/ktc-product-ssd-kc3000-1024gb-1-zm-lg.jpg'
};

const CAT_PHOTO: Record<string, string> = {
  G: 'https://dlcdnwebimgs.asus.com/gain/86b4328e-2023-4c9a-9f5c-08862849982c/w800',
  M: 'https://images.samsung.com/is/image/samsung/p6pim/ph/ls27cg552eexxp/gallery/ph-odyssey-g5-g55c-ls27cg552eexxp-539359498?$650_519_PNG$',
  L: 'https://dlcdnwebimgs.asus.com/gain/1b28801c-3f55-4349-9072-182079803371/w800',
  R: 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_600,w_600/products/Memory/vengeance-ddr5-blk-config/Gallery/Vengeance-DDR5-2UP-32GB-BLACK_01.webp',
  S: 'https://images.samsung.com/is/image/samsung/p6pim/ph/mz-v9p1t0bw/gallery/ph-990-pro-nvme-m2-ssd-mz-v9p1t0bw-534292116?$650_519_PNG$',
  A: 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_600,w_600/products/Gaming-Mice/CH-9309411-NA/Gallery/KATAR_PRO_WIRELESS_01.webp'
};

const seedProducts = (): Product[] =>
  RAW.split('\n').map((line, i) => {
    const [brand, cat, name, price, specStr] = line.split('|');
    return {
      id: 'p' + i,
      brand,
      cat,
      name,
      price: Number(price),
      spec: specStr.split(';'),
      stock: 10 + (i % 7) * 3,
      photo: ''
    };
  });

const peso = (n: number) => '₱' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function compressPhoto(file: File): Promise<{ blob: Blob; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const max = 800;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Photo compression failed'));
            resolve({ blob, previewUrl: canvas.toDataURL('image/jpeg', 0.85) });
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function ProductPhoto({ product }: { product: Product }) {
  const [src, setSrc] = useState(
    product.photo || PHOTO_MAP[product.name] || CAT_PHOTO[product.cat] || ''
  );

  useEffect(() => {
    setSrc(product.photo || PHOTO_MAP[product.name] || CAT_PHOTO[product.cat] || '');
  }, [product.photo, product.name, product.cat]);

  return (
    <img
      src={src}
      alt={`${product.brand} ${product.name}`}
      loading="lazy"
      onError={() => {
        if (src !== CAT_PHOTO[product.cat] && CAT_PHOTO[product.cat]) {
          setSrc(CAT_PHOTO[product.cat]);
        } else {
          setSrc('https://placehold.co/600x400/1A2540/EEF2F8?text=TechHub+Hardware');
        }
      }}
    />
  );
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [view, setView] = useState<'shop' | 'panel'>('shop');
  const [panelTab, setPanelTab] = useState<'products' | 'orders' | 'vouchers' | 'users'>('products');
  const [cat, setCat] = useState('all');
  const [brand, setBrand] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  const [authForm, setAuthForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [newProd, setNewProd] = useState({
    brand: '',
    cat: 'G',
    name: '',
    price: '',
    stock: '10',
    spec: ''
  });

  const openAuthModal = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthError('');
    setShowPassword(false);
    setAuthOpen(true);
  };

  const closeAuthModal = () => {
    setAuthOpen(false);
    setAuthError('');
    setShowPassword(false);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((prev) => (prev === msg ? '' : prev)), 2400);
  };

  const loadAllCloud = async (activeProfile: UserProfile | null) => {
    if (!isCloudEnabled()) return;
    try {
      const [pRows, vRows, oRows] = await Promise.all([
        fetchProducts(),
        fetchVouchers(),
        fetchOrders()
      ]);
      if (pRows && pRows.length) setProducts(pRows);
      if (vRows) setVouchers(vRows);
      if (oRows) setOrders(oRows);
      if (activeProfile && ['staff', 'admin'].includes(activeProfile.role)) {
        const uRows = await fetchAllProfiles();
        if (uRows) setProfiles(uRows);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    (async () => {
      if (!isCloudEnabled()) return;
      try {
        const sessionUser = await getSessionProfile();
        setUser(sessionUser);
        await loadAllCloud(sessionUser);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const isStaff = Boolean(user && user.active && ['staff', 'admin'].includes(user.role));
  const isAdmin = Boolean(user && user.active && user.role === 'admin');

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort(),
    [products]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (cat === 'all' || p.cat === cat) &&
        (brand === 'all' || p.brand === brand) &&
        (!q ||
          `${p.brand} ${p.name} ${p.spec.join(' ')} ${CATS[p.cat] || ''}`
            .toLowerCase()
            .includes(q))
    );
  }, [products, cat, brand, search]);

  const addToCart = (prod: Product) => {
    if (prod.stock <= 0) return;
    const nextQty = (cart[prod.id] || 0) + 1;
    if (nextQty > prod.stock) {
      showToast(`Only ${prod.stock} in stock`);
      return;
    }
    setCart((prev) => ({ ...prev, [prod.id]: nextQty }));
    showToast(`${prod.brand} ${prod.name} added`);
  };

  const cartList = Object.entries(cart)
    .map(([id, q]) => ({ p: products.find((x) => x.id === id), q }))
    .filter((x): x is { p: Product; q: number } => Boolean(x.p && x.q > 0));

  const cartCount = cartList.reduce((acc, x) => acc + x.q, 0);
  const cartSubtotal = cartList.reduce((acc, x) => acc + x.p.price * x.q, 0);

  const handleCheckout = async () => {
    if (!user) {
      setCartOpen(false);
      openAuthModal('login');
      return;
    }
    if (!cartList.length) return;

    const shipFee = cartSubtotal >= 5000 ? 0 : 99;
    const order: OrderRecord = {
      id: 'ord_' + Date.now(),
      no: 'TH-' + Math.floor(100000 + Math.random() * 900000),
      uid: user.id,
      cust: { name: user.name, email: user.email },
      items: cartList.map((x) => ({
        id: x.p.id,
        name: `${x.p.brand} ${x.p.name}`,
        price: x.p.price,
        q: x.q
      })),
      addr: { line: 'Pickup / Verified Member', city: 'Iligan City', zip: '9200' },
      pay: { type: 'cod', label: 'Cash on delivery', last: '' },
      ship: 'std',
      shipFee,
      voucher: '',
      disc: 0,
      sub: cartSubtotal,
      total: cartSubtotal + shipFee,
      status: 'Pending',
      log: [{ s: 'Pending', t: Date.now(), by: user.name }],
      created: Date.now()
    };

    try {
      for (const x of cartList) {
        const nextStock = Math.max(0, x.p.stock - x.q);
        setProducts((prev) =>
          prev.map((item) => (item.id === x.p.id ? { ...item, stock: nextStock } : item))
        );
        await updateProductRecord(x.p.id, { stock: nextStock });
      }
      await createOrderRecord(order);
      setOrders((prev) => [order, ...prev]);
      setCart({});
      setCartOpen(false);
      showToast(`Order ${order.no} placed!`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Checkout failed');
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!isCloudEnabled()) {
      setAuthError('Add your Supabase anon key in src/supabaseClient.js first.');
      return;
    }
    try {
      if (authMode === 'login') {
        const loggedIn = await signInUser({
          email: authForm.email.trim(),
          password: authForm.password
        });
        setUser(loggedIn);
        closeAuthModal();
        await loadAllCloud(loggedIn);
        showToast(`Welcome back, ${loggedIn.name}!`);
      } else {
        const created = await signUpUser({
          name: authForm.name.trim(),
          email: authForm.email.trim(),
          phone: authForm.phone.trim(),
          password: authForm.password
        });
        if (!created) {
          setAuthError('Check your email to confirm your account, then log in.');
          return;
        }
        setUser(created);
        closeAuthModal();
        await loadAllCloud(created);
        showToast(`Account created for ${created.name}!`);
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return showToast('Only Admin can add products');
    const item: Product = {
      id: 'p_' + Date.now(),
      brand: newProd.brand.trim(),
      cat: newProd.cat,
      name: newProd.name.trim(),
      price: Number(newProd.price) || 0,
      stock: Number(newProd.stock) || 0,
      spec: newProd.spec
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean),
      photo: ''
    };
    try {
      await createProductRecord(item);
      setProducts((prev) => [item, ...prev]);
      setNewProd({ brand: '', cat: 'G', name: '', price: '', stock: '10', spec: '' });
      showToast('Product saved to Supabase');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Could not add product');
    }
  };

  const handlePhotoUpload = async (productId: string, file?: File) => {
    if (!isStaff || !file) return;
    try {
      const { blob, previewUrl } = await compressPhoto(file);
      const url = (isCloudEnabled() ? await uploadProductPhoto(productId, blob) : previewUrl) || previewUrl;
      await updateProductRecord(productId, { photo: url });
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, photo: url } : p))
      );
      showToast('Photo uploaded to Supabase Storage');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Photo upload failed');
    }
  };

  const handleStockChange = async (productId: string, val: string) => {
    if (!isStaff) return;
    const nextStock = Math.max(0, Number(val) || 0);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: nextStock } : p))
    );
    try {
      await updateProductRecord(productId, { stock: nextStock });
      showToast('Stock updated');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Stock update failed');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isAdmin) return showToast('Only Admin can delete products');
    try {
      await deleteProductRecord(productId);
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showToast('Product deleted');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div>
      <header>
        <div className="wrap top">
          <button className="logo" onClick={() => setView('shop')}>
            <i>T</i>
            <span>TECHHUB</span>
          </button>

          <label className="search">
            <input
              type="search"
              placeholder="Search RTX 5070, Odyssey G5, DDR5, NVMe..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {isStaff && (
            <button
              className="hb"
              onClick={() => setView(view === 'panel' ? 'shop' : 'panel')}
            >
              {view === 'panel' ? 'Storefront' : 'Panel'}
            </button>
          )}

          {user ? (
            <button
              className="hb"
              onClick={async () => {
                await signOutUser();
                setUser(null);
                setView('shop');
                showToast('Logged out');
              }}
            >
              Logout
            </button>
          ) : (
            <button className="hb pr" onClick={() => openAuthModal('login')}>
              Log in
            </button>
          )}

          <button className="ib" onClick={() => setCartOpen(true)} aria-label="Cart">
            🛒
            {cartCount > 0 && <span className="cnt">{cartCount}</span>}
          </button>
        </div>
      </header>

      <main className="wrap">
        {view === 'shop' ? (
          <>
            <section className="hero">
              <span className="pill">
                React + Vite + Supabase · {isCloudEnabled() ? 'Live Cloud' : 'Local Preview'}
              </span>
              <h1>TechHub Mobile Store</h1>
              <p>
                GPUs, monitors, laptops, memory, and SSDs with live Supabase database &amp; storage.
              </p>
            </section>

            <div className="chips">
              {[['all', 'All'], ...Object.entries(CATS)].map(([key, label]) => (
                <button
                  key={key}
                  className="chip"
                  aria-pressed={cat === key}
                  onClick={() => setCat(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="bar">
              <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                <option value="all">All brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <span className="meta">{filtered.length} items</span>
            </div>

            <div className="grid">
              {filtered.map((p) => (
                <article className="card" key={p.id}>
                  <div className="art" onClick={() => setSelectedProduct(p)}>
                    <ProductPhoto product={p} />
                  </div>
                  <div className="b">
                    <span className="br">{p.brand}</span>
                    <h3 onClick={() => setSelectedProduct(p)}>{p.name}</h3>
                    <div className="pr">{peso(p.price)}</div>
                    <span className={`st ${p.stock <= 0 ? 'out' : p.stock <= 5 ? 'low' : ''}`}>
                      {p.stock <= 0 ? 'Sold out' : p.stock <= 5 ? `${p.stock} left` : 'In stock'}
                    </span>
                    <button
                      className="add"
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p)}
                    >
                      {p.stock <= 0 ? 'Sold out' : 'Add to cart'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <section style={{ padding: '16px 0 36px' }}>
            <div className="chips">
              {(['products', 'orders', 'vouchers', 'users'] as const).map((tab) => (
                <button
                  key={tab}
                  className="chip"
                  aria-pressed={panelTab === tab}
                  onClick={() => setPanelTab(tab)}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {panelTab === 'products' && (
              <>
                {isAdmin && (
                  <form className="card2" onSubmit={handleCreateProduct}>
                    <h3 style={{ marginBottom: 6 }}>Add New Product</h3>
                    <label className="f">Brand</label>
                    <input
                      className="in"
                      required
                      value={newProd.brand}
                      onChange={(e) => setNewProd({ ...newProd, brand: e.target.value })}
                    />
                    <label className="f">Category</label>
                    <select
                      className="in"
                      value={newProd.cat}
                      onChange={(e) => setNewProd({ ...newProd, cat: e.target.value })}
                    >
                      {Object.entries(CATS).map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <label className="f">Model Name</label>
                    <input
                      className="in"
                      required
                      value={newProd.name}
                      onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                    />
                    <label className="f">Price (₱)</label>
                    <input
                      className="in"
                      type="number"
                      required
                      value={newProd.price}
                      onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    />
                    <label className="f">Stock</label>
                    <input
                      className="in"
                      type="number"
                      required
                      value={newProd.stock}
                      onChange={(e) => setNewProd({ ...newProd, stock: e.target.value })}
                    />
                    <label className="f">Specs (separate with ;)</label>
                    <input
                      className="in"
                      placeholder="16GB GDDR7; PCIe 5.0; Triple Fan"
                      value={newProd.spec}
                      onChange={(e) => setNewProd({ ...newProd, spec: e.target.value })}
                    />
                    <button className="btn" style={{ marginTop: 12 }}>
                      Save Product
                    </button>
                  </form>
                )}

                {products.map((p) => (
                  <div className="card2" key={p.id}>
                    <div className="rowb">
                      <div>
                        <span className="br">{p.brand}</span>
                        <div>
                          <b>{p.name}</b> · {peso(p.price)}
                        </div>
                      </div>
                      <div className="ctl">
                        <label>
                          Stock:{' '}
                          <input
                            type="number"
                            value={p.stock}
                            onChange={(e) => handleStockChange(p.id, e.target.value)}
                          />
                        </label>
                        <label className="up">
                          Upload Photo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoUpload(p.id, e.target.files?.[0])}
                          />
                        </label>
                        {isAdmin && (
                          <button
                            className="sm bad"
                            onClick={() => handleDeleteProduct(p.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {panelTab === 'orders' &&
              orders.map((o) => (
                <div className="card2" key={o.id}>
                  <div className="rowb">
                    <b>{o.no}</b>
                    <span className={`stat ${o.status}`}>{o.status}</span>
                  </div>
                  <div className="note">
                    {o.cust?.name} ({o.cust?.email}) · Total: {peso(o.total)}
                  </div>
                  <div className="ctl">
                    <select
                      value={o.status}
                      onChange={async (e) => {
                        const nextStatus = e.target.value;
                        await updateOrderRecord(o.id, { status: nextStatus });
                        setOrders((prev) =>
                          prev.map((item) =>
                            item.id === o.id ? { ...item, status: nextStatus } : item
                          )
                        );
                        showToast(`Order ${o.no} → ${nextStatus}`);
                      }}
                    >
                      {['Pending', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

            {panelTab === 'vouchers' &&
              vouchers.map((v) => (
                <div className="card2" key={v.code}>
                  <div className="rowb">
                    <b>{v.code}</b>
                    <button
                      className="sm alt"
                      onClick={async () => {
                        const nextActive = !v.active;
                        await updateVoucherRecord(v.code, { active: nextActive });
                        setVouchers((prev) =>
                          prev.map((item) =>
                            item.code === v.code ? { ...item, active: nextActive } : item
                          )
                        );
                      }}
                    >
                      {v.active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  <div className="note">Min spend: {peso(v.min)}</div>
                </div>
              ))}

            {panelTab === 'users' &&
              profiles.map((pr) => (
                <div className="card2" key={pr.id}>
                  <div className="rowb">
                    <b>{pr.name}</b>
                    <select
                      value={pr.role}
                      disabled={!isAdmin || pr.id === user?.id}
                      onChange={async (e) => {
                        const nextRole = e.target.value;
                        await updateProfileRecord(pr.id, { role: nextRole });
                        setProfiles((prev) =>
                          prev.map((x) => (x.id === pr.id ? { ...x, role: nextRole } : x))
                        );
                        showToast('Role updated');
                      }}
                    >
                      <option value="customer">customer</option>
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div className="note">{pr.email}</div>
                </div>
              ))}
          </section>
        )}
      </main>

      {selectedProduct && (
        <div className="modal-bg" onClick={() => setSelectedProduct(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sh">
              <h2>
                {selectedProduct.brand} {selectedProduct.name}
              </h2>
              <button className="ib" onClick={() => setSelectedProduct(null)}>
                ✕
              </button>
            </div>
            <div className="big">
              <ProductPhoto product={selectedProduct} />
            </div>
            <div className="dp">{peso(selectedProduct.price)}</div>
            <table>
              <tbody>
                {selectedProduct.spec.map((line, i) => (
                  <tr key={i}>
                    <td>Spec {i + 1}</td>
                    <td>{line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="btn"
              onClick={() => {
                addToCart(selectedProduct);
                setSelectedProduct(null);
              }}
            >
              Add to cart
            </button>
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="modal-bg" onClick={() => setCartOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sh">
              <h2>Cart ({cartCount})</h2>
              <button className="ib" onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>
            {!cartList.length ? (
              <p className="note">Your cart is empty.</p>
            ) : (
              <>
                {cartList.map(({ p, q }) => (
                  <div className="card2 rowb" key={p.id}>
                    <div>
                      <b>
                        {p.brand} {p.name}
                      </b>
                      <div className="note">
                        {q} × {peso(p.price)}
                      </div>
                    </div>
                    <b>{peso(p.price * q)}</b>
                  </div>
                ))}
                <div className="card2">
                  <div className="rowb">
                    <b>Subtotal</b>
                    <b>{peso(cartSubtotal)}</b>
                  </div>
                </div>
                <button className="btn" onClick={handleCheckout}>
                  {user ? 'Place Order' : 'Log in to Checkout'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div className="modal-bg" onClick={closeAuthModal}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sh">
              <h2>{authMode === 'login' ? 'Log in to TechHub' : 'Create Account'}</h2>
              <button className="ib" onClick={closeAuthModal}>
                ✕
              </button>
            </div>
            <div className="chips">
              <button
                type="button"
                className="chip"
                aria-pressed={authMode === 'login'}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setShowPassword(false);
                }}
              >
                Log in
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={authMode === 'signup'}
                onClick={() => {
                  setAuthMode('signup');
                  setAuthError('');
                  setShowPassword(false);
                }}
              >
                Sign up
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              {authMode === 'signup' && (
                <>
                  <label className="f">Full Name</label>
                  <input
                    className="in"
                    required
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  />
                  <label className="f">Mobile Number</label>
                  <input
                    className="in"
                    placeholder="09xxxxxxxxx"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                  />
                </>
              )}
              <label className="f">Email</label>
              <input
                className="in"
                type="email"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
              />
              <label className="f">Password</label>
              <div className="pw-row">
                <input
                  className="in"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                />
                <button
                  type="button"
                  className="pw-tog"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {authError && <div className="em">{authError}</div>}
              <button className="btn" style={{ marginTop: 14 }}>
                {authMode === 'login' ? 'Log in' : 'Sign up'}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className="bnav" aria-label="Mobile navigation">
        <button
          className={view === 'shop' ? 'on' : ''}
          onClick={() => setView('shop')}
        >
          <span>🏠</span>
          <span>Shop</span>
        </button>
        <button onClick={() => setCartOpen(true)}>
          <span>🛒</span>
          <span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>
        </button>
        <button
          className={view === 'panel' ? 'on' : ''}
          onClick={() => {
            if (!user) {
              openAuthModal('login');
            } else if (isStaff) {
              setView(view === 'panel' ? 'shop' : 'panel');
            } else {
              showToast(`Signed in as ${user.name}`);
            }
          }}
        >
          <span>{isStaff ? '⚙️' : '👤'}</span>
          <span>{user ? (isStaff ? 'Panel' : 'Account') : 'Log in'}</span>
        </button>
      </nav>

      {toastMsg && <div className="toast">{toastMsg}</div>}
    </div>
  );
}