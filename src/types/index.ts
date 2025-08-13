// Existing types
export interface BaseRequest {
  id: string;
  studentId: string;
  status: 'pending' | 'approved' | 'denied' | 'completed' | 'late-return';
  outingDate: string;
  returnDate: string;
  outingTime: string;
  returnTime: string;
  createdAt: string;
  updatedAt: string;
}

// New types for approval stages
export type ApprovalLevel = 'floor-incharge' | 'hostel-incharge' | 'warden' | 'completed';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';

export interface OutingRequest extends BaseRequest {
  // Existing fields
  currentLevel: ApprovalLevel;
  floorInchargeApproval: ApprovalStatus;
  hostelInchargeApproval: ApprovalStatus;
  wardenApproval: ApprovalStatus;
  category?: 'normal' | 'emergency';
  qrCode?: {
    outgoing?: {
      data?: string;
      isExpired?: boolean;
      scannedAt?: string;
      validUntil?: string;
    };
    incoming?: {
      data?: string;
      isExpired?: boolean;
      scannedAt?: string;
      validUntil?: string;
    };
  };
}

// Home Permission Request interface
export interface HomePermissionRequest {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  hostelBlock: string;
  floor: string;
  roomNumber: string;
  goingDate: string;
  incomingDate: string;
  homeTownName: string;
  purpose: string;
  status: 'pending' | 'approved' | 'denied' | 'completed';
  currentLevel: ApprovalLevel;
  floorInchargeApproval: ApprovalStatus;
  hostelInchargeApproval: ApprovalStatus;
  wardenApproval: ApprovalStatus;
  parentPhoneNumber: string;
  createdAt: string;
  approvalFlow: Array<{
    level: string;
    status: string;
    timestamp: string;
    remarks?: string;
    approvedBy: string;
    approverInfo: {
      email: string;
      role: string;
    };
  }>;
  qrCode?: {
    outgoing?: {
      data?: string;
      isExpired?: boolean;
      scannedAt?: string;
      validUntil?: string;
    };
    incoming?: {
      data?: string;
      isExpired?: boolean;
      scannedAt?: string;
      validUntil?: string;
    };
  };
}