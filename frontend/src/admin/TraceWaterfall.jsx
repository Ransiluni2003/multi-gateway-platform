import React from 'react';

export default function TraceWaterfall({ spans }) {
  if (!spans || spans.length === 0) {
    return <div>No spans to display.</div>;
  }

  // Find the earliest start time and latest end time
  const minStart = Math.min(...spans.map(s => s.startTime));
  const maxEnd = Math.max(...spans.map(s => s.startTime + s.duration));
  const totalDuration = maxEnd - minStart;

  return (
    <div style={{ border: '1px solid #ccc', padding: 10 }}>
      <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Waterfall View</div>
      <div style={{ position: 'relative', height: spans.length * 32 }}>
        {spans.map((span, idx) => {
          const left = ((span.startTime - minStart) / totalDuration) * 100;
          const width = (span.duration / totalDuration) * 100;
          return (
            <div
              key={span.id || idx}
              style={{
                position: 'absolute',
                top: idx * 32,
                left: `${left}%`,
                width: `${width}%`,
                height: 24,
                background: '#4fd1c5',
                borderRadius: 4,
                color: '#222',
                padding: '0 8px',
                display: 'flex',
                alignItems: 'center',
                fontSize: 14,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
              }}
              title={`Name: ${span.name}\nStart: ${span.startTime}\nDuration: ${span.duration}`}
            >
              {span.name} ({span.duration}μs)
            </div>
          );
        })}
      </div>
    </div>
  );
}
