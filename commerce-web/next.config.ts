import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: ".",
  },
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // Security Headers Configuration
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Content Security Policy (CSP) - Basic, Non-Breaking
          // WHY: Prevents XSS attacks by controlling which resources can load
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",                    // Only load from same origin by default
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com", // Allow inline scripts (Next.js needs it), Stripe
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Allow inline styles (MUI needs it)
              "img-src 'self' data: https: blob:",     // Allow images from anywhere (product images)
              "font-src 'self' https://fonts.gstatic.com", // Google Fonts
              "connect-src 'self' https://api.stripe.com https://*.supabase.co", // API calls to self, Stripe, Supabase
              "frame-src 'self' https://js.stripe.com", // Stripe payment frames
              "object-src 'none'",                     // Block Flash/plugins
              "base-uri 'self'",                       // Prevent <base> tag hijacking
              "form-action 'self'",                    // Forms can only submit to same origin
              "frame-ancestors 'none'",                // Cannot be embedded in iframe (same as X-Frame-Options)
              "upgrade-insecure-requests",             // Force HTTPS
            ].join('; '),
          },
          
          // X-Frame-Options - Prevents Clickjacking
          // WHY: Stops attackers from embedding your site in iframe to trick users
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Cannot be embedded in ANY iframe
          },
          
          // X-Content-Type-Options - Prevents MIME Sniffing
          // WHY: Stops browsers from guessing file types (attackers could upload .txt that executes as .js)
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          
          // Referrer-Policy - Controls Referrer Header
          // WHY: Prevents leaking sensitive URLs to external sites
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', // Send origin only on cross-origin, full URL on same-origin
          },
          
          // Permissions-Policy - Lock Down Browser Features
          // WHY: Prevents malicious scripts from accessing camera/mic/geolocation
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',           // No camera access by default
              'microphone=()',       // No microphone access by default
              'geolocation=()',      // No location access by default
              'payment=(self)',      // Allow payment API only from same origin (Stripe)
              'usb=()',              // No USB access
              'magnetometer=()',     // No sensor access
              'accelerometer=()',
              'gyroscope=()',
            ].join(', '),
          },
          
          // X-DNS-Prefetch-Control - Controls DNS Prefetching
          // WHY: Privacy - prevents browser from leaking which domains you might visit
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          
          // Strict-Transport-Security (HSTS) - Force HTTPS
          // WHY: Forces browsers to always use HTTPS (prevents downgrade attacks)
          // NOTE: Only enable this in production with real HTTPS
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains', // 1 year
          }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
