import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellRing,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
  MessageCircle,
  RefreshCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { HistorialClinicoViewer } from '../../../shared/components/HistorialClinicoViewer';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';

const OPS_STORAGE_KEY = 'agenda-ops-tabs-v1';
const DEFAULT_CONSULTORIO = 'Consultorio EstDent';

type ConsultationKind = 'GENERAL' | 'ORTODONCIA';
type DispatchChannel = 'whatsapp' | 'email';
type AgendaTab = 'despacho' | 'mensajes' | 'seguimiento' | 'centro';

type NotificationTone = 'critical' | 'warning' | 'info';

interface AgendaPatientRow {
  id: string;
  nombre: string;
  apellidos?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado?: string | null;
  clinical_history?: Record<string, any> | null;
  historia_completa?: boolean | null;
}

interface AgendaConsultationRow {
  id: string;
  paciente_id?: string | null;
  tipo_consulta?: ConsultationKind | string | null;
  created_at?: string | null;
  fecha?: string | null;
  codigo_consulta?: string | null;
  detalles_clinicos?: Record<string, any> | null;
}

interface FollowupRow {
  patient: AgendaPatientRow;
  latestConsultation?: AgendaConsultationRow;
  latestKind: ConsultationKind;
  nextVisitDate: Date | null;
  daysToVisit: number | null;
  treatmentSummary: string;
  preferredChannel: DispatchChannel;
  status: 'overdue' | 'today' | 'upcoming' | 'later' | 'unscheduled';
  isOrthoTrack: boolean;
}

interface InventoryAlert {
  id: string;
  name: string;
  stock: number;
  min: number;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  tone: NotificationTone;
}

interface OpsState {
  notes: Record<string, string>;
  reminders: Record<string, string>;
  sentByPatientDate: Record<string, string>;
  channelByPatient: Record<string, DispatchChannel>;
  whatsappTemplate: string;
  emailTemplate: string;
  automationEnabled: boolean;
}

const defaultOpsState: OpsState = {
  notes: {},
  reminders: {},
  sentByPatientDate: {},
  channelByPatient: {},
  whatsappTemplate:
    'Hola {nombre}, desde {consultorio} te recordamos tu proxima cita de {tipo} el {fecha}. Seguimiento: {tratamiento}.',
  emailTemplate:
    'Asunto: Recordatorio de cita - {consultorio}\n\nHola {nombre},\n\nTe confirmamos tu proxima cita de {tipo} para {fecha}.\nCodigo de referencia: {codigo}.\nSeguimiento actual: {tratamiento}.\n\nAtentamente,\n{consultorio}',
  automationEnabled: true,
};

const asRecord = (value: unknown): Record<string, any> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  return {};
};

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDayStart = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const addDays = (value: Date, days: number) => {
  const copy = new Date(value);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const parsePositive = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const normalizeText = (value: unknown, fallback = 'Sin dato') => {
  const safe = String(value || '').trim();
  return safe || fallback;
};

const formatDateLabel = (value: Date | null) => {
  if (!value) return 'Sin fecha definida';
  return value.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dayKey = (value: Date | null) => {
  if (!value) return '';
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const daysDiffFromToday = (value: Date | null) => {
  if (!value) return null;
  const today = toDayStart(new Date());
  const target = toDayStart(value);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
};

const getConsultationDate = (consultation?: AgendaConsultationRow) => {
  if (!consultation) return null;
  return toDate(consultation.fecha || consultation.created_at || null);
};

const getConsultationKind = (consultation?: AgendaConsultationRow): ConsultationKind => {
  return consultation?.tipo_consulta === 'ORTODONCIA' ? 'ORTODONCIA' : 'GENERAL';
};

const extractFollowupDaysFromProcedures = (details: Record<string, any>) => {
  const procedures = [
    ...(Array.isArray(details.plan_tratamiento) ? details.plan_tratamiento : []),
    ...(Array.isArray(details.procedimientos) ? details.procedimientos : []),
  ].map((item) => asRecord(item));

  for (const procedure of procedures) {
    const direct = [
      procedure.next_followup_days,
      procedure.followup_days,
      procedure.proxima_visita_dias,
      procedure.dias_proxima_cita,
      procedure.control_en_dias,
    ]
      .map(parsePositive)
      .find((value) => value > 0 && value <= 365);

    if (direct) return direct;

    const text = `${procedure.indicaciones || ''} ${procedure.observaciones || ''} ${procedure.descripcion || ''}`.trim();
    const match = text.match(/(\d{1,3})\s*d[ií]as?/i);
    if (match) {
      const parsed = parsePositive(match[1]);
      if (parsed > 0 && parsed <= 365) return parsed;
    }
  }

  return 0;
};

const extractNextVisitDate = (consultation?: AgendaConsultationRow) => {
  if (!consultation) return { nextDate: null as Date | null, days: 0 };

  const details = asRecord(consultation.detalles_clinicos);
  const kind = getConsultationKind(consultation);
  const baseDate = getConsultationDate(consultation);

  const rawDirect = details.proxima_visita;
  if (typeof rawDirect === 'string' && rawDirect.trim()) {
    const parsed = toDate(rawDirect);
    if (parsed) return { nextDate: parsed, days: Math.max(1, daysDiffFromToday(parsed) ?? 0) };
  }

  if (rawDirect && typeof rawDirect === 'object') {
    const info = asRecord(rawDirect);
    const explicit = toDate(String(info.fecha || info.date || info.proxima_fecha || '').trim());
    if (explicit) return { nextDate: explicit, days: Math.max(1, daysDiffFromToday(explicit) ?? 0) };
  }

  const workflowDays = parsePositive(asRecord(details.workflow_summary).next_followup_days);
  const procedureDays = extractFollowupDaysFromProcedures(details);
  const fallbackDays = kind === 'ORTODONCIA' ? 30 : 15;
  const finalDays = workflowDays || procedureDays || fallbackDays;

  if (!baseDate) return { nextDate: null as Date | null, days: finalDays };

  return {
    nextDate: addDays(baseDate, finalDays),
    days: finalDays,
  };
};

const extractTreatmentSummary = (consultation?: AgendaConsultationRow) => {
  if (!consultation) return 'Sin consulta previa registrada';
  const details = asRecord(consultation.detalles_clinicos);
  const procedures = [
    ...(Array.isArray(details.plan_tratamiento) ? details.plan_tratamiento : []),
    ...(Array.isArray(details.procedimientos) ? details.procedimientos : []),
  ].map((item) => asRecord(item));

  if (procedures.length) {
    const first = procedures.slice(0, 2).map((item) => normalizeText(item.nombre || item.descripcion, 'Procedimiento'));
    return first.join(' + ');
  }

  return normalizeText(details.motivo || details.motivo_principal || asRecord(details.workflow_summary).next_consultation_reason, 'Seguimiento clinico general');
};

const toPhoneDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

const buildInventoryAlerts = async (): Promise<InventoryAlert[]> => {
  const candidateTables = ['inventario', 'inventario_items', 'insumos', 'productos_inventario'];

  for (const table of candidateTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(120);
      if (error || !Array.isArray(data) || !data.length) continue;

      const alerts = data
        .map((item, index) => {
          const row = asRecord(item);
          const stock = Number(row.stock ?? row.cantidad ?? row.cantidad_actual ?? row.existencias ?? row.disponible ?? NaN);
          const min = Number(row.minimo ?? row.stock_minimo ?? row.alerta_minima ?? row.min_stock ?? NaN);
          const name = normalizeText(row.nombre || row.descripcion || row.producto || row.insumo, `Item ${index + 1}`);

          if (!Number.isFinite(stock) || !Number.isFinite(min)) return null;
          if (stock > min) return null;

          return {
            id: String(row.id || `${table}-${index}`),
            name,
            stock,
            min,
          } as InventoryAlert;
        })
        .filter(Boolean) as InventoryAlert[];

      if (alerts.length) return alerts;
    } catch {
      // Table missing/permission error, continue searching.
    }
  }

  return [];
};

export const AgendaHub = () => {
  const navigate = useNavigate();
  const { setCurrentView, loadPatientById } = usePatient();

  const [activeTab, setActiveTab] = useState<AgendaTab>('despacho');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [patients, setPatients] = useState<AgendaPatientRow[]>([]);
  const [consultations, setConsultations] = useState<AgendaConsultationRow[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [viewerPatient, setViewerPatient] = useState<AgendaPatientRow | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const [ops, setOps] = useState<OpsState>(() => {
    try {
      const raw = localStorage.getItem(OPS_STORAGE_KEY);
      if (!raw) return defaultOpsState;
      const parsed = JSON.parse(raw) as Partial<OpsState>;
      return {
        ...defaultOpsState,
        ...parsed,
        notes: parsed.notes || {},
        reminders: parsed.reminders || {},
        sentByPatientDate: parsed.sentByPatientDate || {},
        channelByPatient: parsed.channelByPatient || {},
      };
    } catch {
      return defaultOpsState;
    }
  });

  const patientMap = useMemo(
    () => patients.reduce<Record<string, AgendaPatientRow>>((acc, patient) => {
      acc[patient.id] = patient;
      return acc;
    }, {}),
    [patients]
  );

  const consultationsByPatient = useMemo(() => {
    return consultations.reduce<Record<string, AgendaConsultationRow[]>>((acc, consultation) => {
      const patientId = String(consultation.paciente_id || '');
      if (!patientId) return acc;
      if (!acc[patientId]) acc[patientId] = [];
      acc[patientId].push(consultation);
      return acc;
    }, {});
  }, [consultations]);

  const followupRows = useMemo<FollowupRow[]>(() => {
    const rows = patients.map((patient) => {
      const ordered = (consultationsByPatient[patient.id] || [])
        .slice()
        .sort((a, b) => {
          const ta = getConsultationDate(a)?.getTime() || 0;
          const tb = getConsultationDate(b)?.getTime() || 0;
          return tb - ta;
        });

      const latest = ordered[0];
      const latestKind = getConsultationKind(latest);
      const { nextDate } = extractNextVisitDate(latest);
      const daysToVisit = daysDiffFromToday(nextDate);

      let status: FollowupRow['status'] = 'unscheduled';
      if (nextDate && daysToVisit !== null) {
        if (daysToVisit < 0) status = 'overdue';
        else if (daysToVisit === 0) status = 'today';
        else if (daysToVisit <= 7) status = 'upcoming';
        else status = 'later';
      }

      const preferredChannel = ops.channelByPatient[patient.id]
        || (patient.telefono ? 'whatsapp' : (patient.email ? 'email' : 'whatsapp'));

      return {
        patient,
        latestConsultation: latest,
        latestKind,
        nextVisitDate: nextDate,
        daysToVisit,
        treatmentSummary: extractTreatmentSummary(latest),
        preferredChannel,
        status,
        isOrthoTrack: latestKind === 'ORTODONCIA',
      };
    });

    return rows.sort((a, b) => {
      const ta = a.nextVisitDate?.getTime() || Number.MAX_SAFE_INTEGER;
      const tb = b.nextVisitDate?.getTime() || Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }, [patients, consultationsByPatient, ops.channelByPatient]);

  useEffect(() => {
    if (!selectedPatientId && followupRows[0]) {
      setSelectedPatientId(followupRows[0].patient.id);
      return;
    }
    if (selectedPatientId && !followupRows.some((row) => row.patient.id === selectedPatientId)) {
      setSelectedPatientId(followupRows[0]?.patient.id || '');
    }
  }, [followupRows, selectedPatientId]);

  const selectedRow = useMemo(
    () => followupRows.find((row) => row.patient.id === selectedPatientId) || null,
    [followupRows, selectedPatientId]
  );

  const viewerConsultations = useMemo(
    () => (viewerPatient ? consultationsByPatient[viewerPatient.id] || [] : []),
    [consultationsByPatient, viewerPatient]
  );

  const getConsultorioLabel = (row: FollowupRow) => {
    const details = asRecord(row.latestConsultation?.detalles_clinicos);
    const workflow = asRecord(details.workflow_summary);
    return normalizeText(workflow.consultorio || details.consultorio || DEFAULT_CONSULTORIO, DEFAULT_CONSULTORIO);
  };

  const getConsultationCode = (row: FollowupRow) => {
    const details = asRecord(row.latestConsultation?.detalles_clinicos);
    const workflow = asRecord(details.workflow_summary);
    return normalizeText(row.latestConsultation?.codigo_consulta || workflow.codigo_consulta, 'SIN-CODIGO');
  };

  const resolveTemplate = (template: string, row: FollowupRow) => {
    const patientName = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim() || 'Paciente';
    const replacements: Record<string, string> = {
      nombre: patientName,
      fecha: formatDateLabel(row.nextVisitDate),
      dias: row.daysToVisit === null ? 'sin programar' : String(row.daysToVisit),
      tipo: row.latestKind,
      tratamiento: row.treatmentSummary,
      consultorio: getConsultorioLabel(row),
      codigo: getConsultationCode(row),
    };

    return Object.entries(replacements).reduce(
      (acc, [key, value]) => acc.split(`{${key}}`).join(value),
      template
    );
  };

  const markAsSent = (row: FollowupRow) => {
    const key = `${row.patient.id}::${dayKey(row.nextVisitDate)}`;
    setOps((prev) => ({
      ...prev,
      sentByPatientDate: {
        ...prev.sentByPatientDate,
        [key]: new Date().toISOString(),
      },
    }));
  };

  const wasSent = (row: FollowupRow) => {
    const key = `${row.patient.id}::${dayKey(row.nextVisitDate)}`;
    return Boolean(ops.sentByPatientDate[key]);
  };

  const openGmailCompose = ({ to, subject, body }: { to: string; subject: string; body: string }) => {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const dispatchMessage = (row: FollowupRow, forcedChannel?: DispatchChannel) => {
    const channel = forcedChannel || row.preferredChannel;

    if (channel === 'whatsapp') {
      const digits = toPhoneDigits(row.patient.telefono);
      if (!digits) return;
      const normalized = digits.startsWith('57') ? digits : `57${digits}`;
      const payload = resolveTemplate(ops.whatsappTemplate, row);
      window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(payload)}`, '_blank', 'noopener,noreferrer');
      markAsSent(row);
      return;
    }

    const mail = String(row.patient.email || '').trim();
    if (!mail) return;

    const full = resolveTemplate(ops.emailTemplate, row);
    const lines = full.split('\n');
    const first = lines[0] || '';
    const hasSubject = /^asunto:/i.test(first.trim());
    const subjectLine = hasSubject
      ? first.replace(/^asunto:/i, '').trim()
      : `Recordatorio de cita - ${getConsultorioLabel(row)}`;
    const body = hasSubject ? lines.slice(1).join('\n').trim() : full;

    openGmailCompose({ to: mail, subject: subjectLine, body });
    markAsSent(row);
  };

  const processAutomaticQueue = () => {
    if (!ops.automationEnabled) return;

    const pendingEmail = followupRows.find((row) => {
      if (wasSent(row)) return false;
      if (!row.patient.email) return false;
      return row.status === 'overdue' || row.status === 'today' || row.status === 'upcoming';
    });

    if (!pendingEmail) return;

    setOps((prev) => ({
      ...prev,
      channelByPatient: {
        ...prev.channelByPatient,
        [pendingEmail.patient.id]: 'email',
      },
    }));

    dispatchMessage(pendingEmail, 'email');
  };

  const notificationCenter = useMemo<NotificationItem[]>(() => {
    const notifications: NotificationItem[] = [];

    followupRows.filter((row) => row.status === 'overdue').slice(0, 8).forEach((row) => {
      notifications.push({
        id: `overdue-${row.patient.id}`,
        tone: 'critical',
        title: `${row.patient.nombre} ${row.patient.apellidos || ''}`.trim(),
        body: `Cita vencida (${Math.abs(row.daysToVisit || 0)} dias). Priorizar contacto.`,
      });
    });

    followupRows.filter((row) => row.status === 'today' || row.status === 'upcoming').slice(0, 8).forEach((row) => {
      notifications.push({
        id: `due-${row.patient.id}`,
        tone: 'warning',
        title: `${row.patient.nombre} ${row.patient.apellidos || ''}`.trim(),
        body: `Control ${row.status === 'today' ? 'hoy' : 'proximo'} en ${formatDateLabel(row.nextVisitDate)}.`,
      });
    });

    inventoryAlerts.slice(0, 8).forEach((alert) => {
      notifications.push({
        id: `inv-${alert.id}`,
        tone: 'info',
        title: `Inventario bajo - ${alert.name}`,
        body: `Stock ${alert.stock} / minimo ${alert.min}.`,
      });
    });

    return notifications.slice(0, 16);
  }, [followupRows, inventoryAlerts]);

  const summary = useMemo(() => {
    const pending = followupRows.filter((row) => row.status !== 'later' && row.status !== 'unscheduled').length;
    const orthoTracks = followupRows.filter((row) => row.isOrthoTrack).length;
    const notesCount = Object.values(ops.notes).filter((value) => value.trim()).length;
    return {
      pending,
      orthoTracks,
      notesCount,
      notifications: notificationCenter.length,
      inventoryAlerts: inventoryAlerts.length,
    };
  }, [followupRows, ops.notes, notificationCenter.length, inventoryAlerts.length]);

  const loadAgenda = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [patientsResult, consultationsResult, inventory] = await Promise.all([
        supabase
          .from('pacientes')
          .select('id, nombre, apellidos, telefono, email, estado, clinical_history, historia_completa')
          .order('creado_en', { ascending: false })
          .limit(500),
        supabase
          .from('consultas_odontologicas')
          .select('id, paciente_id, tipo_consulta, created_at, fecha, codigo_consulta, detalles_clinicos')
          .order('created_at', { ascending: false })
          .limit(1600),
        buildInventoryAlerts(),
      ]);

      if (patientsResult.error) throw patientsResult.error;
      if (consultationsResult.error) throw consultationsResult.error;

      setPatients((patientsResult.data || []) as AgendaPatientRow[]);
      setConsultations((consultationsResult.data || []) as AgendaConsultationRow[]);
      setInventoryAlerts(inventory);
    } catch (error: any) {
      console.error('[AgendaHub] Error loading agenda ops:', error);
      setLoadError(error?.message || 'No se pudo cargar la agenda operativa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(loadAgenda, 120000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(OPS_STORAGE_KEY, JSON.stringify(ops));
  }, [ops]);

  const openPatientRecord = async (patientId: string) => {
    await loadPatientById(patientId);
    setCurrentView('pacientes');
    navigate('/');
  };

  const openConsultation = async (kind: ConsultationKind, patientId: string) => {
    // Regla operativa: no se reabre una cita cerrada. Siempre se crea una nueva consulta.
    await loadPatientById(patientId);
    navigate(kind === 'GENERAL' ? '/consulta/general' : '/consulta/ortodoncia');
  };

  const openHistory = (patientId: string) => {
    const patient = patientMap[patientId];
    if (!patient) return;
    setViewerPatient(patient);
  };

  const toneStyle: Record<NotificationTone, { bg: string; border: string; fg: string }> = {
    critical: { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c' },
    warning: { bg: '#fff7ed', border: '#fed7aa', fg: '#9a3412' },
    info: { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
  };

  return (
    <>
      <style>{`
        .ag3, .ag3 * { box-sizing:border-box; font-family:'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
        .ag3 {
          min-height:100vh;
          padding:28px 15px 40px;
          background: radial-gradient(circle at top left, rgba(255,255,255,.92), rgba(255,255,255,0) 30%), linear-gradient(180deg,#eef2f6 0%,#e7edf3 100%);
          color:#0f172a;
        }
        .ag3-shell { max-width:1360px; margin:0 auto; display:grid; gap:20px; }
        .ag3-card {
          border-radius:22px;
          border:1px solid #dbe3ec;
          background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(246,249,252,.96));
          box-shadow:0 16px 38px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.84);
        }
        .ag3-head { padding:22px 24px 0; display:flex; justify-content:space-between; gap:12px; align-items:center; }
        .ag3-body { padding:18px 24px 24px; }
        .ag3-kicker { margin:0 0 8px; font-size:11px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; color:#94a3b8; }
        .ag3-title { margin:0; font-size:30px; font-weight:900; letter-spacing:-.04em; color:#111827; line-height:1.05; }
        .ag3-copy { margin:10px 0 0; font-size:13.5px; color:#64748b; line-height:1.75; max-width:820px; }

        .ag3-chip {
          display:inline-flex; align-items:center; gap:7px; border-radius:999px;
          border:1px solid #d4dde7; background:#f8fafc; color:#64748b;
          padding:8px 12px; font-size:10.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
        }

        .ag3-stats { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px; }
        .ag3-stat { border:1px solid #dbe3ec; border-radius:14px; background:#f8fbff; padding:12px; display:grid; gap:7px; }
        .ag3-stat-label { font-size:10px; font-weight:800; letter-spacing:.1em; color:#94a3b8; text-transform:uppercase; }
        .ag3-stat-value { font-size:23px; line-height:1; font-weight:900; letter-spacing:-.04em; color:#0f172a; }

        .ag3-tabs { display:flex; flex-wrap:wrap; gap:8px; }
        .ag3-tab {
          border:1px solid #cbd5e1; background:#fff; color:#475569;
          border-radius:12px; padding:9px 12px; font-size:11px; font-weight:800;
          letter-spacing:.06em; text-transform:uppercase; cursor:pointer;
        }
        .ag3-tab.active { background:#0f172a; color:#fff; border-color:#0f172a; }

        .ag3-row-list { display:grid; gap:10px; }
        .ag3-row { border:1px solid #dbe3ec; border-radius:14px; background:#fff; padding:12px; display:grid; gap:9px; }
        .ag3-row-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
        .ag3-row-title { font-size:14px; font-weight:900; color:#111827; }
        .ag3-row-sub { margin-top:3px; font-size:12.5px; color:#64748b; line-height:1.6; }
        .ag3-meta { display:flex; flex-wrap:wrap; gap:7px; }
        .ag3-meta-chip { border:1px solid #dbe3ec; border-radius:10px; background:#f8fafc; padding:6px 9px; font-size:11px; font-weight:700; color:#475569; }

        .ag3-actions { display:flex; flex-wrap:wrap; gap:8px; }
        .ag3-btn, .ag3-btn-soft {
          cursor:pointer; border-radius:11px; padding:8px 10px; display:inline-flex; align-items:center; gap:6px;
          font-size:11.5px; font-weight:800;
        }
        .ag3-btn { border:none; background:#0f172a; color:#fff; }
        .ag3-btn-soft { border:1px solid #cbd5e1; background:#fff; color:#334155; }

        .ag3-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
        .ag3-field { display:grid; gap:6px; }
        .ag3-label { font-size:10px; font-weight:800; letter-spacing:.08em; color:#94a3b8; text-transform:uppercase; }
        .ag3-input, .ag3-select, .ag3-textarea {
          width:100%; border-radius:11px; border:1px solid #d4dde7; background:#fff;
          color:#1e293b; padding:9px 11px; font-size:12.5px; outline:none;
        }
        .ag3-textarea { min-height:120px; resize:vertical; line-height:1.65; }

        .ag3-table { width:100%; border-collapse:separate; border-spacing:0; border:1px solid #dbe3ec; border-radius:12px; overflow:hidden; }
        .ag3-table th {
          text-align:left; padding:10px 12px; border-bottom:1px solid #dbe3ec; background:#f1f5f9;
          font-size:10px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; color:#64748b;
        }
        .ag3-table td { padding:10px 12px; border-bottom:1px solid #e2e8f0; font-size:12.5px; color:#334155; }
        .ag3-table tr:last-child td { border-bottom:none; }

        .ag3-notif-list { display:grid; gap:8px; }
        .ag3-notif { border-radius:12px; border:1px solid; padding:10px; display:grid; gap:4px; }
        .ag3-notif-title { font-size:12.5px; font-weight:800; }
        .ag3-notif-copy { font-size:12px; line-height:1.55; }

        .ag3-alert { border:1px solid #fecaca; background:#fef2f2; color:#b91c1c; border-radius:12px; padding:12px; font-size:13px; font-weight:700; }
        .ag3-empty { border:1px dashed #cbd5e1; border-radius:12px; background:#f8fafc; padding:14px; font-size:12.5px; color:#64748b; }

        @media (max-width:1080px) {
          .ag3-stats { grid-template-columns:repeat(3,minmax(0,1fr)); }
          .ag3-grid2 { grid-template-columns:1fr; }
        }
        @media (max-width:760px) {
          .ag3 { padding:20px 14px 30px; }
          .ag3-title { font-size:24px; }
          .ag3-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .ag3-table { display:block; overflow-x:auto; }
        }
      `}</style>

      <div className="ag3">
        <div className="ag3-shell">
          <section className="ag3-card">
            <div className="ag3-head">
              <div>
                <p className="ag3-kicker">Agenda operacional simplificada</p>
                <h1 className="ag3-title">Despacho de citas, seguimiento y notificaciones por pestañas.</h1>
                <p className="ag3-copy">
                  Regla general aplicada: una cita cerrada no se reabre. Desde aqui solo se generan comunicaciones y nuevas citas.
                </p>
              </div>
              <span className="ag3-chip">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="ag3-body">
              <div className="ag3-stats">
                <div className="ag3-stat"><span className="ag3-stat-label">Pacientes</span><span className="ag3-stat-value">{patients.length}</span></div>
                <div className="ag3-stat"><span className="ag3-stat-label">Pendientes</span><span className="ag3-stat-value">{summary.pending}</span></div>
                <div className="ag3-stat"><span className="ag3-stat-label">Track ortodoncia</span><span className="ag3-stat-value">{summary.orthoTracks}</span></div>
                <div className="ag3-stat"><span className="ag3-stat-label">Notificaciones</span><span className="ag3-stat-value">{summary.notifications}</span></div>
                <div className="ag3-stat"><span className="ag3-stat-label">Inventario</span><span className="ag3-stat-value">{summary.inventoryAlerts}</span></div>
              </div>
            </div>
          </section>

          {loadError ? <div className="ag3-alert">{loadError}</div> : null}

          <section className="ag3-card">
            <div className="ag3-body" style={{ paddingTop: 18 }}>
              <div className="ag3-tabs">
                {[
                  { id: 'despacho', label: 'Despacho', icon: <Send size={13} /> },
                  { id: 'mensajes', label: 'Mensajes', icon: <Mail size={13} /> },
                  { id: 'seguimiento', label: 'Seguimiento', icon: <ClipboardList size={13} /> },
                  { id: 'centro', label: 'Centro', icon: <BellRing size={13} /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`ag3-tab${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab.id as AgendaTab)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
                <button className="ag3-btn-soft" onClick={loadAgenda} style={{ marginLeft: 'auto' }}>
                  <RefreshCcw size={13} /> Sincronizar
                </button>
              </div>
            </div>
          </section>

          {activeTab === 'despacho' && (
            <section className="ag3-card">
              <div className="ag3-head">
                <div>
                  <p className="ag3-kicker">Cola de contacto</p>
                  <h2 className="ag3-title" style={{ fontSize: 24 }}>Pacientes para acordar proxima cita</h2>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ag3-btn-soft" onClick={processAutomaticQueue}>
                    <Sparkles size={13} /> Auto correo (Gmail)
                  </button>
                </div>
              </div>
              <div className="ag3-body">
                {loading ? (
                  <div className="ag3-empty">Cargando cola de pacientes...</div>
                ) : followupRows.length ? (
                  <div className="ag3-row-list">
                    {followupRows.slice(0, 50).map((row) => {
                      const patientName = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim();
                      const sent = wasSent(row);
                      const tone = row.status === 'overdue'
                        ? { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c', label: 'vencida' }
                        : row.status === 'today'
                        ? { bg: '#fff7ed', border: '#fed7aa', fg: '#9a3412', label: 'hoy' }
                        : row.status === 'upcoming'
                        ? { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8', label: 'proxima' }
                        : row.status === 'later'
                        ? { bg: '#f8fafc', border: '#cbd5e1', fg: '#475569', label: 'programada' }
                        : { bg: '#f8fafc', border: '#cbd5e1', fg: '#475569', label: 'sin fecha' };

                      return (
                        <div key={row.patient.id} className="ag3-row">
                          <div className="ag3-row-top">
                            <div>
                              <div className="ag3-row-title">{patientName}</div>
                              <div className="ag3-row-sub">{row.treatmentSummary}</div>
                            </div>
                            <span className="ag3-chip" style={{ background: tone.bg, borderColor: tone.border, color: tone.fg }}>
                              <CalendarClock size={12} /> {tone.label}
                            </span>
                          </div>

                          <div className="ag3-meta">
                            <span className="ag3-meta-chip">Proxima: {formatDateLabel(row.nextVisitDate)}</span>
                            <span className="ag3-meta-chip">Dias: {row.daysToVisit === null ? '-' : row.daysToVisit}</span>
                            <span className="ag3-meta-chip">Tipo: {row.latestKind}</span>
                            <span className="ag3-meta-chip">Consultorio: {getConsultorioLabel(row)}</span>
                            <span className="ag3-meta-chip">{sent ? 'Despachado' : 'Pendiente'}</span>
                          </div>

                          <div className="ag3-actions">
                            <button className="ag3-btn-soft" onClick={() => dispatchMessage(row, 'whatsapp')} disabled={!row.patient.telefono}>
                              <MessageCircle size={13} /> WhatsApp
                            </button>
                            <button className="ag3-btn-soft" onClick={() => dispatchMessage(row, 'email')} disabled={!row.patient.email}>
                              <Mail size={13} /> Gmail
                            </button>
                            <button className="ag3-btn-soft" onClick={() => openHistory(row.patient.id)}>
                              <ClipboardList size={13} /> Historial
                            </button>
                            <button className="ag3-btn-soft" onClick={() => openConsultation(row.latestKind, row.patient.id)}>
                              <Stethoscope size={13} /> Nueva consulta
                            </button>
                            <button className="ag3-btn" onClick={() => openPatientRecord(row.patient.id)}>
                              <Send size={13} /> Ficha paciente
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ag3-empty">No hay pacientes para despacho actualmente.</div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'mensajes' && (
            <section className="ag3-card">
              <div className="ag3-head">
                <div>
                  <p className="ag3-kicker">Editor de mensajes</p>
                  <h2 className="ag3-title" style={{ fontSize: 24 }}>Plantillas y redaccion manual</h2>
                </div>
                <span className="ag3-chip">Variables: {'{nombre}'} {'{fecha}'} {'{tipo}'} {'{consultorio}'} {'{codigo}'}</span>
              </div>
              <div className="ag3-body ag3-grid2">
                <div className="ag3-field">
                  <label className="ag3-label">Paciente</label>
                  <select className="ag3-select" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                    {followupRows.map((row) => {
                      const name = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim();
                      return <option key={row.patient.id} value={row.patient.id}>{name}</option>;
                    })}
                  </select>

                  <label className="ag3-label">Template WhatsApp</label>
                  <textarea className="ag3-textarea" value={ops.whatsappTemplate} onChange={(event) => setOps((prev) => ({ ...prev, whatsappTemplate: event.target.value }))} />

                  <label className="ag3-label">Template correo (Gmail)</label>
                  <textarea className="ag3-textarea" value={ops.emailTemplate} onChange={(event) => setOps((prev) => ({ ...prev, emailTemplate: event.target.value }))} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="ag3-empty" style={{ background: '#fff' }}>
                    <strong>Vista previa WhatsApp</strong>
                    <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.7 }}>
                      {selectedRow ? resolveTemplate(ops.whatsappTemplate, selectedRow) : 'Selecciona un paciente.'}
                    </div>
                  </div>

                  <div className="ag3-empty" style={{ background: '#fff' }}>
                    <strong>Vista previa Correo</strong>
                    <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: 12.5, lineHeight: 1.7 }}>
                      {selectedRow ? resolveTemplate(ops.emailTemplate, selectedRow) : 'Selecciona un paciente.'}
                    </div>
                  </div>

                  {selectedRow ? (
                    <div className="ag3-actions">
                      <button className="ag3-btn-soft" onClick={() => dispatchMessage(selectedRow, 'whatsapp')} disabled={!selectedRow.patient.telefono}>
                        <MessageCircle size={13} /> Enviar WhatsApp
                      </button>
                      <button className="ag3-btn" onClick={() => dispatchMessage(selectedRow, 'email')} disabled={!selectedRow.patient.email}>
                        <Mail size={13} /> Abrir Gmail y enviar
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          )}

          {activeTab === 'seguimiento' && (
            <section className="ag3-card">
              <div className="ag3-head">
                <div>
                  <p className="ag3-kicker">Seguimiento</p>
                  <h2 className="ag3-title" style={{ fontSize: 24 }}>Notas, recordatorios y control de tratamiento</h2>
                </div>
                <span className="ag3-chip"><CheckCircle2 size={13} /> Editable</span>
              </div>
              <div className="ag3-body ag3-grid2">
                <div className="ag3-field">
                  <label className="ag3-label">Paciente</label>
                  <select className="ag3-select" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                    {followupRows.map((row) => {
                      const name = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim();
                      return <option key={row.patient.id} value={row.patient.id}>{name}</option>;
                    })}
                  </select>

                  <label className="ag3-label">Nota interna</label>
                  <textarea
                    className="ag3-textarea"
                    value={selectedRow ? (ops.notes[selectedRow.patient.id] || '') : ''}
                    onChange={(event) => {
                      if (!selectedRow) return;
                      const patientId = selectedRow.patient.id;
                      const value = event.target.value;
                      setOps((prev) => ({ ...prev, notes: { ...prev.notes, [patientId]: value } }));
                    }}
                  />

                  <label className="ag3-label">Recordatorio</label>
                  <input
                    className="ag3-input"
                    type="date"
                    value={selectedRow ? (ops.reminders[selectedRow.patient.id] || '') : ''}
                    onChange={(event) => {
                      if (!selectedRow) return;
                      const patientId = selectedRow.patient.id;
                      const value = event.target.value;
                      setOps((prev) => ({ ...prev, reminders: { ...prev.reminders, [patientId]: value } }));
                    }}
                  />

                  {selectedRow ? (
                    <div className="ag3-actions">
                      <button className="ag3-btn-soft" onClick={() => openHistory(selectedRow.patient.id)}>
                        <ClipboardList size={13} /> Ver historial
                      </button>
                      <button className="ag3-btn-soft" onClick={() => openConsultation(selectedRow.latestKind, selectedRow.patient.id)}>
                        <Stethoscope size={13} /> Nueva consulta
                      </button>
                      <button className="ag3-btn" onClick={() => openPatientRecord(selectedRow.patient.id)}>
                        <Send size={13} /> Abrir ficha
                      </button>
                    </div>
                  ) : null}
                </div>

                <div>
                  <table className="ag3-table">
                    <thead>
                      <tr>
                        <th>Paciente</th>
                        <th>Track</th>
                        <th>Proxima visita</th>
                        <th>Tratamiento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followupRows.slice(0, 40).map((row) => {
                        const name = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim();
                        return (
                          <tr key={`track-${row.patient.id}`}>
                            <td>{name}</td>
                            <td>{row.isOrthoTrack ? 'ortodoncia' : 'general'}</td>
                            <td>{formatDateLabel(row.nextVisitDate)}</td>
                            <td>{row.treatmentSummary}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'centro' && (
            <section className="ag3-grid2">
              <article className="ag3-card">
                <div className="ag3-head">
                  <div>
                    <p className="ag3-kicker">Centro de notificaciones</p>
                    <h2 className="ag3-title" style={{ fontSize: 24 }}>Alertas operativas</h2>
                  </div>
                  <span className="ag3-chip"><BellRing size={13} /> {notificationCenter.length} eventos</span>
                </div>
                <div className="ag3-body">
                  {notificationCenter.length ? (
                    <div className="ag3-notif-list">
                      {notificationCenter.map((item) => {
                        const tone = toneStyle[item.tone];
                        return (
                          <div key={item.id} className="ag3-notif" style={{ background: tone.bg, borderColor: tone.border, color: tone.fg }}>
                            <div className="ag3-notif-title">{item.title}</div>
                            <div className="ag3-notif-copy">{item.body}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ag3-empty">Sin alertas por ahora.</div>
                  )}
                </div>
              </article>

              <article className="ag3-card">
                <div className="ag3-head">
                  <div>
                    <p className="ag3-kicker">Inventario</p>
                    <h2 className="ag3-title" style={{ fontSize: 24 }}>Insumos en estado critico</h2>
                  </div>
                  <span className="ag3-chip"><Boxes size={13} /> {inventoryAlerts.length} alertas</span>
                </div>
                <div className="ag3-body">
                  {inventoryAlerts.length ? (
                    <table className="ag3-table">
                      <thead>
                        <tr>
                          <th>Insumo</th>
                          <th>Stock</th>
                          <th>Minimo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryAlerts.slice(0, 20).map((alert) => (
                          <tr key={alert.id}>
                            <td>{alert.name}</td>
                            <td>{alert.stock}</td>
                            <td>{alert.min}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="ag3-empty">No hay alertas de inventario o tabla no configurada.</div>
                  )}
                </div>
              </article>

              <article className="ag3-card" style={{ gridColumn: '1 / -1' }}>
                <div className="ag3-head">
                  <div>
                    <p className="ag3-kicker">Log de despacho</p>
                    <h2 className="ag3-title" style={{ fontSize: 24 }}>Control de envio por paciente</h2>
                  </div>
                  <span className="ag3-chip"><ShieldAlert size={13} /> Regla: cita cerrada no se reabre</span>
                </div>
                <div className="ag3-body">
                  {followupRows.length ? (
                    <table className="ag3-table">
                      <thead>
                        <tr>
                          <th>Paciente</th>
                          <th>Proxima visita</th>
                          <th>Canal</th>
                          <th>Estado</th>
                          <th>Codigo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {followupRows.slice(0, 80).map((row) => {
                          const name = `${row.patient.nombre || ''} ${row.patient.apellidos || ''}`.trim();
                          const sent = wasSent(row);
                          return (
                            <tr key={`log-${row.patient.id}`}>
                              <td>{name}</td>
                              <td>{formatDateLabel(row.nextVisitDate)}</td>
                              <td>
                                <select
                                  className="ag3-select"
                                  style={{ minWidth: 130, padding: '6px 8px', fontSize: 12 }}
                                  value={row.preferredChannel}
                                  onChange={(event) => {
                                    const nextChannel = event.target.value as DispatchChannel;
                                    setOps((prev) => ({
                                      ...prev,
                                      channelByPatient: {
                                        ...prev.channelByPatient,
                                        [row.patient.id]: nextChannel,
                                      },
                                    }));
                                  }}
                                >
                                  <option value="whatsapp">whatsapp</option>
                                  <option value="email">email</option>
                                </select>
                              </td>
                              <td>{sent ? 'enviado' : 'pendiente'}</td>
                              <td>{getConsultationCode(row)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="ag3-empty">No hay registros para el log.</div>
                  )}
                </div>
              </article>
            </section>
          )}
        </div>
      </div>

      <HistorialClinicoViewer
        isOpen={Boolean(viewerPatient)}
        onClose={() => setViewerPatient(null)}
        patientName={viewerPatient ? `${viewerPatient.nombre} ${viewerPatient.apellidos || ''}`.trim() : ''}
        consultations={viewerConsultations as any[]}
      />
    </>
  );
};
