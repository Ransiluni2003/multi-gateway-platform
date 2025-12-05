
import React from "react";
import FileRow from "../components/FileRow";

export default function FilesPage() {
  const files = [
    { fileName: "invoice-1.pdf", filePath: "uploads/invoice-1.pdf" },
    { fileName: "report-2.pdf", filePath: "uploads/report-2.pdf" }
  ];
  return (
    <div className="files-page">
      <header className="page-header">
        <h2>Your Files</h2>
        <p className="subtitle">Uploaded documents and downloads</p>
      </header>

      <div className="files-list">
        {files.map(f => (
          <FileRow 
            key={f.filePath}
            fileName={f.fileName}
            filePath={f.filePath}
          />
        ))}
      </div>
    </div>
  );
}
