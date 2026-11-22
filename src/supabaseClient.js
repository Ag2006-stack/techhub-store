import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sjgrcxtxgpwouuugetfl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_K00IFS3IQMpDGkSnz0PYPw_0evx83D9';

const hasConfig =
  SUPABASE_URL.startsWith('https://') &&
  Boolean(SUPABASE_ANON_KEY) &&
  !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');

export const supabase = hasConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isCloudEnabled = () => Boolean(supabase);

export async function fetchProducts() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    price: Number(row.price),
    stock: Number(row.stock),
    spec: Array.isArray(row.spec) ? row.spec : [],
  }));
}

export async function createProductRecord(prod) {
  if (!supabase) return prod;
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: prod.id,
      brand: prod.brand,
      cat: prod.cat,
      name: prod.name,
      price: prod.price,
      spec: prod.spec,
      stock: prod.stock,
      photo: prod.photo || '',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProductRecord(id, patch) {
  if (!supabase) return patch;
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProductRecord(id) {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadProductPhoto(productId, blob) {
  if (!supabase) return null;
  const filePath = `${productId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('product-photos')
    .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage
    .from('product-photos')
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function fetchVouchers() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((v) => ({
    code: v.code,
    type: v.type,
    value: Number(v.value),
    min: Number(v.min_spend),
    max: Number(v.max_disc),
    active: Boolean(v.active),
  }));
}

export async function updateVoucherRecord(code, patch) {
  if (!supabase) return;
  const dbPatch = {};
  if ('active' in patch) dbPatch.active = patch.active;
  const { error } = await supabase
    .from('vouchers')
    .update(dbPatch)
    .eq('code', code);
  if (error) throw error;
}

export async function fetchOrders() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((o) => ({
    id: o.id,
    no: o.order_no,
    uid: o.user_id,
    cust: o.cust,
    items: o.items,
    addr: o.addr,
    pay: o.pay,
    ship: o.ship,
    shipFee: Number(o.ship_fee),
    voucher: o.voucher,
    disc: Number(o.disc),
    sub: Number(o.sub),
    total: Number(o.total),
    status: o.status,
    log: o.log || [],
    created: new Date(o.created_at).getTime(),
  }));
}

export async function createOrderRecord(o) {
  if (!supabase) return o;
  const { error } = await supabase.from('orders').insert({
    id: o.id,
    order_no: o.no,
    user_id: o.uid,
    cust: o.cust,
    items: o.items,
    addr: o.addr,
    pay: o.pay,
    ship: o.ship,
    ship_fee: o.shipFee,
    voucher: o.voucher,
    disc: o.disc,
    sub: o.sub,
    total: o.total,
    status: o.status,
    log: o.log,
  });
  if (error) throw error;
  return o;
}

export async function updateOrderRecord(id, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) throw error;
}

export async function signUpUser({ name, email, password, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone } },
  });
  if (error) throw error;
  const user = data.user;
  if (!user) return null;
  const profile = {
    id: user.id,
    email,
    name,
    phone,
    role: 'customer',
    active: true,
    addrs: [],
    pays: [],
  };
  const { error: pErr } = await supabase.from('profiles').upsert(profile);
  if (pErr) throw pErr;
  return profile;
}

export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return getProfileById(data.user.id);
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSessionProfile() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) return null;
  return getProfileById(uid);
}

export async function getProfileById(id) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return {
    ...data,
    addrs: Array.isArray(data.addrs) ? data.addrs : [],
    pays: Array.isArray(data.pays) ? data.pays : [],
  };
}

export async function fetchAllProfiles() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((d) => ({
    ...d,
    addrs: Array.isArray(d.addrs) ? d.addrs : [],
    pays: Array.isArray(d.pays) ? d.pays : [],
  }));
}

export async function updateProfileRecord(id, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}
