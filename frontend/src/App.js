import './App.css';
import React, { useState } from 'react';
import FilesPage from './pages/FilesPage';
import Dashboard from './pages/Dashboard';
import NavBar from './components/NavBar';
import TraceViewer from './admin/TraceViewer';

function App() {
  const [route, setRoute] = useState('dashboard');

  return (
    <div className="App">
      <NavBar active={route} onChange={setRoute} />
      <main className="main">
        {route === 'dashboard' && <Dashboard />}
        {route === 'files' && <FilesPage />}
        {route === 'traces' && <TraceViewer />}
      </main>
    </div>
  );
}

export default App;
