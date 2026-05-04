import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Clock3,
  DollarSign,
  LineChart,
  RefreshCcw,
  Users,
  X,
  FolderOpen,
  Stethoscope,
  ShieldCheck,
} from 'lucide-react';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';

type DashboardPeriod = 'daily' | 'weekly' | 'monthly';
type PanelKind =
  | 'patients'
  | 'consultations'
  | 'finance'
  | 'timeline'
  | 'mix'
  | 'recent'
  | 'operations';

interface RawPatient {
  id: string;
  nombre?: string;
  apellidos?: string;
  cc?: string;
  estado?: string;
  creado_en?: string;
  telefono?: string;
  municipio_ciudad?: string;
}

interface RawConsultation {
  id: string;
  paciente_id?: string;
  tipo_consulta?: string;
  created_at?: string;
  detalles_clinicos?: Record<string, unknown>;
}

interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  newPatientsMonth: number;
  consultationsToday: number;
  consultationsWeek: number;
  consultationsMonth: number;
  generalConsultations: number;
  orthoConsultations: number;
  billedMonth: number;
  paidMonth: number;
  attendedPatientsMonth: number;
}

interface SeriesPoint {
  key: string;
  label: string;
  value: number;
}

interface FloatingPanel {
  id: string;
  kind: PanelKind;
  title: string;
  rows: Array<{ label: string; value: string }>;
}

const toDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (date: Date) => {
  const base = new Date(date);
  base.setHours(0, 0, 0, 0);
  return base;
};

const startOfWeek = (date: Date) => {
  const base = startOfDay(date);
  const weekday = base.getDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  base.setDate(base.getDate() - offset);
  return base;
};

const startOfMonth = (date: Date) => {
  const base = startOfDay(date);
  base.setDate(1);
  return base;
};

const asMoney = (value: number) =>
  `$${Math.round(value || 0).toLocaleString('es-CO')}`;

const toNumber = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};

const extractBilledValue = (consultation: RawConsultation) => {
  const details = consultation.detalles_clinicos || {};
  const workflow = (details.workflow_summary as Record<string, unknown>) || {};

  const directCandidates = [
    workflow.total_facturado,
    workflow.total_tratamiento,
    workflow.valor_total,
    details.valor,
    details.valor_total,
    details.valor_consulta,
  ];

  const direct = directCandidates.map(toNumber).find((candidate) => candidate > 0);
  if (direct) return direct;

  const plan = Array.isArray(details.plan_tratamiento)
    ? details.plan_tratamiento
    : [];

  const procedural = plan
    .map((item: any) => toNumber(item?.valor ?? item?.costo ?? item?.precio))
    .reduce((sum: number, value: number) => sum + value, 0);

  return procedural;
};

const extractPaidValue = (consultation: RawConsultation) => {
  const details = consultation.detalles_clinicos || {};
  const workflow = (details.workflow_summary as Record<string, unknown>) || {};
  const candidates = [
    workflow.valor_pagado,
    workflow.total_pagado,
    details.valor_pagado,
    details.pago_total,
  ];

  return candidates.map(toNumber).find((candidate) => candidate > 0) || 0;
};

const buildDailySeries = (consultations: RawConsultation[], now: Date): SeriesPoint[] => {
  const from = startOfDay(now);
  from.setDate(from.getDate() - 13);

  const buckets = new Map<string, number>();
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    const label = date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
    buckets.set(key, 0);
    buckets.set(`${key}:label`, 0);
    buckets.set(`${key}:labelText`, Number.NaN);
    // We cannot store string in Map<number>; labels are handled below.
  }

  const labelMap = new Map<string, string>();
  for (let i = 0; i < 14; i += 1) {
    const date = new Date(from);
    date.setDate(from.getDate() + i);
    const key = date.toISOString().slice(0, 10);
    labelMap.set(key, date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }));
  }

  consultations.forEach((consultation) => {
    const parsed = toDate(consultation.created_at);
    if (!parsed) return;
    const key = startOfDay(parsed).toISOString().slice(0, 10);
    if (!buckets.has(key)) return;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  });

  return [...labelMap.keys()].map((key) => ({
    key,
    label: labelMap.get(key) || key,
    value: buckets.get(key) || 0,
  }));
};

