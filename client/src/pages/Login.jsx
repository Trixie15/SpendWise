import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ShieldCheck, Smartphone } from 'lucide-react';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useCooldown from '../utils/useCooldown';
import AuthShell from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';

const NOTICES = {
  expired: 'Your session ended. Please log in again.',
  disabled: 'This account has been disabled. Contact the administrator.',
};

export default function Login() {
  const { user, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfa, setMfa] = useState(null); // { mfaToken, method, emailHint, emailSent }
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useCooldown();

  if (user) return <Navigate to="/dashboard" replace />;
  const notice = NOTICES[params.get('reason')];

  const backToLogin = () => {
    setMfa(null);
    setCode('');
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await login(form.email, form.password);
      if (result.mfaRequired) {
        setMfa(result);
        setForm((f) => ({ ...f, password: '' }));
        if (result.method === 'email') {
          if (result.emailSent) setCooldown(60);
          else toast.error("We couldn't send the email. Press Resend, or use a backup code.");
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await verifyMfa(mfa.mfaToken, code.trim());
      navigate('/dashboard');
    } catch (err) {
      const message = getError(err);
      toast.error(message);
      if (/timed out|log in again|locked/i.test(message)) backToLogin();
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    try {
      const res = await api.post('/auth/mfa/resend', { mfaToken: mfa.mfaToken });
      toast.success(res.data.message);
      setCooldown(60);
      setCode('');
    } catch (err) {
      toast.error(getError(err));
      if (/timed out|log in again/i.test(getError(err))) backToLogin();
    }
  };

  if (mfa) {
    const isEmail = mfa.method === 'email';
    return (
      <AuthShell
        title={isEmail ? 'Check your email' : 'Two-factor check'}
        subtitle={isEmail ? `We sent a 6-digit code to ${mfa.emailHint}.` : 'Enter the 6-digit code from your authenticator app.'}
      >
        <form onSubmit={handleCode} className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-jade-soft p-3 text-sm">
            {isEmail ? <Mail className="h-5 w-5 shrink-0 text-jade" /> : <Smartphone className="h-5 w-5 shrink-0 text-jade" />}
            <span>
              Your password was correct. One more step to keep your account safe.
              {isEmail && ' The code expires in 5 minutes. Check your spam folder too.'}
            </span>
          </div>
          <div>
            <label htmlFor="code" className="label">Verification code</label>
            <input
              id="code"
              required
              autoFocus
              autoComplete="one-time-code"
              maxLength={9}
              className="input text-center font-mono text-2xl tracking-widest"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-pine-soft">
              {isEmail ? "Can't get into your email?" : 'Lost your phone?'} Enter one of your backup codes (e.g. A1B2-C3D4).
            </p>
          </div>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            <ShieldCheck className="h-4 w-4" />
            {submitting ? 'Verifying…' : 'Verify and log in'}
          </button>
          {isEmail && (
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="btn btn-ghost w-full"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          )}
          <button type="button" onClick={backToLogin} className="w-full text-sm font-semibold text-pine-soft hover:text-pine">
            Back to login
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to check on your spending.">
      {notice && <p className="mb-4 rounded-xl bg-marigold-soft p-3 text-sm">{notice}</p>}
      <form onSubmit={handlePassword} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            className="input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <PasswordInput
            id="password"
            required
            maxLength={128}
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <button type="submit" disabled={submitting} className="btn btn-primary w-full">
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-pine-soft">
        New to SpendWise?{' '}
        <Link to="/register" className="font-semibold text-jade hover:underline">Create an account</Link>
      </p>
    </AuthShell>
  );
}
