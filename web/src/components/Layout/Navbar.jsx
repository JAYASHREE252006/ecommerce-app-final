import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const THEME_CYCLE = { light: 'dark', dark: 'system', system: 'light' };
const THEME_ICON = { light: '☀️', dark: '🌙', system: '🖥️' };
const THEME_LABEL = { light: 'Light', dark: 'Dark', system: 'System' };

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(THEME_CYCLE[theme])}
      aria-label={`Theme: ${THEME_LABEL[theme]}. Click to change.`}
      title={`Theme: ${THEME_LABEL[theme]} (click to change)`}
      className="rounded-full border border-line px-3 py-1 text-xs text-ink/70 hover:text-ink"
    >
      {THEME_ICON[theme]} {THEME_LABEL[theme]}
    </button>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="font-display text-xl tracking-tight">
          Marketplace
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <ThemeToggle />
          {user && (
            <Link to="/cart" className="text-ink/70 hover:text-ink">
              Cart
            </Link>
          )}
          {user && (
            <Link to="/orders" className="text-ink/70 hover:text-ink">
              My Orders
            </Link>
          )}
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
              <Link to="/register" className="rounded-full bg-primary px-4 py-1.5 text-white hover:bg-primary/90">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
