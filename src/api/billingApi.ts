import apiClient from '../lib/apiClient'

export interface BillingInvoice {
  id: string
  patientId: string
  invoiceType: number
  status: number
  totalAmount: number
  amountPaid: number
  outstandingAmount: number
  requiredDeposit?: number | null
  isRefundable: boolean
  carePeriodStart?: string | null
  carePeriodEnd?: string | null
  paymentDeadline?: string | null
  notes?: string | null
  originalInvoiceId?: string | null
  createdAt: string
  items?: { id: string; itemType: number; description: string; amount: number }[]
}

export interface BillingMedicalItem {
  id: string
  patientId: string
  name: string
  description?: string | null
  price: number
  status: number
  createdAt: string
}

export const billingApi = {
  async listInvoices(patientId: string) {
    const response = await apiClient.get<BillingInvoice[]>(`/api/billing/patients/${patientId}/invoices`)
    return response.data
  },

  async listMedicalItems(patientId: string) {
    const response = await apiClient.get<BillingMedicalItem[]>(`/api/billing/patients/${patientId}/medical-items`)
    return response.data
  },

  async createNursingCareBill(patientId: string, request: {
    patientId: string; totalAmount: number; requiredDeposit?: number; carePeriodStart?: string
    carePeriodEnd?: string; paymentDeadline?: string; notes?: string
  }) {
    const response = await apiClient.post<BillingInvoice>(`/api/billing/patients/${patientId}/invoices`, request)
    return response.data
  },

  async createExtension(patientId: string, originalInvoiceId: string, request: {
    originalInvoiceId: string; totalAmount: number; requiredDeposit?: number
    extensionPeriodStart: string; extensionPeriodEnd: string; paymentDeadline?: string; notes?: string
  }) {
    const response = await apiClient.post<BillingInvoice>(`/api/billing/patients/${patientId}/invoices/${originalInvoiceId}/extensions`, request)
    return response.data
  },

  async createMedicalItem(patientId: string, request: { patientId: string; name: string; description?: string; price: number }) {
    const response = await apiClient.post<BillingMedicalItem>(`/api/billing/patients/${patientId}/medical-items`, request)
    return response.data
  },
}
