"use client";

import type {
  PaystackCallbacks,
  PaystackError,
  default as PaystackConstructor,
  PaystackTransaction,
} from "@paystack/inline-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import {
  countWords,
  initialConsultationFormValues,
  MAX_MEDICAL_REPORT_SIZE_BYTES,
  MAX_PHONE_LENGTH,
  validateConsultationValues,
  type ConsultationFormValues,
} from "@/lib/consultation-fields";

type PaymentState =
  | {
      status: "idle";
      reference: null;
    }
  | {
      status: "verifying" | "paid";
      reference: string;
    };

export default function Home() {
  const router = useRouter();
  const [formState, setFormState] = useState<ConsultationFormValues>(
    initialConsultationFormValues,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: "idle",
    reference: null,
  });
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const medicalDescriptionWordCount = countWords(formState.medicalDescription);
  const formValidationMessage = validateConsultationValues(formState);
  const isFormComplete = Object.values(formState).every(
    (value) => value.trim().length > 0,
  );
  const isPaymentActionEnabled =
    isFormComplete &&
    !formValidationMessage &&
    acknowledged &&
    !isInitializingPayment &&
    !isSubmitting &&
    paymentState.status !== "verifying";

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "medicalDescription" && countWords(value) > 1000) {
      return;
    }

    if (name === "phoneNumber" || name === "whatsappNumber") {
      value = value.replace(/\D/g, "").slice(0, MAX_PHONE_LENGTH);
    }

    if (name === "email") {
      value = value.trim().toLowerCase();
    }

    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [name]: value,
      };

      if (sameAsPhone && name === "phoneNumber") {
        nextState.whatsappNumber = value;
      }

      return nextState;
    });
  };

  const handleSameAsPhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;

    setSameAsPhone(isChecked);
    setFormState((currentState) => ({
      ...currentState,
      whatsappNumber: isChecked ? currentState.phoneNumber : currentState.whatsappNumber,
    }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    const oversizedFile = nextFiles.find(
      (file) => file.size > MAX_MEDICAL_REPORT_SIZE_BYTES,
    );

    if (oversizedFile) {
      setErrorMessage("Each uploaded file must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setErrorMessage(null);
    setSelectedFiles(nextFiles);
  };

  const submitConsultation = async (paymentReference: string) => {
    setIsSubmitting(true);

    const body = new FormData();

    Object.entries(formState).forEach(([key, value]) => {
      body.append(key, value);
    });

    body.append("paymentReference", paymentReference);
    selectedFiles.forEach((file) => body.append("medicalReports", file));

    const response = await fetch("/api/consultation/submit", {
      method: "POST",
      body,
    });
    const payload = (await response.json()) as {
      message?: string;
      submissionId?: string;
    };

    if (!response.ok || !payload.submissionId) {
      throw new Error(payload.message ?? "Unable to submit consultation.");
    }

    setFormState(initialConsultationFormValues);
    setSelectedFiles([]);
    setSameAsPhone(false);
    setAcknowledged(false);
    setPaymentState({ status: "idle", reference: null });
    router.push(`/thank-you?name=${encodeURIComponent(formState.firstName)}`);
  };

  const verifyPayment = async (reference: string) => {
    setPaymentState({ status: "verifying", reference });

    const response = await fetch(
      `/api/paystack/verify?reference=${encodeURIComponent(reference)}`,
      {
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as {
      message?: string;
      reference?: string;
      status?: string;
    };

    if (!response.ok || payload.status !== "success" || !payload.reference) {
      throw new Error(payload.message ?? "Unable to verify consultation payment.");
    }

    setPaymentState({ status: "paid", reference: payload.reference });
  };

  const handleConsultFee = async () => {
    try {
      setErrorMessage(null);

      if (formValidationMessage) {
        setErrorMessage(formValidationMessage);
        return;
      }

      setIsInitializingPayment(true);

      const response = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formState.email,
          firstName: formState.firstName,
          lastName: formState.lastName,
        }),
      });
      const payload = (await response.json()) as {
        accessCode?: string;
        message?: string;
        publicKey?: string;
        reference?: string;
      };

      if (
        !response.ok ||
        !payload.accessCode ||
        !payload.publicKey ||
        !payload.reference
      ) {
        throw new Error(payload.message ?? "Unable to start consultation payment.");
      }

      const { default: PaystackPop } = (await import(
        "@paystack/inline-js"
      )) as {
        default: typeof PaystackConstructor;
      };

      const popup = new PaystackPop();

      const callbacks: PaystackCallbacks = {
        onSuccess: async (paymentResponse: PaystackTransaction) => {
          try {
            await verifyPayment(paymentResponse.reference);
            setIsInitializingPayment(false);
            await submitConsultation(paymentResponse.reference);
          } catch (error) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "Unable to verify consultation payment.",
            );
          } finally {
            setIsInitializingPayment(false);
          }
        },
        onCancel: () => {
          setIsInitializingPayment(false);
        },
        onError: (error: PaystackError) => {
          setPaymentState({ status: "idle", reference: null });
          setErrorMessage(error.message ?? "Unable to start consultation payment.");
          setIsInitializingPayment(false);
        },
      };

      popup.resumeTransaction(payload.accessCode, callbacks);
    } catch (error) {
      setPaymentState({ status: "idle", reference: null });
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to start consultation payment.",
      );
      setIsInitializingPayment(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setErrorMessage(null);

      if (formValidationMessage) {
        setErrorMessage(formValidationMessage);
        return;
      }

      if (!acknowledged) {
        setErrorMessage("Accept the terms and conditions before submitting.");
        return;
      }

      if (paymentState.status === "paid" && paymentState.reference) {
        await submitConsultation(paymentState.reference);
        return;
      }

      await handleConsultFee();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to submit consultation.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8 lg:p-10">
        <section className="space-y-4 rounded-lg bg-gradient-to-r from-[#0f766e] via-[#115e59] to-[#1f2937] p-5 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
            Linkmi Nigeria
          </p>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight whitespace-nowrap sm:text-4xl">
              Consultation Form
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-emerald-50/90 sm:text-base">
              This is a confidential form between you and Linkmi Nigeria. Please
              ensure all entered information is accurate before submitting your
              consultation request.
            </p>
          </div>
        </section>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <section className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">First Name <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                name="firstName"
                placeholder="Enter your first name"
                value={formState.firstName}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Last Name <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                name="lastName"
                placeholder="Enter your last name"
                value={formState.lastName}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Phone Number <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                type="tel"
                inputMode="numeric"
                name="phoneNumber"
                placeholder="Enter your phone number"
                value={formState.phoneNumber}
                onChange={handleInputChange}
                required
              />
            </label>

            <div className="space-y-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">WhatsApp Number <span className="text-red-600">*</span></span>
                <input
                  className="field-input"
                  type="tel"
                  inputMode="numeric"
                  name="whatsappNumber"
                  placeholder="Enter your WhatsApp number"
                  value={formState.whatsappNumber}
                  onChange={handleInputChange}
                  disabled={sameAsPhone}
                  required
                />
              </label>
              <label className="inline-flex items-center gap-3 text-sm text-slate-600">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                  type="checkbox"
                  checked={sameAsPhone}
                  onChange={handleSameAsPhoneChange}
                />
                Same as phone number
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Email <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                type="email"
                inputMode="email"
                name="email"
                placeholder="Enter your email address"
                value={formState.email}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Country of Residence <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                name="countryOfResidence"
                placeholder="Enter your country of residence"
                value={formState.countryOfResidence}
                onChange={handleInputChange}
                required
              />
            </label>
          </section>

          <section className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-800">
                Medical Condition
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Brief descriptions of Medication condition
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Share enough detail for the medical team to understand your current
                condition, symptoms, and any treatment history relevant to this consultation.
              </p>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Title <span className="text-red-600">*</span></span>
              <input
                className="field-input"
                name="medicalCondition"
                placeholder="State the medical condition"
                value={formState.medicalCondition}
                onChange={handleInputChange}
                required
              />
            </label>

            <label className="mt-4 space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Brief descriptions of Medication condition <span className="text-red-600">*</span>
              </span>
              <textarea
                className="field-input min-h-56 resize-y"
                name="medicalDescription"
                placeholder="Provide a detailed description of your medical condition"
                value={formState.medicalDescription}
                onChange={handleInputChange}
                required
              />
            </label>
            <p className="text-right text-sm text-slate-500">
              {medicalDescriptionWordCount}/1000 words
            </p>
          </section>

          <section className="space-y-5 rounded-lg border border-dashed border-teal-200 bg-teal-50/70 p-5 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Upload Medical Reports</h2>
              <p className="text-sm leading-6 text-slate-600">
                Attach any recent reports, scans, prescriptions, or test results that
                can support your consultation request.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-teal-300 bg-white px-6 py-10 text-center text-sm text-slate-600 transition hover:border-teal-500 hover:bg-teal-50">
              <span className="text-base font-semibold text-slate-900">Choose files to upload</span>
              <span className="mt-2 max-w-md leading-6">
                Upload PDF, JPG, JPEG, or PNG files from your device. Maximum 5MB per file.
              </span>
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileChange}
              />
            </label>
            {selectedFiles.length > 0 ? (
              <p className="text-sm text-slate-600">
                {selectedFiles.length} file(s) selected: {selectedFiles.map((file) => file.name).join(", ")}
              </p>
            ) : null}
          </section>

          <section className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/95 p-4 text-slate-50 shadow-[0_16px_50px_rgba(15,23,42,0.28)] backdrop-blur sm:p-6">
            {errorMessage ? (
              <p className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            {!isPaymentActionEnabled ? (
              <p className="text-sm leading-6 text-slate-300">
                Complete every field and accept the terms to activate payment.
              </p>
            ) : null}

            <label className="flex items-start gap-3 text-sm leading-6 text-slate-200">
              <input
                className="mt-1 h-4 w-4 rounded border-slate-400 text-teal-500 focus:ring-teal-400"
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>
                By ticking this box, I confirm that the information provided is correct
                and I agree to the{" "}
                <Link
                  className="font-semibold text-emerald-300 underline decoration-emerald-300/60 underline-offset-4"
                  href="/terms-and-conditions"
                >
                  Terms and Conditions
                </Link>
                .
              </span>
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-300 disabled:cursor-not-allowed disabled:border-slate-500 disabled:bg-slate-900 disabled:text-slate-400 sm:w-auto"
                type="submit"
                disabled={!isPaymentActionEnabled}
              >
                {isSubmitting
                  ? "Submitting..."
                  : isInitializingPayment
                    ? "Preparing Payment..."
                    : paymentState.status === "verifying"
                      ? "Verifying Payment..."
                      : paymentState.status === "paid"
                        ? "Retry Consultation Submission"
                        : "Click to Pay Consult fee: N5000"}
              </button>
              {/* <button type="submit">Submit Consultation</button> */}
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
