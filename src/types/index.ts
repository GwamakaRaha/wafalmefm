export type StaffRole =
  | 'Super Admin'
  | 'Admin'
  | 'Sales Agent'
  | 'Accountant'
  | 'Traffic / Programming Manager'
  | 'Presenter / Operator';

export interface StaffPermission {
  canManageStaff: boolean;
  canManageClients: boolean;
  canCreateCampaigns: boolean;
  canApproveCampaigns: boolean;
  canRecordPayments: boolean;
  canManageBroadcastSchedules: boolean;
  canLogBroadcasts: boolean;
  canSendSms: boolean;
  canManageExpenses: boolean;
  canViewReports: boolean;
  canViewAuditLogs: boolean;
  canManageSettings: boolean;
}

export interface StaffMember {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  department: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface ClientContactLog {
  id: string;
  date: string;
  type: 'Phone Call' | 'Email' | 'Physical Meeting' | 'WhatsApp' | 'Proposal Sent';
  summary: string;
  staffName: string;
}

export interface Client {
  id: string;
  clientCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  tinNumber?: string;
  vrnNumber?: string;
  industry?: string;
  assignedSalesAgentId?: string;
  assignedSalesAgentName?: string;
  status: 'active' | 'inactive' | 'prospect';
  notes?: string;
  contactHistory?: ClientContactLog[];
  createdAt: string;
  updatedAt?: string;
}

export interface AdvertisingPackage {
  id: string;
  name: string;
  description: string;
  priceTZS: number;
  spotCount: number;
  durationSeconds: number;
  timeSlot: string; // e.g., 'Morning Prime (06:00 - 10:00)'
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'paused';

export interface Campaign {
  id: string;
  campaignCode: string;
  clientId: string;
  clientName: string;
  title: string;
  packageId?: string;
  packageName?: string;
  salesAgentId: string;
  salesAgentName?: string;
  startDate: string;
  endDate: string;
  totalSpotsBooked: number;
  totalSpotsAired: number;
  totalAmountTZS: number;
  paidAmountTZS: number;
  status: CampaignStatus;
  audioCreativeUrl?: string;
  scriptNotes?: string;
  quotationNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod =
  | 'Bank Transfer'
  | 'Cheque'
  | 'M-Pesa'
  | 'Tigo Pesa'
  | 'Airtel Money'
  | 'Cash';

export interface Payment {
  id: string;
  receiptNumber: string;
  campaignId: string;
  campaignTitle?: string;
  clientId: string;
  clientName?: string;
  amountTZS: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  recordedByUid: string;
  recordedByName?: string;
  paymentDate: string;
  status: 'verified' | 'pending_clearance' | 'rejected';
  notes?: string;
  createdAt: string;
}

export interface Advertisement {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  title: string;
  audioUrl?: string;
  durationSeconds: number;
  language: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedByUid?: string;
  notes?: string;
  createdAt: string;
}

export interface BroadcastSchedule {
  id: string;
  campaignId: string;
  campaignTitle?: string;
  clientName?: string;
  advertisementId?: string;
  advertisementTitle?: string;
  scheduledTime: string;
  showName: string;
  timeSlot: string;
  status: 'scheduled' | 'aired' | 'missed' | 'cancelled';
  assignedPresenterUid?: string;
  assignedPresenterName?: string;
  createdAt: string;
}

export interface BroadcastLog {
  id: string;
  scheduleId?: string;
  campaignId: string;
  campaignTitle?: string;
  clientName?: string;
  airedAt: string;
  presenterUid: string;
  presenterName: string;
  verified: boolean;
  transmissionNotes?: string;
  createdAt: string;
}

export interface SmsLog {
  id: string;
  clientId?: string;
  clientName?: string;
  recipientPhone: string;
  messageBody: string;
  templateType: 'broadcast_confirmation' | 'payment_receipt' | 'campaign_expiry' | 'custom';
  dispatchStatus: 'queued' | 'sent' | 'delivered' | 'failed';
  dispatchedAt?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amountTZS: number;
  expenseDate: string;
  approvedByUid?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  performedByUid: string;
  performedByEmail: string;
  action: string;
  targetCollection: string;
  targetDocumentId?: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  stationName: string;
  tagline: string;
  frequencies: string;
  currency: string;
  timezone: string;
  vatRatePercentage: number;
  swahiliSmsEnabled: boolean;
  darEsSalaamOffice: string;
  phoneContact: string;
  emailContact: string;
  updatedAt: string;
}

export type PageId =
  | 'dashboard'
  | 'clients'
  | 'client_details'
  | 'campaigns'
  | 'campaign_details'
  | 'packages'
  | 'payments'
  | 'broadcast_calendar'
  | 'broadcast_management'
  | 'sms_management'
  | 'expenses'
  | 'reports'
  | 'staff_management'
  | 'audit_logs'
  | 'system_settings';
