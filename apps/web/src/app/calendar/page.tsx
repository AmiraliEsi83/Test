"use client";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";

export default function CalendarPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api("/api/calendar").then(setData);
  }, []);
  return (
    <Shell>
      <h2>Economic calendar</h2>
      {!data?.configured && (
        <div className="card">
          <div className="badge badge-warn">NOT CONFIGURED</div>
          <p>{data?.note || "No calendar provider. Events are not fabricated."}</p>
          <p className="muted">Set FINNHUB_API_KEY on the API to load a live calendar. Strategies can later pause around high-impact prints.</p>
        </div>
      )}
      {data?.configured && (
        <table>
          <thead>
            <tr><th>Time</th><th>Country</th><th>Event</th><th>Impact</th></tr>
          </thead>
          <tbody>
            {(data.events || []).map((e: any, i: number) => (
              <tr key={i}>
                <td>{e.time}</td>
                <td>{e.country}</td>
                <td>{e.event}</td>
                <td>{e.impact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Shell>
  );
}
