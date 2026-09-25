"use client";

import Link from "next/link";
import { ChangeEvent, useState } from "react";

type FormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  countryOfResidence: string;
  medicalCondition: string;
  medicalDescription: string;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  countryOfResidence: "",
  medicalCondition: "",
  medicalDescription: "",
};

function countWords(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue.split(/\s+/).length;
}

export default function Home() {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const medicalDescriptionWordCount = countWords(formState.medicalDescription);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;

    if (name === "medicalDescription" && countWords(value) > 1000) {
      return;
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

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[32px] border border-white/60 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur sm:p-8 lg:p-10">
        <section className="space-y-4 rounded-[28px] bg-gradient-to-r from-[#0f766e] via-[#115e59] to-[#1f2937] p-6 text-white sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-100">
            Linkmi Nigeria
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Consultation Form
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-emerald-50/90 sm:text-base">
              This is a confidential form between you and Linkmi Nigeria. Please
              ensure all inputted information is accurate before submitting your
              consultation request.
            </p>
          </div>
        </section>

        <form className="space-y-8">
          <section className="grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">First Name</span>
              <input
                className="field-input"
                name="firstName"
                placeholder="Enter your first name"
                value={formState.firstName}
                onChange={handleInputChange}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Last Name</span>
              <input
                className="field-input"
                name="lastName"
                placeholder="Enter your last name"
                value={formState.lastName}
                onChange={handleInputChange}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Phone Number</span>
              <input
                className="field-input"
                name="phoneNumber"
                placeholder="Enter your phone number"
                value={formState.phoneNumber}
                onChange={handleInputChange}
              />
            </label>

            <div className="space-y-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">WhatsApp Number</span>
                <input
                  className="field-input"
                  name="whatsappNumber"
                  placeholder="Enter your WhatsApp number"
                  value={formState.whatsappNumber}
                  onChange={handleInputChange}
                  disabled={sameAsPhone}
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
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                className="field-input"
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formState.email}
                onChange={handleInputChange}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Country of Residence</span>
              <input
                className="field-input"
                name="countryOfResidence"
                placeholder="Enter your country of residence"
                value={formState.countryOfResidence}
                onChange={handleInputChange}
              />
            </label>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
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
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                className="field-input"
                name="medicalCondition"
                placeholder="State the medical condition"
                value={formState.medicalCondition}
                onChange={handleInputChange}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Brief descriptions of Medication condition
              </span>
              <textarea
                className="field-input min-h-56 resize-y"
                name="medicalDescription"
                placeholder="Provide a detailed description of your medical condition"
                value={formState.medicalDescription}
                onChange={handleInputChange}
              />
            </label>
            <p className="text-right text-sm text-slate-500">
              {medicalDescriptionWordCount}/1000 words
            </p>
          </section>

          <section className="space-y-5 rounded-[28px] border border-dashed border-teal-200 bg-teal-50/70 p-5 sm:p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-900">Upload Medical Reports</h2>
              <p className="text-sm leading-6 text-slate-600">
                Attach any recent reports, scans, prescriptions, or test results that
                can support your consultation request.
              </p>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-teal-300 bg-white px-6 py-10 text-center text-sm text-slate-600 transition hover:border-teal-500 hover:bg-teal-50">
              <span className="text-base font-semibold text-slate-900">Choose files to upload</span>
              <span className="mt-2 max-w-md leading-6">
                Upload PDF, JPG, JPEG, or PNG files from your device.
              </span>
              <input
                className="sr-only"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
              />
            </label>
          </section>

          <section className="space-y-4 rounded-[24px] bg-slate-950 p-5 text-slate-50 sm:p-6">
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
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition hover:border-emerald-300 hover:text-emerald-300"
                type="button"
              >
                Consult Fee
              </button>
              <button
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald-300 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
                type="submit"
                disabled={!acknowledged}
              >
                Submit Consultation
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
