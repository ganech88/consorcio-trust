import { useToast } from '../components/Toast';

// Toast.jsx todavía es JS: este hook le pone tipos para los componentes .tsx.
export interface ToastApi {
  success: (message: string, title?: string) => void;
  error: (message: unknown, title?: string) => void;
  info: (message: string, title?: string) => void;
}

export function useAppToast(): ToastApi {
  return useToast() as unknown as ToastApi;
}
