import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, XCircle, Building, PieChart, Activity, Download, UserPlus, Users, Edit, Trash2, Calendar, FileText, Search, Filter, AlertTriangle, Shield, Home, PlusCircle, ToggleLeft, ToggleRight, Eye, RefreshCw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import axiosInstance from "@/lib/axios";  // Update import path
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ApprovedStudentsList } from "@/components/ApprovedStudentsList";
import type { HomePermissionRequest } from "@/types";

interface DashboardData {
  requests: OutingRequest[];
  stats: {
    pending: number;
    approved: number;
    denied: number;
    totalRequests: number;
    floorInchargeApproved: number;
  }
}

interface OutingRequest {
  id: string;
  studentName: string;
  rollNumber: string;
  hostelBlock: string;
  floor: string;
  roomNumber: string;
  outingDate: string;
  outingTime: string;
  returnTime: string;
  purpose: string;
  status: string;
  currentLevel: string;
  category?: string; // Add category field for emergency badge
  floorInchargeApproval: 'pending' | 'approved' | 'denied';
  hostelInchargeApproval: 'pending' | 'approved' | 'denied';
  approvalFlow: Array<{
    level: string;
    status: string;
    timestamp: string;
    remarks?: string;
  }>;
}

interface DashboardResponse {
  success: boolean;
  data: {
    requests: OutingRequest[];
    stats: {
      pending: number;
      approved: number;
      denied: number;
    }
  }
}

interface ApprovalEntry {
  level: number;  // Changed from string to number
  status: string;
  timestamp: string;
  remarks?: string;
  approvedBy: string;
  approverInfo: {
    email: string;
    role: 'HostelIncharge';  // Strict role type
  };
}

interface Student {
  _id: string;
  name: string;
  email: string;
  rollNumber: string;
  hostelBlock: string;
  floor: string;
  roomNumber: string;
  phoneNumber: string;
  parentPhoneNumber: string;
  branch: string;
  semester: number;
  year?: '1st' | '2nd' | '3rd' | '4th';
  status?: 'Active' | 'Graduated';
}

interface StudentsResponse {
  success: boolean;
  data: Record<string, Student[]>;
}

// Generate real-time status data based on dashboard stats
const generateStatusData = (stats: any) => [
  { name: "Pending", value: stats.pending || 0, color: "#FFA500" },
  { name: "Approved", value: stats.approved || 0, color: "#10B981" },
  { name: "Denied", value: stats.denied || 0, color: "#EF4444" }
];

const getStatusBadgeColor = (request: OutingRequest) => {
  if (request.currentLevel === 'hostel-incharge') {
    return (request.floorInchargeApproval === 'approved') ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';
  }
  return request.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
};

const getStatusText = (request: OutingRequest) => {
  if (request.currentLevel === 'hostel-incharge') {
    if (request.floorInchargeApproval === 'approved') {
      return 'Awaiting Your Approval';
    }
    return 'Pending Floor Incharge Approval';
  }
  return request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Unknown';
};

