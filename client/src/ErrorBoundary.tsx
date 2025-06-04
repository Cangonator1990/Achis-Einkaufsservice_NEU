import { Component, ReactNode, ErrorInfo } from "react";
import ErrorFallback from "./pages/error-fallback";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Erkennen bestimmter kritischer Fehler
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') || 
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Vite') ||
        error.message.includes('Chunk loading failed')) {
      // Fallback-UI direkt anzeigen
      document.body.classList.add('show-fallback');
    }
    
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error information
    console.error("Fehler in Komponente abgefangen:", error);
    console.error("Komponentenstapel:", errorInfo.componentStack);
    
    // Für Netzwerk- oder Modul-Ladefehler aktivieren wir den HTML-Fallback
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') || 
        error.message.includes('ChunkLoadError') ||
        error.message.includes('Vite') ||
        error.message.includes('Chunk loading failed')) {
      document.body.classList.add('show-fallback');
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    try {
      if (this.state.hasError) {
        // Standardfallback oder angegebenes Fallback rendern
        if (this.props.fallback) {
          return this.props.fallback;
        }

        return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
      }

      return this.props.children;
    } catch (error) {
      console.error("Schwerwiegender Fehler im ErrorBoundary-Rendering:", error);
      document.body.classList.add('show-fallback');
      
      // Mindestfallback - ein leeres Div, um React nicht abstürzen zu lassen
      return <div className="hidden-error-state"></div>;
    }
  }
}