const buildWeeklySeries = (consultations: RawConsultation[], now: Date): SeriesPoint[] => {
  const from = startOfWeek(now);
  from.setDate(from.getDate() - 9 * 7);

  const keys: string[] = [];
  const counts = new Map<string, number>();

  for (let i = 0; i < 10; i += 1) {
    const weekStart = new Date(from);
    weekStart.setDate(from.getDate() + i * 7);
    const key = weekStart.toISOString().slice(0, 10);
    keys.push(key);
    counts.set(key, 0);
  }

  consultations.forEach((consultation) => {
    const parsed = toDate(consultation.created_at);
    if (!parsed) return;
    const bucket = startOfWeek(parsed).toISOString().slice(0, 10);
    if (!counts.has(bucket)) return;
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  });

  return keys.map((key, index) => ({
    key,
    label: `S${index + 1}`,
    value: counts.get(key) || 0,
  }));
};

const buildMonthlySeries = (consultations: RawConsultation[], now: Date): SeriesPoint[] => {
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  first.setMonth(first.getMonth() - 11);

  const keys: string[] = [];
  const labels = new Map<string, string>();
  const counts = new Map<string, number>();

  for (let i = 0; i < 12; i += 1) {
    const monthDate = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
    keys.push(key);
    labels.set(key, monthDate.toLocaleDateString('es-CO', { month: 'short' }).replace('.', ''));
    counts.set(key, 0);
  }

  consultations.forEach((consultation) => {
    const parsed = toDate(consultation.created_at);
    if (!parsed) return;
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    if (!counts.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return keys.map((key) => ({
    key,
    label: labels.get(key) || key,
    value: counts.get(key) || 0,
  }));
};

const buildPanel = (kind: PanelKind, stats: DashboardStats): FloatingPanel => {
  if (kind === 'patients') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Pacientes - detalle rapido',
      rows: [
        { label: 'Total pacientes', value: String(stats.totalPatients) },
        { label: 'Pacientes activos', value: String(stats.activePatients) },
        { label: 'Nuevos este mes', value: String(stats.newPatientsMonth) },
      ],
    };
  }

  if (kind === 'consultations') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Consultas - resumen operativo',
      rows: [
        { label: 'Consultas hoy', value: String(stats.consultationsToday) },
        { label: 'Consultas semana', value: String(stats.consultationsWeek) },
        { label: 'Consultas mes', value: String(stats.consultationsMonth) },
      ],
    };
  }

  if (kind === 'finance') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Finanzas del mes',
      rows: [
        { label: 'Facturado', value: asMoney(stats.billedMonth) },
        { label: 'Pagado', value: asMoney(stats.paidMonth) },
        { label: 'Pendiente', value: asMoney(Math.max(stats.billedMonth - stats.paidMonth, 0)) },
      ],
    };
  }

  if (kind === 'timeline') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Cadencia de atencion',
      rows: [
        { label: 'Hoy', value: `${stats.consultationsToday} consultas` },
        { label: 'Semana', value: `${stats.consultationsWeek} consultas` },
        { label: 'Mes', value: `${stats.consultationsMonth} consultas` },
      ],
    };
  }

  if (kind === 'mix') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Distribucion clinica',
      rows: [
        { label: 'General', value: String(stats.generalConsultations) },
        { label: 'Ortodoncia', value: String(stats.orthoConsultations) },
        {
          label: 'Pacientes atendidos mes',
          value: String(stats.attendedPatientsMonth),
        },
      ],
    };
  }

  if (kind === 'operations') {
    return {
      id: `${kind}-${Date.now()}`,
      kind,
      title: 'Operacion del sistema',
      rows: [
        { label: 'Estado', value: 'Sincronizado' },
        { label: 'Fuente', value: 'Supabase en vivo' },
        { label: 'Corte', value: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) },
      ],
    };
  }

  return {
    id: `${kind}-${Date.now()}`,
    kind,
    title: 'Actividad reciente',
    rows: [
      { label: 'Ultima verificacion', value: new Date().toLocaleString('es-CO') },
      { label: 'Panel', value: 'Dashboard principal' },
      { label: 'Modo', value: 'Tiempo real' },
    ],
  };
};

