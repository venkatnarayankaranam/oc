import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Camera, X, AlertCircle } from 'lucide-react';

interface BasicCameraScannerProps {
  onScan: (qrData: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const BasicCameraScanner: React.FC<BasicCameraScannerProps> = ({ onScan, onClose, isVisible }) => {
  const [error, setError] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStarted, setCameraStarted] = useState(false);

  useEffect(() => {
    console.log('BasicCameraScanner effect:', { isVisible });
    
    if (!isVisible) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isVisible]);

  const startCamera = async () => {
    try {
      console.log('Starting basic camera...');
      setError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraStarted(true);
        console.log('✅ Camera started successfully');
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      setError(err.message || 'Failed to access camera');
      setCameraStarted(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      console.log('Manual QR input:', manualInput.trim());
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  if (!isVisible) {
    console.log('BasicCameraScanner not visible, returning null');
    return null;
  }

  console.log('Rendering BasicCameraScanner');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              QR Code Scanner
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

          {/* Camera Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Camera View</h3>
            {!cameraStarted && !error && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Starting camera...
                </p>
              </div>
            )}
            
            {cameraStarted && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-lg"
                  playsInline
                  muted
                  style={{
                    objectFit: 'cover',
                    height: '300px',
                    background: '#000'
                  }}
                />
                <div className="absolute inset-0 border-2 border-green-500 border-dashed rounded-lg flex items-center justify-center">
                  <div className="text-white bg-black bg-opacity-50 px-3 py-1 rounded text-sm">
                    Point camera at QR code
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Input Section */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Manual QR Code Input</h3>
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                type="text"
                placeholder="Paste QR code data here (e.g., OUT_123456_789012)"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="w-full"
              />
              <Button type="submit" disabled={!manualInput.trim()} className="w-full">
                Process QR Code
              </Button>
            </form>
          </div>

          {/* Test Data */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Test Data</h3>
            <div className="space-y-2 text-xs">
              <div>
                <strong>Outgoing QR:</strong>
                <br />
                <code className="bg-gray-100 dark:bg-gray-800 p-1 rounded text-xs">
                  OUT_68862b7f40b1ccf3ebe8a767_1753625724669
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 px-2 text-xs"
                  onClick={() => setManualInput('OUT_68862b7f40b1ccf3ebe8a767_1753625724669')}
                >
                  Use
                </Button>
              </div>
              <div>
                <strong>Incoming QR:</strong>
                <br />
                <code className="bg-gray-100 dark:bg-gray-800 p-1 rounded text-xs">
                  IN_68862b7f40b1ccf3ebe8a767_1753625724847
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-6 px-2 text-xs"
                  onClick={() => setManualInput('IN_68862b7f40b1ccf3ebe8a767_1753625724847')}
                >
                  Use
                </Button>
              </div>
            </div>
          </div>

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

export default BasicCameraScanner;