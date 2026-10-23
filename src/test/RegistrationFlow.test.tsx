import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { patientApi } from '../api/patientApi'
import { careServiceApi } from '../api/careServiceApi'
import { useAuthStore } from '../stores/authStore'
import RegisterPage from '../pages/RegisterPage'
import RegistrationReviewPage from '../pages/RegistrationReviewPage'
import RegistrationFeePage from '../pages/RegistrationFeePage'
import type { PatientDto, PatientSummaryDto, RegistrationInvoiceDto } from '../types/patient'

vi.mock('../api/patientApi', () => ({
  patientApi: {
    registerAccount: vi.fn(),
    listPendingReview: vi.fn(),
    reviewRegistration: vi.fn(),
    getMe: vi.fn(),
    getInvoices: vi.fn(),
    payInvoice: vi.fn(),
    verifyPayment: vi.fn(),
  },
}))

vi.mock('../api/careServiceApi', () => ({
  careServiceApi: {
    getCatalog: vi.fn(),
  },
}))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  useAuthStore.setState({
    status: 'unauthenticated',
    user: null,
    accessToken: null,
    tenant: null,
  })
})

describe('RegisterPage', () => {
  it('renders all required patient registration fields', () => {
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    expect(screen.getByLabelText(/clinic domain/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sex/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/care preference/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete registration/i })).toBeInTheDocument()
  })

  it('validates required fields before submission', async () => {
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByRole('button', { name: /complete registration/i }))

    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/date of birth is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email address is required/i)).toBeInTheDocument()
  })

  it('successfully submits registration and sets session', async () => {
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])
    vi.mocked(patientApi.registerAccount).mockResolvedValue({
      accessToken: 'token-123',
      expiresAt: '2026-12-31T23:59:59Z',
      user: {
        id: 'user-1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
      },
      tenant: {
        tenant_id: 'tenant-1',
        tenant_role: 'Patient',
        tenantName: 'Care Clinic',
        domain: 'test-clinic',
      },
    })

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/app/registration-fee" element={<div>Registration Fee Destination</div>} />
        </Routes>
      </MemoryRouter>
    )

    const domainInput = screen.getByLabelText(/clinic domain/i)
    await userEvent.clear(domainInput)
    await userEvent.type(domainInput, 'test-clinic')
    await userEvent.type(screen.getByLabelText(/first name/i), 'Jane')
    await userEvent.type(screen.getByLabelText(/last name/i), 'Doe')
    await userEvent.type(screen.getByLabelText(/date of birth/i), '1995-05-15')
    await userEvent.type(screen.getByLabelText(/email address/i), 'jane.doe@example.com')
    await userEvent.type(screen.getByLabelText(/^password \*/i), 'Secret123!')
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'Secret123!')

    await userEvent.click(screen.getByRole('button', { name: /complete registration/i }))

    await waitFor(() => {
      expect(patientApi.registerAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'test-clinic',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          dateOfBirth: '1995-05-15',
        })
      )
    })

    expect(await screen.findByText('Registration Fee Destination')).toBeInTheDocument()
  })
})

describe('RegistrationReviewPage', () => {
  const mockCandidates: PatientSummaryDto[] = [
    {
      id: 'p-1',
      fullName: 'Alice Johnson',
      dateOfBirth: '1990-01-01',
      age: 36,
      sex: 2,
      status: 1, // PendingReview
      phoneNumber: '08012345678',
      email: 'alice@example.com',
      createdAt: '2026-10-21T10:00:00Z',
    },
  ]

  it('renders pending registrations and handles approval', async () => {
    vi.mocked(patientApi.listPendingReview).mockResolvedValue(mockCandidates)
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])
    vi.mocked(patientApi.reviewRegistration).mockResolvedValue({
      id: 'p-1',
      firstName: 'Alice',
      lastName: 'Johnson',
      status: 4, // AwaitingRegistrationPayment
    } as unknown as PatientDto)

    render(
      <MemoryRouter>
        <RegistrationReviewPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Alice Johnson')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()

    // Click Approve
    await userEvent.click(screen.getByRole('button', { name: /approve registration/i }))

    // Modal opens
    expect(await screen.findByText('Approve Patient Registration')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /confirm approval/i }))

    await waitFor(() => {
      expect(patientApi.reviewRegistration).toHaveBeenCalledWith('p-1', {
        decision: 'Approve',
        reason: undefined,
      })
    })
  })

  it('handles requesting info with reason', async () => {
    vi.mocked(patientApi.listPendingReview).mockResolvedValue(mockCandidates)
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])
    vi.mocked(patientApi.reviewRegistration).mockResolvedValue({
      id: 'p-1',
      status: 2, // AwaitingInformation
    } as unknown as PatientDto)

    render(
      <MemoryRouter>
        <RegistrationReviewPage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Alice Johnson')).toBeInTheDocument()

    // Click Request Info
    await userEvent.click(screen.getByRole('button', { name: /request info/i }))

    expect(await screen.findByText('Request Additional Information')).toBeInTheDocument()
    await userEvent.type(
      screen.getByLabelText(/clinical \/ onboarding questions/i),
      'Please upload ID document'
    )
    await userEvent.click(screen.getByRole('button', { name: /send request/i }))

    await waitFor(() => {
      expect(patientApi.reviewRegistration).toHaveBeenCalledWith('p-1', {
        decision: 'RequestInfo',
        reason: 'Please upload ID document',
      })
    })
  })
})

