import React from 'react';
import SupabaseDownloadButton from '../../../components/SupabaseDownloadButton';

export default function FileRow({ filePath, fileName }) {
  return (
    <div className="flex items-center justify-between p-2">
      <div>{fileName}</div>
      <SupabaseDownloadButton fileKey={filePath} expires={120}>
        Download
      </SupabaseDownloadButton>
    </div>
  );
}
