import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    import('../lib/sentry').then(({ captureError }) => captureError(error, { componentStack: errorInfo?.componentStack })).catch(() => {});
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-surface-base p-4">
          <div className="max-w-md w-full bg-white dark:bg-surface-panel rounded-2xl border border-slate-100 dark:border-white/[0.07] p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 dark:text-ink-hi mb-2">
              Algo salió mal
            </h2>

            <p className="text-slate-500 dark:text-ink-mid mb-6">
              Ocurrió un error inesperado. Podés intentar recargar la
              aplicación.
            </p>

            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>

            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-slate-400 dark:text-ink-low hover:text-slate-600 dark:hover:text-slate-300">
                  Detalles del error
                </summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-surface-base rounded-lg text-xs text-slate-600 dark:text-ink-mid overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
