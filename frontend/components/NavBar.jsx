import React from 'react';
import Link from 'next/link';

export default function NavBar({ active }) {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px', background: '#ff00ff', color: '#fff', boxShadow: '0 2px 8px #0002',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <div style={{ fontWeight: 700, fontSize: 22 }}>Multi-Gateway</div>
      <div style={{ display: 'flex', gap: 24 }}>
           <Link href="/dashboard" legacyBehavior><a style={{ color: active === 'dashboard' ? '#a78bfa' : '#fff', textDecoration: 'none', fontWeight: 500 }}>Dashboard</a></Link>
        <Link href="/files" legacyBehavior><a style={{ color: active === 'files' ? '#a78bfa' : '#fff', textDecoration: 'none', fontWeight: 500 }}>Files</a></Link>
        <Link href="/traces" legacyBehavior><a style={{ color: active === 'traces' ? '#a78bfa' : '#fff', textDecoration: 'none', fontWeight: 500 }}>Traces</a></Link>
      </div>
      <div style={{ fontWeight: 500 }}>Admin</div>
    </nav>
  );
}
