"use client";

/**
 * WaitlistForm — client component for the landing page waitlist.
 * POSTs to /api/public/waitlist.
 */

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        const json = (await res.json()) as { error?: { message?: string } };
        setErrorMsg(json.error?.message ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="banner banner-info" style={{ marginTop: "1rem" }}>
        You're on the list! We'll be in touch when your spot opens.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="waitlist-form">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-label="Email address"
        disabled={status === "loading"}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={status === "loading" || !email}
      >
        {status === "loading" ? "Joining…" : "Join waitlist"}
      </button>
      {status === "error" && (
        <p className="field-error" style={{ width: "100%" }}>
          {errorMsg}
        </p>
      )}
    </form>
  );
}
