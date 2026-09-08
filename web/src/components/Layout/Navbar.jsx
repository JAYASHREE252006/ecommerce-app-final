import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-xl tracking-tight">
          Marketplace
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <span className="text-ink/60">Hi, {user.name.split(' ')[0]}</span>
              <button onClick={logout} className="text-ink/70 underline-offset-2 hover:underline">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-ink/70 hover:text-ink">
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-ink px-4 py-1.5 text-white hover:bg-ink/90"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
