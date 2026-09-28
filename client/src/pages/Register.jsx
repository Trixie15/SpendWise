import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getError } from '../api/axios';
import { isStrongPassword } from '../utils/passwordPolicy';
import AuthShell from '../components/AuthShell';
import PasswordInput from '../components/PasswordInput';
import PasswordChecklist from '../components/PasswordChecklist';

const NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', consent: false });
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const nameValid = form.name.trim().length >= 2 && NAME_PATTERN.test(form.name.trim());
  const strong = isStrongPassword(form.password);
  const matches = form.password === form.confirm;
  const canSubmit = nameValid && strong && matches && form.consent && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.consent);
      toast.success('Account created');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="We only ask for what we need.">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="label">Name</label>
          <input
            id="name"
            required
            maxLength={50}
            autoComplete="name"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {form.name && !nameValid && (
            <p className="mt-1.5 text-xs text-rose">Use 2–50 letters. Spaces, dots, apostrophes and hyphens are allowed.</p>
          )}
        </div>
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
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <PasswordChecklist password={form.password} />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <PasswordInput
            id="confirm"
            required
            maxLength={128}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
          {form.confirm && !matches && <p className="mt-1.5 text-xs text-rose">Passwords do not match</p>}
        </div>

        <label className="flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            required
            className="mt-0.5 h-4 w-4 accent-jade"
            checked={form.consent}
            onChange={(e) => setForm({ ...form, consent: e.target.checked })}
          />
          <span>
            I have read and agree to the{' '}
            <Link to="/privacy" target="_blank" className="font-semibold text-jade hover:underline">Privacy Policy</Link>
            {' '}and consent to SpendWise processing my data to provide expense tracking.
          </span>
        </label>

        <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-pine-soft">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-jade hover:underline">Log in</Link>
      </p>
    </AuthShell>
  );
}
