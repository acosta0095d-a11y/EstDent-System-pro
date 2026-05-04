import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../core/context/PatientContext';
import { FullClinicalHistory } from '../components/FullClinicalHistory';
import { PatientDigitalFileHub } from '../components/PatientDigitalFileHub';
import { patientService } from '../services/patientService';
import { formatPatientSerial } from './patientUtils';
import {
  resolveConsultationCode,
} from '../../../shared/lib/consultationUtils';
import { formatPatientRh, PATIENT_RH_OPTIONS } from '../../../shared/lib/patientRhUtils';
import {
  ChevronLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  FileText,
  Clock,
  Plus,
  Scissors,
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Activity,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  Edit,
  FolderOpen,
  Printer,
  Copy,
  Trash2,
  MoreHorizontal,
  Share2,
  ArrowRight,
} from 'lucide-react';

const calculateAge = (birthDate?: string | null): number | null => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) age--;
  if (age < 0) age = 0;
  return age;
};

// ============================================
// TIPOS
// ============================================

type ConsultationKind = 'GENERAL' | 'ORTODONCIA';

interface HallazgoOdontograma {
  id?: string;
  diente?: string;
  tipo?: string;
  superficie?: string;
  severidad?: string;
  descripcion?: string;
  cie10?: string;
  cdt?: string;
  fechaRegistro?: string;
}

interface ConsultationProcedure {
  id?: string;
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  ubicacion?: string;
  zona?: string;
  pieza?: string;
  estado?: string;
  costo?: number;
  valor?: number;
  precio?: number;
  indicaciones?: string;
  observaciones?: string;
}

interface ConsultationPrescription {
  medicamento?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  indicaciones?: string;
}

interface PatientDashboardConsultation {
  id: string;
  codigo_consulta?: string;
  fecha?: string;
  created_at?: string;
  tipo_consulta: ConsultationKind;
  tiempo_sesion?: number;
  detalles_clinicos?: Record<string, any>;
  hallazgos_odontograma?: HallazgoOdontograma[];
  estado_odontograma?: Record<string, unknown>;
  motivo_principal?: string;
  motivo?: string;
  estado_general?: string;
  examen_estomatologico?: string;
  diagnosticos_cie10?: Array<string | Record<string, any>>;
  plan_tratamiento?: ConsultationProcedure[];
  recetas_prescritas?: ConsultationPrescription[];
  consentimiento_informado?: boolean;
  dolor_escala?: number;
  dolor_detalles?: Record<string, any>;
  examenOrto?: Record<string, any>;
  procedimientos?: ConsultationProcedure[];
  recetas?: ConsultationPrescription[];
  perfil_facial?: string;
  arco_actual?: string;
  evaluacionDolor?: Record<string, any>;
}

const CLINIC_REPORT = {
  name: 'EstDent',
  subtitle: 'Servicio Odontologico',
  documentName: 'Nota de Evolucion Clinica',
};
const CONSULTATION_DATA_MISSING = 'Sin registro en esta consulta';
const REPORT_FONT_STACK = "Arial, 'Segoe UI', system-ui, sans-serif";

