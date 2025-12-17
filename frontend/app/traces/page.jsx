"use client";
import React from "react";
import TraceViewer from "../../components/TraceViewer";

export default function TracesPage() {
  return (
    <div className="traces-page" style={{ padding: "20px" }}>
      <header className="page-header">
        <h2 style={{ marginBottom: "4px" }}>Traces</h2>
        <p className="subtitle" style={{ color: "#cbd5e1", marginBottom: "20px" }}>System traces and distributed tracing data</p>
      </header>
      <div className="traces-list">
        <TraceViewer />
      </div>
    </div>
  );
}
