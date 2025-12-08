"use client";
import React from "react";
import TraceViewer from "../../components/TraceViewer";

export default function TracesPage() {
  return (
    <div className="traces-page">
      <header className="page-header">
        <h2>Traces</h2>
        <p className="subtitle">System traces and distributed tracing data</p>
      </header>
      <div className="traces-list">
        <TraceViewer />
      </div>
    </div>
  );
}
