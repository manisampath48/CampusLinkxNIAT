import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public handleFullReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message &&
        /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
          this.state.error.message
        );

      return (
        <div className="p-8 my-6 bg-red-50/90 border border-red-200 rounded-3xl text-center space-y-4 max-w-2xl mx-auto shadow-sm">
          <div className="w-12 h-12 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-red-900">
            {isChunkError
              ? 'New update available or network connection issue'
              : this.props.fallbackTitle || 'Something went wrong rendering this view'}
          </h3>
          <p className="text-xs text-red-700 font-mono bg-red-100/50 p-3 rounded-xl max-h-32 overflow-auto text-left">
            {this.state.error?.toString() || 'Unknown rendering error'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            {isChunkError && (
              <button
                onClick={this.handleFullReload}
                className="px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-neutral-600" />
                <span>Reload Application</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

