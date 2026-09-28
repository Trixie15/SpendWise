import { useState } from 'react';
import toast from 'react-hot-toast';
import api, { getError } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../utils/format';
import { isStrongPassword } from '../utils/passwordPolicy';
import PasswordInput from '../components/PasswordInput';
import PasswordChecklist from '../components/PasswordChecklist';
import MfaSettings from '../components/MfaSettings';
import DataPrivacySettings from '../components/DataPrivacySettings';

export default function Settings() {
  const { user, setUser, replaceToken } = useAuth();
  const [profile, setProfile] = useState({ name: user.name, currency: user.currency || 'PHP' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/me', { name: profile.name.trim(), currency: profile.currency });
      setUser(res.data);
      toast.success('Profile saved');
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const canChangePassword =
    passwords.currentPassword &&
    isStrongPassword(passwords.newPassword) &&
    passwords.newPassword === passwords.confirm;

  const changePassword = async (e) => {
    e.preventDefault();
    if (!canChangePassword) return;
    setSavingPassword(true);
    try {
      const res = await api.put('/auth/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      replaceToken(res.data.token);
      toast.success(res.data.message);
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-pine-soft">Manage your profile, security and privacy.</p>
      </div>

      <form onSubmit={saveProfile} className="panel space-y-4">
        <h2 className="text-lg font-bold">Profile</h2>
        <div>
          <label htmlFor="s-name" className="label">Name</label>
          <input
            id="s-name"
            required
            maxLength={50}
            className="input"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="s-email" className="label">Email</label>
          <input id="s-email" disabled className="input bg-canvas text-pine-soft" value={user.email} />
        </div>
        <div>
          <label htmlFor="s-currency" className="label">Currency</label>
          <select
            id="s-currency"
            className="input"
            value={profile.currency}
            onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-pine-soft">Changes how amounts are displayed. It does not convert existing amounts.</p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingProfile} className="btn btn-primary">
            {savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="panel space-y-4">
        <div>
          <h2 className="text-lg font-bold">Change password</h2>
          <p className="text-sm text-pine-soft">You'll stay logged in here. Other devices will be signed out.</p>
        </div>
        <div>
          <label htmlFor="s-current" className="label">Current password</label>
          <PasswordInput
            id="s-current"
            required
            autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="s-new" className="label">New password</label>
          <PasswordInput
            id="s-new"
            required
            maxLength={128}
            autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
          />
          <PasswordChecklist password={passwords.newPassword} />
        </div>
        <div>
          <label htmlFor="s-confirm" className="label">Confirm new password</label>
          <PasswordInput
            id="s-confirm"
            required
            maxLength={128}
            autoComplete="new-password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          />
          {passwords.confirm && passwords.newPassword !== passwords.confirm && (
            <p className="mt-1.5 text-xs text-rose">Passwords do not match</p>
          )}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={savingPassword || !canChangePassword} className="btn btn-primary">
            {savingPassword ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>

      <MfaSettings />
      <DataPrivacySettings />
    </div>
  );
}
