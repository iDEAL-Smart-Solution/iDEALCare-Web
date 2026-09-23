import { beforeEach, describe, expect, it } from 'vitest'
import { useSubscriptionStore } from '../stores/subscriptionStore'

beforeEach(() => {
  useSubscriptionStore.setState({ blockState: null })
})

describe('subscriptionStore', () => {
  describe('setBlocked', () => {
    it('sets blockState with the provided reason and message', () => {
      useSubscriptionStore.getState().setBlocked('subscription_required', 'No active plan.')

      const { blockState } = useSubscriptionStore.getState()
      expect(blockState).not.toBeNull()
      expect(blockState?.reason).toBe('subscription_required')
      expect(blockState?.message).toBe('No active plan.')
    })

    it('overwrites a previous block with a new one', () => {
      useSubscriptionStore.getState().setBlocked('subscription_expired', 'Expired.')
      useSubscriptionStore.getState().setBlocked('subscription_admin_only', 'Ask admin.')

      const { blockState } = useSubscriptionStore.getState()
      expect(blockState?.reason).toBe('subscription_admin_only')
      expect(blockState?.message).toBe('Ask admin.')
    })

    it('accepts all four reason codes without type errors', () => {
      const reasons = [
        'subscription_required',
        'subscription_expired',
        'subscription_cancelled',
        'subscription_admin_only',
      ] as const

      for (const reason of reasons) {
        useSubscriptionStore.getState().setBlocked(reason, '')
        expect(useSubscriptionStore.getState().blockState?.reason).toBe(reason)
      }
    })
  })

  describe('clearBlocked', () => {
    it('sets blockState back to null', () => {
      useSubscriptionStore.getState().setBlocked('subscription_cancelled', 'Cancelled.')
      useSubscriptionStore.getState().clearBlocked()

      expect(useSubscriptionStore.getState().blockState).toBeNull()
    })

    it('is a no-op when blockState is already null', () => {
      expect(() => useSubscriptionStore.getState().clearBlocked()).not.toThrow()
      expect(useSubscriptionStore.getState().blockState).toBeNull()
    })
  })
})
