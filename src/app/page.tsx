"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import PhoneInput, {
  getCountries,
  getCountryCallingCode,
  type Country,
  type Value,
} from "react-phone-number-input/input";
import countryLabels from "react-phone-number-input/locale/en.json";
import Select, { type SingleValue, type StylesConfig } from "react-select";

import {
  countWords,
  initialConsultationFormValues,
  MAX_MEDICAL_REPORT_SIZE_BYTES,
  requiredConsultationFieldNames,
  validateConsultationValues,
  type ConsultationFormValues,
} from "@/lib/consultation-fields";

type CountryOption = {
  dialCode: string;
  flag: string;
  label: string;
  name: string;
  value: Country;
};

function getFlagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => {
    const name = countryLabels[code];

    if (!name) {
      return null;
    }

    return {
      dialCode: `+${getCountryCallingCode(code)}`,
      flag: getFlagEmoji(code),
      label: `${name} (+${getCountryCallingCode(code)})`,
      name,
      value: code,
    } satisfies CountryOption;
  })
  .filter((option): option is CountryOption => option !== null)
  .sort((left, right) => left.name.localeCompare(right.name));

const COUNTRY_CODE_TO_NAME = new Map(
  COUNTRY_OPTIONS.map((option) => [option.value, option.name]),
);

const COUNTRY_NAME_TO_CODE = new Map(
  COUNTRY_OPTIONS.map((option) => [option.name.toLowerCase(), option.value]),
);

