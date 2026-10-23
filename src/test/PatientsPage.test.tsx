import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PatientsPage, { PatientCreatePage, PatientDetailPage } from '../pages/PatientsPage'
import { patientApi } from '../api/patientApi'
import { careServiceApi } from '../api/careServiceApi'

vi.mock('../api/patientApi', () => ({
  patientApi: {
    list: vi.fn(), get: vi.fn(), listGuardians: vi.fn(), update: vi.fn(), create: vi.fn(),
    updateStatus: vi.fn(), assignGuardian: vi.fn(), updateGuardianPermissions: vi.fn(), revokeGuardian: vi.fn(),
  },
}))

vi.mock('../api/careServiceApi', () => ({
  careServiceApi: {
    getCatalog: vi.fn(),
  },
}))

function renderPatients(path = '/app/patients') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/app/patients" element={<PatientsPage />} /><Route path="/app/patients/new" element={<PatientCreatePage />} /><Route path="/app/patients/:patientId" element={<PatientDetailPage />} /></Routes></MemoryRouter>)
}

function httpError(status: number) {
  return { isAxiosError: true, response: { status } }
}

describe('PatientsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue([])
  })

  it('shows an empty state for an empty patient page', async () => {
    vi.mocked(patientApi.list).mockResolvedValue({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 })
    renderPatients()
    expect(await screen.findByText('No patients found.')).toBeInTheDocument()
  })

  it('shows patients and links to a profile without putting details in a query string', async () => {
    vi.mocked(patientApi.list).mockResolvedValue({ items: [{ id: 'patient-id', fullName: 'A Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, status: 6, phoneNumber: null, email: null, createdAt: '2026-01-01' }], pageNumber: 1, pageSize: 20, totalCount: 1 })
    renderPatients()
    expect(await screen.findByText('A Patient')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'A Patient' })).toHaveAttribute('href', '/app/patients/patient-id')
  })

  it('shows a neutral error when the patient list fails', async () => {
    vi.mocked(patientApi.list).mockRejectedValue(new Error('request failed'))
    renderPatients()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong'))
  })

  it('requires the home care address for home patients', async () => {
    vi.mocked(patientApi.get).mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001', firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, careLocationType: 2, status: 6, createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    renderPatients('/app/patients/00000000-0000-4000-8000-000000000001')
    await screen.findByDisplayValue('A')
    expect(screen.getByLabelText(/Home care address/)).toBeRequired()
  })

  it('keeps the patient profile visible when guardian loading fails and retries guardians independently', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    vi.mocked(patientApi.get).mockResolvedValue({ id: patientId, firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, careLocationType: 1, status: 6, createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    vi.mocked(patientApi.listGuardians).mockRejectedValueOnce(new Error('guardian service unavailable')).mockResolvedValueOnce([])

    renderPatients(`/app/patients/${patientId}`)

    expect(await screen.findByDisplayValue('A')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    fireEvent.click(screen.getByRole('button', { name: 'Retry guardians' }))
    await waitFor(() => expect(screen.getByText('No guardians assigned.')).toBeInTheDocument())
    expect(patientApi.get).toHaveBeenCalledTimes(1)
    expect(patientApi.listGuardians).toHaveBeenCalledTimes(2)
  })

  it('successfully edits and saves an existing patient profile', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    const patient = { id: patientId, firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4 as const, careLocationType: 1 as const, status: 6 as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    const updatedPatient = { ...patient, firstName: 'Updated' }
    vi.mocked(patientApi.get).mockResolvedValue(patient)
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    vi.mocked(patientApi.update).mockResolvedValue(updatedPatient)
    renderPatients(`/app/patients/${patientId}`)

    fireEvent.change(await screen.findByLabelText(/First name/), { target: { value: 'Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(patientApi.update).toHaveBeenCalledWith(patientId, expect.objectContaining({ firstName: 'Updated' })))
    expect(await screen.findByRole('status')).toHaveTextContent('Patient profile saved.')
    expect(screen.getByRole('heading', { name: 'Updated Patient' })).toBeInTheDocument()
  })

  it('shows a generic validation error when profile saving returns HTTP 400', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    const patient = { id: patientId, firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4 as const, careLocationType: 1 as const, status: 6 as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    vi.mocked(patientApi.get).mockResolvedValue(patient)
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    vi.mocked(patientApi.update).mockRejectedValue(httpError(400))
    renderPatients(`/app/patients/${patientId}`)

    await screen.findByDisplayValue('A')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The request could not be completed. Check the form and try again.'))
  })

  it('shows a permission error when profile saving returns HTTP 403', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    const patient = { id: patientId, firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4 as const, careLocationType: 1 as const, status: 6 as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    vi.mocked(patientApi.get).mockResolvedValue(patient)
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    vi.mocked(patientApi.update).mockRejectedValue(httpError(403))
    renderPatients(`/app/patients/${patientId}`)

    await screen.findByDisplayValue('A')
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('You do not have permission to perform this action.'))
  })

  it('shows a neutral not-found error when loading a patient returns HTTP 404', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    vi.mocked(patientApi.get).mockRejectedValue(httpError(404))
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    renderPatients(`/app/patients/${patientId}`)

    expect(await screen.findByRole('alert')).toHaveTextContent('The requested record was not found.')
  })

  it('renders the create form without fetching a patient or guardians', async () => {
    renderPatients('/app/patients/new')

    expect(await screen.findByRole('heading', { name: 'Register patient' })).toBeInTheDocument()
    expect(patientApi.get).not.toHaveBeenCalled()
    expect(patientApi.listGuardians).not.toHaveBeenCalled()
  })

  it('submits staff registration through the create API method', async () => {
    vi.mocked(patientApi.create).mockResolvedValue({ id: 'patient-id', firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, careLocationType: 1, status: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    renderPatients('/app/patients/new')

    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Patient' } })
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '1980-01-01' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Create patient' }))

    await waitFor(() => expect(patientApi.create).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01' })))
    expect(patientApi.get).not.toHaveBeenCalled()
  })

  it('renders the documented patient profile fields', async () => {
    renderPatients('/app/patients/new')
    expect(await screen.findByRole('heading', { name: 'Register patient' })).toBeInTheDocument()

    for (const label of [
      'Marital status', 'Occupation', 'Religion', 'Email', 'Phone', 'Address', 'City', 'State', 'Country',
      'Requested service', 'Next-of-kin full name', 'Next-of-kin relationship', 'Next-of-kin phone',
      'Next-of-kin alternative phone', 'Next-of-kin email', 'Next-of-kin address', 'Next-of-kin country',
      'Care location',
    ]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument()
    }
  })

  it('populates care services dropdown from catalog and submits selected service', async () => {
    const mockServices = [
      { id: '00000000-0000-4000-8000-000000000101', name: 'Elderly Day Care', price: 25000, bookingModel: 1 as const, availableForFacilityCare: true, availableForHomecare: false },
      { id: '00000000-0000-4000-8000-000000000102', name: 'Home Nursing Visit', price: 40000, bookingModel: 2 as const, availableForFacilityCare: false, availableForHomecare: true },
    ]
    vi.mocked(careServiceApi.getCatalog).mockResolvedValue(mockServices)
    vi.mocked(patientApi.create).mockResolvedValue({ id: 'patient-id', firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, careLocationType: 1, status: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' })

    renderPatients('/app/patients/new')

    expect(await screen.findByRole('option', { name: 'Elderly Day Care (₦25,000)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Home Nursing Visit (₦40,000)' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'A' } })
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Patient' } })
    fireEvent.change(screen.getByLabelText(/Date of birth/), { target: { value: '1980-01-01' } })
    fireEvent.change(screen.getByLabelText(/Requested service/), { target: { value: '00000000-0000-4000-8000-000000000101' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Create patient' }))

    await waitFor(() => expect(patientApi.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'A',
      lastName: 'Patient',
      requestedServiceId: '00000000-0000-4000-8000-000000000101',
    })))
  })

  it('computes combined guardian grant and revoke masks', async () => {
    const guardian = { id: 'access-id', guardianId: 'guardian-id', patientId: '00000000-0000-4000-8000-000000000001', relationship: 'Parent', isPrimary: false, consentGranted: true, permissions: 1, isActive: true }
    vi.mocked(patientApi.get).mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001', firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4, careLocationType: 1, status: 6, createdAt: '2026-01-01', updatedAt: '2026-01-01' })
    vi.mocked(patientApi.listGuardians).mockResolvedValue([guardian])
    vi.mocked(patientApi.updateGuardianPermissions).mockResolvedValue(guardian)
    renderPatients('/app/patients/00000000-0000-4000-8000-000000000001')
    await screen.findByText('Parent')
    fireEvent.click(screen.getByRole('button', { name: 'Manage permissions' }))
    const rows = screen.getByRole('group', { name: 'Grant or revoke permissions' })
    const labels = ['Medical information', 'Bills', 'Messages']
    for (const label of labels) fireEvent.click(screen.getByLabelText(`${label} Grant`))
    fireEvent.click(screen.getByLabelText('Patient profile Revoke'))
    fireEvent.click(screen.getByRole('button', { name: 'Save permissions' }))
    await waitFor(() => expect(patientApi.updateGuardianPermissions).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', 'guardian-id', { grant: 2 | 8 | 128, revoke: 1 }))
    expect(rows).toBeInTheDocument()
  })

  it('submits the selected primary guardian value', async () => {
    const patientId = '00000000-0000-4000-8000-000000000001'
    const patient = { id: patientId, firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', age: 46, sex: 4 as const, careLocationType: 1 as const, status: 6 as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
    vi.mocked(patientApi.get).mockResolvedValue(patient)
    vi.mocked(patientApi.listGuardians).mockResolvedValue([])
    vi.mocked(patientApi.assignGuardian).mockResolvedValue({ id: 'access-id', guardianId: 'guardian-id', patientId, relationship: 'Parent', isPrimary: true, consentGranted: true, permissions: 1, isActive: true })
    renderPatients(`/app/patients/${patientId}`)
    await screen.findByText('No guardians assigned.')
    fireEvent.change(screen.getByLabelText(/Guardian ID/), { target: { value: 'guardian-id' } })
    fireEvent.change(screen.getByLabelText(/Relationship/), { target: { value: 'Parent' } })
    fireEvent.click(screen.getByLabelText('Primary guardian'))
    fireEvent.click(screen.getByRole('button', { name: 'Assign guardian' }))
    await waitFor(() => expect(patientApi.assignGuardian).toHaveBeenCalledWith(patientId, { guardianId: 'guardian-id', relationship: 'Parent', isPrimary: true, permissions: 1 }))
  })
})