"use client";

import { useEffect } from "react";

const REDIRECT_DELAY_MS = 20_000;
const REDIRECT_URL = "https://linkmi.com.ng";

export function ThankYouRedirect() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <p className="text-sm leading-7 text-slate-500">
      You will be redirected in 20 seconds.
    </p>
  );
}