const countrySelectStyles: StylesConfig<CountryOption, false> = {
  control: (baseStyles, state) => ({
    ...baseStyles,
    minHeight: "3.25rem",
    borderRadius: "12px",
    borderColor: state.isFocused ? "#0f766e" : "#cbd5e1",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    boxShadow: state.isFocused ? "0 0 0 4px rgba(15, 118, 110, 0.12)" : "none",
    paddingLeft: "0.25rem",
    paddingRight: "0.25rem",
    transition: "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
    ":hover": {
      borderColor: state.isFocused ? "#0f766e" : "#cbd5e1",
    },
  }),
  dropdownIndicator: (baseStyles, state) => ({
    ...baseStyles,
    color: state.isFocused ? "#0f766e" : "#64748b",
    padding: "0 0.5rem",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  input: (baseStyles) => ({
    ...baseStyles,
    color: "#0f172a",
    margin: 0,
    padding: 0,
  }),
  menu: (baseStyles) => ({
    ...baseStyles,
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
    overflow: "hidden",
  }),
  option: (baseStyles, state) => ({
    ...baseStyles,
    backgroundColor: state.isFocused ? "#ecfeff" : "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    padding: "0.75rem 1rem",
  }),
  placeholder: (baseStyles) => ({
    ...baseStyles,
    color: "#94a3b8",
  }),
  singleValue: (baseStyles) => ({
    ...baseStyles,
    color: "#0f172a",
  }),
  valueContainer: (baseStyles) => ({
    ...baseStyles,
    minHeight: "3.25rem",
    padding: "0.25rem 0.75rem",
  }),
};

function getCountryCodeFromResidence(countryOfResidence: string) {
  return COUNTRY_NAME_TO_CODE.get(countryOfResidence.trim().toLowerCase());
}

function getCountryName(country: Country) {
  return COUNTRY_CODE_TO_NAME.get(country) ?? country;
}

function buildPhonePlaceholder(selectedCountry: Country | undefined, label: string) {
  if (!selectedCountry) {
    return `Select country, then enter your ${label.toLowerCase()}`;
  }

  const option = COUNTRY_OPTIONS.find((countryOption) => countryOption.value === selectedCountry);

  return option ? `${option.dialCode} ${label}` : `Enter your ${label.toLowerCase()}`;
}

function renderCountryOption(option: CountryOption) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="text-base leading-none">
        {option.flag}
      </span>
      <span>{option.name}</span>
      <span className="text-sm text-slate-500">{option.dialCode}</span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [formState, setFormState] = useState<ConsultationFormValues>(
    initialConsultationFormValues,
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedCountry = getCountryCodeFromResidence(formState.countryOfResidence);
  const selectedCountryOption = COUNTRY_OPTIONS.find(
    (countryOption) => countryOption.value === selectedCountry,
  ) ?? null;
  const medicalDescriptionWordCount = countWords(formState.medicalDescription);
  const formValidationMessage = validateConsultationValues(formState);
  const isFormComplete = requiredConsultationFieldNames.every(
    (fieldName) => formState[fieldName].trim().length > 0,
  );
  const isSubmissionEnabled =
    isFormComplete &&
    !formValidationMessage &&
    acknowledged &&
    !isSubmitting;

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name } = event.target;
    let { value } = event.target;

    if (name === "medicalDescription" && countWords(value) > 1000) {
      return;
    }

    if (name === "email") {
      value = value.trim().toLowerCase();
    }

    setFormState((currentState) => {
      const nextState = {
        ...currentState,
        [name]: value,
      };

      return nextState;
    });
  };

  const handleCountryChange = (nextCountryOption: SingleValue<CountryOption>) => {
    const nextCountryName = nextCountryOption?.name ?? "";

    setFormState((currentState) => ({
      ...currentState,
      countryOfResidence: nextCountryName,
    }));
  };

  const handlePhoneChange = (
    fieldName: "phoneNumber" | "whatsappNumber",
    nextValue?: Value,
  ) => {
    setFormState((currentState) => {
      const resolvedValue = nextValue ?? "";
      const nextState = {
        ...currentState,
        [fieldName]: resolvedValue,
      };

      if (sameAsPhone && fieldName === "phoneNumber") {
        nextState.whatsappNumber = resolvedValue;
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

  const submitConsultation = async () => {
    setIsSubmitting(true);

    const body = new FormData();

    Object.entries(formState).forEach(([key, value]) => {
      body.append(key, value);
    });

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
    router.push(`/thank-you?name=${encodeURIComponent(formState.firstName)}`);
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

      await submitConsultation();
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
              <span className="text-sm font-medium text-slate-700">Country of Residence <span className="text-red-600">*</span></span>
              <Select<CountryOption, false>
                aria-label="Country of residence"
                formatOptionLabel={renderCountryOption}
                inputId="country-of-residence"
                instanceId="country-of-residence"
                isSearchable
                name="countryOfResidence"
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? "No matching countries" : "No countries available"
                }
                options={COUNTRY_OPTIONS}
                placeholder="Type NI, IN, US or a country name"
                styles={countrySelectStyles}
                value={selectedCountryOption}
                filterOption={({ data }, inputValue) => {
                  const query = inputValue.trim().toLowerCase();

                  if (!query) {
                    return true;
                  }

                  const normalizedDialCode = data.dialCode.replace("+", "");
                  const normalizedQuery = query.replace("+", "");

                  return (
                    data.name.toLowerCase().startsWith(query) ||
                    data.value.toLowerCase().startsWith(query) ||
                    normalizedDialCode.startsWith(normalizedQuery)
                  );
                }}
                onChange={handleCountryChange}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Phone Number <span className="text-red-600">*</span></span>
              <PhoneInput
                className="field-input"
                autoComplete="tel"
                country={selectedCountry}
                disabled={!selectedCountry}
                international={selectedCountry ? true : undefined}
                placeholder={buildPhonePlaceholder(selectedCountry, "Phone number")}
                value={formState.phoneNumber || undefined}
                withCountryCallingCode={selectedCountry ? true : undefined}
                onChange={(value) => handlePhoneChange("phoneNumber", value)}
                required
              />
            </label>

            <div className="space-y-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">WhatsApp Number <span className="text-red-600">*</span></span>
                <PhoneInput
                  className="field-input"
                  autoComplete="tel"
                  country={selectedCountry}
                  disabled={!selectedCountry || sameAsPhone}
                  international={selectedCountry ? true : undefined}
                  placeholder={buildPhonePlaceholder(selectedCountry, "WhatsApp number")}
                  value={formState.whatsappNumber || undefined}
                  withCountryCallingCode={selectedCountry ? true : undefined}
                  onChange={(value) => handlePhoneChange("whatsappNumber", value)}
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
          </section>

          <section className="space-y-5 rounded-lg border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-800">
                Medical Condition
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Brief descriptions of Medical condition
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

            <label className="mt-4 space-y-2">
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

            {!isSubmissionEnabled ? (
              <p className="text-sm leading-6 text-slate-300">
                Complete every required field and accept the terms before submitting.
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
                disabled={!isSubmissionEnabled}
              >
                {isSubmitting ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