const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toDate = (value?: string | null): Date | null => {
  const safeValue = value ?? '';
  if (!safeValue) return null;
  const parsed = new Date(safeValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateTime = (value?: string | null) => {
  const parsed = toDate(value);
  if (!parsed) {
    return {
      shortDate: 'Sin fecha',
      longDate: 'Sin fecha registrada',
      time: 'Sin hora',
    };
  }
  return {
    shortDate: parsed.toLocaleDateString('es-CO'),
    longDate: parsed.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    time: parsed.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
  };
};

const toInputDateValue = (value?: string | null): string => {
  const parsed = toDate(value);
  if (!parsed) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (value?: number | null) => `$${Number(value || 0).toLocaleString('es-CO')}`;

const formatDuration = (seconds?: number | null) => {
  const total = Number(seconds || 0);
  if (!total) return 'No registrado';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours && minutes) return `${hours} h ${minutes} min`;
  if (hours) return `${hours} h`;
  return `${minutes} min`;
};

const formatSimpleValue = (value: unknown, fallback = 'Sin registro'): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (Array.isArray(value)) {
    const clean = value
      .map(item => formatSimpleValue(item, ''))
      .filter(Boolean);
    return clean.length ? clean.join(', ') : fallback;
  }
  if (isRecord(value)) {
    const clean = Object.values(value)
      .map(item => formatSimpleValue(item, ''))
      .filter(Boolean);
    return clean.length ? clean.join(' · ') : fallback;
  }
  return fallback;
};

const humanizeKey = (rawKey: string): string => {
  const normalized = rawKey
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Campo';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const toCleanList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(item => formatSimpleValue(item, ''))
      .map(item => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const isDefaultClinicalText = (value: string): boolean => {
  const text = value.toLowerCase();
  return [
    'sin alteraciones',
    'no evaluable',
    'sin registro',
    'no aplica',
    'normal',
    'centrada',
    'centradas',
  ].some(token => text.includes(token));
};

const summarizeRecord = (
  record: unknown,
  fallback: string,
  options?: { ignoreDefaultTexts?: boolean }
): string => {
  if (!isRecord(record)) return fallback;

  const details = Object.entries(record)
    .map(([key, value]) => ({ key: humanizeKey(key), value: formatSimpleValue(value, '').trim() }))
    .filter(item => item.value)
    .filter(item => !(options?.ignoreDefaultTexts && isDefaultClinicalText(item.value)))
    .map(item => `${item.key}: ${item.value}`);

  return details.length ? details.join(' · ') : fallback;
};

const summarizeGeneralCondition = (consultation: PatientDashboardConsultation): string => {
  const state = consultation.tipo_consulta === 'GENERAL'
    ? (consultation.detalles_clinicos?.estadoGeneral || consultation.detalles_clinicos?.estado_general)
    : (consultation.detalles_clinicos?.anamnesis?.estadoGeneral || consultation.detalles_clinicos?.anamnesis?.estado_general);

  if (!isRecord(state)) {
    return CONSULTATION_DATA_MISSING;
  }

  const actitud = formatSimpleValue(state.actitud, '').toLowerCase();
  const higiene = formatSimpleValue(state.higieneOral, '').toLowerCase();
  const alerta = formatSimpleValue(state.alertaMedica || state.alerta_medica, '').trim();
  const estadoAparatos = formatSimpleValue(state.estadoAparatos, '').trim();

  const chunks: string[] = [];
  if (actitud) chunks.push(`Actitud: ${formatSimpleValue(state.actitud)}`);
  if (higiene) chunks.push(`Higiene oral: ${formatSimpleValue(state.higieneOral)}`);
  if (estadoAparatos) chunks.push(`Estado de aparatos: ${estadoAparatos}`);
  if (alerta) chunks.push(`Alerta medica: ${alerta}`);

  if (!chunks.length || (!alerta && (actitud.includes('colaborador') || actitud.includes('tranquilo')))) {
    return CONSULTATION_DATA_MISSING;
  }

  return chunks.join(' · ');
};

const summarizePainAssessment = (consultation: PatientDashboardConsultation): string => {
  const source = consultation.tipo_consulta === 'GENERAL'
    ? (consultation.detalles_clinicos?.evaluacionDolor || consultation.detalles_clinicos?.dolor || consultation.dolor_detalles)
    : (consultation.detalles_clinicos?.anamnesis?.evaluacionDolor || consultation.evaluacionDolor || null);

  if (!source) {
    return CONSULTATION_DATA_MISSING;
  }

  const rawScale = isRecord(source)
    ? (source.escala ?? source?.detalles?.escala)
    : consultation.dolor_escala;
  const scale = Number(rawScale || consultation.dolor_escala || 0);
  const features = toCleanList(isRecord(source) ? (source.caracteristicas || source.molestias || source?.detalles?.caracteristicas) : undefined);
  const triggers = toCleanList(isRecord(source) ? (source.desencadenantes || source?.detalles?.desencadenantes) : undefined);
  const evolution = formatSimpleValue(isRecord(source) ? (source.evolucion || source?.detalles?.evolucion) : undefined, '').trim();

  if (!scale && !features.length && !triggers.length && !evolution) {
    return CONSULTATION_DATA_MISSING;
  }

  const chunks = [`Escala de dolor: ${scale}/10`];
  if (features.length) chunks.push(`Caracteristicas: ${features.join(', ')}`);
  if (triggers.length) chunks.push(`Desencadenantes: ${triggers.join(', ')}`);
  if (evolution) chunks.push(`Evolucion: ${evolution}`);
  return chunks.join(' · ');
};

const summarizeExamByType = (consultation: PatientDashboardConsultation): string => {
  if (consultation.tipo_consulta === 'GENERAL') {
    const source = consultation.detalles_clinicos?.examen_fisico || consultation.detalles_clinicos?.examenEstomatologico || consultation.detalles_clinicos?.examen_estomatologico || consultation.examen_estomatologico;
    return summarizeRecord(
      source,
      CONSULTATION_DATA_MISSING,
      { ignoreDefaultTexts: true }
    );
  }

  const source = consultation.detalles_clinicos?.examen || consultation.examenOrto;
  return summarizeRecord(
    source,
    CONSULTATION_DATA_MISSING,
    { ignoreDefaultTexts: true }
  );
};

const extractConsultationDate = (consultation: PatientDashboardConsultation): string => consultation.fecha ?? consultation.created_at ?? '';

const extractConsultationCode = (consultation: PatientDashboardConsultation) => resolveConsultationCode(consultation);

const toProcedureAmount = (procedure: ConsultationProcedure): number => {
  const amount = Number(procedure.valor ?? procedure.costo ?? procedure.precio ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const normalizeProcedureState = (value: unknown) => String(value || '').trim().toLowerCase();

const sumProcedureAmountsByStates = (consultation: PatientDashboardConsultation, states: string[]) => {
  const allowed = new Set(states.map(state => state.toLowerCase()));
  return extractProcedures(consultation)
    .filter(procedure => allowed.has(normalizeProcedureState(procedure.estado)))
    .reduce((sum, procedure) => sum + toProcedureAmount(procedure), 0);
};

const extractDoctor = (consultation: PatientDashboardConsultation) => formatSimpleValue(
  consultation.detalles_clinicos?.doctor ||
  consultation.detalles_clinicos?.profesional ||
  consultation.detalles_clinicos?.workflow_summary?.profesional ||
  consultation.detalles_clinicos?.anamnesis?.doctor,
  'No registrado'
);

const extractConsultationValue = (consultation: PatientDashboardConsultation) => {
  const directValueCandidates = [
    consultation.detalles_clinicos?.workflow_summary?.total_facturado,
    consultation.detalles_clinicos?.valor,
    consultation.detalles_clinicos?.valor_consulta,
    consultation.detalles_clinicos?.valor_total,
    consultation.detalles_clinicos?.workflow_summary?.valor_total,
    consultation.detalles_clinicos?.workflow_summary?.total_tratamiento,
  ]
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0);

  if (directValueCandidates.length) {
    return directValueCandidates[0];
  }

  const proceduralTotal = sumProcedureAmountsByStates(consultation, ['realizado', 'aprobado', 'presupuestado']);
  return proceduralTotal > 0 ? proceduralTotal : 0;
};

const extractConsultationPaidValue = (consultation: PatientDashboardConsultation) => {
  const paidValueCandidates = [
    consultation.detalles_clinicos?.workflow_summary?.valor_pagado,
    consultation.detalles_clinicos?.workflow_summary?.total_pagado,
    consultation.detalles_clinicos?.workflow_summary?.paid_total,
    consultation.detalles_clinicos?.valor_pagado,
    consultation.detalles_clinicos?.pago_total,
    (consultation as any).valor_pagado,
  ]
    .map(item => Number(item))
    .filter(item => Number.isFinite(item) && item > 0);

  if (paidValueCandidates.length) {
    return paidValueCandidates[0];
  }

  const paidFromProcedures = sumProcedureAmountsByStates(consultation, ['realizado', 'pagado']);
  return paidFromProcedures > 0 ? paidFromProcedures : 0;
};

const formatConsultationValueLabel = (consultation: PatientDashboardConsultation) => {
  const amount = extractConsultationValue(consultation);
  return amount > 0 ? formatMoney(amount) : 'Sin registro';
};

const ORTHO_MOTIVO_LABELS: Record<string, string> = {
  control: 'Control ortodóntico mensual',
  bracket_caido: 'Control por bracket caído',
  recementado: 'Control por recementado',
  dolor: 'Control por dolor o molestia',
  urgencia: 'Urgencia ortodóntica',
  instalacion_inicial: 'Primera instalación de aparatología',
  valoracion_inicial: 'Valoración inicial de ortodoncia',
  retiro: 'Retiro o ajuste de aparatología',
  otro: 'Otro motivo clínico',
};

const resolveOrthoMotiveLabel = (value: unknown): string => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  const key = normalized.toLowerCase();
  return ORTHO_MOTIVO_LABELS[key] || normalized;
};

const extractMotivo = (consultation: PatientDashboardConsultation) => {
  if (consultation.tipo_consulta === 'GENERAL') {
    return formatSimpleValue(
      consultation.motivo_principal ||
      consultation.detalles_clinicos?.motivo ||
      consultation.detalles_clinicos?.motivo_categorizado?.label,
      'Consulta general sin motivo especificado'
    );
  }

  const motivoSeleccionadoRaw = consultation.detalles_clinicos?.anamnesis?.motivoSeleccionado;
  const motivoSeleccionadoKey = typeof motivoSeleccionadoRaw === 'string'
    ? motivoSeleccionadoRaw
    : (motivoSeleccionadoRaw?.value || motivoSeleccionadoRaw?.id || motivoSeleccionadoRaw?.key || motivoSeleccionadoRaw?.label || '');
  const motivoSeleccionadoLabel = typeof motivoSeleccionadoRaw === 'object'
    ? String(motivoSeleccionadoRaw?.label || '').trim()
    : '';

  const motivo =
    consultation.motivo ||
    consultation.detalles_clinicos?.anamnesis?.motivo ||
    motivoSeleccionadoLabel ||
    resolveOrthoMotiveLabel(motivoSeleccionadoKey);

  return formatSimpleValue(
    resolveOrthoMotiveLabel(motivo),
    'Control de ortodoncia sin motivo especificado'
  );
};

const extractGeneralNotes = (consultation: PatientDashboardConsultation) => {
  const explicitNote = consultation.tipo_consulta === 'GENERAL'
    ? formatSimpleValue(
      consultation.estado_general ||
      consultation.detalles_clinicos?.notas ||
      consultation.detalles_clinicos?.workflow_summary?.closure_summary ||
      consultation.detalles_clinicos?.evolucion_clinica,
      ''
    )
    : formatSimpleValue(
      consultation.detalles_clinicos?.anamnesis?.evolucionNarrativa ||
      consultation.detalles_clinicos?.evolucion_clinica ||
      consultation.detalles_clinicos?.workflow_summary?.closure_summary ||
      consultation.detalles_clinicos?.notas ||
      consultation.detalles_clinicos?.observaciones,
      ''
    );

  if (explicitNote) return explicitNote;
  return summarizeGeneralCondition(consultation);
};

const extractClinicalRawNarrative = (consultation: PatientDashboardConsultation): string => {
  const candidate = consultation.tipo_consulta === 'GENERAL'
    ? consultation.detalles_clinicos?.evolucion_clinica || consultation.detalles_clinicos?.workflow_summary?.closure_summary
    : consultation.detalles_clinicos?.anamnesis?.evolucionNarrativa || consultation.detalles_clinicos?.evolucion_clinica || consultation.detalles_clinicos?.workflow_summary?.closure_summary;

  return formatSimpleValue(candidate, '');
};

const extractExamSummary = (consultation: PatientDashboardConsultation) => {
  return summarizeExamByType(consultation);
};

const extractDiagnosticos = (consultation: PatientDashboardConsultation): string[] => {
  const source = consultation.tipo_consulta === 'GENERAL'
    ? asArray(consultation.diagnosticos_cie10 || consultation.detalles_clinicos?.diagnosticos_cie10)
    : asArray(consultation.detalles_clinicos?.diagnosticos || consultation.detalles_clinicos?.anamnesis?.diagnosticos);

  return source
    .map(item => {
      if (typeof item === 'string') return item.trim();
      if (isRecord(item)) return formatSimpleValue(item.codigo || item.label || item.nombre || item.descripcion, '');
      return '';
    })
    .filter(Boolean);
};

const extractProcedures = (consultation: PatientDashboardConsultation): ConsultationProcedure[] => {
  if (consultation.tipo_consulta === 'GENERAL') {
    return asArray(consultation.plan_tratamiento || consultation.detalles_clinicos?.plan_tratamiento);
  }
  return asArray(consultation.procedimientos || consultation.detalles_clinicos?.plan_tratamiento);
};

const extractFollowUpDaysFromProcedures = (consultation: PatientDashboardConsultation): number => {
  const procedures = extractProcedures(consultation);
  for (const procedure of procedures) {
    const procedureRecord: Record<string, unknown> = isRecord(procedure as unknown)
      ? (procedure as unknown as Record<string, unknown>)
      : {};
    const directCandidates = [
      procedureRecord['next_followup_days'],
      procedureRecord['followup_days'],
      procedureRecord['proxima_visita_dias'],
      procedureRecord['dias_proxima_cita'],
      procedureRecord['control_en_dias'],
      procedureRecord['nextVisitDays'],
    ];

    const numeric = directCandidates
      .map((candidate) => Number(candidate))
      .find((candidate) => Number.isFinite(candidate) && candidate > 0 && candidate <= 365);

    if (numeric) {
      return numeric;
    }

    const textCandidates = [procedure.indicaciones, procedure.observaciones, procedure.descripcion]
      .map((text) => String(text || '').trim())
      .filter(Boolean);

    for (const text of textCandidates) {
      const match = text.match(/(\d{1,3})\s*d[ií]as?/i);
      if (!match) continue;
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed) && parsed > 0 && parsed <= 365) {
        return parsed;
      }
    }
  }

  return 0;
};

const extractPrimaryProcedure = (consultation: PatientDashboardConsultation): string => {
  const procedures = extractProcedures(consultation);
  if (!procedures.length) {
    return consultation.tipo_consulta === 'ORTODONCIA' ? 'Control ortodontico' : 'Valoracion clinica';
  }

  const prioritized = procedures.find((procedure) => ['realizado', 'aprobado', 'presupuestado'].includes(String(procedure.estado || '').toLowerCase())) || procedures[0];
  const label = formatSimpleValue(prioritized.nombre || prioritized.descripcion, 'Procedimiento clinico');
  return prioritized.categoria ? `${label} (${prioritized.categoria})` : label;
};

const extractNextConsultationReason = (consultation: PatientDashboardConsultation): string => {
  return formatSimpleValue(
    consultation.detalles_clinicos?.workflow_summary?.next_consultation_reason,
    CONSULTATION_DATA_MISSING
  );
};

const extractClosureSummary = (consultation: PatientDashboardConsultation): string => {
  if (consultation.tipo_consulta === 'ORTODONCIA') {
    return formatSimpleValue(
      consultation.detalles_clinicos?.workflow_summary?.closure_summary ||
      consultation.detalles_clinicos?.anamnesis?.evolucionNarrativa ||
      consultation.detalles_clinicos?.evolucion_clinica,
      CONSULTATION_DATA_MISSING
    );
  }

  return formatSimpleValue(
    consultation.detalles_clinicos?.workflow_summary?.closure_summary || consultation.detalles_clinicos?.evolucion_clinica,
    CONSULTATION_DATA_MISSING
  );
};

const extractNextConsultationLabel = (consultation: PatientDashboardConsultation): string => {
  const workflowSummary = consultation.detalles_clinicos?.workflow_summary;
  const workflowDays = Number(workflowSummary?.next_followup_days || 0);
  const procedureDays = extractFollowUpDaysFromProcedures(consultation);
  const defaultDays = consultation.tipo_consulta === 'ORTODONCIA' ? 30 : 0;
  const days = workflowDays > 0 ? workflowDays : (procedureDays > 0 ? procedureDays : defaultDays);
  const baseDate = extractConsultationDate(consultation);

  if (!days || !baseDate) {
    return CONSULTATION_DATA_MISSING;
  }

  const parsed = new Date(baseDate);
  if (Number.isNaN(parsed.getTime())) {
    return `${days} dias`;
  }

  parsed.setDate(parsed.getDate() + days);
  return `${days} dias · ${parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}`;
};

const extractPrescriptions = (consultation: PatientDashboardConsultation): ConsultationPrescription[] => {
  if (consultation.tipo_consulta === 'GENERAL') {
    return asArray(consultation.recetas_prescritas || consultation.detalles_clinicos?.recetas);
  }
  return asArray(consultation.recetas || consultation.detalles_clinicos?.recetario);
};

const extractRequestedStudies = (consultation: PatientDashboardConsultation): string[] => {
  const source = [
    consultation.detalles_clinicos?.examenes_solicitados,
    consultation.detalles_clinicos?.ordenes,
    consultation.detalles_clinicos?.solicitudes,
    consultation.detalles_clinicos?.ordenes_radiologia,
    consultation.detalles_clinicos?.solicitudes_estudios,
    consultation.detalles_clinicos?.workflow_summary?.requested_studies,
    consultation.detalles_clinicos?.anamnesis?.examenes_solicitados,
  ];

  return source.flatMap(item => {
    if (Array.isArray(item)) {
      return item.map(value => formatSimpleValue(value, '')).filter(Boolean);
    }
    if (item) {
      const normalized = formatSimpleValue(item, '');
      return normalized ? [normalized] : [];
    }
    return [];
  });
};

const extractTechnicalSnapshot = (consultation: PatientDashboardConsultation) => {
  const diagnostics = extractDiagnosticos(consultation);

  if (consultation.tipo_consulta === 'GENERAL') {
    return [
      { label: 'Condicion general', value: summarizeGeneralCondition(consultation) },
      { label: 'Dolor y sintomas', value: summarizePainAssessment(consultation) },
      { label: 'Examen estomatologico', value: extractExamSummary(consultation) },
      { label: 'Observaciones generales', value: extractGeneralNotes(consultation) },
      { label: 'Diagnosticos codificados', value: diagnostics.length ? diagnostics.join(', ') : 'Sin registro' },
      { label: 'Cierre clinico', value: extractClosureSummary(consultation) },
      { label: 'Motivo de proxima cita', value: extractNextConsultationReason(consultation) },
      { label: 'Valor estimado', value: formatConsultationValueLabel(consultation) },
    ];
  }

  const orthoContainers = extractOrthoContainerSummaryData(consultation);

  return [
    { label: 'Anamnesis', value: summarizeGeneralCondition(consultation) },
    { label: 'Dolor ortodontico', value: summarizePainAssessment(consultation) },
    { label: 'Examen ortodontico', value: extractExamSummary(consultation) },
    {
      label: 'Perfil facial',
      value: formatSimpleValue(
        orthoContainers.facialSummary,
        summarizeRecord(
          consultation.detalles_clinicos?.perfil_facial,
          'Perfil facial sin alteraciones clinicamente relevantes.',
          { ignoreDefaultTexts: true }
        )
      ),
    },
    {
      label: 'Arco actual',
      value: formatSimpleValue(
        orthoContainers.treatmentSummary,
        summarizeRecord(
          consultation.detalles_clinicos?.arco_actual,
          'Sin seguimiento de arco consignado para esta evolucion.',
          { ignoreDefaultTexts: true }
        )
      ),
    },
    { label: 'Evolucion oclusal', value: formatSimpleValue(orthoContainers.oclusionSummary, CONSULTATION_DATA_MISSING) },
    { label: 'Diagnosticos codificados', value: diagnostics.length ? diagnostics.join(', ') : 'Sin registro' },
    { label: 'Cierre clinico', value: extractClosureSummary(consultation) },
    { label: 'Motivo de proxima cita', value: extractNextConsultationReason(consultation) },
    { label: 'Valor estimado', value: formatConsultationValueLabel(consultation) },
  ];
};

const buildHallazgosSummary = (hallazgos: HallazgoOdontograma[]) => {
  if (!hallazgos.length) {
    return 'No se registraron hallazgos odontograficos en esta evolucion clinica.';
  }

  const sample = hallazgos.slice(0, 2).map(hallazgo => {
    const tooth = hallazgo.diente ? `diente ${hallazgo.diente}` : 'pieza sin numeracion';
    const tipo = formatSimpleValue(hallazgo.tipo, 'hallazgo');
    return `${tipo} en ${tooth}`;
  });

  return `Se registraron ${hallazgos.length} hallazgo${hallazgos.length === 1 ? '' : 's'} odontografico${hallazgos.length === 1 ? '' : 's'}. Referencias principales: ${sample.join(', ')}.`;
};

const buildConsultationNarrative = (patient: any, consultation: PatientDashboardConsultation) => {
  const dateInfo = formatDateTime(extractConsultationDate(consultation));
  const motive = extractMotivo(consultation);
  const exam = extractExamSummary(consultation);
  const hallazgos = asArray(consultation.hallazgos_odontograma);
  const hallazgosText = buildHallazgosSummary(hallazgos);
  const diagnosticos = extractDiagnosticos(consultation);
  const procedures = extractProcedures(consultation);
  const prescriptions = extractPrescriptions(consultation);
  const requestedStudies = extractRequestedStudies(consultation);
  const doctor = extractDoctor(consultation);
  const closureSummary = extractClosureSummary(consultation);
  const patientAge = patient?.edad ?? calculateAge(patient?.fecha_nacimiento);
  const consultationCode = extractConsultationCode(consultation);

  const patientName = formatSimpleValue(`${patient?.nombre || ''} ${patient?.apellidos || ''}`.trim(), 'Paciente sin nombre registrado');
  const ageText = patientAge !== null && patientAge !== undefined ? `${patientAge} anos` : 'edad no registrada';
  const diagnosisText = diagnosticos.length ? diagnosticos.join(', ') : 'sin diagnosticos adicionales registrados';

  const subjective = `Paciente ${patientName} (${formatSimpleValue(patient?.cc, 'sin documento')}), ${ageText}, atendido en consulta ${consultation.tipo_consulta === 'GENERAL' ? 'de odontologia general' : 'de ortodoncia'} el ${dateInfo.longDate} a las ${dateInfo.time}, bajo responsabilidad de ${doctor}. Motivo principal: ${motive}.`;

  const objectiveAssessment = `En la evaluacion se registro: ${exam}. ${hallazgosText} Analisis clinico actual: ${diagnosisText}.`;

  const plan = `${procedures.length ? `Plan activo con ${procedures.length} accion${procedures.length === 1 ? '' : 'es'} clinica${procedures.length === 1 ? '' : 's'}.` : 'Sin plan invasivo adicional en esta evolucion.'} ${prescriptions.length ? `Formulacion medica registrada para ${prescriptions.length} medicamento${prescriptions.length === 1 ? '' : 's'}.` : 'Sin formulacion farmacologica.'} ${requestedStudies.length ? `Se solicitaron ayudas diagnosticas: ${requestedStudies.join(', ')}.` : 'Sin examenes complementarios solicitados.'} Cierre: ${closureSummary}.`;

  return [subjective, objectiveAssessment, plan, `Codigo de registro: ${consultationCode}.`];
};

const buildOdontogramClinicalDigest = (consultation: PatientDashboardConsultation) => {
  const hallazgosText = buildHallazgosSummary(asArray(consultation.hallazgos_odontograma));
  const diagnosisText = extractDiagnosticos(consultation).join(', ') || 'sin diagnosticos codificados adicionales';
  const closureSummary = extractClosureSummary(consultation);
  const nextConsultation = extractNextConsultationLabel(consultation);
  const nextConsultationReason = extractNextConsultationReason(consultation);
  const literalNote = extractClinicalRawNarrative(consultation) || extractGeneralNotes(consultation);

  return `Con base en el odontograma, ${hallazgosText.toLowerCase()} La impresion diagnostica se orienta a ${diagnosisText}. Se deja como conducta de cierre: ${closureSummary}. El seguimiento sugerido corresponde a ${nextConsultationReason} (${nextConsultation}). Nota clinica integrada: ${literalNote}.`;
};

interface ReportRow {
  label: string;
  value: string;
}

interface ReportBulletGroup {
  title: string;
  items: string[];
}

interface ReportSection {
  title: string;
  rows?: ReportRow[];
  bulletGroups?: ReportBulletGroup[];
  paragraph?: string;
}

interface StructuredReport {
  heading: string;
  sections: ReportSection[];
}

const ORTHO_TOOL_LABELS: Record<string, string> = {
  bracket_metal: 'Bracket Metal',
  bracket_zafiro: 'Bracket Estético',
  bracket_autoligable: 'Bracket Autoligable',
  bracket: 'Bracket',
  tubo: 'Tubo',
  banda: 'Banda',
  arco_niti: 'Arco NiTi',
  arco_acero: 'Arco Acero',
  cadeneta: 'Cadeneta',
  cadeneta_abierta: 'Cadeneta Abierta',
  cadeneta_cerrada: 'Cadeneta Cerrada',
  resorte: 'Resorte',
  elastico: 'Elastico',
  ligadura_metalica: 'Ligadura Metalica',
  retenedor: 'Retenedor',
};

const ORTHO_FACE_LABELS: Record<string, string> = {
  vestibular: 'vestibular',
  lingual: 'lingual',
  oclusal: 'oclusal',
  palatino: 'palatino',
  mesial: 'mesial',
  distal: 'distal',
};

const formatDateNumeric = (value?: string | null): string => {
  const parsed = toDate(value);
  if (!parsed) return 'Sin fecha registrada';
  return parsed.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatTimeFormal = (value?: string | null): string => {
  const parsed = toDate(value);
  if (!parsed) return 'Sin hora registrada';
  return parsed.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const extractConsultationNumber = (consultation: PatientDashboardConsultation): string => {
  const fromDetails = Number(
    consultation.detalles_clinicos?.workflow_summary?.consultation_number ||
    consultation.detalles_clinicos?.workflow_summary?.numero_consulta ||
    consultation.detalles_clinicos?.numero_consulta ||
    (consultation as any).numero_consulta ||
    0
  );

  if (Number.isFinite(fromDetails) && fromDetails > 0) {
    return String(fromDetails);
  }

  return CONSULTATION_DATA_MISSING;
};

const extractPatientCode = (patient: any): string => {
  const code = formatPatientSerial(patient?.id || '');
  return formatSimpleValue(code, 'Sin codigo de paciente');
};

const extractConsultationPatientIdentity = (patient: any, consultation: PatientDashboardConsultation) => {
  const snapshot =
    consultation.detalles_clinicos?.paciente ||
    consultation.detalles_clinicos?.workflow_summary?.paciente ||
    consultation.detalles_clinicos?.anamnesis?.paciente;

  const snapshotRecord = isRecord(snapshot) ? snapshot : {};

  return {
    fullName: formatSimpleValue(
      snapshotRecord.nombre_completo ||
      `${snapshotRecord.nombre || ''} ${snapshotRecord.apellidos || ''}`.trim() ||
      consultation.detalles_clinicos?.workflow_summary?.paciente_nombre ||
      consultation.detalles_clinicos?.paciente_nombre ||
      `${patient?.nombre || ''} ${patient?.apellidos || ''}`.trim(),
      'Sin nombre registrado'
    ),
    document: formatSimpleValue(
      snapshotRecord.cc ||
      snapshotRecord.documento ||
      snapshotRecord.numero_documento ||
      consultation.detalles_clinicos?.workflow_summary?.documento_paciente ||
      consultation.detalles_clinicos?.documento_paciente ||
      patient?.cc,
      'Sin documento registrado'
    ),
    code: formatSimpleValue(
      snapshotRecord.codigo_paciente ||
      snapshotRecord.patient_code ||
      consultation.detalles_clinicos?.workflow_summary?.patient_code ||
      consultation.detalles_clinicos?.workflow_summary?.codigo_paciente ||
      consultation.detalles_clinicos?.codigo_paciente ||
      extractPatientCode(patient),
      'Sin codigo de paciente'
    ),
  };
};

const normalizeDeviceState = (value: unknown): string => {
  const text = String(value || '').toLowerCase();
  if (text.includes('despeg') || text.includes('falla') || text.includes('recement')) return 'despegado';
  if (text.includes('retir') || text.includes('remov') || text.includes('elim')) return 'retirado';
  return 'instalado';
};

const formatToolLabel = (tool: unknown): string => {
  const key = String(tool || '').toLowerCase();
  return ORTHO_TOOL_LABELS[key] || humanizeKey(key || 'aparatologia');
};

const extractGeneralStateRecord = (consultation: PatientDashboardConsultation): Record<string, any> => {
  const source = consultation.detalles_clinicos?.estadoGeneral || consultation.detalles_clinicos?.estado_general;
  return isRecord(source) ? source : {};
};

const extractGeneralExamRecord = (consultation: PatientDashboardConsultation): Record<string, any> => {
  const source = consultation.detalles_clinicos?.examen_fisico || consultation.detalles_clinicos?.examenEstomatologico || consultation.detalles_clinicos?.examen_estomatologico || consultation.examen_estomatologico;
  return isRecord(source) ? source : {};
};

const extractPainRecord = (consultation: PatientDashboardConsultation): Record<string, any> => {
  const source = consultation.detalles_clinicos?.evaluacionDolor || consultation.detalles_clinicos?.dolor || consultation.dolor_detalles;
  if (!isRecord(source)) return {};

  const details = isRecord(source.detalles) ? source.detalles : {};
  return {
    ...details,
    ...source,
    escala: source.escala ?? details.escala ?? consultation.dolor_escala ?? 0,
    caracteristicas: source.caracteristicas ?? details.caracteristicas ?? source.molestias ?? [],
    desencadenantes: source.desencadenantes ?? details.desencadenantes ?? [],
    evolucion: source.evolucion ?? details.evolucion ?? '',
  };
};

const extractPatientStory = (consultation: PatientDashboardConsultation): string => {
  const story = consultation.detalles_clinicos?.relato_paciente || consultation.detalles_clinicos?.anamnesis?.relato || consultation.detalles_clinicos?.anamnesis?.relatoPaciente;
  return formatSimpleValue(story, 'Sin relato adicional registrado');
};

const extractUrgencyMarkers = (consultation: PatientDashboardConsultation): string => {
  const markers = consultation.detalles_clinicos?.marcadores_urgencia || consultation.detalles_clinicos?.urgencia || consultation.detalles_clinicos?.workflow_summary?.urgency_markers;
  const list = toCleanList(markers);
  return list.length ? list.join(', ') : 'Sin marcadores adicionales';
};

const extractClinicalHistoryStatus = (consultation: PatientDashboardConsultation): string => {
  const candidate =
    consultation.detalles_clinicos?.historial_clinico ||
    consultation.detalles_clinicos?.anamnesis?.historial_clinico ||
    consultation.detalles_clinicos?.anamnesis?.antecedentes ||
    consultation.detalles_clinicos?.antecedentes;

  return formatSimpleValue(candidate, CONSULTATION_DATA_MISSING);
};

const extractGeneralAlert = (consultation: PatientDashboardConsultation): string => {
  const state = extractGeneralStateRecord(consultation);
  return formatSimpleValue(state.alertaMedica || state.alerta_medica, 'Sin alertas medicas registradas');
};

const extractOdontogramLastEdit = (consultation: PatientDashboardConsultation): string => {
  const lastEdit = (consultation.estado_odontograma as any)?.last_edit_at || consultation.fecha || consultation.created_at;
  const parsed = toDate(lastEdit);
  if (!parsed) return 'Sin registro';
  return parsed.toLocaleString('es-CO');
};

const buildProcedureLinesByState = (consultation: PatientDashboardConsultation, states: string[], emptyText: string): string[] => {
  const allowed = new Set(states.map(s => s.toLowerCase()));
  const items = extractProcedures(consultation)
    .filter(proc => allowed.has(String(proc.estado || '').toLowerCase()))
    .map(proc => {
      const name = formatSimpleValue(proc.nombre || proc.descripcion, 'Accion clinica');
      const tooth = formatSimpleValue(proc.ubicacion || proc.zona || proc.pieza, 'General');
      return `${name} (${tooth})`;
    });

  return items.length ? items : [emptyText];
};

type GeneralContainerSummaryData = {
  mode: string;
  continuityStatus: string;
  continuitySummary: string;
  descripcionClinicaSummary: string;
  descripcionClinicaStatus: string;
  estadoGeneralSummary: string;
  estadoGeneralStatus: string;
  valoracionClinicaSummary: string;
  valoracionClinicaStatus: string;
  dolorSummary: string;
  dolorStatus: string;
  examenSummary: string;
  examenStatus: string;
  odontogramaSummary: string;
  odontogramaStatus: string;
  diagnosticoSummary: string;
  diagnosticoStatus: string;
  conductaSummary: string;
  conductaStatus: string;
  planSummary: string;
  planStatus: string;
  prescripcionSummary: string;
  prescripcionStatus: string;
  cierreSummary: string;
};

const resolveGeneralContainerStatus = (rawStatus: unknown, changedFallback: unknown): string => {
  const normalized = String(rawStatus ?? '').toLowerCase();
  if (normalized === 'actualizado') return 'actualizado';
  if (normalized === 'sin_cambios') return 'sin_cambios';
  if (typeof changedFallback === 'boolean') return changedFallback ? 'actualizado' : 'sin_cambios';
  return 'sin_dato';
};

const formatGeneralContainerStatus = (status: string): string => {
  if (status === 'actualizado') return 'Actualizado en esta consulta';
  if (status === 'sin_cambios') return 'Sin cambios relevantes en esta consulta';
  return CONSULTATION_DATA_MISSING;
};

const extractGeneralContainerSummaryData = (consultation: PatientDashboardConsultation): GeneralContainerSummaryData => {
  const details = isRecord(consultation.detalles_clinicos) ? consultation.detalles_clinicos : {};
  const workflowSummary = isRecord(details.workflow_summary) ? details.workflow_summary : {};
  const stateRecord = extractGeneralStateRecord(consultation);
  const resumenesContainers = isRecord(details.resumenes_containers)
    ? details.resumenes_containers
    : (isRecord(workflowSummary.container_summaries) ? workflowSummary.container_summaries : {});
  const containerStateStatus = isRecord(workflowSummary.container_state_status) ? workflowSummary.container_state_status : {};
  const containerChanges = isRecord(workflowSummary.container_changes) ? workflowSummary.container_changes : {};

  const diagnostics = extractDiagnosticos(consultation);
  const diagnosisFallback = diagnostics.length
    ? `La impresión diagnóstica codificada corresponde a ${diagnostics.join(', ')}.`
    : 'Sin diagnósticos CIE-10 manuales registrados en esta atención.';

  const pendingLongitudinal = toCleanList(
    workflowSummary.longitudinal_pending ||
    workflowSummary.pending_items ||
    details.plan_longitudinal ||
    details.pendientes_longitudinales
  );
  const planFallback = pendingLongitudinal.length
    ? `Se mantiene plan longitudinal activo con ${pendingLongitudinal.length} pendiente(s): ${pendingLongitudinal.slice(0, 3).join(', ')}.`
    : 'No se documentan pendientes longitudinales activos.';

  const prescriptions = extractPrescriptions(consultation);
  const prescripcionFallback = prescriptions.length
    ? `Se emitieron ${prescriptions.length} fórmula(s): ${prescriptions.map(item => formatSimpleValue(item.medicamento, 'Medicamento')).join(', ')}.`
    : 'No se emitieron fórmulas médicas en esta consulta.';

  const continuityStatus = formatSimpleValue(workflowSummary.continuity_status, '');
  const continuitySummaryFromData = formatSimpleValue(workflowSummary.continuity_summary, '');
  const continuitySummary = continuitySummaryFromData || (
    continuityStatus === 'con_cambios'
      ? 'Evolución clínica con cambios relevantes documentados frente al control previo.'
      : (continuityStatus === 'sin_cambios_relevantes'
        ? 'Evolución clínica estable, sin cambios relevantes frente al control previo.'
        : CONSULTATION_DATA_MISSING)
  );

  const estadoGeneralStatus = resolveGeneralContainerStatus(containerStateStatus.estado_general, containerChanges.estadoGeneral);
  const descripcionClinicaStatus = resolveGeneralContainerStatus(containerStateStatus.descripcion_clinica_actual, containerChanges.estadoGeneral);
  const valoracionClinicaStatus = resolveGeneralContainerStatus(
    containerStateStatus.valoracion_clinica,
    containerChanges.evaluacionDolor || containerChanges.examenEstomatologico || containerChanges.odontograma
  );
  const dolorStatus = resolveGeneralContainerStatus(containerStateStatus.evaluacion_dolor, containerChanges.evaluacionDolor);
  const examenStatus = resolveGeneralContainerStatus(containerStateStatus.examen_estomatologico, containerChanges.examenEstomatologico);
  const odontogramaStatus = resolveGeneralContainerStatus(containerStateStatus.odontograma, containerChanges.odontograma);
  const conductaStatus = resolveGeneralContainerStatus(containerStateStatus.plan_tratamiento, containerChanges.planTratamiento);
  const planStatus = resolveGeneralContainerStatus(containerStateStatus.plan_tratamiento, containerChanges.planTratamiento);
  const prescripcionStatus = resolveGeneralContainerStatus(containerStateStatus.recetas, containerChanges.recetas);

  return {
    mode: formatSimpleValue(workflowSummary.narrative_mode, ''),
    continuityStatus,
    continuitySummary,
    descripcionClinicaSummary: formatSimpleValue(
      resumenesContainers.descripcion_clinica_actual,
      formatSimpleValue(stateRecord.descripcionClinica || stateRecord.descripcion_higiene || stateRecord.descripcionHigiene, 'Sin descripción clínica editable registrada')
    ),
    descripcionClinicaStatus,
    estadoGeneralSummary: formatSimpleValue(resumenesContainers.estado_general, summarizeGeneralCondition(consultation)),
    estadoGeneralStatus,
    valoracionClinicaSummary: formatSimpleValue(
      resumenesContainers.valoracion_clinica,
      `Valoración clínica integral: ${formatSimpleValue(resumenesContainers.evaluacion_dolor, summarizePainAssessment(consultation))} ${formatSimpleValue(resumenesContainers.examen_estomatologico, extractExamSummary(consultation))} ${formatSimpleValue(resumenesContainers.odontograma, buildHallazgosSummary(asArray(consultation.hallazgos_odontograma)))}`
    ),
    valoracionClinicaStatus,
    dolorSummary: formatSimpleValue(resumenesContainers.evaluacion_dolor, summarizePainAssessment(consultation)),
    dolorStatus,
    examenSummary: formatSimpleValue(resumenesContainers.examen_estomatologico, extractExamSummary(consultation)),
    examenStatus,
    odontogramaSummary: formatSimpleValue(resumenesContainers.odontograma, buildHallazgosSummary(asArray(consultation.hallazgos_odontograma))),
    odontogramaStatus,
    diagnosticoSummary: formatSimpleValue(resumenesContainers.diagnostico, diagnosisFallback),
    diagnosticoStatus: odontogramaStatus,
    conductaSummary: formatSimpleValue(
      resumenesContainers.conducta_clinica,
      buildProcedureLinesByState(consultation, ['realizado', 'aprobado'], 'Sin procedimientos ejecutados ni aprobados en esta consulta')[0]
    ),
    conductaStatus,
    planSummary: formatSimpleValue(resumenesContainers.plan_longitudinal, planFallback),
    planStatus,
    prescripcionSummary: formatSimpleValue(resumenesContainers.prescripcion, prescripcionFallback),
    prescripcionStatus,
    cierreSummary: formatSimpleValue(resumenesContainers.cierre_tecnico, extractClosureSummary(consultation)),
  };
};

const buildGeneralClinicalSummary = (patient: any, consultation: PatientDashboardConsultation): string => {
  const identity = extractConsultationPatientIdentity(patient, consultation);
  const patientName = identity.fullName;
  const patientCode = identity.code;
  const consultationDate = extractConsultationDate(consultation);
  const date = formatDateNumeric(consultationDate);
  const time = formatTimeFormal(consultationDate);
  const motive = extractMotivo(consultation);
  const containerData = extractGeneralContainerSummaryData(consultation);

  const parrafos: string[] = [];
  parrafos.push(`El paciente ${patientName}, identificado con Cédula de ciudadanía número ${identity.document} y código interno ${patientCode}, asiste el ${date} a las ${time} por ${motive.toLowerCase()}.`);
  parrafos.push(`Continuidad clínica registrada: ${containerData.continuitySummary}`);
  parrafos.push(`Descripción clínica actual: ${containerData.descripcionClinicaSummary}`);
  parrafos.push(`Estado general: ${containerData.estadoGeneralSummary}`);
  parrafos.push(`Valoración clínica integral: ${containerData.valoracionClinicaSummary}`);
  parrafos.push(`Dolor y sintomatología: ${containerData.dolorSummary}`);
  parrafos.push(`Examen estomatológico: ${containerData.examenSummary}`);
  parrafos.push(`Odontograma y diagnóstico: ${containerData.odontogramaSummary} ${containerData.diagnosticoSummary}`);
  parrafos.push(`Conducta clínica: ${containerData.conductaSummary}`);
  parrafos.push(`Plan longitudinal y prescripción: ${containerData.planSummary} ${containerData.prescripcionSummary}`);
  parrafos.push(`Cierre técnico de la sesión: ${containerData.cierreSummary}`);

  return parrafos.join(' ');
};

const extractOrthoInventory = (consultation: PatientDashboardConsultation) => {
  const state = isRecord(consultation.estado_odontograma) ? consultation.estado_odontograma as Record<string, any> : {};
  const teethData = isRecord(state.teethData) ? state.teethData as Record<string, any> : {};
  const connections = Array.isArray(state.connections) ? state.connections : [];

  const baseItems: string[] = [];
  const auxItems: string[] = [];
  const failureItemsSet = new Set<string>();
  const missingTeeth: string[] = [];

  let activeBaseCount = 0;
  let activeAuxCount = 0;

  Object.entries(teethData).forEach(([pieza, toothValue]) => {
    if (!isRecord(toothValue)) return;

    const isMissing = Boolean(toothValue.ausente || toothValue.missing || toothValue.status === 'ausente');
    if (isMissing) missingTeeth.push(String(pieza));

    const faces = isRecord(toothValue.faces) ? toothValue.faces : {};
    Object.entries(faces).forEach(([faceKey, faceValue]) => {
      if (!isRecord(faceValue)) return;
      const faceLabel = ORTHO_FACE_LABELS[faceKey] || faceKey;

      const base = isRecord(faceValue.base) ? faceValue.base : null;
      if (base) {
        const toolName = formatToolLabel(base.id || base.toolId || base.tipo || base.nombre || 'bracket');
        const stateLabel = normalizeDeviceState(base.state);

        if (stateLabel !== 'retirado') activeBaseCount += 1;
        baseItems.push(`Pieza ${pieza} (${faceLabel}): ${toolName} — ${stateLabel}`);
        if (stateLabel === 'despegado') {
          failureItemsSet.add(`${toolName} en pieza ${pieza} (${faceLabel}) — despegado`);
        }
      }

      const auxiliares = Array.isArray(faceValue.auxiliares) ? faceValue.auxiliares : [];
      auxiliares.forEach((aux: any) => {
        if (!isRecord(aux)) return;
        const auxState = normalizeDeviceState(aux.state);
        const auxName = formatToolLabel(aux.id || aux.toolId || aux.tipo || aux.nombre || 'auxiliar');
        if (auxState !== 'retirado') activeAuxCount += 1;
        auxItems.push(`Pieza ${pieza} (${faceLabel}): ${auxName} — ${auxState}`);
        if (auxState === 'despegado') {
          failureItemsSet.add(`${auxName} en pieza ${pieza} (${faceLabel}) — despegado`);
        }
      });
    });
  });

  const connectionItems = connections
    .filter((item: any) => normalizeDeviceState(item?.state) !== 'retirado')
    .map((item: any) => {
      const toolName = formatToolLabel(item?.toolId || item?.tipo || item?.id || 'conexion');
      const stateLabel = normalizeDeviceState(item?.state);
      const teeth = Array.isArray(item?.teeth)
        ? Array.from(new Set(item.teeth.map((tooth: any) => String(tooth)))).sort((a, b) => Number(a) - Number(b))
        : [];
      const rangeLabel = teeth.length ? `${teeth[0]} a ${teeth[teeth.length - 1]}` : 'sin piezas';
      return `${toolName}: ${rangeLabel} — ${stateLabel}`;
    });

  const extraFailures = asArray(consultation.hallazgos_odontograma)
    .filter(item => {
      const text = `${item.tipo || ''} ${item.descripcion || ''} ${item.severidad || ''}`.toLowerCase();
      return ['despeg', 'recement', 'falla'].some(token => text.includes(token));
    })
    .map(item => `${formatSimpleValue(item.tipo, 'Falla de aparatologia')} en pieza ${formatSimpleValue(item.diente, 'N/A')} (${formatSimpleValue(item.superficie, 'vestibular')}) — despegado`);

  extraFailures.forEach(item => failureItemsSet.add(item));

  return {
    lastEdit: extractOdontogramLastEdit(consultation),
    activeBaseCount,
    baseItems,
    activeAuxCount,
    auxItems,
    connectionCount: connectionItems.length,
    connectionItems,
    missingTeeth,
    failureItems: Array.from(failureItemsSet),
  };
};

type OrthoContainerSummaryData = {
  isFirstTime: boolean;
  facialSummary: string;
  treatmentSummary: string;
  oclusionSummary: string;
  facialUpdatedAt: string;
  treatmentUpdatedAt: string;
  oclusionUpdatedAt: string;
};

const extractOrthoContainerSummaryData = (consultation: PatientDashboardConsultation): OrthoContainerSummaryData => {
  const details = isRecord(consultation.detalles_clinicos) ? consultation.detalles_clinicos : {};
  const anamnesis = isRecord(details.anamnesis) ? details.anamnesis : {};
  const profile = isRecord(details.perfil_facial) ? details.perfil_facial : {};
  const arco = isRecord(details.arco_actual) ? details.arco_actual : {};
  const exam = isRecord(details.examen || details.examenOrto) ? (details.examen || details.examenOrto) : {};
  const resumenesContainers = isRecord(anamnesis.resumenes_containers) ? anamnesis.resumenes_containers : {};
  const updatesContainers = isRecord(anamnesis.ultima_modificacion_containers) ? anamnesis.ultima_modificacion_containers : {};

  const motiveRaw = anamnesis.motivoSeleccionado;
  const motiveValue = typeof motiveRaw === 'string'
    ? motiveRaw
    : (motiveRaw?.value || motiveRaw?.id || motiveRaw?.key || motiveRaw?.label || '');
  const isFirstTime = Boolean(details.es_primera_vez_ortodoncia) || String(motiveValue || '').toLowerCase() === 'instalacion_inicial';

  return {
    isFirstTime,
    facialSummary: formatSimpleValue(
      resumenesContainers.perfilFacial || profile.resumen_fluido || profile.resumen || profile.summary,
      ''
    ),
    treatmentSummary: formatSimpleValue(
      resumenesContainers.tratamientoActivo || arco.resumen_fluido || arco.resumen || arco.notasTratamiento,
      ''
    ),
    oclusionSummary: formatSimpleValue(
      resumenesContainers.oclusion || exam.resumen_fluido || exam.resumen || exam.observaciones,
      ''
    ),
    facialUpdatedAt: formatSimpleValue(
      updatesContainers.perfilFacial || details.perfil_facial_updated_at,
      ''
    ),
    treatmentUpdatedAt: formatSimpleValue(
      updatesContainers.tratamientoActivo || details.tratamiento_activo_updated_at,
      ''
    ),
    oclusionUpdatedAt: formatSimpleValue(
      updatesContainers.oclusion || details.oclusion_updated_at,
      ''
    ),
  };
};

const wasContainerUpdatedForConsultation = (updatedAt: string, consultationDate?: string | null): boolean => {
  const updatedDate = toDate(updatedAt);
  if (!updatedDate) return false;
  const consultationDateParsed = toDate(consultationDate);
  if (!consultationDateParsed) return true;
  const toleranceMs = 6 * 60 * 60 * 1000;
  return updatedDate.getTime() >= (consultationDateParsed.getTime() - toleranceMs);
};

const formatContainerUpdateForReport = (updatedAt: string, changed: boolean): string => {
  const date = toDate(updatedAt);
  if (!date) return CONSULTATION_DATA_MISSING;
  return `${date.toLocaleString('es-CO')} (${changed ? 'actualizado en esta consulta' : 'sin cambios en esta consulta'})`;
};

const buildOrthoClinicalSummary = (patient: any, consultation: PatientDashboardConsultation): string => {
  const identity = extractConsultationPatientIdentity(patient, consultation);
  const patientName = identity.fullName;
  const patientCode = identity.code;
  const consultationDate = extractConsultationDate(consultation);
  const date = formatDateNumeric(consultationDate);
  const time = formatTimeFormal(consultationDate);
  const motive = extractMotivo(consultation);
  const inventory = extractOrthoInventory(consultation);
  const diagnostics = extractDiagnosticos(consultation);
  const diagnosisText = diagnostics.length ? diagnostics.join(', ') : 'sin diagnosticos CIE-10 manuales registrados';
  const arcoActual = isRecord(consultation.detalles_clinicos?.arco_actual) ? consultation.detalles_clinicos?.arco_actual : {};
  const state = isRecord(consultation.detalles_clinicos?.anamnesis?.estadoGeneral) ? consultation.detalles_clinicos?.anamnesis?.estadoGeneral : {};
  const hygiene = formatSimpleValue(state.higieneOral, CONSULTATION_DATA_MISSING);
  const higieneDescripcion = formatSimpleValue(state.descripcionHigiene, 'sin descripción adicional de tejidos blandos');
  const phase = formatSimpleValue(arcoActual.faseTratamiento, CONSULTATION_DATA_MISSING);
  const calibre = formatSimpleValue(arcoActual.calibre, CONSULTATION_DATA_MISSING);
  const procedures = extractProcedures(consultation);
  const performedCount = procedures.filter(item => String(item.estado || '').toLowerCase() === 'realizado').length;
  const pendingCount = procedures.filter(item => ['aprobado', 'presupuestado', 'sugerido', 'pendiente'].includes(String(item.estado || '').toLowerCase())).length;
  const containerData = extractOrthoContainerSummaryData(consultation);

  const facialChanged = wasContainerUpdatedForConsultation(containerData.facialUpdatedAt, consultationDate);
  const treatmentChanged = wasContainerUpdatedForConsultation(containerData.treatmentUpdatedAt, consultationDate);
  const oclusionChanged = wasContainerUpdatedForConsultation(containerData.oclusionUpdatedAt, consultationDate);

  const parrafos: string[] = [];
  parrafos.push(`El paciente ${patientName}, identificado con Cédula de ciudadanía número ${identity.document} y código interno ${patientCode}, asiste el ${date} a las ${time} por ${motive.toLowerCase()}.`);
  parrafos.push(`El odontograma reporta ${inventory.activeBaseCount} bases o brackets activos, ${inventory.activeAuxCount} auxiliares clínicos y ${inventory.connectionCount} sistemas de conexión en seguimiento.`);

  if (inventory.failureItems.length > 0) {
    const sample = inventory.failureItems.slice(0, 2).join(', ');
    parrafos.push(`Se identificaron novedades mecánicas en aparatología, destacando ${sample}${inventory.failureItems.length > 2 ? ', entre otros hallazgos' : ''}.`);
  }

  parrafos.push(`Los diagnósticos codificados para esta evolución corresponden a ${diagnosisText}.`);

  if (containerData.isFirstTime) {
    parrafos.push(`Al tratarse de una instalación inicial, el análisis facial se consignó así, ${containerData.facialSummary || 'sin cambios morfofuncionales relevantes al examen inicial'}.`);
    parrafos.push(`El tratamiento activo quedó planteado con calibre ${calibre}, fase ${phase} y el siguiente resumen clínico, ${containerData.treatmentSummary || 'plan inicial en estructuración clínica'}.`);
    parrafos.push(`La evaluación de oclusión se registró de forma basal con ${containerData.oclusionSummary || 'parámetros iniciales para seguimiento evolutivo'}.`);
  } else {
    const cambios: string[] = [];
    if (facialChanged) cambios.push(`se actualizó el análisis facial, registrando que ${containerData.facialSummary || 'se mantienen referencias anatómicas funcionales estables'}`);
    if (treatmentChanged) cambios.push(`se ajustó el tratamiento activo, dejando constancia de que ${containerData.treatmentSummary || `la mecánica permanece en calibre ${calibre} y fase ${phase}`}`);
    if (oclusionChanged) cambios.push(`se documentó avance en evolución oclusal, con el registro ${containerData.oclusionSummary || 'sin variaciones críticas respecto al control previo'}`);

    if (cambios.length > 0) {
      parrafos.push(`Durante esta cita de control ${cambios.join(', ')}.`);
    } else {
      parrafos.push(`Durante esta cita de control no se documentaron cambios estructurales en los contenedores clínicos principales, y se mantiene continuidad terapéutica con calibre ${calibre} en fase ${phase}.`);
    }
  }

  parrafos.push(`En higiene oral se reporta estado ${hygiene.toLowerCase()}, con nota clínica complementaria que describe ${higieneDescripcion}.`);

  if (performedCount > 0 || pendingCount > 0) {
    parrafos.push(`La conducta clínica del día dejó ${performedCount} acción${performedCount === 1 ? '' : 'es'} ejecutada${performedCount === 1 ? '' : 's'} y ${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} para el siguiente seguimiento.`);
  }

  return parrafos.join(' ');
};

const buildGeneralStructuredReport = (patient: any, consultation: PatientDashboardConsultation): StructuredReport => {
  const identity = extractConsultationPatientIdentity(patient, consultation);
  const dateValue = extractConsultationDate(consultation);
  const hallazgos = asArray(consultation.hallazgos_odontograma);
  const diagnostics = extractDiagnosticos(consultation);
  const prescriptions = extractPrescriptions(consultation);
  const state = extractGeneralStateRecord(consultation);
  const exam = extractGeneralExamRecord(consultation);
  const pain = extractPainRecord(consultation);
  const containerData = extractGeneralContainerSummaryData(consultation);
  const pendingLongitudinal = toCleanList(
    consultation.detalles_clinicos?.workflow_summary?.longitudinal_pending ||
    consultation.detalles_clinicos?.workflow_summary?.pending_items ||
    consultation.detalles_clinicos?.plan_longitudinal ||
    consultation.detalles_clinicos?.pendientes_longitudinales
  );

  const painScale = Number(pain.escala || consultation.dolor_escala || 0);
  const painDetails = toCleanList(pain.caracteristicas || pain.molestias || pain.detalles?.caracteristicas);
  const painTriggers = toCleanList(pain.desencadenantes || pain.detalles?.desencadenantes);

  const hallazgoItems = hallazgos.length
    ? hallazgos.map(item => {
      const tooth = formatSimpleValue(item.diente, 'N/A');
      const type = formatSimpleValue(item.tipo, 'Hallazgo');
      const description = formatSimpleValue(item.descripcion, 'Sin descripcion');
      return `Diente ${tooth}: ${type} — ${description}`;
    })
    : ['Sin hallazgos nuevos en odontograma durante esta consulta'];

  const modeLabel = containerData.mode
    ? humanizeKey(containerData.mode.replace(/_/g, ' '))
    : CONSULTATION_DATA_MISSING;

  return {
    heading: 'INFORME CLÍNICO ODONTOLÓGICO GENERAL',
    sections: [
      {
        title: 'I. DATOS DEL PACIENTE',
        rows: [
          { label: 'Nombre', value: identity.fullName },
          { label: 'Código de paciente', value: identity.code },
          { label: 'Documento de identidad', value: identity.document },
          { label: 'Código de consulta', value: extractConsultationCode(consultation) },
          { label: 'Fecha de atención', value: formatDateNumeric(dateValue) },
          { label: 'Hora de ingreso', value: formatTimeFormal(dateValue) },
          { label: 'Número de consulta', value: extractConsultationNumber(consultation) },
        ],
      },
      {
        title: 'II. MOTIVO DE CONSULTA',
        rows: [
          { label: 'Motivo principal', value: extractMotivo(consultation) },
          { label: 'Relato del paciente', value: extractPatientStory(consultation) },
          { label: 'Marcadores de urgencia', value: extractUrgencyMarkers(consultation) },
          { label: 'Modo narrativo', value: modeLabel },
          { label: 'Continuidad clínica', value: containerData.continuitySummary },
        ],
      },
      {
        title: 'III. ANTECEDENTES Y CONTEXTO CLÍNICO',
        rows: [
          { label: 'Descripción clínica actual', value: containerData.descripcionClinicaSummary },
          { label: 'Estado del contenedor de descripción clínica', value: formatGeneralContainerStatus(containerData.descripcionClinicaStatus) },
          { label: 'Alertas médicas', value: extractGeneralAlert(consultation) },
          { label: 'Historial clínico', value: extractClinicalHistoryStatus(consultation) },
          { label: 'Resumen clínico fluido del contenedor', value: containerData.estadoGeneralSummary },
          { label: 'Estado del contenedor', value: formatGeneralContainerStatus(containerData.estadoGeneralStatus) },
        ],
      },
      {
        title: 'IV. DOLOR Y SINTOMATOLOGÍA',
        rows: [
          { label: 'Resumen clínico fluido de valoración clínica integral', value: containerData.valoracionClinicaSummary },
          { label: 'Estado del contenedor integral', value: formatGeneralContainerStatus(containerData.valoracionClinicaStatus) },
          { label: 'Dolor reportado', value: painScale > 0 ? `Escala ${painScale}/10` : CONSULTATION_DATA_MISSING },
          { label: 'Características del dolor', value: painDetails.length ? painDetails.join(', ') : CONSULTATION_DATA_MISSING },
          { label: 'Desencadenantes del dolor', value: painTriggers.length ? painTriggers.join(', ') : CONSULTATION_DATA_MISSING },
          { label: 'Resumen clínico fluido del contenedor', value: containerData.dolorSummary },
          { label: 'Estado del contenedor', value: formatGeneralContainerStatus(containerData.dolorStatus) },
        ],
      },
      {
        title: 'V. EXAMEN ESTOMATOLÓGICO',
        rows: [
          { label: 'Actitud del paciente', value: formatSimpleValue(state.actitud, CONSULTATION_DATA_MISSING) },
          { label: 'Higiene oral', value: formatSimpleValue(state.higieneOral, CONSULTATION_DATA_MISSING) },
          { label: 'ATM', value: formatSimpleValue(exam.atm, CONSULTATION_DATA_MISSING) },
          { label: 'Labios', value: formatSimpleValue(exam.labios, CONSULTATION_DATA_MISSING) },
          { label: 'Carrillos', value: formatSimpleValue(exam.carrillos, CONSULTATION_DATA_MISSING) },
          { label: 'Lengua', value: formatSimpleValue(exam.lengua, CONSULTATION_DATA_MISSING) },
          { label: 'Paladar', value: formatSimpleValue(exam.paladar, CONSULTATION_DATA_MISSING) },
          { label: 'Encías/Piso de boca', value: formatSimpleValue(exam.enciasPisoBoca || exam.encias_piso_boca || exam.encias, CONSULTATION_DATA_MISSING) },
          { label: 'Hallazgos adicionales', value: formatSimpleValue(exam.hallazgosAdicionales || exam.hallazgos_adicionales, CONSULTATION_DATA_MISSING) },
          { label: 'Resumen clínico fluido del contenedor', value: containerData.examenSummary },
          { label: 'Estado del contenedor', value: formatGeneralContainerStatus(containerData.examenStatus) },
        ],
      },
      {
        title: 'VI. ODONTOGRAMA Y DIAGNÓSTICO',
        rows: [
          { label: 'Última modificación del odontograma', value: extractOdontogramLastEdit(consultation) },
          { label: 'Hallazgos activos', value: String(hallazgos.length) },
          { label: 'Resumen clínico fluido de odontograma', value: containerData.odontogramaSummary },
          { label: 'Estado del contenedor odontograma', value: formatGeneralContainerStatus(containerData.odontogramaStatus) },
          { label: 'Resumen clínico fluido de diagnóstico', value: containerData.diagnosticoSummary },
          { label: 'Estado del contenedor diagnóstico', value: formatGeneralContainerStatus(containerData.diagnosticoStatus) },
        ],
        bulletGroups: [
          { title: 'Detalle', items: hallazgoItems },
          {
            title: 'Diagnósticos CIE-10',
            items: diagnostics.length ? diagnostics : ['Sin diagnósticos CIE-10 manuales registrados'],
          },
        ],
      },
      {
        title: 'VII. CONDUCTA CLÍNICA',
        rows: [
          { label: 'Resumen clínico fluido del contenedor', value: containerData.conductaSummary },
          { label: 'Estado del contenedor', value: formatGeneralContainerStatus(containerData.conductaStatus) },
        ],
        bulletGroups: [
          {
            title: 'Procedimientos realizados hoy',
            items: buildProcedureLinesByState(consultation, ['realizado'], 'Sin procedimientos realizados en esta sesión'),
          },
          {
            title: 'Procedimientos aprobados',
            items: buildProcedureLinesByState(consultation, ['aprobado'], 'Sin procedimientos aprobados adicionales'),
          },
          {
            title: 'Pendientes y presupuestados',
            items: buildProcedureLinesByState(consultation, ['presupuestado', 'sugerido', 'pendiente'], 'Sin procedimientos en lista de espera'),
          },
        ],
      },
      {
        title: 'VIII. PLAN LONGITUDINAL',
        rows: [
          { label: 'Resumen clínico fluido del contenedor', value: containerData.planSummary },
          { label: 'Estado del contenedor', value: formatGeneralContainerStatus(containerData.planStatus) },
        ],
        bulletGroups: [
          {
            title: 'Pendientes',
            items: pendingLongitudinal.length ? pendingLongitudinal : [CONSULTATION_DATA_MISSING],
          },
        ],
      },
      {
        title: 'IX. PRESCRIPCIÓN Y CIERRE TÉCNICO',
        rows: [
          { label: 'Hora de ingreso de la sesión', value: formatTimeFormal(dateValue) },
          { label: 'Resumen clínico fluido de prescripción', value: containerData.prescripcionSummary },
          { label: 'Estado del contenedor prescripción', value: formatGeneralContainerStatus(containerData.prescripcionStatus) },
          { label: 'Cierre técnico de la sesión', value: containerData.cierreSummary },
        ],
        bulletGroups: [
          {
            title: 'Recetas emitidas',
            items: prescriptions.length
              ? prescriptions.map(item => `${formatSimpleValue(item.medicamento, 'Medicamento')} — ${formatSimpleValue(item.dosis, 'Dosis no registrada')}`)
              : ['Sin fórmulas médicas en esta sesión'],
          },
        ],
      },
      {
        title: 'X. RESUMEN TÉCNICO AUTOMÁTICO',
        paragraph: buildGeneralClinicalSummary(patient, consultation),
      },
    ],
  };
};

const buildOrthoStructuredReport = (patient: any, consultation: PatientDashboardConsultation): StructuredReport => {
  const identity = extractConsultationPatientIdentity(patient, consultation);
  const dateValue = extractConsultationDate(consultation);
  const diagnostics = extractDiagnosticos(consultation);
  const inventory = extractOrthoInventory(consultation);
  const anamnesis = isRecord(consultation.detalles_clinicos?.anamnesis) ? consultation.detalles_clinicos?.anamnesis : {};
  const state = isRecord(anamnesis.estadoGeneral) ? anamnesis.estadoGeneral : {};
  const facial = isRecord(consultation.detalles_clinicos?.perfil_facial) ? consultation.detalles_clinicos?.perfil_facial : {};
  const arco = isRecord(consultation.detalles_clinicos?.arco_actual) ? consultation.detalles_clinicos?.arco_actual : {};
  const exam = isRecord(consultation.detalles_clinicos?.examen || consultation.examenOrto) ? (consultation.detalles_clinicos?.examen || consultation.examenOrto) : {};
  const containerData = extractOrthoContainerSummaryData(consultation);
  const facialChanged = wasContainerUpdatedForConsultation(containerData.facialUpdatedAt, dateValue);
  const treatmentChanged = wasContainerUpdatedForConsultation(containerData.treatmentUpdatedAt, dateValue);
  const oclusionChanged = wasContainerUpdatedForConsultation(containerData.oclusionUpdatedAt, dateValue);

  return {
    heading: 'INFORME DE EVOLUCIÓN ORTODÓNTICA',
    sections: [
      {
        title: '1. DATOS DEL PACIENTE',
        rows: [
          { label: 'Nombre', value: identity.fullName },
          { label: 'Código de paciente', value: identity.code },
          { label: 'Documento de identidad', value: identity.document },
          { label: 'Código de consulta', value: extractConsultationCode(consultation) },
          { label: 'Fecha de atención', value: formatDateNumeric(dateValue) },
          { label: 'Número de consulta', value: extractConsultationNumber(consultation) },
        ],
      },
      {
        title: '2. MOTIVO DE CONSULTA',
        rows: [
          { label: 'Motivo principal', value: extractMotivo(consultation) },
          { label: 'Relato del paciente', value: extractPatientStory(consultation) },
          { label: 'Marcadores de urgencia', value: extractUrgencyMarkers(consultation) },
        ],
      },
      {
        title: '3. ANTECEDENTES Y ALERTAS',
        rows: [
          { label: 'Alertas médicas', value: formatSimpleValue(state.alertaMedica || state.alerta_medica, CONSULTATION_DATA_MISSING) },
          { label: 'Historial clínico', value: extractClinicalHistoryStatus(consultation) },
        ],
      },
      {
        title: '4. ANÁLISIS FACIAL',
        rows: [
          { label: 'Perfil sagital', value: formatSimpleValue(facial.perfilSagital, CONSULTATION_DATA_MISSING) },
          { label: 'Simetría facial', value: formatSimpleValue(facial.simetria, CONSULTATION_DATA_MISSING) },
          { label: 'Competencia labial', value: formatSimpleValue(facial.competenciaLabial, CONSULTATION_DATA_MISSING) },
          { label: 'Ángulo nasolabial', value: formatSimpleValue(facial.anguloNasolabial, CONSULTATION_DATA_MISSING) },
          { label: 'Tercio inferior de cara', value: formatSimpleValue(facial.tercioBajoCara, CONSULTATION_DATA_MISSING) },
          { label: 'Tipo facial', value: formatSimpleValue(facial.tipoCara, CONSULTATION_DATA_MISSING) },
          { label: 'Resumen clínico fluido', value: formatSimpleValue(containerData.facialSummary, CONSULTATION_DATA_MISSING) },
          { label: 'Última actualización del análisis facial', value: formatContainerUpdateForReport(containerData.facialUpdatedAt, facialChanged) },
        ],
      },
      {
        title: '5. ESTADO DEL TRATAMIENTO ACTIVO',
        rows: [
          { label: 'Calibre del arco actual', value: formatSimpleValue(arco.calibre, CONSULTATION_DATA_MISSING) },
          { label: 'Fase del tratamiento', value: formatSimpleValue(arco.faseTratamiento, CONSULTATION_DATA_MISSING) },
          ...(containerData.isFirstTime
            ? [
              { label: 'Plan clínico inicial', value: formatSimpleValue(arco.planInstalacion, CONSULTATION_DATA_MISSING) },
              { label: 'Arcada o sector intervenido', value: formatSimpleValue(arco.arcadaInstalacion, CONSULTATION_DATA_MISSING) },
            ]
            : []),
          { label: 'Nota clínica del tratamiento', value: formatSimpleValue(arco.notasTratamiento, CONSULTATION_DATA_MISSING) },
          { label: 'Resumen clínico fluido del tratamiento', value: formatSimpleValue(containerData.treatmentSummary, CONSULTATION_DATA_MISSING) },
          { label: 'Última actualización del tratamiento activo', value: formatContainerUpdateForReport(containerData.treatmentUpdatedAt, treatmentChanged) },
          { label: 'Higiene oral', value: formatSimpleValue(state.higieneOral, CONSULTATION_DATA_MISSING) },
          { label: 'Estado general de aparatología', value: formatSimpleValue(state.estadoAparatos, CONSULTATION_DATA_MISSING) },
          { label: 'Como quedó la aparatología', value: `El odontograma ortodóntico dejó ${inventory.activeBaseCount} brackets o bases activas y ${inventory.connectionCount} conexiones clínicas en seguimiento.` },
        ],
      },
      {
        title: '6. ODONTOGRAMA — APARATOLOGÍA',
        rows: [
          { label: 'Última modificación del odontograma', value: inventory.lastEdit },
          { label: 'Bases/brackets activos', value: String(inventory.activeBaseCount) },
          { label: 'Auxiliares activos', value: String(inventory.activeAuxCount) },
          { label: 'Sistemas de conexión', value: String(inventory.connectionCount) },
          { label: 'Piezas ausentes', value: inventory.missingTeeth.length ? inventory.missingTeeth.join(', ') : 'Ninguna' },
        ],
        bulletGroups: [
          {
            title: 'Bases/brackets activos',
            items: inventory.baseItems.length ? inventory.baseItems : ['Sin bases/brackets activos registrados'],
          },
          {
            title: 'Auxiliares activos',
            items: inventory.auxItems.length ? inventory.auxItems : ['Sin auxiliares activos registrados'],
          },
          {
            title: 'Sistemas de conexión',
            items: inventory.connectionItems.length ? inventory.connectionItems : ['Sin sistemas de conexión activos'],
          },
          {
            title: 'Hallazgos de falla',
            items: inventory.failureItems.length ? inventory.failureItems : ['Sin hallazgos de falla registrados'],
          },
        ],
      },
      {
        title: '7. EVALUACIÓN OCLUSAL',
        rows: [
          { label: 'Clase molar derecha', value: formatSimpleValue(exam.claseMolarDer, CONSULTATION_DATA_MISSING) },
          { label: 'Clase molar izquierda', value: formatSimpleValue(exam.claseMolarIzq, CONSULTATION_DATA_MISSING) },
          { label: 'Clase canina derecha', value: formatSimpleValue(exam.claseCaninaDer, CONSULTATION_DATA_MISSING) },
          { label: 'Clase canina izquierda', value: formatSimpleValue(exam.claseCaninaIzq, CONSULTATION_DATA_MISSING) },
          { label: 'Overjet', value: formatSimpleValue(exam.overjet, CONSULTATION_DATA_MISSING) },
          { label: 'Overbite', value: formatSimpleValue(exam.overbite, CONSULTATION_DATA_MISSING) },
          { label: 'Línea media dental', value: formatSimpleValue(exam.lineaMedia, CONSULTATION_DATA_MISSING) },
          { label: 'Resumen clínico fluido de oclusión', value: formatSimpleValue(containerData.oclusionSummary, CONSULTATION_DATA_MISSING) },
          { label: 'Última actualización de evolución oclusal', value: formatContainerUpdateForReport(containerData.oclusionUpdatedAt, oclusionChanged) },
        ],
      },
      {
        title: '8. DIAGNÓSTICO CIE-10 ORTODONCIA',
        bulletGroups: [
          {
            title: 'Diagnósticos',
            items: diagnostics.length ? diagnostics : ['Sin diagnósticos CIE-10 manuales registrados'],
          },
        ],
      },
      {
        title: '9. CONDUCTA CLÍNICA',
        bulletGroups: [
          {
            title: 'Procedimientos realizados hoy',
            items: buildProcedureLinesByState(consultation, ['realizado'], 'Sin procedimientos realizados en esta sesión'),
          },
          {
            title: 'Procedimientos aprobados',
            items: buildProcedureLinesByState(consultation, ['aprobado'], 'Sin procedimientos aprobados adicionales'),
          },
          {
            title: 'Pendientes y presupuestados',
            items: buildProcedureLinesByState(consultation, ['presupuestado', 'sugerido', 'pendiente'], 'Sin procedimientos en lista de espera'),
          },
        ],
      },
      {
        title: '10. RESUMEN TÉCNICO AUTOMÁTICO',
        paragraph: buildOrthoClinicalSummary(patient, consultation),
      },
    ],
  };
};

const buildStructuredConsultationReport = (patient: any, consultation: PatientDashboardConsultation): StructuredReport => {
  return consultation.tipo_consulta === 'ORTODONCIA'
    ? buildOrthoStructuredReport(patient, consultation)
    : buildGeneralStructuredReport(patient, consultation);
};

const buildReportText = (patient: any, consultation: PatientDashboardConsultation) => {
  const report = buildStructuredConsultationReport(patient, consultation);
  const lines: string[] = [report.heading, ''];

  report.sections.forEach(section => {
    lines.push(section.title);
    (section.rows || []).forEach(row => {
      lines.push(`${row.label}: ${row.value}`);
    });

    (section.bulletGroups || []).forEach(group => {
      lines.push(`${group.title}: ${group.items.join(' ; ')}`);
    });

    if (section.paragraph) {
      lines.push(section.paragraph);
    }

    lines.push('');
  });

  return lines.join('\n').trim();
};

const renderReportHTML = (patient: any, consultation: PatientDashboardConsultation) => {
  const report = buildStructuredConsultationReport(patient, consultation);
  const consultationCode = extractConsultationCode(consultation);
  const dateInfo = formatDateTime(extractConsultationDate(consultation));
  const documentTitle = report.heading;
  const logoUrl = (() => {
    try {
      return localStorage.getItem('clinic_logo_url') || '/logo-consultorio.png';
    } catch {
      return '/logo-consultorio.png';
    }
  })();

  const sectionsHtml = report.sections.map(section => {
    const isPatientData = /^(1\.|I\.)\s+DATOS DEL PACIENTE/i.test(section.title);
    const isTechnicalBlock = /ODONTOGRAMA|CONDUCTA CL[IÍ]NICA/.test(section.title);

    const rowsHtml = isPatientData
      ? `<div class="cards-grid">${(section.rows || [])
        .map(row => `<div class="card"><div class="card-label">${row.label}</div><div class="card-value">${row.value}</div></div>`)
        .join('')}</div>`
      : (section.rows || [])
        .map(row => `<p class="line"><strong>${row.label}:</strong> ${row.value}</p>`)
        .join('');

    const bulletGroupsHtml = (section.bulletGroups || []).map(group => {
      const itemsHtml = group.items
        .map((item, index) => `<div class="table-row"><span class="row-index">${index + 1}</span><span class="row-content">${item}</span></div>`)
        .join('');

      if (isTechnicalBlock) {
        return `<div class="group"><div class="group-title"><strong>${group.title}</strong></div><div class="group-table">${itemsHtml}</div></div>`;
      }

      return `<div class="group"><div class="group-title"><strong>${group.title}</strong></div><div class="bitacora-box">${itemsHtml}</div></div>`;
    }).join('');

    const paragraphHtml = section.paragraph ? `<p class="paragraph">${section.paragraph}</p>` : '';
    return `<section class="section"><h3>${section.title}</h3>${rowsHtml}${bulletGroupsHtml}${paragraphHtml}</section>`;
  }).join('');

  return `<!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${documentTitle}</title>
    <style>
      *{box-sizing:border-box}
      @keyframes reportFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes sectionFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @page{size:A4;margin:12mm}
      body{font-family:${REPORT_FONT_STACK};background:#eceff2;color:#111827;margin:0;padding:24px}
      .page{width:100%;max-width:190mm;margin:0 auto 14px;background:#fff;border:1px solid #d1d5db;box-shadow:0 10px 28px rgba(15,23,42,.12);padding:18px 18px 16px;page-break-inside:avoid;animation:reportFadeIn .3s ease both}
      .head{padding:4px 4px 14px;border-bottom:3px solid #111827;display:flex;justify-content:space-between;align-items:flex-start;gap:18px}
      .brand{display:flex;gap:12px;align-items:flex-start}
      .brand-logo{width:54px;height:54px;border:1px solid #d1d5db;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#f9fafb;overflow:hidden}
      .brand-logo img{width:100%;height:100%;object-fit:cover}
      .brand-fallback{width:100%;height:100%;display:none;align-items:center;justify-content:center;font-weight:800;color:#334155;letter-spacing:.08em}
      .clinic-name{font-size:22px;font-weight:800;letter-spacing:.01em;font-family:${REPORT_FONT_STACK};color:#111827}
      .clinic-sub{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#64748b;margin-top:4px}
      .doc-meta{text-align:right}
      .doc-title{font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#111827}
      .doc-code{font-size:12px;font-weight:700;margin-top:8px}
      .doc-line{font-size:11px;color:#475569;margin-top:3px}
      .body{padding-top:14px;display:grid;gap:12px}
      .section{border:1px solid #d1d5db;border-radius:8px;padding:12px;background:#fff;break-inside:avoid;page-break-inside:avoid;animation:sectionFadeIn .35s ease both}
      .section h3{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e293b;font-weight:800}
      .line{margin:0 0 7px;line-height:1.6;font-size:12.3px;color:#1f2937}
      .cards-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .card{border:1px solid #d1d5db;border-radius:10px;padding:9px 10px;background:#fff}
      .card-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:#374151;font-weight:800;margin-bottom:5px}
      .card-value{font-size:12.5px;line-height:1.45;color:#111827;font-weight:700}
      .group{margin-top:8px}
      .group-title{font-size:11px;color:#334155;margin-bottom:5px;text-transform:none}
      .group-table,.bitacora-box{border:1px solid #d1d5db;border-radius:8px;background:#fcfcfd}
      .table-row{display:grid;grid-template-columns:26px 1fr;gap:8px;padding:7px 9px;border-bottom:1px solid #e8edf3}
      .table-row:last-child{border-bottom:none}
      .row-index{font-size:11px;font-weight:800;color:#111827}
      .row-content{font-size:12.1px;line-height:1.55;color:#334155}
      .paragraph{margin:0;line-height:1.7;font-size:12.3px;color:#1f2937}
      .footer{border-top:1px solid #d5dee8;padding-top:10px;font-size:10px;color:#64748b;text-align:right}
      @media print{body{background:#fff;padding:0}.page{box-shadow:none;margin:0 auto 0;border:1px solid #d5dee8}}
    </style>
  </head>
  <body>
    <div class="page">
      <div class="head">
        <div class="brand">
          <div class="brand-logo">
            <img src="${logoUrl}" alt="Logo consultorio" onerror="this.style.display='none';document.getElementById('logo-fallback').style.display='flex';" />
            <div id="logo-fallback" class="brand-fallback">ED</div>
          </div>
          <div>
            <div class="clinic-name">${CLINIC_REPORT.name}</div>
            <div class="clinic-sub">${CLINIC_REPORT.subtitle}</div>
          </div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${documentTitle}</div>
          <div class="doc-code">${consultationCode}</div>
          <div class="doc-line">Fecha de emision: ${dateInfo.longDate}</div>
          <div class="doc-line">Profesional: ${extractDoctor(consultation)}</div>
        </div>
      </div>
      <div class="body">
        ${sectionsHtml}
        <div class="footer">Documento generado desde el registro clinico de la consulta ${consultationCode}.</div>
      </div>
    </div>
    <script>window.onload=function(){window.print();};</script>
  </body>
  </html>`;
};

interface ConsultationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  consultation: PatientDashboardConsultation | null;
}

const ConsultationReportModal = ({ isOpen, onClose, patient, consultation }: ConsultationReportModalProps) => {
  if (!isOpen || !patient || !consultation) return null;

  const dateInfo = formatDateTime(extractConsultationDate(consultation));
  const consultationCode = extractConsultationCode(consultation);
  const report = buildStructuredConsultationReport(patient, consultation);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildReportText(patient, consultation));
  };

  const handlePrint = () => {
    const reportWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!reportWindow) return;
    reportWindow.document.open();
    reportWindow.document.write(renderReportHTML(patient, consultation));
    reportWindow.document.close();
  };

  const modalAnimation = {
    animation: 'reportModalIn .32s cubic-bezier(.22,1,.36,1) both'
  } as React.CSSProperties;

  const Section = ({ title, children, animationDelay = 0 }: { title: string; children: React.ReactNode; animationDelay?: number }) => (
    <section style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 14, padding: 16, boxShadow: '0 6px 16px rgba(15,23,42,.05)', animation: 'reportSectionIn .35s ease both', animationDelay: `${animationDelay}s` }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111827', fontFamily: REPORT_FONT_STACK }}>{title}</h3>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );

  const ReportRows = ({ rows, cards = false }: { rows: ReportRow[]; cards?: boolean }) => (
    cards ? (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 9 }}>
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} style={{ border: '1px solid #d1d5db', borderRadius: 11, padding: '10px 11px', background: '#fff' }}>
            <div style={{ fontSize: 10, color: '#374151', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800, marginBottom: 5 }}>{row.label}</div>
            <div style={{ fontSize: 13.4, color: '#1f2937', lineHeight: 1.6, fontWeight: 700 }}>{row.value}</div>
          </div>
        ))}
      </div>
    ) : (
      <div style={{ display: 'grid', gap: 7 }}>
        {rows.map((row) => (
          <div key={`${row.label}-${row.value}`} style={{ fontSize: 13.5, color: '#1f2937', lineHeight: 1.75 }}>
            <strong style={{ color: '#0f172a' }}>{row.label}:</strong> {row.value}
          </div>
        ))}
      </div>
    )
  );

  const ReportBulletGroups = ({ groups, technical = false }: { groups: ReportBulletGroup[]; technical?: boolean }) => (
    <div style={{ display: 'grid', gap: 10 }}>
      {groups.map(group => (
        <div key={group.title}>
          <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 6, fontWeight: 700 }}>{group.title}</div>
          <div style={{ border: '1px solid #d1d5db', borderRadius: 10, background: '#fcfcfd' }}>
            {group.items.map((item, index) => (
              <div key={`${group.title}-${item}`} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 8, padding: '8px 10px', borderBottom: index === group.items.length - 1 ? 'none' : '1px solid #e8edf3' }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: technical ? '#111827' : '#64748b' }}>{index + 1}</span>
                <span style={{ fontSize: 13.2, lineHeight: 1.65, color: '#1f2937' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1250, background: 'rgba(15,23,42,.42)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '22px 18px', overflowY: 'auto', fontFamily: REPORT_FONT_STACK }}>
      <style>{`@keyframes reportModalIn{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes reportSectionIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width: 'min(980px, 100%)', background: '#fff', border: '1px solid #d1d5db', borderRadius: 18, boxShadow: '0 18px 48px rgba(15,23,42,.18)', overflow: 'hidden', ...modalAnimation }}>
        <div style={{ padding: '24px 26px 18px', borderBottom: '3px solid #111827', display: 'flex', alignItems: 'flex-start', gap: 16, background: 'linear-gradient(180deg,#ffffff 0%,#f3f4f6 100%)' }}>
          <div style={{ width: 56, height: 56, border: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', fontWeight: 700, fontSize: 18, letterSpacing: '.08em', background: '#fff' }}>ED</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.14em' }}>{CLINIC_REPORT.subtitle}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginTop: 4, fontFamily: REPORT_FONT_STACK }}>{report.heading}</div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>{patient.nombre} {patient.apellidos}</div>
          </div>
          <div style={{ minWidth: 240, textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>{consultationCode}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Fecha: {dateInfo.longDate}</div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Profesional: {extractDoctor(consultation)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer' }}>
              <Copy size={15} /> Copiar
            </button>
            <button onClick={handlePrint} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', border: '1px solid #334155', borderRadius: 10, background: '#334155', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onClose} style={{ width: 36, height: 36, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 22, display: 'grid', gap: 14 }}>
          {report.sections.map((section, sectionIndex) => {
            const isPatientData = /^(1\.|I\.)\s+DATOS DEL PACIENTE/i.test(section.title);
            const isTechnicalBlock = /ODONTOGRAMA|CONDUCTA CL[IÍ]NICA/.test(section.title);
            return (
            <Section key={section.title} title={section.title} animationDelay={0.04 + sectionIndex * 0.03}>
              {section.rows?.length ? <ReportRows rows={section.rows} cards={isPatientData} /> : null}
              {section.bulletGroups?.length ? <div style={{ marginTop: section.rows?.length ? 10 : 0 }}><ReportBulletGroups groups={section.bulletGroups} technical={isTechnicalBlock} /></div> : null}
              {section.paragraph ? (
                <div style={{ marginTop: 8, fontSize: 13.5, color: '#1f2937', lineHeight: 1.8, border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', background: '#fcfcfd' }}>
                  {section.paragraph}
                </div>
              ) : null}
            </Section>
            );
          })}

          <div style={{ fontSize: 11, color: '#475569', textAlign: 'right', borderTop: '1px solid #cbd5e1', paddingTop: 12 }}>
            Documento generado desde la consulta {consultationCode}.
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MODAL EDITAR PACIENTE
// ============================================
interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any;
  onSave: (updatedPatient: any) => void;
}

const EditPatientModal = ({ isOpen, onClose, patient, onSave }: EditPatientModalProps) => {
  const [formData, setFormData] = useState({
    cc: patient?.cc || '',
    nombre: patient?.nombre || '',
    apellidos: patient?.apellidos || '',
    fecha_nacimiento: patient?.fecha_nacimiento || '',
    telefono: patient?.telefono || '',
    email: patient?.email || '',
    municipio_ciudad: patient?.municipio_ciudad || '',
    direccion: patient?.direccion || '',
    tipo_sangre_rh: patient?.tipo_sangre_rh || '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── drag ── */
  const [pos, setPos] = useState<{x:number;y:number}|null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({x:0,y:0});

  useEffect(() => {
    if (isOpen) {
      setPos({ x: Math.max(0,(window.innerWidth-500)/2), y: Math.max(0,(window.innerHeight-580)/2) });
    }
  }, [isOpen]);

  useEffect(() => {
    if (patient) {
      setFormData({
        cc: patient.cc || '',
        nombre: patient.nombre || '',
        apellidos: patient.apellidos || '',
        fecha_nacimiento: patient.fecha_nacimiento || '',
        telefono: patient.telefono || '',
        email: patient.email || '',
        municipio_ciudad: patient.municipio_ciudad || '',
        direccion: patient.direccion || '',
        tipo_sangre_rh: patient.tipo_sangre_rh || '',
      });
    }
  }, [patient]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onTitleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - (pos?.x??0), y: e.clientY - (pos?.y??0) };
    e.preventDefault();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const updatedRows = await patientService.updatePatient(patient.id, formData);
      const persisted = Array.isArray(updatedRows) && updatedRows[0] ? updatedRows[0] : null;
      onSave({ ...patient, ...formData, ...(persisted || {}) });
      onClose();
    } catch (error) {
      console.error('Error updating patient:', error);
      setSaveError('Error al actualizar paciente. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !pos) return null;

  const inp: React.CSSProperties = {
    width:'100%', padding:'10px 13px', borderRadius:12,
    border:'1.5px solid #eef0f2', fontSize:13.5, fontFamily:'inherit',
    outline:'none', transition:'border-color .15s', background:'#fafbfc', color:'#1e293b',
  };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:11, fontWeight:700, color:'#64748b',
    letterSpacing:'.06em', textTransform:'uppercase', marginBottom:6,
  };

  return (
    <div
      style={{
        position:'fixed', left:pos.x, top:pos.y, width:480, zIndex:1200,
        borderRadius:22, background:'#fff',
        border:'1px solid #e2e8f0',
        boxShadow:'0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.07)',
        overflow:'hidden', fontFamily:"'Inter',-apple-system,sans-serif",
        userSelect:'none',
      }}
    >
      {/* title bar / drag handle */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          padding:'16px 20px 14px',
          background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
          borderBottom:'1px solid #eef0f2',
          cursor:'grab', display:'flex', alignItems:'center', justifyContent:'space-between',
        }}
      >
        <div>
          <div style={{fontSize:15,fontWeight:800,color:'#1e293b',letterSpacing:'-.02em'}}>Editar Paciente</div>
          <div style={{fontSize:11.5,color:'#94a3b8',marginTop:2,fontWeight:500}}>
            {patient?.nombre} {patient?.apellidos}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width:28,height:28,borderRadius:8,border:'1.5px solid #e2e8f0',
            background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
            justifyContent:'center',color:'#64748b',transition:'all .15s',
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#ef4444';e.currentTarget.style.color='#ef4444';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b';}}
        >
          <X size={13}/>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{padding:20,display:'grid',gap:13,userSelect:'text'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={lbl}>Documento</label>
            <input type="text" style={inp} value={formData.cc}
              onChange={e=>setFormData({...formData,cc:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
          <div>
            <label style={lbl}>Fecha de Nacimiento</label>
            <input type="date" style={inp} value={formData.fecha_nacimiento}
              onChange={e=>setFormData({...formData,fecha_nacimiento:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={lbl}>Nombre</label>
            <input type="text" style={inp} value={formData.nombre}
              onChange={e=>setFormData({...formData,nombre:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
          <div>
            <label style={lbl}>Apellidos</label>
            <input type="text" style={inp} value={formData.apellidos}
              onChange={e=>setFormData({...formData,apellidos:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label style={lbl}>Teléfono</label>
            <input type="tel" style={inp} value={formData.telefono}
              onChange={e=>setFormData({...formData,telefono:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" style={inp} value={formData.email}
              onChange={e=>setFormData({...formData,email:e.target.value})}
              onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
              onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
          </div>
        </div>
        <div>
          <label style={lbl}>Tipo de Sangre / RH</label>
          <select style={inp} value={formData.tipo_sangre_rh}
            onChange={e=>setFormData({...formData,tipo_sangre_rh:e.target.value})}
            onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
            onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}>
            <option value="">Seleccionar...</option>
            {PATIENT_RH_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Municipio / Ciudad</label>
          <input type="text" style={inp} value={formData.municipio_ciudad}
            onChange={e=>setFormData({...formData,municipio_ciudad:e.target.value})}
            onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
            onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
        </div>
        <div>
          <label style={lbl}>Dirección</label>
          <input type="text" style={inp} value={formData.direccion}
            onChange={e=>setFormData({...formData,direccion:e.target.value})}
            onFocus={e=>e.currentTarget.style.borderColor='#29b2e8'}
            onBlur={e=>e.currentTarget.style.borderColor='#eef0f2'}/>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:4}}>
          <button type="button" onClick={onClose} style={{
            padding:'9px 18px',borderRadius:10,border:'1.5px solid #e2e8f0',
            background:'#fff',color:'#475569',fontWeight:600,fontSize:13.5,cursor:'pointer',
            fontFamily:'inherit',transition:'all .15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#cbd5e1';e.currentTarget.style.background='#f8fafc';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.background='#fff';}}
          >Cancelar</button>
          <button type="submit" disabled={saving} style={{
            padding:'9px 22px',borderRadius:10,border:'none',
            background:'#29b2e8',color:'#fff',fontWeight:700,fontSize:13.5,cursor:'pointer',
            fontFamily:'inherit',opacity:saving?0.65:1,
            boxShadow:'0 1px 3px rgba(41,178,232,.3),0 4px 14px rgba(41,178,232,.2)',
            transition:'all .15s',
          }}
            onMouseEnter={e=>{if(!saving){e.currentTarget.style.background='#18a3db';e.currentTarget.style.transform='translateY(-1px)';}}} 
            onMouseLeave={e=>{e.currentTarget.style.background='#29b2e8';e.currentTarget.style.transform='translateY(0)';}}
          >{saving?'Guardando...':'Guardar Cambios'}</button>
        </div>
        {saveError&&<p style={{color:'#ef4444',fontSize:12,margin:0,textAlign:'right'}}>{saveError}</p>}
      </form>
    </div>
  );
};
interface NuevoConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tipo: 'odontologia' | 'ortodoncia') => void;
  anchorPos?: {x:number;y:number};
}

const NuevoConsultaModal = ({ isOpen, onClose, onSelect, anchorPos }: NuevoConsultaModalProps) => {
  const [confirming, setConfirming] = useState<'odontologia' | 'ortodoncia' | null>(null);

  /* ── drag (solo para el paso de selección) ── */
  const [pos, setPos] = useState<{x:number;y:number}|null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({x:0,y:0});

  useEffect(() => {
    if (isOpen) {
      setConfirming(null);
      setPos({ x: Math.max(0,(window.innerWidth-420)/2), y: Math.max(0,(window.innerHeight-340)/2) });
    }
  }, [isOpen]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const onTitleMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - (pos?.x??0), y: e.clientY - (pos?.y??0) };
    e.preventDefault();
  };

  const handleClose = () => { setConfirming(null); onClose(); };

  if (!isOpen || !pos) return null;

  /* ─── PASO 1: ventana flotante arrastrable ─── */
  if (!confirming) return (
    <>
      <style>{`
        @keyframes ncFloatIn {
          from { opacity:0; transform:scale(.94) translateY(10px); }
          to   { opacity:1; transform:scale(1)   translateY(0);    }
        }
        .pd-option-btn {
          width:100%;padding:16px 18px;background:#f8fafc;
          border:1.5px solid #e8edf2;border-radius:14px;
          cursor:pointer;text-align:left;
          display:flex;gap:14px;align-items:center;
          transition:all .22s cubic-bezier(.22,1,.36,1);
          font-family:'Inter',-apple-system,sans-serif;
        }
        .pd-option-btn:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(0,0,0,.08); border-color:#c8d3e0; background:#fff; }
      `}</style>
      <div
        style={{
          position:'fixed', inset:0, zIndex:1200,
          display:'flex', alignItems:'center', justifyContent:'center',
          background:'rgba(15,23,42,.18)', backdropFilter:'blur(6px)',
        }}
        onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
      <div
        style={{
          width:420,
          borderRadius:20, background:'#fff',
          border:'1px solid #e2e8f0',
          boxShadow:'0 4px 8px rgba(0,0,0,.06), 0 16px 48px rgba(15,23,42,.16), 0 48px 96px rgba(15,23,42,.1)',
          overflow:'hidden', fontFamily:"'Inter',-apple-system,sans-serif",
          userSelect:'none',
          animation:'ncFloatIn .22s cubic-bezier(.22,1,.36,1) both',
        }}
      >
        {/* title bar */}
        <div
          style={{
            padding:'15px 18px 13px',
            background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
            borderBottom:'1px solid #eef0f2',
            display:'flex', alignItems:'center', justifyContent:'space-between',
          }}
        >
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#1e293b',letterSpacing:'-.02em'}}>Nueva Consulta</div>
            <div style={{fontSize:11.5,color:'#94a3b8',marginTop:2,fontWeight:500}}>Seleccione el area clinica</div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width:28,height:28,borderRadius:8,border:'1.5px solid #e2e8f0',
              background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',color:'#64748b',transition:'all .15s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='#ef4444';e.currentTarget.style.color='#ef4444';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b';}}
          >
            <X size={13}/>
          </button>
        </div>

        {/* opciones */}
        <div style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:11,userSelect:'text'}}>
          <button className="pd-option-btn" onClick={()=>setConfirming('odontologia')}>
            <div style={{padding:10,background:'#edf2f7',borderRadius:11,color:'#475569',flexShrink:0}}>
              <Stethoscope size={19}/>
            </div>
            <div style={{flex:1}}>
              <span style={{color:'#1e293b',fontWeight:700,fontSize:13.5,display:'block',marginBottom:2}}>Odontologia General</span>
              <p style={{fontSize:11.5,color:'#94a3b8',margin:0,lineHeight:1.4}}>Caries · Extracciones · Limpiezas · Endodoncias</p>
            </div>
            <ArrowRight size={15} style={{color:'#cbd5e1',flexShrink:0}}/>
          </button>

          <button className="pd-option-btn" onClick={()=>setConfirming('ortodoncia')}>
            <div style={{padding:10,background:'#edf2f7',borderRadius:11,color:'#475569',flexShrink:0}}>
              <Activity size={19}/>
            </div>
            <div style={{flex:1}}>
              <span style={{color:'#1e293b',fontWeight:700,fontSize:13.5,display:'block',marginBottom:2}}>Ortodoncia</span>
              <p style={{fontSize:11.5,color:'#94a3b8',margin:0,lineHeight:1.4}}>Brackets · Arcos · Elasticos · Controles mensuales</p>
            </div>
            <ArrowRight size={15} style={{color:'#cbd5e1',flexShrink:0}}/>
          </button>
        </div>

        {/* cancelar */}
        <div style={{padding:'0 18px 16px'}}>
          <button onClick={handleClose} style={{
            width:'100%',padding:'11px',border:'none',borderRadius:12,
            background:'#fef2f2',color:'#e11d48',fontSize:13,fontWeight:600,
            cursor:'pointer',fontFamily:'inherit',transition:'all .18s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.background='#fecdd3';}}
            onMouseLeave={e=>{e.currentTarget.style.background='#fef2f2';}}
          >Cancelar</button>
        </div>
      </div>
      </div>
    </>
  );

  /* ─── PASO 2: overlay de confirmación (igual que antes) ─── */
  return (
    <>
      <style>{`
        @keyframes pdModalIn  { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes pdOverlayIn{ from{opacity:0} to{opacity:1} }
        .pd-modal-overlay2 {
          position:fixed;inset:0;
          background:rgba(15,23,42,.18);backdrop-filter:blur(8px);
          display:flex;align-items:center;justify-content:center;
          z-index:1300;padding:20px;
          animation:pdOverlayIn .18s ease both;
        }
        .pd-confirm-back {
          flex:1;padding:12px;background:#fef2f2;
          border:none;border-radius:12px;
          color:#e11d48;font-weight:600;font-size:13px;cursor:pointer;
          font-family:'Inter',-apple-system,sans-serif;
          transition:all .2s;
        }
        .pd-confirm-back:hover { background:#fecdd3; }
        .pd-confirm-go {
          flex:1;padding:12px;border:none;border-radius:12px;
          color:#fff;font-weight:700;font-size:13px;cursor:pointer;
          font-family:'Inter',-apple-system,sans-serif;
          transition:all .22s cubic-bezier(.22,1,.36,1);
          box-shadow:0 2px 8px rgba(41,178,232,.3);
        }
        .pd-confirm-go:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(41,178,232,.35); }
      `}</style>
      <div className="pd-modal-overlay2">
        <div style={{
          background:'#fff',borderRadius:20,width:420,maxWidth:'100%',
          border:'1px solid #e2e8f0',
          boxShadow:'0 4px 8px rgba(0,0,0,.06), 0 16px 48px rgba(15,23,42,.16), 0 48px 96px rgba(15,23,42,.1)',
          animation:'pdModalIn .22s cubic-bezier(.22,1,.36,1) both',
          overflow:'hidden',fontFamily:"'Inter',-apple-system,sans-serif",
        }}>
          <div style={{padding:'15px 18px 13px',background:'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',borderBottom:'1px solid #eef0f2',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:'#1e293b',letterSpacing:'-.02em'}}>Confirmar inicio</div>
              <div style={{fontSize:11.5,color:'#94a3b8',marginTop:2,fontWeight:500}}>Revise antes de continuar</div>
            </div>
            <button
              onClick={handleClose}
              style={{width:28,height:28,borderRadius:8,border:'1.5px solid #e2e8f0',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',transition:'all .15s'}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='#ef4444';e.currentTarget.style.color='#ef4444';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b';}}
            ><X size={13}/></button>
          </div>
          <div style={{padding:'24px 22px',textAlign:'center'}}>
            <div style={{width:56,height:56,margin:'0 auto 16px',borderRadius:14,background:'#edf2f7',color:'#475569',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,.06)'}}>
              <CheckCircle2 size={28}/>
            </div>
            <h4 style={{fontSize:16,fontWeight:700,color:'#1e293b',marginBottom:8,letterSpacing:'-.02em'}}>
              Iniciar consulta de {confirming==='odontologia'?'Odontologia General':'Ortodoncia'}?
            </h4>
            <p style={{fontSize:13,color:'#94a3b8',marginBottom:22,lineHeight:1.5}}>
              El expediente clinico y las herramientas se configuraran automaticamente.
            </p>
            <div style={{display:'flex',gap:10}}>
              <button className="pd-confirm-back" onClick={()=>setConfirming(null)}>Cancelar</button>
              <button
                className="pd-confirm-go"
                style={{background:'#29b2e8'}}
                onClick={()=>{ onSelect(confirming); setConfirming(null); }}
              >
                Aceptar e Iniciar
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export const PatientDashboard = () => {
  const { selectedPatient, setSelectedPatient, loadPatientById } = usePatient();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<'view'|'edit'>('view');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [loadingPatientData, setLoadingPatientData] = useState(false);
  const [consultaAnchor, setConsultaAnchor] = useState<{x:number;y:number}|undefined>(undefined);
  const [selectedConsultation, setSelectedConsultation] = useState<PatientDashboardConsultation | null>(null);
  const [heroMenu, setHeroMenu] = useState<{x:number;y:number}|null>(null);
  const [fileHubOpen, setFileHubOpen] = useState(false);
  const [consultaDateFrom, setConsultaDateFrom] = useState('');
  const [consultaDateTo, setConsultaDateTo] = useState('');
  const [visibleConsultasCount, setVisibleConsultasCount] = useState(10);
  const heroMenuRef = useRef<HTMLDivElement>(null);
  const nuevaConsultaBtnRef = useRef<HTMLButtonElement>(null);

  // Close hero context menu on outside click
  useEffect(() => {
    if (!heroMenu) return;
    const handler = (e: MouseEvent) => {
      if (heroMenuRef.current && !heroMenuRef.current.contains(e.target as Node)) setHeroMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [heroMenu]);

  // Usar consultas reales del paciente en lugar de mock
  const consultas = Array.isArray(selectedPatient?.consultas)
    ? (selectedPatient.consultas as PatientDashboardConsultation[])
    : [];

  /* stats */
  const orderedConsultas = [...consultas].sort((a, b) => {
    const aDate = new Date(extractConsultationDate(a) || '').getTime();
    const bDate = new Date(extractConsultationDate(b) || '').getTime();
    return bDate - aDate;
  });

  const consultationDateBounds = (() => {
    const validDates = orderedConsultas
      .map((consultation) => toInputDateValue(extractConsultationDate(consultation)))
      .filter(Boolean)
      .sort();

    return {
      min: validDates[0] || '',
      max: validDates[validDates.length - 1] || '',
    };
  })();

  const filteredConsultas = orderedConsultas.filter((consultation) => {
    const dateValue = toInputDateValue(extractConsultationDate(consultation));
    if (!dateValue) {
      return !consultaDateFrom && !consultaDateTo;
    }

    if (consultaDateFrom && dateValue < consultaDateFrom) return false;
    if (consultaDateTo && dateValue > consultaDateTo) return false;
    return true;
  });

  const visibleConsultas = filteredConsultas.slice(0, visibleConsultasCount);
  const hasMoreConsultas = filteredConsultas.length > visibleConsultasCount;
  const filteredTotalFacturado = filteredConsultas.reduce((sum, consultation) => sum + extractConsultationValue(consultation), 0);
  const filteredTotalPagado = filteredConsultas.reduce((sum, consultation) => sum + extractConsultationPaidValue(consultation), 0);

  useEffect(() => {
    setVisibleConsultasCount(10);
  }, [selectedPatient?.id, consultaDateFrom, consultaDateTo]);

  const totalConsultas = consultas.length;
  const totalPagado = consultas.reduce((s, c) => s + extractConsultationPaidValue(c), 0);
  const totalFacturado = consultas.reduce((s, c) => s + extractConsultationValue(c), 0);
  const ultimaConsultaDate = orderedConsultas[0]
    ? extractConsultationDate(orderedConsultas[0])
    : '';
  const ultimaConsulta = (() => {
    const parsed = toDate(ultimaConsultaDate);
    return parsed
      ? parsed.toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })
      : 'N/A';
  })();

  const latestOrthoConsultation = orderedConsultas.find((consultation) => consultation.tipo_consulta === 'ORTODONCIA');
  const proximaVisitaOrtodoncia = (() => {
    if (!latestOrthoConsultation) return 'Sin control ortodóntico';

    const source = latestOrthoConsultation.detalles_clinicos?.proxima_visita;
    if (typeof source === 'string' && source.trim()) {
      const parsed = new Date(source);
      return Number.isNaN(parsed.getTime())
        ? source
        : parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    if (isRecord(source)) {
      const explicitDate = String(source.fecha || source.date || source.proxima_fecha || '').trim();
      if (explicitDate) {
        const parsed = new Date(explicitDate);
        return Number.isNaN(parsed.getTime())
          ? explicitDate
          : parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }

    const fallback = extractNextConsultationLabel(latestOrthoConsultation);
    return fallback === CONSULTATION_DATA_MISSING ? 'Sin programación' : fallback;
  })();

  const proximaOrtoParts = (() => {
    const raw = String(proximaVisitaOrtodoncia || '').trim();
    if (!raw) {
      return { fecha: 'Sin programación', meta: '' };
    }

    const split = raw.split('·').map((chunk) => chunk.trim()).filter(Boolean);
    if (split.length >= 2) {
      return { fecha: split[1], meta: split[0] };
    }

    return { fecha: raw, meta: '' };
  })();

  /* handler — lógica original intacta */
  const handleNuevaConsulta = (tipo: 'odontologia'|'ortodoncia') => {
    setModalOpen(false);
    if (tipo==='odontologia') navigate('/consulta/general');
    else                       navigate('/consulta/ortodoncia');
  };

  const ensurePatientData = async () => {
    if (!selectedPatient?.id) return;

    const needsRefresh = selectedPatient.consultas === undefined || !selectedPatient.clinical_history;
    if (!needsRefresh) return;

    setLoadingHistory(true);
    try {
      await loadPatientById(selectedPatient.id);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (!selectedPatient?.id) return;
    if (selectedPatient.consultas !== undefined) return;

    let ignore = false;
    const refreshPatient = async () => {
      setLoadingPatientData(true);
      try {
        await loadPatientById(selectedPatient.id);
      } catch (error) {
        console.error('[PatientDashboard] Error al recargar paciente:', error);
      } finally {
        if (!ignore) setLoadingPatientData(false);
      }
    };

    refreshPatient();
    return () => { ignore = true; };
  }, [selectedPatient?.id, selectedPatient?.consultas, loadPatientById]);

  if (!selectedPatient) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fb', fontFamily: "'Inter',-apple-system,sans-serif", color: '#94a3b8' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{width:64,height:64,borderRadius:20,background:'#f5f8fb',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:20}}>
            <User size={28} style={{ color:'#64748b' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, color:'#1e293b' }}>No hay paciente seleccionado</h2>
          <p style={{color:'#94a3b8',fontSize:14}}>Selecciona un paciente para ver su dashboard</p>
        </div>
      </div>
    );
  }

  const handleVerHistoria = async () => {
    await ensurePatientData();
    // If no history yet, open directly in edit mode
    setHistoryMode(hasClinicalHistory ? 'view' : 'edit');
    setHistoryOpen(true);
  };

  const clinicalHistory = selectedPatient?.clinical_history;
  const hasClinicalHistory = Boolean(clinicalHistory && Object.keys(clinicalHistory).length > 0);
  const isHistoryComplete = Boolean(selectedPatient?.historia_completa);
  const patientCode = formatPatientSerial(selectedPatient?.id || '');
  const renderValue = (value: any) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      return <em style={{ color: '#64748b' }}>Sin registro</em>;
    }
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (Array.isArray(value)) return value.length ? value.join(', ') : <em style={{ color: '#64748b' }}>Sin registro</em>;
    return String(value);
  };

  /* avatar gradient igual que PatientRadar */
  const [c1,c2] = (() => {
    const GRADS = [
      ['#6366f1','#818cf8'],['#0ea5e9','#38bdf8'],
      ['#10b981','#34d399'],['#f59e0b','#fbbf24'],
      ['#ef4444','#f87171'],['#8b5cf6','#a78bfa'],
      ['#0071e3','#60a5fa'],['#f43f5e','#fb7185'],
    ];
    const s=String(selectedPatient.nombre||'')+String(selectedPatient.apellidos||'');
    let h=0; for(let i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h);
    return GRADS[Math.abs(h)%GRADS.length];
  })();

  const initials = `${selectedPatient.nombre?.[0]||'?'}${selectedPatient.apellidos?.[0]||''}`.toUpperCase();

  return (
    <>
      {/* ── ESTILOS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        .pd, .pd * { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; box-sizing:border-box; }
        .pd { background:#f1f5f9; min-height:100vh; padding:28px 15px; }

        @keyframes pdSlideUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pdRowSlide { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .pd-slide { animation:pdSlideUp .38s cubic-bezier(.22,1,.36,1) both; }

        /* ─ BACK BUTTON ─ */
        .pd-back {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px;
          background:#fff; border:1px solid #e2e8f0; border-radius:9px;
          font-size:13.5px; font-weight:600; color:#475569; cursor:pointer;
          box-shadow:0 1px 2px rgba(0,0,0,.05);
          transition:all .15s; font-family:inherit;
        }
        .pd-back:hover { background:#f8fafc; color:#1e293b; border-color:#cbd5e1; transform:translateX(-2px); }

        /* ─ MAIN CARD ─ */
        .pd-card {
          background: linear-gradient(180deg, #fbfcfd 0%, #f4f7fa 100%);
          border: none;
          border-radius: 14px;
          box-shadow: 0 12px 26px rgba(15,23,42,.10), 0 3px 8px rgba(15,23,42,.05);
        }

        /* ─ HERO SECTION ─ */
        .pd-hero { padding:16px 18px; }
        .pd-hero-avatar {
          width:50px; height:50px; border-radius:12px;
          display:flex; align-items:center; justify-content:center;
          color:#fff; font-size:17px; font-weight:800; flex-shrink:0;
          box-shadow:0 3px 10px rgba(0,0,0,.16), 0 1px 2px rgba(0,0,0,.08);
        }
        .pd-visit-chips {
          display:flex;
          align-items:stretch;
          justify-content:flex-end;
          gap:8px;
          flex-wrap:wrap;
          flex-shrink:0;
        }
        .pd-visit-chip {
          min-width: 190px;
          max-width: 220px;
          padding: 8px 10px;
          border-radius: 10px;
          background: #f3f6fa;
          border: 1px solid #d1dae5;
          box-shadow: 0 4px 10px rgba(15,23,42,.06);
          text-align: right;
          flex-shrink: 0;
        }
        .pd-visit-chip-label {
          font-size: 9.5px;
          font-weight: 800;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: .08em;
          margin-bottom: 4px;
        }
        .pd-visit-chip-value {
          font-size: 13px;
          font-weight: 800;
          color: #1f2937;
          line-height: 1.2;
          white-space: nowrap;
        }
        .pd-visit-chip-meta {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          margin-top: 3px;
          line-height: 1.2;
        }

        /* ─ HERO PATIENT DATA TABLE ─ */
        .pd-hero-data-wrap {
          border:1px solid #d7dfe9;
          border-radius:12px;
          overflow-x:auto;
          background:#f8fafc;
          box-shadow:0 10px 22px rgba(15,23,42,.07), 0 2px 6px rgba(15,23,42,.04);
        }
        .pd-hero-data-head {
          padding:10px 12px;
          background:#f6f8fb;
          border-bottom:1px solid #e2e8f0;
          font-size:11px;
          font-weight:800;
          color:#334155;
          text-transform:uppercase;
          letter-spacing:.08em;
        }
        .pd-hero-data-table {
          width:100%;
          min-width:760px;
          border-collapse:collapse;
          table-layout:fixed;
        }
        .pd-hero-data-table th,
        .pd-hero-data-table td {
          padding:10px 12px;
          border-bottom:1px solid #e1e8f1;
          border-right:1px solid #e1e8f1;
          background:#fbfdff;
          border-radius:0;
        }
        .pd-hero-data-table th {
          text-align:left;
          font-size:12px;
          font-weight:700;
          color:#334155;
          text-transform:none;
          letter-spacing:.01em;
          width:160px;
        }
        .pd-hero-data-table td {
          font-size:12.5px;
          font-weight:700;
          color:#1e293b;
          white-space:normal;
          overflow-wrap:anywhere;
        }
        .pd-hero-data-table tr:nth-child(even) th,
        .pd-hero-data-table tr:nth-child(even) td { background:#f7fafd; }
        .pd-hero-data-table th:nth-child(3),
        .pd-hero-data-table td:last-child { border-right:none; }
        .pd-hero-data-table tbody tr:last-child td,
        .pd-hero-data-table tbody tr:last-child th { border-bottom:none; }
        .pd-field-label {
          display:flex;
          align-items:center;
          gap:6px;
          white-space:nowrap;
        }
        .pd-field-icon {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          color:#94a3b8;
          flex-shrink:0;
        }
        .pd-wrap-cell {
          line-height:1.35;
          font-size:12.5px;
          color:#334155;
        }

        /* ─ SECONDARY BUTTON ─ */
        .pd-btn-secondary {
          display:inline-flex; align-items:center; gap:7px;
          padding:9px 18px; background:#fff;
          border:1px solid #e2e8f0; border-radius:9px;
          font-size:13.5px; font-weight:600; color:#374151; cursor:pointer;
          box-shadow:0 1px 2px rgba(0,0,0,.05);
          transition:all .15s; font-family:inherit;
        }
        .pd-btn-secondary:hover { background:#f8fafc; border-color:#cbd5e1; }
        .pd-btn-secondary:active { background:#f1f5f9; }

        /* ─ PRIMARY BUTTON ─ */
        .pd-btn-primary {
          display:inline-flex; align-items:center; gap:7px;
          padding:9px 20px; border:none; border-radius:9px;
          background:#29b2e8;
          font-size:13.5px; font-weight:700; color:#fff; cursor:pointer;
          box-shadow:0 1px 3px rgba(41,178,232,.25), 0 4px 14px rgba(41,178,232,.2);
          transition:all .15s; font-family:inherit;
        }
        .pd-btn-primary:hover { background:#18a3db; transform:translateY(-1px); box-shadow:0 6px 20px rgba(41,178,232,.35); }
        .pd-btn-primary:active { transform:translateY(0); }

        /* ─ TABLE ─ */
        .pd-table-wrap {
          background:#ffffff;
          border:1px solid #dce3ec;
          border-radius:14px;
          overflow:hidden;
          box-shadow:0 2px 10px rgba(15,23,42,.06);
        }
        .pd-table-header {
          padding:14px 18px;
          border-bottom:1px solid #e8edf4;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          background:#f6f8fb;
        }
        .pd-filters-wrap {
          display:flex;
          align-items:center;
          justify-content:flex-end;
          gap:8px;
          flex-wrap:wrap;
        }
        .pd-filter-chip {
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:6px 10px;
          background:#edf2f7;
          border:1px solid #d8e0ea;
          border-radius:10px;
          box-shadow:0 3px 10px rgba(15,23,42,.05);
        }
        .pd-filter-label {
          font-size:10px;
          font-weight:800;
          color:#64748b;
          text-transform:uppercase;
          letter-spacing:.07em;
          white-space:nowrap;
        }
        .pd-date-input {
          border:1px solid #cfd8e3;
          border-radius:8px;
          padding:4px 8px;
          font-size:12px;
          font-weight:600;
          color:#334155;
          background:#fff;
          outline:none;
          min-width:150px;
        }
        .pd-date-input:focus {
          border-color:#94a3b8;
          box-shadow:0 0 0 2px rgba(148,163,184,.2);
        }
        .pd-filter-clear {
          border:1px solid #d5dde7;
          background:#fff;
          color:#475569;
          font-size:11px;
          font-weight:700;
          border-radius:8px;
          padding:5px 9px;
          cursor:pointer;
        }
        .pd-filter-clear:hover { background:#f8fafc; }
        .pd-table { width:100%; border-collapse:collapse; }
        .pd-thead { background:#eef2f6; }
        .pd-th {
          padding:10px 14px;
          text-align:left;
          font-size:10px;
          font-weight:800;
          color:#64748b;
          text-transform:uppercase;
          letter-spacing:.08em;
          white-space:nowrap;
          border-bottom:1px solid #dde4ed;
        }
        .pd-tr { border-bottom:1px solid #edf2f7; transition:background .1s; animation:pdRowSlide .3s ease both; }
        .pd-tr:nth-child(even) { background:#fbfcfe; }
        .pd-tr:last-child { border-bottom:none; }
        .pd-tr:hover { background:#f3f6fa; }
        .pd-td { padding:11px 14px; vertical-align:middle; font-size:13px; color:#1e293b; }

        .pd-cell-main {
          font-size:13px;
          font-weight:700;
          color:#0f172a;
          line-height:1.35;
        }
        .pd-cell-sub {
          font-size:11px;
          color:#64748b;
          margin-top:3px;
          line-height:1.4;
        }
        .pd-cell-code {
          display:inline-flex;
          margin-top:6px;
          padding:2px 8px;
          border-radius:999px;
          border:1px solid #d7dee8;
          background:#f8fafc;
          color:#475569;
          font-size:10px;
          font-weight:800;
          letter-spacing:.04em;
        }
        .pd-mini-pill {
          display:inline-flex;
          align-items:center;
          gap:5px;
          padding:3px 8px;
          border-radius:999px;
          border:1px solid #dbe3ed;
          background:#f8fafc;
          color:#475569;
          font-size:10px;
          font-weight:700;
          margin-top:5px;
        }
        .pd-status-done {
          display:inline-flex;
          align-items:center;
          gap:5px;
          padding:4px 10px;
          border-radius:999px;
          background:#eaf8ef;
          color:#166534;
          border:1px solid #ccecd7;
          font-size:11px;
          font-weight:800;
        }

        /* ─ TYPE BADGES ─ */
        .pd-tipo-dental {
          display:inline-flex; padding:4px 10px; border-radius:20px;
          font-size:12px; font-weight:600; background:#dbeafe; color:#1d4ed8;
        }
        .pd-tipo-ortho {
          display:inline-flex; padding:4px 10px; border-radius:20px;
          font-size:12px; font-weight:600; background:#ede9fe; color:#6d28d9;
        }

        /* ─ TABLE FOOTER ─ */
        .pd-tfoot {
          padding:10px 14px; border-top:1px solid #e8edf4;
          display:flex; align-items:center; justify-content:space-between;
          background:#f6f8fb;
        }
        .pd-load-more-wrap {
          padding:10px 14px;
          border-top:1px dashed #dde5ef;
          background:#f8fafc;
          display:flex;
          justify-content:center;
        }
        .pd-load-more-btn {
          border:1px solid #cfd9e5;
          background:#ffffff;
          color:#334155;
          border-radius:10px;
          padding:7px 14px;
          font-size:12px;
          font-weight:700;
          cursor:pointer;
          box-shadow:0 3px 10px rgba(15,23,42,.06);
        }
        .pd-load-more-btn:hover { background:#f8fafc; }

        /* ─ ACTIVE BADGE ─ */
        .pd-badge-active {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:20px;
          background:#dcfce7; color:#166534;
          font-size:12px; font-weight:600;
        }
        .pd-badge-active::before { content:''; width:6px; height:6px; border-radius:50%; background:#16a34a; display:inline-block; }

        /* ─ HERO CONTEXT MENU ─ */
        .pd-ctx-menu {
          position:fixed; z-index:1200;
          background:#fff; border-radius:14px; width:210px;
          padding:5px 0;
          border:1px solid rgba(0,0,0,.06);
          box-shadow:0 12px 40px rgba(0,0,0,.12),0 2px 8px rgba(0,0,0,.06);
          animation:pdCtxIn .16s cubic-bezier(.22,1,.36,1);
        }
        @keyframes pdCtxIn { from { opacity:0; transform:scale(.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .pd-ctx-item {
          width:100%; border:none; background:transparent; text-align:left;
          padding:9px 16px; font-size:13px; font-weight:500; color:#1e293b;
          cursor:pointer; display:flex; align-items:center; gap:10px;
          transition:background .1s; font-family:inherit; letter-spacing:-.01em;
        }
        .pd-ctx-item:hover { background:#f4f5f6; }
        .pd-ctx-item .pd-ctx-ic {
          width:18px; height:18px; display:flex; align-items:center; justify-content:center;
          flex-shrink:0; color:#64748b;
        }
        .pd-ctx-sep { height:1px; background:rgba(0,0,0,.06); margin:4px 0; }
        .pd-ctx-item--danger { color:#dc2626; }
        .pd-ctx-item--danger .pd-ctx-ic { color:#dc2626; }
        .pd-ctx-item--danger:hover { background:#fef2f2; }

        @media (max-width: 1024px) {
          .pd-visit-chips {
            width:100%;
            justify-content:flex-start;
          }
          .pd-visit-chip {
            min-width: 100%;
            max-width: none;
            text-align: left;
            margin-top: 8px;
          }
          .pd-filters-wrap { justify-content:flex-start; width:100%; }
        }
      `}</style>

      <div className="pd">
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',flexDirection:'column',gap:22}}>

          {/* ══ BACK ══ */}
          <div className="pd-slide">
            <button className="pd-back" onClick={()=>setSelectedPatient(null)}>
              <ChevronLeft size={16} strokeWidth={2.5}/> Volver a pacientes
            </button>
          </div>

          {/* ══ HERO ══ */}
          <div className="pd-card pd-hero pd-slide" style={{animationDelay:'.08s',cursor:'default'}} onContextMenu={(e)=>{
            e.preventDefault();
            setHeroMenu({x:e.clientX,y:e.clientY});
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'stretch',gap:14,marginBottom:12,flexWrap:'wrap'}}>{/* */}
              <div style={{display:'flex',gap:12,alignItems:'center',flex:1,minWidth:0,background:'#e8edf3',borderRadius:16,padding:'12px 14px',border:'1px solid #d5dde7',boxShadow:'0 8px 18px rgba(15,23,42,.06)'}}>
                <div className="pd-hero-avatar" style={{background:'#adb5bd'}}>
                  {initials}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,flex:1,minWidth:0,flexWrap:'wrap'}}>
                  <div style={{minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                      <h2 style={{fontSize:19,fontWeight:700,color:'#0f2038',letterSpacing:'.005em',lineHeight:1.15,margin:0,fontFamily:"'Inter',system-ui,sans-serif"}}>
                        {selectedPatient.nombre} {selectedPatient.apellidos}
                      </h2>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span className="pd-badge-active">Activo</span>
                      <span style={{background:'#eef2f6',color:'#435265',padding:'3px 9px',borderRadius:999,fontSize:10.5,fontWeight:700,letterSpacing:'.03em',border:'1px solid #d4dce6'}}>
                        {totalConsultas} consulta{totalConsultas !== 1 ? 's' : ''}
                      </span>
                      <span style={{background:'#f8fafc',color:'#5f6f82',padding:'3px 9px',borderRadius:999,fontSize:10.5,fontWeight:700,letterSpacing:'.05em',border:'none'}}>
                        {patientCode}
                      </span>
                      <span style={{background:'#eef2f6',color:'#4f5f73',padding:'3px 9px',borderRadius:999,fontSize:10.5,fontWeight:700,letterSpacing:'.03em',border:'none'}}>
                        RH: {formatPatientRh(selectedPatient.tipo_sangre_rh)}
                      </span>
                      {(() => { const age = selectedPatient.edad ?? calculateAge(selectedPatient.fecha_nacimiento); return age !== null && age !== undefined ? <span style={{background:'#f8fafc',color:'#8d98a7',padding:'3px 9px',borderRadius:999,fontSize:10.5,fontWeight:700,border:'none'}}>{age} años</span> : null; })()}
                    </div>
                  </div>

                  <div className="pd-visit-chips">
                    <div className="pd-visit-chip">
                      <div className="pd-visit-chip-label">Próx. ortodoncia</div>
                      <div className="pd-visit-chip-value">{proximaOrtoParts.fecha}</div>
                      {proximaOrtoParts.meta ? <div className="pd-visit-chip-meta">{proximaOrtoParts.meta}</div> : null}
                    </div>
                    <div className="pd-visit-chip">
                      <div className="pd-visit-chip-label">Última visita</div>
                      <div className="pd-visit-chip-value">{ultimaConsulta}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{height:1,background:'#d6deea',marginBottom:10}}/>

            <div className="pd-hero-data-wrap">
              <div className="pd-hero-data-head">Ficha del paciente</div>
              <table className="pd-hero-data-table">
                <tbody>
                  <tr>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><User size={12} /></span>Documento</span>
                    </th>
                    <td>{selectedPatient.cc || 'N/A'}</td>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><Calendar size={12} /></span>Nacimiento</span>
                    </th>
                    <td>{selectedPatient.fecha_nacimiento || 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><Phone size={12} /></span>Teléfono</span>
                    </th>
                    <td>{selectedPatient.telefono?.trim() ? selectedPatient.telefono : 'N/A'}</td>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><Mail size={12} /></span>Email</span>
                    </th>
                    <td>{selectedPatient.email?.trim() ? selectedPatient.email : 'N/A'}</td>
                  </tr>
                  <tr>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><MapPin size={12} /></span>Municipio</span>
                    </th>
                    <td>{selectedPatient.municipio_ciudad?.trim() ? selectedPatient.municipio_ciudad : 'Sin registro'}</td>
                    <th>
                      <span className="pd-field-label"><span className="pd-field-icon"><MapPin size={12} /></span>Dirección</span>
                    </th>
                    <td className="pd-wrap-cell">{selectedPatient.direccion?.trim() ? selectedPatient.direccion : 'Dirección sin registro'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>



          {/* ══ ACTIONS ══ */}
          <div className="pd-slide" style={{animationDelay:'.16s',display:'flex',justifyContent:'flex-end',gap:12}}>
            <button className="pd-btn-secondary" onClick={handleVerHistoria}>
              <ClipboardList size={17}/> Historia Clinica
            </button>
            <button className="pd-btn-secondary" onClick={() => setFileHubOpen(true)}>
              <FolderOpen size={17}/> Expediente Digital
            </button>
            <button ref={nuevaConsultaBtnRef} className="pd-btn-primary" onClick={()=>{
              const r = nuevaConsultaBtnRef.current?.getBoundingClientRect();
              if (r) setConsultaAnchor({ x: r.right, y: r.top });
              setModalOpen(true);
            }}>
              <Plus size={17} strokeWidth={2.5}/> Nueva Consulta
            </button>
          </div>

          {/* ══ CONSULTATION TABLE ══ */}
          <div className="pd-table-wrap pd-slide" style={{animationDelay:'.24s'}}>
            <div className="pd-table-header">
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:32,height:32,borderRadius:8,background:'#eef2f6',border:'1px solid #dce3ec',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <FileText size={14} style={{color:'#64748b'}}/>
                </div>
                <div>
                  <h3 style={{fontSize:15,fontWeight:800,color:'#1e293b',margin:0}}>Historial de Consultas</h3>
                  <p style={{fontSize:11,color:'#73839a',margin:0,marginTop:2}}>{consultas.length} consulta{consultas.length!==1?'s':''} registrada{consultas.length!==1?'s':''}</p>
                </div>
              </div>
              <div className="pd-filters-wrap">
                <div className="pd-filter-chip">
                  <span className="pd-filter-label">Buscar citas</span>
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'#475569',fontWeight:700}}>
                    <Calendar size={12} /> Desde
                  </span>
                  <input
                    type="date"
                    className="pd-date-input"
                    value={consultaDateFrom}
                    min={consultationDateBounds.min || undefined}
                    max={(consultaDateTo || consultationDateBounds.max) || undefined}
                    onChange={(event) => setConsultaDateFrom(event.target.value)}
                    aria-label="Buscar citas desde fecha"
                  />
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,color:'#475569',fontWeight:700}}>
                    Hasta
                  </span>
                  <input
                    type="date"
                    className="pd-date-input"
                    value={consultaDateTo}
                    min={(consultaDateFrom || consultationDateBounds.min) || undefined}
                    max={consultationDateBounds.max || undefined}
                    onChange={(event) => setConsultaDateTo(event.target.value)}
                    aria-label="Buscar citas hasta fecha"
                  />
                  {(consultaDateFrom || consultaDateTo) ? (
                    <button
                      type="button"
                      className="pd-filter-clear"
                      onClick={() => {
                        setConsultaDateFrom('');
                        setConsultaDateTo('');
                      }}
                    >
                      Limpiar
                    </button>
                  ) : null}
                </div>
                <div style={{display:'inline-flex',alignItems:'center',padding:'4px 10px',background:'#eef2f6',border:'1px solid #dce3ec',borderRadius:999,fontSize:11,fontWeight:700,color:'#475569'}}>
                  Total facturado: {formatMoney(filteredTotalFacturado)}
                </div>
              </div>
            </div>

            {/* tabla */}
            <div style={{overflowX:'auto'}}>
              <table className="pd-table">
                <thead className="pd-thead">
                  <tr>
                    <th className="pd-th" style={{paddingLeft:18}}>Fecha</th>
                    <th className="pd-th">Tipo</th>
                    <th className="pd-th">Motivo</th>
                    <th className="pd-th">Seguimiento</th>
                    <th className="pd-th">Doctor</th>
                    <th className="pd-th">Valor</th>
                    <th className="pd-th">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleConsultas.map((c,i)=> {
                    const dateInfo = formatDateTime(extractConsultationDate(c));
                    const fecha = dateInfo.shortDate;
                    const hora = dateInfo.time;
                    const primaryProcedure = extractPrimaryProcedure(c);
                    const nextConsultation = extractNextConsultationLabel(c);
                    const doctor = extractDoctor(c);
                    const consultationValue = extractConsultationValue(c);
                    
                    return (
                      <tr
                        key={c.id}
                        className="pd-tr"
                        style={{animationDelay:`${i*0.05}s`, cursor:'pointer'}}
                        onClick={() => setSelectedConsultation(c)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedConsultation(c);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Abrir informe detallado de la consulta del ${fecha}`}
                      >
                        <td className="pd-td" style={{paddingLeft:18}}>
                          <div className="pd-cell-main">{fecha}</div>
                          <div className="pd-cell-sub" style={{display:'flex',alignItems:'center',gap:5}}>
                            <Clock size={12}/> {hora}
                          </div>
                          <div className="pd-cell-code">
                            {extractConsultationCode(c)}
                          </div>
                        </td>
                        <td className="pd-td">
                          <span className={c.tipo_consulta === 'GENERAL' ? 'pd-tipo-dental' : 'pd-tipo-ortho'}>
                            {c.tipo_consulta === 'GENERAL' ? 'General' : 'Ortodoncia'}
                          </span>
                        </td>
                        <td className="pd-td">
                          <div className="pd-cell-main">
                            {extractMotivo(c)}
                          </div>
                          <div className="pd-cell-sub">
                            {(c.hallazgos_odontograma?.length || 0)} hallazgos registrados
                          </div>
                        </td>
                        <td className="pd-td">
                          <div style={{display:'grid',gap:3}}>
                            <div className="pd-mini-pill" style={{background:'#edf2ff',borderColor:'#d7def3',color:'#334155'}}>
                              <Scissors size={11}/> {primaryProcedure}
                            </div>
                            <div className="pd-mini-pill">
                              <Calendar size={11}/> {nextConsultation}
                            </div>
                          </div>
                        </td>
                        <td className="pd-td" style={{fontSize:12.5,color:'#475569',fontWeight:600}}>
                          {doctor}
                        </td>
                        <td className="pd-td">
                          <span style={{fontSize:13,fontWeight:800,color:'#0f172a'}}>
                            {consultationValue > 0 ? formatMoney(consultationValue) : 'Sin registro'}
                          </span>
                        </td>
                        <td className="pd-td">
                          <span className="pd-status-done">
                            <CheckCircle size={13}/> Completada
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!visibleConsultas.length ? (
                    <tr className="pd-tr">
                      <td className="pd-td" style={{padding:'18px',textAlign:'center',color:'#64748b',fontWeight:600}} colSpan={7}>
                        No hay citas en el rango de fechas seleccionado.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {hasMoreConsultas ? (
              <div className="pd-load-more-wrap">
                <button
                  type="button"
                  className="pd-load-more-btn"
                  onClick={() => setVisibleConsultasCount((current) => current + 10)}
                >
                  Ver mas citas ({filteredConsultas.length - visibleConsultas.length} pendientes)
                </button>
              </div>
            ) : null}

            <div className="pd-tfoot">
              <span style={{fontSize:12,color:'#64748b',fontWeight:600}}>
                Mostrando {visibleConsultas.length} de {filteredConsultas.length} consulta{filteredConsultas.length!==1?'s':''}
              </span>
              <span style={{fontSize:12,color:'#64748b',fontWeight:600,display:'inline-flex',alignItems:'center',gap:12,flexWrap:'wrap',justifyContent:'flex-end'}}>
                <span>
                  Promedio: <span style={{fontWeight:800,color:'#1e293b'}}>{formatMoney(filteredConsultas.length ? Math.round(filteredTotalFacturado / filteredConsultas.length) : 0)}</span>
                </span>
                <span style={{fontSize:11.5,color:'#7b8796'}}>
                  Pagado: <span style={{fontWeight:700,color:'#334155'}}>{formatMoney(filteredTotalPagado)}</span>
                </span>
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ══ MODAL ══ */}
      <NuevoConsultaModal
        isOpen={modalOpen}
        onClose={()=>setModalOpen(false)}
        onSelect={handleNuevaConsulta}
        anchorPos={consultaAnchor}
      />

      <EditPatientModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        patient={editingPatient}
        onSave={(updatedPatient) => {
          setSelectedPatient({ ...selectedPatient, ...updatedPatient });
          if (updatedPatient?.id) {
            void loadPatientById(updatedPatient.id);
          }
        }}
      />

      <ConsultationReportModal
        isOpen={Boolean(selectedConsultation)}
        onClose={() => setSelectedConsultation(null)}
        patient={selectedPatient}
        consultation={selectedConsultation}
      />

      {/* ══ HERO CONTEXT MENU ══ */}
      {heroMenu && (
        <div ref={heroMenuRef} className="pd-ctx-menu" style={{
          top: Math.min(heroMenu.y, window.innerHeight - 340),
          left: Math.min(heroMenu.x, window.innerWidth - 250),
        }}>
          <button className="pd-ctx-item" onClick={()=>{ setHeroMenu(null); setEditingPatient(selectedPatient); setEditModalOpen(true); }}>
            <span className="pd-ctx-ic"><Edit size={15}/></span>
            Editar Paciente
          </button>
          <button className="pd-ctx-item" onClick={()=>{ setHeroMenu(null); handleVerHistoria(); }}>
            <span className="pd-ctx-ic"><ClipboardList size={15}/></span>
            Historia Clínica
          </button>
          <button className="pd-ctx-item" onClick={()=>{ setHeroMenu(null); setFileHubOpen(true); }}>
            <span className="pd-ctx-ic"><FolderOpen size={15}/></span>
            Expediente Digital
          </button>
          <button className="pd-ctx-item" onClick={()=>{
            setHeroMenu(null);
            const r = nuevaConsultaBtnRef.current?.getBoundingClientRect();
            if (r) setConsultaAnchor({ x: r.right, y: r.top });
            setModalOpen(true);
          }}>
            <span className="pd-ctx-ic"><Plus size={15}/></span>
            Nueva Consulta
          </button>
          <div className="pd-ctx-sep"/>
          <button className="pd-ctx-item" onClick={()=>{
            setHeroMenu(null);
            const txt = `${selectedPatient.nombre} ${selectedPatient.apellidos}\nDoc: ${selectedPatient.cc}\nRH: ${formatPatientRh(selectedPatient.tipo_sangre_rh)}\nTel: ${selectedPatient.telefono||'N/A'}\nEmail: ${selectedPatient.email||'N/A'}\nMunicipio: ${selectedPatient.municipio_ciudad||'N/A'}\nDireccion: ${selectedPatient.direccion||'N/A'}`;
            navigator.clipboard.writeText(txt);
          }}>
            <span className="pd-ctx-ic"><Copy size={15}/></span>
            Copiar Datos
          </button>
          <button className="pd-ctx-item" onClick={()=>{ setHeroMenu(null); window.print(); }}>
            <span className="pd-ctx-ic"><Printer size={15}/></span>
            Imprimir Ficha
          </button>
          <div className="pd-ctx-sep"/>
          <button className="pd-ctx-item pd-ctx-item--danger" onClick={()=>{
            setHeroMenu(null);
            if(window.confirm('¿Está seguro de eliminar a este paciente? Esta acción no se puede deshacer.')){
              patientService.deletePatient(selectedPatient.id).then(()=>{ setSelectedPatient(null); });
            }
          }}>
            <span className="pd-ctx-ic"><Trash2 size={15}/></span>
            Eliminar Paciente
          </button>
        </div>
      )}

      {historyOpen && (() => {
        const ch = selectedPatient?.clinical_history || {};
        // Read both v2 (s2_*, s9_*) and legacy (sistemico.*, habitos.*) formats
        const v2 = ch._version === 2;
        const rv = (val: any) => {
          if (val === undefined || val === null || String(val).trim() === '' || val === false) return <span style={{color:'#b8bcc8',fontSize:12,fontStyle:'italic'}}>Sin registro</span>;
          if (val === true) return 'Si';
          return String(val);
        };
        const pill = (val: string) => val
          ? <span style={{padding:'2px 9px',borderRadius:10,background:'#f1f5f9',border:'1px solid #e2e8f0',fontSize:12,fontWeight:600,color:'#334155'}}>{val}</span>
          : <em style={{color:'#b8bcc8',fontStyle:'italic'}}>—</em>;

        // Summary rows helper
        const Row = ({label, val}: {label:string; val:any}) => (
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #f8fafc'}}>
            <span style={{fontSize:13,color:'#64748b',fontWeight:500}}>{label}</span>
            <span style={{fontSize:13,color:'#1e293b',fontWeight:600,textAlign:'right',maxWidth:'55%'}}>{rv(val)}</span>
          </div>
        );

        // Card wrapper
        const Card = ({icon, title, sub, children}: {icon:React.ReactNode; title:string; sub:string; children:React.ReactNode}) => (
          <div style={{background:'#fff',borderRadius:14,border:'1px solid #e8edf3',boxShadow:'4px 4px 12px rgba(163,177,198,.2),-2px -2px 8px rgba(255,255,255,.95)',overflow:'hidden'}}>
            <div style={{padding:'13px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:10,background:'#fafbfc'}}>
              <div style={{width:32,height:32,borderRadius:9,background:'linear-gradient(145deg,#f0f4f8,#e2e8f0)',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',boxShadow:'2px 2px 5px rgba(163,177,198,.3),-1px -1px 4px rgba(255,255,255,.9)'}}>{icon}</div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{title}</div>
                <div style={{fontSize:11,color:'#94a3b8'}}>{sub}</div>
              </div>
            </div>
            <div style={{padding:'10px 18px'}}>{children}</div>
          </div>
        );

        return (
          <div style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(15,23,42,.35)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
            <div style={{width:'100%',maxWidth:'980px',background:'#f4f6f9',borderRadius:20,border:'1px solid #e2e8f0',boxShadow:'0 28px 70px rgba(15,23,42,.22)',overflow:'hidden',display:'flex',flexDirection:'column',maxHeight:'92vh'}}>

              {/* ─ Modal Header ─ */}
              <div style={{padding:'16px 22px',background:'linear-gradient(145deg,#ffffff,#f1f5f9)',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12,flexShrink:0,boxShadow:'0 2px 8px rgba(163,177,198,.15)'}}>
                <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(145deg,#f0f4f8,#dce4ed)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'3px 3px 8px rgba(163,177,198,.35),-2px -2px 6px rgba(255,255,255,.95)'}}>
                  <ClipboardList size={18} style={{color:'#475569'}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:'#1e293b'}}>Historia Clinica</div>
                  <div style={{fontSize:12,color:'#94a3b8'}}>{selectedPatient.nombre} {selectedPatient.apellidos} · Ficha {patientCode}</div>
                </div>

                {/* Status chip */}
                {isHistoryComplete
                  ? <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 11px',borderRadius:20,background:'#dcfce7',color:'#16a34a',fontSize:11,fontWeight:700}}>
                      <CheckCircle2 size={11}/> Completa
                    </span>
                  : <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 11px',borderRadius:20,background:'#f1f5f9',color:'#64748b',fontSize:11,fontWeight:700}}>
                      <FileText size={11}/> Por registrar
                    </span>
                }

                {/* Edit button — only when has history */}
                {hasClinicalHistory && historyMode === 'view' && (
                  <button
                    onClick={() => setHistoryMode('edit')}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'7px 15px',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:600,color:'#475569',cursor:'pointer',fontFamily:'inherit',boxShadow:'2px 2px 6px rgba(163,177,198,.2)'}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor='#29b2e8';e.currentTarget.style.color='#29b2e8';}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#475569';}}
                  >
                    <Edit size={13}/> Editar
                  </button>
                )}
                {historyMode === 'edit' && (
                  <button
                    onClick={() => setHistoryMode('view')}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'7px 15px',background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:9,fontSize:13,fontWeight:600,color:'#64748b',cursor:'pointer',fontFamily:'inherit'}}
                  >
                    Ver resumen
                  </button>
                )}

                <button
                  onClick={() => { setHistoryOpen(false); setHistoryMode('view'); }}
                  style={{width:34,height:34,border:'1.5px solid #e2e8f0',background:'#fff',borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',flexShrink:0,boxShadow:'2px 2px 5px rgba(163,177,198,.18)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor='#fca5a5';e.currentTarget.style.color='#ef4444';}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='#e2e8f0';e.currentTarget.style.color='#64748b';}}
                >
                  <X size={15}/>
                </button>
              </div>

              {/* ─ Body ─ */}
              <div style={{flex:1,overflowY:'auto',minHeight:0}}>
                {historyMode === 'view' ? (
                  loadingHistory ? (
                    <div style={{padding:60,textAlign:'center',color:'#94a3b8',fontSize:14}}>Cargando...</div>
                  ) : hasClinicalHistory ? (
                    <div style={{padding:'22px 24px',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
                      <Card icon={<Activity size={15}/>} title="Salud General" sub="Estado y motivo">
                        <Row label="Estado general" val={ch.salud_general}/>
                        <Row label="Primera consulta" val={ch.motivo_primera_consulta}/>
                        <Row label="Medico tratante" val={ch.medico_tratante}/>
                      </Card>

                      <Card icon={<AlertCircle size={15}/>} title="Antecedentes Sistemicos" sub="Condiciones cronicas">
                        <Row label="Diabetes" val={ch.s2_diabetes || ch.sistemico?.diabetes}/>
                        <Row label="Hipertension" val={ch.s2_hipertension || ch.sistemico?.hipertension}/>
                        <Row label="Cardiopatia" val={ch.s2_cardiaco || ch.sistemico?.cardiopatias}/>
                        <Row label="Asma / EPOC" val={ch.s2_asma}/>
                        <Row label="Cancer" val={ch.s2_cancer}/>
                        <Row label="Renal" val={ch.s2_renal}/>
                        <Row label="Hepatico" val={ch.s2_hepatico || ch.sistemico?.hepatitis}/>
                      </Card>

                      <Card icon={<FileText size={15}/>} title="Medicamentos y Alergias" sub="Farmacos actuales">
                        <Row label="Toma medicamentos" val={ch.s3_toma_med}/>
                        {(ch.s3_toma_med === 'SI') && <Row label="Detalle" val={ch.s3_medicamentos}/>}
                        <Row label="Alergia conocida" val={ch.s4_tiene_alergia}/>
                        {ch.s4_tiene_alergia === 'SI' && <Row label="Tipo reaccion" val={ch.s4_tipo_reaccion}/>}
                        <Row label="Alergia alimento" val={ch.s4_alimento_alergia}/>
                      </Card>

                      <Card icon={<Stethoscope size={15}/>} title="Revision por Sistemas" sub="Cardiovascular, respiratorio...">
                        <Row label="Dolor toracico" val={ch.s5cv_dolor}/>
                        <Row label="Marcapaso" val={ch.s5cv_marcapaso}/>
                        <Row label="Infarto previo" val={ch.s5cv_infarto}/>
                        <Row label="Disnea" val={ch.s5r_disnea}/>
                        <Row label="Usa inhalador" val={ch.s5r_inhalador}/>
                        <Row label="Reflujo" val={ch.s5g_reflujo}/>
                      </Card>

                      <Card icon={<Activity size={15}/>} title="Habitos de Vida" sub="Tabaco, alcohol, ejercicio">
                        <Row label="Tabaco" val={ch.s9_tabaco || ch.habitos?.fuma}/>
                        <Row label="Alcohol" val={ch.s9_alcohol || ch.habitos?.alcohol}/>
                        <Row label="Ejercicio" val={ch.s9_ejercicio}/>
                        <Row label="Alimentacion" val={ch.s9_alimentacion}/>
                        <Row label="Sueno" val={ch.s9_sueno || ch.habitos?.sueno}/>
                        <Row label="Estres (0-10)" val={ch.s9_estres || ch.habitos?.estres}/>
                        <Row label="Ocupacion" val={ch.s9_ocupacion}/>
                      </Card>

                      <Card icon={<User size={15}/>} title="Antecedentes Familiares" sub="Enfermedades hereditarias">
                        <Row label="Diabetes familiar" val={ch.s10_diab ? 'Si' : undefined}/>
                        <Row label="Hipertension familiar" val={ch.s10_hiper ? 'Si' : undefined}/>
                        <Row label="Cancer oral familiar" val={ch.s10_cancer_oral ? 'Si' : undefined}/>
                        <Row label="Detalle" val={ch.s10_detalle}/>
                      </Card>

                      <Card icon={<CheckCircle size={15}/>} title="Antecedentes Odontologicos" sub="Historia dental">
                        <Row label="Ultima visita" val={ch.s11_ultima_visita || ch.odontologico?.ultima_visita}/>
                        <Row label="Sangrado encias" val={ch.s11_sangrado || ch.odontologico?.sangrado_encias}/>
                        <Row label="Bruxismo" val={ch.s11_bruxismo || ch.odontologico?.bruxismo}/>
                        <Row label="Experiencia previa" val={ch.s11_experiencia || ch.odontologico?.experiencia_previa}/>
                        <Row label="Ansiedad dental" val={ch.s11_ansiedad}/>
                        <Row label="Cepillado/dia" val={ch.s11_cepillado}/>
                      </Card>

                      {ch.s12_obs && (
                        <Card icon={<FileText size={15}/>} title="Observaciones" sub="Notas del profesional">
                          <p style={{margin:0,fontSize:13,color:'#475569',lineHeight:1.7}}>{ch.s12_obs}</p>
                        </Card>
                      )}
                    </div>
                  ) : (
                    /* ─ Empty state ─ */
                    <div style={{padding:'60px 24px',display:'flex',flexDirection:'column',alignItems:'center',gap:16,textAlign:'center'}}>
                      <div style={{width:64,height:64,borderRadius:18,background:'linear-gradient(145deg,#f0f4f8,#e2e8f0)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'5px 5px 14px rgba(163,177,198,.3),-3px -3px 10px rgba(255,255,255,.95)'}}>
                        <ClipboardList size={26} style={{color:'#94a3b8'}}/>
                      </div>
                      <div>
                        <p style={{fontSize:17,fontWeight:800,color:'#1e293b',margin:'0 0 6px'}}>Historia clinica no registrada</p>
                        <p style={{fontSize:13,color:'#94a3b8',margin:0,maxWidth:360}}>
                          {selectedPatient.nombre} aun no tiene historia clinica. Completarla ayuda al profesional a conocer el estado de salud del paciente antes de cada consulta.
                        </p>
                      </div>
                      <button
                        onClick={() => setHistoryMode('edit')}
                        style={{padding:'11px 28px',background:'#29b2e8',border:'none',borderRadius:10,fontSize:14,fontWeight:700,color:'#fff',cursor:'pointer',fontFamily:'inherit',boxShadow:'0 4px 16px rgba(41,178,232,.3)',marginTop:4}}
                        onMouseEnter={e=>{e.currentTarget.style.background='#18a3db';}}
                        onMouseLeave={e=>{e.currentTarget.style.background='#29b2e8';}}
                      >
                        Completar historia clinica
                      </button>
                    </div>
                  )
                ) : (
                  /* ─ Edit form ─ */
                  <FullClinicalHistory
                    patientId={selectedPatient?.id || ''}
                    initialData={selectedPatient?.clinical_history || {}}
                    saveLabel="Guardar Historia Clinica"
                    onSave={(history: any) => {
                      if (selectedPatient) {
                        setSelectedPatient({ ...selectedPatient, clinical_history: history, historia_completa: true });
                      }
                      setHistoryMode('view');
                    }}
                    onComplete={() => setHistoryMode('view')}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <PatientDigitalFileHub
        isOpen={fileHubOpen}
        patientId={selectedPatient.id}
        patientName={`${selectedPatient.nombre} ${selectedPatient.apellidos}`.trim()}
        consultations={consultas as any}
        onClose={() => setFileHubOpen(false)}
        onRefresh={() => loadPatientById(selectedPatient.id)}
      />
    </>
  );
};
