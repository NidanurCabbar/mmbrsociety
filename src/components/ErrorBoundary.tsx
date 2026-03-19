import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 ErrorBoundary caught error:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString()
    });

    // Log specific timeout errors
    if (error.message?.includes('timeout') || error.message?.includes('getPage')) {
      console.error('🕐 Timeout error caught by ErrorBoundary:', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }

    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <Card className="bg-gray-900 border-red-500/20 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <CardTitle className="text-white">Bir Hata Oluştu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-gray-300 text-sm text-center">
                {this.state.error?.message?.includes('timeout') ? (
                  <>
                    <p className="mb-2">Sunucu yanıt vermedi.</p>
                    <p className="text-gray-400">Bağlantı zaman aşımına uğradı.</p>
                  </>
                ) : this.state.error?.message?.includes('getPage') ? (
                  <>
                    <p className="mb-2">Veri yükleme hatası.</p>
                    <p className="text-gray-400">Sayfa verileri alınamadı.</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">Beklenmeyen bir hata oluştu.</p>
                    <p className="text-gray-400 break-words">
                      {this.state.error?.message || 'Bilinmeyen hata'}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      Lütfen tarayıcı konsolunu (F12) kontrol edin.
                    </p>
                  </>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Tekrar Dene
                </Button>
                <Button 
                  onClick={this.handleReload}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sayfayı Yenile
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer">
                    Geliştirici Detayları
                  </summary>
                  <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-800 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;