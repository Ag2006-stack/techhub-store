import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://sjgrcxtxgpwouuugetfl.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_K00IFS3IQMpDGkSnz0PYPw_0evx83D9';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function isCloudEnabled() {
  return Boolean(supabase);
}

function getErrMessage(err, fallback) {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error_description) return err.error_description;
  return fallback;
}

function firstRow(data, fallback = null) {
  if (Array.isArray(data)) return data[0] ?? fallback;
  return data ?? fallback;
}

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch products'));
  return data || [];
}

export async function createProductRecord(prod) {
  const { data, error } = await supabase
    .from('products')
    .insert(prod)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to create product'));
  return firstRow(data, prod);
}

export async function updateProductRecord(id, patch) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to update product'));
  return firstRow(data, null);
}

export async function deleteProductRecord(id) {
  if (!id) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(getErrMessage(error, 'Failed to delete product'));
}

export async function uploadProductPhoto(productId, blob) {
  if (!blob) return null;
  const path = `${productId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(getErrMessage(error, 'Failed to upload photo'));
  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function fetchVouchers() {
  const { data, error } = await supabase.from('vouchers').select('*');
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch vouchers'));
  return data || [];
}

export async function updateVoucherRecord(code, patch) {
  if (!code) return null;
  const { data, error } = await supabase
    .from('vouchers')
    .update(patch)
    .eq('code', code)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to update voucher'));
  return firstRow(data, null);
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created', { ascending: false });
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch orders'));
  return data || [];
}

export async function createOrderRecord(order) {
  const payload = {
    ...order,
    id: order.id || `ORD-${Date.now()}`
  };
  const { data, error } = await supabase
    .from('orders')
    .insert(payload)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to create order'));
  return firstRow(data, payload);
}

export async function updateOrderRecord(id, patch) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', id)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to update order'));
  return firstRow(data, null);
}

export async function getProfileById(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(getErrMessage(error, 'Failed to load profile'));
  return data || null;
}

export async function signUpUser({ name, email, password, phone }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || ''
      }
    }
  });

  if (error) {
    throw new Error(getErrMessage(error, 'Sign up failed'));
  }

  const authUser = data?.user;
  if (!authUser) {
    throw new Error('Sign up did not return a user record.');
  }

  if (!data.session) {
    return null;
  }

  const profileRow = {
    id: authUser.id,
    email: authUser.email || email,
    name: name || authUser.email?.split('@')[0] || 'Customer',
    phone: phone || '',
    role: 'customer',
    active: true
  };

  const { data: upserted, error: profileErr } = await supabase
    .from('profiles')
    .upsert(profileRow, { onConflict: 'id' })
    .select();

  if (profileErr) {
    throw new Error(
      getErrMessage(profileErr, 'Account created, but saving profile failed')
    );
  }

  return firstRow(upserted, profileRow);
}

export async function signInUser({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw new Error(getErrMessage(error, 'Invalid email or password'));
  }

  const authUser = data?.user;
  if (!authUser) {
    throw new Error('Login failed: no user session found.');
  }

  try {
    const profile = await getProfileById(authUser.id);
    if (profile) return profile;
  } catch {
    // Fallback if profile row wasn't created yet
  }

  const fallbackProfile = {
    id: authUser.id,
    email: authUser.email || email,
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
    phone: authUser.user_metadata?.phone || '',
    role: 'customer',
    active: true
  };

  const { data: createdProfile, error: insertErr } = await supabase
    .from('profiles')
    .upsert(fallbackProfile, { onConflict: 'id' })
    .select();

  if (insertErr) {
    return fallbackProfile;
  }

  return firstRow(createdProfile, fallbackProfile);
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(getErrMessage(error, 'Failed to log out'));
}

export async function getSessionProfile() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  const authUser = data?.session?.user;
  if (!authUser) return null;

  try {
    const profile = await getProfileById(authUser.id);
    if (profile) return profile;
  } catch {
    // Fall through to metadata fallback
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
    phone: authUser.user_metadata?.phone || '',
    role: 'customer',
    active: true
  };
}

export async function fetchAllProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch profiles'));
  return data || [];
}

export async function updateProfileRecord(id, patch) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select();
  if (error) throw new Error(getErrMessage(error, 'Failed to update profile'));
  return firstRow(data, null);
}