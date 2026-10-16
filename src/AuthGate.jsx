import { cloneElement, useEffect, useState } from 'react'
import schoolLogoUrl from './assets/mfp.png'
import { hasSupabaseConfig, supabase } from './supabaseClient'
import './Auth.css'

function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(hasSupabaseConfig)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) setError('Email or password is incorrect, or this account is not enabled. Please try again or contact the administrator.')
    } catch {
      setError('We could not contact the sign-in service. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    setError('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) setError('Could not sign out. Please try again.')
  }

  if (!hasSupabaseConfig) {
    return (
      <main className="auth-page">
        <section className="auth-panel">
          <img className="auth-logo" src={schoolLogoUrl} alt="Mathurapur Free Primary School crest" />
          <p className="auth-eyebrow">SECURE RESULT CARD ACCESS</p>
          <h1>Authentication setup required</h1>
          <p className="auth-copy">Add the Supabase project URL and public anon key to your local environment, then restart the development server.</p>
          <pre className="env-example">VITE_SUPABASE_URL=https://your-project.supabase.co<br />VITE_SUPABASE_ANON_KEY=your-public-anon-key</pre>
          <p className="auth-footnote">Setup steps are in the project README. Never put a service-role key in this app.</p>
        </section>
      </main>
    )
  }

  if (loading) {
    return <main className="auth-page"><p className="auth-loading">Checking your session…</p></main>
  }

  if (session) {
    return cloneElement(children, { userEmail: session.user.email, onSignOut: signOut })
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <img className="auth-logo" src={schoolLogoUrl} alt="Mathurapur Free Primary School crest" />
        <p className="auth-eyebrow">MATHURAPUR FREE PRIMARY SCHOOL</p>
        <h1>Sign in to records</h1>
        <p className="auth-copy">Use the school email address and password assigned to your account.</p>

        <form className="auth-form" onSubmit={signIn}>
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@school.org" />
          <label htmlFor="login-password">Password</label>
          <input id="login-password" autoComplete="current-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        {error && <p className="auth-message auth-error" role="alert">{error}</p>}
        <p className="auth-footnote">Only accounts created by the school administrator can access result records.</p>
      </section>
    </main>
  )
}

export default AuthGate