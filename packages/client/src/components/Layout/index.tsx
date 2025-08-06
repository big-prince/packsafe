import * as React from 'react';
import { Link, Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">
          <Link to="/">PackSafe</Link>
        </div>
        <nav className="main-navigation">
          <ul>
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/projects">Projects</Link>
            </li>
            <li>
              <Link to="/vulnerabilities">Vulnerabilities</Link>
            </li>
            <li>
              <Link to="/licenses">Licenses</Link>
            </li>
            <li>
              <Link to="/settings">Settings</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>
          © {new Date().getFullYear()} PackSafe - Secure Dependency Management
        </p>
      </footer>
    </div>
  );
};
