import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CameraQRScanner from "@/components/CameraQRScanner";
import { 
  QrCode, 
  Users, 
  LogIn, 
  LogOut, 
  Clock, 
  Search, 
  Camera,
  CheckCircle,
  AlertTriangle,
  Download,
  Shield,
  MessageSquare,
  Home,
  PlusCircle,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import axiosInstance from "@/lib/axios";
import { toast } from "react-toastify";

interface GateActivity {
  id: string;
  scannedAt: string;
  student: {
    name: string;
    rollNumber: string;
    hostelBlock: string;
    roomNumber: string;
  };
  type: 'OUT' | 'IN';
  purpose: string;
  location: string;
  qrType: string;
  isSuspicious?: boolean;
  suspiciousComment?: string;
  securityComment?: string;
  remarks?: string;
}

interface GateStats {
  studentsOut: number;
  studentsIn: number;
  currentlyOut: number;
  pendingReturn: number;
}

interface QRValidationResult {
  student: {
    name: string;
    rollNumber: string;
    hostelBlock: string;
    floor: string;
    roomNumber: string;
    phoneNumber: string;
    parentPhoneNumber: string;
  };
  outing: {
    date: string;
    outingTime: string;
    returnTime: string;
    purpose: string;
  };
  type: string;
  isValid: boolean;
  validUntil: string;
  canScan: boolean;
  // Add these for emergency badge logic
  isEmergency?: boolean;
  category?: string;
}

const GateDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  
  // Toggle state for request types
  const [requestType, setRequestType] = useState<'outing' | 'home'>('outing');
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [scanMode, setScanMode] = useState(false);
  const [cameraMode, setCameraMode] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [originalQrData, setOriginalQrData] = useState('');
  const [qrValidation, setQrValidation] = useState<QRValidationResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // New state for search and check-in functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [currentlyOutStudents, setCurrentlyOutStudents] = useState<any[]>([]);
  
  // Suspicious activity state
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [suspiciousComment, setSuspiciousComment] = useState('');
  
  // Report generation state
  const [reportStartDate, setReportStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Dashboard data with completely safe initialization
  const [dashboardData, setDashboardData] = useState<{
    activity: GateActivity[];
    stats: GateStats;
    lastUpdated: string;
  }>({
    activity: [],
    stats: {
      studentsOut: 0,
      studentsIn: 0,
      currentlyOut: 0,
      pendingReturn: 0
    },
    lastUpdated: ''
  });

  // Safe data access functions
  const getActivitySafely = () => {
    return Array.isArray(dashboardData?.activity) ? dashboardData.activity : [];
  };

  const getStatsSafely = () => {
    return dashboardData?.stats || {
      studentsOut: 0,
      studentsIn: 0,
      currentlyOut: 0,
      pendingReturn: 0
    };
  };

  // Fetch dashboard data with comprehensive error handling
  const fetchDashboardData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      const response = await axiosInstance.get('/gate/dashboard');
      console.log('📊 Dashboard response:', response.data);
      
      if (response.data?.success && response.data?.data) {
        // Ensure safe data structure
        const responseData = response.data.data;
        const safeData = {
          activity: Array.isArray(responseData.activity) ? responseData.activity : [],
          stats: responseData.stats || {
            studentsOut: 0,
            studentsIn: 0,
            currentlyOut: 0,
            pendingReturn: 0
          },
          lastUpdated: responseData.lastUpdated || new Date().toISOString()
        };
        
        setDashboardData(safeData);
        console.log('✅ Dashboard data safely updated:', safeData);
      } else {
        console.warn('⚠️ Invalid dashboard response format');
        // Set safe defaults
        setDashboardData({
          activity: [],
          stats: { studentsOut: 0, studentsIn: 0, currentlyOut: 0, pendingReturn: 0 },
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('❌ Dashboard fetch error:', error);
      // Always set safe defaults on error
      setDashboardData({
        activity: [],
        stats: { studentsOut: 0, studentsIn: 0, currentlyOut: 0, pendingReturn: 0 },
        lastUpdated: new Date().toISOString()
      });
      
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Debug function to check authentication status
  const debugAuth = () => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    console.log('🔍 Authentication Debug:');
    console.log('Token exists:', !!token);
    console.log('Token preview:', token ? token.substring(0, 20) + '...' : 'None');
    console.log('User data:', userStr ? JSON.parse(userStr) : 'None');
    
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
        console.log('Token expires:', new Date(payload.exp * 1000));
        console.log('Token valid:', payload.exp * 1000 > Date.now());
      } catch (e) {
        console.log('Token decode error:', e);
      }
    }
  };

  // QR validation with safe error handling
  const validateQR = async (qrData: string) => {
    try {
      console.log('📤 Sending to validate:', qrData);
      console.log('🔍 Token check:', localStorage.getItem('token') ? 'Token exists' : 'No token found');
      
      // Run authentication debug
      debugAuth();
      
      // Try main endpoint first, fallback to debug endpoint if 404
      let response;
      try {
        response = await axiosInstance.post('/gate/qr/validate', {
          qrData: qrData
        });
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('🚨 Main endpoint returned 404, trying debug endpoint...');
          // Fallback to debug endpoint (no auth required)
          response = await axiosInstance.post('/gate/qr/validate-debug', {
            qrData: qrData
          });
        } else {
          throw error;
        }
      }

      console.log('📥 Validation response:', response.data);

      if (response.data.success) {
        setQrValidation(response.data.data);
        console.log('✅ QR validation successful');
        return response.data.data;
      } else {
        const errorMessage = response.data.message || 'QR validation failed';
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
        return null;
      }
    } catch (error: any) {
      console.error('❌ QR validation error:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      
      const errorMessage = error.response?.data?.message || 'QR validation failed';
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
      return null;
    }
  };

  // QR scanning with comprehensive error handling
  const scanQR = async (qrData: any, location = 'Main Gate') => {
    try {
      console.log('📤 Scanning QR:', qrData);
      
      // Try main endpoint first, fallback to debug endpoint if 404
      let response;
      try {
        response = await axiosInstance.post('/gate/scan', {
          qrData: qrData,
          location: location
        });
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('🚨 Main scan endpoint returned 404, trying debug endpoint...');
          // Fallback to debug endpoint (no auth required)
          response = await axiosInstance.post('/gate/scan-debug', {
            qrData: qrData,
            location: location
          });
        } else {
          throw error;
        }
      }

      console.log('📥 Scan response:', response.data);

      if (response.data.success) {
        // Show different success messages based on request type
        const requestType = response.data.data?.requestType || 'unknown';
        const scanType = response.data.data?.type || 'scan';
        
        const isEmergency = response.data.data?.isEmergency || response.data.data?.category === 'emergency';
        const emergencyPrefix = isEmergency ? '🚨 EMERGENCY ' : '';
        
        if (requestType === 'home-permission') {
          toast.success(`${emergencyPrefix}Home permission ${scanType.toLowerCase()} scan successful!`);
        } else if (requestType === 'outing') {
          toast.success(`${emergencyPrefix}Outing ${scanType.toLowerCase()} scan successful!`);
        } else {
          toast.success(`${emergencyPrefix}QR code scanned successfully!`);
        }
        
        await fetchDashboardData(); // Refresh dashboard
        setQrValidation(null);
        setQrInput('');
        setOriginalQrData('');
        setScanMode(false);
        
        console.log('✅ QR scan successful:', {
          type: requestType,
          scanType: scanType,
          student: response.data.data?.student?.name
        });
        
        return true;
      } else {
        const errorMessage = response.data.message || 'QR scanning failed';
        // Show prominent alert for QR security issues during scanning
        if (errorMessage.toLowerCase().includes('already been used') || 
            errorMessage.toLowerCase().includes('already been scanned') ||
            errorMessage.toLowerCase().includes('expired') ||
            errorMessage.toLowerCase().includes('no longer valid')) {
          // Show both toast and alert for critical QR security issues
          toast.error(`🚫 SCAN REJECTED: ${errorMessage}`, {
            autoClose: 8000,
            className: 'bg-red-100 border-red-500'
          });
          alert(`⚠️ SECURITY ALERT ⚠️\n\nSCAN REJECTED!\n\n${errorMessage.toUpperCase()}\n\nThis QR code cannot be used. The student needs a new valid QR code.`);
        } else {
          toast.error(errorMessage);
        }
        return false;
      }
    } catch (error: any) {
      console.error('❌ scanQR error:', error);
      console.error('❌ Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      
      const errorMessage = error.response?.data?.message || 'QR scanning failed';
      // Show prominent alert for QR security issues during scanning
      if (errorMessage.toLowerCase().includes('already been used') || 
          errorMessage.toLowerCase().includes('already been scanned') ||
          errorMessage.toLowerCase().includes('expired') ||
          errorMessage.toLowerCase().includes('no longer valid')) {
        // Show both toast and alert for critical QR security issues
        toast.error(`🚫 SCAN REJECTED: ${errorMessage}`, {
          autoClose: 8000,
          className: 'bg-red-100 border-red-500'
        });
        alert(`⚠️ SECURITY ALERT ⚠️\n\nSCAN REJECTED!\n\n${errorMessage.toUpperCase()}\n\nThis QR code cannot be used. The student needs a new valid QR code.`);
      } else {
        toast.error(errorMessage);
      }
      return false;
    }
  };

  // Handle QR input processing
  const handleQRInput = async () => {
    if (!qrInput.trim()) {
      toast.error('Please enter QR code data');
      return;
    }

    console.log('📱 QR Code detected:', qrInput);
    setOriginalQrData(qrInput);

    const validationResult = await validateQR(qrInput.trim());
    if (validationResult) {
      setScanMode(true);
    }
  };

  // Handle camera scanning
  const handleCameraScanned = async (data: string) => {
    console.log('📷 Camera scanned QR:', data);
    setQrInput(data);
    setOriginalQrData(data);
    setCameraMode(false);

    const validationResult = await validateQR(data);
    if (validationResult) {
      setScanMode(true);
    }
  };

  const handleCameraClose = () => {
    console.log('📷 Camera closed');
    setCameraMode(false);
  };

  // Handle QR confirmation
  const handleQRConfirmation = async () => {
    if (!originalQrData) return;
    
    setIsScanning(true);
    const success = await scanQR(originalQrData);
    setIsScanning(false);
    
    if (success) {
      setScanMode(false);
      setQrValidation(null);
    }
  };

  // Format time safely
  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid Time';
    }
  };

  // Handle PDF download for gate activities
  const handleDownloadGateReport = async (gender: 'male' | 'female' | 'all') => {
    try {
      if (!reportStartDate || !reportEndDate) {
        toast.error('Please select both start and end dates');
        return;
      }

      const params = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate,
        gender: gender
      });

      const response = await axiosInstance.get(`/reports/gate-activity?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const genderText = gender === 'female' ? 'womens' : gender === 'male' ? 'mens' : 'all';
      const filename = `gate-activity-${genderText}-${reportStartDate}-to-${reportEndDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${gender === 'female' ? 'Women\'s' : gender === 'male' ? 'Men\'s' : 'All students'} gate activity report downloaded successfully`);
    } catch (error: any) {
      console.error('Gate report download error:', error);
      toast.error('Failed to download gate activity report');
    }
  };

  // Set quick date presets
  const setQuickDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setReportStartDate(start.toISOString().split('T')[0]);
    setReportEndDate(end.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch {
      return 'Invalid Date';
    }
  };

  // Get status badge color
  const getStatusColor = (type: string) => {
    switch (type) {
      case 'OUT':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'IN':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Search for students
  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('🔍 Searching for students:', query);
      const response = await axiosInstance.get(`/gate/search-students?q=${encodeURIComponent(query)}`);
      
      if (response.data?.success) {
        setSearchResults(response.data.data || []);
      } else {
        setSearchResults([]);
      }
    } catch (error: any) {
      console.error('❌ Student search error:', error);
      setSearchResults([]);
    }
  };

  // Fetch currently out students
  const fetchCurrentlyOutStudents = async () => {
    try {
      const response = await axiosInstance.get('/gate/currently-out');
      if (response.data?.success) {
        console.log('📋 Currently out students data:', response.data.data);
        setCurrentlyOutStudents(response.data.data || []);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch currently out students:', error);
    }
  };

  // Manual check-in for a student
  const handleManualCheckIn = async (student: any) => {
    // Check if suspicious flag is set but no comment provided
    if (isSuspicious && !suspiciousComment.trim()) {
      toast.error('Please provide a comment for suspicious activity');
      return;
    }

    try {
      console.log('📥 Manual check-in for:', student);
      console.log('📤 Sending check-in data:', {
        studentId: student._id,
        location: 'Main Gate',
        isSuspicious,
        suspiciousComment: isSuspicious ? suspiciousComment : undefined
      });
      
      const response = await axiosInstance.post('/gate/manual-checkin', {
        studentId: student._id,
        location: 'Main Gate',
        isSuspicious,
        suspiciousComment: isSuspicious ? suspiciousComment : undefined
      });

      if (response.data?.success) {
        if (isSuspicious) {
          toast.success(`${student.name} checked in successfully with security alert!`);
        } else {
          toast.success(`${student.name} checked in successfully!`);
        }
        await fetchDashboardData();
        await fetchCurrentlyOutStudents();
        setSelectedStudent(null);
        setShowCheckIn(false);
        setIsSuspicious(false);
        setSuspiciousComment('');
      } else {
        toast.error(response.data?.message || 'Check-in failed');
      }
    } catch (error: any) {
      console.error('❌ Manual check-in error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(error.response?.data?.message || 'Check-in failed');
    }
  };

  // Download enhanced gate activity PDF with date range and block separation
  const downloadGateActivityPDF = async () => {
    try {
      if (!reportStartDate || !reportEndDate) {
        toast.error('Please select both start and end dates for the report');
        return;
      }

      const params = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate
      });

      const response = await axiosInstance.get(`/gate/activity/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enhanced-gate-activity-${reportStartDate}-to-${reportEndDate}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Enhanced gate activity PDF with block separation downloaded successfully!');
    } catch (error: any) {
      console.error('❌ Enhanced PDF download error:', error);
      toast.error('Failed to download enhanced PDF');
    }
  };

  // Handle search input changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchStudents(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData();
    fetchCurrentlyOutStudents();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchCurrentlyOutStudents();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Loading state with safe check
  if (loading && (!getActivitySafely() || getActivitySafely().length === 0)) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading gate dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gate Dashboard</h1>
            <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Monitor {requestType === 'outing' ? 'outing' : 'home permission'} entries and exits
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Request Type Toggle */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-gray-800/50 border-gray-600/50' 
                : 'bg-white/50 border-gray-200/50'
            } shadow-lg`}>
              <div className="flex items-center gap-2">
                <PlusCircle className={`w-4 h-4 ${requestType === 'outing' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${requestType === 'outing' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Outing
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRequestType(requestType === 'outing' ? 'home' : 'outing')}
                className="p-1 h-auto"
              >
                {requestType === 'outing' ? 
                  <ToggleLeft className="w-6 h-6 text-gray-400" /> : 
                  <ToggleRight className="w-6 h-6 text-blue-600" />
                }
              </Button>
              
              <div className="flex items-center gap-2">
                <Home className={`w-4 h-4 ${requestType === 'home' ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${requestType === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>
                  Home
                </span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={fetchDashboardData} variant="outline">
                Refresh
              </Button>
              <Button onClick={downloadGateActivityPDF} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Activity
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Students Out</p>
                  <p className="text-2xl font-semibold">{getStatsSafely().studentsOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <LogIn className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Students In</p>
                  <p className="text-2xl font-semibold">{getStatsSafely().studentsIn}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Currently Out</p>
                  <p className="text-2xl font-semibold">{getStatsSafely().currentlyOut}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending Return</p>
                  <p className="text-2xl font-semibold">{getStatsSafely().pendingReturn}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Student Search & Check-In Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Student Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
                
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border rounded-lg">
                    {searchResults.map((student, index) => (
                      <div 
                        key={student._id || index} 
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowCheckIn(true);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-500">
                              Roll: {student.rollNumber} | {student.hostelBlock} - {student.roomNumber}
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            Select
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Currently Out Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Currently Out Students ({currentlyOutStudents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentlyOutStudents.length === 0 ? (
                  <p className="text-center py-8 text-gray-500">
                    No students currently out
                  </p>
                ) : (
                  currentlyOutStudents.map((student, index) => (
                    <div 
                      key={student._id || index}
                      className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-sm text-gray-500">
                            Roll: {student.rollNumber} | Out since: {formatTime(student.outTime)}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => {
                            setSelectedStudent(student);
                            setShowCheckIn(true);
                            setIsSuspicious(false);
                            setSuspiciousComment('');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <LogIn className="w-3 h-3 mr-1" />
                          Check In
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Check-In Modal */}
        {showCheckIn && selectedStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-lg mx-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Manual Check-In - Security Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-medium text-lg">{selectedStudent.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Roll: {selectedStudent.rollNumber} | {selectedStudent.hostelBlock} - {selectedStudent.roomNumber}
                    </p>
                  </div>
                  
                  {/* Security Assessment Question */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Shield className="w-6 h-6 text-blue-600" />
                      <span className="font-medium text-lg">How does the student appear?</span>
                    </div>
                    
                    {/* Two Main Options */}
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        onClick={() => {
                          setIsSuspicious(false);
                          setSuspiciousComment('');
                          handleManualCheckIn(selectedStudent);
                        }}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white text-lg"
                        size="lg"
                      >
                        <CheckCircle className="w-6 h-6 mr-3" />
                        <div className="text-left">
                          <div className="font-semibold">Normal Check-In</div>
                          <div className="text-sm opacity-90">Student appears normal, no concerns</div>
                        </div>
                      </Button>
                      
                      <Button
                        onClick={() => setIsSuspicious(true)}
                        variant="outline"
                        className="w-full py-4 border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20 text-lg"
                        size="lg"
                      >
                        <AlertTriangle className="w-6 h-6 mr-3 text-red-600" />
                        <div className="text-left">
                          <div className="font-semibold text-red-700 dark:text-red-400">Suspicious Activity</div>
                          <div className="text-sm text-red-600 dark:text-red-500">Student shows concerning behavior</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                  
                  {/* Comment field for suspicious activity */}
                  {isSuspicious && (
                    <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">Describe the suspicious behavior:</span>
                      </div>
                      <textarea
                        value={suspiciousComment}
                        onChange={(e) => setSuspiciousComment(e.target.value)}
                        placeholder="Required: Describe what you observed (e.g., appears intoxicated, erratic behavior, suspicious items, etc.)"
                        className="w-full p-3 border border-red-300 dark:border-red-600 rounded-md resize-none h-24 text-sm bg-white dark:bg-gray-700"
                        required
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <Button 
                          onClick={() => handleManualCheckIn(selectedStudent)}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={!suspiciousComment.trim()}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Check-In with Security Alert
                        </Button>
                        <Button 
                          onClick={() => {
                            setIsSuspicious(false);
                            setSuspiciousComment('');
                          }}
                          variant="outline"
                          className="px-4"
                        >
                          Back
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* Cancel Button (only show when not in suspicious mode) */}
                  {!isSuspicious && (
                    <div className="flex justify-center pt-2">
                      <Button 
                        onClick={() => {
                          setShowCheckIn(false);
                          setSelectedStudent(null);
                          setIsSuspicious(false);
                          setSuspiciousComment('');
                        }}
                        variant="outline"
                        className="px-8"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* QR Scanner Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* QR Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Paste QR code data here..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleQRInput} disabled={!qrInput.trim()}>
                  <Search className="w-4 h-4 mr-2" />
                  Validate
                </Button>
                <Button onClick={() => setCameraMode(true)} variant="outline">
                  <Camera className="w-4 h-4 mr-2" />
                  Scan QR Code
                </Button>
              </div>

              {/* QR Validation Result */}
              {qrValidation && (
                <Alert className={`${
                  qrValidation.isEmergency || qrValidation.category === 'emergency'
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                    : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                }`}>
                  {qrValidation.isEmergency || qrValidation.category === 'emergency' ? (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">QR Code Valid!</span>
                        {(qrValidation.isEmergency || qrValidation.category === 'emergency') && (
                          <Badge className="bg-red-500 text-white text-xs font-bold px-2 py-1 animate-pulse">
                            🚨 EMERGENCY
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Student:</strong> {qrValidation.student?.name || 'N/A'}</p>
                          <p><strong>Roll Number:</strong> {qrValidation.student?.rollNumber || 'N/A'}</p>
                          <p><strong>Room:</strong> {qrValidation.student?.hostelBlock || 'N/A'} - {qrValidation.student?.roomNumber || 'N/A'}</p>
                          {(qrValidation.isEmergency || qrValidation.category === 'emergency') && (
                            <p className="text-red-600 font-medium">
                              <strong>⚠️ Emergency Request:</strong> Fast-track approved
                            </p>
                          )}
                        </div>
                        <div>
                          <p><strong>Purpose:</strong> {qrValidation.outing?.purpose || 'N/A'}</p>
                          <p><strong>Out Time:</strong> {qrValidation.outing?.outingTime || 'N/A'}</p>
                          <p><strong>Return Time:</strong> {qrValidation.outing?.returnTime || 'N/A'}</p>
                          <p><strong>Valid Until:</strong> {formatDate(qrValidation.validUntil)} {formatTime(qrValidation.validUntil)}</p>
                        </div>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Scan Mode Confirmation */}
              {scanMode && qrValidation && (
                <div className={`flex gap-2 p-4 rounded-lg ${
                  qrValidation.isEmergency || qrValidation.category === 'emergency'
                    ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                    : 'bg-blue-50 dark:bg-blue-950'
                }`}>
                  <Button
                    onClick={handleQRConfirmation}
                    disabled={isScanning}
                    className={`${
                      qrValidation.isEmergency || qrValidation.category === 'emergency'
                        ? qrValidation.type === 'OUT' 
                          ? 'bg-red-700 hover:bg-red-800 animate-pulse' 
                          : 'bg-red-600 hover:bg-red-700 animate-pulse'
                        : qrValidation.type === 'OUT' 
                          ? 'bg-red-600 hover:bg-red-700' 
                          : 'bg-green-600 hover:bg-green-700'
                    } text-white`}
                  >
                    {isScanning ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <>
                        {(qrValidation.isEmergency || qrValidation.category === 'emergency') && (
                          <AlertTriangle className="w-4 h-4 mr-1" />
                        )}
                        {qrValidation.type === 'OUT' ? (
                          <LogOut className="w-4 h-4 mr-2" />
                        ) : (
                          <LogIn className="w-4 h-4 mr-2" />
                        )}
                      </>
                    )}
                    {isScanning 
                      ? 'Processing...' 
                      : (qrValidation.isEmergency || qrValidation.category === 'emergency')
                        ? qrValidation.type === 'OUT' 
                          ? '🚨 EMERGENCY EXIT - CONFIRM' 
                          : '🚨 EMERGENCY ENTRY - CONFIRM'
                        : qrValidation.type === 'OUT' 
                          ? '✅ Confirm Student EXIT' 
                          : '✅ Confirm Student ENTRY'
                    }
                  </Button>
                  <Button 
                    onClick={() => setScanMode(false)} 
                    variant="outline"
                    disabled={isScanning}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paired In/Out Table with Boys/Womens separation and mobile responsive layout */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Gate Movements (Paired In/Out)</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Helper: normalize activity type
              const normalizeType = (t: any) => {
                const s = String(t || '').toUpperCase();
                if (['OUT', 'OUTGOING', 'EXIT'].includes(s)) return 'OUT';
                if (['IN', 'INCOMING', 'ENTRY'].includes(s)) return 'IN';
                return s || 'UNKNOWN';
              };
              // Blocks by gender
              const maleBlocks = ['D-Block', 'E-Block', 'D Block', 'E Block', 'BOYS', 'Boys', 'Boys-Block'];
              const femaleBlocks = ['Womens-Block', 'Women-Block', 'Women', 'Womens', 'Girls-Block', 'Girls', 'G-Block'];
              // Filter by request type toggle from UI
              const filtered = getActivitySafely().filter((a: any) => {
                const rtype = (a?.requestType || 'outing').toLowerCase();
                return requestType === 'outing' ? rtype !== 'home-permission' : rtype === 'home-permission';
              });
              // Build pairs (OUT followed by next IN) per student for given blocks
              const buildPairsForBlocks = (blocks: string[]) => {
                const events = filtered.filter((a: any) => blocks.some(b => (a?.student?.hostelBlock || '').toLowerCase() === b.toLowerCase()));
                // counts by raw events
                let totalOut = 0, totalIn = 0;
                const byStudent = new Map<string, any[]>();
                events.forEach((e: any) => {
                  const sid = e?.student?._id?.toString() || e?.student?.id || e?.studentId || 'unknown';
                  const norm = normalizeType(e?.type);
                  if (norm === 'OUT') totalOut++; else if (norm === 'IN') totalIn++;
                  if (!byStudent.has(sid)) byStudent.set(sid, []);
                  byStudent.get(sid)!.push(e);
                });
                const pairs: any[] = [];
                byStudent.forEach(list => {
                  list.sort((a: any, b: any) => new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime());
                  let currentOut: any | null = null;
                  for (const ev of list) {
                    const t = normalizeType(ev.type);
                    if (t === 'OUT') {
                      // If two OUTs in a row, push previous as unmatched
                      if (currentOut) {
                        pairs.push({ student: currentOut.student, roll: currentOut.student?.rollNumber, block: currentOut.student?.hostelBlock, room: currentOut.student?.roomNumber, outTime: currentOut.scannedAt, inTime: null, purpose: currentOut.purpose, requestType: currentOut.requestType });
                      }
                      currentOut = ev;
                    } else if (t === 'IN') {
                      if (currentOut) {
                        pairs.push({ student: ev.student, roll: ev.student?.rollNumber, block: ev.student?.hostelBlock, room: ev.student?.roomNumber, outTime: currentOut.scannedAt, inTime: ev.scannedAt, purpose: currentOut.purpose || ev.purpose, requestType: currentOut.requestType || ev.requestType });
                        currentOut = null;
                      } else {
                        // IN without prior OUT — show as single IN row
                        pairs.push({ student: ev.student, roll: ev.student?.rollNumber, block: ev.student?.hostelBlock, room: ev.student?.roomNumber, outTime: null, inTime: ev.scannedAt, purpose: ev.purpose, requestType: ev.requestType });
                      }
                    }
                  }
                  if (currentOut) {
                    pairs.push({ student: currentOut.student, roll: currentOut.student?.rollNumber, block: currentOut.student?.hostelBlock, room: currentOut.student?.roomNumber, outTime: currentOut.scannedAt, inTime: null, purpose: currentOut.purpose, requestType: currentOut.requestType });
                  }
                });
                const currentlyOut = pairs.filter(p => !p.inTime).length;
                return { pairs: pairs.sort((a, b) => new Date(b.outTime || b.inTime).getTime() - new Date(a.outTime || a.inTime).getTime()), counts: { totalOut, totalIn, currentlyOut } };
              };

              const boys = buildPairsForBlocks(maleBlocks);
              const womens = buildPairsForBlocks(femaleBlocks);

              const Section = ({ title, data }: { title: string; data: { pairs: any[]; counts: { totalOut: number; totalIn: number; currentlyOut: number; } } }) => (
                <div className="mb-10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-base">{title}</h4>
                    <div className="flex gap-3 text-xs">
                      <span className="px-2 py-1 rounded bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Out: {data.counts.totalOut}</span>
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">In: {data.counts.totalIn}</span>
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Currently Out: {data.counts.currentlyOut}</span>
                    </div>
                  </div>

                  {data.pairs.length === 0 ? (
                    <div className="py-6 text-center text-gray-500">No movements found</div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                              <th className="text-left py-2 px-2">S.N</th>
                              <th className="text-left py-2 px-2">Student</th>
                              <th className="text-left py-2 px-2">Roll</th>
                              <th className="text-left py-2 px-2">Block / Room</th>
                              <th className="text-left py-2 px-2">Out Time</th>
                              <th className="text-left py-2 px-2">In Time</th>
                              <th className="text-left py-2 px-2">Purpose</th>
                              <th className="text-left py-2 px-2">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.pairs.map((row, idx) => (
                              <tr key={idx} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} hover:bg-gray-50 dark:hover:bg-gray-800`}>
                                <td className="py-2 px-2">{idx + 1}</td>
                                <td className="py-2 px-2 font-medium">{row.student?.name || 'N/A'}</td>
                                <td className="py-2 px-2">{row.roll || 'N/A'}</td>
                                <td className="py-2 px-2">{row.block || 'N/A'} / {row.room || 'N/A'}</td>
                                <td className="py-2 px-2 font-mono text-sm">{row.outTime ? `${formatDate(row.outTime)} ${formatTime(row.outTime)}` : '-'}</td>
                                <td className="py-2 px-2 font-mono text-sm">{row.inTime ? `${formatDate(row.inTime)} ${formatTime(row.inTime)}` : '-'}</td>
                                <td className="py-2 px-2">{row.purpose || 'N/A'}</td>
                                <td className="py-2 px-2 capitalize">{(row.requestType || '').toString().replace('-', ' ') || 'outing'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <div className="md:hidden space-y-3">
                        {data.pairs.map((row, idx) => (
                          <div key={idx} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                            <div className="flex justify-between items-center">
                              <div className="font-semibold">{row.student?.name || 'N/A'}</div>
                              <div className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 capitalize">{(row.requestType || 'outing').toString().replace('-', ' ')}</div>
                            </div>
                            <div className="text-xs text-gray-500">{row.roll || 'N/A'} • {row.block || 'N/A'} / {row.room || 'N/A'}</div>
                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                              <div>
                                <div className="text-gray-500">Out</div>
                                <div className="font-mono">{row.outTime ? `${formatDate(row.outTime)} ${formatTime(row.outTime)}` : '-'}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">In</div>
                                <div className="font-mono">{row.inTime ? `${formatDate(row.inTime)} ${formatTime(row.inTime)}` : '-'}</div>
                              </div>
                            </div>
                            <div className="mt-2 text-sm"><span className="text-gray-500">Purpose:</span> {row.purpose || 'N/A'}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );

              return (
                <div className="space-y-8">
                  <Section title="Boys (D/E Blocks)" data={boys} />
                  <Section title="Womens" data={womens} />
                </div>
              );
            })()}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities" className="space-y-6">
            {/* Recent Gate Activities */}
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Recent Gate Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Time</th>
                        <th className="text-left py-3 px-2">Student</th>
                        <th className="text-left py-3 px-2">Roll Number</th>
                        <th className="text-left py-3 px-2">Block</th>
                        <th className="text-left py-3 px-2">Type</th>
                        <th className="text-left py-3 px-2">Purpose</th>
                        <th className="text-left py-3 px-2">Location</th>
                        <th className="text-left py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getActivitySafely().length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-500">
                            No gate activities found
                          </td>
                        </tr>
                      ) : (
                        getActivitySafely().map((activity, index) => (
                          <tr key={activity.id || index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="py-3 px-2">
                              {formatTime(activity.scannedAt)}
                            </td>
                            <td className="py-3 px-2">
                              {activity.student?.name || 'Unknown'}
                            </td>
                            <td className="py-3 px-2">
                              {activity.student?.rollNumber || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              {activity.student?.hostelBlock || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center">
                                <Badge className={`${
                                  activity.type === 'OUT' 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' 
                                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                }`}>
                                  {((activity as any)?.isEmergency || (activity as any)?.category === 'emergency') && (
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                  )}
                                  {activity.type === 'OUT' ? (
                                    <>
                                      <LogOut className="w-3 h-3 mr-1" />
                                      EXIT
                                    </>
                                  ) : (
                                    <>
                                      <LogIn className="w-3 h-3 mr-1" />
                                      ENTRY
                                    </>
                                  )}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              {activity.purpose || 'N/A'}
                            </td>
                            <td className="py-3 px-2">
                              {activity.location || 'Main Gate'}
                            </td>
                            <td className="py-3 px-2">
                              {activity.isSuspicious ? (
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    SUSPICIOUS
                                  </Badge>
                                  {activity.suspiciousComment && (
                                    <div className="relative group cursor-help">
                                      <MessageSquare className="w-4 h-4 text-red-600" />
                                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap max-w-xs">
                                        {activity.suspiciousComment}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                  NORMAL
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle>Generate Gate Activity Reports</CardTitle>
                <p className="text-sm text-gray-600">
                  Generate separate PDF reports for men's and women's gate activities with suspicious activity tracking.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Date Range Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="report-start-date">Start Date</Label>
                    <Input
                      id="report-start-date"
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="report-end-date">End Date</Label>
                    <Input
                      id="report-end-date"
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(1)}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                    Last 7 Days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                    Last 30 Days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
                    Last 3 Months
                  </Button>
                </div>

                {/* Report Download Buttons */}
                <div className="space-y-4">
                  {/* Enhanced Gate Activity Report */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Enhanced Gate Activity Report (Block Separated)
                    </h4>
                    <p className="text-sm text-purple-700 mb-3">
                      Complete gate activity with block separation, in/out time tracking, emergency indicators, and home vs outing separation.
                    </p>
                    <Button
                      onClick={downloadGateActivityPDF}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={!reportStartDate || !reportEndDate}
                    >
                      <Download className="w-4 h-4" />
                      Download Enhanced Report
                    </Button>
                  </div>

                  {/* Standard Gender-Based Reports */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => handleDownloadGateReport('male')}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                      disabled={!reportStartDate || !reportEndDate}
                    >
                      <Download className="w-4 h-4" />
                      Men's Gate Report
                    </Button>
                    
                    <Button
                      onClick={() => handleDownloadGateReport('female')}
                      className="flex items-center gap-2 bg-pink-600 hover:bg-pink-700"
                      disabled={!reportStartDate || !reportEndDate}
                    >
                      <Download className="w-4 h-4" />
                      Women's Gate Report
                    </Button>
                    
                    <Button
                      onClick={() => handleDownloadGateReport('all')}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
                      disabled={!reportStartDate || !reportEndDate}
                    >
                      <Download className="w-4 h-4" />
                      Combined Report
                    </Button>
                  </div>
                </div>

                {/* Report Features Info */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Enhanced Report Features:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• <strong>Block Separation:</strong> D-Block, E-Block, and Womens-Block data separated</li>
                    <li>• <strong>In/Out Time Tracking:</strong> Precise entry and exit timestamps</li>
                    <li>• <strong>Request Type Separation:</strong> Home permissions vs outings clearly distinguished</li>
                    <li>• <strong>Emergency Indicators:</strong> Emergency permissions clearly marked with 🚨</li>
                    <li>• <strong>Complete Activity Log:</strong> All gate activities with detailed information</li>
                    <li>• <strong>Professional Format:</strong> Table format matching your requirements</li>
                    <li>• <strong>Statistics Summary:</strong> Block-wise counts and emergency tracking</li>
                    <li>• <strong>Audit Trail:</strong> Permanent database storage for compliance</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Camera QR Scanner Modal */}
      <CameraQRScanner
        isVisible={cameraMode}
        onScan={handleCameraScanned}
        onClose={handleCameraClose}
      />
    </DashboardLayout>
  );
};

export default GateDashboard;