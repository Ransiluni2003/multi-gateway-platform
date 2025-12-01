import { useEffect, useState } from 'react';
import axios from 'axios';

export default function DocumentsSection() {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    axios.get('/api/files/list').then((res) => setFiles(res.data));
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Documents & Reports</h2>
      <ul>
        {files.map((file) => (
          <li key={file._id} className="mb-2">
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {file.filename}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
