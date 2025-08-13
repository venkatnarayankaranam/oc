import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  QrCode, 
  Users, 
  LogIn, 
  LogOut, 
  Clock, 
  Camera,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import axiosInstance from "@/lib/axios";
import { toast } from "react-toastify";

// Completely safe, minimal dashboard component
const SafeGateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Minimal, safe state
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    studentsOut: 0,
    studentsIn: 0,
    currentlyOut: 0,
    pendingReturn: 0
  });
  const [qrInput, setQrInput] = useState('');
  const [error, setError] = useState<string>('');

  // Safe data fetching
  const fetchData = async () => {
    try {
      console.log('🔄 Fetching safe dashboard data...');
      const response = await axiosInstance.get('/gate/dashboard');
      console.log('📊 Response:', response.data);

      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        
        // Safely set activities
        if (Array.isArray(data.activity)) {
          setActivities(data.activity);
        } else {
          setActivities([]);
        }

        // Safely set stats
        if (data.stats && typeof data.stats === 'object') {
          setStats({
            studentsOut: data.stats.studentsOut || 0,
            studentsIn: data.stats.studentsIn || 0,
            currentlyOut: data.stats.currentlyOut || 0,
            pendingReturn: data.stats.pendingReturn || 0
          });
        }

        setError('');
        console.log('✅ Data loaded safely');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('❌ Fetch error:', err);
      setError(`Failed to load dashboard: ${err.message}`);
      setActivities([]);
      setStats({ studentsOut: 0, studentsIn: 0, currentlyOut: 0, pendingReturn: 0 });

      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Safe activity processing
  const processQR = async (qrData: string) => {
    if (!qrData?.trim()) {
      toast.error('Please enter QR code data');
      return;
    }

    try {
      const response = await axiosInstance.post('/gate/scan-debug', {
        qrData: qrData.trim(),
        location: 'Main Gate (Safe Mode)'
      });

      if (response.data?.success) {
        toast.success('QR code processed successfully!');
        setQrInput('');
        await fetchData(); // Refresh data
      } else {
        const errorMessage = response.data?.message || 'QR processing failed';
        // Show prominent alert for QR security issues
        if (errorMessage.toLowerCase().includes('already been used') || 
            errorMessage.toLowerCase().includes('already been scanned') ||
            errorMessage.toLowerCase().includes('expired') ||
            errorMessage.toLowerCase().includes('no longer valid')) {
          // Show both toast and alert for critical QR security issues
          toast.error(`🚫 INVALID QR: ${errorMessage}`, {
            autoClose: 8000,
            className: 'bg-red-100 border-red-500'
          });
          alert(`⚠️ SECURITY ALERT ⚠️\n\n${errorMessage.toUpperCase()}\n\nThis QR code cannot be used. Please ask the student for a valid QR code.`);
        } else {
          toast.error(errorMessage);
        }
      }
    } catch (err: any) {
      console.error('QR processing error:', err);
      const errorMessage = err.response?.data?.message || 'QR processing failed';
      // Show prominent alert for QR security issues
      if (errorMessage.toLowerCase().includes('already been used') || 
          errorMessage.toLowerCase().includes('already been scanned') ||
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('no longer valid')) {
        // Show both toast and alert for critical QR security issues
        toast.error(`🚫 INVALID QR: ${errorMessage}`, {
          autoClose: 8000,
          className: 'bg-red-100 border-red-500'
        });
        alert(`⚠️ SECURITY ALERT ⚠️\n\n${errorMessage.toUpperCase()}\n\nThis QR code cannot be used. Please ask the student for a valid QR code.`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <Alert className="max-w-md mx-auto mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchData} className="mr-2">
            Retry
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Reload Page
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Safe time formatting
  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Time';
    }
  };

  // Main render
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gate Dashboard (Safe Mode)</h1>
          <Button onClick={fetchData} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Students Out</p>
                  <p className="text-2xl font-semibold text-red-600">
                    {stats.studentsOut}
                  </p>
                </div>
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Students In</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {stats.studentsIn}
                  </p>
                </div>
                <LogIn className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Currently Out</p>
                  <p className="text-2xl font-semibold text-blue-600">
                    {stats.currentlyOut}
                  </p>
                </div>
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Return</p>
                  <p className="text-2xl font-semibold text-yellow-600">
                    {stats.pendingReturn}
                  </p>
                </div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner (Safe Mode)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Paste QR code data here..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => processQR(qrInput)}
                  disabled={!qrInput.trim()}
                >
                  Process QR
                </Button>
              </div>
              
              {/* Sample QR for testing */}
              <div className="text-xs text-gray-500">
                <p>Test QR: OUT_68885282c8f96817dbc08adc_1753764546638</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setQrInput('OUT_68885282c8f96817dbc08adc_1753764546638')}
                  className="mt-1"
                >
                  Use Sample
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Gate Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No activity recorded today
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Student</th>
                      <th className="text-left py-2">Action</th>
                      <th className="text-left py-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity, index) => (
                      <tr key={activity.id || index} className="border-b">
                        <td className="py-2 font-mono text-sm">
                          {formatTime(activity.scannedAt)}
                        </td>
                        <td className="py-2">
                          {activity.student?.name || 'N/A'}
                        </td>
                        <td className="py-2">
                          <Badge className={activity.type === 'OUT' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                            {activity.type === 'OUT' ? 'EXIT' : 'ENTRY'}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {activity.purpose || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SafeGateDashboard;