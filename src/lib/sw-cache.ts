// Cachés runtime del service worker con datos del usuario (ver vite.config.js).
// 'supabase-storage-cache' ya no se usa, pero se limpia por si quedó de versiones viejas.
export const USER_DATA_CACHES = ['supabase-api-cache', 'supabase-storage-cache'];

/**
 * Borra las respuestas cacheadas de la API al cerrar sesión, para que en un
 * dispositivo compartido el próximo usuario no vea (offline) datos del anterior.
 * Nunca lanza: si Cache Storage no está disponible, no hace nada.
 */
export async function clearUserDataCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await Promise.all(USER_DATA_CACHES.map((name) => caches.delete(name)));
  } catch {
    /* sin Cache Storage (modo privado, etc.): nada que limpiar */
  }
}
