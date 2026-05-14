import { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crash:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
    if (typeof window !== "undefined") window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-soft p-6">
        <div className="max-w-md w-full bg-surface border border-line rounded-2xl shadow-card p-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-500/10 text-danger mb-4">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-semibold text-ink">Algo se rompió</h1>
          <p className="text-sm text-ink-muted mt-1">
            Marea encontró un error inesperado. Tu información sigue a salvo en el servidor.
          </p>
          <pre className="mt-3 text-[11px] text-ink-muted bg-surface-muted rounded-lg p-2 text-left overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.reset}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <RefreshCw className="h-4 w-4" />
            Recargar
          </button>
        </div>
      </div>
    );
  }
}
