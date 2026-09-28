import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-bold">{title}</h2>
    <div className="space-y-2 text-pine-soft">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <div className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link to="/login" aria-label="Back to SpendWise"><Logo /></Link>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-sm text-pine-soft">Version 1.0 · SpendWise Expense Tracker System</p>
        </div>

        <Section title="What we collect">
          <p>
            <strong className="text-pine">Account:</strong> your name, email address and password. Your password is stored
            only as a secure bcrypt hash, so no one, including administrators, can read it.
          </p>
          <p>
            <strong className="text-pine">Financial records you enter:</strong> transactions (amount, category, date, payment
            method, optional note), categories and budgets.
          </p>
          <p>
            <strong className="text-pine">Security data:</strong> last login time, failed login counts (to block password
            guessing) and, if you turn it on, an encrypted two-factor authentication key.
          </p>
        </Section>

        <Section title="What we don't collect">
          <p>
            We don't ask for your phone number, address, birthday, bank account or card numbers. We don't track your location,
            use advertising cookies, or share or sell your data to anyone.
          </p>
        </Section>

        <Section title="Why we use it">
          <p>
            Your data is used only to provide expense tracking: showing your balance, charts and budget alerts, and keeping your
            account secure. It is not used for any other purpose.
          </p>
        </Section>

        <Section title="Who can see it">
          <p>
            Only you can see your transactions, categories and budgets. Administrators can manage accounts (for example,
            disabling an account) and see names, emails and account status, but they cannot view anyone's financial records.
          </p>
        </Section>

        <Section title="How it's protected">
          <p>
            Passwords are hashed, two-factor keys are encrypted, sessions expire automatically, and accounts lock after repeated
            failed logins. Every request is checked so users can only access their own data.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the Philippine Data Privacy Act of 2012 (Republic Act No. 10173), you have the right to be informed, to access,
            correct and erase your data, and to data portability. In SpendWise you can:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Correct your name and preferences in Settings</li>
            <li>Download a copy of all your data in Settings</li>
            <li>Permanently delete your account and all your data in Settings, which also withdraws your consent</li>
          </ul>
        </Section>

        <Section title="How long we keep it">
          <p>
            Your data is kept while your account exists. When you delete your account, your profile and all your records are
            deleted immediately and permanently.
          </p>
        </Section>

        <Link to="/register" className="btn btn-primary">Back</Link>
      </div>
    </div>
  );
}
