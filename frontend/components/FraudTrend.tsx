'use client';

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FraudTrendData {
  date?: string;
  fraud?: number;
  fraudCount?: number;
  refund?: number;
  refundCount?: number;
  payment?: number;
  paymentCount?: number;
  refundRatio?: number;
  refundPercentage?: number;
  [key: string]: any;
}

interface FraudTrendProps {
  data?: FraudTrendData[];
}

const FraudTrend: React.FC<FraudTrendProps> = ({ data = [] }) => {
  // Support both old and new data formats
  console.log('FraudTrend data:', data);
  
  const normalized = data.map((d) => {
    const fraud = d.fraud ?? d.fraudCount ?? 0;
    const refund = d.refund ?? d.refundCount ?? 0;
    const payment = d.payment ?? d.paymentCount ?? 0;
    
    // Use refundRatio if available, otherwise calculate from refund data
    let refundRatio = d.refundRatio ?? (d.refundPercentage ? (d.refundPercentage / 100) : 0);
    if (refundRatio === 0 && (refund > 0 || payment > 0)) {
      refundRatio = payment > 0 ? refund / payment : 0;
    }
    
    return {
      date: d.date,
      fraud,
      refundRatio,
      refundPercentage: (refundRatio * 100).toFixed(1)
    };
  });

  const chartData = {
    labels: normalized.map((d) => {
      // Format date for better readability
      const dateObj = new Date(d.date + 'T00:00:00Z');
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Fraud Events',
        data: normalized.map((d) => d.fraud),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        yAxisID: 'y',
      },
      {
        label: 'Refund Ratio (%)',
        data: normalized.map((d) => parseFloat((d.refundRatio * 100).toFixed(1))),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.15)',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 7,
        yAxisID: 'y1',
      },
    ],
  };

  const options: any = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500' as const
          }
        },
      },
      title: {
        display: true,
        text: 'Fraud Trend & Refund Ratio (14-Day View)',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 13, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          label: function(context: any) {
            if (context.datasetIndex === 0) {
              return `Fraud Events: ${context.parsed.y}`;
            } else {
              return `Refund Ratio: ${context.parsed.y}%`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: {
          display: true,
          text: 'Fraud Count',
          font: { size: 12, weight: 'bold' }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (v: any) => `${v}%`,
        },
        grid: {
          drawOnChartArea: false,
        },
        title: {
          display: true,
          text: 'Refund Ratio (%)',
          font: { size: 12, weight: 'bold' }
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        }
      }
    },
  };

  if (!normalized.length) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
        No fraud/refund data available. Generate test transactions to see trends.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default FraudTrend;
