import React from 'react';

export default function NavBar({ active, onChange }) {
  return (
    <nav className="nav">
      <div className="brand">Multi-Gateway</div>
      <ul className="nav-links">
        <li className={active === 'dashboard' ? 'active' : ''} onClick={() => onChange('dashboard')}>Dashboard</li>
        <li className={active === 'files' ? 'active' : ''} onClick={() => onChange('files')}>Files</li>
        <li className={active === 'traces' ? 'active' : ''} onClick={() => onChange('traces')}>Traces</li>
      </ul>
      <div className="user">Admin</div>
    </nav>
  );
}
