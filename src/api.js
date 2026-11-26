const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const TOKEN_KEY = "atelier_jwt_token";
const USER_KEY = "atelier_user_email";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, email) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (email) localStorage.setItem(USER_KEY, email);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getSavedEmail() {
  return localStorage.getItem(USER_KEY) || "";
}

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    const msg =
      (payload &&
        typeof payload === "object" &&
        (payload.message || payload.error)) ||
      `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data !== undefined &&
    payload.data !== null
  ) {
    return payload.data;
  }
  return payload;
}

export const api = {
  login: (credentials) =>
    request("/api/auth/login", { method: "POST", body: credentials }),
  register: (details) =>
    request("/api/auth/register", { method: "POST", body: details }),
  getCategories: () => request("/api/categories"),
  getProducts: () => request("/api/products"),
  getCart: () => request("/api/cart", { auth: true }),
  addToCart: (productId, quantity = 1) =>
    request("/api/cart/items", {
      method: "POST",
      body: { productId, quantity },
      auth: true,
    }),
  updateCartItem: (itemId, quantity) =>
    request(`/api/cart/items/${itemId}`, {
      method: "PUT",
      body: { quantity },
      auth: true,
    }),
  removeCartItem: (itemId) =>
    request(`/api/cart/items/${itemId}`, { method: "DELETE", auth: true }),
  placeOrder: (orderPayload) =>
    request("/api/orders", { method: "POST", body: orderPayload, auth: true }),
  getOrders: () => request("/api/orders", { auth: true }),
};
