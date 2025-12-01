import { useState } from 'react';
import axios from 'axios';

export default function FileUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [preview, setPreview] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    // Show preview for images
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(selectedFile));
    } else {
      setPreview('');
    }
  };

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return alert('Please select a file first!');

    try {
      setStatus('Requesting upload URL...');

      // 1️⃣ Get signed upload URL from backend
      const { data } = await axios.post('/api/files/upload', {
        filename: file.name,
        uploadedBy: 'admin@example.com', // replace with real user email/id
      });

      if (!data.signedUrl) {
        setStatus('❌ Failed to get upload URL.');
        return;
      }

      // 2️⃣ Upload file directly to Supabase
      setStatus('Uploading file...');
      await fetch(data.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setStatus('✅ File uploaded successfully!');
    } catch (error) {
      console.error(error);
      setStatus('❌ Upload failed. Check console for details.');
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Upload Document</h2>

      <form onSubmit={handleUpload} className="flex flex-col space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="border border-gray-300 p-2 rounded-md"
        />

        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 object-cover rounded-md border mx-auto"
          />
        )}

        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
        >
          Upload
        </button>

        <p className="text-sm text-gray-700 text-center">{status}</p>
      </form>
    </div>
  );
}
