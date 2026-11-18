import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { answerTypeLabels, tenantConfigurationApi, type CareServiceDto, type CareServiceRequest, type IntakeQuestionDto, type IntakeQuestionRequest } from '../api/tenantConfigurationApi'

const serviceDefaults: CareServiceRequest = { name: '', description: '', isActive: true, availableForHomecare: false, availableForFacilityCare: true, price: 0, bookingModel: 1, requiredInformation: '', requiredDocuments: '', assessmentRequirements: '' }
const questionDefaults: IntakeQuestionRequest = { questionText: '', answerType: 1, isRequired: false, displayOrder: 0, isActive: true }
const errorMessage = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'Configuration could not be saved.' : 'Configuration could not be saved.'

export default function TenantConfigurationPage() {
  const [tab, setTab] = useState<'services' | 'questions' | 'capacity'>('services')
  const [services, setServices] = useState<CareServiceDto[]>([])
  const [questions, setQuestions] = useState<IntakeQuestionDto[]>([])
  const [serviceForm, setServiceForm] = useState<CareServiceRequest>(serviceDefaults)
  const [editingService, setEditingService] = useState('')
  const [questionForm, setQuestionForm] = useState<IntakeQuestionRequest>(questionDefaults)
  const [editingQuestion, setEditingQuestion] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [availableSlots, setAvailableSlots] = useState(0)
  const [remainingSlots, setRemainingSlots] = useState(0)
  const [reservedSlots, setReservedSlots] = useState(0)
  const [unpaidExpiryHours, setUnpaidExpiryHours] = useState(24)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [serviceRows, questionRows, capacity, expiry] = await Promise.all([tenantConfigurationApi.services(), tenantConfigurationApi.questions(), tenantConfigurationApi.registrationCapacity(), tenantConfigurationApi.registrationExpiry()])
      setServices(serviceRows); setQuestions(questionRows.sort((a, b) => a.displayOrder - b.displayOrder))
      setAvailableSlots(capacity.availableSlots)
      setRemainingSlots(capacity.remainingSlots)
      setReservedSlots(capacity.reservedSlots)
      setUnpaidExpiryHours(expiry.unpaidExpiryHours)
    } catch (loadError) { setError(errorMessage(loadError)) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  async function saveService(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const payload = { ...serviceForm, name: serviceForm.name.trim(), price: Number(serviceForm.price), description: serviceForm.description?.trim() || undefined, requiredInformation: serviceForm.requiredInformation?.trim() || undefined, requiredDocuments: serviceForm.requiredDocuments?.trim() || undefined, assessmentRequirements: serviceForm.assessmentRequirements?.trim() || undefined }
      if (editingService) await tenantConfigurationApi.updateService(editingService, payload)
      else await tenantConfigurationApi.createService(payload)
      setNotice(editingService ? 'Care service updated.' : 'Care service created.'); setServiceForm(serviceDefaults); setEditingService(''); await load()
    } catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }
  async function saveQuestion(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const payload = { ...questionForm, questionText: questionForm.questionText.trim(), displayOrder: Number(questionForm.displayOrder) }
      if (editingQuestion) await tenantConfigurationApi.updateQuestion(editingQuestion, payload)
      else await tenantConfigurationApi.createQuestion(payload)
      setNotice(editingQuestion ? 'Intake question updated.' : 'Intake question added.'); setQuestionForm(questionDefaults); setEditingQuestion(''); await load()
    } catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }
  async function saveCapacity(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { const result = await tenantConfigurationApi.setRegistrationCapacity(availableSlots); setAvailableSlots(result.availableSlots); setRemainingSlots(result.remainingSlots); setReservedSlots(result.reservedSlots); setNotice(`Registration capacity saved. ${result.remainingSlots} spaces remain after active checkouts.`) }
    catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }
  async function saveExpiry(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try { const result = await tenantConfigurationApi.setRegistrationExpiry(unpaidExpiryHours); setUnpaidExpiryHours(result.unpaidExpiryHours); setNotice(`Global unpaid registration expiry set to ${result.unpaidExpiryHours} hours.`) }
    catch (saveError) { setError(errorMessage(saveError)) }
    finally { setSaving(false) }
  }
  function editService(service: CareServiceDto) {
    setEditingService(service.id); setServiceForm({ name: service.name, description: service.description ?? '', isActive: service.isActive, availableForHomecare: service.availableForHomecare, availableForFacilityCare: service.availableForFacilityCare, price: service.price, bookingModel: service.bookingModel, requiredInformation: service.requiredInformation ?? '', requiredDocuments: service.requiredDocuments ?? '', assessmentRequirements: service.assessmentRequirements ?? '' })
  }
  function editQuestion(question: IntakeQuestionDto) {
    setEditingQuestion(question.id); setQuestionForm({ questionText: question.questionText, answerType: question.answerType, isRequired: question.isRequired, displayOrder: question.displayOrder, isActive: question.isActive })
  }
  return <section className="tenant-configuration">
    <header className="patients-page__header"><div><p className="eyebrow">Provider setup</p><h2>Care configuration</h2><p className="muted">Set up your services, booking approach, and patient intake questions.</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    <div className="tenant-configuration__tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === 'services'} className={tab === 'services' ? 'tenant-configuration__tab tenant-configuration__tab--active' : 'tenant-configuration__tab'} onClick={() => setTab('services')}>Care services</button><button type="button" role="tab" aria-selected={tab === 'questions'} className={tab === 'questions' ? 'tenant-configuration__tab tenant-configuration__tab--active' : 'tenant-configuration__tab'} onClick={() => setTab('questions')}>Intake questions</button><button type="button" role="tab" aria-selected={tab === 'capacity'} className={tab === 'capacity' ? 'tenant-configuration__tab tenant-configuration__tab--active' : 'tenant-configuration__tab'} onClick={() => setTab('capacity')}>Registration capacity</button></div>
    {loading ? <p className="state-message">Loading provider configuration…</p> : tab === 'capacity' ? <div className="tenant-configuration__layout"><form className="patient-dashboard__panel tenant-configuration__form" onSubmit={(event) => void saveCapacity(event)}><h3>Patient registration slots</h3><p className="muted">Patients can see the remaining count. Each completed registration payment uses one slot. Active checkouts temporarily hold a slot.</p><label className="form-field"><span>Available slots</span><input className="form-input" type="number" min="0" step="1" required value={availableSlots} onChange={(event) => setAvailableSlots(Number(event.target.value))} /></label><p className="muted">Remaining capacity: <strong>{remainingSlots}</strong> · Active payment checkouts: <strong>{reservedSlots}</strong></p><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save capacity'}</button></form><form className="patient-dashboard__panel tenant-configuration__form" onSubmit={(event) => void saveExpiry(event)}><h3>Unpaid registration expiry</h3><p className="muted">This system-wide period applies to every patient registration. Accounts with unpaid registration invoices are hard-deleted after the period elapses.</p><label className="form-field"><span>Hours before deletion</span><input className="form-input" type="number" min="1" max="8760" step="1" required value={unpaidExpiryHours} onChange={(event) => setUnpaidExpiryHours(Number(event.target.value))} /></label><button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : 'Save expiry period'}</button></form></div> : tab === 'services' ? <div className="tenant-configuration__layout"><form className="patient-dashboard__panel tenant-configuration__form" onSubmit={(event) => void saveService(event)}><h3>{editingService ? 'Edit care service' : 'Add a care service'}</h3><label className="form-field"><span>Service name</span><input className="form-input" required maxLength={200} value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} /></label><label className="form-field"><span>Description</span><textarea className="form-input form-textarea" rows={2} maxLength={1000} value={serviceForm.description} onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })} /></label><label className="form-field"><span>Price (NGN)</span><input className="form-input" type="number" min="0.01" step="0.01" required value={serviceForm.price || ''} onChange={(event) => setServiceForm({ ...serviceForm, price: Number(event.target.value) })} /></label><label className="form-field"><span>Booking approach</span><select className="form-input" value={serviceForm.bookingModel} onChange={(event) => setServiceForm({ ...serviceForm, bookingModel: Number(event.target.value) as 1 | 2 })}><option value={1}>Provider schedules</option><option value={2}>Patient chooses an available slot</option></select></label><div className="tenant-configuration__checks"><label><input type="checkbox" checked={serviceForm.availableForHomecare} onChange={(event) => setServiceForm({ ...serviceForm, availableForHomecare: event.target.checked })} />Available for home care</label><label><input type="checkbox" checked={serviceForm.availableForFacilityCare} onChange={(event) => setServiceForm({ ...serviceForm, availableForFacilityCare: event.target.checked })} />Available for facility care</label><label><input type="checkbox" checked={serviceForm.isActive} onChange={(event) => setServiceForm({ ...serviceForm, isActive: event.target.checked })} />Visible for new registrations</label></div><label className="form-field"><span>Required information</span><textarea className="form-input form-textarea" rows={2} value={serviceForm.requiredInformation} onChange={(event) => setServiceForm({ ...serviceForm, requiredInformation: event.target.value })} /></label><label className="form-field"><span>Required documents</span><textarea className="form-input form-textarea" rows={2} value={serviceForm.requiredDocuments} onChange={(event) => setServiceForm({ ...serviceForm, requiredDocuments: event.target.value })} /></label><label className="form-field"><span>Assessment requirements</span><textarea className="form-input form-textarea" rows={2} value={serviceForm.assessmentRequirements} onChange={(event) => setServiceForm({ ...serviceForm, assessmentRequirements: event.target.value })} /></label><div className="modal-actions">{editingService && <button type="button" className="secondary-button" onClick={() => { setEditingService(''); setServiceForm(serviceDefaults) }}>Cancel</button>}<button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingService ? 'Save service' : 'Create service'}</button></div></form><div className="tenant-configuration__list">{services.map((service) => <article className="patient-dashboard__panel tenant-service-card" key={service.id}><div><span className={`facility-card__state ${service.isActive ? 'facility-card__state--active' : ''}`}>{service.isActive ? 'Active' : 'Inactive'}</span><h3>{service.name}</h3><p>{service.description || 'No description provided.'}</p><div className="tenant-service-card__metadata"><span>₦{service.price.toLocaleString()}</span><span>{service.bookingModel === 1 ? 'Provider scheduled' : 'Patient-selected slot'}</span><span>{service.availableForHomecare ? 'Home care' : ''}{service.availableForHomecare && service.availableForFacilityCare ? ' · ' : ''}{service.availableForFacilityCare ? 'Facility care' : ''}</span></div></div><button type="button" className="secondary-button" onClick={() => editService(service)}>Edit</button></article>)}{!services.length && <section className="patient-dashboard__panel"><p className="patient-dashboard__empty">No care services are configured yet.</p></section>}</div></div> : <div className="tenant-configuration__layout"><form className="patient-dashboard__panel tenant-configuration__form" onSubmit={(event) => void saveQuestion(event)}><h3>{editingQuestion ? 'Edit intake question' : 'Add an intake question'}</h3><label className="form-field"><span>Question</span><textarea className="form-input form-textarea" rows={3} required maxLength={1000} value={questionForm.questionText} onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })} /></label><label className="form-field"><span>Answer format</span><select className="form-input" value={questionForm.answerType} onChange={(event) => setQuestionForm({ ...questionForm, answerType: Number(event.target.value) })}>{Object.entries(answerTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="form-field"><span>Display order</span><input className="form-input" type="number" min="0" value={questionForm.displayOrder} onChange={(event) => setQuestionForm({ ...questionForm, displayOrder: Number(event.target.value) })} /></label><div className="tenant-configuration__checks"><label><input type="checkbox" checked={questionForm.isRequired} onChange={(event) => setQuestionForm({ ...questionForm, isRequired: event.target.checked })} />Required for patient assessment</label><label><input type="checkbox" checked={questionForm.isActive} onChange={(event) => setQuestionForm({ ...questionForm, isActive: event.target.checked })} />Active</label></div><div className="modal-actions">{editingQuestion && <button type="button" className="secondary-button" onClick={() => { setEditingQuestion(''); setQuestionForm(questionDefaults) }}>Cancel</button>}<button type="submit" className="primary-button" disabled={saving}>{saving ? 'Saving…' : editingQuestion ? 'Save question' : 'Add question'}</button></div></form><div className="tenant-configuration__list">{questions.map((question) => <article className="patient-dashboard__panel tenant-question-card" key={question.id}><div><span className={`facility-card__state ${question.isActive ? 'facility-card__state--active' : ''}`}>{question.isActive ? 'Active' : 'Inactive'}</span><h3>{question.questionText}</h3><p>{answerTypeLabels[question.answerType] ?? 'Text'}{question.isRequired ? ' · Required' : ' · Optional'} · Order {question.displayOrder}</p></div><button type="button" className="secondary-button" onClick={() => editQuestion(question)}>Edit</button></article>)}{!questions.length && <section className="patient-dashboard__panel"><p className="patient-dashboard__empty">No intake questions have been added.</p></section>}</div></div>}
  </section>
}
