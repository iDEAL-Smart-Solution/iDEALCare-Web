import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import { dashboardApi } from '../api/dashboardApi'
import { useAuthStore } from '../stores/authStore'
import { mockOwnerDashboard } from './fixtures/mockDashboard'

describe('DashboardPage (Owner View)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      status: 'authenticated',
      accessToken: 'test-token',
      user: {
        id: 'user-owner-1',
        firstName: 'Ade',
        lastName: 'Balogun',
        email: 'ade@gracecare.ng',
      },
      tenant: {
        tenant_id: 'tenant-101',
        tenant_role: 'Owner',
        tenantName: 'Grace Care Hospital',
      },
    })
  })

  it('renders executive greeting, clinic badge, and role', async () => {
    vi.spyOn(dashboardApi, 'getOwnerSummary').mockResolvedValueOnce(mockOwnerDashboard)

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText(/Welcome, Ade Balogun/i)).toBeInTheDocument()
    })

    expect(screen.getByText(/Owner Command/i)).toBeInTheDocument()
    expect(screen.getByText(/Grace Care Hospital/i)).toBeInTheDocument()
  })

  it('renders top executive KPI cards (occupancy, revenue, receivables, subscription)', async () => {
    vi.spyOn(dashboardApi, 'getOwnerSummary').mockResolvedValueOnce(mockOwnerDashboard)

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Inpatient Occupancy/i)).toBeInTheDocument()
    })

    // KPI values
    expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1) // 28 inpatients
    expect(screen.getByText(/₦14,850,000/i)).toBeInTheDocument() // monthly revenue
    expect(screen.getByText(/₦1,920,000/i)).toBeInTheDocument() // outstanding
    expect(screen.getAllByText(/Enterprise Healthcare Suite/i).length).toBeGreaterThanOrEqual(1) // plan name
  })

  it('renders recent admissions list with patient links and status pills', async () => {
    vi.spyOn(dashboardApi, 'getOwnerSummary').mockResolvedValueOnce(mockOwnerDashboard)

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Amara Okafor')).toBeInTheDocument()
    })

    expect(screen.getByText('Ibrahim Danjuma')).toBeInTheDocument()
    expect(screen.getByText('Ward 2 — Bed 04')).toBeInTheDocument()
    expect(screen.getByText('Nurse Folake A.')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('allows clicking refresh button to re-fetch telemetry', async () => {
    const spy = vi.spyOn(dashboardApi, 'getOwnerSummary').mockResolvedValue(mockOwnerDashboard)

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Amara Okafor')).toBeInTheDocument()
    })

    const refreshBtn = screen.getByRole('button', { name: /refresh dashboard metrics/i })
    fireEvent.click(refreshBtn)

    expect(spy).toHaveBeenCalledTimes(2)
  })
})
