"use client";

import { useState } from "react";

export function PasswordField({
  name,
  label,
  autoComplete,
  minLength = 8,
}: {
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{label}</span>
      <span className="pw">
        <input name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength} maxLength={72} />
        <button type="button" onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

export function ConfirmButton({ label, message, className }: { label: string; message: string; className?: string }) {
  return (
    <button
      className={className ?? "btn danger small"}
      type="submit"
      onClick={(event) => {
        if (!confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
