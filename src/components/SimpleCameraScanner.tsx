import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface SimpleCameraScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const SimpleCameraScanner: React.FC<SimpleCameraScannerProps> = ({ onScan, onClose, isVisible }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('SimpleCameraScanner useEffect triggered:', { isVisible });
    if (!isVisible) return;

    const initializeScanner = async () => {
      try {
        console.log('Initializing camera scanner...');
        setIsLoading(true);
        setError('');

        if (!containerRef.current) {
          console.error('Scanner container not found');
          throw new Error('Scanner container not found');
        }

        console.log('Container found, starting scanner...');

        // Create an observer to watch for changes in the container
        const observer = new MutationObserver((mutations, obs) => {
          if (containerRef.current?.clientWidth) {
            obs.disconnect(); // Stop observing once we have dimensions
            startScanner();
          }
        });

        // Start observing the container
        observer.observe(containerRef.current, {
          childList: true,
          subtree: true
        });

        // Cleanup observer after 5 seconds to prevent memory leaks
        setTimeout(() => observer.disconnect(), 5000);
      } catch (error) {
        console.error("Camera initialization error:", error);
        setError('Failed to initialize camera');
        setIsLoading(false);
      }
    };

    const startScanner = async () => {
      try {
        if (!containerRef.current?.clientWidth) return;

        scannerRef.current = new Html5Qrcode("qr-reader");
        const devices = await Html5Qrcode.getCameras();
        
        if (!devices?.length) {
          throw new Error("No cameras found");
        }

        await scannerRef.current.start(
          devices[0].id,
          {
            fps: 10,
            qrbox: {
              width: Math.min(250, containerRef.current.clientWidth - 50),
              height: Math.min(250, containerRef.current.clientWidth - 50)
            }
          },
          (decodedText) => {
            onScan(decodedText);
            if (scannerRef.current) {
              scannerRef.current.stop();
            }
          },
          () => {} // Ignore errors during scanning
        );
      } catch (error) {
        console.error("Camera access error:", error);
        setError(
          typeof error === 'object' && error !== null && 'message' in error
            ? String((error as { message: unknown }).message)
            : 'Failed to access camera'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isVisible, onScan]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera QR Scanner
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Starting camera...
              </p>
            </div>
          )}

          {!error && !isLoading && (
            <div className="space-y-4">
              <div className="relative">
                <div 
                  id="qr-reader" 
                  ref={containerRef}
                  className="w-full aspect-square"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleCameraScanner;