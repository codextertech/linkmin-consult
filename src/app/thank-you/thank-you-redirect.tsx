"use client";

import Link from "next/link";
import { useEffect } from "react";

const REDIRECT_DELAY_MS = 10_000;
const REDIRECT_URL = "https://linkmi.com.ng";

export function ThankYouRedirect() {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.location.href = REDIRECT_URL;
    }, REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-7 text-slate-500">
        You will be redirected in 10 seconds.
      </p>
      <Link
        className="inline-flex h-11 items-center justify-center rounded-lg bg-teal-700 px-5 text-sm font-semibold text-white transition hover:bg-teal-800"
        href={REDIRECT_URL}
      >
        Click to Leave page
      </Link>
    </div>
  );
}