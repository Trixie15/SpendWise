import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-extrabold text-jade">404</p>
      <h1 className="mt-2 text-2xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 text-pine-soft">Check the address, or head back to your dashboard.</p>
      <Link to="/dashboard" className="btn btn-primary mt-6">Go to dashboard</Link>
    </div>
  );
}
