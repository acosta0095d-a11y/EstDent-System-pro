import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PatientProvider, usePatient } from './core/context/PatientContext';
import { Sidebar } from './shared/components/Sidebar';
import { PatientRadar } from './features/patients/pages/PatientRadar';
import { PatientDashboard } from './features/patients/pages/PatientDashboard';
import { AgendaHub } from './features/agenda/pages/AgendaHub';
import { InventoryHub, descontarStockPorConsulta } from './features/inventory/pages/InventoryHub';
import { GeneralConsultation } from './features/consultation/pages/GeneralConsultation';
import { OrthoConsultation } from './features/consultation/pages/OrthoConsultation';
import {
  Users, Calendar, Package, Settings,
  Stethoscope, TrendingUp, ArrowRight, Activity,
  ShieldCheck, Clock, PlusCircle, BarChart2,
} from 'lucide-react';
import { NewPatientWizard } from './features/patients/pages/NewPatientWizard';
import { useState, useEffect } from 'react';
import { supabase } from './shared/lib/supabase';

/* -- Sparkline: tiny inline SVG chart -- */
const Sparkline = ({ data, color, id }: { data: number[]; color: string; id: string }) => {
  const W = 96, H = 34;
  const mx = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / mx) * (H - 4) - 2}`).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* -- Ring: donut progress -- */
const Ring = ({ pct, color, size = 58 }: { pct: number; color: string; size?: number }) => {
  const r = (size - 9) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={7} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round" />
    </svg>
  );
};

/* -- Ico3d: icon chip with layered 3D raised effect -- */
const Ico3d = ({ bg, shadow, size = 46, children }: {
  bg: string; shadow: string; size?: number; children: React.ReactNode;
}) => (
  <div style={{
    width: size, height: size, borderRadius: 14, flexShrink: 0,
    background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: `0 1px 0 rgba(0,0,0,0.09), 0 4px 12px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.45)`,
    position: 'relative', overflow: 'hidden',
  }}>
    {/* glass sheen overlay */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '52%',
      background: 'linear-gradient(180deg,rgba(255,255,255,0.32) 0%,rgba(255,255,255,0) 100%)',
      borderRadius: '14px 14px 0 0', pointerEvents: 'none',
    }} />
    {children}
  </div>
);

const DAY_MS = 24 * 60 * 60 * 1000;

const toDayStart = (value: Date) => {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getMondayStart = (value: Date) => {
  const base = toDayStart(value);
  const mondayIndex = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayIndex);
  return base;
};

const toDayKey = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildSeriesFromDates = (dates: Array<string | null | undefined>, start: Date, size: number) => {
  const series = Array(size).fill(0) as number[];
  const indexByDay = new Map<string, number>();

  for (let i = 0; i < size; i++) {
    const day = new Date(start);
    day.setDate(day.getDate() + i);
    indexByDay.set(toDayKey(day), i);
  }

  dates.forEach((raw) => {
    if (!raw) return;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return;
    const idx = indexByDay.get(toDayKey(toDayStart(parsed)));
    if (idx === undefined) return;
    series[idx] += 1;
  });

  return series;
};

/* ================================================================
   DashboardHome
================================================================ */
const DashboardHome = () => {
  const { setCurrentView } = usePatient();
  const [stats, setStats] = useState({ patients: 0, consultasHoy: 0, consultasSemana: 0, consultasMes: 0, activos: 0 });
  const [recentPats, setRecentPats] = useState<
    { nombre: string; apellidos?: string; telefono?: string; creado_en: string }[]
  >([]);
  const [series, setSeries] = useState({
    recentPatients: Array(7).fill(0) as number[],
    recentConsultas: Array(7).fill(0) as number[],
    weekPatients: Array(7).fill(0) as number[],
    weekConsultas: Array(7).fill(0) as number[],
  });
  const [time, setTime] = useState(new Date());

  /* live clock */
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  /* real data from supabase */
  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const now = new Date();
        const todayStart = toDayStart(now);
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        const weekStart = getMondayStart(now);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const last7Start = new Date(todayStart);
        last7Start.setDate(last7Start.getDate() - 6);

        const seriesStart = new Date(Math.min(weekStart.getTime(), last7Start.getTime()));

        const [
          { count: pc },
          { count: ac },
          { count: hc },
          { count: wc },
          { count: mc },
          { data: rp },
          { data: patientRows },
          { data: consultationRows },
        ] = await Promise.all([
          supabase.from('pacientes').select('*', { count: 'exact', head: true }),
          supabase.from('pacientes').select('*', { count: 'exact', head: true }).eq('estado', 'ACTIVO'),
          supabase.from('consultas_odontologicas').select('*', { count: 'exact', head: true })
            .gte('created_at', todayStart.toISOString())
            .lte('created_at', todayEnd.toISOString()),
          supabase.from('consultas_odontologicas').select('*', { count: 'exact', head: true })
            .gte('created_at', weekStart.toISOString()),
          supabase.from('consultas_odontologicas').select('*', { count: 'exact', head: true })
            .gte('created_at', monthStart.toISOString()),
          supabase.from('pacientes')
            .select('nombre, apellidos, telefono, creado_en')
            .order('creado_en', { ascending: false })
            .limit(6),
          supabase.from('pacientes')
            .select('creado_en')
            .gte('creado_en', seriesStart.toISOString()),
          supabase.from('consultas_odontologicas')
            .select('created_at')
            .gte('created_at', seriesStart.toISOString()),
        ]);

        if (!alive) return;

        const patientDates = (patientRows || []).map((row: any) => row.creado_en);
        const consultationDates = (consultationRows || []).map((row: any) => row.created_at);

        setStats({
          patients: pc || 0,
          consultasHoy: hc || 0,
          consultasSemana: wc || 0,
          consultasMes: mc || 0,
          activos: ac || 0,
        });

        setSeries({
          recentPatients: buildSeriesFromDates(patientDates, last7Start, 7),
          recentConsultas: buildSeriesFromDates(consultationDates, last7Start, 7),
          weekPatients: buildSeriesFromDates(patientDates, weekStart, 7),
          weekConsultas: buildSeriesFromDates(consultationDates, weekStart, 7),
        });

        setRecentPats((rp || []) as { nombre: string; apellidos?: string; telefono?: string; creado_en: string }[]);
      } catch { /* offline – silently skip */ }
    };

    load();

    const timer = window.setInterval(load, 120000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const hr      = time.getHours();
  const greeting = hr < 12 ? 'Buenos dias' : hr < 18 ? 'Buenas tardes' : 'Buenas noches';
  const dateStr  = time.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr  = time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const dayPct   = Math.round((hr * 60 + time.getMinutes()) / 1440 * 100);

  const spPac = series.recentPatients.some(v => v > 0)
    ? series.recentPatients
    : [4, 6, 5, 9, 7, 11, Math.max(stats.patients || 5, 1)];
  const spHoy = series.recentConsultas.some(v => v > 0)
    ? series.recentConsultas
    : [1, 2, 1, 3, 2, 4, Math.max(stats.consultasHoy || 2, 1)];
  const spSem = series.weekConsultas.some(v => v > 0)
    ? series.weekConsultas
    : [5, 7, 6, 10, 8, 12, Math.max(stats.consultasSemana || 6, 1)];

  const PAT_COLORS = ['#1ba1d8', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#0ea5e9'];

  /* ── CSS (scoped inside the component) ── */
  const css = `
    .db, .db * { font-family: 'Inter', -apple-system, sans-serif; box-sizing: border-box; }
    .db { padding: 28px 15px; min-height: 100vh; background: #f4f7f9; position: relative; z-index: 1; }

    @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes fadeIn  { from { opacity:0; transform:scale(0.96);      } to { opacity:1; transform:scale(1);     } }
    @keyframes sGlow   { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5);}  50%{box-shadow:0 0 0 6px rgba(34,197,94,0);} }
    @keyframes drPulse { 0%,100%{box-shadow:0 0 0 0 rgba(27,161,216,.45);} 50%{box-shadow:0 0 0 10px rgba(27,161,216,0);} }

    .db-u0{animation:fadeUp  .55s cubic-bezier(.22,1,.36,1) .00s both;}
    .db-u1{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .08s both;}
    .db-u2{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .14s both;}
    .db-u3{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .20s both;}
    .db-u4{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .26s both;}
    .db-u5{animation:fadeUp  .55s cubic-bezier(.22,1,.36,1) .32s both;}
    .db-u6{animation:fadeUp  .55s cubic-bezier(.22,1,.36,1) .38s both;}
    .db-u7{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .44s both;}
    .db-u8{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .50s both;}
    .db-u9{animation:fadeIn  .50s cubic-bezier(.22,1,.36,1) .56s both;}

    /* shared card base */
    .fcard { border-radius:22px; overflow:hidden; position:relative; transition:transform .28s cubic-bezier(.22,1,.36,1),box-shadow .28s ease; }
    .fcard:hover { transform:translateY(-3px); }

    /* card flavors */
    .fcard-blue  { background:linear-gradient(135deg,#1ba1d8 0%,#38bdf8 100%); box-shadow:0 8px 28px rgba(27,161,216,.28); }
    .fcard-blue:hover { box-shadow:0 18px 40px rgba(27,161,216,.38); }
    .fcard-glass { background:rgba(255,255,255,.62); backdrop-filter:blur(18px) saturate(1.8); -webkit-backdrop-filter:blur(18px) saturate(1.8); border:1px solid rgba(255,255,255,.9); box-shadow:0 8px 32px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.07); }
    .fcard-glass:hover { box-shadow:0 20px 48px rgba(0,0,0,.18),0 4px 12px rgba(0,0,0,.09); }
    .fcard-white { background:#fff; border:1px solid rgba(0,0,0,.05); box-shadow:0 8px 32px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.07); }
    .fcard-white:hover { box-shadow:0 20px 48px rgba(0,0,0,.18),0 4px 12px rgba(0,0,0,.09); }

    /* layout grid */
    .db-grid {
      display:grid;
      grid-template-columns:repeat(4,1fr);
      gap:20px;
      grid-template-areas:
        "hero  hero  hero  hero"
        "kpi1  kpi2  kpi3  kpi4"
        "chart chart chart aside";
    }
    .ga-hero  { grid-area:hero;  }
    .ga-kpi1  { grid-area:kpi1;  }
    .ga-kpi2  { grid-area:kpi2;  }
    .ga-kpi3  { grid-area:kpi3;  }
    .ga-kpi4  { grid-area:kpi4;  }
    .ga-chart { grid-area:chart; }
    .ga-aside { grid-area:aside; }
    .ga-act1  { grid-area:act1;  }
    .ga-act2  { grid-area:act2;  }
    .ga-act3  { grid-area:act3;  }

    /* micro stat box */
    .mbox { border-radius:14px; padding:12px 13px; transition:background .2s,transform .2s; }
    .mbox:hover { transform:translateY(-1px); }

    /* patient row */
    .prow { display:flex; align-items:center; gap:10px; padding:9px 8px; border-radius:12px; transition:background .18s,transform .18s; cursor:pointer; }
    .prow:hover { background:rgba(27,161,216,0.07); transform:translateX(2px); }
    /* pat initial avatar */
    .pat-init { width:34px; height:34px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:900; }

    /* bar track */
    .btrack { flex:1; height:6px; border-radius:99px; background:#f0f4f8; overflow:hidden; }
    .bfill  { height:100%; border-radius:99px; transition:width .7s cubic-bezier(.22,1,.36,1); }

    /* quick action button */
    .qabtn { display:flex; flex-direction:column; gap:10px; padding:22px; cursor:pointer; border:none; text-align:left; width:100%; background:transparent; }
    .qabtn:hover .qa-ico { transform:scale(1.12) rotate(-5deg); }
    .qabtn:hover .qa-lnk { opacity:1; transform:translateX(0); }
    .qa-ico { width:44px; height:44px; border-radius:14px; display:flex; align-items:center; justify-content:center; transition:transform .3s cubic-bezier(.34,1.56,.64,1); }
    .qa-lnk { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; margin-top:auto; opacity:0; transform:translateX(-8px); transition:all .25s ease; }

    /* section label */
    .slbl { font-size:9px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#b0b9c7; margin:0 0 10px; }

    /* strip at card top */
    .strip-rainbow { position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#1ba1d8,#818cf8,#ec4899,#f59e0b); border-radius:22px 22px 0 0; }

    /* blue notch at card top */
    .notch { position:absolute; top:0; left:24px; background:linear-gradient(135deg,#1ba1d8,#38bdf8); border-radius:0 0 10px 10px; padding:4px 12px 5px; display:flex; align-items:center; gap:5px; }

    /* static depth orbs */
    .orb { position:fixed; border-radius:50%; pointer-events:none; z-index:0; }
  `;

  return (
    <>
      <style>{css}</style>

      {/* depth-giving background orbs – static, no motion */}
      <div className="orb" style={{ width:520, height:520, top:-120, right:-60,
        background:'radial-gradient(circle,rgba(56,189,248,.07),rgba(56,189,248,0))' }} />
      <div className="orb" style={{ width:340, height:340, bottom:40, left:-80,
        background:'radial-gradient(circle,rgba(139,92,246,.06),rgba(139,92,246,0))' }} />

      <div className="db">
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="db-grid">

            {/* ═══ HERO ═══ glassmorphism + rainbow strip */}
            <div className="fcard fcard-glass ga-hero db-u0" style={{ padding: '30px 36px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>

                {/* left: greeting */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:20 }}>
                  <Ico3d bg="linear-gradient(135deg,#1ba1d8,#0ea5e9)" shadow="rgba(27,161,216,0.35)" size={56}>
                    <Stethoscope size={24} color="#fff" strokeWidth={2} />
                  </Ico3d>
                  <div>
                    <p style={{ fontSize:11, fontWeight:600, color:'#64748b', margin:'0 0 6px', textTransform:'capitalize' }}>{dateStr}</p>
                    <h1 style={{ fontSize:28, fontWeight:900, color:'#1e293b', letterSpacing:'-0.04em', margin:'0 0 6px', lineHeight:1 }}>
                      {greeting}, Doctor
                    </h1>
                    <p style={{ fontSize:13, color:'#64748b', margin:0 }}>
                      Panel clinico &mdash; {stats.patients} pacientes registrados
                    </p>
                  </div>
                </div>

                {/* right: status badge + clock */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 14px', background:'#f0fdf4', border:'1px solid #dcfce7', borderRadius:12 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', animation:'sGlow 2s infinite' }} />
                    <span style={{ fontSize:11, fontWeight:700, color:'#16a34a' }}>Sistema operativo</span>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:26, fontWeight:900, color:'#1e293b', letterSpacing:'-0.04em', lineHeight:1 }}>{timeStr}</div>
                    <div style={{ fontSize:9, fontWeight:700, color:'#b8bcc8', textTransform:'uppercase', letterSpacing:'0.12em', marginTop:3 }}>HORA LOCAL</div>
                  </div>
                </div>
              </div>

              {/* bottom pastel quick-metric chips */}
              <div style={{ display:'flex', gap:10, marginTop:22, flexWrap:'wrap' }}>
                {([
                  { icon: <Users    size={12} color="#1ba1d8" />, val: stats.patients,        lbl: 'pacientes',     bg: '#e0f5fe', tc: '#0c6b8e' },
                  { icon: <Activity size={12} color="#10b981" />, val: stats.consultasHoy,    lbl: 'consultas hoy', bg: '#f0fdf4', tc: '#065f46' },
                  { icon: <Calendar size={12} color="#8b5cf6" />, val: stats.consultasSemana, lbl: 'esta semana',   bg: '#f5f3ff', tc: '#5b21b6' },
                  { icon: <BarChart2 size={12} color="#f59e0b" />, val: stats.activos,         lbl: 'activos',       bg: '#fefce8', tc: '#92400e' },
                ] as const).map(c => (
                  <div key={c.lbl} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'6px 12px', background:c.bg, borderRadius:10 }}>
                    {c.icon}
                    <span style={{ fontSize:13, fontWeight:800, color:c.tc }}>{c.val}</span>
                    <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8' }}>{c.lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ KPI 1 – Total Pacientes – solid blue gradient ═══ */}
            <div className="fcard fcard-blue ga-kpi1 db-u1" style={{ padding: '24px' }}>
              {/* white notch accent */}
              <div style={{ position:'absolute', top:0, right:20, background:'rgba(255,255,255,0.22)', borderRadius:'0 0 8px 8px', padding:'3px 10px' }}>
                <span style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.85)', letterSpacing:'.12em' }}>TOTAL</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <Ico3d bg="rgba(255,255,255,0.25)" shadow="rgba(0,0,0,0.1)" size={44}>
                  <Users size={20} color="#fff" strokeWidth={2.2} />
                </Ico3d>
                <Sparkline data={spPac} color="rgba(255,255,255,0.85)" id="pac" />
              </div>
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:40, fontWeight:900, color:'#fff', letterSpacing:'-0.05em', lineHeight:1 }}>{stats.patients}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.72)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:5 }}>Total Pacientes</div>
                <div style={{ marginTop:12, display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', background:'rgba(255,255,255,0.2)', borderRadius:99, fontSize:11, fontWeight:700, color:'#fff' }}>
                  <TrendingUp size={10} color="#fff" /> Registros activos
                </div>
              </div>
            </div>

            {/* ═══ KPI 2 – Consultas Hoy ═══ */}
            <div className="fcard fcard-glass ga-kpi2 db-u2" style={{ padding: '24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <Ico3d bg="linear-gradient(135deg,#d1fae5,#a7f3d0)" shadow="rgba(16,185,129,0.2)" size={44}>
                  <Activity size={20} color="#059669" strokeWidth={2.2} />
                </Ico3d>
                <Sparkline data={spHoy} color="#10b981" id="hoy" />
              </div>
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:38, fontWeight:900, color:'#1e293b', letterSpacing:'-0.05em', lineHeight:1 }}>{stats.consultasHoy}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:5 }}>Consultas Hoy</div>
                <div style={{ marginTop:14, background:'#f0fdf4', borderRadius:10, padding:'8px 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#065f46' }}>En tiempo real</span>
                </div>
              </div>
            </div>

            {/* ═══ KPI 3 – Esta Semana ═══ */}
            <div className="fcard fcard-glass ga-kpi3 db-u3" style={{ padding: '24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <Ico3d bg="linear-gradient(135deg,#ede9fe,#ddd6fe)" shadow="rgba(139,92,246,0.2)" size={44}>
                  <Calendar size={20} color="#7c3aed" strokeWidth={2.2} />
                </Ico3d>
                <Sparkline data={spSem} color="#8b5cf6" id="sem" />
              </div>
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:38, fontWeight:900, color:'#1e293b', letterSpacing:'-0.05em', lineHeight:1 }}>{stats.consultasSemana}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:5 }}>Esta Semana</div>
                <div style={{ marginTop:14, background:'#f5f3ff', borderRadius:10, padding:'8px 10px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#5b21b6' }}>Rendimiento semanal</span>
                </div>
              </div>
            </div>

            {/* ═══ KPI 4 – Reloj / Progreso del dia ═══ */}
            <div className="fcard fcard-white ga-kpi4 db-u4" style={{ padding:'22px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
              <div style={{ position:'relative', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                <Ring pct={dayPct} color="#1ba1d8" size={62} />
                <div style={{ position:'absolute' }}>
                  <Clock size={14} color="#1ba1d8" />
                </div>
              </div>
              <div style={{ fontSize:22, fontWeight:900, color:'#1e293b', letterSpacing:'-0.04em', lineHeight:1 }}>{timeStr}</div>
              <div style={{ fontSize:9, fontWeight:700, color:'#b8bcc8', textTransform:'uppercase', letterSpacing:'0.12em' }}>Progreso del dia</div>
              <div style={{ background:'linear-gradient(135deg,#e0f5fe,#bae6fd)', borderRadius:99, padding:'4px 12px', marginTop:2 }}>
                <span style={{ fontSize:12, fontWeight:800, color:'#0284c7' }}>{dayPct}%</span>
              </div>
            </div>

            {/* ═══ CHART – Graficas de Actividad ═══ */}
            <div className="fcard fcard-white ga-chart db-u5" style={{ padding: '24px 28px' }}>

              {/* header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <p className="slbl">Estadisticas clinicas</p>
                  <h2 style={{ fontSize:19, fontWeight:900, color:'#1e293b', margin:0, letterSpacing:'-0.03em' }}>Actividad del Periodo</h2>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { val:stats.patients,        lbl:'Pacientes', color:'#1ba1d8', bg:'#e0f5fe' },
                    { val:stats.consultasHoy,    lbl:'Hoy',       color:'#8b5cf6', bg:'#f5f3ff' },
                    { val:stats.consultasSemana, lbl:'Semana',    color:'#10b981', bg:'#f0fdf4' },
                  ].map(s => (
                    <div key={s.lbl} style={{ padding:'6px 12px', background:s.bg, borderRadius:10, textAlign:'center', minWidth:56 }}>
                      <div style={{ fontSize:16, fontWeight:900, color:s.color, lineHeight:1 }}>{s.val}</div>
                      <div style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.08em', marginTop:3 }}>{s.lbl}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SVG area chart */}
              {(() => {
                const VW = 500, VH = 128;
                const pad = { t:8, r:10, b:24, l:28 };
                const cW = VW - pad.l - pad.r;
                const cH = VH - pad.t - pad.b;
                const bot = pad.t + cH;
                const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                const lbls = ['L','M','X','J','V','S','D'];
                const pd = series.weekPatients.some(v => v > 0) ? series.weekPatients : [0,0,0,0,0,0,0];
                const cd = series.weekConsultas.some(v => v > 0) ? series.weekConsultas : [0,0,0,0,0,0,0];
                const mx = Math.max(...pd, ...cd, 1);
                const ox = (i:number) => pad.l + (i / (pd.length - 1)) * cW;
                const oy = (v:number) => pad.t + cH - (v / mx) * cH;
                const pPts = pd.map((v,i) => `${ox(i)},${oy(v)}`).join(' ');
                const cPts = cd.map((v,i) => `${ox(i)},${oy(v)}`).join(' ');
                return (
                  <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:'128px', display:'block', marginBottom:14 }}>
                    <defs>
                      <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1ba1d8" stopOpacity="0.22"/>
                        <stop offset="100%" stopColor="#1ba1d8" stopOpacity="0.02"/>
                      </linearGradient>
                      <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18"/>
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02"/>
                      </linearGradient>
                    </defs>
                    {[0.25,0.5,0.75,1].map((f,i) => (
                      <line key={i} x1={pad.l} y1={oy(mx*f)} x2={VW-pad.r} y2={oy(mx*f)} stroke="#f1f5f9" strokeWidth="1"/>
                    ))}
                    <polygon points={`${ox(0)},${bot} ${pPts} ${ox(6)},${bot}`} fill="url(#cg1)"/>
                    <polygon points={`${ox(0)},${bot} ${cPts} ${ox(6)},${bot}`} fill="url(#cg2)"/>
                    <polyline points={pPts} fill="none" stroke="#1ba1d8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <polyline points={cPts} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    {pd.map((v,i) => <circle key={`p${i}`} cx={ox(i)} cy={oy(v)} r={i===todayIdx?5:3} fill={i===todayIdx?'#1ba1d8':'#fff'} stroke="#1ba1d8" strokeWidth="2"/>)}
                    {cd.map((v,i) => <circle key={`c${i}`} cx={ox(i)} cy={oy(v)} r={i===todayIdx?5:3} fill={i===todayIdx?'#8b5cf6':'#fff'} stroke="#8b5cf6" strokeWidth="2"/>)}
                    {lbls.map((d,i) => (
                      <text key={`l${i}`} x={ox(i)} y={VH-2} textAnchor="middle"
                        fontSize="9" fontWeight={i===todayIdx?800:500}
                        fill={i===todayIdx?'#1ba1d8':'#b0bac7'}
                        fontFamily="Inter,-apple-system,sans-serif">{d}</text>
                    ))}
                  </svg>
                );
              })()}

              {/* legend */}
              <div style={{ display:'flex', gap:16, marginBottom:16 }}>
                {[{ lbl:'Pacientes', color:'#1ba1d8' },{ lbl:'Consultas', color:'#8b5cf6' }].map(l => (
                  <div key={l.lbl} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:22, height:3, borderRadius:2, background:l.color }}/>
                    <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>{l.lbl}</span>
                  </div>
                ))}
              </div>

              {/* progress bars */}
              <p className="slbl">Desglose</p>
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {[
                  { label:'Consultas Hoy',     val:stats.consultasHoy,    max:Math.max(...series.recentConsultas, 1),                color:'#1ba1d8' },
                  { label:'Esta Semana',       val:stats.consultasSemana, max:Math.max(stats.consultasSemana, stats.consultasHoy, 1), color:'#8b5cf6' },
                  { label:'Este Mes',          val:stats.consultasMes,    max:Math.max(stats.consultasMes, stats.consultasSemana, 1), color:'#f59e0b' },
                  { label:'Total Pacientes',   val:stats.patients,        max:Math.max(stats.patients, 1),                            color:'#10b981' },
                  { label:'Pacientes Activos', val:stats.activos,         max:Math.max(stats.patients, 1),                            color:'#14b8a6' },
                ].map(b => (
                  <div key={b.label} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#64748b', width:120, flexShrink:0 }}>{b.label}</span>
                    <div className="btrack">
                      <div className="bfill" style={{ width:`${Math.max(Math.round((b.val/b.max)*100),2)}%`, background:b.color }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:800, color:'#1e293b', width:28, textAlign:'right', flexShrink:0 }}>{b.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ ASIDE – Acciones Rapidas ═══ */}
            <div className="ga-aside db-u6" style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {([
                { label:'Pacientes',  desc:'Buscar y gestionar registros',  icon:(c:string)=><Users    size={22} color={c}/>, grad:'linear-gradient(135deg,#1ba1d8,#38bdf8)', sh:'rgba(27,161,216,0.30)', view:'pacientes'  },
                { label:'Agenda',     desc:'Calendario de citas clinicas',  icon:(c:string)=><Calendar size={22} color={c}/>, grad:'linear-gradient(135deg,#10b981,#34d399)', sh:'rgba(16,185,129,0.26)', view:'agenda'     },
                { label:'Inventario', desc:'Control de materiales y stock', icon:(c:string)=><Package  size={22} color={c}/>, grad:'linear-gradient(135deg,#f59e0b,#fbbf24)', sh:'rgba(245,158,11,0.26)',  view:'inventario' },
              ] as const).map(a => (
                <div
                  key={a.label}
                  className="fcard fcard-white"
                  style={{ padding:'20px 22px', cursor:'pointer', display:'flex', alignItems:'center', gap:16 }}
                  onClick={() => setCurrentView(a.view)}
                >
                  <div style={{
                    width:50, height:50, borderRadius:16, flexShrink:0,
                    background:a.grad, display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:`0 5px 16px ${a.sh}`, position:'relative', overflow:'hidden',
                  }}>
                    <div style={{ position:'absolute', top:0, left:0, right:0, height:'50%',
                      background:'linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0))',
                      borderRadius:'16px 16px 0 0', pointerEvents:'none' }}/>
                    {a.icon('#fff')}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'#1e293b', lineHeight:1 }}>{a.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:4, lineHeight:1.5 }}>{a.desc}</div>
                  </div>
                  <div style={{ width:28, height:28, borderRadius:9, background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ArrowRight size={13} color="#94a3b8"/>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

/* ── Module Placeholder ── */
const ModulePlaceholder = ({ title, icon: Icon, color }: { title: string; icon: any; color: string }) => (
  <div style={{ padding:'44px 15px', minHeight:'100vh', background:'#f4f7f9', fontFamily:"'Inter',-apple-system,sans-serif" }}>
    <div style={{ maxWidth:1200, margin:'0 auto' }}>
      <div style={{
        background:'#fff', border:'1px solid rgba(0,0,0,.05)',
        borderRadius:22, padding:'80px 40px', textAlign:'center',
        boxShadow:'0 8px 32px rgba(0,0,0,.13),0 2px 8px rgba(0,0,0,.07)',
      }}>
        <div style={{
          width:64, height:64, borderRadius:20,
          background:`linear-gradient(135deg,${color}15,${color}25)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 24px', color,
        }}>
          <Icon size={30}/>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#1e293b', marginBottom:10, letterSpacing:'-.03em' }}>{title}</h2>
        <p style={{ fontSize:14, color:'#94a3b8', maxWidth:340, margin:'0 auto', lineHeight:1.7 }}>
          Este modulo esta en desarrollo. Estara disponible proximamente.
        </p>
        <div style={{ marginTop:22, display:'inline-flex', padding:'7px 16px', background:'#fefce8', borderRadius:10, border:'1px solid #fde68a' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#92400e', letterSpacing:'.05em' }}>EN DESARROLLO</span>
        </div>
      </div>
    </div>
  </div>
);

/* ── MainLayout ── */
const MainLayout = () => {
  const { currentView, selectedPatient } = usePatient();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const contentOffset = sidebarCollapsed ? 16 : 292;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f4f7f9' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(prev => !prev)} />
      <main style={{ flex:1, marginLeft: contentOffset, overflow:'auto', transition:'margin-left .28s cubic-bezier(0.2,0.8,0.2,1)' }}>
        {currentView === 'inicio'    && <DashboardHome />}
        {currentView === 'pacientes' && !selectedPatient && <PatientRadar />}
        {currentView === 'pacientes' && selectedPatient  && <PatientDashboard />}
        {currentView === 'agenda'    && <AgendaHub />}
        {currentView === 'inventario'&& <InventoryHub />}
        {currentView === 'ajustes'   && <ModulePlaceholder title="Configuracion" icon={Settings} color="#64748b"/>}
      </main>
    </div>
  );
};

/* ── Route wrappers ── */
const GeneralConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const loc = useLocation();
  const incomingInitialData = (loc.state as any)?.initialData;
  const shouldBlockReopen = Boolean(
    incomingInitialData &&
    (incomingInitialData.id || incomingInitialData.consultationId || incomingInitialData.sourceConsultationId)
  );

  const handleSaveGeneral = async (data: Parameters<typeof saveConsultation>[0]) => {
    const result = await saveConsultation(data);
    // Descontar stock automáticamente por consulta general
    await descontarStockPorConsulta('general', incomingInitialData?.pacienteId || incomingInitialData?.patientId, (result as any)?.id);
    return result;
  };

  return (
    <GeneralConsultation
      onExit={() => window.history.back()}
      onSave={handleSaveGeneral}
      initialData={shouldBlockReopen ? undefined : incomingInitialData}
    />
  );
};

const OrthoConsultaWrapper = () => {
  const { saveConsultation } = usePatient();
  const loc = useLocation();
  const incomingInitialData = (loc.state as any)?.initialData;
  const shouldBlockReopen = Boolean(
    incomingInitialData &&
    (incomingInitialData.id || incomingInitialData.consultationId || incomingInitialData.sourceConsultationId)
  );

  const handleSaveOrtho = async (data: Parameters<typeof saveConsultation>[0]) => {
    const result = await saveConsultation(data);
    // Descontar stock automáticamente por consulta de ortodoncia
    await descontarStockPorConsulta('ortodoncia', incomingInitialData?.pacienteId || incomingInitialData?.patientId, (result as any)?.id);
    return result;
  };

  return (
    <OrthoConsultation
      onExit={() => window.history.back()}
      onSave={handleSaveOrtho}
      initialData={shouldBlockReopen ? undefined : incomingInitialData}
    />
  );
};

const NewPatientWrapper = () => <NewPatientWizard onClose={() => window.history.back()} />;

/* ── App ── */
function App() {
  return (
    <BrowserRouter>
      <PatientProvider>
        <Routes>
          <Route path="/*"                   element={<MainLayout />} />
          <Route path="/consulta/general"    element={<GeneralConsultaWrapper />} />
          <Route path="/consulta/ortodoncia" element={<OrthoConsultaWrapper />} />
          <Route path="/paciente/nuevo"      element={<NewPatientWrapper />} />
        </Routes>
      </PatientProvider>
    </BrowserRouter>
  );
}

export default App;
