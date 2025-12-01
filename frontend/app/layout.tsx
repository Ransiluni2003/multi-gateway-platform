import '../App.css';
import NavBar from '../components/NavBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Determine active route for highlighting (basic example, can be improved)
  let active = 'dashboard';
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/files')) active = 'files';
    else if (window.location.pathname.startsWith('/traces')) active = 'traces';
  }
  return (
    <html lang="en">
      <body>
        <NavBar active={active} />
        {children}
      </body>
    </html>
  );
}
