/**
 * fileProxy.js
 * 
 * Converts any stored file URL (Cloudinary, local, etc.) into a
 * backend proxy URL so the actual storage provider is never revealed
 * to the end user.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Returns the URL that should be used in <a href> / <img src> / window.open()
 * instead of the raw Cloudinary link.
 */
export function proxyFileUrl(rawUrl) {
  if (!rawUrl) return '';
  // Already a proxy URL – return as-is to avoid double-wrapping
  if (rawUrl.includes('/api/files/view')) return rawUrl;
  return `${API_BASE}/files/view?url=${encodeURIComponent(rawUrl)}`;
}

/**
 * Opens a file in a new browser tab through the proxy.
 * Includes the auth token in the URL as a query param so the backend
 * can authenticate without needing the Authorization header on navigation.
 * (The backend middleware already reads req.query.token as fallback.)
 */
export function openProxiedFile(rawUrl) {
  if (!rawUrl) return;
  const token = localStorage.getItem('accessToken') || '';
  const proxied = `${API_BASE}/files/view?url=${encodeURIComponent(rawUrl)}&token=${encodeURIComponent(token)}`;
  window.open(proxied, '_blank', 'noopener,noreferrer');
}

export function downloadProxiedFile(rawUrl, filename = 'school-resource') {
  if (!rawUrl) return;
  const token = localStorage.getItem('accessToken') || '';
  const proxied = new URL(`${API_BASE}/files/view`);
  proxied.searchParams.set('url', rawUrl);
  proxied.searchParams.set('token', token);
  proxied.searchParams.set('download', 'true');
  proxied.searchParams.set('filename', filename);
  window.location.assign(proxied.toString());
}
