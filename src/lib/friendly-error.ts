// Traduce los mensajes crudos de Supabase/Postgres (en inglés o técnicos) a un
// texto que un vecino o un administrador pueda entender. Si el mensaje ya está en
// castellano (nuestros propios `throw new Error('...')` y los RAISE de la DB), se
// devuelve tal cual.

const RULES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'El email o la contraseña no son correctos.'],
  [/email not confirmed/i, 'Todavía no confirmaste tu email. Revisá tu casilla (y la carpeta de spam) y tocá el enlace que te enviamos.'],
  [/user already registered|already been registered/i, 'Ya existe una cuenta con ese email. Probá iniciar sesión o recuperar la contraseña.'],
  [/password should be at least (\d+)/i, 'La contraseña es muy corta. Usá al menos 8 caracteres.'],
  [/password.*(weak|pwned|leaked)/i, 'Esa contraseña es demasiado fácil de adivinar. Elegí otra.'],
  [/unable to validate email|invalid email|email address .* is invalid/i, 'El email no parece válido. Revisalo e intentá de nuevo.'],
  [/signup.*disabled|signups not allowed/i, 'El registro está deshabilitado por el momento.'],
  [/rate limit|too many requests|security purposes.*after (\d+) seconds/i, 'Hiciste demasiados intentos seguidos. Esperá un minuto y probá de nuevo.'],
  [/new password should be different/i, 'La nueva contraseña tiene que ser distinta a la anterior.'],
  [/(jwt|token).*(expired|invalid)|session.*(expired|missing|not found)|refresh token/i, 'Tu sesión venció. Volvé a iniciar sesión.'],
  [/failed to fetch|networkerror|network request failed|load failed/i, 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.'],
  [/row-level security|permission denied|not authorized|insufficient.privilege/i, 'No tenés permiso para hacer esto.'],
  [/duplicate key|already exists|unique constraint/i, 'Ya existe un registro con esos datos.'],
  [/violates foreign key/i, 'No se puede completar porque hay datos asociados a este registro.'],
  [/violates not-null|null value in column/i, 'Falta completar un dato obligatorio.'],
  [/violates check constraint/i, 'Alguno de los datos no es válido. Revisalos e intentá de nuevo.'],
  [/invalid input syntax|invalid input value/i, 'Alguno de los datos tiene un formato inválido.'],
  [/value too long/i, 'Alguno de los textos es demasiado largo.'],
  [/payload too large|exceeded the maximum allowed size/i, 'El archivo es demasiado grande.'],
  [/mime type .* not supported|invalid mime/i, 'Ese tipo de archivo no está permitido.'],
  [/json object requested|multiple \(or no\) rows|no rows/i, 'No encontramos el dato que buscabas.'],
  [/edge function returned a non-2xx|functionshttperror|failed to send a request to the edge function/i, 'El servidor no pudo completar la operación. Probá de nuevo en unos minutos.'],
  [/timeout|timed out/i, 'La operación tardó demasiado. Probá de nuevo.'],
];

const GENERIC = 'Ocurrió un error inesperado. Probá de nuevo.';

export function friendlyError(input: unknown): string {
  const raw = typeof input === 'string'
    ? input
    : (input as { message?: unknown } | null | undefined)?.message;
  const message = typeof raw === 'string' ? raw.trim() : '';
  if (!message) return GENERIC;
  for (const [pattern, text] of RULES) {
    if (pattern.test(message)) return text;
  }
  return message;
}
