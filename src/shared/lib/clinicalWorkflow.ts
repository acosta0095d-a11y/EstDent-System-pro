export type ConsultationKind = 'GENERAL' | 'ORTODONCIA';

export interface WorkflowConsultation {
  id: string;
  paciente_id?: string;
  tipo_consulta?: ConsultationKind | string | null;
  created_at?: string | null;
  fecha?: string | null;
  codigo_consulta?: string | null;
  detalles_clinicos?: Record<string, any> | null;
  hallazgos_odontograma?: Array<Record<string, any>> | null;
  estado_odontograma?: Record<string, any> | null;
  tiempo_sesion?: number | null;
}

export interface WorkflowPatientLike {
  id: string;
  nombre?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  estado?: string | null;
  clinical_history?: Record<string, any> | null;
  historia_completa?: boolean | null;
  consultas?: WorkflowConsultation[];
}

export interface WorkflowProcedure {
  id: string;
  nombre: string;
  pieza?: string;
  cara?: string;
  accesorio?: string;
  observaciones?: string;
  estado: 'sugerido' | 'presupuestado' | 'aprobado' | 'realizado' | string;
  costo: number;
  costoMaterial?: number;
  fecha?: string;
  hallazgoOrigen?: string;
  migradoDesdeOdontograma?: boolean;
  is_persistent?: boolean;
  garantia?: string;
  duracionEstimada?: number;
}

export interface MasterPlanItem extends WorkflowProcedure {
  patientId?: string;
  consultationId?: string;
  consultationType?: ConsultationKind;
  consultationDate?: string;
  ageInDays?: number;
  overdue?: boolean;
  stableKey: string;
}

export interface AgendaDraftPayload {
  patientId: string;
  patientName: string;
  consultationType: ConsultationKind;
  reason: string;
  durationMinutes: number;
  source: 'general' | 'ortodoncia' | 'agenda' | 'dashboard';
  sourceConsultationId?: string;
  sourceProcedureId?: string;
  procedureLabel?: string;
  notes?: string;
}

export interface AgendaCaseItem {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  kind: ConsultationKind;
  title: string;
  subtitle: string;
  status: 'critical' | 'warning' | 'planned' | 'active';
  recommendedAction: string;
  recommendedDuration: number;
  lastVisitLabel: string;
  sourceConsultationId?: string;
  sourceProcedureId?: string;
}

export interface VisitSummary {
  id: string;
  code: string;
  type: ConsultationKind;
  dateLabel: string;
  motive: string;
  doctor: string;
  note: string;
  touchedTeeth: string[];
  procedures: WorkflowProcedure[];
  raw: WorkflowConsultation;
}

const DAY_MS = 86_400_000;

const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];

const isRecord = (value: unknown): value is Record<string, any> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const safeLower = (value?: unknown) => String(value || '').trim().toLowerCase();

const startCase = (value?: string | null, fallback = 'Sin dato') => {
  const clean = String(value || '').trim();
  if (!clean) return fallback;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

const formatDateLabel = (value?: string | null) => {
  const parsed = toDate(value);
  if (!parsed) return 'Sin fecha';
  return parsed.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const diffInDays = (value?: string | null) => {
  const parsed = toDate(value);
  if (!parsed) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / DAY_MS));
};

const unique = <T,>(values: T[]) => [...new Set(values)];

const cleanProcedureName = (procedure: Record<string, any>) => {
  return startCase(
    procedure.nombre || procedure.descripcion || procedure.medicamento || procedure.accesorio,
    'Procedimiento clinico'
  );
};

const normalizeProcedure = (procedure: Record<string, any>): WorkflowProcedure => ({
  id: String(procedure.id || crypto.randomUUID()),
  nombre: cleanProcedureName(procedure),
  pieza: procedure.pieza || procedure.diente || procedure.ubicacion || '',
  cara: procedure.cara || procedure.superficie || procedure.zona || '',
  accesorio: procedure.accesorio || procedure.material || '',
  observaciones: String(procedure.observaciones || procedure.indicaciones || procedure.descripcion || ''),
  estado: String(procedure.estado || 'sugerido').toLowerCase(),
  costo: Number(procedure.costo || procedure.valor || procedure.precio || 0),
  costoMaterial: Number(procedure.costoMaterial || procedure.costo_material || 0),
  fecha: procedure.fecha || procedure.created_at || '',
  hallazgoOrigen: procedure.hallazgoOrigen || procedure.hallazgo_origen || '',
  migradoDesdeOdontograma: Boolean(procedure.migradoDesdeOdontograma),
  is_persistent: Boolean(
    procedure.is_persistent || procedure.isPersistent || ['sugerido', 'presupuestado', 'aprobado'].includes(String(procedure.estado || '').toLowerCase())
  ),
  garantia: procedure.garantia || '',
  duracionEstimada: Number(procedure.duracionEstimada || procedure.duracion_estimada || 0) || undefined,
});

export const getConsultationDate = (consultation: WorkflowConsultation) => {
  return consultation.fecha || consultation.created_at || null;
};

export const getConsultationDetails = (consultation: WorkflowConsultation) => {
  const details = isRecord(consultation.detalles_clinicos) ? consultation.detalles_clinicos : {};
  return details;
};

export const getConsultationKind = (consultation: WorkflowConsultation): ConsultationKind => {
  return consultation.tipo_consulta === 'ORTODONCIA' ? 'ORTODONCIA' : 'GENERAL';
};

export const getConsultationMotive = (consultation: WorkflowConsultation) => {
  const details = getConsultationDetails(consultation);
  if (getConsultationKind(consultation) === 'ORTODONCIA') {
    return String(details.anamnesis?.motivo || details.motivo || 'Control ortodontico').trim() || 'Control ortodontico';
  }
  return String(details.motivo || details.motivo_principal || 'Consulta general').trim() || 'Consulta general';
};

export const getConsultationDoctor = (consultation: WorkflowConsultation) => {
  const details = getConsultationDetails(consultation);
  return startCase(details.doctor || details.anamnesis?.doctor || 'Dr. Actual');
};

export const getConsultationNote = (consultation: WorkflowConsultation) => {
  const details = getConsultationDetails(consultation);
  return String(
    details.evolucion_clinica || details.evolucion || details.anamnesis?.motivo || details.motivo || ''
  ).trim();
};

export const getConsultationProcedures = (consultation: WorkflowConsultation): WorkflowProcedure[] => {
  const details = getConsultationDetails(consultation);
  const base = getConsultationKind(consultation) === 'ORTODONCIA'
    ? details.plan_tratamiento || details.recetario || []
    : details.plan_tratamiento || details.procedimientos || [];
  return asArray<Record<string, any>>(base).map(normalizeProcedure);
};

export const getConsultationTouchedTeeth = (consultation: WorkflowConsultation) => {
  const hallazgos = asArray<Record<string, any>>(consultation.hallazgos_odontograma);
  const fromHallazgos = hallazgos
    .map((item) => String(item.diente || item.pieza || '').trim())
    .filter(Boolean);
  const fromProcedures = getConsultationProcedures(consultation)
    .map((item) => String(item.pieza || '').trim())
    .filter(Boolean);
  return unique([...fromHallazgos, ...fromProcedures]).sort();
};

export const summarizeClinicalHistory = (history?: Record<string, any> | null) => {
  if (!history || !isRecord(history) || history._skipped) {
    return 'Historia base aun no diligenciada.';
  }

  const items: string[] = [];

  if (history.s2_diabetes === 'Si') items.push('diabetes');
  if (history.s2_hipertension === 'Si') items.push('hipertension');
  if (history.s2_cardiaco === 'Si') items.push('antecedente cardiaco');
  if (history.s2_asma === 'Si') items.push('asma');
  if (history.s3_toma_med === 'Si' && history.s3_medicamentos) items.push(`medicacion: ${history.s3_medicamentos}`);

  const allergies: string[] = [];
  if (history.s4_penicilina) allergies.push('penicilina');
  if (history.s4_latex) allergies.push('latex');
  if (history.s4_aspirina) allergies.push('aspirina');
  if (history.s4_ibuprofeno) allergies.push('ibuprofeno');
  if (history.s4_codeina) allergies.push('codeina');
  if (history.s4_anestesico) allergies.push('anestesicos');
  if (history.s4_yodo) allergies.push('yodo');
  if (history.s4_sulfas) allergies.push('sulfas');
  if (history.s4_alimento_alergia) allergies.push(String(history.s4_alimento_alergia));
  if (allergies.length) items.push(`alergias: ${allergies.join(', ')}`);

  if (history.s9_tabaco === 'Si') items.push('fumador');
  if (history.s8_embarazada === 'Si') items.push('embarazo en curso');

  return items.length ? items.join(' | ') : 'Sin alertas sistemicas registradas en historia base.';
};

export const buildProcedureStableKey = (procedure: WorkflowProcedure, patientId?: string) => {
  return [
    patientId || '',
    safeLower(procedure.nombre),
    safeLower(procedure.pieza),
    safeLower(procedure.cara),
    safeLower(procedure.accesorio),
  ].join('::');
};

export const deriveMasterPlan = (consultations?: WorkflowConsultation[], patientId?: string): MasterPlanItem[] => {
  const ordered = asArray(consultations)
    .slice()
    .sort((left, right) => {
      const leftDate = toDate(getConsultationDate(left))?.getTime() || 0;
      const rightDate = toDate(getConsultationDate(right))?.getTime() || 0;
      return rightDate - leftDate;
    });

  const latestByKey = new Map<string, MasterPlanItem>();

  ordered.forEach((consultation) => {
    const consultationType = getConsultationKind(consultation);
    const consultationDate = getConsultationDate(consultation) || undefined;
    getConsultationProcedures(consultation).forEach((procedure) => {
      const stableKey = buildProcedureStableKey(procedure, patientId);
      if (!stableKey.replace(/:/g, '').trim()) return;
      if (latestByKey.has(stableKey)) return;

      latestByKey.set(stableKey, {
        ...procedure,
        patientId,
        consultationId: consultation.id,
        consultationType,
        consultationDate,
        ageInDays: diffInDays(consultationDate) ?? undefined,
        overdue: ['sugerido', 'presupuestado', 'aprobado'].includes(String(procedure.estado).toLowerCase()) && (diffInDays(consultationDate) ?? 0) > 30,
        stableKey,
      });
    });
  });

  return [...latestByKey.values()].filter((item) => item.estado !== 'realizado');
};

export const generateAutoNote = ({ tool, tooth, surface, kind }: { tool?: string; tooth?: string; surface?: string; kind?: ConsultationKind }) => {
  const toolLabel = safeLower(tool);
  const toothLabel = tooth ? `pieza #${tooth}` : 'pieza a confirmar';
  const faceLabel = surface ? ` (${surface})` : '';

  if (toolLabel.includes('resina') || toolLabel.includes('obtur')) {
    return `Se realiza restauracion definitiva con resina en ${toothLabel}${faceLabel}, con aislamiento y control de oclusion.`;
  }
  if (toolLabel.includes('endodon')) {
    return `Se ejecuta manejo endodontico en ${toothLabel}${faceLabel}. Se deja alerta para rehabilitacion coronaria en siguiente cita.`;
  }
  if (toolLabel.includes('extrac')) {
    return `Se realiza exodoncia de ${toothLabel}. El organo dentario queda registrado como ausente en el estado odontologico del paciente.`;
  }
  if (toolLabel.includes('sellante')) {
    return `Se aplica sellante preventivo en ${toothLabel}${faceLabel}, con control de retencion y plan de vigilancia.`;
  }
  if (toolLabel.includes('bracket') || toolLabel.includes('tubo') || toolLabel.includes('banda')) {
    return `Se interviene aparatologia ortodontica en ${toothLabel}${faceLabel}, registrando control mecanico y continuidad del plan longitudinal.`;
  }
  if (kind === 'ORTODONCIA') {
    return `Se documenta ajuste ortodontico sobre ${toothLabel}${faceLabel}, con seguimiento sobre biomecanica, control y adherencia.`;
  }
  return `Se interviene ${toothLabel}${faceLabel} mediante ${tool || 'procedimiento clinico'}, quedando registro en la evolucion de la sesion.`;
};

export const appendAutoNote = (currentText: string, note: string) => {
  const cleanCurrent = String(currentText || '').trim();
  const cleanNote = String(note || '').trim();
  if (!cleanNote) return cleanCurrent;
  if (cleanCurrent.toLowerCase().includes(cleanNote.toLowerCase())) return cleanCurrent;
  return cleanCurrent ? `${cleanCurrent}\n${cleanNote}` : cleanNote;
};

export const buildVisitSummary = (consultation: WorkflowConsultation): VisitSummary => {
  const type = getConsultationKind(consultation);
  return {
    id: consultation.id,
    code: String(consultation.codigo_consulta || getConsultationDetails(consultation).codigo_consulta || consultation.id),
    type,
    dateLabel: formatDateLabel(getConsultationDate(consultation)),
    motive: getConsultationMotive(consultation),
    doctor: getConsultationDoctor(consultation),
    note: getConsultationNote(consultation),
    touchedTeeth: getConsultationTouchedTeeth(consultation),
    procedures: getConsultationProcedures(consultation),
    raw: consultation,
  };
};

