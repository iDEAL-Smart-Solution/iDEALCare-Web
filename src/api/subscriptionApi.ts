import apiClient from '../lib/apiClient'
import type { TenantSubscriptionInfo } from '../types/dashboard'

export interface SubscriptionPlanDto {
  id: string
  name: string
  description?: string | null
  billingFrequency: string
  billingFrequencyCode: number
  price: number
  currency: string
  isActive: boolean
}

export interface InitializeSubscriptionPaymentRequest {
  planId?: string
  callbackUrl?: string
}

export interface InitializeSubscriptionPaymentResponse {
  reference: string
  authorizationUrl: string
  accessCode: string
  amount: number
  currency: string
  planId: string
  planName: string
}

export const subscriptionApi = {
  /**
   * Retrieves current active or pending tenant subscription details.
   * Calls: GET /api/subscriptions/current
   */
  async getCurrentSubscription(): Promise<TenantSubscriptionInfo> {
    const { data } = await apiClient.get<TenantSubscriptionInfo>('/api/subscriptions/current')
    return data
  },

  /**
   * Retrieves available SaaS subscription tiers from backend.
   * Calls: GET /api/subscriptions/plans
   */
  async getPlans(): Promise<SubscriptionPlanDto[]> {
    const { data } = await apiClient.get<SubscriptionPlanDto[]>('/api/subscriptions/plans')
    return data
  },

  /**
   * Initializes a subscription payment checkout via Paystack.
   * Calls: POST /api/subscriptions/initialize
   */
  async initializePayment(request: InitializeSubscriptionPaymentRequest): Promise<InitializeSubscriptionPaymentResponse> {
    const { data } = await apiClient.post<InitializeSubscriptionPaymentResponse>('/api/subscriptions/initialize', request)
    return data
  },

  /**
   * Verifies a Paystack payment reference and activates the subscription.
   * Calls: POST /api/subscriptions/verify/:reference
   */
  async verifyPayment(reference: string): Promise<TenantSubscriptionInfo> {
    const { data } = await apiClient.post<TenantSubscriptionInfo>(`/api/subscriptions/verify/${encodeURIComponent(reference)}`)
    return data
  },
}
