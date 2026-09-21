"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    api<any>("/api/activity").then((d) => setLogs(d.logs));
  }, []);
  return (
    <Shell>
      <h2>Activity / audit</h2>
      <table>
        <thead>
          <tr><th>Time</th><th>Action</th><th>Detail</th></tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.createdAt).toLocaleString()}</td>
              <td>{l.action}</td>
              <td>{l.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}
