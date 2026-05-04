import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PatientProvider, usePatient } from './core/context/PatientContext';
import { Sidebar } from './shared/components/Sidebar';
import { PatientRadar } from './features/patients/pages/PatientRadar';
import { PatientDashboard } from './features/patients/pages/PatientDashboard';
import { GeneralConsultation } from './features/consultation/pages/GeneralConsultation';
import { OrthoConsultation } from './features/consultation/pages/OrthoConsultation';
import {
  Users, Calendar, Package, Settings,
  Stethoscope, TrendingUp, ArrowRight, Activity,
  DollarSign, ShieldCheck, Clock,
} from 'lucide-react';
import { NewPatientWizard } from './features/patients/pages/NewPatientWizard';
import { useState, useEffect } from 'react';
import { supabase } from './shared/lib/supabase';

/* Updated styles and layout for DashboardHome */
<style>{`
  .db { 
    padding: 28px 32px; 
    min-height: 100vh; 
    background: #f4f7f9; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
  }

  .fcard { 
    border-radius: 24px; 
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.1); 
    backdrop-filter: blur(20px); 
    background: rgba(255, 255, 255, 0.7); 
    transition: transform 0.3s ease, box-shadow 0.3s ease; 
  }

  .fcard:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 30px 60px rgba(0, 0, 0, 0.2); 
  }

  .icon-3d { 
    width: 50px; 
    height: 50px; 
    background: linear-gradient(145deg, #93c5fd, #60a5fa); 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 -2px 4px rgba(255, 255, 255, 0.5); 
  }

  .pastel-box { 
    background: #e0f2fe; 
    border-radius: 16px; 
    padding: 20px; 
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); 
    margin-top: 20px; 
  }

  .appointment-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 12px;
    padding: 12px 16px;
    margin-bottom: 10px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  .appointment-row:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  .appointment-time {
    font-size: 14px;
    font-weight: bold;
    color: #1d4ed8;
  }

  .appointment-details {
    display: flex;
    flex-direction: column;
  }

  .appointment-name {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
  }

  .appointment-type {
    font-size: 12px;
    color: #64748b;
  }
`}</style>

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   SPARK-LINE (tiny SVG chart â€” no deps)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* ── Sparkline ── */
const Sparkline = ({ data, color, id }: { data: number[]; color: string; id: string }) => {
  const W = 100, H = 36;
  const mx = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / mx) * (H - 4) - 2}`).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ── Ring (donut progress) ── */
const Ring = ({ pct, color, size = 62 }: { pct: number; color: string; size?: number }) => {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f2" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" />
    </svg>
  );
};

/* ── Dashboard Home ── */
const DashboardHome = () => {
  const { setCurrentView } = usePatient();
  const [stats, setStats] = useState({ patients: 0, consultasHoy: 0, consultasSemana: 0 });
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { count: pc } = await supabase.from('pacientes').select('*', { count: 'exact', head: true });
        setStats(s => ({ ...s, patients: pc || 0 }));
      } catch {}
    })();
  }, []);

  const hr = time.getHours();
  const greeting = hr < 12 ? 'Buenos dias' : hr < 18 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr = time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const dayPct = Math.round((hr * 60 + time.getMinutes()) / 1440 * 100);

  const spPac = [4, 6, 5, 9, 7, 11, Math.max(stats.patients || 5, 1)];
  const spHoy = [1, 2, 1, 3, 2, 4,  Math.max(stats.consultasHoy || 2, 1)];
  const spSem = [5, 7, 6, 10, 8, 12, Math.max(stats.consultasSemana || 6, 1)];

  const upcoming = [
    { name: 'Maria Lopez',    time: '09:00', type: 'Limpieza',      color: '#1ba1d8' },
    { name: 'Carlos Ruiz',    time: '10:30', type: 'Ortodoncia',    color: '#8b5cf6' },
    { name: 'Ana Rodriguez',  time: '12:00', type: 'Ext. Molar',    color: '#f59e0b' },
    { name: 'Luis Gomez',     time: '14:30', type: 'Revision',      color: '#10b981' },
    { name: 'Sofia Martinez', time: '16:00', type: 'Blanqueamiento', color: '#ec4899' },
  ];

  return (
    <>
      <div className="db">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="db-layout">

            {/* HERO — glassmorphism + 3D icon */}
            <div className="fcard fcard-glass ga-hero db-u0" style={{ padding: '28px 36px' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg,#60a5fa,#818cf8,#ec4899,#f59e0b)', borderRadius: '24px 24px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#64748b', margin: '0 0 8px', textTransform: 'capitalize' }}>{dateStr}</p>
                  <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.05em', margin: '0 0 8px', lineHeight: 1 }}>{greeting}, Doctor</h1>
                  <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.8 }}>Panel clinico de control &mdash; Pacientes, consultas e inventario.</p>
                </div>
                <div className="icon-3d">
                  <Users size={24} color="#ffffff" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Appointments Section */}
            <div className="pastel-box">
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Próximas Citas</h2>
              {upcoming.map((appt, index) => (
                <div key={index} className="appointment-row">
                  <div className="appointment-details">
                    <span className="appointment-name">{appt.name}</span>
                    <span className="appointment-type">{appt.type}</span>
                  </div>
                  <span className="appointment-time">{appt.time}</span>
                </div>
              ))}
            </div>

            {/* KPI 1 — Total Pacientes — solid gradient blue */}
            <div className="fcard fcard-gradient ga-kpi1 db-u1" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="icon-3d">
                  <Users size={20} color="#ffffff" strokeWidth={2.2} />
                </div>
                <Sparkline data={spPac} color="rgba(255,255,255,0.8)" id="pac" />
              </div>
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 38, fontWeight: 900, color: '#ffffff', letterSpacing: '-0.05em', lineHeight: 1 }}>{stats.patients}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>Total Pacientes</div>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'rgba(255,255,255,0.22)', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#ffffff' }}>
                  <TrendingUp size={10} color="#ffffff" /> Registros activos
                </div>
              </div>
            </div>

            {/* KPI 2 — Consultas Hoy — glassmorphism */}
            <div className="fcard fcard-glass ga-kpi2 db-u2" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={20} color="#10b981" strokeWidth={2.2} />
                </div>
                <Sparkline data={spHoy} color="#10b981" id="hoy" />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.05em', lineHeight: 1 }}>{stats.consultasHoy}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>Consultas Hoy</div>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f0fdf4', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                  <Activity size={10} color="#15803d" /> En tiempo real
                </div>
              </div>
            </div>

            {/* KPI 3 — Esta Semana — glassmorphism */}
            <div className="fcard fcard-glass ga-kpi3 db-u3" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#8b5cf6" strokeWidth={2.2} />
                </div>
                <Sparkline data={spSem} color="#8b5cf6" id="sem" />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.05em', lineHeight: 1 }}>{stats.consultasSemana}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 5 }}>Esta Semana</div>
                <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: '#f5f3ff', borderRadius: 99, fontSize: 11, fontWeight: 700, color: '#7c3aed' }}>
                  <TrendingUp size={10} color="#7c3aed" /> vs sem. ant.
                </div>
              </div>
            </div>

            {/* KPI 4 — Rendimiento / Reloj — glassmorphism */}
            <div className="fcard fcard-glass ga-kpi4 db-u4" style={{ padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Ring pct={dayPct} color="#1ba1d8" size={62} />
              <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em' }}>{timeStr}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#b8bcc8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>PROGRESO DEL DIA</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1ba1d8' }}>{dayPct}%</div>
            </div>

            {/* CHART — Actividad Clinica (3 cols) */}
            <div className="fcard fcard-white ga-chart db-u5" style={{ padding: '28px 30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div>
                  <p className="slbl">Resumen Clinico</p>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: '-0.03em' }}>Actividad del Periodo</h2>
                </div>
                <div style={{ padding: '6px 14px', background: 'linear-gradient(135deg,#e0f5fe,#f0f9ff)', border: '1px solid #bae6fd', borderRadius: 10, fontSize: 11, fontWeight: 700, color: '#0284c7' }}>
                  ESTE MES
                </div>
              </div>

              {/* 3 micro-stat boxes with #f0f9ff background */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 26 }}>
                {[
                  { lbl: 'Total Pacientes', val: stats.patients,        icon: <Users      size={15} color="#1ba1d8" />, accent: '#1ba1d8' },
                  { lbl: 'Consultas Hoy',   val: stats.consultasHoy,    icon: <Activity   size={15} color="#10b981" />, accent: '#10b981' },
                  { lbl: 'Esta Semana',     val: stats.consultasSemana, icon: <TrendingUp size={15} color="#8b5cf6" />, accent: '#8b5cf6' },
                ].map(m => (
                  <div key={m.lbl} className="mbox" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      {m.icon}
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{m.lbl}</span>
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: m.accent, letterSpacing: '-0.04em', lineHeight: 1 }}>{m.val}</div>
                  </div>
                ))}
              </div>

              {/* Bar chart breakdown */}
              <p className="slbl">Desglose de actividad</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Consultas Hoy', val: stats.consultasHoy,                     max: 20,  color: '#1ba1d8' },
                  { label: 'Esta Semana',   val: stats.consultasSemana,                   max: 50,  color: '#8b5cf6' },
                  { label: 'Pacientes',     val: stats.patients,                          max: 100, color: '#10b981' },
                  { label: 'Meta del Mes',  val: Math.min(stats.patients * 2, 100),       max: 100, color: '#f59e0b' },
                ].map(b => (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b', width: 96, flexShrink: 0 }}>{b.label}</span>
                    <div className="btrack">
                      <div className="bfill" style={{ width: `${Math.max(Math.round((b.val / b.max) * 100), 2)}%`, background: b.color }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#1e293b', width: 28, textAlign: 'right', flexShrink: 0 }}>{b.val}</span>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
                {[['#1ba1d8','Consultas'],['#8b5cf6','Semana'],['#10b981','Pacientes'],['#f59e0b','Meta']].map(([c, l]) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ASIDE — Perfil + Proximas Citas (1 col) */}
            <div className="fcard fcard-white ga-aside db-u6" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>

              {/* Profile accent block */}
              <div style={{ borderRadius: 18, background: 'linear-gradient(135deg,#e0f5fe,#f0f9ff)', padding: '16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 50, height: 50, borderRadius: 15, background: 'linear-gradient(135deg,#1ba1d8,#0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, color: '#fff', flexShrink: 0, animation: 'aGlow 3s infinite' }}>
                  Dr
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>Dr. Administrador</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>Dentista General</div>
                  <div style={{ marginTop: 5, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: '#fff', borderRadius: 7, border: '1px solid #bae6fd' }}>
                    <ShieldCheck size={10} color="#1ba1d8" />
                    <span style={{ fontSize: 9, fontWeight: 800, color: '#1ba1d8', letterSpacing: '0.05em' }}>VERIFICADO</span>
                  </div>
                </div>
              </div>

              {/* 2x2 micro-metrics */}
              <p className="slbl">Metricas Clinicas</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
                {[
                  { val: stats.patients,        lbl: 'Pacientes',  icon: <Users       size={13} color="#1ba1d8" />, bg: '#e0f2fe' },
                  { val: stats.consultasHoy,    lbl: 'Hoy',        icon: <Activity    size={13} color="#10b981" />, bg: '#f0fdf4' },
                  { val: stats.consultasSemana, lbl: 'Semana',     icon: <TrendingUp  size={13} color="#8b5cf6" />, bg: '#f5f3ff' },
                  { val: '-',                   lbl: 'Inventario', icon: <Package     size={13} color="#f59e0b" />, bg: '#fefce8' },
                ].map(q => (
                  <div key={q.lbl} className="mbox" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: q.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>{q.icon}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#1e293b', letterSpacing: '-0.04em', lineHeight: 1 }}>{q.val}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8' }}>{q.lbl}</div>
                  </div>
                ))}
              </div>

              {/* Upcoming appointments list */}
              <p className="slbl">Proximas Citas</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                {upcoming.map((a, i) => (
                  <div key={i} className="aprow">
                    <div style={{ width: 34, height: 34, borderRadius: 11, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Users size={14} color={a.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>{a.type}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: a.color, flexShrink: 0 }}>{a.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* QUICK ACTIONS — 3 tiles */}
            {[
              { label: 'Pacientes',   desc: 'Buscar y gestionar pacientes.',  icon: <Users    size={20} />, bg: 'linear-gradient(135deg,#e0f5fe,#bae6fd)', color: '#0284c7', view: 'pacientes',  cls: 'ga-act1 db-u7' },
              { label: 'Agenda',      desc: 'Calendario de citas clinicas.',  icon: <Calendar size={20} />, bg: 'linear-gradient(135deg,#f0fdf4,#bbf7d0)', color: '#15803d', view: 'agenda',     cls: 'ga-act2 db-u8' },
              { label: 'Inventario',  desc: 'Control de materiales y stock.', icon: <Package  size={20} />, bg: 'linear-gradient(135deg,#fefce8,#fde68a)', color: '#b45309', view: 'inventario', cls: 'ga-act3 db-u9' },
            ].map(a => (
              <div
                key={a.label}
                className={`fcard fcard-white ${a.cls} qabtn`}
                onClick={() => setCurrentView(a.view)}
              >
                <div className="qa-ico" style={{ background: a.bg, color: a.color }}>{a.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 3 }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{a.desc}</div>
                </div>
                <div className="qa-lnk" style={{ color: a.color }}>
                  Ir al modulo <ArrowRight size={12} />
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    </>
  );
};

/* â”€â”€ Module Placeholder â”€â”€ */
const ModulePlaceholder = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
  <div style={{ padding: 44, minHeight: '100vh', background: '#f4f7f9', fontFamily: "'Inter',-apple-system,sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        background: '#fff', border: '1px solid #eef0f2', borderRadius: 24,
        padding: '80px 40px', textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,.03)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: `linear-gradient(135deg,${color}15,${color}25)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color,
        }}>
          <Icon size={30}/>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginBottom: 10, letterSpacing: '-.03em' }}>{title}</h2>
        <p style={{ fontSize: 15, color: '#94a3b8', maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
          Este modulo esta en desarrollo. Estara disponible proximamente.
        </p>
        <div style={{ marginTop: 24, display: 'inline-flex', padding: '8px 18px', background: '#fefce8', borderRadius: 12, border: '1px solid #fde68a' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e', letterSpacing: '.04em' }}>EN DESARROLLO</span>
        </div>
      </div>
    </div>
  </div>
);

const MainLayout = () => {
  const { currentView, selectedPatient } = usePatient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f4f7f9' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main style={{ flex: 1, marginLeft: sidebarCollapsed ? '116px' : '292px', overflow: 'auto', transition: 'margin-left .62s cubic-bezier(0.22,1,0.36,1)' }}>
        {currentView === 'inicio' && <DashboardHome />}

        {currentView === 'pacientes' && (
          <>
            {!selectedPatient && <PatientRadar />}
            {selectedPatient && <PatientDashboard />}
          </>
        )}

        {currentView === 'agenda' && <ModulePlaceholder title="Agenda" icon={Calendar} color="#10b981"/>}
        {currentView === 'inventario' && <ModulePlaceholder title="Inventario" icon={Package} color="#f59e0b"/>}
        {currentView === 'ajustes' && <ModulePlaceholder title="Configuracion" icon={Settings} color="#64748b"/>}
      </main>
    </div>
  );
};

const GeneralConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const location = useLocation();

  return (
    <GeneralConsultation
      onExit={() => window.history.back()}
      onSave={saveConsultation}
      initialData={(location.state as any)?.initialData}
    />
  );
};

const OrthoConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const location = useLocation();

  return (
    <OrthoConsultation
      onExit={() => window.history.back()}
      onSave={saveConsultation}
      initialData={(location.state as any)?.initialData}
    />
  );
};

const NewPatientWrapper = () => {
  return (
    <NewPatientWizard onClose={() => window.history.back()} />
  );
};

function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <Routes>
          <Route path="/*" element={<MainLayout />} />
          <Route path="/consulta/general" element={<GeneralConsultaWrapper />} />
          <Route path="/consulta/ortodoncia" element={<OrthoConsultaWrapper />} />
          <Route path="/paciente/nuevo" element={<NewPatientWrapper />} />
        </Routes>
      </PatientProvider>
    </BrowserRouter>
  );
}

export default App;
