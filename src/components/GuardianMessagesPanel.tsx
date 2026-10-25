import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { communicationApi, type ConversationDto, type MessageDto } from '../api/communicationApi'

export default function GuardianMessagesPanel({ patientId }: { patientId: string }) {
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [selected, setSelected] = useState('')
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [body, setBody] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [composeNew, setComposeNew] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  async function load() {
    setError(null)
    try {
      const rows = (await communicationApi.myConversations()).filter((conversation) => conversation.patientId === patientId)
      setConversations(rows)
      setSelected((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? '')
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) && requestError.response?.status === 403 ? 'You do not have permission to view messages for this patient.' : 'Messages could not be loaded. Please try again.')
    }
  }
  useEffect(() => { void load() }, [patientId])
  useEffect(() => {
    let active = true
    if (!selected) { setMessages([]); return () => { active = false } }
    communicationApi.messages(selected).then((rows) => { if (active) setMessages(rows) }).catch(() => { if (active) setError('This conversation could not be loaded.') })
    return () => { active = false }
  }, [selected])
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || !body.trim()) return
    setBusy(true); setError(null)
    try { const sent = await communicationApi.send(selected, body.trim()); setMessages((current) => [...current, sent]); setBody('') }
    catch { setError('Your message could not be sent. Please try again.') }
    finally { setBusy(false) }
  }
  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newBody.trim()) return
    setBusy(true); setError(null)
    try {
      const created = await communicationApi.createConversation(patientId, newSubject.trim(), newBody.trim())
      setConversations((current) => [created, ...current]); setSelected(created.id); setComposeNew(false); setNewSubject(''); setNewBody('')
    } catch (requestError) {
      setError(axios.isAxiosError(requestError) && requestError.response?.status === 403 ? 'You do not have permission to start a conversation.' : 'Your conversation could not be started.')
    } finally { setBusy(false) }
  }
  return <section className="patient-dashboard__panel guardian-messages">
    <div className="patient-dashboard__panel-heading"><div><span className="eyebrow">Messages</span><h3>Care team conversations</h3></div><div className="guardian-messages__actions"><button className="secondary-button" type="button" onClick={() => setComposeNew((open) => !open)}>New message</button><button className="secondary-button" type="button" onClick={() => void load()}>Refresh</button></div></div>
    {error && <div className="notice notice--error" role="alert">{error}</div>}
    {composeNew && <form className="guardian-messages__compose" onSubmit={(event) => void startConversation(event)}><label className="form-field"><span>Subject (optional)</span><input className="form-input" value={newSubject} onChange={(event) => setNewSubject(event.target.value)} maxLength={200} disabled={busy} /></label><label className="form-field"><span>Message to the care team</span><textarea className="form-input" rows={3} value={newBody} onChange={(event) => setNewBody(event.target.value)} maxLength={5000} required disabled={busy} /></label><button className="primary-button" type="submit" disabled={busy || !newBody.trim()}>{busy ? 'Sending…' : 'Start conversation'}</button></form>}
    {conversations.length === 0 && !error ? <p className="patient-dashboard__empty">No conversations are available for this patient yet. The care team can start a conversation and add you.</p> : <>
      <label className="form-field"><span>Conversation</span><select className="form-input" value={selected} onChange={(event) => setSelected(event.target.value)}>{conversations.map((item) => <option value={item.id} key={item.id}>{item.subject || 'Care team conversation'}</option>)}</select></label>
      <ul className="guardian-messages__list">{messages.map((message) => <li key={message.id}><strong>{message.senderFullName || 'Care team'}</strong><p>{message.body}</p><time>{new Date(message.sentAt).toLocaleString()}</time></li>)}</ul>
      {selected && <form className="guardian-messages__compose" onSubmit={(event) => void send(event)}><label className="form-field"><span>Reply</span><textarea className="form-input" rows={3} value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} disabled={busy} /></label><button className="primary-button" type="submit" disabled={busy || !body.trim()}>{busy ? 'Sending…' : 'Send message'}</button></form>}
    </>}
  </section>
}
