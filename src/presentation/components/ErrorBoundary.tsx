import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
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
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-slate-50 dark:bg-slate-900 h-screen w-full flex flex-col justify-center items-center text-center">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-red-200 dark:border-red-900/30 max-w-2xl w-full">
                <h1 className="text-xl font-bold mb-4 text-red-600 dark:text-red-400">Application Error</h1>
                <p className="text-slate-600 dark:text-slate-300 mb-4">An error occurred while rendering this component.</p>
                <div className="text-left bg-slate-100 dark:bg-slate-900 p-4 rounded border border-slate-200 dark:border-slate-700 overflow-auto max-h-64 mb-6">
                    <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap">
                        {this.state.error?.toString()}
                    </pre>
                </div>
                <button 
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors font-medium"
                    onClick={() => window.location.reload()}
                >
                    Reload Application
                </button>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}
