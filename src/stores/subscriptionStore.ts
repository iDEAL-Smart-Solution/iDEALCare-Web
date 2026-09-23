import { create } from 'zustand'
import type { SubscriptionBlockReason, SubscriptionBlockState } from '../types/subscription'

interface SubscriptionState {
  /** null when the tenant subscription is valid and no block is active. */
  blockState: SubscriptionBlockState | null

  /** Called by the Axios response interceptor when a 402 is received. */
  setBlocked: (reason: SubscriptionBlockReason, message: string) => void

  /** Called when the block is resolved (e.g. after a successful renewal). */
  clearBlocked: () => void
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  blockState: null,

  setBlocked(reason, message) {
    set({ blockState: { reason, message } })
  },

  clearBlocked() {
    set({ blockState: null })
  },
}))
