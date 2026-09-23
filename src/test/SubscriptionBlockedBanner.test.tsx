import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import SubscriptionBlockedBanner from '../components/SubscriptionBlockedBanner'
import { useSubscriptionStore } from '../stores/subscriptionStore'
import type { SubscriptionBlockReason } from '../types/subscription'

beforeEach(() => {
  useSubscriptionStore.setState({ blockState: null })
})

// ── Renders nothing when not blocked ─────────────────────────────────────────

describe('SubscriptionBlockedBanner — no block', () => {
  it('renders nothing when blockState is null', () => {
    const { container } = render(<SubscriptionBlockedBanner />)
    expect(container.firstChild).toBeNull()
  })
})

// ── Renders correct copy per reason code ─────────────────────────────────────

describe('SubscriptionBlockedBanner — copy per reason', () => {
  it('shows the correct message for subscription_required', () => {
    useSubscriptionStore.setState({
      blockState: { reason: 'subscription_required', message: '' },
    })

    render(<SubscriptionBlockedBanner />)

    expect(
      screen.getByText(/hasn't activated a subscription yet/i),
    ).toBeInTheDocument()
  })

  it('shows the correct message for subscription_expired', () => {
    useSubscriptionStore.setState({
      blockState: { reason: 'subscription_expired', message: '' },
    })

    render(<SubscriptionBlockedBanner />)

    expect(screen.getByText(/subscription has expired/i)).toBeInTheDocument()
  })

  it('shows the correct message for subscription_cancelled', () => {
    useSubscriptionStore.setState({
      blockState: { reason: 'subscription_cancelled', message: '' },
    })

    render(<SubscriptionBlockedBanner />)

    expect(
      screen.getByText(/subscription has been cancelled/i),
    ).toBeInTheDocument()
  })

  it('shows the correct message for subscription_admin_only', () => {
    useSubscriptionStore.setState({
      blockState: { reason: 'subscription_admin_only', message: '' },
    })

    render(<SubscriptionBlockedBanner />)

    expect(screen.getByText(/contact your administrator/i)).toBeInTheDocument()
  })
})

// ── Renewal link presence ─────────────────────────────────────────────────────

describe('SubscriptionBlockedBanner — renewal link', () => {
  const reasonsWithLink: SubscriptionBlockReason[] = [
    'subscription_required',
    'subscription_expired',
    'subscription_cancelled',
  ]

  for (const reason of reasonsWithLink) {
    it(`shows a renewal/activation link for ${reason}`, () => {
      useSubscriptionStore.setState({ blockState: { reason, message: '' } })

      render(<SubscriptionBlockedBanner />)

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/app/subscription')
    })
  }

  it('does NOT show a renewal link for subscription_admin_only', () => {
    useSubscriptionStore.setState({
      blockState: { reason: 'subscription_admin_only', message: '' },
    })

    render(<SubscriptionBlockedBanner />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