export const buildAgendaCases = (patients: WorkflowPatientLike[], consultations: WorkflowConsultation[]) => {
  const consultationsByPatient = consultations.reduce<Record<string, WorkflowConsultation[]>>((acc, consultation) => {
    const patientId = String(consultation.paciente_id || '');
    if (!patientId) return acc;
    acc[patientId] = acc[patientId] || [];
    acc[patientId].push(consultation);
    return acc;
  }, {});

  const cases: AgendaCaseItem[] = [];

  patients.forEach((patient) => {
    const patientConsultations = asArray(consultationsByPatient[patient.id]).slice().sort((left, right) => {
      const leftDate = toDate(getConsultationDate(left))?.getTime() || 0;
      const rightDate = toDate(getConsultationDate(right))?.getTime() || 0;
      return rightDate - leftDate;
    });

    const patientName = [patient.nombre, patient.apellidos].filter(Boolean).join(' ').trim() || 'Paciente sin nombre';
    const phone = String(patient.telefono || 'Sin telefono');
    const masterPlan = deriveMasterPlan(patientConsultations, patient.id);
    const latest = patientConsultations[0];
    const latestKind = latest ? getConsultationKind(latest) : 'GENERAL';
    const daysSinceLastVisit = latest ? diffInDays(getConsultationDate(latest)) ?? 0 : null;
    const hasPendingOrtho = masterPlan.some((item) => item.consultationType === 'ORTODONCIA');

    masterPlan.slice(0, 3).forEach((item) => {
      cases.push({
        id: `plan-${patient.id}-${item.id}`,
        patientId: patient.id,
        patientName,
        phone,
        kind: item.consultationType || latestKind,
        title: item.nombre,
        subtitle: item.pieza ? `Pieza ${item.pieza}${item.cara ? ` · ${item.cara}` : ''}` : (item.observaciones || 'Sin ubicacion puntual'),
        status: item.overdue ? 'critical' : item.estado === 'aprobado' ? 'active' : 'planned',
        recommendedAction: item.consultationType === 'ORTODONCIA' ? 'Programar control ortodontico' : 'Programar ejecucion de tratamiento',
        recommendedDuration: item.duracionEstimada || (item.consultationType === 'ORTODONCIA' ? 30 : 60),
        lastVisitLabel: latest ? formatDateLabel(getConsultationDate(latest)) : 'Sin visita previa',
        sourceConsultationId: item.consultationId,
        sourceProcedureId: item.id,
      });
    });

    if (latest && daysSinceLastVisit !== null) {
      if (latestKind === 'ORTODONCIA' && daysSinceLastVisit > 35) {
        cases.push({
          id: `ortho-overdue-${patient.id}`,
          patientId: patient.id,
          patientName,
          phone,
          kind: 'ORTODONCIA',
          title: 'Control ortodontico vencido',
          subtitle: `${daysSinceLastVisit} dias sin control. La continuidad del caso puede verse comprometida.`,
          status: 'critical',
          recommendedAction: 'Llamar y reagendar control mensual',
          recommendedDuration: 30,
          lastVisitLabel: formatDateLabel(getConsultationDate(latest)),
          sourceConsultationId: latest.id,
        });
      }

      if (latestKind === 'GENERAL' && daysSinceLastVisit > 180 && !hasPendingOrtho) {
        cases.push({
          id: `general-recall-${patient.id}`,
          patientId: patient.id,
          patientName,
          phone,
          kind: 'GENERAL',
          title: 'Recall preventivo',
          subtitle: `${daysSinceLastVisit} dias desde la ultima consulta general. Conviene control o profilaxis.`,
          status: 'warning',
          recommendedAction: 'Ofrecer control preventivo semestral',
          recommendedDuration: 45,
          lastVisitLabel: formatDateLabel(getConsultationDate(latest)),
          sourceConsultationId: latest.id,
        });
      }
    }

    if (!patient.historia_completa) {
      cases.push({
        id: `history-${patient.id}`,
        patientId: patient.id,
        patientName,
        phone,
        kind: latestKind,
        title: 'Historia base incompleta',
        subtitle: 'Recepcion o doctor deben cerrar antecedentes y alertas sistemicas antes de seguir escalando el caso.',
        status: 'warning',
        recommendedAction: 'Completar historia clinica base',
        recommendedDuration: 20,
        lastVisitLabel: latest ? formatDateLabel(getConsultationDate(latest)) : 'Paciente nuevo',
        sourceConsultationId: latest?.id,
      });
    }
  });

  return cases.sort((left, right) => {
    const priority = { critical: 0, warning: 1, active: 2, planned: 3 };
    return priority[left.status] - priority[right.status];
  });
};
