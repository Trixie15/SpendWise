import { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Mail, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useCooldown from '../utils/useCooldown';
import PasswordInput from './PasswordInput';

const METHOD_LABEL = { email: 'Email code', totp: 'Authenticator app' };

const CodeInput = ({ id, value, onChange, backup = false }) => (
  <input
    id={id}
    required
    inputMode={backup ? 'text' : 'numeric'}
    autoComplete="one-time-code"
    maxLength={backup ? 9 : 6}
    className="input max-w-48 text-center font-mono text-lg tracking-widest"
    value={value}
    onChange={(e) => onChange(backup ? e.target.value : e.target.value.replace(/\D/g, ''))}
  />
);

export default function MfaSettings() {
  const { user, setUser } = useAuth();
  // idle | email-setup | totp-setup | codes | disable
  const [step, setStep] = useState('idle');
  const [totp, setTotp] = useState(null);
  const [emailHint, setEmailHint] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useCooldown();

  const method = user.mfaEnabled ? user.mfaMethod || 'totp' : null;

  const reset = () => {
    setStep('idle');
    setCode('');
    setPassword('');
    setTotp(null);
  };

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setBusy(false);
    }
  };

  // ----- Email -----
  const startEmail = () =>
    run(async () => {
      const res = await api.post('/auth/mfa/email/setup');
      setEmailHint(res.data.emailHint);
      setCooldown(60);
      setStep('email-setup');
      toast.success(res.data.message);
    });

  const finishEnable = (data) => {
    setBackupCodes(data.backupCodes);
    setUser({ ...user, mfaEnabled: true, mfaMethod: data.method });
    setStep('codes');
    setCode('');
    toast.success('Two-factor authentication is on');
  };

  const enableEmail = (e) => {
    e.preventDefault();
    run(async () => finishEnable((await api.post('/auth/mfa/email/enable', { code })).data));
  };

  // ----- Authenticator app -----
  const startTotp = () =>
    run(async () => {
      const res = await api.post('/auth/mfa/setup');
      setTotp(res.data);
      setStep('totp-setup');
    });

  const enableTotp = (e) => {
    e.preventDefault();
    run(async () => finishEnable((await api.post('/auth/mfa/enable', { code })).data));
  };

  // ----- Turning off -----
  const sendDisableCode = () =>
    run(async () => {
      const res = await api.post('/auth/mfa/disable/send-code');
      setCooldown(60);
      toast.success(res.data.message);
    });

  const disable = (e) => {
    e.preventDefault();
    run(async () => {
      await api.post('/auth/mfa/disable', { password, code: code.trim() });
      setUser({ ...user, mfaEnabled: false, mfaMethod: undefined });
      toast.success('Two-factor authentication is off');
      reset();
    });
  };

  const copyCodes = () => {
    navigator.clipboard?.writeText(backupCodes.join('\n'));
    toast.success('Backup codes copied');
  };

  return (
    <section className="panel space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Two-factor authentication</h2>
          <p className="text-sm text-pine-soft">
            Require a 6-digit code when you log in, so your password alone isn't enough to get in.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            method ? 'bg-jade-soft text-jade' : 'bg-canvas text-pine-soft'
          }`}
        >
          {method ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5" />}
          {method ? 'On' : 'Off'}
        </span>
      </div>

      {/* Choose a method */}
      {step === 'idle' && !method && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-line p-4">
            <Mail className="h-5 w-5 text-jade" />
            <p className="mt-2 font-semibold">Email code</p>
            <p className="mt-1 flex-1 text-sm text-pine-soft">
              We'll email you a code each time you log in. Easiest to set up.
            </p>
            <button onClick={startEmail} disabled={busy} className="btn btn-primary mt-4">
              {busy ? 'Sending…' : 'Use email'}
            </button>
          </div>
          <div className="flex flex-col rounded-xl border border-line p-4">
            <Smartphone className="h-5 w-5 text-jade" />
            <p className="mt-2 font-semibold">Authenticator app</p>
            <p className="mt-1 flex-1 text-sm text-pine-soft">
              Codes from Google Authenticator, Microsoft Authenticator or Authy. Most secure, works offline.
            </p>
            <button onClick={startTotp} disabled={busy} className="btn btn-ghost mt-4">
              Use authenticator app
            </button>
          </div>
        </div>
      )}

      {/* Enabled */}
      {step === 'idle' && method && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4">
          <p className="flex items-center gap-2 text-sm">
            {method === 'email' ? <Mail className="h-4 w-4 text-jade" /> : <Smartphone className="h-4 w-4 text-jade" />}
            Using <span className="font-semibold">{METHOD_LABEL[method]}</span>
          </p>
          <button onClick={() => setStep('disable')} className="btn btn-ghost">Turn off</button>
        </div>
      )}

      {/* Email setup */}
      {step === 'email-setup' && (
        <form onSubmit={enableEmail} className="space-y-4 rounded-xl bg-canvas p-4">
          <p className="text-sm">
            We sent a 6-digit code to <span className="font-semibold">{emailHint}</span>. Enter it below to confirm your email works.
            Check your spam folder if you don't see it.
          </p>
          <div>
            <label htmlFor="email-code" className="label">Code from your email</label>
            <CodeInput id="email-code" value={code} onChange={setCode} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={reset} className="btn btn-ghost">Cancel</button>
            <button type="button" onClick={startEmail} disabled={busy || cooldown > 0} className="btn btn-ghost">
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary">
              {busy ? 'Verifying…' : 'Turn on'}
            </button>
          </div>
        </form>
      )}

      {/* Authenticator setup */}
      {step === 'totp-setup' && totp && (
        <form onSubmit={enableTotp} className="space-y-4 rounded-xl bg-canvas p-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Open your authenticator app and scan this QR code.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <img src={totp.qrCode} alt="QR code for your authenticator app" className="h-44 w-44 rounded-lg bg-white p-2" />
            <div className="min-w-0 text-sm">
              <p className="text-pine-soft">Can't scan? Enter this key manually:</p>
              <code className="mt-1 block break-all rounded-lg bg-white px-3 py-2 font-mono text-xs">{totp.secret}</code>
            </div>
          </div>
          <div>
            <label htmlFor="totp-code" className="label">6-digit code</label>
            <CodeInput id="totp-code" value={code} onChange={setCode} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={reset} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy || code.length !== 6} className="btn btn-primary">
              {busy ? 'Verifying…' : 'Turn on'}
            </button>
          </div>
        </form>
      )}

      {/* Backup codes, shown once */}
      {step === 'codes' && (
        <div className="space-y-3 rounded-xl bg-marigold-soft p-4">
          <p className="text-sm font-semibold">Save these backup codes now. They won't be shown again.</p>
          <p className="text-sm">
            Each code works once. Use one if you can't get a code from your {method === 'email' ? 'email' : 'phone'}.
          </p>
          <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((c) => (
              <li key={c} className="rounded-lg bg-white px-3 py-2 text-center">{c}</li>
            ))}
          </ul>
          <div className="flex justify-end gap-2">
            <button onClick={copyCodes} className="btn btn-ghost"><Copy className="h-4 w-4" /> Copy</button>
            <button onClick={() => { setBackupCodes([]); reset(); }} className="btn btn-primary">I saved them</button>
          </div>
        </div>
      )}

      {/* Turn off */}
      {step === 'disable' && (
        <form onSubmit={disable} className="space-y-4 rounded-xl bg-canvas p-4">
          <p className="text-sm">Confirm it's you to turn off two-factor authentication.</p>
          <div>
            <label htmlFor="mfa-pass" className="label">Password</label>
            <PasswordInput id="mfa-pass" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div>
            <label htmlFor="mfa-dcode" className="label">
              {method === 'email' ? 'Code from your email' : 'Code from your authenticator app'} (or a backup code)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <CodeInput id="mfa-dcode" value={code} onChange={setCode} backup />
              {method === 'email' && (
                <button type="button" onClick={sendDisableCode} disabled={busy || cooldown > 0} className="btn btn-ghost">
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send code to my email'}
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={reset} className="btn btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn btn-danger">{busy ? 'Turning off…' : 'Turn off'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
