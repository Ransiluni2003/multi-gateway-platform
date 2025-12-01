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
  Legend
} from 'chart.js';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const FraudTrend = ({ data = [] }) => {
  // Support two data shapes:
  // 1) { date, fraudCount, refundRatio }
  // 2) { date, fraud, refund }
  const normalized = data.map((d) => {
    const fraud = d.fraud ?? d.fraudCount ?? 0;
    const refund = d.refund ?? 0;
    const refundRatio = d.refundRatio ?? (fraud + refund > 0 ? refund / (fraud + refund) : 0);
    return { date: d.date, fraud, refundRatio };
  });

  const chartData = {
    labels: normalized.map((d) => d.date),
    datasets: [
      {
        label: 'Fraud Events',
        data: normalized.map((d) => d.fraud),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false,
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Refund Ratio',
        data: normalized.map((d) => d.refundRatio),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false,
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Fraud Trend & Refund Ratio',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        title: { display: true, text: 'Count' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        ticks: {
          callback: (v) => `${Math.round(Number(v) * 100)}%`,
        },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Refund Ratio' },
      },
    },
  };

  return <Line data={chartData} options={options} />;
};

export default FraudTrend;
