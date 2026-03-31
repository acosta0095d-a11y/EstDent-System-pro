export const formatPatientSerial = (patientId?: string | null): string => {
  if (!patientId) return 'P-00';
  const digits = String(patientId).replace(/\D/g, '');
  const raw = digits.length >= 2 ? digits.slice(-2) : digits;
  const computed = raw ? Number(raw) : 0;
  const hash = computed || Array.from(patientId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = (hash % 99) + 1;
  return `P-${String(index).padStart(2, '0')}`;
};
