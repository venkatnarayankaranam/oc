import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Clock, CheckCircle, XCircle, FilePlus, User, TrendingUp, Activity, Award, Calendar, History, Download, Home, MapPin, ToggleLeft, ToggleRight, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import axiosInstance from '@/lib/axios';
import { OutingRequestCard } from '@/components/OutingRequestCard';
import { ApprovalStages } from '@/components/ApprovalStages';
import type { OutingRequest, HomePermissionRequest } from '@/types';

const StudentDashboard = () => {
  const { theme } = useTheme();
  const { userDetails } = useAuth();
  
  // Form toggle state
  const [requestType, setRequestType] = useState<'outing' | 'home'>('outing');
  
  // Modal states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  
  // Outing form states
  const [date, setDate] = useState("");
  const [outTime, setOutTime] = useState("");
  const [inTime, setInTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("normal");
  const [parentContact, setParentContact] = useState(userDetails?.parentPhoneNumber || "");
  
  // Home permission form states
  const [goingDate, setGoingDate] = useState("");
  const [incomingDate, setIncomingDate] = useState("");
  const [homeTownName, setHomeTownName] = useState("");
  const [homePurpose, setHomePurpose] = useState("");
  const [homeCategory, setHomeCategory] = useState("normal");
  const [homeParentContact, setHomeParentContact] = useState(userDetails?.parentPhoneNumber || "");
  
  // Data states
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [outingRequests, setOutingRequests] = useState<OutingRequest[]>([]);
  const [homePermissionRequests, setHomePermissionRequests] = useState<HomePermissionRequest[]>([]);
  const [outingStats, setOutingStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0
  });
  const [homePermissionStats, setHomePermissionStats] = useState({
    pending: 0,
    approved: 0,
    denied: 0
  });

  // Disciplinary actions
  const [disciplinaryActions, setDisciplinaryActions] = useState<Array<{
    _id: string;
    title: string;
    description?: string;
    severity: 'low' | 'medium' | 'high';
    status: 'open' | 'closed';
    source: 'manual' | 'gate';
    createdAt: string;
  }>>([]);

  // Update parent contact fields when userDetails changes
  useEffect(() => {
    if (userDetails?.parentPhoneNumber) {
      setParentContact(userDetails.parentPhoneNumber);
      setHomeParentContact(userDetails.parentPhoneNumber);
    }
  }, [userDetails]);

  // Will derive current active outing after request lists are computed

  // Fetch student's outing requests from backend
  useEffect(() => {
    const fetchOutingRequests = async () => {
      try {
        const response = await axiosInstance.get('/dashboard/student/requests');
        if (response.data.success) {
          // Map backend response to frontend types
          const mappedRequests = response.data.requests.map((req: any) => ({
            ...req,
            floorInchargeApproval: req.approvalStatus ? 
              (req.approvalStatus.floorIncharge === 'approved' ? 'approved' : 'pending') : 'pending',
            hostelInchargeApproval: req.approvalStatus ? 
              (req.approvalStatus.hostelIncharge === 'approved' ? 'approved' : 'pending') : 'pending',
            wardenApproval: req.approvalStatus ? 
              (req.approvalStatus.warden === 'approved' ? 'approved' : 'pending') : 'pending',
            // Ensure boolean for robust filtering
            isCompleted: typeof req.isCompleted === 'boolean' ? req.isCompleted : undefined
          }));
          setOutingRequests(mappedRequests);
          setOutingStats(response.data.stats);
        }
      } catch (error: any) {
        console.error("Failed to fetch outing requests:", {
          error: error.response?.data || error.message,
          status: error.response?.status,
          endpoint: '/dashboard/student/requests'
        });
        toast.error(
          error.response?.status === 404 
            ? "API endpoint not found. Please check server configuration."
            : error.response?.data?.message || "Failed to fetch your outing requests"
        );
      }
    };

    fetchOutingRequests();
    const interval = setInterval(fetchOutingRequests, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch disciplinary actions for the logged-in student
  useEffect(() => {
    const fetchDisciplinary = async () => {
      try {
        const resp = await axiosInstance.get('/disciplinary/student');
        if (resp.data?.success) {
          setDisciplinaryActions(resp.data.data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch disciplinary actions:', err);
      }
    };
    fetchDisciplinary();
    const interval = setInterval(fetchDisciplinary, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch student's home permission requests from backend
  useEffect(() => {
    const fetchHomePermissionRequests = async () => {
      try {
        const response = await axiosInstance.get('/home-permissions/dashboard/student/requests');
        if (response.data.success) {
          setHomePermissionRequests(response.data.requests);
          setHomePermissionStats(response.data.stats);
        }
      } catch (error: any) {
        console.error("Failed to fetch home permission requests:", {
          error: error.response?.data || error.message,
          status: error.response?.status,
          endpoint: '/home-permissions/dashboard/student/requests'
        });
        toast.error(
          error.response?.status === 404 
            ? "Home permissions API endpoint not found. Please check server configuration."
            : error.response?.data?.message || "Failed to fetch your home permission requests"
        );
      }
    };

    fetchHomePermissionRequests();
    const interval = setInterval(fetchHomePermissionRequests, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmitOutingRequest = async () => {
    if (!date || !outTime || !inTime || !purpose || !parentContact) {
      toast.error("Please fill all fields");
      return;
    }
    
    try {
      const response = await axiosInstance.post('/outings/requests/submit', {
        outingDate: date,
        outTime,
        returnTime: inTime,
        returnDate: date, // Add return date
        purpose,
        category,
        parentContact
      });
      
      if (response.data.success) {
        toast.success("Outing request submitted successfully");
        setOutingRequests(prev => [response.data.request, ...prev]);
        setOutingStats(prev => ({...prev, pending: prev.pending + 1}));
        setIsNewRequestOpen(false);
        resetOutingForm();
      }
    } catch (error: any) {
      console.error("Error submitting outing request:", error);
      toast.error(error.response?.data?.message || "Failed to submit outing request");
    }
  };

  const handleSubmitHomePermissionRequest = async () => {
    if (!goingDate || !incomingDate || !homeTownName || !homePurpose || !homeParentContact) {
      toast.error("Please fill all fields");
      return;
    }
    
    try {
      const response = await axiosInstance.post('/home-permissions/requests/submit', {
        goingDate,
        incomingDate,
        homeTownName,
        purpose: homePurpose,
        category: homeCategory,
        parentContact: homeParentContact
      });
      
      if (response.data.success) {
        toast.success("Home permission request submitted successfully");
        setHomePermissionRequests(prev => [response.data.request, ...prev]);
        setHomePermissionStats(prev => ({...prev, pending: prev.pending + 1}));
        setIsNewRequestOpen(false);
        resetHomePermissionForm();
      }
    } catch (error: any) {
      console.error("Error submitting home permission request:", error);
      toast.error(error.response?.data?.message || "Failed to submit home permission request");
    }
  };

  const resetOutingForm = () => {
    setDate("");
    setOutTime("");
    setInTime("");
    setPurpose("");
    setCategory("normal");
    setParentContact(userDetails?.parentPhoneNumber || "");
  };

  const resetHomePermissionForm = () => {
    setGoingDate("");
    setIncomingDate("");
    setHomeTownName("");
    setHomePurpose("");
    setHomeCategory("normal");
    setHomeParentContact(userDetails?.parentPhoneNumber || "");
  };

  const getOverallStatus = (request: OutingRequest | HomePermissionRequest) => {
    if (request.status === 'denied') return 'Denied';
    if (
      request.floorInchargeApproval === 'approved' &&
      request.hostelInchargeApproval === 'approved' &&
      request.wardenApproval === 'approved'
    ) {
      return 'Approved';
    }
    return 'Pending';
  };

  // Check if outing is completed (after security check-in)
  const isRequestCompleted = (request: OutingRequest | HomePermissionRequest) => {
    const requestData = request as any;
    
    // Must be fully approved first
    const isFullyApproved = request.status === 'approved' && request.currentLevel === 'completed';
    if (!isFullyApproved) return false;
    
    // Check if QR codes have been scanned (expired and scannedAt exists)
    const outgoingScanned = requestData.qrCode?.outgoing?.isExpired && requestData.qrCode?.outgoing?.scannedAt;
    const incomingScanned = requestData.qrCode?.incoming?.isExpired && requestData.qrCode?.incoming?.scannedAt;
    
    // For emergency requests, only outgoing scan is needed
    const isEmergency = requestData.category === 'emergency';
    
    if (isEmergency) {
      return outgoingScanned; // Emergency only needs outgoing scan
    } else {
      return outgoingScanned && incomingScanned; // Normal needs both
    }
  };

  // Filter requests based on active/past status
  const filterRequests = (requests: (OutingRequest | HomePermissionRequest)[], type: 'active' | 'past') => {
    return requests.filter((request: any) => {
      // Prefer server-provided robust flag when available
      const completed = typeof request.isCompleted === 'boolean' 
        ? request.isCompleted 
        : isRequestCompleted(request);

      if (type === 'active') {
        // Show active requests: pending or approved but NOT completed, and not denied
        return (request.status === 'pending' || request.status === 'approved') && !completed;
      } else {
        // Show past requests: completed, denied, or any other status
        return request.status === 'denied' || completed;
      }
    });
  };

  const currentRequests = requestType === 'outing' ? outingRequests : homePermissionRequests;
  const activeRequests = filterRequests(currentRequests, 'active');
  const pastRequests = filterRequests(currentRequests, 'past');
  const currentStats = requestType === 'outing' ? outingStats : homePermissionStats;

  // Derive the most recent active outing for approval tracking
  const currentActiveOuting = (filterRequests(outingRequests, 'active')[0] as any) as (OutingRequest & {
    floorInchargeApproval?: string;
    hostelInchargeApproval?: string;
    wardenApproval?: string;
  }) | undefined;

  // Check if student has an active request that prevents new requests
  const hasActiveRequest = activeRequests.length > 0;
  const canCreateNewRequest = !hasActiveRequest;

  // Download past requests as PDF
  const downloadPastRequestsPDF = async () => {
    try {
      console.log('📄 Starting PDF download for past requests...');
      
      const endpoint = requestType === 'outing' 
        ? '/students/past-outings/pdf' 
        : '/students/past-home-permissions/pdf';
      
      const response = await axiosInstance.get(endpoint, {
        responseType: 'blob'
      });
      
      console.log('📄 PDF response received:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataSize: response.data?.size || 'unknown'
      });
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = requestType === 'outing' 
        ? `past-outings-${new Date().toISOString().split('T')[0]}.pdf`
        : `past-home-permissions-${new Date().toISOString().split('T')[0]}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Past ${requestType === 'outing' ? 'outings' : 'home permissions'} PDF downloaded successfully!`);
    } catch (error: any) {
      console.error('❌ PDF download error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      
      if (error.response?.status === 404) {
        toast.error('PDF endpoint not found. Please check server configuration.');
      } else if (error.response?.status === 500) {
        toast.error('Server error while generating PDF. Please try again.');
      } else {
        toast.error(`Failed to download PDF: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const getRequestTypeIcon = (type: 'outing' | 'home') => {
    return type === 'outing' ? 
      <PlusCircle className="w-5 h-5" /> : 
      <Home className="w-5 h-5" />;
  };

  const getRequestTypeLabel = (type: 'outing' | 'home') => {
    return type === 'outing' ? 'Outing Request' : 'Home Permission';
  };

  return (
    <DashboardLayout showProfileButton={true} showOutingRequestButton={true}>
      <div className="space-y-8">
        {/* Enhanced Header Section with Toggle - mobile friendly layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Student Dashboard
            </h2>
            <p className={`text-sm sm:text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} font-medium`}>
              Manage your {requestType === 'outing' ? 'outing requests' : 'home permissions'} with ease
            </p>
          </div>
          
          {/* Request Type Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className={`flex items-center justify-between sm:justify-start gap-3 p-2 sm:p-3 rounded-xl border ${
              theme === 'dark' 
                ? 'bg-gray-800/50 border-gray-600/50' 
                : 'bg-white/50 border-gray-200/50'
            } shadow-lg w-full sm:w-auto`}>
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
                aria-label="Toggle request type"
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
            
            <Button 
              className={`w-full sm:w-auto justify-center flex items-center space-x-3 shadow-xl hover:shadow-2xl transition-all duration-300 ${
                canCreateNewRequest 
                  ? 'premium-button hover:shadow-blue-500/20' 
                  : 'bg-gray-400 cursor-not-allowed hover:shadow-none'
              }`}
              onClick={() => canCreateNewRequest && setIsNewRequestOpen(true)}
              disabled={!canCreateNewRequest}
              title={!canCreateNewRequest ? `Complete your current ${requestType} before creating a new request` : `Create a new ${getRequestTypeLabel(requestType).toLowerCase()}`}
            >
              {getRequestTypeIcon(requestType)}
              <span className="truncate">{canCreateNewRequest ? `New ${requestType === 'outing' ? 'Request' : 'Permission'}` : 'Request in Progress'}</span>
            </Button>
          </div>
        </div>

        {/* Warning Message for Active Request */}
        {hasActiveRequest && (
          <div className={`p-4 rounded-xl border ${
            theme === 'dark' 
              ? 'bg-yellow-900/20 border-yellow-500/30' 
              : 'bg-yellow-50/80 border-yellow-200/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-yellow-500/20 border border-yellow-500/30' 
                  : 'bg-yellow-100 border border-yellow-200'
              }`}>
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                  {requestType === 'outing' ? 'Outing' : 'Home Permission'} in Progress
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You have an active {requestType === 'outing' ? 'outing' : 'home permission'} request. Complete your current request (including security check-in) before creating a new one.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={`p-6 hover:scale-105 transition-all duration-500 cursor-pointer ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 border-gray-600/50 shadow-xl hover:shadow-yellow-500/20' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/50 shadow-xl hover:shadow-yellow-500/20'
          } border`}>
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                  : 'bg-gradient-to-br from-yellow-100 to-orange-100 border border-yellow-200'
              } shadow-lg`}>
                <Clock className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
                <p className="text-3xl font-bold text-yellow-600">{currentStats.pending}</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-6 hover:scale-105 transition-all duration-500 cursor-pointer ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 border-gray-600/50 shadow-xl hover:shadow-green-500/20' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/50 shadow-xl hover:shadow-green-500/20'
          } border`}>
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30' 
                  : 'bg-gradient-to-br from-green-100 to-emerald-100 border border-green-200'
              } shadow-lg`}>
                <CheckCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Approved</p>
                <p className="text-3xl font-bold text-green-600">{currentStats.approved}</p>
              </div>
            </div>
          </Card>
          
          <Card className={`p-6 hover:scale-105 transition-all duration-500 cursor-pointer ${
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 border-gray-600/50 shadow-xl hover:shadow-red-500/20' 
              : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/50 shadow-xl hover:shadow-red-500/20'
          } border`}>
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-full ${
                theme === 'dark' 
                  ? 'bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30' 
                  : 'bg-gradient-to-br from-red-100 to-rose-100 border border-red-200'
              } shadow-lg`}>
                <XCircle className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
              </div>
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Denied</p>
                <p className="text-3xl font-bold text-red-600">{currentStats.denied}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Requests Section */}
        <Card className={`${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600' 
            : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
        } border shadow-2xl`}>
          {/* Student Card */}
          <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600">
            {/* Mobile Layout */}
            <div className="block md:hidden space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold text-sm md:text-base">
                  {userDetails?.name?.[0] || 'S'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base md:text-lg font-semibold truncate">{userDetails?.name || 'Student'}</div>
                  <div className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                    {userDetails?.rollNumber}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Block:</span>
                  <span className="ml-1 font-medium">{userDetails?.hostelBlock}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Room:</span>
                  <span className="ml-1 font-medium">{userDetails?.roomNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Floor:</span>
                  <span className="ml-1 font-medium">{userDetails?.floor}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Sem:</span>
                  <span className="ml-1 font-medium">{userDetails?.semester}</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userDetails?.branch} • {userDetails?.email}
              </div>
              
              {currentActiveOuting && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm font-semibold mb-2">Approval Tracking</div>
                  <div className="p-2 rounded-lg border bg-white/70 dark:bg-gray-800/70 dark:border-gray-600">
                    <ApprovalStages
                      currentLevel={currentActiveOuting.currentLevel}
                      floorInchargeApproval={currentActiveOuting.floorInchargeApproval as any}
                      hostelInchargeApproval={currentActiveOuting.hostelInchargeApproval as any}
                      wardenApproval={currentActiveOuting.wardenApproval as any}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden md:flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-600 text-white font-bold">
                  {userDetails?.name?.[0] || 'S'}
                </div>
                <div>
                  <div className="text-lg font-semibold">{userDetails?.name || 'Student'}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {userDetails?.rollNumber} • {userDetails?.hostelBlock} • {userDetails?.floor} • Room {userDetails?.roomNumber}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {userDetails?.branch} • Sem {userDetails?.semester} • {userDetails?.email}
                  </div>
                </div>
              </div>
              {currentActiveOuting && (
                <div className="min-w-[260px]">
                  <div className="text-sm font-semibold mb-2">Approval Tracking</div>
                  <div className="p-3 rounded-lg border bg-white/70 dark:bg-gray-800/70 dark:border-gray-600">
                    <ApprovalStages
                      currentLevel={currentActiveOuting.currentLevel}
                      floorInchargeApproval={currentActiveOuting.floorInchargeApproval as any}
                      hostelInchargeApproval={currentActiveOuting.hostelInchargeApproval as any}
                      wardenApproval={currentActiveOuting.wardenApproval as any}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <CardHeader className="space-y-3 md:space-y-4 pb-3 md:pb-6">
            {/* Mobile Layout */}
            <div className="block md:hidden space-y-3">
              <CardTitle className={`text-lg font-bold ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                My {requestType === 'outing' ? 'Outing Requests' : 'Home Permissions'}
              </CardTitle>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className={`flex rounded-lg p-1 flex-1 sm:flex-none ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border border-gray-600' 
                    : 'bg-gray-100 border border-gray-300'
                }`}>
                  <Button
                    variant={activeTab === 'active' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                      activeTab === 'active' 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Active</span>
                  </Button>
                  <Button
                    variant={activeTab === 'past' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('past')}
                    className={`flex items-center gap-2 flex-1 sm:flex-none justify-center ${
                      activeTab === 'past' 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <History className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Past</span>
                  </Button>
                </div>
                
                {activeTab === 'past' && pastRequests.length > 0 && (
                  <Button
                    onClick={downloadPastRequestsPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 w-full sm:w-auto justify-center"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Download PDF</span>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Desktop Layout */}
            <div className="hidden md:flex justify-between items-center">
              <CardTitle className={`text-2xl font-bold ${
                theme === 'dark' 
                  ? 'bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
              }`}>
                My {requestType === 'outing' ? 'Outing Requests' : 'Home Permissions'}
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className={`flex rounded-lg p-1 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border border-gray-600' 
                    : 'bg-gray-100 border border-gray-300'
                }`}>
                  <Button
                    variant={activeTab === 'active' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 ${
                      activeTab === 'active' 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Activity className="w-4 h-4" />
                    Active
                  </Button>
                  <Button
                    variant={activeTab === 'past' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('past')}
                    className={`flex items-center gap-2 ${
                      activeTab === 'past' 
                        ? 'bg-blue-600 text-white' 
                        : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    Past
                  </Button>
                </div>
                {activeTab === 'past' && pastRequests.length > 0 && (
                  <Button
                    onClick={downloadPastRequestsPDF}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {activeTab === 'active' ? (
              <div className="space-y-3 md:space-y-4">
                {activeRequests.length > 0 ? (
                  activeRequests.map((request, index) => (
                    <OutingRequestCard 
                      key={`${requestType}-${request.id || index}`} 
                      request={request as OutingRequest}
                      requestType={requestType}
                      getOverallStatus={getOverallStatus}
                    />
                  ))
                ) : (
                  <div className={`text-center py-8 md:py-12 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full mb-3 md:mb-4 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'bg-gray-100 border border-gray-200'
                    }`}>
                      {requestType === 'outing' ? 
                        <PlusCircle className="w-6 h-6 md:w-8 md:h-8" /> : 
                        <Home className="w-6 h-6 md:w-8 md:h-8" />
                      }
                    </div>
                    <p className="text-base md:text-lg font-medium mb-2">
                      No Active {requestType === 'outing' ? 'Outings' : 'Home Permissions'}
                    </p>
                    <p className="text-sm">
                      Create your first {requestType === 'outing' ? 'outing request' : 'home permission'} to get started!
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {pastRequests.length > 0 ? (
                  <>
                    {/* Mobile: Scrollable container for past requests */}
                    <div className="block md:hidden">
                      <div className="max-h-96 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {pastRequests.map((request, index) => (
                          <OutingRequestCard 
                            key={`${requestType}-past-${request.id || index}`} 
                            request={request as OutingRequest}
                            requestType={requestType}
                            getOverallStatus={getOverallStatus}
                          />
                        ))}
                      </div>
                      {pastRequests.length > 3 && (
                        <div className="text-center mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Scroll to see more past requests
                        </div>
                      )}
                    </div>
                    
                    {/* Desktop: Regular layout */}
                    <div className="hidden md:block space-y-4">
                      {pastRequests.map((request, index) => (
                        <OutingRequestCard 
                          key={`${requestType}-past-${request.id || index}`} 
                          request={request as OutingRequest}
                          requestType={requestType}
                          getOverallStatus={getOverallStatus}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={`text-center py-8 md:py-12 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <div className={`inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full mb-3 md:mb-4 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border border-gray-600' 
                        : 'bg-gray-100 border border-gray-200'
                    }`}>
                      <History className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <p className="text-base md:text-lg font-medium mb-2">
                      No Past {requestType === 'outing' ? 'Outings' : 'Home Permissions'}
                    </p>
                    <p className="text-sm">
                      Your completed {requestType === 'outing' ? 'outings' : 'home permissions'} will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disciplinary & Security Alerts Section */}
        <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
          <CardHeader className="pb-2 md:pb-6">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
              Disciplinary & Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {disciplinaryActions.length === 0 ? (
              <div className={`text-center py-6 md:py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                <p className="text-sm md:text-base">No actions found.</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {disciplinaryActions.map(action => (
                  <div key={action._id} className={`p-3 md:p-4 rounded-lg border ${
                    action.severity === 'high' 
                      ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' 
                      : action.severity === 'medium' 
                      ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20' 
                      : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50'
                  }`}>
                    {/* Mobile Layout */}
                    <div className="block md:hidden space-y-2">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          action.source === 'gate' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}>{action.source === 'gate' ? 'Security' : 'Discipline'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          action.severity === 'high' ? 'bg-red-600 text-white' : action.severity === 'medium' ? 'bg-amber-600 text-white' : 'bg-gray-600 text-white'
                        }`}>{action.severity}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${action.status === 'open' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>{action.status}</span>
                      </div>
                      <div className="font-semibold text-sm">{action.title}</div>
                      {action.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">{action.description}</div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                        {new Date(action.createdAt).toLocaleDateString()} {new Date(action.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            action.source === 'gate' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>{action.source === 'gate' ? 'Security' : 'Discipline'}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            action.severity === 'high' ? 'bg-red-600 text-white' : action.severity === 'medium' ? 'bg-amber-600 text-white' : 'bg-gray-600 text-white'
                          }`}>{action.severity}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${action.status === 'open' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'}`}>{action.status}</span>
                        </div>
                        <div className="mt-1 font-semibold">{action.title}</div>
                        {action.description && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{action.description}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-4">
                        {new Date(action.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Request Dialog */}
        <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
          <DialogContent className={`sm:max-w-[500px] ${
            theme === 'dark' 
              ? 'bg-gray-900 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <DialogHeader>
              <DialogTitle className={`text-lg sm:text-xl font-bold ${
                theme === 'dark' 
                  ? 'text-white' 
                  : 'text-gray-900'
              }`}>
                Create New {getRequestTypeLabel(requestType)}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {requestType === 'outing' ? (
                // Outing Form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="date">Outing Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="outTime">Out Time</Label>
                      <Input
                        id="outTime"
                        type="time"
                        value={outTime}
                        onChange={(e) => setOutTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inTime">Return Time</Label>
                      <Input
                        id="inTime"
                        type="time"
                        value={inTime}
                        onChange={(e) => setInTime(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      id="purpose"
                      placeholder="Enter the purpose of your outing"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Request Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-blue-600" />
                            <span>Normal Request</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="emergency">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>Emergency Request</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {category === 'emergency' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Emergency Request</span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Emergency requests will be sent directly to the Hostel Incharge for faster approval.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parentContact">Parent Contact Number</Label>
                    <Input
                      id="parentContact"
                      type="tel"
                      placeholder="Parent's phone number (read-only)"
                      value={parentContact}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed text-gray-800 placeholder:text-gray-500"
                    />
                    <p className="text-xs text-gray-500">
                      Parent contact number cannot be edited. Contact admin if changes are needed.
                    </p>
                  </div>
                </>
              ) : (
                // Home Permission Form
                <>
                  <div className="space-y-2">
                    <Label htmlFor="goingDate">Going Date</Label>
                    <Input
                      id="goingDate"
                      type="date"
                      value={goingDate}
                      onChange={(e) => setGoingDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="incomingDate">Incoming Date</Label>
                    <Input
                      id="incomingDate"
                      type="date"
                      value={incomingDate}
                      onChange={(e) => setIncomingDate(e.target.value)}
                      min={goingDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homeTownName">Home Town Name</Label>
                    <Input
                      id="homeTownName"
                      type="text"
                      placeholder="Enter your home town name"
                      value={homeTownName}
                      onChange={(e) => setHomeTownName(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homePurpose">Purpose</Label>
                    <Textarea
                      id="homePurpose"
                      placeholder="Enter the reason for going home"
                      value={homePurpose}
                      onChange={(e) => setHomePurpose(e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homeCategory">Request Category</Label>
                    <Select value={homeCategory} onValueChange={setHomeCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">
                          <div className="flex items-center gap-2">
                            <Home className="w-4 h-4 text-blue-600" />
                            <span>Normal Request</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="emergency">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            <span>Emergency Request</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {homeCategory === 'emergency' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-red-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-medium">Emergency Request</span>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                          Emergency requests will be sent directly to the Hostel Incharge for faster approval.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="homeParentContact">Parent Contact Number</Label>
                    <Input
                      id="homeParentContact"
                      type="tel"
                      placeholder="Parent's phone number (read-only)"
                      value={homeParentContact}
                      readOnly
                      className="bg-gray-50 cursor-not-allowed text-gray-800 placeholder:text-gray-500"
                    />
                    <p className="text-xs text-gray-500">
                      Parent contact number cannot be edited. Contact admin if changes are needed.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsNewRequestOpen(false);
                  if (requestType === 'outing') {
                    resetOutingForm();
                  } else {
                    resetHomePermissionForm();
                  }
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={requestType === 'outing' ? handleSubmitOutingRequest : handleSubmitHomePermissionRequest}
                className="premium-button"
              >
                Submit {requestType === 'outing' ? 'Request' : 'Permission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;