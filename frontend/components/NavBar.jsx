"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 32px', background: '#ff00ff', color: '#fff', boxShadow: '0 2px 8px #0002',
      position: 'sticky', top: 0, zIndex: 100
    }}>
      <div style={{ fontWeight: 700, fontSize: 22 }}>Multi-Gateway</div>
      <div style={{ display: 'flex', gap: 24 }}>
        <Link href="/dashboard" legacyBehavior>
          <a className={pathname === '/dashboard' ? 'active' : ''} style={{ textDecoration: 'none', transition: 'background 0.2s' }}>Dashboard</a>
        </Link>
        <Link href="/files" legacyBehavior>
          <a className={pathname === '/files' ? 'active' : ''} style={{ textDecoration: 'none', transition: 'background 0.2s' }}>Files</a>
        </Link>
        <Link href="/download-test" legacyBehavior>
          <a className={pathname === '/download-test' ? 'active' : ''} style={{ textDecoration: 'none', transition: 'background 0.2s' }}>Downloads</a>
        </Link>
        <Link href="/traces" legacyBehavior>
          <a className={pathname === '/traces' ? 'active' : ''} style={{ textDecoration: 'none', transition: 'background 0.2s' }}>Traces</a>
        </Link>
      </div>
      <div style={{ fontWeight: 500 }}>Admin</div>
    </nav>
  );
}
