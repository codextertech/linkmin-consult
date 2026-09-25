import { createHash, randomUUID } from "node:crypto";
import { google } from "googleapis";

import {
  consultationFieldNames,
  MAX_MEDICAL_REPORT_SIZE_BYTES,
  type ConsultationFormValues,
} from "@/lib/consultation-fields";

type CloudinaryUploadResult = {
  originalName: string;
  secureUrl: string;
  bytes: number;
  contentType: string;
};

type PaystackInitializeResponse = {
  accessCode: string;
  amountInKobo: number;
  publicKey: string;
  reference: string;
};

export type PaystackVerification = {
  amountInKobo: number;
  paidAt: string | null;
  reference: string;
  status: string;
};

const DEFAULT_CONSULTATION_FEE_KOBO = 500_000;
const CLOUDINARY_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getConsultationFeeInKobo() {
  const rawValue = process.env.CONSULTATION_FEE_KOBO;

  if (!rawValue) {
    return DEFAULT_CONSULTATION_FEE_KOBO;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error("CONSULTATION_FEE_KOBO must be a positive integer.");
  }

  return parsedValue;
}

function getGooglePrivateKey() {
  const privateKey = getRequiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n").trim();

  const isStructuredKey =
    privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
    privateKey.includes("-----END PRIVATE KEY-----");

  if (!isStructuredKey || privateKey.includes("...")) {
    throw new Error(
      "GOOGLE_PRIVATE_KEY is not a valid full service account private key.",
    );
  }

  return `${privateKey}\n`;
}

function createCloudinarySignature(
  params: Record<string, number | string>,
  apiSecret: string,
) {
  const payload = Object.entries(params)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function buildSubmissionRow(args: {
  submissionId: string;
  values: ConsultationFormValues;
  uploads: CloudinaryUploadResult[];
  payment: PaystackVerification;
  emailSent: boolean;
}) {
  const { submissionId, values, uploads, payment, emailSent } = args;

  return [
    new Date().toISOString(),
    submissionId,
    values.firstName,
    values.lastName,
    values.phoneNumber,
    values.whatsappNumber,
    values.email,
    values.countryOfResidence,
    values.medicalCondition,
    values.medicalDescription,
    uploads.map((file) => file.originalName).join(", "),
    uploads.map((file) => file.secureUrl).join("\n"),
    payment.reference,
    payment.status,
    String(payment.amountInKobo),
    payment.paidAt ?? "",
    emailSent ? "sent" : "skipped",
  ];
}

async function getGoogleSheetsClient() {
  const auth = new google.auth.JWT({
    email: getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
    key: getGooglePrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();

  return google.sheets({ version: "v4", auth });
}

async function getFirstSheetTitle() {
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEET_ID");
  const sheets = await getGoogleSheetsClient();
  const response = await sheets.spreadsheets.get({ spreadsheetId });
  const title = response.data.sheets?.[0]?.properties?.title;

  if (!title) {
    throw new Error("Google Sheet does not contain a writable sheet tab.");
  }

  return title;
}

export function extractConsultationValues(source: FormData) {
  const values = {} as ConsultationFormValues;

  for (const fieldName of consultationFieldNames) {
    const fieldValue = source.get(fieldName);

    values[fieldName] = typeof fieldValue === "string" ? fieldValue.trim() : "";
  }

  return values;
}

export async function initializePaystackTransaction(args: {
  email: string;
  fullName: string;
}) {
  const amountInKobo = getConsultationFeeInKobo();
  const secretKey = getRequiredEnv("PAYSTACK_SECRET_KEY");
  const publicKey = getRequiredEnv("PAYSTACK_PUBLIC_KEY");

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInKobo,
      currency: "NGN",
      email: args.email,
      metadata: {
        custom_fields: [
          {
            display_name: "Full Name",
            variable_name: "full_name",
            value: args.fullName,
          },
        ],
      },
    }),
  });

  const payload = await response.json();

  if (!response.ok || !payload.status || !payload.data?.reference) {
    throw new Error(payload.message ?? "Unable to initialize Paystack transaction.");
  }

  return {
    accessCode: payload.data.access_code,
    amountInKobo,
    publicKey,
    reference: payload.data.reference,
  } satisfies PaystackInitializeResponse;
}

