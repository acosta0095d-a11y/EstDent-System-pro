export const PATIENT_RH_COLUMN = 'tipo_sangre_rh';

export const PATIENT_RH_OPTIONS = [
  'O+',
  'O-',
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
] as const;

export type PatientRhValue = typeof PATIENT_RH_OPTIONS[number];

export const normalizePatientRh = (value?: string | null): PatientRhValue | '' => {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '');
  return PATIENT_RH_OPTIONS.includes(normalized as PatientRhValue)
    ? (normalized as PatientRhValue)
    : '';
};

export const formatPatientRh = (value?: string | null, fallback = 'No registrado') =>
  normalizePatientRh(value) || fallback;

export const shouldRetryWithoutPatientRhColumn = (error: any) => {
  const fragments = [error?.message, error?.details, error?.hint]
    .map((part) => String(part || '').toLowerCase());

  return error?.code === '42703' || fragments.some((part) => part.includes(PATIENT_RH_COLUMN));
};

export const omitPatientRhColumn = <T extends Record<string, any>>(payload: T) => {
  const { [PATIENT_RH_COLUMN]: _omitted, ...rest } = payload;
  return rest as Omit<T, typeof PATIENT_RH_COLUMN>;
};