describe('RegistrationFeePage', () => {
  it('renders application under review when status is PendingReview (1)', async () => {
    vi.mocked(patientApi.getMe).mockResolvedValue({
      id: 'p-10',
      firstName: 'Bob',
      lastName: 'Smith',
      dateOfBirth: '1985-02-14',
      status: 1, // PendingReview
      careLocationType: 1,
      createdAt: '2026-10-21T12:00:00Z',
    } as PatientDto)
    vi.mocked(patientApi.getInvoices).mockResolvedValue([])

    render(
      <MemoryRouter>
        <RegistrationFeePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Application Under Review')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('renders registration invoice and pay button when status is AwaitingRegistrationPayment (4)', async () => {
    vi.mocked(patientApi.getMe).mockResolvedValue({
      id: 'p-10',
      firstName: 'Bob',
      lastName: 'Smith',
      dateOfBirth: '1985-02-14',
      status: 4, // AwaitingRegistrationPayment
      careLocationType: 1,
      createdAt: '2026-10-21T12:00:00Z',
    } as PatientDto)

    const mockInvoices: RegistrationInvoiceDto[] = [
      {
        id: 'inv-12345678-abcd',
        tenantId: 'tenant-1',
        patientId: 'p-10',
        invoiceType: 1,
        status: 1, // Unpaid
        totalAmount: 15000,
        amountPaid: 0,
        outstandingAmount: 15000,
        isRefundable: false,
        createdAt: '2026-10-21T12:00:00Z',
      },
    ]
    vi.mocked(patientApi.getInvoices).mockResolvedValue(mockInvoices)
    vi.mocked(patientApi.payInvoice).mockResolvedValue({
      paymentId: 'pay-1',
      reference: 'ref-123',
      authorizationUrl: 'https://checkout.paystack.com/pay123',
    })

    render(
      <MemoryRouter>
        <RegistrationFeePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Registration Fee Required')).toBeInTheDocument()
    expect(screen.getByText('Patient Registration Fee')).toBeInTheDocument()
    expect(screen.getAllByText('₦15,000').length).toBeGreaterThanOrEqual(1)

    const payBtn = screen.getByRole('button', { name: /pay ₦15,000/i })
    expect(payBtn).toBeInTheDocument()
    await userEvent.click(payBtn)

    await waitFor(() => {
      expect(patientApi.payInvoice).toHaveBeenCalledWith(
        'p-10',
        'inv-12345678-abcd',
        15000,
        expect.stringContaining('/app/registration-fee')
      )
    })
  })

  it('renders confirmation when status is AwaitingPhysicalAssessment (3)', async () => {
    vi.mocked(patientApi.getMe).mockResolvedValue({
      id: 'p-10',
      firstName: 'Bob',
      lastName: 'Smith',
      dateOfBirth: '1985-02-14',
      status: 3, // AwaitingPhysicalAssessment
      careLocationType: 1,
      createdAt: '2026-10-21T12:00:00Z',
    } as PatientDto)
    vi.mocked(patientApi.getInvoices).mockResolvedValue([
      {
        id: 'inv-paid-1',
        tenantId: 'tenant-1',
        patientId: 'p-10',
        invoiceType: 1,
        status: 2, // Paid
        totalAmount: 15000,
        amountPaid: 15000,
        outstandingAmount: 0,
        isRefundable: false,
        createdAt: '2026-10-21T12:00:00Z',
      },
    ])

    render(
      <MemoryRouter>
        <RegistrationFeePage />
      </MemoryRouter>
    )

    expect(await screen.findByText('Registration & Fee Payment Completed')).toBeInTheDocument()
    expect(screen.getByText(/receipt: ₦15,000 paid/i)).toBeInTheDocument()
  })
})
