export type SubscriptionBlockReason =
  | 'subscription_required'
  | 'subscription_expired'
  | 'subscription_cancelled'
  | 'subscription_admin_only'

export interface SubscriptionBlockState {
  reason: SubscriptionBlockReason
  message: string
}
