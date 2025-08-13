import { type OutingRequest, type HomePermissionRequest } from '@/types';
import { Card, CardContent, CardHeader } from './ui/card';
import { ApprovalStages } from './ApprovalStages';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { QrCode, Calendar, Clock, Download, LogOut, LogIn, Sparkles, Activity, Home, MapPin, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface OutingRequestCardProps {
  request: OutingRequest | HomePermissionRequest;
  showApprovalStages?: boolean;
  isStudent?: boolean;
  requestType?: 'outing' | 'home';
  getOverallStatus?: (request: OutingRequest | HomePermissionRequest) => string;
}

export function OutingRequestCard({ request, showApprovalStages = false, isStudent = false, requestType = 'outing', getOverallStatus }: OutingRequestCardProps) {
  const { theme } = useTheme();
  const [activeQR, setActiveQR] = useState<'outgoing' | 'incoming'>('outgoing');
  
  const isFullyApproved = request.status === 'approved' && request.currentLevel === 'completed';
  
  const requestData = request as any;
  const hasOutgoingQR = requestData.qrCode?.outgoing?.data && !requestData.qrCode?.outgoing?.isExpired;
  const hasIncomingQR = requestData.qrCode?.incoming?.data && !requestData.qrCode?.incoming?.isExpired;
  const outgoingExpired = requestData.qrCode?.outgoing?.isExpired;
  
  const hasAnyQR = hasOutgoingQR || hasIncomingQR;
  
  // Type guards and utility functions
  const isHomePermission = (req: OutingRequest | HomePermissionRequest): req is HomePermissionRequest => {
    return requestType === 'home' || 'goingDate' in req || 'homeTownName' in req;
  };
  
  const getRequestIcon = () => {
    return requestType === 'home' ? Home : Activity;
  };
  
  const getRequestTitle = () => {
    return requestType === 'home' ? 'Home Permission' : 'Outing Request';
  };
  
  const getDateInfo = () => {
    if (isHomePermission(request)) {
      const homeReq = request as HomePermissionRequest;
      const goingDate = homeReq.goingDate ? new Date(homeReq.goingDate).toLocaleDateString() : 'N/A';
      const incomingDate = homeReq.incomingDate ? new Date(homeReq.incomingDate).toLocaleDateString() : 'N/A';
      return {
        label: 'Travel Dates',
        value: `${goingDate} - ${incomingDate}`
      };
    } else {
      const outingReq = request as OutingRequest;
      const dateToUse = outingReq.outingDate || (request as any).date || request.createdAt || new Date();
      return {
        label: 'Outing Date',
        value: new Date(dateToUse).toLocaleDateString()
      };
    }
  };
  
  const getTimingInfo = () => {
    if (isHomePermission(request)) {
      const homeReq = request as HomePermissionRequest;
      const goingDate = homeReq.goingDate ? new Date(homeReq.goingDate).toLocaleDateString() : 'N/A';
      const incomingDate = homeReq.incomingDate ? new Date(homeReq.incomingDate).toLocaleDateString() : 'N/A';
      return {
        out: `Going: ${goingDate}`,
        in: `Return: ${incomingDate}`
      };
    } else {
      const outingReq = request as OutingRequest;
      const outTime = (outingReq as any).outTime || outingReq.outingTime || 'N/A';
      const inTime = (outingReq as any).inTime || outingReq.returnTime || 'N/A';
      return {
        out: `Out: ${outTime}`,
        in: `In: ${inTime}`
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg';
      case 'denied':
        return 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg';
    }
  };

  return (
    <Card className={`w-full hover:scale-[1.02] transition-all duration-500 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-800/90 to-gray-700/90 border-gray-600/50 shadow-xl hover:shadow-blue-500/20' 
        : 'bg-gradient-to-br from-white/90 to-gray-50/90 border-gray-200/50 shadow-xl hover:shadow-blue-500/20'
    } backdrop-blur-sm border`}>
      <CardHeader className="pb-2 md:pb-3 border-b border-gray-200/50 dark:border-gray-700/50">
        {/* Mobile Layout */}
        <div className="block md:hidden space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 md:p-2 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-blue-100 border border-blue-200'
              }`}>
                {(() => {
                  const IconComponent = getRequestIcon();
                  return <IconComponent className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />;
                })()}
              </div>
              <h3 className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {getRequestTitle()}
              </h3>
            </div>
            <Badge className={`px-2 py-1 rounded-full font-semibold text-xs ${getStatusColor(request.status || 'pending')}`}>
              {getOverallStatus ? getOverallStatus(request) : (request.status || 'pending')}
            </Badge>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ID: {(request.id || (request as any)._id || 'Unknown').toString().slice(-8)}
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {getDateInfo().value}
            </span>
          </div>
          
          {(request as any).category === 'emergency' && (
            <Badge className="px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold flex items-center gap-1 w-fit">
              <AlertTriangle className="w-3 h-3" />
              EMERGENCY
            </Badge>
          )}
          
          {isHomePermission(request) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                {(request as HomePermissionRequest).homeTownName || 'N/A'}
              </span>
            </div>
          )}
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-blue-100 border border-blue-200'
              }`}>
                {(() => {
                  const IconComponent = getRequestIcon();
                  return <IconComponent className="w-4 h-4 text-blue-600" />;
                })()}
              </div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {getRequestTitle()} ID: {(request.id || (request as any)._id || 'Unknown').toString().slice(-8)}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {getDateInfo().value}
              </span>
              {(request as any).category === 'emergency' && (
                <Badge className="ml-2 px-2 py-1 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  EMERGENCY
                </Badge>
              )}
            </div>
            {isHomePermission(request) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {(request as HomePermissionRequest).homeTownName || 'N/A'}
                </span>
              </div>
            )}
          </div>
          <Badge className={`px-3 py-1 rounded-full font-semibold ${getStatusColor(request.status || 'pending')}`}>
            {getOverallStatus ? getOverallStatus(request) : (request.status || 'pending')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 md:space-y-6 p-3 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 text-sm">
          <div className={`p-3 md:p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-gray-700/50 border border-gray-600/50' 
              : 'bg-gray-50/80 border border-gray-200/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded ${
                theme === 'dark' 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-blue-100 border border-blue-200'
              }`}>
                <Clock className="w-3 h-3 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Timing</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                <span className="text-blue-600 dark:text-blue-400">{getTimingInfo().out}</span>
              </p>
              <p className="font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">
                <span className="text-green-600 dark:text-green-400">{getTimingInfo().in}</span>
              </p>
            </div>
          </div>
          <div className={`p-3 md:p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-gray-700/50 border border-gray-600/50' 
              : 'bg-gray-50/80 border border-gray-200/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded ${
                theme === 'dark' 
                  ? 'bg-purple-500/20 border border-purple-500/30' 
                  : 'bg-purple-100 border border-purple-200'
              }`}>
                <Sparkles className="w-3 h-3 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Purpose</span>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xs md:text-sm break-words">{(request as any).purpose}</p>
          </div>
        </div>

        {showApprovalStages && (
          <div className={`p-3 md:p-4 rounded-xl ${
            theme === 'dark' 
              ? 'bg-gray-700/50 border border-gray-600/50' 
              : 'bg-gray-50/80 border border-gray-200/50'
          }`}>
            <ApprovalStages
              currentLevel={request.currentLevel}
              floorInchargeApproval={request.floorInchargeApproval}
              hostelInchargeApproval={request.hostelInchargeApproval}
              wardenApproval={request.wardenApproval}
            />
          </div>
        )}

        {hasAnyQR && (
          <div className={`mt-3 md:mt-4 p-3 md:p-6 rounded-xl border backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-green-900/20 border-green-500/30' 
              : 'bg-green-50/80 border-green-200/50'
          } shadow-lg`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3 md:mb-4">
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`p-1.5 md:p-2 rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : 'bg-green-100 border border-green-200'
                }`}>
                  <QrCode className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <span className="font-bold text-green-700 dark:text-green-400 text-base md:text-lg">
                  QR Codes
                  {(request as any).category === 'emergency' && (
                    <Badge className="ml-2 px-2 py-1 bg-red-500/90 text-white text-xs font-bold">
                      EMERGENCY
                    </Badge>
                  )}
                </span>
              </div>
              {(hasOutgoingQR || hasIncomingQR) && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {hasOutgoingQR && (
                    <Button
                      size="sm"
                      variant={activeQR === 'outgoing' ? 'default' : 'outline'}
                      onClick={() => setActiveQR('outgoing')}
                      className={`h-8 px-3 md:px-4 text-xs font-semibold transition-all duration-300 hover:scale-105 w-full sm:w-auto ${
                        activeQR === 'outgoing' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700' 
                          : ''
                      }`}
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Exit
                    </Button>
                  )}
                  {hasIncomingQR && (
                    <Button
                      size="sm"
                      variant={activeQR === 'incoming' ? 'default' : 'outline'}
                      onClick={() => setActiveQR('incoming')}
                      className={`h-8 px-3 md:px-4 text-xs font-semibold transition-all duration-300 hover:scale-105 w-full sm:w-auto ${
                        activeQR === 'incoming' 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                          : ''
                      }`}
                    >
                      <LogIn className="w-3 h-3 mr-1" />
                      Entry
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            {/* Outgoing QR Code */}
            {activeQR === 'outgoing' && hasOutgoingQR && (
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-center">
                  <div className={`p-3 md:p-4 rounded-xl ${
                    theme === 'dark' 
                      ? 'bg-white/10 border border-white/20' 
                      : 'bg-white border border-gray-200'
                  } shadow-xl`}>
                    <img 
                      src={requestData.qrCode.outgoing.data} 
                      alt="Exit QR Code" 
                      className="w-32 h-32 md:w-40 md:h-40 rounded-lg"
                    />
                  </div>
                </div>
                <div className="text-center space-y-1 md:space-y-2">
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    Exit QR Code
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Show this QR code to exit the hostel
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Generated: {new Date(requestData.qrCode.outgoing.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Incoming QR Code */}
            {activeQR === 'incoming' && hasIncomingQR && (
              <div className="space-y-3 md:space-y-4">
                <div className="flex justify-center">
                  <div className={`p-3 md:p-4 rounded-xl ${
                    theme === 'dark' 
                      ? 'bg-white/10 border border-white/20' 
                      : 'bg-white border border-gray-200'
                  } shadow-xl`}>
                    <img 
                      src={requestData.qrCode.incoming.data} 
                      alt="Entry QR Code" 
                      className="w-32 h-32 md:w-40 md:h-40 rounded-lg"
                    />
                  </div>
                </div>
                <div className="text-center space-y-1 md:space-y-2">
                  <p className="text-sm font-bold text-green-700 dark:text-green-400">
                    Entry QR Code
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Show this QR code to enter the hostel
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Generated: {new Date(requestData.qrCode.incoming.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Status Messages */}
            {outgoingExpired && !hasIncomingQR && (
              <div className="text-center p-2 md:p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">
                  Exit QR used. Return QR will be available 30 minutes before return time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Waiting for QR generation */}
        {isFullyApproved && !hasAnyQR && (
          <div className={`mt-4 p-6 rounded-xl border backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-blue-900/20 border-blue-500/30' 
              : 'bg-blue-50/80 border-blue-200/50'
          } shadow-lg`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-blue-100 border border-blue-200'
              }`}>
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-400 text-lg">
                The {getRequestTitle()} has been Completed....Thank you!
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}