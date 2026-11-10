import { useState } from 'react';
import { api } from '../api.js';
import { QUESTIONS } from '../constants.js';

// Login / Register / Forgot password in one simple screen.
export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [step, setStep] = useState(1); // forgot: 1 = username, 2 = answer + new password
  const [f, setF] = useState({ username: '', password: '', question: QUESTIONS[0], answer: '', newPassword: '', confirm: '' });
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState('');

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const go = (m) => { setMode(m); setStep(1); setErr(''); setMsg(''); };

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'login') {
        onAuth(await api.login({ username: f.username, password: f.password }));
      } else if (mode === 'register') {
        if (f.password !== f.confirm) throw new Error('Passwords do not match');
        onAuth(await api.register({
          username: f.username, password: f.password, securityQuestion: f.question, securityAnswer: f.answer
        }));
      } else if (step === 1) {
        const r = await api.forgot(f.username);
        setQuestion(r.question);
        setStep(2);
      } else {
        if (f.newPassword !== f.confirm) throw new Error('Passwords do not match');
        await api.reset({ username: f.username, answer: f.answer, newPassword: f.newPassword });
        setF({ ...f, password: '', answer: '', newPassword: '', confirm: '' });
        go('login');
        setMsg('Password changed. Please log in.');
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Forgot password';

  return (
    <section className="login">
      <div className="login-art">
        <div className="brand" style={{ color: '#EAF0F5' }}><i /> Trade Journal</div>
        <div>
          <h1>Every trade, written down.</h1>
          <p>Log entries, exits and sessions. See which strategy actually pays.</p>
        </div>
        <div className="mini-strip" aria-hidden="true">
          <div><span className="b" style={{ width: '30%', background: '#46B870' }} />Sydney</div>
          <div><span className="b" style={{ width: '45%', background: '#5A9CEB', marginLeft: '20%' }} />Tokyo</div>
          <div><span className="b" style={{ width: '50%', background: '#9A70E6', marginLeft: '45%' }} />London</div>
          <div><span className="b" style={{ width: '60%', background: '#EE625F', marginLeft: '62%' }} />New York</div>
        </div>
      </div>
      <div className="login-form">
        <form className="login-card" onSubmit={submit}>
          <div className="brand dark" style={{ marginBottom: 4 }}><i /> Trade Journal</div>
          <h2>{title}</h2>

          {(mode !== 'forgot' || step === 1) && (
            <div>
              <label className="lbl" htmlFor="u">Username</label>
              <input id="u" type="text" autoComplete="username" autoCapitalize="none" value={f.username} onChange={set('username')} required />
            </div>
          )}

          {mode === 'login' && (
            <div>
              <label className="lbl" htmlFor="p">Password</label>
              <input id="p" type="password" autoComplete="current-password" value={f.password} onChange={set('password')} required />
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="lbl" htmlFor="p">Password</label>
                <input id="p" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} required />
                <div className="hint">At least 6 characters</div>
              </div>
              <div>
                <label className="lbl" htmlFor="c">Confirm password</label>
                <input id="c" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required />
              </div>
              <div>
                <label className="lbl" htmlFor="q">Security question</label>
                <select id="q" value={f.question} onChange={set('question')}>
                  {QUESTIONS.map((q) => <option key={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl" htmlFor="a">Your answer</label>
                <input id="a" type="text" value={f.answer} onChange={set('answer')} required />
                <div className="hint">Used if you forget your password</div>
              </div>
            </>
          )}

          {mode === 'forgot' && step === 2 && (
            <>
              <p style={{ margin: 0 }}><b>{question}</b></p>
              <div>
                <label className="lbl" htmlFor="a">Your answer</label>
                <input id="a" type="text" value={f.answer} onChange={set('answer')} required />
              </div>
              <div>
                <label className="lbl" htmlFor="np">New password</label>
                <input id="np" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} required />
              </div>
              <div>
                <label className="lbl" htmlFor="c">Confirm new password</label>
                <input id="c" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required />
              </div>
            </>
          )}

          {err && <p className="err" role="alert">{err}</p>}
          {msg && <p className="ok">{msg}</p>}

          <button className="btn primary" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Register' : step === 1 ? 'Continue' : 'Change password'}
          </button>
          {busy && <p className="hint">The free server may take up to a minute to wake up.</p>}

          <div className="link-row">
            {mode === 'login' ? (
              <>
                <button type="button" className="link" onClick={() => go('register')}>New here? Register</button>
                <button type="button" className="link" onClick={() => go('forgot')}>Forgot password?</button>
              </>
            ) : (
              <button type="button" className="link" onClick={() => go('login')}>Back to log in</button>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}
