export interface ClinicInfo {
  tenantId: string
  tenantName: string
  domain: string
  contactEmail?: string
  contactPhone?: string
}

export interface BedOccupancy {
  occupied: number
  total: number
  available: number
  maintenance: number
  occupancyRate: number // 0-100%
}

export interface ClinicalMetrics {
  totalRegisteredPatients: number
  activeInpatients: number
  pendingAdmissions: number
  dischargesThisWeek: number
  nursesOnDuty: number
  totalCareStaff: number
  bedOccupancy: BedOccupancy
}

export interface FinancialMetrics {
  currency: string
  monthlyRevenue: number
  revenueGrowthPercentage: number
  outstandingBalances: number
  todayCollections: number
  pendingInvoicesCount: number
  collectionRatePercentage: number
}

export type SubscriptionStatus = 'Active' | 'PendingPayment' | 'Expired' | 'Suspended' | 'Cancelled'

export interface TenantSubscriptionInfo {
  id?: string
  planId?: string
  planName: string
  planDescription?: string | null
  billingFrequency: 'Monthly' | 'Yearly' | string
  status: SubscriptionStatus | string
  currentPeriodStart: string
  currentPeriodEnd: string
  daysRemaining: number
  amount: number
  currency?: string
  isAutoRenew: boolean
}

export interface RecentAdmission {
  id: string
  patientId: string
  patientName: string
  roomBed: string
  admittedAt: string
  primaryNurse: string
  status: 'Admitted' | 'Critical' | 'Stable' | 'PendingReview'
}

export interface OperationalAlert {
  id: string
  type: 'urgent' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  actionUrl?: string
}

export interface OwnerDashboardSummary {
  clinicInfo: ClinicInfo
  clinicalMetrics: ClinicalMetrics
  financialMetrics: FinancialMetrics
  subscription: TenantSubscriptionInfo
  recentAdmissions: RecentAdmission[]
  alerts: OperationalAlert[]
}
