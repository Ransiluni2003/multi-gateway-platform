"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './security-center.module.css';

export default function SecurityCenter() {
  const router = useRouter();

  const sections = [
    {
      title: 'Audit Explorer',
      description: 'Search and filter audit logs with advanced filtering by date range, action type, actor, and target. Export results to CSV.',
      path: '/admin/security-center/audit-explorer',
      icon: '📋'
    },
    {
      title: 'Rate Limit Monitor',
      description: 'View rate limiting statistics, blocked requests in the last 24 hours, top endpoints being rate-limited, and current limiter mode.',
      path: '/admin/security-center/rate-limit-monitor',
      icon: '🚦'
    },
    {
      title: 'Session & Token Tools',
      description: 'Manage user sessions and tokens. View active sessions, invalidate all sessions for a user, and monitor token versions.',
      path: '/admin/security-center/session-tools',
      icon: '🔑'
    }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🛡️ Security Center</h1>
        <p>Comprehensive security monitoring and management</p>
      </div>

      <div className={styles.nav}>
        {sections.map((section) => (
          <div
            key={section.path}
            className={styles.navCard}
            onClick={() => router.push(section.path)}
          >
            <h2>{section.icon} {section.title}</h2>
            <p>{section.description}</p>
          </div>
        ))}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Admin Dashboard</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Use the cards above to navigate to different security monitoring tools.
          </p>
        </div>
      </div>
    </div>
  );
}
