import React, { useEffect, useState } from 'react';
import SupabaseDownloadButton from './SupabaseDownloadButton';

// Dummy file list for demonstration
const files = [
  { key: 'example1.pdf', name: 'Example Document 1' },
  { key: 'example2.jpg', name: 'Example Image 2' },
  { key: 'expired-file.txt', name: 'Expired File (simulate error)' },
];

export default function FilesList() {
  // Optionally, fetch files from an API here
  // const [files, setFiles] = useState([]);
  // useEffect(() => { fetch('/api/files/list').then(res => res.json()).then(setFiles); }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>My Files</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {files.map((file) => (
          <li key={file.key} style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 'bold' }}>{file.name}</div>
            <SupabaseDownloadButton fileKey={file.key} expires={60}>
              Download
            </SupabaseDownloadButton>
          </li>
        ))}
      </ul>
    </div>
  );
}
