import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PuzzleTown ErrorBoundary] Caught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#dfb888',
            color: '#2b1e16',
            fontFamily: "'Nunito', system-ui, sans-serif",
            padding: 24,
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: '3rem',
              marginBottom: 16
            }}
          >
            🏡
          </div>
          <h2
            style={{
              fontFamily: "'Fredoka', 'Nunito', sans-serif",
              fontSize: '1.6rem',
              marginBottom: 8,
              color: '#442e1b'
            }}
          >
            Village Hiccup
          </h2>
          <p
            style={{
              maxWidth: 360,
              fontSize: '1rem',
              lineHeight: 1.5,
              marginBottom: 24,
              color: '#5c3e24'
            }}
          >
            PuzzleTown ran into a brief hiccup. Your game progress is saved safely.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              backgroundColor: '#4692d6',
              color: '#fff',
              border: '2px solid #2b5d8c',
              borderRadius: 12,
              padding: '12px 28px',
              fontSize: '1.05rem',
              fontWeight: 700,
              fontFamily: "'Fredoka', 'Nunito', sans-serif",
              boxShadow: '0 4px 0 #2b5d8c',
              cursor: 'pointer'
            }}
          >
            Resume Village
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
