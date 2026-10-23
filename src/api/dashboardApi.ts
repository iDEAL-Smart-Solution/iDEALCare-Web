import apiClient from '../lib/apiClient'
import type { OwnerDashboardSummary, TenantSubscriptionInfo } from '../types/dashboard'

export const dashboardApi = {
  /**
   * Retrieves full executive dashboard metrics for the current tenant from the backend.
   * Calls: GET /api/dashboard/owner
   */
  async getOwnerSummary(): Promise<OwnerDashboardSummary> {
    const { data } = await apiClient.get<OwnerDashboardSummary>('/api/dashboard/owner')
    return data
  },

  /**
   * Retrieves the active subscription information for the current tenant.
   * Calls: GET /api/subscriptions/current
   */
  async getSubscription(): Promise<TenantSubscriptionInfo> {
    const { data } = await apiClient.get<TenantSubscriptionInfo>('/api/subscriptions/current')
    return data
  },

  /**
   * Alias for getOwnerSummary.
   */
  async getLiveDashboardData(): Promise<OwnerDashboardSummary> {
    return this.getOwnerSummary()
  },
}