export async function verifyPaystackTransaction(reference: string) {
  const secretKey = getRequiredEnv("PAYSTACK_SECRET_KEY");
  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    },
  );

  const payload = await response.json();

  if (!response.ok || !payload.status || !payload.data?.reference) {
    throw new Error(payload.message ?? "Unable to verify Paystack transaction.");
  }

  return {
    amountInKobo: payload.data.amount,
    paidAt: payload.data.paid_at ?? null,
    reference: payload.data.reference,
    status: payload.data.status,
  } satisfies PaystackVerification;
}

export async function uploadFilesToCloudinary(
  files: File[],
  submissionId: string,
) {
  const cloudName = getRequiredEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = getRequiredEnv("CLOUDINARY_API_KEY");
  const apiSecret = getRequiredEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `linkmi-consultations/${submissionId}`;
  const signature = createCloudinarySignature({ folder, timestamp }, apiSecret);

  return Promise.all(
    files.map(async (file) => {
      if (!CLOUDINARY_ALLOWED_TYPES.has(file.type)) {
        throw new Error(`Unsupported file type received: ${file.type || file.name}`);
      }

      if (file.size > MAX_MEDICAL_REPORT_SIZE_BYTES) {
        throw new Error("Each uploaded file must be 5MB or smaller.");
      }

      const body = new FormData();

      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("folder", folder);
      body.append("signature", signature);
      body.append("timestamp", String(timestamp));

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        {
          method: "POST",
          body,
        },
      );

      const payload = await response.json();

      if (!response.ok || !payload.secure_url) {
        throw new Error(payload.error?.message ?? "Cloudinary upload failed.");
      }

      return {
        originalName: file.name,
        secureUrl: payload.secure_url,
        bytes: payload.bytes ?? file.size,
        contentType: file.type,
      } satisfies CloudinaryUploadResult;
    }),
  );
}

export async function appendConsultationToSheet(args: {
  submissionId: string;
  values: ConsultationFormValues;
  uploads: CloudinaryUploadResult[];
  payment: PaystackVerification;
  emailSent: boolean;
}) {
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEET_ID");
  const sheets = await getGoogleSheetsClient();
  const title = await getFirstSheetTitle();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${title}!A:Q`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [buildSubmissionRow(args)],
    },
  });
}

export async function sendAdminNotification(args: {
  submissionId: string;
  values: ConsultationFormValues;
  uploads: CloudinaryUploadResult[];
  payment: PaystackVerification;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!resendApiKey || !adminEmail) {
    return false;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? "Linkmi Consult <onboarding@resend.dev>";
  const fileLinks = args.uploads.length
    ? args.uploads
        .map((file) => `<li><a href="${file.secureUrl}">${file.originalName}</a></li>`)
        .join("")
    : "<li>No files uploaded</li>";

  const html = `
    <div>
      <h2>New consultation submission</h2>
      <p><strong>Submission ID:</strong> ${args.submissionId}</p>
      <p><strong>Name:</strong> ${args.values.firstName} ${args.values.lastName}</p>
      <p><strong>Email:</strong> ${args.values.email}</p>
      <p><strong>Phone:</strong> ${args.values.phoneNumber}</p>
      <p><strong>WhatsApp:</strong> ${args.values.whatsappNumber}</p>
      <p><strong>Country:</strong> ${args.values.countryOfResidence}</p>
      <p><strong>Medical condition:</strong> ${args.values.medicalCondition}</p>
      <p><strong>Description:</strong></p>
      <p>${args.values.medicalDescription.replace(/\n/g, "<br />")}</p>
      <p><strong>Payment reference:</strong> ${args.payment.reference}</p>
      <p><strong>Payment status:</strong> ${args.payment.status}</p>
      <p><strong>Paid at:</strong> ${args.payment.paidAt ?? "n/a"}</p>
      <p><strong>Uploaded reports:</strong></p>
      <ul>${fileLinks}</ul>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [adminEmail],
      subject: `New consultation: ${args.values.firstName} ${args.values.lastName}`,
      html,
    }),
  });

  if (!response.ok) {
    const payload = await response.text();

    throw new Error(
      payload
        ? `Unable to send admin notification email: ${payload}`
        : "Unable to send admin notification email.",
    );
  }

  return true;
}

export function createSubmissionId() {
  return randomUUID();
}