export const DashboardHomePro = () => {
  const { setCurrentView } = usePatient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>('weekly');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [patients, setPatients] = useState<RawPatient[]>([]);
  const [consultations, setConsultations] = useState<RawConsultation[]>([]);
  const [panels, setPanels] = useState<FloatingPanel[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const patientsPromise = supabase
        .from('pacientes')
        .select('id, nombre, apellidos, cc, estado, creado_en, telefono, municipio_ciudad');

      const consultationsPromise = supabase
        .from('consultas_odontologicas')
        .select('id, paciente_id, tipo_consulta, created_at, detalles_clinicos');

      const [{ data: patientRows, error: patientError }, { data: consultationRows, error: consultationError }] =
        await Promise.all([patientsPromise, consultationsPromise]);

      if (patientError) throw patientError;
      if (consultationError) throw consultationError;

      setPatients((patientRows || []) as RawPatient[]);
      setConsultations((consultationRows || []) as RawConsultation[]);
      setLastRefresh(new Date());
    } catch (loadError: any) {
      console.error('[DashboardHomePro] Load error:', loadError);
      setError(loadError?.message || 'No se pudo cargar el dashboard en este momento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo<DashboardStats>(() => {
    const now = new Date();
    const today = startOfDay(now);
    const week = startOfWeek(now);
    const month = startOfMonth(now);

    const patientCreatedDates = patients
      .map((patient) => toDate(patient.creado_en))
      .filter((date): date is Date => Boolean(date));

    const totalPatients = patients.length;
    const activePatients = patients.filter((patient) => String(patient.estado || '').toUpperCase() === 'ACTIVO').length;
    const newPatientsMonth = patientCreatedDates.filter((date) => date >= month).length;

    const validConsultations = consultations.filter((consultation) => toDate(consultation.created_at));
    const consultationsToday = validConsultations.filter((consultation) => (toDate(consultation.created_at) as Date) >= today).length;
    const consultationsWeek = validConsultations.filter((consultation) => (toDate(consultation.created_at) as Date) >= week).length;
    const monthlyConsultations = validConsultations.filter((consultation) => (toDate(consultation.created_at) as Date) >= month);
    const consultationsMonth = monthlyConsultations.length;

    const generalConsultations = validConsultations.filter((consultation) => consultation.tipo_consulta === 'GENERAL').length;
    const orthoConsultations = validConsultations.filter((consultation) => consultation.tipo_consulta === 'ORTODONCIA').length;

    const billedMonth = monthlyConsultations.reduce((sum, consultation) => sum + extractBilledValue(consultation), 0);
    const paidMonth = monthlyConsultations.reduce((sum, consultation) => sum + extractPaidValue(consultation), 0);

    const attendedPatientsMonth = new Set(
      monthlyConsultations
        .map((consultation) => consultation.paciente_id)
        .filter(Boolean)
    ).size;

    return {
      totalPatients,
      activePatients,
      newPatientsMonth,
      consultationsToday,
      consultationsWeek,
      consultationsMonth,
      generalConsultations,
      orthoConsultations,
      billedMonth,
      paidMonth,
      attendedPatientsMonth,
    };
  }, [patients, consultations]);

  const chartSeries = useMemo(() => {
    const now = new Date();
    if (period === 'daily') return buildDailySeries(consultations, now);
    if (period === 'monthly') return buildMonthlySeries(consultations, now);
    return buildWeeklySeries(consultations, now);
  }, [consultations, period]);

  const recentConsultations = useMemo(() => {
    const patientNameById = new Map(
      patients.map((patient) => [
        patient.id,
        `${patient.nombre || 'Paciente'} ${patient.apellidos || ''}`.trim(),
      ])
    );

    return [...consultations]
      .sort((a, b) => {
        const aDate = toDate(a.created_at)?.getTime() || 0;
        const bDate = toDate(b.created_at)?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, 8)
      .map((consultation) => {
        const date = toDate(consultation.created_at);
        return {
          id: consultation.id,
          patientName: patientNameById.get(consultation.paciente_id || '') || 'Paciente sin nombre',
          type: consultation.tipo_consulta || 'GENERAL',
          dateLabel: date
            ? date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
            : 'Sin fecha',
        };
      });
  }, [consultations, patients]);

  const openPanel = (kind: PanelKind) => {
    setPanels((current) => {
      if (current.some((panel) => panel.kind === kind)) return current;
      return [...current, buildPanel(kind, stats)];
    });
  };

  const closePanel = (panelId: string) => {
    setPanels((current) => current.filter((panel) => panel.id !== panelId));
  };

  const clearPanels = () => setPanels([]);

  const maxChartValue = Math.max(...chartSeries.map((point) => point.value), 1);
  const paidRate = stats.billedMonth > 0
    ? Math.round((stats.paidMonth / stats.billedMonth) * 100)
    : 0;

  const css = `
    .dh, .dh * { box-sizing: border-box; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    .dh { min-height: 100vh; background: #eef3f8; padding: 24px 16px 40px; }

    .dh-shell { max-width: 1260px; margin: 0 auto; display: grid; gap: 16px; }
    .dh-card {
      border-radius: 18px;
      border: 1px solid #d6dee8;
      background: linear-gradient(180deg, #fbfdff 0%, #f5f8fc 100%);
      box-shadow: 0 14px 30px rgba(15, 23, 42, .08), 0 3px 9px rgba(15, 23, 42, .04);
    }

    .dh-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .dh-metric-btn {
      width: 100%;
      border: 1px solid #dbe3ed;
      background: #ffffff;
      border-radius: 14px;
      padding: 12px;
      display: grid;
      gap: 6px;
      cursor: pointer;
      text-align: left;
      transition: background .18s ease, border-color .18s ease;
    }

    .dh-metric-btn:hover {
      background: #f1f5f9;
      border-color: #c9d5e3;
    }

    .dh-chart-wrap {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 14px;
    }

    .dh-bars {
      display: flex;
      align-items: end;
      gap: 8px;
      height: 220px;
      padding: 16px 8px 8px;
      border-radius: 14px;
      border: 1px solid #dde5ef;
      background: #ffffff;
    }

    .dh-bar-col { flex: 1; min-width: 0; display: grid; gap: 8px; justify-items: center; }
    .dh-bar {
      width: 100%;
      min-height: 4px;
      border-radius: 10px 10px 4px 4px;
      background: linear-gradient(180deg, #64748b 0%, #94a3b8 100%);
    }

    .dh-tab-row { display: inline-flex; gap: 8px; background: #edf2f7; border-radius: 12px; padding: 4px; }
    .dh-tab {
      border: none;
      padding: 7px 10px;
      border-radius: 9px;
      background: transparent;
      color: #475569;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .dh-tab.active {
      background: #ffffff;
      color: #1e293b;
      box-shadow: 0 3px 8px rgba(15, 23, 42, .09);
    }

    .dh-recent-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      align-items: center;
      padding: 9px 10px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .dh-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .dh-action-btn {
      width: 100%;
      text-align: left;
      border: 1px solid #d9e3ee;
      border-radius: 14px;
      background: #ffffff;
      padding: 13px;
      cursor: pointer;
    }

    .dh-float-stack {
      position: fixed;
      right: 18px;
      top: 92px;
      display: grid;
      gap: 10px;
      z-index: 1400;
      max-width: 330px;
    }

    .dh-float {
      border-radius: 14px;
      border: 1px solid #d3dde8;
      background: rgba(255, 255, 255, .98);
      box-shadow: 0 14px 26px rgba(15, 23, 42, .14);
      backdrop-filter: blur(10px);
      overflow: hidden;
    }

    @media (max-width: 1160px) {
      .dh-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .dh-chart-wrap { grid-template-columns: 1fr; }
      .dh-actions { grid-template-columns: 1fr; }
      .dh-float-stack { max-width: 90vw; right: 8px; top: 80px; }
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="dh">
        <div className="dh-shell">
          <div className="dh-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: '#64748b' }}>
                  Dashboard principal
                </p>
                <h1 style={{ margin: '6px 0 0', fontSize: 30, lineHeight: 1.05, letterSpacing: '-.03em', color: '#0f172a' }}>
                  Panel clinico integral en tiempo real
                </h1>
                <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>
                  Resumen sincronizado con pacientes y consultas reales.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => void loadData()}
                  style={{ border: '1px solid #d5deea', borderRadius: 10, padding: '8px 11px', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 700, fontSize: 12 }}
                >
                  <RefreshCcw size={14} />
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => openPanel('operations')}
                  style={{ border: '1px solid #d5deea', borderRadius: 10, padding: '8px 11px', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 700, fontSize: 12 }}
                >
                  <ShieldCheck size={14} />
                  Estado
                </button>
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'inline-flex', gap: 7, alignItems: 'center', padding: '6px 10px', borderRadius: 10, border: '1px solid #dbe5f0', background: '#f8fbff', color: '#475569', fontSize: 12, fontWeight: 700 }}>
              <Clock3 size={13} />
              {lastRefresh ? `Ultima sincronizacion: ${lastRefresh.toLocaleString('es-CO')}` : 'Sincronizando datos...'}
            </div>
          </div>

          {error ? (
            <div className="dh-card" style={{ padding: 16, borderColor: '#fecaca', background: '#fff7f7' }}>
              <p style={{ margin: 0, fontWeight: 700, color: '#b91c1c' }}>Error de datos</p>
              <p style={{ margin: '6px 0 0', color: '#b91c1c', fontSize: 13 }}>{error}</p>
            </div>
          ) : null}

          <div className="dh-metrics">
            {[
              {
                label: 'Total pacientes',
                value: stats.totalPatients,
                icon: <Users size={17} color="#334155" />,
                kind: 'patients' as PanelKind,
              },
              {
                label: 'Consultas hoy',
                value: stats.consultationsToday,
                icon: <Activity size={17} color="#334155" />,
                kind: 'consultations' as PanelKind,
              },
              {
                label: 'Consultas semana',
                value: stats.consultationsWeek,
                icon: <Calendar size={17} color="#334155" />,
                kind: 'timeline' as PanelKind,
              },
              {
                label: 'Consultas mes',
                value: stats.consultationsMonth,
                icon: <LineChart size={17} color="#334155" />,
                kind: 'timeline' as PanelKind,
              },
              {
                label: 'General',
                value: stats.generalConsultations,
                icon: <Stethoscope size={17} color="#334155" />,
                kind: 'mix' as PanelKind,
              },
              {
                label: 'Ortodoncia',
                value: stats.orthoConsultations,
                icon: <Stethoscope size={17} color="#334155" />,
                kind: 'mix' as PanelKind,
              },
              {
                label: 'Facturado mes',
                value: asMoney(stats.billedMonth),
                icon: <DollarSign size={17} color="#334155" />,
                kind: 'finance' as PanelKind,
              },
              {
                label: 'Pagado mes',
                value: asMoney(stats.paidMonth),
                icon: <DollarSign size={17} color="#334155" />,
                kind: 'finance' as PanelKind,
              },
            ].map((item) => (
              <button
                type="button"
                key={item.label}
                className="dh-metric-btn"
                onClick={() => openPanel(item.kind)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    {item.label}
                  </span>
                  {item.icon}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', letterSpacing: '-.03em', lineHeight: 1 }}>
                  {item.value}
                </div>
              </button>
            ))}
          </div>

          <div className="dh-chart-wrap">
            <div className="dh-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                    Graficas reales
                  </p>
                  <h3 style={{ margin: '4px 0 0', fontSize: 19, color: '#0f172a', letterSpacing: '-.02em' }}>
                    Tendencia diaria, semanal y mensual
                  </h3>
                </div>

                <div className="dh-tab-row">
                  <button className={`dh-tab ${period === 'daily' ? 'active' : ''}`} onClick={() => setPeriod('daily')}>
                    Diario
                  </button>
                  <button className={`dh-tab ${period === 'weekly' ? 'active' : ''}`} onClick={() => setPeriod('weekly')}>
                    Semanal
                  </button>
                  <button className={`dh-tab ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>
                    Mensual
                  </button>
                </div>
              </div>

              <div className="dh-bars" style={{ marginTop: 12 }}>
                {chartSeries.map((point) => {
                  const pct = Math.max(Math.round((point.value / maxChartValue) * 100), point.value > 0 ? 6 : 2);
                  return (
                    <div className="dh-bar-col" key={point.key}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#334155' }}>{point.value}</div>
                      <div className="dh-bar" style={{ height: `${pct}%` }} />
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>{point.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dh-card" style={{ padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                Actividad reciente
              </p>
              <h3 style={{ margin: '4px 0 12px', fontSize: 18, color: '#0f172a', letterSpacing: '-.02em' }}>
                Ultimas consultas registradas
              </h3>

              <div style={{ display: 'grid', gap: 8 }}>
                {recentConsultations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="dh-recent-row"
                    onClick={() => openPanel('recent')}
                    style={{ cursor: 'pointer', border: '1px solid #e2e8f0', background: '#ffffff' }}
                  >
                    <span style={{ fontSize: 12, color: '#334155', fontWeight: 700, textAlign: 'left' }}>{item.patientName}</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{item.type}</span>
                    <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{item.dateLabel}</span>
                  </button>
                ))}

                {!recentConsultations.length && !loading ? (
                  <div style={{ fontSize: 12, color: '#64748b', border: '1px dashed #d7dfe8', borderRadius: 10, padding: 12 }}>
                    No hay consultas registradas aun.
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 14, borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'grid', gap: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#64748b', fontWeight: 700 }}>Cobro del mes</span>
                  <span style={{ color: '#0f172a', fontWeight: 800 }}>{paidRate}%</span>
                </div>
                <div style={{ height: 8, background: '#edf2f7', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.max(paidRate, 2)}%`, background: 'linear-gradient(90deg,#64748b,#94a3b8)' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="dh-actions">
            <button className="dh-action-btn" onClick={() => setCurrentView('pacientes')}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: '#e8eff7', color: '#334155' }}>
                <Users size={18} />
              </div>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Ir a pacientes</div>
              <div style={{ marginTop: 5, fontSize: 12, color: '#64748b' }}>Radar completo, historial y gestion de fichas.</div>
            </button>

            <button className="dh-action-btn" onClick={() => setCurrentView('agenda')}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: '#e8eff7', color: '#334155' }}>
                <Calendar size={18} />
              </div>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Abrir agenda</div>
              <div style={{ marginTop: 5, fontSize: 12, color: '#64748b' }}>Bloques de citas, seguimiento y organizacion diaria.</div>
            </button>

            <button className="dh-action-btn" onClick={() => openPanel('finance')}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 12, background: '#e8eff7', color: '#334155' }}>
                <FolderOpen size={18} />
              </div>
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Micro paneles</div>
              <div style={{ marginTop: 5, fontSize: 12, color: '#64748b' }}>Cada tarjeta abre ventanas flotantes con detalle rapido.</div>
            </button>
          </div>
        </div>

        {panels.length ? (
          <div className="dh-float-stack">
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={clearPanels}
                style={{ border: '1px solid #d3dde8', background: '#ffffff', borderRadius: 10, padding: '6px 10px', fontSize: 11, fontWeight: 800, color: '#475569', cursor: 'pointer' }}
              >
                Cerrar micro ventanas
              </button>
            </div>
            {panels.map((panel) => (
              <div className="dh-float" key={panel.id}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>{panel.title}</span>
                  <button
                    type="button"
                    onClick={() => closePanel(panel.id)}
                    style={{ border: 'none', background: '#eef2f7', width: 22, height: 22, borderRadius: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
                  >
                    <X size={12} />
                  </button>
                </div>

                <div style={{ padding: 12, display: 'grid', gap: 8 }}>
                  {panel.rows.map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, border: '1px solid #e5ebf2', borderRadius: 10, padding: '8px 9px', background: '#f8fbff' }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 800 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
};
