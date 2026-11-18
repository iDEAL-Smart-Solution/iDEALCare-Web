import { useCallback, useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { communicationApi, type ConversationDto, type MessageDto } from '../api/communicationApi'
import { patientApi } from '../api/patientApi'
import { useAuthStore } from '../stores/authStore'
import type { PatientDto, PatientSummaryDto } from '../types/patient'
import type { GuardianPatientDto } from '../types/guardian'

type PatientItem = { id: string; name: string }
const requestError = (error: unknown) => axios.isAxiosError(error) ? (error.response?.data as { message?: string } | undefined)?.message ?? 'The message request failed.' : 'The message request failed.'

export default function MessagesPage() {
  const role = useAuthStore((state) => state.tenant?.tenant_role?.toLowerCase() ?? '')
  const [patients, setPatients] = useState<PatientItem[]>([])
  const [patientId, setPatientId] = useState('')
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [reply, setReply] = useState('')
  const [subject, setSubject] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [composing, setComposing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let patientItems: PatientItem[] = []
      if (role === 'patient') {
        const patient: PatientDto = await patientApi.getMe()
        patientItems = [{ id: patient.id, name: `${patient.firstName} ${patient.lastName}` }]
      } else if (role === 'guardian') {
        const links: GuardianPatientDto[] = await patientApi.listMyGuardianPatients()
        patientItems = links.filter((item) => item.isActive && item.consentGranted && (item.permissions & 128) !== 0).map((item) => ({ id: item.patientId, name: `${item.firstName} ${item.lastName}` }))
      } else {
        const first = await patientApi.list(1, 100)
        const pages = await Promise.all(Array.from({ length: Math.max(0, Math.ceil(first.totalCount / 100) - 1) }, (_, index) => patientApi.list(index + 2, 100)))
        patientItems = [first, ...pages].flatMap((page) => page.items.map((item: PatientSummaryDto) => ({ id: item.id, name: item.fullName })))
      }
      setPatients(patientItems)
      const nextPatientId = patientItems.some((item) => item.id === patientId) ? patientId : patientItems[0]?.id ?? ''
      setPatientId(nextPatientId)
      const rows = await communicationApi.myConversations()
      const visibleRows = role === 'guardian' ? rows.filter((row) => patientItems.some((patient) => patient.id === row.patientId)) : role === 'patient' ? rows.filter((row) => row.patientId === nextPatientId) : rows
      setConversations(visibleRows)
      setSelectedId((current) => visibleRows.some((row) => row.id === current) ? current : visibleRows[0]?.id ?? '')
    } catch (loadError) { setError(requestError(loadError)) }
    finally { setLoading(false) }
  }, [role, patientId])

  useEffect(() => { void load() }, [load])

  const loadMessages = useCallback(async () => {
    if (!selectedId) { setMessages([]); return }
    try {
      const rows = await communicationApi.messages(selectedId)
      setMessages(rows)
      await Promise.all(rows.filter((message) => message.senderUserId !== useAuthStore.getState().user?.id && !message.readAt).map((message) => communicationApi.markRead(message.id).catch(() => undefined)))
    } catch (loadError) { setError(requestError(loadError)) }
  }, [selectedId])

  useEffect(() => { void loadMessages() }, [loadMessages])
  useEffect(() => {
    if (!selectedId) return
    const timer = window.setInterval(() => void loadMessages(), 15_000)
    return () => window.clearInterval(timer)
  }, [selectedId, loadMessages])

  async function startConversation(event: FormEvent) {
    event.preventDefault()
    if (!patientId || !firstMessage.trim()) return
    setSending(true); setError('')
    try {
      const created = await communicationApi.createConversation(patientId, subject.trim(), firstMessage.trim())
      setConversations((current) => [created, ...current.filter((item) => item.id !== created.id)])
      setSelectedId(created.id); setFirstMessage(''); setSubject(''); setComposing(false)
    } catch (sendError) { setError(requestError(sendError)) }
    finally { setSending(false) }
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || !reply.trim()) return
    setSending(true); setError('')
    try { const sent = await communicationApi.send(selectedId, reply.trim()); setMessages((current) => [...current, sent]); setReply('') }
    catch (sendError) { setError(requestError(sendError)) }
    finally { setSending(false) }
  }

  if (loading) return <p className="state-message">Loading messages…</p>
  const selected = conversations.find((item) => item.id === selectedId)
  return <section className="messages-page">
    <header className="patients-page__header"><div><p className="eyebrow">Care coordination</p><h2>Messages</h2><p className="muted">Secure conversations between patients, guardians, and their care team.</p></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setComposing((value) => !value)} disabled={!patients.length}>New message</button><button className="secondary-button" type="button" onClick={() => void load()}>Refresh</button></div></header>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {!patients.length && role === 'guardian' && <section className="patient-dashboard__panel"><h3>Messaging access not available</h3><p className="patient-dashboard__empty">A patient must approve message access before you can start or view conversations.</p></section>}
    {!patients.length && role !== 'guardian' && <section className="patient-dashboard__panel"><p className="patient-dashboard__empty">No patients are available for messaging.</p></section>}
    {composing && patients.length > 0 && <form className="patient-dashboard__panel messages-page__compose" onSubmit={(event) => void startConversation(event)}><h3>Start a conversation</h3><label className="form-field"><span>Patient</span><select className="form-input" value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></label><label className="form-field"><span>Subject (optional)</span><input className="form-input" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} /></label><label className="form-field"><span>Message</span><textarea className="form-input form-textarea" rows={4} value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} maxLength={5000} required /></label><button className="primary-button" type="submit" disabled={sending || !firstMessage.trim()}>{sending ? 'Sending…' : 'Send to care team'}</button></form>}
    <div className="messages-page__layout"><aside className="patient-dashboard__panel messages-page__threads"><div className="patient-dashboard__panel-heading"><h3>Conversations</h3></div>{conversations.length ? <ul>{conversations.map((item) => <li key={item.id}><button type="button" className={selectedId === item.id ? 'messages-page__thread messages-page__thread--active' : 'messages-page__thread'} onClick={() => setSelectedId(item.id)}><strong>{item.subject || `Care team · ${item.patientName || patients.find((patient) => patient.id === item.patientId)?.name || 'Patient'}`}</strong><span>{item.lastMessage?.body || 'No messages yet'}</span><time>{item.lastMessage ? new Date(item.lastMessage.sentAt).toLocaleString() : new Date(item.createdAt).toLocaleDateString()}</time></button></li>)}</ul> : <p className="patient-dashboard__empty">No conversations yet. Start a message to contact the care team.</p>}</aside>
      <section className="patient-dashboard__panel messages-page__conversation">{selected ? <><div className="patient-dashboard__panel-heading"><div><span className="eyebrow">{selected.patientName || patients.find((patient) => patient.id === selected.patientId)?.name || 'Patient'}</span><h3>{selected.subject || 'Care team conversation'}</h3></div><button className="secondary-button" type="button" onClick={() => void loadMessages()}>Refresh</button></div><ol className="messages-page__history">{messages.map((message) => <li className={message.senderUserId === useAuthStore.getState().user?.id ? 'messages-page__message messages-page__message--mine' : 'messages-page__message'} key={message.id}><span>{message.senderFullName || 'Care team'}</span><p>{message.body}</p><time>{new Date(message.sentAt).toLocaleString()}</time></li>)}</ol>{selected.isActive ? <form className="messages-page__reply" onSubmit={(event) => void sendReply(event)}><label className="form-field"><span>Reply</span><textarea className="form-input form-textarea" rows={3} value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} required /></label><button className="primary-button" type="submit" disabled={sending || !reply.trim()}>{sending ? 'Sending…' : 'Send message'}</button></form> : <p className="patient-dashboard__empty">This conversation is closed.</p>}</> : <div className="messages-page__empty"><span>✉</span><h3>Select a conversation</h3><p>Choose a thread to read and reply, or start a new conversation.</p></div>}</section>
    </div>
  </section>
}
