"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card pad stack">
      <h1>Something went wrong</h1>
      <p className="muted">The page didn't load. Your expenses are still saved.</p>
      <button className="btn" type="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
