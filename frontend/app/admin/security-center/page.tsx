"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './security-center.module.css';

export default function SecurityCenter() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // Check if user is admin (client-side check for UX)
    const checkAuth = () => {
      try {
        const userCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('user='))
          ?.split('=')[1];
        
        if (userCookie) {
          const user = JSON.parse(decodeURIComponent(userCookie));
          const role = user.role;
          setUserRole(role);
          setIsAuthorized(role === 'admin' || role === 'administrator');
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthorized(false);
      }
    };

    checkAuth();
  }, []);

  if (isAuthorized === null) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>⛔ Not Authorized</h1>
          <p>You must be an administrator to access the Security Center.</p>
          <p style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.7 }}>
            Current role: {userRole || 'none'}
          </p>
        </div>
      </div>
    );
  }

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