const HostelInchargeDashboard = () => {
  const { theme } = useTheme();
  const { userDetails, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Toggle state for request types
  const [requestType, setRequestType] = useState<'outing' | 'home'>('outing');
  
  // Outing data
  const [outingDashboardData, setOutingDashboardData] = useState<DashboardData>({
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0,
      totalRequests: 0,
      floorInchargeApproved: 0
    }
  });
  
  // Home permission data
  const [homePermissionDashboardData, setHomePermissionDashboardData] = useState<{
    requests: HomePermissionRequest[];
    stats: {
      pending: number;
      approved: number;
      denied: number;
      totalRequests: number;
      floorInchargeApproved: number;
    }
  }>({
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0,
      totalRequests: 0,
      floorInchargeApproved: 0
    }
  });
  
  // Current data based on toggle
  const dashboardData = requestType === 'outing' ? outingDashboardData : {
    requests: homePermissionDashboardData.requests,
    stats: homePermissionDashboardData.stats
  };
  
  // Debug logging
  console.log('Dashboard Debug:', {
    requestType,
    outingStats: outingDashboardData.stats,
    homeStats: homePermissionDashboardData.stats,
    selectedData: dashboardData.stats
  });
  
  // Generate real-time status data from dashboard stats
  const statusData = generateStatusData(dashboardData.stats);
  
  const [weeklyTrendsData, setWeeklyTrendsData] = useState([
    { day: 'Mon', outings: 0 },
    { day: 'Tue', outings: 0 },
    { day: 'Wed', outings: 0 },
    { day: 'Thu', outings: 0 },
    { day: 'Fri', outings: 0 },
    { day: 'Sat', outings: 0 },
    { day: 'Sun', outings: 0 }
  ]);
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isApprovedModalOpen, setIsApprovedModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    rollNumber: '',
    hostelBlock: '',
    floor: '',
    roomNumber: '',
    phoneNumber: '',
    parentPhoneNumber: '',
    branch: '',
    semester: 1,
    password: ''
  });

  // Student Management State
  const [studentsByBlocks, setStudentsByBlocks] = useState<Record<string, Student[]>>({});
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Student>>({});
  const [activeTab, setActiveTab] = useState('dashboard');

  // Floor incharge password mgmt + bulk promotion
  const [floorIncharges, setFloorIncharges] = useState<Array<{_id:string; name:string; email:string;}>>([]);
  const [fiPasswords, setFiPasswords] = useState<Record<string,string>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [promotionTarget, setPromotionTarget] = useState<'2nd'|'3rd'|'4th'|'Graduated'|'none'>('none');
  const [passedOutStudents, setPassedOutStudents] = useState<Student[]>([]);

  // Disciplinary modal state
  const [isDisciplinaryModalOpen, setIsDisciplinaryModalOpen] = useState(false);
  const [disciplinaryTargetStudent, setDisciplinaryTargetStudent] = useState<Student | null>(null);
  const [disciplinaryForm, setDisciplinaryForm] = useState<{ title: string; description: string; severity: 'low' | 'medium' | 'high'; }>({
    title: '',
    description: '',
    severity: 'low'
  });

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');

  // Suspicious Students State
  const [suspiciousStudents, setSuspiciousStudents] = useState<any[]>([]);
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [suspiciousTimeRange, setSuspiciousTimeRange] = useState('7');

  // Student Details Modal State
  const [isStudentDetailsModalOpen, setIsStudentDetailsModalOpen] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<OutingRequest | null>(null);
  const [studentDetailsData, setStudentDetailsData] = useState<any>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);

  // Report Generation State
  const [reportStartDate, setReportStartDate] = useState(() => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    return lastWeek.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reportSelectedStudent, setReportSelectedStudent] = useState('all');
  const [reportStatus, setReportStatus] = useState('approved');

  // Student Profile Modal State
  const [isStudentProfileModalOpen, setIsStudentProfileModalOpen] = useState(false);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any>(null);
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false);
  const [studentProfileData, setStudentProfileData] = useState<any>(null);
  
  // Student Profile Report State
  const [profileReportStartDate, setProfileReportStartDate] = useState(() => {
    const lastMonth = new Date();
    lastMonth.setDate(lastMonth.getDate() - 30);
    return lastMonth.toISOString().split('T')[0];
  });
  const [profileReportEndDate, setProfileReportEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [profileReportType, setProfileReportType] = useState('outing'); // 'outing' or 'home'

  // Filter students based on search term and floor
  const filterStudents = (students: Student[]) => {
    if (!Array.isArray(students)) return [];
    
    return students.filter(student => {
      if (!student) return false;
      
      const matchesSearch = searchTerm === '' || 
        (student.name && typeof student.name === 'string' && student.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.rollNumber && typeof student.rollNumber === 'string' && student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.email && typeof student.email === 'string' && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.roomNumber && String(student.roomNumber).toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFloor = selectedFloor === 'all' || 
        (student.floor && student.floor === selectedFloor);
      
      return matchesSearch && matchesFloor;
    });
  };

  // Highlight search matches in text
  const highlightMatch = (text: string | number | null | undefined, searchTerm: string) => {
    if (!searchTerm || !text) return text || '';
    
    const textString = String(text);
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = textString.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </span>
      ) : part
    );
  };

  // Get unique floors from all students for filter dropdown
  const getAvailableFloors = () => {
    const floors = new Set<string>();
    Object.values(studentsByBlocks).forEach(blockStudents => {
      if (Array.isArray(blockStudents)) {
        blockStudents.forEach(student => {
          if (student?.floor && typeof student.floor === 'string') {
            floors.add(student.floor);
          }
        });
      }
    });
    return Array.from(floors).sort();
  };

  // Selection helpers for bulk actions
  const isStudentSelected = (id: string) => selectedStudentIds.includes(id);
  const selectAllInBlock = (block: string) => {
    const all = (studentsByBlocks[block] || []);
    const filtered = filterStudents(all); // respect current search and floor filters
    const ids = filtered.map(s => s._id);
    const newSet = new Set(selectedStudentIds);
    ids.forEach(id => newSet.add(id));
    setSelectedStudentIds(Array.from(newSet));
  };
  const clearSelection = () => setSelectedStudentIds([]);

  // Generate weekly trends data from requests
  const fetchFloorIncharges = async () => {
    try {
      const resp = await axiosInstance.get('/api/admin/users/floor-incharges');
      if (resp.data?.success) setFloorIncharges(resp.data.users || []);
    } catch (e) { console.error('Failed to load floor incharges', e); }
  };

  const fetchPassedOutStudents = async () => {
    try {
      const resp = await axiosInstance.get('/api/hostelincharge/students/passedout');
      if (resp.data?.success) setPassedOutStudents(resp.data.students || []);
    } catch (e) { console.error('Failed to load passed out students', e); }
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const applyPromotion = async () => {
    if (promotionTarget === 'none' || selectedStudentIds.length === 0) return;
    try {
      const resp = await axiosInstance.put('/api/hostelincharge/students/promote', {
        studentIds: selectedStudentIds,
        targetYear: promotionTarget === 'Graduated' ? 'Graduated' : promotionTarget,
      });
      if (resp.data?.success) {
        toast.success('Updated successfully');
        setPromotionTarget('none');
        setSelectedStudentIds([]);
        // refresh current students and passed-out pool
        await Promise.all([fetchStudentsByBlocks(), fetchPassedOutStudents()]);
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to apply update');
    }
  };

  useEffect(() => {
    fetchFloorIncharges();
    fetchPassedOutStudents();
  }, []);

  const generateWeeklyTrendsData = (requests: OutingRequest[]) => {
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const trendsMap = new Map();
    
    // Initialize all days with 0
    weekDays.forEach(day => trendsMap.set(day, 0));
    
    // Count outings for the current week
    const currentDate = new Date();
    const currentWeekStart = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1));
    
    requests.forEach(request => {
      const requestDate = new Date(request.outingDate);
      if (requestDate >= currentWeekStart && requestDate <= new Date()) {
        const dayName = requestDate.toLocaleDateString('en-US', { weekday: 'short' });
        const count = trendsMap.get(dayName) || 0;
        trendsMap.set(dayName, count + 1);
      }
    });
    
    return weekDays.map(day => ({
      day,
      outings: trendsMap.get(day) || 0
    }));
  };

  const fetchOutingDashboardData = async () => {
    try {
      if (!userDetails?.email || !isAuthenticated) {
        navigate('/login');
        return;
      }

      const response = await axiosInstance.get<DashboardResponse>(
        '/outings/dashboard/hostel-incharge'
      );
      
      if (response.data?.success && response.data?.data) {
        const { stats, requests } = response.data.data;
        
        setOutingDashboardData({
          requests: requests || [],
          stats: {
            ...stats,
            totalRequests: stats.pending + stats.approved + stats.denied,
            floorInchargeApproved: requests.filter(r => r?.floorInchargeApproval === 'approved').length,
            emergencyRequests: requests.filter(r => (r as any)?.category === 'emergency' && r?.status === 'pending').length
          }
        });

        // Generate and set weekly trends data
        const weeklyData = generateWeeklyTrendsData(requests || []);
        setWeeklyTrendsData(weeklyData);
      }
    } catch (error: any) {
      console.error('Outing dashboard data fetch error:', error);
      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      } else {
        toast.error('Failed to fetch outing dashboard data');
      }
    }
  };

  const fetchHomePermissionDashboardData = async () => {
    try {
      if (!userDetails?.email || !isAuthenticated) {
        navigate('/login');
        return;
      }

      const response = await axiosInstance.get('/home-permissions/dashboard/hostel-incharge');
      
      if (response.data?.success && response.data?.data) {
        const { stats, requests } = response.data.data;
        
        const mappedRequests = requests.map((req: any) => ({
          id: req._id,
          studentName: req.studentId?.name || 'Unknown',
          rollNumber: req.studentId?.rollNumber || 'N/A',
          hostelBlock: req.hostelBlock || 'N/A',
          floor: req.floor,
          roomNumber: req.studentId?.roomNumber || 'N/A',
          goingDate: req.goingDate,
          incomingDate: req.incomingDate,
          homeTownName: req.homeTownName,
          purpose: req.purpose,
          status: req.status,
          currentLevel: req.currentLevel,
          floorInchargeApproval: req.approvalFlags?.floorIncharge?.isApproved ? 'approved' : 'pending',
          hostelInchargeApproval: req.approvalFlags?.hostelIncharge?.isApproved ? 'approved' : 'pending',
          wardenApproval: req.approvalFlags?.warden?.isApproved ? 'approved' : 'pending',
          parentPhoneNumber: req.parentPhoneNumber || 'N/A',
          createdAt: req.createdAt,
          approvalFlow: req.approvalFlow || [],
          category: req.category // Added category for emergency check
        }));
        
        setHomePermissionDashboardData({
          requests: mappedRequests,
          stats: {
            ...stats,
            totalRequests: stats.pending + stats.approved + stats.denied,
            floorInchargeApproved: mappedRequests.filter((r: any) => r?.floorInchargeApproval === 'approved').length,
            emergencyRequests: mappedRequests.filter((r: any) => (r as any)?.category === 'emergency' && r.status === 'pending').length
          }
        });
      }
    } catch (error: any) {
      console.error('Home permission dashboard data fetch error:', error);
      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      } else {
        toast.error('Failed to fetch home permission dashboard data');
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchOutingDashboardData(),
        fetchHomePermissionDashboardData()
      ]);
    } catch (error: any) {
      console.error('General dashboard data fetch error:', error);
    }
  };

  const fetchApprovedStudents = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-students/hostel-incharge');
      if (response.data.success) {
        setApprovedStudents(response.data.students);
      }
    } catch (error) {
      console.error('Error fetching approved students:', error);
      toast.error('Failed to fetch approved students');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        if (!mounted) return;
        await fetchDashboardData();
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [userDetails?.email, isAuthenticated, navigate, logout]);

  useEffect(() => {
    fetchApprovedStudents();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudentsByBlocks();
    }
  }, [activeTab]);

  const handleApprove = async (requestId: string) => {
    try {
      if (!userDetails?.email) {
        toast.error('User session invalid. Please login again.');
        navigate('/login');
        return;
      }

      // Check the request category to decide if we need a comment
      const req = outingDashboardData.requests.find((r: any) => r.id === requestId) as any;
      const isEmergency = req?.category === 'emergency';
      const remarks = isEmergency ? (window.prompt('Add approval note for EMERGENCY (who requested, context, etc.)') || '') : '';

      const approvalEntry: ApprovalEntry = {
        level: 2,  // Send as number, not string
        status: 'approved',
        timestamp: new Date().toISOString(),
        approvedBy: userDetails.email,
        remarks,
        approverInfo: {
          email: userDetails.email,
          role: 'HostelIncharge'  // Match exact role string
        }
      };

      const approvalRequest = {
        requestId,
        approvalFlow: [approvalEntry],
        level: 2,  // Send as number
        status: 'approved'
      };

      const endpoint = requestType === 'outing' 
        ? `/outings/hostel-incharge/request/${requestId}/approve`
        : `/home-permissions/${requestId}/approve`;

      console.log('Sending approval request:', {
        endpoint,
        payload: approvalRequest,
        userRole: userDetails.role,
        requestType
      });

      const response = await axiosInstance.patch(endpoint, approvalRequest);

      if (response.data?.success) {
        toast.success(`${requestType === 'outing' ? 'Outing' : 'Home permission'} request approved successfully`);
        await fetchDashboardData();
      } else {
        throw new Error(response.data?.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approval error:', {
        error: error.response?.data || error.message,
        requestId,
        requestType,
        approver: {
          email: userDetails?.email,
          role: 'HostelIncharge'  // Match exact role name in error logs
        },
        details: error.response?.data?.details
      });

      // Show specific error message for missing floor incharge approval
      if (error.response?.data?.message?.includes('Floor Incharge approval')) {
        toast.error('Floor Incharge approval is required first');
      } else {
        toast.error(
          error.response?.data?.message || 
          `Failed to approve ${requestType === 'outing' ? 'outing' : 'home permission'} request. Please check all required fields.`
        );
      }

      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      }
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      if (!userDetails?.email) {
        toast.error('Invalid user session. Please login again.');
        navigate('/login');
        return;
      }

      // Use the new unified endpoint for hostel incharge
      const endpoint = `/outings/hostel-incharge/request/${requestId}/deny`;
      
      const denyRequest = {
        comments: 'Request denied by Hostel Incharge'
      };

      const response = await axiosInstance.patch(endpoint, denyRequest);

      if (response.data?.success) {
        toast.success('Request denied successfully');
        await fetchDashboardData();
      }
    } catch (error: any) {
      console.error('Denial error:', error);
      toast.error(
        error.response?.data?.message || 
        'Failed to deny request. Please try again.'
      );

      if (error.response?.status === 401) {
        logout?.();
        navigate('/login');
      }
    }
  };

  // Handle viewing student profile with comprehensive details
  const handleViewStudentProfile = async (student: any) => {
    try {
      setLoadingStudentProfile(true);
      setSelectedStudentProfile(student);
      setIsStudentProfileModalOpen(true);

      // Get comprehensive student details
      const response = await axiosInstance.get(`/students/${student._id}/details`);
      
      if (response.data?.success) {
        setStudentProfileData(response.data.student);
      } else {
        toast.error('Failed to load student profile');
      }
    } catch (error: any) {
      console.error('Failed to fetch student profile:', error);
      if (error.response?.status === 404) {
        toast.error('Student profile not found');
      } else if (error.response?.status === 403) {
        toast.error('Access denied to view this student profile');
      } else {
        toast.error('Failed to load student profile');
      }
    } finally {
      setLoadingStudentProfile(false);
    }
  };

  // Handle downloading student-specific reports
  const handleDownloadStudentReport = async (reportType: 'outing' | 'home') => {
    try {
      if (!selectedStudentProfile || !profileReportStartDate || !profileReportEndDate) {
        toast.error('Please select date range');
        return;
      }

      const params = new URLSearchParams({
        startDate: profileReportStartDate,
        endDate: profileReportEndDate,
        studentId: selectedStudentProfile._id,
        reportType: reportType
      });

      const response = await axiosInstance.get(`/reports/student-specific?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = `${reportType}-report-${selectedStudentProfile.name}-${profileReportStartDate}-to-${profileReportEndDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report downloaded successfully`);
    } catch (error: any) {
      console.error('Student report download error:', error);
      toast.error(`Failed to download ${reportType} report`);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate required fields (email is now optional for students)
      const requiredFields = ['name', 'rollNumber', 'hostelBlock', 'floor', 'roomNumber', 'phoneNumber', 'parentPhoneNumber', 'branch'];
      const missingFields = requiredFields.filter(field => !registrationForm[field as keyof typeof registrationForm]);
      
      // Also check semester (should be >= 1)
      if (!registrationForm.semester || registrationForm.semester < 1) {
        missingFields.push('semester');
      }
      
      if (missingFields.length > 0) {
        toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      // Generate default password if not provided (use roll number)
      const password = registrationForm.password || registrationForm.rollNumber;

      const registrationData = {
        ...registrationForm,
        password,
        role: 'student'
      };

      const response = await axiosInstance.post('/auth/register', registrationData);

      if (response.data.success) {
        toast.success('Student registered successfully!');
        setIsRegisterModalOpen(false);
        setRegistrationForm({
          name: '',
          email: '',
          rollNumber: '',
          hostelBlock: '',
          floor: '',
          roomNumber: '',
          phoneNumber: '',
          parentPhoneNumber: '',
          branch: '',
          semester: 1,
          password: ''
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Failed to register student');
    }
  };

  const handleInputChange = (field: keyof typeof registrationForm, value: string) => {
    setRegistrationForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Student Management Functions
  const fetchStudentsByBlocks = async () => {
    try {
      const response = await axiosInstance.get<StudentsResponse>('/students/blocks');
      console.log('Fetched students response:', response.data);
      
      if (response.data.success) {
        // Use the data as returned by the server (already filtered by assigned blocks)
        setStudentsByBlocks(response.data.data || {});
        console.log('Setting students data:', response.data.data);
      } else {
        // Initialize with empty object if API fails
        setStudentsByBlocks({});
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students data');
      // Initialize with empty object on error
      setStudentsByBlocks({});
    }
  };

  const handleEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setEditForm(student);
    setIsEditModalOpen(true);
  };

  const handleOpenDisciplinary = (student: Student) => {
    setDisciplinaryTargetStudent(student);
    setDisciplinaryForm({ title: '', description: '', severity: 'low' });
    setIsDisciplinaryModalOpen(true);
  };

  const submitDisciplinary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disciplinaryTargetStudent) return;
    if (!disciplinaryForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const payload = {
        studentId: disciplinaryTargetStudent._id,
        title: disciplinaryForm.title.trim(),
        description: (disciplinaryForm.description || '').trim(),
        severity: disciplinaryForm.severity
      };
      const resp = await axiosInstance.post('/disciplinary', payload);
      if (resp.data?.success) {
        toast.success('Disciplinary action added');
        setIsDisciplinaryModalOpen(false);
      } else {
        throw new Error(resp.data?.message || 'Failed to add action');
      }
    } catch (err: any) {
      console.error('Disciplinary create error:', err);
      toast.error(err.response?.data?.message || 'Failed to add action');
    }
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    try {
      const response = await axiosInstance.put(`/students/${selectedStudent._id}`, editForm);
      if (response.data.success) {
        toast.success('Student details updated successfully');
        setIsEditModalOpen(false);
        await fetchStudentsByBlocks();
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/students/${studentId}`);
      if (response.data.success) {
        toast.success('Student deleted successfully');
        await fetchStudentsByBlocks();
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete student');
    }
  };

  const handleDownloadCustomReport = async () => {
    try {
      if (!reportStartDate || !reportEndDate) {
        toast.error('Please select both start and end dates');
        return;
      }

      const params = new URLSearchParams({
        startDate: reportStartDate,
        endDate: reportEndDate
      });

      // Call unified report endpoint to include both outings and home permissions
      const response = await axiosInstance.get(`/reports/unified?${params.toString()}`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const filename = `custom-outing-report-${reportStartDate}-to-${reportEndDate}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report downloaded successfully');
    } catch (error: any) {
      console.error('Report download error:', error);
      toast.error('Failed to download report');
    }
  };

  // Handle viewing student details
  const handleViewStudentDetails = async (request: OutingRequest) => {
    try {
      setLoadingStudentDetails(true);
      setSelectedRequestForDetails(request);
      setIsStudentDetailsModalOpen(true);

      // Get outing request details first
      const response = await axiosInstance.get(`/outings/${request.id}/details`);
      
      if (response.data?.success) {
        const requestDetails = response.data.data;
        
        // Get detailed student information using the studentId from the request
        const studentResponse = await axiosInstance.get(`/students/${requestDetails.studentId}/details`);
        
        if (studentResponse.data?.success) {
          setStudentDetailsData({
            ...studentResponse.data.student,
            requestDetails: requestDetails
          });
        } else {
          toast.error('Failed to load student details');
        }
      } else {
        toast.error('Failed to load request details');
      }
    } catch (error: any) {
      console.error('Failed to fetch student details:', error);
      if (error.response?.status === 404) {
        toast.error('Student or request not found');
      } else if (error.response?.status === 403) {
        toast.error('Access denied to view this student');
      } else {
        toast.error('Failed to load student details');
      }
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  // Fetch suspicious students
  const fetchSuspiciousStudents = async (timeRange: string = '7') => {
    try {
      console.log('🚨 Fetching suspicious students for blocks:', userDetails?.assignedBlocks);
      
      // If user has multiple blocks, we need to fetch for each or use 'all'
      const blockParam = userDetails?.assignedBlocks?.length === 1 
        ? userDetails.assignedBlocks[0] 
        : ''; // Empty string for all blocks
      
      const response = await axiosInstance.get(`/gate/suspicious-students/${blockParam}?timeRange=${timeRange}`);
      
      if (response.data?.success) {
        // Filter by user's assigned blocks if they have multiple
        let filteredActivities = response.data.data.suspiciousActivities;
        
        if (userDetails?.assignedBlocks && userDetails.assignedBlocks.length > 1) {
          filteredActivities = filteredActivities.filter((activity: any) =>
            userDetails.assignedBlocks.includes(activity.student.hostelBlock)
          );
        }
        
        setSuspiciousStudents(filteredActivities);
        console.log(`📊 Loaded ${filteredActivities.length} suspicious activities`);
      } else {
        setSuspiciousStudents([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to fetch suspicious students:', error);
      toast.error('Failed to fetch suspicious students data');
      setSuspiciousStudents([]);
    }
  };

  // Handle opening suspicious students modal
  const handleViewSuspiciousStudents = () => {
    setShowSuspiciousModal(true);
    fetchSuspiciousStudents(suspiciousTimeRange);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl">Loading dashboard...</h2>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Mobile-optimized header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl md:text-3xl font-semibold truncate">Hostel Incharge Dashboard</h2>
            <p className={`mt-1 text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage {requestType === 'outing' ? 'outing' : 'home permission'} requests and student data
            </p>
          </div>
          
          {/* Actions: Toggle + Manual Refresh */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            {/* Toggle */}
            <div className={`relative flex items-center p-1 rounded-full border-2 ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600' 
                : 'bg-gray-100 border-gray-300'
            } shadow-lg self-start sm:self-auto`}>
              <div className={`absolute top-1 bottom-1 w-1/2 rounded-full transition-all duration-300 ease-in-out ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
              } ${requestType === 'home' ? 'translate-x-full' : 'translate-x-0'}`} />
              <button
                onClick={() => setRequestType('outing')}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full transition-all duration-300 flex-1 ${
                  requestType === 'outing' 
                    ? 'text-white' 
                    : theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Outing</span>
              </button>
              <button
                onClick={() => setRequestType('home')}
                className={`relative z-10 flex items-center justify-center gap-1.5 px-3 py-2 rounded-full transition-all duration-300 flex-1 ${
                  requestType === 'home' 
                    ? 'text-white' 
                    : theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="text-sm font-medium">Home</span>
              </button>
            </div>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  setLoading(true);
                  await Promise.all([
                    fetchOutingDashboardData(),
                    fetchHomePermissionDashboardData(),
                    fetchApprovedStudents(),
                    activeTab === 'students' ? fetchStudentsByBlocks() : Promise.resolve()
                  ]);
                  toast.success('Dashboard refreshed');
                } catch (e) {
                  console.error('Manual refresh error:', e);
                  toast.error('Failed to refresh dashboard');
                } finally {
                  setLoading(false);
                }
              }}
              className="self-start sm:self-auto"
              title="Refresh dashboard data"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Students</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm">Reports</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4 md:space-y-6">
            {/* Manage Floor Incharge Passwords */}
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Manage Floor Incharge Passwords
                </CardTitle>
                <p className="text-xs text-gray-500">Update passwords for floor incharges periodically.</p>
              </CardHeader>
              <CardContent>
                {floorIncharges.length === 0 ? (
                  <div className="text-gray-500 text-sm">No floor incharges found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 px-2">Name</th>
                          <th className="py-2 px-2">Email</th>
                          <th className="py-2 px-2">New Password</th>
                          <th className="py-2 px-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {floorIncharges.map((fi) => (
                          <tr key={fi._id} className="border-b">
                            <td className="py-2 px-2">{fi.name}</td>
                            <td className="py-2 px-2">{fi.email}</td>
                            <td className="py-2 px-2">
                              <Input
                                type="password"
                                placeholder="Enter new password"
                                value={fiPasswords[fi._id] || ''}
                                onChange={(e) => setFiPasswords(prev => ({ ...prev, [fi._id]: e.target.value }))}
                              />
                            </td>
                            <td className="py-2 px-2 text-right">
                              <Button
                                size="sm"
                                onClick={async () => {
                                  const pwd = (fiPasswords[fi._id] || '').trim();
                                  if (!pwd || pwd.length < 6) { toast.error('Password must be at least 6 chars'); return; }
                                  try {
                                    const resp = await axiosInstance.put(`/api/admin/floorincharge/${fi._id}/password`, { newPassword: pwd });
                                    if (resp.data?.success) { toast.success('Password updated'); setFiPasswords(prev => ({ ...prev, [fi._id]: '' })); }
                                  } catch (e: any) {
                                    toast.error(e.response?.data?.message || 'Failed to update');
                                  }
                                }}
                              >
                                Update Password
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 w-full sm:w-auto justify-center"
                    size="sm"
                  >
                    <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="text-xs sm:text-sm">Register Student</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="register-student-description">
                  <DialogHeader>
                    <DialogTitle>Register New Student</DialogTitle>
                    <p id="register-student-description" className="text-sm text-gray-600">
                      Fill out the form below to register a new student in the system.
                    </p>
                  </DialogHeader>
                  <form onSubmit={handleRegisterStudent} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          value={registrationForm.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Student name"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="rollNumber">Roll Number *</Label>
                        <Input
                          id="rollNumber"
                          value={registrationForm.rollNumber}
                          onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                          placeholder="e.g., 2200320100XXX"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={registrationForm.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="student@kietgroup.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber">Phone *</Label>
                        <Input
                          id="phoneNumber"
                          value={registrationForm.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                          placeholder="Student phone"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="parentPhoneNumber">Parent Phone *</Label>
                        <Input
                          id="parentPhoneNumber"
                          value={registrationForm.parentPhoneNumber}
                          onChange={(e) => handleInputChange('parentPhoneNumber', e.target.value)}
                          placeholder="Parent phone"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="hostelBlock">Hostel Block *</Label>
                        <Select
                          value={registrationForm.hostelBlock}
                          onValueChange={(value) => handleInputChange('hostelBlock', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select block" />
                          </SelectTrigger>
                          <SelectContent>
                            {userDetails?.assignedBlocks?.map((block: string) => (
                              <SelectItem key={block} value={block === 'W-Block' ? 'Womens-Block' : block}>
                                {block === 'W-Block' ? 'W-Block (Women)' : `${block} (Girls)`}
                              </SelectItem>
                            )) || (
                              <>
                                <SelectItem value="D-Block">D-Block (Boys)</SelectItem>
                                <SelectItem value="E-Block">E-Block (Boys)</SelectItem>
                                <SelectItem value="Womens-Block">W-Block (Women)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="floor">Floor *</Label>
                        <Select
                          value={registrationForm.floor}
                          onValueChange={(value) => handleInputChange('floor', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select floor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1st Floor">1st Floor</SelectItem>
                            <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                            <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                            <SelectItem value="4th Floor">4th Floor</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="roomNumber">Room Number *</Label>
                        <Input
                          id="roomNumber"
                          value={registrationForm.roomNumber}
                          onChange={(e) => handleInputChange('roomNumber', e.target.value)}
                          placeholder="e.g., 201"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="branch">Branch *</Label>
                        <Input
                          id="branch"
                          value={registrationForm.branch}
                          onChange={(e) => handleInputChange('branch', e.target.value)}
                          placeholder="e.g., Computer Science"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="semester">Semester *</Label>
                        <Input
                          id="semester"
                          type="number"
                          min="1"
                          max="8"
                          value={registrationForm.semester}
                          onChange={(e) => handleInputChange('semester', String(parseInt(e.target.value) || 1))}
                          placeholder="e.g., 5"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password (Optional)</Label>
                        <Input
                          id="password"
                          type="password"
                          value={registrationForm.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          placeholder="Default: Same as Roll Number"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsRegisterModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">
                        Register Student
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Button
                onClick={handleDownloadCustomReport}
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
                size="sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Quick Report (Last 7 Days)</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
              <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'} rounded-full`}>
                    <Clock className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                    <p className="text-lg md:text-2xl font-semibold">{dashboardData.stats.pending}</p>
                  </div>
                </div>
              </Card>
              <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                    <CheckCircle className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approved</p>
                    <p className="text-lg md:text-2xl font-semibold">{dashboardData.stats.approved}</p>
                  </div>
                </div>
              </Card>
              <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full`}>
                    <XCircle className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Denied</p>
                    <p className="text-lg md:text-2xl font-semibold">{dashboardData.stats.denied}</p>
                  </div>
                </div>
              </Card>
              <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'} ${
                dashboardData.stats.emergencyRequests > 0 ? 'ring-2 ring-red-500 animate-pulse' : ''
              }`}>
                <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                  <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full`}>
                    <AlertTriangle className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`} />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} font-bold`}>
                      EMERGENCY
                    </p>
                    <p className="text-lg md:text-2xl font-semibold text-red-600">
                      {dashboardData.stats.emergencyRequests || 0}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                <CardHeader className="pb-2 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <PieChart className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Request Status Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 md:h-80">
                    {statusData.every(item => item.value === 0) ? (
                      <div className="flex items-center justify-center h-full">
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                          No request data available<br />
                          <span className="text-sm">Charts will display when requests are submitted</span>
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                              border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: theme === 'dark' ? '#f9fafb' : '#1f2937'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{
                              color: theme === 'dark' ? '#f9fafb' : '#1f2937'
                            }}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                <CardHeader className="pb-2 md:pb-6">
                  <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                    <Activity className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Weekly Outing Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 md:h-80">
                    {weeklyTrendsData.every(item => item.outings === 0) ? (
                      <div className="flex items-center justify-center h-full">
                        <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                          No weekly trend data available<br />
                          <span className="text-sm">Chart will show trends once requests are approved</span>
                        </p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyTrendsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                          <XAxis 
                            dataKey="day" 
                            stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                          />
                          <YAxis 
                            stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                              border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                              borderRadius: '8px',
                              color: theme === 'dark' ? '#f9fafb' : '#1f2937'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="outings" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: '#3b82f6', r: 4 }}
                            activeDot={{ r: 6, fill: '#1d4ed8' }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader className="pb-2 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  <Building className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Pending Hostel Outing Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile Card Layout */}
                <div className="block md:hidden space-y-3">
                  {dashboardData.requests?.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      No requests found
                    </div>
                  ) : (
                    dashboardData.requests?.filter(Boolean).map((request) => {
                      const isEmergency = (request as any)?.category === 'emergency';
                      return (
                        <Card key={request?.id || 'unknown'} className={`p-4 ${
                          isEmergency ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''
                        } ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-white/50'}`}>
                          <div className="space-y-3">
                            {/* Student Info */}
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-sm">{request?.studentName || 'N/A'}</h4>
                                <p className="text-xs text-gray-500">{request?.rollNumber || 'N/A'}</p>
                              </div>
                              {isEmergency && (
                                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                                  🚨 EMERGENCY
                                </span>
                              )}
                            </div>
                            
                            {/* Details */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Room:</span>
                                <p className="font-medium">{`${request?.hostelBlock || 'N/A'} - ${request?.roomNumber || 'N/A'}`}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <p className="font-medium">
                                  {requestType === 'outing' ? 
                                    ((request as OutingRequest)?.outingDate ? 
                                      new Date((request as OutingRequest).outingDate).toLocaleDateString() : 'N/A'
                                    ) : 
                                    ((request as HomePermissionRequest)?.goingDate ? 
                                      new Date((request as HomePermissionRequest).goingDate).toLocaleDateString() : 'N/A'
                                    )
                                  }
                                </p>
                              </div>
                            </div>
                            
                            {/* Parent Phone Number - Important for Emergency Requests */}
                            {isEmergency && (
                              <div>
                                <span className="text-gray-500 text-xs">Parent Phone:</span>
                                <p className="text-sm font-medium text-red-600 font-semibold">
                                  {request?.parentPhoneNumber || 'N/A'}
                                </p>
                              </div>
                            )}
                            
                            {/* Purpose */}
                            <div>
                              <span className="text-gray-500 text-xs">Purpose:</span>
                              <p className="text-sm font-medium">{request?.purpose || 'N/A'}</p>
                            </div>
                            
                            {/* Status Badges */}
                            <div className="flex flex-wrap gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                request?.floorInchargeApproval === 'approved' ? 'bg-green-100 text-green-800' :
                                request?.floorInchargeApproval === 'denied' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {(() => {
                                  const floorLabel = (request as any)?.floor || 'Floor';
                                  if (request?.floorInchargeApproval === 'approved') return `${floorLabel} ✓`;
                                  if (request?.floorInchargeApproval === 'denied') return `${floorLabel} ✗`;
                                  return `Awaiting ${floorLabel}`;
                                })()}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(request as OutingRequest)}`}>
                                {getStatusText(request as OutingRequest)}
                              </span>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewStudentDetails(request)}
                                className="bg-blue-50 hover:bg-blue-100 text-blue-700 w-full"
                              >
                                <Eye className="w-3 h-3 mr-2" />
                                View Details
                              </Button>
                              {request?.currentLevel === 'hostel-incharge' && (isEmergency || request?.floorInchargeApproval === 'approved') && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApprove(request?.id)}
                                    className={`flex-1 ${isEmergency 
                                      ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                                    }`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {isEmergency ? 'URGENT' : 'Approve'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeny(request?.id)}
                                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-700"
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Deny
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <th className="text-left py-3 text-sm">Student</th>
                        <th className="text-left py-3 text-sm">Roll No.</th>
                        <th className="text-left py-3 text-sm">Hostel & Room</th>
                        <th className="text-left py-3 text-sm">Date & Time</th>
                        <th className="text-left py-3 text-sm">Purpose</th>
                        <th className="text-left py-3 text-sm">Floor Incharge</th>
                        <th className="text-left py-3 text-sm">Parent Phone</th>
                        <th className="text-left py-3 text-sm">Status</th>
                        <th className="text-right py-3 text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.requests?.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            No requests found
                          </td>
                        </tr>
                      ) : (
                        dashboardData.requests?.filter(Boolean).map((request) => {
                          const isEmergency = (request as any)?.category === 'emergency';
                          return (
                            <tr key={request?.id || 'unknown'} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${
                              isEmergency ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : ''
                            }`}>
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  {request?.studentName || 'N/A'}
                                  {isEmergency && (
                                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                                      🚨 EMERGENCY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 text-sm">{request?.rollNumber || 'N/A'}</td>
                              <td className="py-3 text-sm">{`${request?.hostelBlock || 'N/A'} - ${request?.roomNumber || 'N/A'}`}</td>
                              <td className="py-3 text-sm">
                                {requestType === 'outing' ? 
                                  ((request as OutingRequest)?.outingDate ? 
                                    `${new Date((request as OutingRequest).outingDate).toLocaleDateString()} ${(request as OutingRequest)?.outingTime || ''}-${(request as OutingRequest)?.returnTime || ''}` : 
                                    'N/A'
                                  ) : 
                                  ((request as HomePermissionRequest)?.goingDate ? 
                                    `${new Date((request as HomePermissionRequest).goingDate).toLocaleDateString()}-${new Date((request as HomePermissionRequest).incomingDate).toLocaleDateString()}` : 
                                    'N/A'
                                  )
                                }
                              </td>
                              <td className="py-3 text-sm">{request?.purpose || 'N/A'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  request?.floorInchargeApproval === 'approved' ? 'bg-green-100 text-green-800' :
                                  request?.floorInchargeApproval === 'denied' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {(() => {
                                    const floorLabel = (request as any)?.floor || 'Floor';
                                    if (request?.floorInchargeApproval === 'approved') return `${floorLabel} Approved`;
                                    if (request?.floorInchargeApproval === 'denied') return `${floorLabel} Denied`;
                                    return `Awaiting ${floorLabel}`;
                                  })()}
                                </span>
                              </td>
                              <td className="py-3">{request?.parentPhoneNumber || 'N/A'}</td>
                              <td className="py-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(request as OutingRequest)}`}>
                                  {getStatusText(request as OutingRequest)}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewStudentDetails(request)}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </Button>
                                  {request?.currentLevel === 'hostel-incharge' && (isEmergency || request?.floorInchargeApproval === 'approved') && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApprove(request?.id)}
                                        className={`px-2 ${isEmergency 
                                          ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
                                          : 'bg-green-50 hover:bg-green-100 text-green-700'
                                        }`}
                                      >
                                        <CheckCircle className="w-3 h-3" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeny(request?.id)}
                                        className="bg-red-50 hover:bg-red-100 text-red-700 px-2"
                                      >
                                        <XCircle className="w-3 h-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-sm md:text-base">Approved Outing Students</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setIsApprovedModalOpen(true)}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                  size="sm"
                >
                  View All
                </Button>
              </CardHeader>
            </Card>

            <ApprovedStudentsList
              isOpen={isApprovedModalOpen}
              onClose={() => setIsApprovedModalOpen(false)}
              students={approvedStudents}
              onDownloadPDF={handleDownloadCustomReport}
            />
          </TabsContent>

          {/* Student Management Tab */}
          <TabsContent value="students" className="space-y-6">
            {/* Display assigned blocks info */}
            {userDetails?.assignedBlocks && userDetails.assignedBlocks.length > 0 && (
              <div className="mb-4">
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  You are managing: <span className="font-medium">{userDetails.assignedBlocks.join(', ')}</span>
                </p>
              </div>
            )}

            {/* Search and Filter Controls */}
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by name, roll number, email, or room..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <Select value={selectedFloor} onValueChange={setSelectedFloor}>
                      <SelectTrigger>
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Floors</SelectItem>
                        {getAvailableFloors().map(floor => (
                          <SelectItem key={floor} value={floor}>
                            {floor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(searchTerm || selectedFloor !== 'all') && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedFloor('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>

                {/* Bulk selection bar */}
                {selectedStudentIds.length > 0 && (
                  <div className="mt-4 flex items-center gap-3">
                    <Select value={promotionTarget} onValueChange={(v: any) => setPromotionTarget(v)}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2nd">Promote to 2nd Year</SelectItem>
                        <SelectItem value="3rd">Promote to 3rd Year</SelectItem>
                        <SelectItem value="4th">Promote to 4th Year</SelectItem>
                        <SelectItem value="Graduated">Mark as Graduated</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={applyPromotion} disabled={promotionTarget === 'none'}>
                      Apply to ({selectedStudentIds.length}) selected
                    </Button>
                    <Button variant="outline" onClick={clearSelection}>Clear Selection</Button>
                  </div>
                )}

                {(searchTerm || selectedFloor !== 'all') && (
                  <div className="mt-3 flex justify-between items-start text-sm text-gray-500">
                    <div>
                      {searchTerm && (
                        <span>Searching for: "<span className="font-medium">{searchTerm}</span>"</span>
                      )}
                      {searchTerm && selectedFloor !== 'all' && ' • '}
                      {selectedFloor !== 'all' && (
                        <span>Floor: <span className="font-medium">{selectedFloor}</span></span>
                      )}
                    </div>
                    <div className="text-right">
                      {(() => {
                        const totalFiltered = Object.values(studentsByBlocks).reduce((sum, students) => {
                          if (Array.isArray(students)) {
                            return sum + filterStudents(students).length;
                          }
                          return sum;
                        }, 0);
                        const totalAll = Object.values(studentsByBlocks).reduce((sum, students) => {
                          if (Array.isArray(students)) {
                            return sum + students.length;
                          }
                          return sum;
                        }, 0);
                        return totalFiltered !== totalAll ? (
                          <span>Showing {totalFiltered} of {totalAll} students</span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <div className={`grid gap-6 ${Object.keys(studentsByBlocks).length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : Object.keys(studentsByBlocks).length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
              {Object.keys(studentsByBlocks).map(block => {
                const allBlockStudents = Array.isArray(studentsByBlocks[block]) ? studentsByBlocks[block] : [];
                const filteredBlockStudents = filterStudents(allBlockStudents);
                return (
                <Card key={block} className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        {block === 'W-Block' ? "Women's Block" : block}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => selectAllInBlock(block)}>Select all</Button>
                        <div className="text-sm font-normal text-gray-500">
                          {filteredBlockStudents.length !== allBlockStudents.length ? 
                            `${filteredBlockStudents.length}/${allBlockStudents.length}` : 
                            `${allBlockStudents.length}`
                          } students
                        </div>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto p-6">
                      <div className="space-y-3">
                        {filteredBlockStudents.length === 0 ? (
                          <div className="text-center py-8">
                            {allBlockStudents.length === 0 ? (
                              <p className="text-gray-500">No students found in this block</p>
                            ) : (
                              <div>
                                <p className="text-gray-500 mb-2">No students match your filters</p>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    setSearchTerm('');
                                    setSelectedFloor('all');
                                  }}
                                >
                                  Clear Filters
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          filteredBlockStudents.map(student => (
                            <div key={student._id} className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>
                              <div className="flex justify-between items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={isStudentSelected(student._id)}
                                  onChange={() => toggleStudentSelection(student._id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium truncate">{highlightMatch(student?.name, searchTerm)}</h4>
                                  <p className="text-sm text-gray-500 truncate">{highlightMatch(student?.rollNumber, searchTerm)}</p>
                                  <p className="text-sm text-gray-500">Room: {highlightMatch(student?.roomNumber, searchTerm)}</p>
                                  <p className="text-sm text-gray-500">Floor: {student?.floor || 'N/A'}</p>
                                  <p className="text-sm text-gray-500">{student?.branch || 'N/A'} - Sem {student?.semester || 'N/A'}</p>
                                  <p className="text-sm text-gray-500 truncate">📧 {highlightMatch(student?.email, searchTerm)}</p>
                                </div>
                                <div className="flex gap-1 ml-2 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleViewStudentProfile(student)}
                                    className="text-blue-600 hover:text-blue-700 p-2"
                                    title="View Student Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditStudent(student)}
                                    className="p-2"
                                    title="Edit Student"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenDisciplinary(student)}
                                    className="text-amber-600 hover:text-amber-700 p-2"
                                    title="Disciplinary Actions"
                                  >
                                    <AlertTriangle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDeleteStudent(student._id, student.name)}
                                    className="text-red-600 hover:text-red-700 p-2"
                                    title="Delete Student"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>

            {/* Passed Out Students */}
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Passed Out Students
                </CardTitle>
                <p className="text-sm text-gray-500">Students marked as Graduated cannot create new requests but can be viewed here.</p>
              </CardHeader>
              <CardContent>
                {passedOutStudents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">No passed out students yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b">
                          <th className="py-2 px-2">Name</th>
                          <th className="py-2 px-2">Roll</th>
                          <th className="py-2 px-2">Email</th>
                          <th className="py-2 px-2">Block</th>
                          <th className="py-2 px-2">Floor</th>
                          <th className="py-2 px-2">Room</th>
                          <th className="py-2 px-2">Branch</th>
                          <th className="py-2 px-2">Semester</th>
                          <th className="py-2 px-2">Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passedOutStudents.map(s => (
                          <tr key={s._id} className="border-b">
                            <td className="py-2 px-2">{s.name}</td>
                            <td className="py-2 px-2">{s.rollNumber}</td>
                            <td className="py-2 px-2">{s.email}</td>
                            <td className="py-2 px-2">{s.hostelBlock}</td>
                            <td className="py-2 px-2">{s.floor}</td>
                            <td className="py-2 px-2">{s.roomNumber}</td>
                            <td className="py-2 px-2">{s.branch}</td>
                            <td className="py-2 px-2">{s.semester}</td>
                            <td className="py-2 px-2">{s.year || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Date Range Report Section */}
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Generate Custom Report
                </CardTitle>
                <p className="text-sm text-gray-500">Select date range and filters to generate detailed reports</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="report-student">Filter by Student (Optional)</Label>
                    <Select value={reportSelectedStudent} onValueChange={setReportSelectedStudent}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Students" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        {Object.values(studentsByBlocks).flat().map(student => (
                          <SelectItem key={student._id} value={student._id}>
                            {student.name} ({student.rollNumber})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="report-status">Filter by Status</Label>
                    <Select value={reportStatus} onValueChange={setReportStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    className="flex-1"
                    onClick={handleDownloadCustomReport}
                    disabled={!reportStartDate || !reportEndDate}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                      setReportStartDate(lastWeek.toISOString().split('T')[0]);
                      setReportEndDate(today.toISOString().split('T')[0]);
                    }}
                  >
                    Last 7 Days
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const today = new Date();
                      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                      setReportStartDate(lastMonth.toISOString().split('T')[0]);
                      setReportEndDate(today.toISOString().split('T')[0]);
                    }}
                  >
                    Last 30 Days
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Suspicious Students Section */}
            <div className="mt-8">
              <Card className={`${theme === 'dark' ? 'bg-red-800/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                <CardHeader className="text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                  <CardTitle className="text-lg text-red-800 dark:text-red-300">Security Alerts</CardTitle>
                  <p className="text-sm text-red-600 dark:text-red-400">Students flagged for suspicious activity</p>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleViewSuspiciousStudents}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    View Suspicious Activities
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Student Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby="edit-student-description">
            <DialogHeader>
              <DialogTitle>Edit Student Details</DialogTitle>
              <p id="edit-student-description" className="text-sm text-gray-600">
                Update the student information below. All required fields must be filled.
              </p>
            </DialogHeader>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-rollNumber">Roll Number</Label>
                  <Input
                    id="edit-rollNumber"
                    value={editForm.rollNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, rollNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phoneNumber">Phone</Label>
                  <Input
                    id="edit-phoneNumber"
                    value={editForm.phoneNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-hostelBlock">Hostel Block</Label>
                  <Select
                    value={editForm.hostelBlock || ''}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, hostelBlock: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userDetails?.assignedBlocks?.map((block: string) => (
                        <SelectItem key={block} value={block}>
                          {block === 'W-Block' ? 'W-Block (Women)' : `${block} (Boys)`}
                        </SelectItem>
                      )) || (
                        <>
                          <SelectItem value="D-Block">D-Block (Boys)</SelectItem>
                          <SelectItem value="E-Block">E-Block (Boys)</SelectItem>
                          <SelectItem value="W-Block">W-Block (Women)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-roomNumber">Room Number</Label>
                  <Input
                    id="edit-roomNumber"
                    value={editForm.roomNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-branch">Branch</Label>
                  <Input
                    id="edit-branch"
                    value={editForm.branch || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder="e.g., CSE"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-semester">Semester</Label>
                  <Input
                    id="edit-semester"
                    type="number"
                    min="1"
                    max="8"
                    value={editForm.semester || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, semester: parseInt(e.target.value) || 1 }))}
                    placeholder="e.g., 5"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-parentPhoneNumber">Parent Phone</Label>
                  <Input
                    id="edit-parentPhoneNumber"
                    value={editForm.parentPhoneNumber || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, parentPhoneNumber: e.target.value }))}
                    placeholder="Parent phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-floor">Floor</Label>
                  <Select
                    value={editForm.floor || ''}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, floor: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1st Floor">1st Floor</SelectItem>
                      <SelectItem value="2nd Floor">2nd Floor</SelectItem>
                      <SelectItem value="3rd Floor">3rd Floor</SelectItem>
                      <SelectItem value="4th Floor">4th Floor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Update Student
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Disciplinary Action Modal */}
        <Dialog open={isDisciplinaryModalOpen} onOpenChange={setIsDisciplinaryModalOpen}>
          <DialogContent className="max-w-lg" aria-describedby="disciplinary-description">
            <DialogHeader>
              <DialogTitle>Add Disciplinary Action</DialogTitle>
              <p id="disciplinary-description" className="text-sm text-gray-600">
                Create a disciplinary record for {disciplinaryTargetStudent?.name} ({disciplinaryTargetStudent?.rollNumber}).
              </p>
            </DialogHeader>
            <form onSubmit={submitDisciplinary} className="space-y-4">
              <div>
                <Label htmlFor="disc-title">Title *</Label>
                <Input id="disc-title" value={disciplinaryForm.title} onChange={(e) => setDisciplinaryForm(prev => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="disc-desc">Description</Label>
                <Textarea id="disc-desc" value={disciplinaryForm.description} onChange={(e) => setDisciplinaryForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Add details..." />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={disciplinaryForm.severity} onValueChange={(v) => setDisciplinaryForm(prev => ({ ...prev, severity: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDisciplinaryModalOpen(false)}>Cancel</Button>
                <Button type="submit">Add Action</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Suspicious Students Modal */}
        <Dialog open={showSuspiciousModal} onOpenChange={setShowSuspiciousModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="suspicious-students-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
                <AlertTriangle className="w-5 h-5" />
                Suspicious Activity Report
              </DialogTitle>
              <p id="suspicious-students-description" className="text-sm text-gray-600">
                Students flagged by security for suspicious behavior during check-ins
              </p>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Time Range Filter */}
              <div className="flex items-center gap-4">
                <Label htmlFor="timeRange" className="font-medium">Time Range:</Label>
                <Select
                  value={suspiciousTimeRange}
                  onValueChange={(value) => {
                    setSuspiciousTimeRange(value);
                    fetchSuspiciousStudents(value);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24 hours</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => fetchSuspiciousStudents(suspiciousTimeRange)}
                  variant="outline"
                  size="sm"
                >
                  Refresh
                </Button>
              </div>

              {/* Suspicious Students List */}
              {suspiciousStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-medium text-green-700 dark:text-green-400">No Suspicious Activities</h3>
                  <p className="text-sm text-gray-500">No students have been flagged for suspicious behavior in the selected time period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-3">
                    {suspiciousStudents.length} Suspicious Activities Found
                  </h4>
                  
                  {suspiciousStudents.map((activity, index) => (
                    <Card key={activity.id || index} className="border-red-200 dark:border-red-800">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Student Info */}
                          <div>
                            <h5 className="font-semibold text-red-800 dark:text-red-300">
                              {activity.student.name}
                            </h5>
                            <p className="text-sm text-gray-600">
                              <strong>Roll:</strong> {activity.student.rollNumber}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Block:</strong> {activity.student.hostelBlock} - Floor {activity.student.floor}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Room:</strong> {activity.student.roomNumber}
                            </p>
                          </div>
                          
                          {/* Activity Info */}
                          <div>
                            <p className="text-sm">
                              <strong>Check-in Time:</strong>{' '}
                              {new Date(activity.activity.scannedAt).toLocaleString()}
                            </p>
                            <p className="text-sm">
                              <strong>Location:</strong> {activity.activity.location}
                            </p>
                            <p className="text-sm">
                              <strong>Purpose:</strong> {activity.outing.purpose}
                            </p>
                            <p className="text-sm">
                              <strong>Outing Time:</strong> {activity.outing.outingTime} - {activity.outing.returnTime}
                            </p>
                          </div>
                          
                          {/* Security Comment */}
                          <div>
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <h6 className="font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4" />
                                Security Report
                              </h6>
                              <p className="text-sm text-red-700 dark:text-red-400">
                                {activity.activity.suspiciousComment || activity.activity.securityComment || 'No specific details provided'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Student Details Modal */}
        <Dialog open={isStudentDetailsModalOpen} onOpenChange={setIsStudentDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="student-details-description">
            <DialogHeader>
              <DialogTitle>Student Details & Outing Information</DialogTitle>
              <p id="student-details-description" className="text-sm text-gray-600">
                Complete information about the student including suspicious activities and approval comments.
              </p>
            </DialogHeader>
            
            {loadingStudentDetails ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2">Loading student details...</span>
              </div>
            ) : studentDetailsData ? (
              <div className="space-y-6">
                {/* Student Basic Information */}
                <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Student Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p><strong>Name:</strong> {studentDetailsData.name}</p>
                        <p><strong>Roll Number:</strong> {studentDetailsData.rollNumber}</p>
                        <p><strong>Email:</strong> {studentDetailsData.email}</p>
                        <p><strong>Phone:</strong> {studentDetailsData.phoneNumber}</p>
                      </div>
                      <div>
                        <p><strong>Hostel Block:</strong> {studentDetailsData.hostelBlock}</p>
                        <p><strong>Floor:</strong> {studentDetailsData.floor}</p>
                        <p><strong>Room:</strong> {studentDetailsData.roomNumber}</p>
                        <p><strong>Branch:</strong> {studentDetailsData.branch} - Sem {studentDetailsData.semester}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Current Outing Request Details */}
                {selectedRequestForDetails && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-blue-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Current Outing Request
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p><strong>Purpose:</strong> {selectedRequestForDetails.purpose}</p>
                          <p><strong>Date:</strong> {new Date(selectedRequestForDetails.outingDate).toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {selectedRequestForDetails.outingTime} - {selectedRequestForDetails.returnTime}</p>
                          <p><strong>Status:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getStatusBadgeColor(selectedRequestForDetails)}`}>
                              {getStatusText(selectedRequestForDetails)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p><strong>Category:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              (selectedRequestForDetails as any)?.category === 'emergency' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {(selectedRequestForDetails as any)?.category === 'emergency' ? 'Emergency' : 'Normal'}
                            </span>
                          </p>
                          <p><strong>Current Level:</strong> {selectedRequestForDetails.currentLevel}</p>
                          <p><strong>Floor Incharge:</strong> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              selectedRequestForDetails.floorInchargeApproval === 'approved' ? 'bg-green-100 text-green-800' :
                              selectedRequestForDetails.floorInchargeApproval === 'denied' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {selectedRequestForDetails.floorInchargeApproval}
                            </span>
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Floor Incharge Comments */}
                {studentDetailsData.requestDetails?.approvalFlags?.floorIncharge?.remarks && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-yellow-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Floor Incharge Comments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <p className="text-sm">{studentDetailsData.requestDetails.approvalFlags.floorIncharge.remarks}</p>
                        {studentDetailsData.requestDetails.approvalFlags.floorIncharge.timestamp && (
                          <p className="text-xs text-gray-500 mt-2">
                            Commented on: {new Date(studentDetailsData.requestDetails.approvalFlags.floorIncharge.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suspicious Activities */}
                {studentDetailsData.suspiciousActivities && studentDetailsData.suspiciousActivities.length > 0 && (
                  <Card className={`${theme === 'dark' ? 'bg-red-800/20 border-red-700' : 'bg-red-50 border-red-200'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-300">
                        <AlertTriangle className="w-5 h-5" />
                        Suspicious Activities ({studentDetailsData.suspiciousActivities.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {studentDetailsData.suspiciousActivities.map((activity: any, index: number) => (
                          <div key={index} className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-red-800 dark:text-red-300">{activity.title}</p>
                                <p className="text-sm text-red-700 dark:text-red-400">{activity.message}</p>
                              </div>
                              <span className="text-xs text-red-600 dark:text-red-400">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Disciplinary Actions */}
                {studentDetailsData.disciplinaryActions && studentDetailsData.disciplinaryActions.length > 0 && (
                  <Card className={`${theme === 'dark' ? 'bg-orange-800/20 border-orange-700' : 'bg-orange-50 border-orange-200'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                        <Shield className="w-5 h-5" />
                        Disciplinary Actions ({studentDetailsData.disciplinaryActions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {studentDetailsData.disciplinaryActions.map((action: any, index: number) => (
                          <div key={index} className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-orange-800 dark:text-orange-300">{action.title}</p>
                                <p className="text-sm text-orange-700 dark:text-orange-400">{action.description}</p>
                                <span className={`inline-block mt-1 px-2 py-1 rounded text-xs ${
                                  action.severity === 'high' ? 'bg-red-200 text-red-800' :
                                  action.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-green-200 text-green-800'
                                }`}>
                                  {action.severity} severity
                                </span>
                              </div>
                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                {new Date(action.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Statistics */}
                {studentDetailsData.stats && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5" />
                        Student Statistics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{studentDetailsData.stats.totalOutingRequests}</p>
                          <p className="text-sm text-gray-600">Total Outings</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{studentDetailsData.stats.approvedOutings}</p>
                          <p className="text-sm text-gray-600">Approved</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">{studentDetailsData.stats.totalDisciplinaryActions}</p>
                          <p className="text-sm text-gray-600">Disciplinary</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">{studentDetailsData.stats.totalSuspiciousActivities}</p>
                          <p className="text-sm text-gray-600">Suspicious</p>
                        </div>
                      </div>
                      {studentDetailsData.stats.riskLevel && (
                        <div className="mt-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            studentDetailsData.stats.riskLevel === 'high' ? 'bg-red-200 text-red-800' :
                            studentDetailsData.stats.riskLevel === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                            'bg-green-200 text-green-800'
                          }`}>
                            Risk Level: {studentDetailsData.stats.riskLevel.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No student details available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Comprehensive Student Profile Modal */}
        <Dialog open={isStudentProfileModalOpen} onOpenChange={setIsStudentProfileModalOpen}>
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto" aria-describedby="student-profile-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Student Profile - {selectedStudentProfile?.name}
              </DialogTitle>
              <p id="student-profile-description" className="text-sm text-gray-600">
                Comprehensive student information including disciplinary actions, suspicious activities, and outing history.
              </p>
            </DialogHeader>
            
            {loadingStudentProfile ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-lg">Loading comprehensive student profile...</span>
              </div>
            ) : studentProfileData ? (
              <div className="space-y-6">
                {/* Student Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-blue-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-700">
                        <Users className="w-5 h-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Name</p>
                          <p className="font-semibold">{studentProfileData.name}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Roll Number</p>
                          <p className="font-semibold">{studentProfileData.rollNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <p className="font-semibold text-sm">{studentProfileData.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p className="font-semibold">{studentProfileData.phoneNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Branch</p>
                          <p className="font-semibold">{studentProfileData.branch}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Semester</p>
                          <p className="font-semibold">{studentProfileData.semester}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-green-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-700">
                        <Building className="w-5 h-5" />
                        Hostel Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Hostel Block</p>
                          <p className="font-semibold">{studentProfileData.hostelBlock}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Floor</p>
                          <p className="font-semibold">{studentProfileData.floor}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Room Number</p>
                          <p className="font-semibold">{studentProfileData.roomNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Parent Phone</p>
                          <p className="font-semibold">{studentProfileData.parentPhoneNumber}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Statistics Overview */}
                <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-gray-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5" />
                      Student Statistics & Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-100 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{studentProfileData.stats.totalOutingRequests}</p>
                        <p className="text-sm text-gray-600">Total Outings</p>
                      </div>
                      <div className="text-center p-3 bg-green-100 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{studentProfileData.stats.approvedOutings}</p>
                        <p className="text-sm text-gray-600">Approved</p>
                      </div>
                      <div className="text-center p-3 bg-red-100 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{studentProfileData.stats.deniedOutings}</p>
                        <p className="text-sm text-gray-600">Denied</p>
                      </div>
                      <div className="text-center p-3 bg-orange-100 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600">{studentProfileData.stats.totalDisciplinaryActions}</p>
                        <p className="text-sm text-gray-600">Disciplinary</p>
                      </div>
                      <div className="text-center p-3 bg-purple-100 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">{studentProfileData.stats.totalSuspiciousActivities}</p>
                        <p className="text-sm text-gray-600">Suspicious</p>
                      </div>
                    </div>
                    {studentProfileData.stats.riskLevel && (
                      <div className="text-center">
                        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                          studentProfileData.stats.riskLevel === 'high' ? 'bg-red-200 text-red-800' :
                          studentProfileData.stats.riskLevel === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          Risk Level: {studentProfileData.stats.riskLevel.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Report Generation Section */}
                <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-yellow-50'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-yellow-700">
                      <Download className="w-5 h-5" />
                      Generate Student Reports
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="profile-start-date">Start Date</Label>
                        <Input
                          id="profile-start-date"
                          type="date"
                          value={profileReportStartDate}
                          onChange={(e) => setProfileReportStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="profile-end-date">End Date</Label>
                        <Input
                          id="profile-end-date"
                          type="date"
                          value={profileReportEndDate}
                          onChange={(e) => setProfileReportEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button
                        onClick={() => handleDownloadStudentReport('outing')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={!profileReportStartDate || !profileReportEndDate}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Outing Report
                      </Button>
                      <Button
                        onClick={() => handleDownloadStudentReport('home')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!profileReportStartDate || !profileReportEndDate}
                      >
                        <Home className="w-4 h-4 mr-2" />
                        Download Home Permission Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Outing History */}
                {studentProfileData.recentOutings && studentProfileData.recentOutings.length > 0 && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-white'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Recent Outing History (Last 10)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {studentProfileData.recentOutings.map((outing: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            outing.status === 'approved' ? 'border-green-200 bg-green-50' :
                            outing.status === 'denied' ? 'border-red-200 bg-red-50' :
                            'border-yellow-200 bg-yellow-50'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{outing.purpose}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(outing.outingDate).toLocaleDateString()} at {outing.outingTime}
                                </p>
                                <p className="text-sm text-gray-600">Return: {outing.returnTime || 'Not specified'}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                outing.status === 'approved' ? 'bg-green-200 text-green-800' :
                                outing.status === 'denied' ? 'bg-red-200 text-red-800' :
                                'bg-yellow-200 text-yellow-800'
                              }`}>
                                {outing.status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Disciplinary Actions */}
                {studentProfileData.disciplinaryActions && studentProfileData.disciplinaryActions.length > 0 && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-red-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-700">
                        <AlertTriangle className="w-5 h-5" />
                        Disciplinary Actions ({studentProfileData.disciplinaryActions.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {studentProfileData.disciplinaryActions.map((action: any, index: number) => (
                          <div key={index} className={`p-3 rounded-lg border ${
                            action.severity === 'high' ? 'border-red-300 bg-red-100' :
                            action.severity === 'medium' ? 'border-orange-300 bg-orange-100' :
                            'border-yellow-300 bg-yellow-100'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h6 className="font-medium">{action.title}</h6>
                                <p className="text-sm text-gray-700 mt-1">{action.description}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(action.createdAt).toLocaleDateString()} - {action.category}
                                </p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                action.severity === 'high' ? 'bg-red-200 text-red-800' :
                                action.severity === 'medium' ? 'bg-orange-200 text-orange-800' :
                                'bg-yellow-200 text-yellow-800'
                              }`}>
                                {action.severity.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suspicious Activities */}
                {studentProfileData.suspiciousActivities && studentProfileData.suspiciousActivities.length > 0 && (
                  <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'bg-purple-50'}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-700">
                        <Shield className="w-5 h-5" />
                        Suspicious Activities ({studentProfileData.suspiciousActivities.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {studentProfileData.suspiciousActivities.map((activity: any, index: number) => (
                          <div key={index} className="p-3 rounded-lg border border-purple-300 bg-purple-100">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h6 className="font-medium text-purple-800">{activity.title}</h6>
                                <p className="text-sm text-purple-700 mt-1">{activity.message}</p>
                                <p className="text-xs text-purple-600 mt-2">
                                  {new Date(activity.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-200 text-purple-800">
                                SECURITY ALERT
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No student profile data available</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default HostelInchargeDashboard;