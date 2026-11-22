export interface Product {
  id: string;
  brand: string;
  cat: string;
  name: string;
  price: number;
  spec: string[];
  stock: number;
  photo: string;
}

export interface Voucher {
  code: string;
  type: string;
  value: number;
  min: number;
  max: number;
  active: boolean;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  q: number;
}

export interface OrderRecord {
  id: string;
  no: string;
  uid: string;
  cust: { name: string; email: string };
  items: OrderItem[];
  addr: { line: string; city: string; zip: string };
  pay: { type: string; label: string; last: string };
  ship: string;
  shipFee: number;
  voucher: string;
  disc: number;
  sub: number;
  total: number;
  status: string;
  log: Array<{ s: string; t: number; by: string }>;
  created: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  active: boolean;
  addrs?: unknown[];
  pays?: unknown[];
}

export declare const supabase: unknown;
export declare function isCloudEnabled(): boolean;
export declare function fetchProducts(): Promise<Product[] | null>;
export declare function createProductRecord(prod: Product): Promise<Product>;
export declare function updateProductRecord(
  id: string,
  patch: Partial<Product>
): Promise<Product>;
export declare function deleteProductRecord(id: string): Promise<void>;
export declare function uploadProductPhoto(
  productId: string,
  blob: Blob
): Promise<string | null>;
export declare function fetchVouchers(): Promise<Voucher[] | null>;
export declare function updateVoucherRecord(
  code: string,
  patch: Partial<Voucher>
): Promise<void>;
export declare function fetchOrders(): Promise<OrderRecord[] | null>;
export declare function createOrderRecord(o: OrderRecord): Promise<OrderRecord>;
export declare function updateOrderRecord(
  id: string,
  patch: Partial<OrderRecord>
): Promise<void>;
export declare function signUpUser(payload: {
  name: string;
  email: string;
  password: string;
  phone: string;
}): Promise<UserProfile | null>;
export declare function signInUser(payload: {
  email: string;
  password: string;
}): Promise<UserProfile>;
export declare function signOutUser(): Promise<void>;
export declare function getSessionProfile(): Promise<UserProfile | null>;
export declare function getProfileById(id: string): Promise<UserProfile>;
export declare function fetchAllProfiles(): Promise<UserProfile[] | null>;
export declare function updateProfileRecord(
  id: string,
  patch: Partial<UserProfile>
): Promise<void>;
