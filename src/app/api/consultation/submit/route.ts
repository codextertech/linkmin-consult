import { NextResponse } from "next/server";

import { validateConsultationValues } from "@/lib/consultation-fields";
import {
  appendConsultationToSheet,
  createSubmissionId,
  extractConsultationValues,
  uploadFilesToCloudinary,
  verifyPaystackTransaction,
} from "@/lib/consultation-server";

export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getGoogleSheetsErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  if (message.toLowerCase().includes("caller does not have permission")) {
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

    if (serviceAccountEmail) {
      return `Google Sheets access denied. Share the target spreadsheet with ${serviceAccountEmail} as an editor, then retry.`;
    }

    return "Google Sheets access denied. Share the target spreadsheet with the configured service account as an editor, then retry.";
  }

  return `Google Sheets append failed: ${message}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const values = extractConsultationValues(formData);
    const paymentReference = formData.get("paymentReference");
    const files = formData
      .getAll("medicalReports")
      .filter((file): file is File => file instanceof File && file.size > 0);

    const validationMessage = validateConsultationValues(values);

    if (validationMessage) {
      return NextResponse.json({ message: validationMessage }, { status: 400 });
    }

    if (typeof paymentReference !== "string" || !paymentReference.trim()) {
      return NextResponse.json(
        { message: "Verified consultation payment is required before submission." },
        { status: 400 },
      );
    }

    const payment = await verifyPaystackTransaction(paymentReference);

    if (payment.status !== "success") {
      return NextResponse.json(
        { message: "Payment verification did not return a successful status." },
        { status: 400 },
      );
    }

    const submissionId = createSubmissionId();
    let uploads: Awaited<ReturnType<typeof uploadFilesToCloudinary>> = [];

    try {
      uploads = await uploadFilesToCloudinary(files, submissionId);
    } catch (error) {
      console.error("Consultation file upload failed", {
        error: getErrorMessage(error),
        submissionId,
      });
    }

    const emailSent = false;

    try {
      await appendConsultationToSheet({
        submissionId,
        values,
        uploads,
        payment,
        emailSent,
      });
    } catch (error) {
      const message = getErrorMessage(error);

      console.error("Consultation sheet append failed", {
        error: message,
        submissionId,
      });

      return NextResponse.json(
        {
          message: getGoogleSheetsErrorMessage(error),
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      emailSent,
      message: "Consultation submitted successfully.",
      submissionId,
    });
  } catch (error) {
    console.error("Consultation submission failed", {
      error: getErrorMessage(error),
    });

    return NextResponse.json(
      {
        message: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}