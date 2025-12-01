import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function FraudChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const res = await fetch("/api/fraud/trend");
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading…</div>;

  return (
    <LineChart width={800} height={300} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="fraud" stroke="#ff0000" />
      <Line type="monotone" dataKey="refund" stroke="#0000ff" />
    </LineChart>
  );
}
