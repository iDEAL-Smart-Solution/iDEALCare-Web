import { beforeEach, describe, expect, it, vi } from 'vitest'
import apiClient from '../lib/apiClient'
import { patientApi } from '../api/patientApi'

vi.mock('../lib/apiClient', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn(),
  },
}))

describe('patientApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requests the documented paged patient list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pageNumber: 2, pageSize: 20, totalCount: 0 } })
    await patientApi.list(2, 20)
    expect(apiClient.get).toHaveBeenCalledWith('/api/patients', { params: { pageNumber: 2, pageSize: 20 } })
  })

  it('rejects pagination values outside the documented bounds', async () => {
    await expect(patientApi.list(0, 20)).rejects.toThrow(RangeError)
    await expect(patientApi.list(1, 101)).rejects.toThrow(RangeError)
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('uses the documented patient and guardian methods', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.delete).mockResolvedValue({})

    await patientApi.listGuardians('patient-id')
    await patientApi.assignGuardian('patient-id', { guardianId: 'guardian-id', relationship: 'Parent', isPrimary: false, permissions: 1 })
    await patientApi.updateGuardianPermissions('patient-id', 'guardian-id', { grant: 1, revoke: 0 })
    await patientApi.revokeGuardian('patient-id', 'guardian-id')

    expect(apiClient.get).toHaveBeenCalledWith('/api/patients/patient-id/guardians')
    expect(apiClient.post).toHaveBeenCalledWith('/api/patients/patient-id/guardians', expect.any(Object))
    expect(apiClient.patch).toHaveBeenCalledWith('/api/patients/patient-id/guardians/guardian-id/permissions', { grant: 1, revoke: 0 })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/patients/patient-id/guardians/guardian-id')
  })

  it('completes guardian revocation for a 204 response without a body', async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({ status: 204, data: undefined })

    await expect(patientApi.revokeGuardian('patient-id', 'guardian-id')).resolves.toBeUndefined()
    expect(apiClient.delete).toHaveBeenCalledWith('/api/patients/patient-id/guardians/guardian-id')
  })

  it('uses the documented patient registration, profile, and status methods', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { token: 'token' } })
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 'patient-id' } })
    vi.mocked(apiClient.put).mockResolvedValue({ data: { id: 'patient-id' } })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: { id: 'patient-id' } })

    await patientApi.registerAccount({ domain: 'tenant.example', email: 'patient@example.com', password: 'password', firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', sex: 4, careLocationType: 1 })
    await patientApi.create({ firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', sex: 4, careLocationType: 1 })
    await patientApi.get('patient-id')
    await patientApi.update('patient-id', { firstName: 'A', lastName: 'Patient', dateOfBirth: '1980-01-01', sex: 4, careLocationType: 1 })
    await patientApi.updateStatus('patient-id', { status: 6 })

    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/patients/register-account', expect.any(Object))
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/patients', expect.any(Object))
    expect(apiClient.get).toHaveBeenCalledWith('/api/patients/patient-id')
    expect(apiClient.put).toHaveBeenCalledWith('/api/patients/patient-id', expect.any(Object))
    expect(apiClient.patch).toHaveBeenCalledWith('/api/patients/patient-id/status', { status: 6 })
  })

  it('keeps guardian-accessible patients as an array response', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
    const result = await patientApi.listAccessiblePatients('guardian-id')
    expect(result).toEqual([])
    expect(apiClient.get).toHaveBeenCalledWith('/api/guardians/guardian-id/patients')
  })
})