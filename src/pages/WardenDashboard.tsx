import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, Building, PieChart, Users, Calendar, Download, Home, PlusCircle, ToggleLeft, ToggleRight, Eye } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import axiosInstance from "@/lib/axios";
import { toast } from "react-toastify";
import { ApprovedStudentsList } from "@/components/ApprovedStudentsList";
import type { HomePermissionRequest } from "@/types";

const WardenDashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Toggle state for request types
  const [requestType, setRequestType] = useState<'outing' | 'home'>('outing');
  
  // Outing data
  const [outingDashboardData, setOutingDashboardData] = useState({
    totalHostels: 0,
    totalStudents: 0,
    outingsToday: 0,
    approvalRate: 0,
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0
    }
  });
  
  // Home permission data
  const [homePermissionDashboardData, setHomePermissionDashboardData] = useState({
    totalHostels: 0,
    totalStudents: 0,
    requestsToday: 0,
    approvalRate: 0,
    requests: [],
    stats: {
      pending: 0,
      approved: 0,
      denied: 0
    }
  });
  
  // Current data based on toggle
  const dashboardData = requestType === 'outing' ? outingDashboardData : homePermissionDashboardData;
  
  const [approvedStudents, setApprovedStudents] = useState([]);
  const [isApprovedModalOpen, setIsApprovedModalOpen] = useState(false);
  
  // View details modal state
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const fetchOutingDashboardData = async () => {
    try {
      // First verify auth
      await axiosInstance.get('/auth/verify');
      
      const response = await axiosInstance.get('/outings/dashboard/warden');
      if (response.data.success) {
        setOutingDashboardData(response.data.data);
      } else {
        setError('Failed to fetch outing dashboard data');
      }
    } catch (error: any) {
      console.error('Outing dashboard fetch error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const fetchHomePermissionDashboardData = async () => {
    try {
      const response = await axiosInstance.get('/home-permissions/dashboard/warden');
      if (response.data.success) {
        const data = response.data.data;
        
        // Map requests to include proper field names
        const mappedRequests = data.requests?.map((req: any) => ({
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
          approvalFlow: req.approvalFlow || []
        })) || [];

        setHomePermissionDashboardData({
          ...data,
          requests: mappedRequests,
          requestsToday: data.outingsToday || 0 // Map outingsToday field
        });
      } else {
        setError('Failed to fetch home permission dashboard data');
      }
    } catch (error: any) {
      console.error('Home permission dashboard fetch error:', error);
      if (!outingDashboardData.requests.length) {
        // Only redirect if we have no data at all
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      }
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchOutingDashboardData(),
        fetchHomePermissionDashboardData()
      ]);
    } catch (error: any) {
      console.error('General dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedStudents = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-students/warden');
      if (response.data.success) {
        setApprovedStudents(response.data.students);
      }
    } catch (error: any) {
      console.error('Error fetching approved students:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || 'Failed to fetch approved students');
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    fetchDashboardData();
    fetchApprovedStudents();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [navigate]);

  const handleApprove = async (requestId: string) => {
    try {
      let response;
      if (requestType === 'outing') {
        response = await axiosInstance.patch(`/outings/warden/approve/${requestId}`);
      } else {
        // For home permissions, use the approval endpoint
        const approvalEntry = {
          level: 3, // Warden level
          status: 'approved',
          timestamp: new Date().toISOString(),
          approvedBy: 'warden@example.com', // Replace with actual warden email if available
          remarks: '',
          approverInfo: {
            email: 'warden@example.com',
            role: 'Warden'
          }
        };

        response = await axiosInstance.post(`/home-permissions/${requestId}/approve`, {
          approvalFlow: [approvalEntry],
          level: 3,
          status: 'approved'
        });
      }

      if (response.data.success) {
        toast.success(`${requestType === 'outing' ? 'Outing' : 'Home permission'} request approved successfully`);
        await fetchDashboardData();
        await fetchApprovedStudents();
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Approval error:', { error, requestId, requestType });
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(error.response?.data?.message || `Failed to approve ${requestType === 'outing' ? 'outing' : 'home permission'} request`);
      }
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      let response;
      if (requestType === 'outing') {
        response = await axiosInstance.post(`/outings/warden/deny/${requestId}`);
      } else {
        response = await axiosInstance.post(`/home-permissions/${requestId}/deny`, {
          remarks: 'Denied by Warden'
        });
      }

      if (response.data.success) {
        toast.success(`${requestType === 'outing' ? 'Outing' : 'Home permission'} request denied successfully`);
        await fetchDashboardData();
      }
    } catch (error: any) {
      console.error('Denial error:', error);
      toast.error(error.response?.data?.message || `Failed to deny ${requestType === 'outing' ? 'outing' : 'home permission'} request`);
    }
  };

  const handleViewDetails = (request: any) => {
    setSelectedRequest(request);
    setIsViewModalOpen(true);
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axiosInstance.get('/outings/approved-requests/pdf', {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `approved-requests-${new Date().toISOString()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error('Failed to download PDF report');
    }
  };

  return (
    <DashboardLayout>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <div className="space-y-4 md:space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl md:text-3xl font-semibold truncate">Warden Dashboard</h2>
              <p className={`mt-1 text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Manage {requestType === 'outing' ? 'outing' : 'home permission'} requests and oversight
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              {/* Request Type Toggle */}
              <div className={`relative flex items-center p-1 rounded-full border-2 ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-600' 
                  : 'bg-gray-100 border-gray-300'
              } shadow-lg`}>
                {/* Background slider */}
                <div className={`absolute top-1 bottom-1 w-1/2 rounded-full transition-all duration-300 ease-in-out ${
                  theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                } ${requestType === 'home' ? 'translate-x-full' : 'translate-x-0'}`} />
                
                {/* Outing Button */}
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
                
                {/* Home Button */}
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
              
              <Button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 w-full sm:w-auto justify-center"
                size="sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm">Download Report</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-full`}>
                  <Building className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`} />
                </div>
                <div className="text-center sm:text-left">
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Hostels</p>
                  <p className="text-lg md:text-2xl font-semibold">{dashboardData.totalHostels}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'} rounded-full`}>
                  <Users className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-indigo-500' : 'text-indigo-600'}`} />
                </div>
                <div className="text-center sm:text-left">
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Total Students</p>
                  <p className="text-lg md:text-2xl font-semibold">{dashboardData.totalStudents}</p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100'} rounded-full`}>
                  <Calendar className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'}`} />
                </div>
                <div className="text-center sm:text-left">
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {requestType === 'outing' ? 'Outings Today' : 'Requests Today'}
                  </p>
                  <p className="text-lg md:text-2xl font-semibold">
                    {requestType === 'outing' ? dashboardData.outingsToday : dashboardData.requestsToday}
                  </p>
                </div>
              </div>
            </Card>
            <Card className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
                <div className={`p-2 md:p-3 ${theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'} rounded-full`}>
                  <PieChart className={`w-4 h-4 md:w-6 md:h-6 ${theme === 'dark' ? 'text-green-500' : 'text-green-600'}`} />
                </div>
                <div className="text-center sm:text-left">
                  <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Approval Rate</p>
                  <p className="text-lg md:text-2xl font-semibold">{dashboardData.approvalRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>Pending Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center">{dashboardData.stats.pending}</p>
              </CardContent>
            </Card>
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Approved Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center text-green-500">{dashboardData.stats.approved}</p>
              </CardContent>
            </Card>
            <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>Denied Requests</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-center text-red-500">{dashboardData.stats.denied}</p>
              </CardContent>
            </Card>
          </div>

          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader>
              <CardTitle>All Campus {requestType === 'outing' ? 'Outing' : 'Home Permission'} Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-3">Student</th>
                      <th className="text-left py-3">Hostel</th>
                      <th className="text-left py-3">Floor</th>
                      {requestType === 'outing' ? (
                        <>
                          <th className="text-left py-3">Date</th>
                          <th className="text-left py-3">Time</th>
                        </>
                      ) : (
                        <>
                          <th className="text-left py-3">Going Date</th>
                          <th className="text-left py-3">Return Date</th>
                          <th className="text-left py-3">Home Town</th>
                        </>
                      )}
                      <th className="text-left py-3">Purpose</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-right py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.requests?.length === 0 ? (
                      <tr>
                        <td colSpan={requestType === 'outing' ? 8 : 9} className="py-8 text-center text-gray-500">
                          No requests found
                        </td>
                      </tr>
                    ) : (
                      dashboardData.requests?.map((request: any) => (
                      <tr key={request._id || request.id || 'unknown'} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-3">{requestType === 'outing' ? (request.studentId?.name || 'N/A') : (request.studentName || 'N/A')}</td>
                        <td className="py-3">{requestType === 'outing' ? (request.studentId?.hostelBlock || 'N/A') : (request.hostelBlock || 'N/A')}</td>
                        <td className="py-3">{requestType === 'outing' ? (request.studentId?.floor || 'N/A') : (request.floor || 'N/A')}</td>
                        {requestType === 'outing' ? (
                          <>
                            <td className="py-3">{request.outingDate ? new Date(request.outingDate).toLocaleDateString() : 'N/A'}</td>
                            <td className="py-3">{request.outingTime || 'N/A'} - {request.returnTime || 'N/A'}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-3">{request.goingDate ? new Date(request.goingDate).toLocaleDateString() : 'N/A'}</td>
                            <td className="py-3">{request.incomingDate ? new Date(request.incomingDate).toLocaleDateString() : 'N/A'}</td>
                            <td className="py-3">{request.homeTownName || 'N/A'}</td>
                          </>
                        )}
                        <td className="py-3 max-w-xs truncate">{request.purpose || 'N/A'}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            request.currentLevel === 'warden' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.currentLevel === 'warden' ? 'Pending Approval' : request.status}
                          </span>
                        </td>
                        <td className="text-right py-3">
                          {request.currentLevel === 'warden' && (
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={theme === 'dark' ? 'border-gray-700 hover:bg-gray-700' : ''}
                                onClick={() => handleViewDetails(request)}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprove(request._id || request.id)}
                                className="bg-green-50 hover:bg-green-100 text-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeny(request._id || request.id)}
                                className="bg-red-50 hover:bg-red-100 text-red-700"
                              >
                                Deny
                              </Button>
                            </div>
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

          <Card className={`${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'}`}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Approved Outing Students</CardTitle>
              <Button
                variant="outline"
                onClick={() => setIsApprovedModalOpen(true)}
              >
                View All
              </Button>
            </CardHeader>
          </Card>

          <ApprovedStudentsList
            isOpen={isApprovedModalOpen}
            onClose={() => setIsApprovedModalOpen(false)}
            students={approvedStudents}
            onDownloadPDF={handleDownloadPDF}
          />

          {/* View Details Modal */}
          {isViewModalOpen && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className={`max-w-2xl w-full mx-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-h-[90vh] overflow-y-auto`}>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Request Details</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsViewModalOpen(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Student Name</label>
                        <p className="text-sm">
                          {requestType === 'outing' 
                            ? selectedRequest.studentId?.name || 'N/A'
                            : selectedRequest.studentName || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Roll Number</label>
                        <p className="text-sm">
                          {requestType === 'outing'
                            ? selectedRequest.studentId?.rollNumber || 'N/A'
                            : selectedRequest.rollNumber || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Hostel Block</label>
                        <p className="text-sm">
                          {requestType === 'outing'
                            ? selectedRequest.studentId?.hostelBlock || 'N/A'
                            : selectedRequest.hostelBlock || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Floor</label>
                        <p className="text-sm">
                          {requestType === 'outing'
                            ? selectedRequest.studentId?.floor || 'N/A'
                            : selectedRequest.floor || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Room Number</label>
                        <p className="text-sm">
                          {requestType === 'outing'
                            ? selectedRequest.studentId?.roomNumber || 'N/A'
                            : selectedRequest.roomNumber || 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact</label>
                        <p className="text-sm">
                          {requestType === 'outing'
                            ? selectedRequest.studentId?.phoneNumber || 'N/A'
                            : selectedRequest.studentId?.phoneNumber || 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {requestType === 'outing' ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Outing Date</label>
                            <p className="text-sm">
                              {selectedRequest.outingDate 
                                ? new Date(selectedRequest.outingDate).toLocaleDateString() 
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Time</label>
                            <p className="text-sm">
                              {selectedRequest.outingTime || 'N/A'} - {selectedRequest.returnTime || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Going Date</label>
                            <p className="text-sm">
                              {selectedRequest.goingDate 
                                ? new Date(selectedRequest.goingDate).toLocaleDateString() 
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Return Date</label>
                            <p className="text-sm">
                              {selectedRequest.incomingDate 
                                ? new Date(selectedRequest.incomingDate).toLocaleDateString() 
                                : 'N/A'
                              }
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Home Town</label>
                            <p className="text-sm">{selectedRequest.homeTownName || 'N/A'}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Purpose</label>
                      <p className="text-sm">{selectedRequest.purpose || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          selectedRequest.currentLevel === 'warden' ? 'bg-yellow-100 text-yellow-800' :
                          selectedRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {selectedRequest.currentLevel === 'warden' ? 'Pending Approval' : selectedRequest.status}
                        </span>
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created At</label>
                      <p className="text-sm">
                        {new Date(selectedRequest.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setIsViewModalOpen(false)}
                    >
                      Close
                    </Button>
                    {selectedRequest.currentLevel === 'warden' && (
                      <>
                        <Button
                          onClick={() => handleApprove(selectedRequest._id || selectedRequest.id)}
                          className="bg-green-50 hover:bg-green-100 text-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleDeny(selectedRequest._id || selectedRequest.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700"
                        >
                          Deny
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default WardenDashboard;
