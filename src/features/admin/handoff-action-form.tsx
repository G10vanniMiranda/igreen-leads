"use client";

import { useRef, useState, type FormEvent } from "react";

export function HandoffActionForm({
  action,
  actionId: initialActionId,
  label,
  pendingLabel,
  variant = "primary",
}: Readonly<{
  action: string;
  actionId: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}>) {
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState(initialActionId);
  const submissionLock = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submissionLock.current) {
      event.preventDefault();
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    window.setTimeout(() => {
      setActionId(crypto.randomUUID());
      setSubmitting(false);
      submissionLock.current = false;
    }, 1500);
  }

  return (
    <form action={action} method="post" target="_blank" rel="noopener noreferrer" onSubmit={handleSubmit}>
      <input type="hidden" name="actionId" value={actionId} />
      <button type="submit" disabled={submitting} className={`admin-action-button admin-action-${variant}`}>
        {submitting ? pendingLabel : label}
      </button>
    </form>
  );
}
