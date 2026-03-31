import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';
import { NewPatientWizard } from './NewPatientWizard';
import { patientService } from '../services/patientService';
import { formatPatientSerial } from './patientUtils';
import {
  Search, UserPlus, Loader2,
  Users, Grid3x3, List, RefreshCcw,
  UserCheck, AlertTriangle, User, Calendar,
  ChevronUp, ChevronDown, ArrowUpDown,
  Trash2, X,
} from 'lucide-react';

/* ─── tipos sort ────────────────────────────────────────────── */
type SortField = 'nombre' | 'edad' | 'creado_en' | 'cc' | 'telefono' | 'email';
type SortDir   = 'asc' | 'desc';

/* ─── gradientes avatar ─────────────────────────────────────── */
const GRADS = [
  ['#6366f1','#818cf8'] as const, ['#0ea5e9','#38bdf8'] as const,
  ['#10b981','#34d399'] as const, ['#f59e0b','#fbbf24'] as const,
  ['#ef4444','#f87171'] as const, ['#8b5cf6','#a78bfa'] as const,
  ['#0071e3','#60a5fa'] as const, ['#f43f5e','#fb7185'] as const,
] as const;
function grad(s: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return GRADS[Math.abs(h) % GRADS.length];
}
const ini = (n:any,a:any) => {
  try { return ((n?String(n)[0]:'?')+(a?String(a)[0]:'')).toUpperCase(); }
  catch { return 'XX'; }
};
const fmtDate = (d:any) =>
  d ? new Date(d).toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const calculateAge = (birthDate: string | null | undefined): number | null => {
  if (!birthDate) return null;
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = new Date();
  if (parsed > today) return null; // Fecha futura no válida

  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

// ============================================
// MODAL CONFIRMAR ELIMINACIÓN
// ============================================
interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  patientName: string;
  deleting: boolean;
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, patientName, deleting }: DeleteConfirmModalProps) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.18)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: 400,
        maxWidth: '100%',
        border: '1px solid rgba(0,0,0,.08)',
        boxShadow: '0 24px 60px rgba(0,0,0,.12)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '22px 28px',
          borderBottom: '1px solid rgba(0,0,0,.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1d1d1f', marginBottom: 3 }}>
              Confirmar Eliminación
            </h3>
            <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>
              Esta acción no se puede deshacer
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f5f5f7',
              border: 'none',
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '50%',
              color: '#86868b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f7'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 28 }}>
          <div style={{
            textAlign: 'center',
            marginBottom: 28
          }}>
            <div style={{
              width: 68,
              height: 68,
              margin: '0 auto 18px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 18px rgba(239,68,68,.18)'
            }}>
              <AlertTriangle size={34} />
            </div>
            <h4 style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#1d1d1f',
              marginBottom: 10
            }}>
              ¿Eliminar a {patientName}?
            </h4>
            <p style={{
              fontSize: 13,
              color: '#86868b',
              marginBottom: 0,
              lineHeight: 1.6
            }}>
              ¿Estás seguro de eliminar a <strong>{patientName}</strong>? Esta acción borrará permanentemente su historial y consultas.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '13px',
                background: '#f5f5f7',
                border: '1px solid rgba(0,0,0,.09)',
                borderRadius: 11,
                color: '#1d1d1f',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: "'Geist', system-ui, sans-serif",
                transition: 'background .15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f7'}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              style={{
                flex: 1,
                padding: '13px',
                border: 'none',
                borderRadius: 11,
                background: '#EF4444',
                color: '#fff',
                fontWeight: 700,
                fontSize: 13,
                cursor: deleting ? 'not-allowed' : 'pointer',
                fontFamily: "'Geist', system-ui, sans-serif",
                transition: 'opacity .15s, transform .15s',
                opacity: deleting ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!deleting) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!deleting) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickEditModal = ({ isOpen, patient, onClose, onSaved }: {
  isOpen: boolean;
  patient: any;
  onClose: () => void;
  onSaved: (updated: any) => void;
}) => {
  const [formData, setFormData] = useState({
    cc: patient?.cc || '',
    nombre: patient?.nombre || '',
    apellidos: patient?.apellidos || '',
    fecha_nacimiento: patient?.fecha_nacimiento || '',
    telefono: patient?.telefono || '',
    email: patient?.email || '',
    municipio_ciudad: patient?.municipio_ciudad || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!patient) return;
    setFormData({
      cc: patient.cc || '',
      nombre: patient.nombre || '',
      apellidos: patient.apellidos || '',
      fecha_nacimiento: patient.fecha_nacimiento || '',
      telefono: patient.telefono || '',
      email: patient.email || '',
      municipio_ciudad: patient.municipio_ciudad || ''
    });
  }, [patient]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!patient?.id) return;
    setSaving(true);
    try {
      const updated = await patientService.updatePatient(patient.id, formData);
      onSaved({ ...patient, ...formData });
      onClose();
    } catch (error) {
      console.error('Error quick editing patient:', error);
      alert('No fue posible actualizar el paciente');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,.18)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: 20
    }}>
      <div style={{
        width: 480,
        maxWidth: '100%',
        borderRadius: 20,
        background: '#fff',
        border: '1px solid rgba(0,0,0,.08)',
        boxShadow: '0 32px 70px rgba(0,0,0,.16)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1d1d1f' }}>Editar Datos Rápidos</h3>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>Actualiza el paciente sin salir de la tabla.</p>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Documento</label>
            <input className="input-pro" value={formData.cc} onChange={e => setFormData({ ...formData, cc: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Nombre</label>
              <input className="input-pro" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Apellidos</label>
              <input className="input-pro" value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Teléfono</label>
              <input className="input-pro" value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Email</label>
              <input className="input-pro" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Municipio/Ciudad</label>
            <input className="input-pro" value={formData.municipio_ciudad} onChange={e => setFormData({ ...formData, municipio_ciudad: e.target.value })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 999, border: '1px solid rgba(0,0,0,.09)', background: '#f8fafc', color: '#1d1d1f', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" className="btn-blue" disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ContextMenu = ({ x, y, patient, onClose, onView, onEdit, onDelete, menuRef }: {
  x: number; y: number; patient: any; onClose: () => void; onView: () => void; onEdit: () => void; onDelete: () => void; menuRef: any;
}) => {
  const top = Math.min(y, window.innerHeight - 170);
  const left = Math.min(x, window.innerWidth - 220);
  return (
    <div ref={menuRef} style={{
      position: 'fixed', top, left,
      background: '#fff', border: '1px solid rgba(15,23,42,.12)', borderRadius: 18,
      boxShadow: '0 22px 48px rgba(15,23,42,.16)', width: 220,
      zIndex: 1200, padding: '8px 0'
    }}>
      <button onClick={() => { onView(); onClose(); }} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#111827', cursor: 'pointer' }}>Ver Perfil / Dashboard</button>
      <button onClick={() => { onEdit(); onClose(); }} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#111827', cursor: 'pointer' }}>Editar Datos Rápidos</button>
      <div style={{ height: 1, background: 'rgba(15,23,42,.06)', margin: '6px 0' }} />
      <button onClick={() => { onDelete(); onClose(); }} style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', padding: '12px 16px', fontSize: 13, color: '#ef4444', cursor: 'pointer' }}>Eliminar Paciente</button>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════
   PATIENT RADAR
══════════════════════════════════════════════════════════════ */
export const PatientRadar = () => {
  const { setSelectedPatient } = usePatient();

  // ── estado original ──
  const [patients,        setPatients]        = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [errorSync,       setErrorSync]       = useState<string|null>(null);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [filtroCiudad,    setFiltroCiudad]    = useState('todas');
  const [filtroEstado,    setFiltroEstado]    = useState('todos');
  const [viewMode,        setViewMode]        = useState<'table'|'folders'>('table');
  const [hoveredCard,     setHoveredCard]     = useState<string|null>(null);
  const [actionMenuOpen,  setActionMenuOpen]  = useState<string|null>(null);
  const [isWizardOpen,    setIsWizardOpen]    = useState(false);
  const [editModalOpen,   setEditModalOpen]   = useState(false);
  const [editingPatient,  setEditingPatient]  = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [savingEdit,      setSavingEdit]      = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [contextMenuState, setContextMenuState] = useState<{ patient:any; x:number; y:number } | null>(null);
  const [quickEditPatient, setQuickEditPatient] = useState<any>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── estado UI nuevo ──
  const [sortField,    setSortField]    = useState<SortField>('nombre');
  const [sortDir,      setSortDir]      = useState<SortDir>('asc');
  const [openFolder,   setOpenFolder]   = useState<string|null>(null);
  const [viewChanging, setViewChanging] = useState(false);
  const spinRef = useRef<SVGSVGElement>(null);

  /* ─── BD BLINDADA ─────────────────────────────────────────── */
  const testConnection = useCallback(async () => {
    try {
      console.log('Probando conexión básica con Supabase...');
      const { data, error } = await supabase.from('pacientes').select('count').limit(1);
      console.log('Test de conexión:', { data, error });
    } catch (err) {
      console.error('Error en test de conexión:', err);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true); setErrorSync(null);
      console.log('Intentando cargar pacientes desde Supabase...');

      const { data, error } = await supabase.from('pacientes')
        .select('id, cc, nombre, apellidos, fecha_nacimiento, edad, creado_en, estado, telefono, email')
        .order('creado_en', { ascending: false });

      console.log('Respuesta de Supabase:', { data: data?.length || 0, error });
      if (data && data.length > 0) {
        const sample = data[0];
        const missing = ['telefono', 'email'].filter((k) => !(k in sample));
        if (missing.length > 0) {
          console.warn('Columnas faltantes en pacientes:', missing.join(', '));
          setErrorSync(`Algunos campos no fueron devueltos por la consulta: ${missing.join(', ')}.`);
        } else {
          setErrorSync(null);
        }
      }

      if (error) {
        console.error('Error completo de Supabase:', error);
        throw error;
      }

      const normalized = (data||[]).map((p:any) => {
        const dbAge = (p?.edad !== undefined && p?.edad !== null) ? Number(p.edad) : NaN;
        const localAge = calculateAge(p?.fecha_nacimiento);
        const safeAge = Number.isFinite(dbAge) && dbAge >= 0 ? dbAge : (localAge ?? 0);

        return {
          ...p,
          edad: safeAge,
          telefono: p?.telefono && String(p.telefono).trim() ? String(p.telefono).trim() : '',
          email: p?.email && String(p.email).trim() ? String(p.email).trim().toLowerCase() : ''
        };
      });

      normalized.forEach((p:any)=> {
        console.log('paciente ->', {
          id: p.id,
          nombre: `${p.nombre} ${p.apellidos}`,
          fecha_nacimiento: p.fecha_nacimiento,
          edad: p.edad,
          telefono: p.telefono,
          email: p.email,
          raw: p
        });
      });

      setPatients(normalized.sort((a,b)=>
        String(a?.nombre||'').localeCompare(String(b?.nombre||''))
      ));
      console.log('Pacientes cargados exitosamente:', normalized.length);
    } catch (err:any) {
      console.error('Error en fetchPatients:', err);
      const msg  = err?.message  ? String(err.message) : 'Error al conectar.';
      const det  = err?.details  ? ` | ${JSON.stringify(err.details)}` : '';
      const hint = err?.hint     ? ` | ${err.hint}` : '';
      const st   = err?.status   ? ` | Status:${err.status}` : '';
      setErrorSync(
        err?.status===401||/row-level security/.test(msg.toLowerCase())
          ? `Error 401/RLS. ${msg}${det}${hint}${st}`
          : `${msg}${det}${hint}${st}`
      );
    } finally { setLoading(false); }
  }, []);

  useEffect(()=>{ fetchPatients(); },[fetchPatients]);

  useEffect(() => {
    if (!contextMenuState) return;
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenuState(null);
      }
    };
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenuState(null);
    };
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [contextMenuState]);

  useEffect(()=>{
    // Seeding deshabilitado para evitar conflictos con RLS
    // const seed = async ()=>{
    //   if(!import.meta.env.DEV||loading||errorSync||patients.length>0) return;
    //   try {
    //     const sample=[
    //       {cc:'101010',nombre:'Juan',   apellidos:'Pérez', fecha_nacimiento:'1995-10-10',edad:30},
    //     ];
    //     const {data:ins,error:e}=await supabase.from('pacientes').insert(sample).select();
    //     if(e){ setErrorSync(`Seed error: ${e.message}`); return; }
    //     if(ins?.length){ setPatients(ins); setErrorSync(null); }
    //   } catch {}
    // };
    // seed();
  },[]);

  /* ─── filtros + sort ──────────────────────────────────────── */
  const filteredPatients = useMemo(()=>{
    const list = patients.filter(p=>{
      if(!p) return false;
      const full=`${p?.nombre||''} ${p?.apellidos||''}`.toLowerCase();
      const doc=String(p?.cc||'');
      return searchTerm===''||full.includes(searchTerm.toLowerCase())||doc.includes(searchTerm);
    });
    return [...list].sort((a,b)=>{
      if(sortField==='nombre')    { const va=`${a.nombre||''} ${a.apellidos||''}`,vb=`${b.nombre||''} ${b.apellidos||''}`; return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va); }
      if(sortField==='cc')        { const va=String(a.cc||''),vb=String(b.cc||''); return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va); }
      if(sortField==='telefono')  { const va=String(a.telefono||''),vb=String(b.telefono||''); return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va); }
      if(sortField==='email')     { const va=String(a.email||''),vb=String(b.email||''); return sortDir==='asc'?va.localeCompare(vb):vb.localeCompare(va); }
      if(sortField==='edad')      { const va=Number(a.edad||0),vb=Number(b.edad||0); return sortDir==='asc'?va-vb:vb-va; }
      if(sortField==='creado_en') { const va=new Date(a.creado_en||0).getTime(),vb=new Date(b.creado_en||0).getTime(); return sortDir==='asc'?va-vb:vb-va; }
      return 0;
    });
  },[patients,searchTerm,sortField,sortDir]);

  const activeCount = patients.length;

  const handleSort = (f:SortField)=>{
    if(sortField===f) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLTableRowElement>, patient:any) => {
    event.preventDefault();
    event.stopPropagation();
    const x = Math.min(event.clientX, window.innerWidth - 240);
    const y = Math.min(event.clientY, window.innerHeight - 210);
    setContextMenuState({ patient, x, y });
  };

  const handleViewChange = (mode:'table'|'folders')=>{
    if(mode===viewMode) return;
    setViewChanging(true);
    setTimeout(()=>{ setViewMode(mode); setViewChanging(false); },200);
  };

  /* grupos para carpetas */
  const folderGroups = useMemo(()=>{
    const map:Record<string,any[]>={};
    filteredPatients.forEach(p=>{
      const k=String(p?.nombre||'?')[0].toUpperCase();
      if(!map[k]) map[k]=[];
      map[k].push(p);
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b));
  },[filteredPatients]);

  const SortIcon=({field}:{field:SortField})=>{
    if(sortField!==field) return <ArrowUpDown size={11} style={{color:'#c0c0c5',flexShrink:0}}/>;
    return sortDir==='asc'
      ? <ChevronUp   size={11} style={{color:'#0071e3',flexShrink:0}}/>
      : <ChevronDown size={11} style={{color:'#0071e3',flexShrink:0}}/>;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        .pr,  .pr *   { font-family:'Geist',system-ui,sans-serif; box-sizing:border-box; }
        .pr-mono      { font-family:'Geist Mono',monospace; }
        .pr            { background:#f5f5f7; min-height:100vh; padding:28px 32px; }

        /* ── anim ── */
        @keyframes prFadeUp  { from{opacity:0;transform:translateY(-8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes prRowIn   { from{opacity:0;transform:translateX(-5px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes prFolderIn{ from{opacity:0;transform:scale(.88) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes prSpin    { to{transform:rotate(360deg)} }
        @keyframes prSpinOnce{ from{transform:rotate(0)} to{transform:rotate(360deg)} }

        .pr-fade-up  { animation:prFadeUp   .38s cubic-bezier(.4,0,.2,1) both; }
        .pr-spin     { animation:prSpin 1s  linear infinite; }
        .pr-spin-once{ animation:prSpinOnce .5s ease; }

        /* ── botón nuevo ── */
        .pr-btn-new{
          display:flex;align-items:center;gap:7px;
          padding:9px 20px; border:none; border-radius:980px;
          background:#0071e3; color:#fff;
          font-family:'Geist',sans-serif; font-size:13px; font-weight:600;
          cursor:pointer; white-space:nowrap;
          box-shadow:0 2px 10px rgba(0,113,227,.35);
          transition:background .15s,transform .15s,box-shadow .15s;
        }
        .pr-btn-new:hover { background:#0077ed; transform:translateY(-1px); box-shadow:0 4px 18px rgba(0,113,227,.45); }
        .pr-btn-new:active{ transform:scale(.97); }

        /* ── stat ── */
        .pr-stat{
          background:#fff; border:1px solid rgba(0,0,0,.07);
          border-radius:18px; padding:20px 24px;
          display:flex; align-items:center; justify-content:space-between;
          box-shadow:0 1px 4px rgba(0,0,0,.04);
          transition:box-shadow .2s,transform .2s;
        }
        .pr-stat:hover{ box-shadow:0 6px 20px rgba(0,0,0,.09); transform:translateY(-2px); }

        /* ── toolbar ── */
        .pr-toolbar{
          background:#fff; border:1px solid rgba(0,0,0,.08);
          border-radius:14px; padding:10px 14px;
          display:flex; gap:10px; align-items:center;
          box-shadow:0 1px 3px rgba(0,0,0,.04);
        }
        .pr-si{ width:100%; background:#f5f5f7; border:1px solid rgba(0,0,0,.09); border-radius:10px; padding:8px 12px 8px 36px; font-family:'Geist',sans-serif; font-size:13px; color:#1d1d1f; outline:none; transition:all .18s; }
        .pr-si::placeholder{ color:#a1a1a6; }
        .pr-si:focus{ background:#fff; border-color:#0071e3; box-shadow:0 0 0 3px rgba(0,113,227,.12); }

        .pr-toggle-wrap{ display:flex;gap:3px;background:#f5f5f7;border:1px solid rgba(0,0,0,.08);border-radius:10px;padding:3px; }
        .pr-toggle-btn{ padding:6px 9px;border-radius:7px;border:none;background:none;cursor:pointer;color:#86868b;display:flex;align-items:center;transition:all .15s; }
        .pr-toggle-btn:hover{ color:#1d1d1f;background:rgba(0,0,0,.04); }
        .pr-toggle-btn.active{ background:#fff;color:#0071e3;box-shadow:0 1px 4px rgba(0,0,0,.12); }
        .pr-refresh{ padding:7px 8px;border-radius:9px;border:none;background:none;cursor:pointer;color:#86868b;display:flex;align-items:center;transition:color .15s; }
        .pr-refresh:hover{ color:#0071e3; }

        /* ── view container ── */
        .pr-view{ transition:opacity .2s ease,transform .2s ease; }
        .pr-view.exit{ opacity:0;transform:translateY(5px) scale(.99);pointer-events:none; }

        /* ══ TABLA ══ */
        .pr-table-wrap{
          background:#fff; border:1px solid rgba(0,0,0,.08);
          border-radius:16px; overflow:hidden;
          box-shadow:0 2px 14px rgba(0,0,0,.06);
        }
        .pr-table{ width:100%; border-collapse:collapse; }
        .pr-thead{ background:#fafafa; border-bottom:1.5px solid rgba(0,0,0,.07); }
        .pr-th{ font-size:11px;font-weight:600;color:#86868b;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;user-select:none; }
        .pr-th-btn{
          display:flex;align-items:center;gap:5px;
          padding:12px 16px; cursor:pointer; width:100%;
          background:none;border:none;font-family:inherit;
          font-size:11px;font-weight:600;color:inherit;text-transform:uppercase;letter-spacing:.08em;
          transition:color .15s,background .15s;white-space:nowrap;
        }
        .pr-th-btn:hover{ color:#1d1d1f;background:rgba(0,0,0,.03); }
        .pr-th-btn.sorted{ color:#0071e3; }
        .pr-th:first-child .pr-th-btn{ padding-left:20px; }
        .pr-th-btn.no-sort{ cursor:default; }
        .pr-th-btn.no-sort:hover{ color:#86868b;background:none; }

        .pr-tr{
          border-bottom:1px solid rgba(0,0,0,.05);
          cursor:pointer;
          transition:background .1s;
          animation:prRowIn .28s ease both;
        }
        .pr-tr:nth-child(even){ background:#fafafa; }
        .pr-tr:last-child{ border-bottom:none; }
        .pr-tr:hover{ background:#f0f6ff!important; }
        .pr-tr:hover .pr-act{ opacity:1; }
        .pr-td{ padding:11px 16px;font-size:13px;color:#1d1d1f;vertical-align:middle; }
        .pr-td:first-child{ padding-left:20px; }

        .pr-av{ width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;flex-shrink:0;box-shadow:0 2px 6px rgba(0,0,0,.15); }
        .pr-name-cell{ display:flex;align-items:center;gap:11px; }
        .pr-name-txt{ font-weight:600;font-size:13px;color:#1d1d1f; }

        .pr-badge-cc{ display:inline-block;padding:3px 9px;border-radius:6px;background:#f0f6ff;color:#0071e3;font-size:11px;font-weight:600;border:1px solid rgba(0,113,227,.15);letter-spacing:.04em; }
        .pr-badge-age{ display:inline-block;padding:3px 9px;border-radius:6px;background:#f5f5f7;color:#3d3d40;font-size:11px;font-weight:600;border:1px solid rgba(0,0,0,.08); }
        .pr-badge-ok{ display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;background:#f0fdf4;color:#16a34a;font-size:11px;font-weight:600;border:1px solid rgba(22,163,74,.15); }
        .pr-badge-ok::before{ content:'';width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e; }

        .pr-act{ opacity:0;transition:opacity .12s;display:flex;align-items:center;gap:4px; }
        .pr-act-btn{ padding:4px 11px;border-radius:6px;border:1px solid rgba(0,0,0,.1);background:#fff;font-size:11px;font-weight:500;color:#1d1d1f;cursor:pointer;font-family:'Geist',sans-serif;transition:all .12s; }
        .pr-act-btn:hover{ background:#f0f6ff;color:#0071e3;border-color:#0071e3; }

        .pr-rn{ font-size:11px;color:#c0c0c5;font-family:'Geist Mono',monospace;text-align:right;padding-right:8px;user-select:none; }
        .pr-tfoot{ padding:10px 20px;border-top:1px solid rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;background:#fafafa; }

        /* ══ CARPETAS ══ */
        .pr-folders-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
          gap:14px;
          align-items:start;
        }
        .pr-folder-item{ cursor:pointer; }
        .pr-folder-item{ animation:prFolderIn .42s cubic-bezier(.34,1.56,.64,1) both; }

        .pr-folder-card{
          background:#fff; border:1px solid rgba(0,0,0,.08);
          border-radius:18px; padding:20px 18px 16px;
          box-shadow:0 1px 5px rgba(0,0,0,.05);
          transition:all .22s cubic-bezier(.4,0,.2,1);
          position:relative; overflow:hidden;
        }
        .pr-folder-card::after{
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(0,113,227,.04) 0%,transparent 60%);
          opacity:0; transition:opacity .22s;
        }
        .pr-folder-item:hover .pr-folder-card{
          border-color:rgba(0,113,227,.4);
          box-shadow:0 8px 30px rgba(0,113,227,.14);
          transform:translateY(-4px);
        }
        .pr-folder-item:hover .pr-folder-card::after{ opacity:1; }
        .pr-folder-item:hover .pr-folder-svg{ transform:scale(1.07) rotate(-3deg); }

        .pr-folder-svg{
          display:block; margin-bottom:14px;
          transition:transform .22s cubic-bezier(.34,1.56,.64,1);
          filter:drop-shadow(0 4px 10px rgba(0,0,0,.13));
        }
        .pr-folder-name{ font-size:17px;font-weight:700;color:#1d1d1f;letter-spacing:-.01em;margin-bottom:3px; }
        .pr-folder-sub{ font-size:11px;color:#86868b;font-weight:500; }

        /* panel deslizante */
        .pr-panel{
          max-height:0; opacity:0; margin-top:0; overflow:hidden;
          transition:max-height .38s cubic-bezier(.4,0,.2,1),
                      opacity   .28s ease,
                      margin    .3s ease;
        }
        .pr-panel.open{ max-height:800px; opacity:1; margin-top:10px; }
        .pr-panel-inner{
          background:#fff; border:1px solid rgba(0,0,0,.08);
          border-radius:14px; overflow:hidden;
          box-shadow:0 6px 24px rgba(0,0,0,.1);
        }
        .pr-file{
          display:flex;align-items:center;gap:11px;
          padding:11px 16px; border-bottom:1px solid rgba(0,0,0,.05);
          cursor:pointer; transition:background .1s;
        }
        .pr-file:last-child{ border-bottom:none; }
        .pr-file:hover{ background:#f0f6ff; }
        .pr-file:hover .pr-file-arrow{ opacity:1;transform:translateX(0); }
        .pr-file-av{ width:32px;height:32px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.14); }
        .pr-file-name{ font-size:13px;font-weight:600;color:#1d1d1f;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .pr-file-meta{ font-size:11px;color:#86868b;margin-top:1px; }
        .pr-file-arrow{ opacity:0;transform:translateX(-4px);color:#0071e3;transition:all .14s;font-size:16px;line-height:1; }

        /* ── empty ── */
        .pr-empty{ background:#fff;border:1.5px dashed rgba(0,0,0,.1);border-radius:20px;padding:72px 20px;text-align:center; }

        /* ── error ── */
        .pr-err{ background:#fff5f5;border:1px solid rgba(220,38,38,.18);border-radius:14px;padding:14px 18px;display:flex;align-items:flex-start;gap:10px;color:#dc2626; }
      `}</style>

      <div className="pr">
        <div style={{maxWidth:1280,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>

          {/* ══ HEADER ══ */}
          <div className="pr-fade-up" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
            <div>
              <p style={{fontSize:10,fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#0071e3',opacity:.8,marginBottom:5}}>Sistema Clínico</p>
              <h1 style={{fontSize:34,fontWeight:700,color:'#1d1d1f',letterSpacing:'-.025em',lineHeight:1}}>Pacientes</h1>
            </div>
            <button className="pr-btn-new" onClick={()=>setIsWizardOpen(true)}>
              <UserPlus size={15} strokeWidth={2.5}/> Nuevo Paciente
            </button>
          </div>

          {/* ══ ERROR ══ */}
          {errorSync && (
            <div className="pr-err pr-fade-up">
              <AlertTriangle size={16} style={{flexShrink:0,marginTop:1}}/>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:500,lineHeight:1.5,marginBottom:8}}>Error de sincronización: {errorSync}</p>
                <div style={{display:'flex',gap:8}}>
                  <button
                    onClick={testConnection}
                    style={{fontSize:11,padding:'4px 8px',background:'#0071e3',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}
                  >
                    Probar Conexión
                  </button>
                  <button
                    onClick={fetchPatients}
                    style={{fontSize:11,padding:'4px 8px',background:'#16a34a',color:'white',border:'none',borderRadius:6,cursor:'pointer'}}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STATS ══ */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {[
              {label:'Total Pacientes',value:patients.length,
               icon:<Users size={20} strokeWidth={1.8} style={{stroke:'#0071e3'}}/>,bg:'rgba(0,113,227,.08)',delay:'.05s'},
              {label:'Activos',value:activeCount,
               icon:<UserCheck size={20} strokeWidth={1.8} style={{stroke:'#16a34a'}}/>,bg:'rgba(22,163,74,.08)',delay:'.1s'},
            ].map(s=>(
              <div key={s.label} className="pr-stat pr-fade-up" style={{animationDelay:s.delay}}>
                <div>
                  <p style={{fontSize:9,fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#86868b',marginBottom:8}}>{s.label}</p>
                  <p style={{fontSize:40,fontWeight:700,color:'#1d1d1f',lineHeight:1,letterSpacing:'-.02em',fontVariantNumeric:'tabular-nums'}}>{s.value}</p>
                </div>
                <div style={{width:46,height:46,borderRadius:13,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{s.icon}</div>
              </div>
            ))}
          </div>

          {/* ══ TOOLBAR ══ */}
          <div className="pr-toolbar pr-fade-up" style={{animationDelay:'.15s'}}>
            <div style={{flex:1,position:'relative'}}>
              <Search size={14} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',stroke:'#a1a1a6',pointerEvents:'none'}}/>
              <input type="text" placeholder="Buscar por nombre o documento…" className="pr-si" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
            <div className="pr-toggle-wrap">
              <button className={`pr-toggle-btn ${viewMode==='table'  ?'active':''}`} onClick={()=>handleViewChange('table')}   title="Tabla"><List size={15}/></button>
              <button className={`pr-toggle-btn ${viewMode==='folders'?'active':''}`} onClick={()=>handleViewChange('folders')} title="Carpetas"><Grid3x3 size={15}/></button>
            </div>
            <button className="pr-refresh" title="Actualizar" onClick={e=>{
              const svg=e.currentTarget.querySelector('svg');
              svg?.classList.remove('pr-spin-once');
              void (svg as any)?.offsetWidth;
              svg?.classList.add('pr-spin-once');
              fetchPatients();
            }}>
              <RefreshCcw size={15}/>
            </button>
            <span style={{fontSize:11,color:'#a1a1a6',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap'}}>
              {filteredPatients.length} resultado{filteredPatients.length!==1?'s':''}
            </span>
          </div>

          {/* ══ CONTENIDO ══ */}
          {loading ? (
            <div style={{height:240,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
              <Loader2 size={30} className="pr-spin" style={{stroke:'#0071e3'}}/>
              <span style={{fontSize:10,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'#a1a1a6'}}>Cargando…</span>
            </div>

          ) : filteredPatients.length===0&&!errorSync ? (
            <div className="pr-empty pr-fade-up">
              <div style={{width:52,height:52,borderRadius:15,background:'#f5f5f7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                <Users size={24} style={{stroke:'#c0c0c5'}}/>
              </div>
              <p style={{color:'#3d3d40',fontWeight:600,fontSize:15}}>Sin pacientes</p>
              <p style={{color:'#a1a1a6',fontSize:13,marginTop:5}}>Agrega el primero con "Nuevo Paciente"</p>
            </div>

          ) : (
            <div className={`pr-view${viewChanging?' exit':''}`}>

              {/* ───── TABLA ───── */}
              {viewMode==='table'&&(
                <div className="pr-table-wrap pr-fade-up" style={{animationDelay:'.2s'}}>
                  <table className="pr-table">
                    <thead className="pr-thead">
                      <tr>
                        <th className="pr-th" style={{width:44}}><button className="pr-th-btn no-sort" style={{paddingLeft:20,paddingRight:8}}><span className="pr-rn" style={{padding:0}}>#</span></button></th>
                        <th className="pr-th" style={{width:'30%'}}>
                          <button className={`pr-th-btn${sortField==='nombre'?' sorted':''}`} onClick={()=>handleSort('nombre')}>Paciente <SortIcon field="nombre"/></button>
                        </th>
                        <th className="pr-th">
                          <button className={`pr-th-btn${sortField==='cc'?' sorted':''}`} onClick={()=>handleSort('cc')}>Documento <SortIcon field="cc"/></button>
                        </th>
                        <th className="pr-th">
                          <button className={`pr-th-btn${sortField==='telefono'?' sorted':''}`} onClick={()=>handleSort('telefono')}>Teléfono <SortIcon field="telefono"/></button>
                        </th>
                        <th className="pr-th">
                          <button className={`pr-th-btn${sortField==='email'?' sorted':''}`} onClick={()=>handleSort('email')}>Email <SortIcon field="email"/></button>
                        </th>
                        <th className="pr-th">
                          <button className={`pr-th-btn${sortField==='edad'?' sorted':''}`} onClick={()=>handleSort('edad')}>Edad <SortIcon field="edad"/></button>
                        </th>
                        <th className="pr-th">
                          <button className={`pr-th-btn${sortField==='creado_en'?' sorted':''}`} onClick={()=>handleSort('creado_en')}>Registrado <SortIcon field="creado_en"/></button>
                        </th>
                        <th className="pr-th"><button className="pr-th-btn no-sort">Estado</button></th>
                        <th className="pr-th"><button className="pr-th-btn no-sort">Acciones</button></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((p,i)=>{
                        const [c1,c2]=grad(String(p?.nombre||'')+String(p?.apellidos||''));
                        return (
                          <tr key={p?.id||i} className="pr-tr" style={{animationDelay:`${Math.min(i,14)*0.028}s`}} onClick={()=>p&&setSelectedPatient(p)} onContextMenu={(event)=>handleContextMenu(event,p)}>
                            <td className="pr-td pr-rn" style={{width:44,paddingLeft:20}}>{i+1}</td>
                            <td className="pr-td">
                              <div className="pr-name-cell">
                                <div className="pr-av" style={{background:`linear-gradient(135deg,${c1},${c2})`}}>{ini(p?.nombre,p?.apellidos)}</div>
                                <span className="pr-name-txt">{p?.nombre||'—'} {p?.apellidos||''}</span>
                              </div>
                            </td>
                            <td className="pr-td"><span className="pr-badge-cc pr-mono">{p?.cc||'—'}</span></td>
                            <td className="pr-td">{p?.telefono||'—'}</td>
                            <td className="pr-td">{p?.email||'—'}</td>
                            <td className="pr-td">{p?.edad !== undefined && p?.edad !== null ? <span className="pr-badge-age">{p.edad} años</span> : (calculateAge(p?.fecha_nacimiento) !== null ? <span className="pr-badge-age">{calculateAge(p.fecha_nacimiento)} años</span> : <span style={{color:'#c0c0c5'}}>—</span>)}</td>
                            <td className="pr-td" style={{color:'#86868b',fontSize:12,fontVariantNumeric:'tabular-nums'}}>{fmtDate(p?.creado_en)}</td>
                            <td className="pr-td"><span className="pr-badge-ok">Activo</span></td>
                            <td className="pr-td">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(p.id);
                                }}
                                style={{
                                  padding: '6px 10px',
                                  background: '#EF4444',
                                  border: 'none',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  transition: 'all .15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#DC2626'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#EF4444'}
                              >
                                <Trash2 size={12} /> Eliminar
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="pr-tfoot">
                    <span style={{fontSize:11,color:'#86868b',fontVariantNumeric:'tabular-nums'}}>{filteredPatients.length} de {patients.length} pacientes</span>
                    <span style={{fontSize:11,color:'#c0c0c5'}}>
                      Ordenado por {sortField==='nombre'?'nombre':sortField==='edad'?'edad':sortField==='cc'?'documento':'fecha'} · {sortDir==='asc'?'↑':'↓'}
                    </span>
                  </div>
                </div>
              )}

              {/* ───── CARPETAS ───── */}
              {viewMode==='folders'&&(
                <div className="pr-folders-grid pr-fade-up" style={{animationDelay:'.2s'}}>
                  {folderGroups.map(([letter,group],gi)=>{
                    const isOpen=openFolder===letter;
                    const [fc1,fc2]=grad(letter+letter+letter);
                    return (
                      <div key={letter} className="pr-folder-item" style={{animationDelay:`${gi*0.045}s`}}>
                        {/* Tarjeta carpeta */}
                        <div className="pr-folder-card" onClick={()=>setOpenFolder(isOpen?null:letter)}>
                          {/* Ícono SVG folder */}
                          <svg className="pr-folder-svg" width="60" height="46" viewBox="0 0 60 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* sombra */}
                            <rect x="3" y="12" width="54" height="33" rx="6" fill="rgba(0,0,0,.09)"/>
                            {/* back panel */}
                            <rect x="0" y="10" width="54" height="34" rx="6" fill={fc1} opacity=".3"/>
                            {/* tab */}
                            <path d={`M0 16 Q0 10 6 10 L20 10 Q25 10 27 14 L60 14 L60 16 Z`} fill={fc1} opacity=".55"/>
                            {/* front */}
                            <rect x="0" y="14" width="60" height="32" rx="6" fill={fc2}/>
                            {/* highlight streak */}
                            <rect x="7" y="20" width="20" height="3" rx="1.5" fill="rgba(255,255,255,.38)"/>
                            {/* count badge */}
                            <rect x="43" y="20" width="11" height="11" rx="5.5" fill="rgba(255,255,255,.28)"/>
                            <text x="48.5" y="29.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="rgba(255,255,255,.95)" fontFamily="'Geist',system-ui,sans-serif">{group.length}</text>
                            {/* líneas decorativas dentro */}
                            <rect x="7" y="27" width="30" height="2" rx="1" fill="rgba(255,255,255,.18)"/>
                            <rect x="7" y="33" width="22" height="2" rx="1" fill="rgba(255,255,255,.13)"/>
                          </svg>
                          <div className="pr-folder-name">{letter} ···</div>
                          <div className="pr-folder-sub">{group.length} paciente{group.length!==1?'s':''} · {isOpen?'cerrar':'abrir'}</div>
                        </div>

                        {/* Panel deslizante animado */}
                        <div className={`pr-panel${isOpen?' open':''}`}>
                          <div className="pr-panel-inner">
                            {group.map((p,pi)=>{
                              const [a1,a2]=grad(String(p?.nombre||'')+String(p?.apellidos||''));
                              return (
                                <div key={p?.id||pi} className="pr-file" onClick={()=>p&&setSelectedPatient(p)}>
                                  <div className="pr-file-av" style={{background:`linear-gradient(135deg,${a1},${a2})`}}>{ini(p?.nombre,p?.apellidos)}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div className="pr-file-name">{p?.nombre||'—'} {p?.apellidos||''}</div>
                                    <div className="pr-file-meta">{formatPatientSerial(p?.id)} · CC {p?.cc||'—'} · {(p?.edad !== undefined && p?.edad !== null ? p.edad : (calculateAge(p?.fecha_nacimiento) ?? '—'))} años</div>
                                  </div>
                                  <span className="pr-file-arrow">›</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}
        </div>

        {/* ══ MODAL ══ */}
        {isWizardOpen&&(
          <NewPatientWizard onClose={()=>{ setIsWizardOpen(false); fetchPatients(); }}/>
        )}

        {contextMenuState && (
          <ContextMenu
            x={contextMenuState.x}
            y={contextMenuState.y}
            patient={contextMenuState.patient}
            menuRef={menuRef}
            onClose={() => setContextMenuState(null)}
            onView={() => {
              setSelectedPatient(contextMenuState.patient);
            }}
            onEdit={() => {
              setQuickEditPatient(contextMenuState.patient);
              setQuickEditOpen(true);
            }}
            onDelete={() => {
              setConfirmDeleteId(contextMenuState.patient.id);
            }}
          />
        )}

        {quickEditOpen && quickEditPatient && (
          <QuickEditModal
            isOpen={quickEditOpen}
            patient={quickEditPatient}
            onClose={() => { setQuickEditOpen(false); setQuickEditPatient(null); }}
            onSaved={(updated) => {
              setSelectedPatient(updated);
              fetchPatients();
              setQuickEditOpen(false);
              setQuickEditPatient(null);
            }}
          />
        )}

        <DeleteConfirmModal
          isOpen={!!confirmDeleteId}
          onClose={() => setConfirmDeleteId(null)}
          onConfirm={async () => {
            if (!confirmDeleteId) return;
            setDeleting(true);
            try {
              await patientService.deletePatient(confirmDeleteId);
              await fetchPatients();
              setConfirmDeleteId(null);
            } catch (error) {
              console.error('Error deleting patient:', error);
              alert('Error al eliminar paciente');
            } finally {
              setDeleting(false);
            }
          }}
          patientName={patients.find(p => p.id === confirmDeleteId)?.nombre + ' ' + patients.find(p => p.id === confirmDeleteId)?.apellidos || ''}
          deleting={deleting}
        />
      </div>
    </>
  );
};