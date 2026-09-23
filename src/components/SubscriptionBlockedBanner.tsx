import { useSubscriptionStore } from '../stores/subscriptionStore'
import type { SubscriptionBlockReason } from '../types/subscription'
import './SubscriptionBlockedBanner.css'

interface BannerContent {
  heading: string
  /** undefined means no renewal action should be shown (admin_only case). */
  action: { label: string; href: string } | undefined
}

function getContent(reason: SubscriptionBlockReason): BannerContent {
  switch (reason) {
    case 'subscription_required':
      return {
        heading: "Your organization hasn't activated a subscription yet.",
        action: { label: 'Activate subscription', href: '/app/subscription' },
      }

    case 'subscription_expired':
      return {
        heading: 'Your subscription has expired.',
        action: { label: 'Renew subscription', href: '/app/subscription' },
      }

    case 'subscription_cancelled':
      return {
        heading: 'Your subscription has been cancelled.',
        action: { label: 'Renew subscription', href: '/app/subscription' },
      }

    case 'subscription_admin_only':
      return {
        heading: "Your organization's subscription needs attention. Please contact your administrator.",
        action: undefined,
      }
  }
}

/**
 * Full-width banner rendered inside AppLayout when a 402 response has been
 * received. Renders nothing when blockState is null.
 *
 * Intentionally non-blocking — the rest of the UI remains usable so that
 * already-loaded data is not broken by the presence of this banner.
 */
export default function SubscriptionBlockedBanner() {
  const blockState = useSubscriptionStore((s) => s.blockState)

  if (!blockState) return null

  const { heading, action } = getContent(blockState.reason)

  return (
    <div
      className="sub-banner"
      role="alert"
      aria-live="polite"
      data-reason={blockState.reason}
    >
      <div className="sub-banner__body">
        <span className="sub-banner__icon" aria-hidden="true">⚠</span>
        <p className="sub-banner__text">{heading}</p>
        {action && (
          <a className="sub-banner__action" href={action.href}>
            {action.label}
          </a>
        )}
      </div>
    </div>
  )
}
