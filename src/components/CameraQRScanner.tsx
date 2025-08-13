import { useEffect, useRef, useState, useCallback } from 'react';
import QrScanner from 'qr-scanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, X, AlertCircle } from 'lucide-react';

interface CameraQRScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const CameraQRScanner: React.FC<CameraQRScannerProps> = ({ onScan, onClose, isVisible }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const initializationRef = useRef<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Stop scanner function
  const stopScanner = useCallback(() => {
    if (qrScannerRef.current) {
      console.log('🛑 Stopping QR scanner...');
      try {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      qrScannerRef.current = null;
    }
    initializationRef.current = false;
  }, []);

  // Start scanner function
  const startScanner = useCallback(async () => {
    // Prevent multiple initializations
    if (!videoRef.current || initializationRef.current || qrScannerRef.current) {
      console.log('❌ Cannot start scanner - already initialized or no video element');
      return;
    }

    try {
      console.log('▶️ Starting camera scanner...');
      initializationRef.current = true;
      setIsLoading(true);
      setError('');

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS. Please use HTTPS or run on localhost.');
      }

      // Check for camera availability
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('No camera found on this device');
      }

      // Create QR Scanner instance
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('📱 QR Code detected:', result.data);
          onScan(result.data);
          // Don't stop scanner here - let parent handle it
        },
        {
          onDecodeError: (error) => {
            // Only log decode errors in development
            if (process.env.NODE_ENV === 'development') {
              console.debug('🔍 QR decode attempt (normal when no QR in view)');
            }
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );

      qrScannerRef.current = scanner;

      // Start the scanner
      await scanner.start();
      setHasPermission(true);
      setIsLoading(false);

      console.log('✅ Camera QR scanner started successfully');

    } catch (error: any) {
      console.error('❌ Camera scanner error:', error);
      initializationRef.current = false;
      setIsLoading(false);
      
      if (error.name === 'NotAllowedError') {
        setHasPermission(false);
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (error.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else if (error.name === 'NotSupportedError' || error.message.includes('HTTPS')) {
        setError('Camera access requires HTTPS. Try using the manual QR input field instead.');
      } else if (error.message.includes('stream')) {
        setError('Camera is not accessible. This might be due to HTTPS requirement or camera being used by another application.');
      } else {
        setError(error.message || 'Failed to start camera');
      }
    }
  }, [onScan]);

  // Request permission function
  const requestPermission = async () => {
    try {
      setError('');
      setIsLoading(true);
      
      console.log('🔐 Requesting camera permission...');
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      console.log('✅ Camera permission granted');
      
      // Start scanner after permission
      setTimeout(() => {
        startScanner();
      }, 200);
      
    } catch (error: any) {
      console.error('❌ Permission request failed:', error);
      setError('Camera permission denied. Please allow camera access and try again.');
      setHasPermission(false);
      setIsLoading(false);
    }
  };

  // Single useEffect with minimal dependencies
  useEffect(() => {
    if (!isVisible) {
      console.log('🚫 Scanner not visible, stopping...');
      stopScanner();
      setError('');
      setHasPermission(null);
      return;
    }

    console.log('👁️ Camera scanner became visible');
    
    // Only initialize once when becoming visible
    if (!initializationRef.current && !qrScannerRef.current) {
      const timer = setTimeout(() => {
        if (hasPermission === true) {
          startScanner();
        } else if (hasPermission === null) {
          // Auto-request permission on first open
          requestPermission();
        }
      }, 300);

      return () => clearTimeout(timer);
    }

    // Cleanup function
    return () => {
      if (!isVisible) {
        stopScanner();
      }
    };
  }, [isVisible, hasPermission]); // Minimal dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // Don't render if not visible
  if (!isVisible) {
    console.log('🚫 Camera scanner not visible, returning null');
    return null;
  }

  console.log('🎬 Rendering CameraQRScanner:', { isVisible, error, isLoading, hasPermission, isInitialized: initializationRef.current });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
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

          {hasPermission === false && !isLoading && (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Camera access is required to scan QR codes
              </p>
              <Button onClick={requestPermission} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Allow Camera Access
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {hasPermission === null ? 'Requesting camera permission...' : 'Starting camera...'}
              </p>
            </div>
          )}

          {/* Video element - always render when visible and no error */}
          {!error && (
            <div className="space-y-4">
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg bg-black"
                  playsInline
                  muted
                  style={{
                    objectFit: 'cover',
                    height: '300px',
                  }}
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                    <div className="text-white text-sm">Initializing camera...</div>
                  </div>
                )}
              </div>
              
              {initializationRef.current && !isLoading && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📱 Point the camera at a QR code to scan
                  </p>
                </div>
              )}
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

export default CameraQRScanner;