export type ConsultationFormValues = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  countryOfResidence: string;
  medicalCondition: string;
  medicalDescription: string;
};

export const consultationFieldNames = [
  "firstName",
  "lastName",
  "phoneNumber",
  "whatsappNumber",
  "email",
  "countryOfResidence",
  "medicalCondition",
  "medicalDescription",
] as const satisfies ReadonlyArray<keyof ConsultationFormValues>;

export const initialConsultationFormValues: ConsultationFormValues = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  countryOfResidence: "",
  medicalCondition: "",
  medicalDescription: "",
};

export const MAX_PHONE_LENGTH = 15;
export const MAX_MEDICAL_REPORT_SIZE_BYTES = 5 * 1024 * 1024;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function countWords(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue.split(/\s+/).length;
}

export function validateConsultationValues(
  values: ConsultationFormValues,
): string | null {
  for (const fieldName of consultationFieldNames) {
    if (!values[fieldName].trim()) {
      return "Complete all form fields before continuing.";
    }
  }

  if (!emailPattern.test(values.email.trim())) {
    return "Enter a valid email address before continuing.";
  }

  if (!/^\d{1,15}$/.test(values.phoneNumber.trim())) {
    return "Phone number must contain only digits and be no more than 15 characters.";
  }

  if (!/^\d{1,15}$/.test(values.whatsappNumber.trim())) {
    return "WhatsApp number must contain only digits and be no more than 15 characters.";
  }

  if (countWords(values.medicalDescription) > 1000) {
    return "Medical description must not exceed 1000 words.";
  }

  return null;
}