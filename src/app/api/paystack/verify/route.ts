import { NextResponse } from "next/server";

import { verifyPaystackTransaction } from "@/lib/consultation-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference) {
    return NextResponse.json(
      { message: "Payment reference is required." },
      { status: 400 },
    );
  }

  try {
    const verification = await verifyPaystackTransaction(reference);

    return NextResponse.json(verification);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to verify consultation payment.",
      },
      { status: 500 },
    );
  }
}