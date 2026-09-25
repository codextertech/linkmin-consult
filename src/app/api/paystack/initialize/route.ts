import { NextResponse } from "next/server";

import { initializePaystackTransaction } from "@/lib/consultation-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      firstName?: string;
      lastName?: string;
    };

    if (!body.email || !body.firstName || !body.lastName) {
      return NextResponse.json(
        { message: "Email, first name, and last name are required." },
        { status: 400 },
      );
    }

    const transaction = await initializePaystackTransaction({
      email: body.email,
      fullName: `${body.firstName} ${body.lastName}`.trim(),
    });

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to initialize consultation payment.",
      },
      { status: 500 },
    );
  }
}