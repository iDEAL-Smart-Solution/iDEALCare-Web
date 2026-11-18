import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { medicalApi, medicalDocumentTypes, type MedicalDocumentDto, type MedicalDocumentType } from '../api/medicalApi'

const errorText = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The document request could not be completed.' : 'The document request could not be completed.'

export default function PatientMedicalDocumentsPanel({ patientId, canUpload = false, canDelete = false }: { patientId: string; canUpload?: boolean; canDelete?: boolean }) {
  const [documents, setDocuments] = useState<MedicalDocumentDto[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<MedicalDocumentType>(7)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setDocuments(await medicalApi.listDocuments(patientId)) }
    catch (requestError) { setError(errorText(requestError)) }
    finally { setLoading(false) }
  }, [patientId])
  useEffect(() => { void load() }, [load])

  async function upload(event: FormEvent) {
    event.preventDefault()
    if (!file) return
    setSaving(true); setError(''); setNotice('')
    try {
      await medicalApi.uploadDocument(patientId, file, documentType, description)
      setFile(null); setDescription(''); setNotice('Document uploaded to the patient record.'); await load()
      const input = document.getElementById(`medical-document-${patientId}`) as HTMLInputElement | null
      if (input) input.value = ''
    } catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  async function remove(item: MedicalDocumentDto) {
    if (!window.confirm(`Delete ${item.fileName} from this patient record?`)) return
    setSaving(true); setError(''); setNotice('')
    try { await medicalApi.deleteDocument(patientId, item.id); setDocuments((current) => current.filter((document) => document.id !== item.id)); setNotice('Document removed.') }
    catch (requestError) { setError(errorText(requestError)) }
    finally { setSaving(false) }
  }

  return <section className="patient-dashboard__panel medical-documents">
    <div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Patient file</span><h3>Medical documents</h3></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></div>
    {error && <div className="notice notice--error" role="alert">{error}</div>}{notice && <div className="notice notice--info" role="status">{notice}</div>}
    {canUpload && <form className="medical-documents__upload" onSubmit={(event) => void upload(event)}><label className="form-field"><span>Document type</span><select className="form-input" value={documentType} onChange={(event) => setDocumentType(Number(event.target.value) as MedicalDocumentType)}>{medicalDocumentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="form-field"><span>File (PDF, image, or Word document)</span><input id={`medical-document-${patientId}`} className="form-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label><label className="form-field medical-documents__description"><span>Description (optional)</span><input className="form-input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label><button className="primary-button" type="submit" disabled={saving || !file}>{saving ? 'Uploading…' : 'Upload document'}</button></form>}
    {loading ? <p className="patient-dashboard__empty">Loading documents…</p> : documents.length ? <ul className="guardian-portal__list">{documents.map((item) => <li key={item.id}><div><strong>{item.fileName}</strong><span>{medicalDocumentTypes.find((type) => type.value === item.documentType)?.label ?? 'Document'}{item.description ? ` · ${item.description}` : ''} · Uploaded {new Date(item.createdAt).toLocaleDateString()}</span></div><div className="medical-documents__actions"><a href={item.fileUrl} target="_blank" rel="noreferrer">View</a>{canDelete && <button type="button" className="secondary-button" disabled={saving} onClick={() => void remove(item)}>Delete</button>}</div></li>)}</ul> : <p className="patient-dashboard__empty">No medical documents have been added.</p>}
  </section>
}
