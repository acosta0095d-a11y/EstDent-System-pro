type ConsultationKind = 'GENERAL' | 'ORTODONCIA';

interface ConsultationCodeOptions {
  consultationId?: string | null;
  consultationType?: ConsultationKind | string | null;
  consultationDate?: string | null;
}

const sanitizeSuffix = (value?: string | null) => {
  const clean = String(value || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  if (clean.length >= 4) return clean.slice(-4);
  if (clean.length > 0) return clean.padStart(4, '0');
  return '0000';
};

const formatDateToken = (value?: string | null) => {
  const parsed = value ? new Date(value) : new Date();
  const safe = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const year = String(safe.getFullYear()).slice(-2);
  const month = String(safe.getMonth() + 1).padStart(2, '0');
  const day = String(safe.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const getTypeToken = (consultationType?: string | null) => consultationType === 'ORTODONCIA' ? 'O' : 'G';

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const buildConsultationCode = ({ consultationId, consultationType, consultationDate }: ConsultationCodeOptions): string => {
  const typeToken = getTypeToken(consultationType);
  const dateToken = formatDateToken(consultationDate);
  const suffix = sanitizeSuffix(consultationId);
  return `NEC-${typeToken}-${dateToken}-${suffix}`;
};

export const getConsultationDocumentTitle = (consultationType?: string | null) => {
  if (consultationType === 'ORTODONCIA') return 'Nota de Evolucion Clinica Ortodontica';
  return 'Nota de Evolucion Clinica Odontologica';
};

export const resolveConsultationCode = (consultation: {
  id?: string | null;
  tipo_consulta?: string | null;
  fecha?: string | null;
  created_at?: string | null;
  codigo_consulta?: string | null;
  detalles_clinicos?: Record<string, any> | null;
}): string => {
  const explicitCode = consultation.codigo_consulta || consultation.detalles_clinicos?.codigo_consulta;
  if (explicitCode) return String(explicitCode);

  return buildConsultationCode({
    consultationId: consultation.id,
    consultationType: consultation.tipo_consulta,
    consultationDate: consultation.fecha || consultation.created_at,
  });
};

export const attachConsultationCodeToDetails = <T,>(details: T, consultationCode: string): T & { codigo_consulta: string } => {
  if (isRecord(details)) {
    return {
      ...details,
      codigo_consulta: details.codigo_consulta || consultationCode,
    } as T & { codigo_consulta: string };
  }

  return { codigo_consulta: consultationCode } as T & { codigo_consulta: string };
};

export const shouldRetryWithoutConsultationCodeColumn = (error: any) => {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return message.includes('codigo_consulta') && (message.includes('column') || message.includes('schema cache'));
};

export const omitConsultationCodeColumn = <T extends Record<string, any>>(payload: T): Omit<T, 'codigo_consulta'> => {
  const { codigo_consulta, ...rest } = payload;
  return rest;
};