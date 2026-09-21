"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card pad stack">
      <h1>This page failed</h1>
      <p>{error.message}</p>
      <button className="btn" type="button" onClick={reset}>Try again</button>
    </div>
  );
}
