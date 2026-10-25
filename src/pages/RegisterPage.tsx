import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { patientApi } from '../api/patientApi'
import { careServiceApi } from '../api/careServiceApi'
import { getTenantDomain } from '../api/authApi'
import { useAuthStore } from '../stores/authStore'
import type { CareLocationType, RegisterPatientAccountRequest, Sex } from '../types/patient'
import type { CareServiceCatalogItem } from '../types/careService'

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setSession = useAuthStore((s) => s.setSession)

  const [domain] = useState(() =>
    new URLSearchParams(location.search).get('domain')?.trim() || getTenantDomain(),
  )
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [sex, setSex] = useState<Sex>(1)
  const [careLocationType, setCareLocationType] = useState<CareLocationType>(1)
  const [requestedServiceId, setRequestedServiceId] = useState<string>('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [nextOfKinFullName, setNextOfKinFullName] = useState('')
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState('')
  const [nextOfKinPhoneNumber, setNextOfKinPhoneNumber] = useState('')
  const [nextOfKinEmail, setNextOfKinEmail] = useState('')
  const [email, setEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [services, setServices] = useState<CareServiceCatalogItem[]>([])
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Try to load care service catalog for preview if user/tenant has access
  useEffect(() => {
    let active = true
    const clinicDomain = domain.trim()
    if (!clinicDomain) {
      setServices([])
      return () => { active = false }
    }
    careServiceApi
      .getCatalog(clinicDomain)
      .then((items) => {
        if (active) setServices(items)
      })
      .catch(() => {
        // Unauthenticated public users might not have tenant-scoped catalog access yet
        if (active) setServices([])
      })
    return () => {
      active = false
    }
  }, [domain])

  function validate(): boolean {
    const errors: Record<string, string> = {}

    if (!domain.trim()) errors.domain = 'Clinic domain is required.'
    if (!firstName.trim()) errors.firstName = 'First name is required.'
    if (!lastName.trim()) errors.lastName = 'Last name is required.'

    if (!dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required.'
    } else {
      const dobDate = new Date(`${dateOfBirth}T00:00:00`)
      if (dobDate >= new Date()) {
        errors.dateOfBirth = 'Date of birth must be in the past.'
      }
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address.'
    }

    if (!userName.trim()) errors.userName = 'Choose a username.'
    else if (!/^[a-zA-Z0-9._-]{3,50}$/.test(userName.trim())) errors.userName = 'Use 3–50 letters, numbers, periods, underscores, or hyphens.'

    if (!password) {
      errors.password = 'Password is required.'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.'
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) return

    setSubmitting(true)
    try {
      const request: RegisterPatientAccountRequest = {
        domain: domain.trim(),
        email: email.trim(),
        userName: userName.trim(),
        password,
        firstName: firstName.trim(),
        middleName: middleName.trim() || undefined,
        lastName: lastName.trim(),
        dateOfBirth,
        sex,
        careLocationType,
        requestedServiceId: requestedServiceId || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        country: country.trim() || undefined,
        nextOfKinFullName: nextOfKinFullName.trim() || undefined,
        nextOfKinRelationship: nextOfKinRelationship.trim() || undefined,
        nextOfKinPhoneNumber: nextOfKinPhoneNumber.trim() || undefined,
        nextOfKinEmail: nextOfKinEmail.trim() || undefined,
      }

      const response = await patientApi.registerAccount(request)
      setSession(response)
      navigate('/app/registration-fee', { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 409) {
          setSubmitError('That email or username is already in use. Please sign in or choose another username.')
        } else if (err.response?.status === 401) {
          setSubmitError('Invalid clinic domain. Please verify your clinic domain.')
        } else {
          const message = (err.response?.data as { message?: string })?.message
          setSubmitError(message ?? 'Failed to submit registration. Please check your information.')
        }
      } else {
        setSubmitError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="register-page">
      <section className="register-card" aria-labelledby="register-title">
        <div className="register-card__brand" aria-hidden="true">✦</div>
        <h1 className="register-card__title" id="register-title">Patient Registration</h1>
        <p className="register-card__subtitle">Create your personal patient portal account</p>

        {submitError && (
          <div className="form-submit-error" role="alert" aria-live="polite">
            {submitError}
          </div>
        )}

        <form className="register-form" onSubmit={handleSubmit} noValidate>
          {/* Personal Information */}
          <fieldset className="register-fieldset">
            <legend className="register-legend">Personal Details</legend>
            <div className="register-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="reg-firstName">First Name *</label>
                <input
                  id="reg-firstName"
                  type="text"
                  className={`form-input${fieldErrors.firstName ? ' form-input--error' : ''}`}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.firstName && <span className="form-error">{fieldErrors.firstName}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-middleName">Middle Name</label>
                <input
                  id="reg-middleName"
                  type="text"
                  className="form-input"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-lastName">Last Name *</label>
                <input
                  id="reg-lastName"
                  type="text"
                  className={`form-input${fieldErrors.lastName ? ' form-input--error' : ''}`}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.lastName && <span className="form-error">{fieldErrors.lastName}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-dob">Date of Birth *</label>
                <input
                  id="reg-dob"
                  type="date"
                  className={`form-input${fieldErrors.dateOfBirth ? ' form-input--error' : ''}`}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.dateOfBirth && <span className="form-error">{fieldErrors.dateOfBirth}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-sex">Sex</label>
                <select
                  id="reg-sex"
                  className="form-input"
                  value={sex}
                  onChange={(e) => setSex(Number(e.target.value) as Sex)}
                  disabled={submitting}
                >
                  <option value={1}>Male</option>
                  <option value={2}>Female</option>
                  <option value={3}>Other</option>
                  <option value={4}>Prefer not to say</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-location">Care Preference</label>
                <select
                  id="reg-location"
                  className="form-input"
                  value={careLocationType}
                  onChange={(e) => setCareLocationType(Number(e.target.value) as CareLocationType)}
                  disabled={submitting}
                >
                  <option value={1}>Facility / Clinic</option>
                  <option value={2}>Home Care</option>
                </select>
              </div>
            </div>

            {services.length > 0 && (
              <div className="form-field register-service-field">
                <label className="form-label" htmlFor="reg-service">Desired Clinical Service</label>
                <select
                  id="reg-service"
                  className="form-input"
                  value={requestedServiceId}
                  onChange={(e) => setRequestedServiceId(e.target.value)}
                  disabled={submitting}
                >
                  <option value="">General Onboarding / Assessment</option>
                  {services.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name} {svc.price ? `(₦${svc.price.toLocaleString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>

          <fieldset className="register-fieldset">
              <legend className="register-legend">Contact & Emergency Contact</legend>
              <div className="register-grid">
                <label className="form-field">Phone number<input className="form-input" type="tel" autoComplete="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} /></label>
                <label className="form-field">Address<input className="form-input" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
                <label className="form-field">City<input className="form-input" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} /></label>
                <label className="form-field">State / Province<input className="form-input" autoComplete="address-level1" value={state} onChange={(e) => setState(e.target.value)} /></label>
                <label className="form-field">Country<input className="form-input" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} /></label>
                <label className="form-field">Next of kin full name<input className="form-input" value={nextOfKinFullName} onChange={(e) => setNextOfKinFullName(e.target.value)} /></label>
                <label className="form-field">Relationship<input className="form-input" value={nextOfKinRelationship} onChange={(e) => setNextOfKinRelationship(e.target.value)} /></label>
                <label className="form-field">Next of kin phone<input className="form-input" type="tel" value={nextOfKinPhoneNumber} onChange={(e) => setNextOfKinPhoneNumber(e.target.value)} /></label>
                <label className="form-field">Next of kin email<input className="form-input" type="email" value={nextOfKinEmail} onChange={(e) => setNextOfKinEmail(e.target.value)} /></label>
              </div>
          </fieldset>

          {/* Credentials */}
          <fieldset className="register-fieldset">
            <legend className="register-legend">Portal Login Credentials</legend>
            <div className="register-grid">
            <div className="form-field">
              <label className="form-label" htmlFor="reg-email">Email Address *</label>
              <input
                id="reg-email"
                type="email"
                className={`form-input${fieldErrors.email ? ' form-input--error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                autoComplete="email"
                disabled={submitting}
              />
              {fieldErrors.email && <span className="form-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="reg-username">Choose a Username *</label>
              <input id="reg-username" type="text" className={`form-input${fieldErrors.userName ? ' form-input--error' : ''}`} value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="e.g. ada.okafor" autoComplete="username" disabled={submitting} />
              {fieldErrors.userName && <span className="form-error">{fieldErrors.userName}</span>}
            </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-password">Password *</label>
                <input
                  id="reg-password"
                  type="password"
                  className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {fieldErrors.password && <span className="form-error">{fieldErrors.password}</span>}
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="reg-confirm">Confirm Password *</label>
                <input
                  id="reg-confirm"
                  type="password"
                  className={`form-input${fieldErrors.confirmPassword ? ' form-input--error' : ''}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={submitting}
                />
                {fieldErrors.confirmPassword && <span className="form-error">{fieldErrors.confirmPassword}</span>}
              </div>
            </div>
          </fieldset>

          <button
            type="submit"
            className="register-btn"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Submitting Registration…' : 'Complete Registration'}
          </button>
        </form>

        <div className="register-footer">
          <span>Already registered? </span>
          <Link to="/login" className="register-link">
            Sign in to your account
          </Link>
          <span> · Are you a guardian? </span><Link to="/guardian/register" className="register-link">Create a guardian account</Link>
        </div>
      </section>
    </main>
  )
}
