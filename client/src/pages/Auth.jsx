import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Auth({ mode }) {
  const isRegister = mode === 'register';
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={redirectTo} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (isRegister) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="home">
      <form className="card" onSubmit={submit}>
        <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        <p className="muted">{isRegister ? 'Sign up to start watching together.' : 'Log in to join your party.'}</p>

        {isRegister && (
          <>
            <label>Name</label>
            <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" />
          </>
        )}

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
        />

        <button className="btn block" disabled={busy} type="submit">
          {isRegister ? 'Sign up' : 'Log in'}
        </button>

        {error && <p className="error">{error}</p>}

        <p className="muted switch">
          {isRegister ? (
            <>
              Already have an account? <Link to="/login" state={location.state}>Log in</Link>
            </>
          ) : (
            <>
              New here? <Link to="/register" state={location.state}>Create an account</Link>
            </>
          )}
        </p>
      </form>
    </main>
  );
}
