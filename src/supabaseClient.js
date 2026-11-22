import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://sjgrcxtxgpwouuugetfl.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZ3JjeHR4Z3B3b3V1dWdldGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNzMxMjgsImV4cCI6MjExMDk0OTEyOH0.Lx0tEwY5PPmiHTz7n34ArbmosaHGfybJB8u4rRkhe0c';

export const supabase =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqZ3JjeHR4Z3B3b3V1dWdldGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNzMxMjgsImV4cCI6MjExMDk0OTEyOH0.Lx0tEwY5PPmiHTz7n34ArbmosaHGfybJB8u4rRkhe0c')
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

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

export async function fetchProducts() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch products'));
  return data || [];
}

export async function createProductRecord(prod) {
  if (!supabase) return prod;
  const { data, error } = await supabase
    .from('products')
    .insert(prod)
    .select()
    .single();
  if (error) throw new Error(getErrMessage(error, 'Failed to create product'));
  return data;
}

export async function updateProductRecord(id, patch) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(getErrMessage(error, 'Failed to update product'));
  return data;
}

export async function deleteProductRecord(id) {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(getErrMessage(error, 'Failed to delete product'));
}

export async function uploadProductPhoto(productId, blob) {
  if (!supabase || !blob) return null;
  const path = `${productId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(getErrMessage(error, 'Failed to upload photo'));
  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function fetchVouchers() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('vouchers').select('*');
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch vouchers'));
  return data || [];
}

export async function updateVoucherRecord(code, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('vouchers').update(patch).eq('code', code);
  if (error) throw new Error(getErrMessage(error, 'Failed to update voucher'));
}

export async function fetchOrders() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created', { ascending: false });
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch orders'));
  return data || [];
}

export async function createOrderRecord(order) {
  if (!supabase) return order;
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select()
    .single();
  if (error) throw new Error(getErrMessage(error, 'Failed to create order'));
  return data;
}

export async function updateOrderRecord(id, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('orders').update(patch).eq('id', id);
  if (error) throw new Error(getErrMessage(error, 'Failed to update order'));
}

export async function getProfileById(id) {
  if (!supabase || !id) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(getErrMessage(error, 'Failed to load profile'));
  return data;
}

export async function signUpUser({ name, email, password, phone }) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Paste your Publishable key into SUPABASE_ANON_KEY in src/supabaseClient.js.'
    );
  }

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
    .select()
    .single();

  if (profileErr) {
    throw new Error(
      getErrMessage(profileErr, 'Account created, but saving profile failed')
    );
  }

  return upserted || profileRow;
}

export async function signInUser({ email, password }) {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Paste your Publishable key into SUPABASE_ANON_KEY in src/supabaseClient.js.'
    );
  }

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
    .select()
    .single();

  if (insertErr) {
    return fallbackProfile;
  }

  return createdProfile || fallbackProfile;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(getErrMessage(error, 'Failed to log out'));
}

export async function getSessionProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  const authUser = data?.session?.user;
  if (!authUser) return null;

  try {
    return await getProfileById(authUser.id);
  } catch {
    return {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      phone: authUser.user_metadata?.phone || '',
      role: 'customer',
      active: true
    };
  }
}

export async function fetchAllProfiles() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(getErrMessage(error, 'Failed to fetch profiles'));
  return data || [];
}

export async function updateProfileRecord(id, patch) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw new Error(getErrMessage(error, 'Failed to update profile'));
}