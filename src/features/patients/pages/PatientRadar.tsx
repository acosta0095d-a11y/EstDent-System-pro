import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePatient } from '../../../core/context/PatientContext';
import { supabase } from '../../../shared/lib/supabase';
import { NewPatientWizard } from './NewPatientWizard';
import { patientService } from '../services/patientService';
import { formatPatientSerial } from './patientUtils';
import {
  formatPatientRh,
  PATIENT_RH_OPTIONS,
  shouldRetryWithoutPatientRhColumn,
} from '../../../shared/lib/patientRhUtils';
import {
  Search, UserPlus, Loader2,
  Users, List, RefreshCcw,
  UserCheck, AlertTriangle, Calendar,
  ChevronUp, ChevronDown, ArrowUpDown,
  Trash2, X, Eye, Edit3, MoreHorizontal, Phone, Mail, MapPin,
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
  error?: string | null;
}

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, patientName, deleting, error }: DeleteConfirmModalProps) => {
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
          {error && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' }}>{error}</p>}
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
    municipio_ciudad: patient?.municipio_ciudad || '',
    direccion: patient?.direccion || '',
    tipo_sangre_rh: patient?.tipo_sangre_rh || ''
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── drag state ── */
  const [pos, setPos] = useState<{x:number;y:number}|null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({x:0,y:0});
  const winRef = useRef<HTMLDivElement|null>(null);

  /* centre on first open */
  useEffect(() => {
    if (isOpen) {
      setPos({ x: Math.max(0, (window.innerWidth - 480) / 2), y: Math.max(0, (window.innerHeight - 600) / 2) });
    }
  }, [isOpen]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = { x: e.clientX - (pos?.x??0), y: e.clientY - (pos?.y??0) };
    e.preventDefault();
  };
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

  useEffect(() => {
    if (!patient) return;
    setFormData({
      cc: patient.cc || '',
      nombre: patient.nombre || '',
      apellidos: patient.apellidos || '',
      fecha_nacimiento: patient.fecha_nacimiento || '',
      telefono: patient.telefono || '',
      email: patient.email || '',
      municipio_ciudad: patient.municipio_ciudad || '',
      direccion: patient.direccion || '',
      tipo_sangre_rh: patient.tipo_sangre_rh || ''
    });
  }, [patient]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!patient?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updatedRows = await patientService.updatePatient(patient.id, formData);
      const persisted = Array.isArray(updatedRows) && updatedRows[0] ? updatedRows[0] : null;
      onSaved({ ...patient, ...formData, ...(persisted || {}) });
      onClose();
    } catch (error) {
      console.error('Error quick editing patient:', error);
      setSaveError('No fue posible actualizar el paciente. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !pos) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 12,
    border: '1.5px solid #eef0f2', fontSize: 13.5, fontFamily: 'inherit',
    outline: 'none', transition: 'border-color .15s', background: '#fafbfc', color: '#1e293b',
  };

  return (
    <div
      ref={winRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 460,
        zIndex: 1200,
        borderRadius: 22,
        background: '#fff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.07), 0 0 0 1px rgba(255,255,255,.8)',
        overflow: 'hidden',
        fontFamily: "'Inter',-apple-system,sans-serif",
        userSelect: 'none',
      }}
    >
      {/* ── Title bar (drag handle) ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          padding: '16px 20px 14px',
          background: 'linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%)',
          borderBottom: '1px solid #eef0f2',
          cursor: 'grab',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', letterSpacing: '-.02em' }}>Editar Datos</div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>
            {patient?.nombre} {patient?.apellidos}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 8, border: '1.5px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#64748b', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
        >
          <X size={13}/>
        </button>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'grid', gap: 13, userSelect: 'text' }}>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Documento</label>
          <input style={inputStyle} value={formData.cc} onChange={e => setFormData({ ...formData, cc: e.target.value })}
            onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
            onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Nombre</label>
            <input style={inputStyle} value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
              onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Apellidos</label>
            <input style={inputStyle} value={formData.apellidos} onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
              onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Teléfono</label>
            <input style={inputStyle} value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
              onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</label>
            <input style={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
              onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
              onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Tipo de Sangre / RH</label>
          <select style={inputStyle} value={formData.tipo_sangre_rh} onChange={e => setFormData({ ...formData, tipo_sangre_rh: e.target.value })}
            onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
            onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'}>
            <option value="">Seleccionar...</option>
            {PATIENT_RH_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Municipio / Ciudad</label>
          <input style={inputStyle} value={formData.municipio_ciudad} onChange={e => setFormData({ ...formData, municipio_ciudad: e.target.value })}
            onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
            onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Direccion</label>
          <input style={inputStyle} value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })}
            onFocus={e => e.currentTarget.style.borderColor = '#29b2e8'}
            onBlur={e => e.currentTarget.style.borderColor = '#eef0f2'} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#fff', color: '#475569', fontWeight: 600, fontSize: 13.5, cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}
          >Cancelar</button>
          <button type="submit" disabled={saving} style={{
            padding: '9px 22px', borderRadius: 10, border: 'none',
            background: '#29b2e8', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
            fontFamily: 'inherit', opacity: saving ? 0.65 : 1,
            boxShadow: '0 1px 3px rgba(41,178,232,.3), 0 4px 14px rgba(41,178,232,.2)',
            transition: 'all .15s',
          }}
            onMouseEnter={e => { if (!saving) { e.currentTarget.style.background = '#18a3db'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#29b2e8'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
        {saveError && <p style={{ color: '#ef4444', fontSize: 12, margin: 0, textAlign: 'right' }}>{saveError}</p>}
      </form>
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
  const [hoveredCard,     setHoveredCard]     = useState<string|null>(null);
  const [actionMenuOpen,  setActionMenuOpen]  = useState<string|null>(null);
  const [isWizardOpen,    setIsWizardOpen]    = useState(false);
  const [editModalOpen,   setEditModalOpen]   = useState(false);
  const [editingPatient,  setEditingPatient]  = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [savingEdit,      setSavingEdit]      = useState(false);
  const [deleting,        setDeleting]        = useState(false);
  const [deleteError,     setDeleteError]     = useState<string | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{ patient:any; x:number; y:number } | null>(null);
  const [quickEditPatient, setQuickEditPatient] = useState<any>(null);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [sortField,    setSortField]    = useState<SortField>('nombre');
  const [sortDir,      setSortDir]      = useState<SortDir>('asc');
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

      const baseSelect = 'id, cc, nombre, apellidos, fecha_nacimiento, edad, creado_en, estado, telefono, email, municipio_ciudad, direccion';
      const selectWithRh = `${baseSelect}, tipo_sangre_rh`;

      let data: any[] | null = null;
      let error: any = null;

      ({ data, error } = await supabase.from('pacientes')
        .select(selectWithRh)
        .order('creado_en', { ascending: false }));

      let hasRhColumn = true;

      if (error && shouldRetryWithoutPatientRhColumn(error)) {
        hasRhColumn = false;
        ({ data, error } = await supabase.from('pacientes')
          .select(baseSelect)
          .order('creado_en', { ascending: false }));
      }

      console.log('Respuesta de Supabase:', { data: data?.length || 0, error });
      if (data && data.length > 0) {
        const sample = data[0];
        const missing = ['telefono', 'email', ...(hasRhColumn ? ['tipo_sangre_rh'] : [])].filter((k) => !(k in sample));
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
          email: p?.email && String(p.email).trim() ? String(p.email).trim().toLowerCase() : '',
          tipo_sangre_rh: formatPatientRh(p?.tipo_sangre_rh, '')
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
      const matchSearch = searchTerm===''||full.includes(searchTerm.toLowerCase())||doc.includes(searchTerm);
      const matchEstado = filtroEstado==='todos'||(filtroEstado==='activo'&&(p?.estado==='ACTIVO'||!p?.estado))||(filtroEstado==='hoy'&&new Date(p?.creado_en).toDateString()===new Date().toDateString());
      return matchSearch && matchEstado;
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
  },[patients,searchTerm,filtroEstado,sortField,sortDir]);

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

  const SortIcon=({field}:{field:SortField})=>{
    if(sortField!==field) return <ArrowUpDown size={11} style={{color:'#cbd5e1',flexShrink:0}}/>;
    return sortDir==='asc'
      ? <ChevronUp   size={11} style={{color:'#64748b',flexShrink:0}}/>
      : <ChevronDown size={11} style={{color:'#64748b',flexShrink:0}}/>;
  };

  /* ── Row Actions Dropdown ── */
  const [openActionsId, setOpenActionsId] = useState<string|null>(null);
  const actionsRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    if (!openActionsId) return;
    const close = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) setOpenActionsId(null);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [openActionsId]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .pr, .pr * { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; box-sizing:border-box; }
        .pr-mono { font-family:'JetBrains Mono','SF Mono',monospace; }
        .pr { background:#f4f7f9; min-height:100vh; padding:24px 15px; }

        @keyframes prSlideUp { from{opacity:0} to{opacity:1} }
        @keyframes prScaleIn { from{opacity:0} to{opacity:1} }
        @keyframes prSpin { to{transform:rotate(360deg)} }
        @keyframes prSpinOnce { from{transform:rotate(0)} to{transform:rotate(0)} }
        @keyframes prShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

        .pr-slide { animation:none; }
        .pr-scale { animation:none; }
        .pr-spin { animation:prSpin .8s linear infinite; }
        .pr-spin-once { animation:none; }

        /* ── Header ── */
        .pr-header { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap; margin-bottom:22px; }
        .pr-btn-new {
          display:inline-flex; align-items:center; gap:9px;
          padding:11px 22px; border:none; border-radius:14px;
          background:#1ba1d8;
          color:#fff; font-size:13px; font-weight:700; cursor:pointer;
          font-family:inherit; transition:all .28s cubic-bezier(.22,1,.36,1);
          box-shadow:0 4px 18px rgba(27,161,216,.36);
        }
        .pr-btn-new:hover { box-shadow:0 8px 28px rgba(27,161,216,.44); background:#169cd0; }
        .pr-btn-new:active { background:#169cd0; }

        /* ── Stats ── */
        .pr-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:14px; }
        .pr-stat-card {
          background:#ffffff;
          border:1px solid #dce3ec;
          border-radius:14px;
          padding:10px 14px;
          display:flex; align-items:center; gap:12px;
          transition:box-shadow .18s ease;
          cursor:default;
          box-shadow:0 4px 12px rgba(15,23,42,.08);
        }
        .pr-stat-card:hover { box-shadow:0 8px 18px rgba(15,23,42,.11); }
        .pr-stat-icon {
          width:32px; height:32px; border-radius:9px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          transition:none;
          background:#ffffff;
          border:1px solid #dce3ec;
          box-shadow:0 2px 6px rgba(15,23,42,.06);
        }
        .pr-stat-card:hover .pr-stat-icon { transform:none; }
        .pr-stat-body { display:flex; flex-direction:column; min-width:0; }
        .pr-stat-val { font-size:18px; font-weight:900; color:#1e293b; letter-spacing:-.03em; line-height:1; }
        .pr-stat-lbl { font-size:9px; font-weight:700; color:#7b8aa0; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

        /* ── Toolbar ── */
        .pr-toolbar {
          background:#ffffff;
          border:1px solid #dce3ec;
          border-radius:14px;
          padding:8px 10px; display:flex; gap:7px; align-items:center;
          margin-bottom:10px; box-shadow:0 4px 12px rgba(15,23,42,.08);
          flex-wrap:wrap;
        }
        .pr-search-wrap { flex:1; min-width:180px; position:relative; }
        .pr-search {
          width:100%; background:#ffffff; border:1.5px solid #dce3ec; border-radius:11px;
          padding:8px 12px 8px 38px; font-size:12.5px; color:#1e293b; outline:none;
          font-family:inherit; transition:all .25s;
        }
        .pr-search::placeholder { color:#b8bcc8; }
        .pr-search:focus { background:#fff; border-color:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.24); }

        .pr-toolbar-btn {
          padding:8px 12px; border-radius:12px; border:1px solid #dce3ec;
          background:#ffffff; cursor:pointer; color:#64748b;
          display:flex; align-items:center; transition:background .18s ease, color .18s ease, box-shadow .18s ease;
          font-family:inherit; flex-shrink:0;
        }
        .pr-toolbar-btn:hover { background:#e7edf3; color:#334155; box-shadow:0 4px 14px rgba(51,65,85,.18); }
        .pr-toolbar-count { font-size:12px; color:#64748b; font-weight:700; white-space:nowrap; background:#ffffff; border:1px solid #dce3ec; padding:8px 12px; border-radius:12px; flex-shrink:0; }
        .pr-filter-pill {
          display:inline-flex; align-items:center; padding:8px 14px;
          border-radius:12px; border:1px solid #dce3ec; background:#ffffff;
          font-size:12px; font-weight:700; color:#64748b; cursor:pointer;
          transition:background .18s ease, color .18s ease, box-shadow .18s ease;
          white-space:nowrap; font-family:inherit; flex-shrink:0;
        }
        .pr-filter-pill:hover { background:rgba(0,0,0,.1); color:#1e293b; }
        .pr-filter-pill.active { color:#fff; background:#64748b; box-shadow:0 4px 14px rgba(51,65,85,.32); }

        /* ── Table ── */
        .pr-table-wrap {
          background:linear-gradient(180deg,#fbfdff 0%,#f6f9fc 100%);
          border:1px solid #d7dfe8;
          border-radius:18px;
          overflow:hidden;
          box-shadow:0 16px 30px rgba(15,23,42,.08), 0 4px 12px rgba(15,23,42,.05);
        }
        .pr-table-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .pr-table { width:100%; border-collapse:separate; border-spacing:0; min-width:920px; }
        .pr-thead { background:#eef3f8; }
        .pr-thead tr th:first-child { border-radius:18px 0 0 0; }
        .pr-thead tr th:last-child  { border-radius:0 18px 0 0; }
        .pr-th {
          font-size:10px; font-weight:800; color:#94a3b8;
          text-transform:uppercase; letter-spacing:.12em;
          white-space:nowrap; user-select:none;
          border-right:1px solid #dde5ee;
          border-bottom:1px solid #dbe4ee;
        }
        .pr-th:first-child { border-left:none; }
        .pr-th:last-child { border-right:none; }
        .pr-th-btn {
          display:flex; align-items:center; gap:5px;
          padding:11px 12px; cursor:pointer; width:100%;
          background:none; border:none; font-family:inherit;
          font-size:10px; font-weight:800; color:inherit;
          text-transform:uppercase; letter-spacing:.12em;
          transition:color .2s; white-space:nowrap;
        }
        .pr-th-btn:hover { color:#1e293b; }
        .pr-th-btn.sorted { color:#64748b; }
        .pr-th-btn.no-sort { cursor:default; }
        .pr-th-btn.no-sort:hover { color:#94a3b8; }

        .pr-tr {
          cursor:pointer;
          transition:none;
          animation:none;
          transform-origin:center;
          will-change:auto;
        }
        .pr-tr:hover {
          filter:none;
        }
        .pr-td {
          padding:9px 12px; font-size:12.5px; color:#334155; vertical-align:middle;
          border-right:1px solid #e7edf4;
          border-bottom:1px solid #e7edf4;
          background:#fbfdff;
          white-space:nowrap;
          transition:none;
        }
        .pr-tr:nth-child(even) .pr-td,
        .pr-tr:nth-child(even) .pr-col-index { background:#f7fafd; }
        .pr-tr:hover .pr-td,
        .pr-tr:hover .pr-col-index {
          background:#eef2f6;
        }
        .pr-col-index { width:48px; }
        .pr-col-patient { min-width:214px; }
        .pr-col-document { width:136px; }
        .pr-col-contact { min-width:160px; }
        .pr-col-age { width:74px; text-align:center; }
        .pr-col-rh { width:62px; text-align:center; }
        .pr-col-date { width:128px; }
        .pr-col-city { width:116px; }
        .pr-col-address { width:122px; }
        .pr-col-status { width:96px; text-align:center; }
        .pr-col-address .pr-cell-text,
        .pr-col-city .pr-cell-text,
        .pr-col-contact .pr-cell-text {
          display:block;
          overflow:hidden;
          text-overflow:ellipsis;
        }
        .pr-contact-stack {
          display:grid;
          gap:2px;
        }
        .pr-td:first-child { border-left:none; }
        .pr-td:last-child { border-right:none; }
        .pr-tr:last-child .pr-td { border-bottom:none; }
        .pr-tr:last-child td:first-child { border-radius:0 0 0 18px; }
        .pr-tr:last-child td:last-child  { border-radius:0 0 18px 0; }

        .pr-av {
          width:34px; height:34px; border-radius:11px;
          display:flex; align-items:center; justify-content:center;
          font-weight:800; font-size:11px; color:#fff; flex-shrink:0;
          transition:none;
          box-shadow:0 3px 10px rgba(0,0,0,.14);
        }
        .pr-tr:hover .pr-av { transform:none; }
        .pr-name-cell { display:flex; align-items:center; gap:10px; }
        .pr-name-main { font-weight:700; font-size:12px; color:#334155; line-height:1.2; }
        .pr-name-sub { font-size:10px; color:#94a3b8; margin-top:2px; font-family:'JetBrains Mono','SF Mono',monospace; }

        .pr-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:3px 9px; border-radius:8px;
          font-size:10px; font-weight:700;
        }
        .pr-badge-doc { background:#e9eef4; color:#475569; border:1px solid #d1dae5; }
        .pr-badge-age { background:#f1f5f9; color:#475569; }
        .pr-badge-active { background:#f0fdf4; color:#059669; }
        .pr-badge-active::before {
          content:''; width:6px; height:6px; border-radius:50%;
          background:#10b981; display:inline-block;
          box-shadow:0 0 6px rgba(16,185,129,.5);
        }

        .pr-contact {
          font-size:10.5px;
          color:#64748b;
          display:flex;
          align-items:center;
          gap:4px;
          min-width:0;
          line-height:1.15;
          white-space:nowrap;
        }
        .pr-contact svg {
          flex-shrink:0;
        }
        .pr-contact-text {
          min-width:0;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
          display:block;
        }
        .pr-date { font-size:11px; color:#94a3b8; }

        /* Actions */
        .pr-actions-cell { position:relative; }
        .pr-actions-trigger {
          width:34px; height:34px; border-radius:11px; border:none;
          background:rgba(27,161,216,.09); cursor:pointer; color:#1ba1d8;
          display:flex; align-items:center; justify-content:center;
          transition:all .22s; font-family:inherit;
        }
        .pr-actions-trigger:hover { background:rgba(27,161,216,.18); }
        .pr-actions-menu {
          position:absolute; right:0; top:calc(100% + 6px);
          background:#fff; border:1px solid rgba(0,0,0,.08); border-radius:16px;
          box-shadow:0 20px 48px rgba(0,0,0,.12); width:200px;
          z-index:200; padding:6px;
          animation:none;
        }
        .pr-actions-item {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:9px 13px; border:none; background:transparent;
          font-size:13px; color:#1e293b; cursor:pointer; border-radius:10px;
          font-family:inherit; transition:all .15s; text-align:left;
        }
        .pr-actions-item:hover { background:#f8fafc; }
        .pr-actions-item.danger { color:#ef4444; }
        .pr-actions-item.danger:hover { background:#fef2f2; }
        .pr-actions-sep { height:1px; background:#f8fafc; margin:4px 8px; }

        /* Footer */
        .pr-tfoot {
          padding:11px 20px; border-top:1px solid #e2e8f0;
          display:flex; align-items:center; justify-content:space-between;
          background:#f3f7fb;
        }
        .pr-tfoot-text { font-size:12px; color:#94a3b8; font-weight:500; }

        /* Empty / Error */
        .pr-empty {
          background:#fff; border:2px dashed #e2e8f0; border-radius:22px;
          padding:80px 20px; text-align:center;
          box-shadow:0 4px 16px rgba(0,0,0,.03);
        }
        .pr-err {
          background:#fef2f2; border:1px solid #fecaca; border-radius:16px;
          padding:16px 20px; display:flex; align-items:flex-start; gap:12px;
          margin-bottom:20px;
        }
      `}</style>

      <div className="pr">
        <div style={{maxWidth:1300,margin:'0 auto'}}>

          {/* ══ HEADER ══ */}
          <div className="pr-header pr-slide">
            <div>
              <p style={{fontSize:12,fontWeight:600,color:'#94a3b8',marginBottom:8}}>
                Gestion de Pacientes
              </p>
              <h1 style={{fontSize:34,fontWeight:800,color:'#1e293b',letterSpacing:'-.04em',lineHeight:1,margin:0}}>
                Directorio Clinico
              </h1>
            </div>
            <button className="pr-btn-new" onClick={()=>setIsWizardOpen(true)}>
              <UserPlus size={18} strokeWidth={2.2}/> Nuevo Paciente
            </button>
          </div>

          {/* ══ ERROR ══ */}
          {errorSync && (
            <div className="pr-err pr-slide">
              <AlertTriangle size={20} style={{color:'#ef4444',flexShrink:0,marginTop:1}}/>
              <div style={{flex:1}}>
                <p style={{fontSize:14,fontWeight:700,color:'#991b1b',marginBottom:8}}>Error de sincronizacion</p>
                <p style={{fontSize:13,color:'#b91c1c',lineHeight:1.6,marginBottom:12}}>{errorSync}</p>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={testConnection} style={{fontSize:13,padding:'8px 18px',background:'#fff',border:'1.5px solid #fecaca',borderRadius:12,cursor:'pointer',fontWeight:600,color:'#1e293b',fontFamily:'inherit',transition:'all .2s'}}>
                    Probar Conexion
                  </button>
                  <button onClick={fetchPatients} style={{fontSize:13,padding:'8px 18px',background:'#1ba1d8',border:'none',borderRadius:12,cursor:'pointer',fontWeight:600,color:'#fff',fontFamily:'inherit',transition:'all .2s'}}>
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STATS ══ */}
          <div className="pr-stats">
            {[
              { label:'Total Registrados',  value:patients.length, icon:<Users size={16}/>, color:'#64748b', delay:'.06s' },
              { label:'Pacientes Activos',   value:activeCount, icon:<UserCheck size={16}/>, color:'#64748b', delay:'.12s' },
              { label:'Registros Hoy', value:patients.filter(p=>{ try{return new Date(p.creado_en).toDateString()===new Date().toDateString();}catch{return false;}}).length, icon:<Calendar size={16}/>, color:'#64748b', delay:'.18s' },
              { label:'Con Telefono', value:patients.filter(p=>p.telefono).length, icon:<Phone size={16}/>, color:'#64748b', delay:'.24s' },
            ].map(s => (
              <div key={s.label} className="pr-stat-card pr-scale" style={{animationDelay:s.delay}}>
                <div className="pr-stat-icon" style={{color:s.color}}>{s.icon}</div>
                <div className="pr-stat-body">
                  <div className="pr-stat-val">{s.value}</div>
                  <div className="pr-stat-lbl">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ══ TOOLBAR ══ */}
          <div className="pr-toolbar pr-slide" style={{animationDelay:'.28s'}}>
            <div className="pr-search-wrap">
              <Search size={15} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'#b8bcc8',pointerEvents:'none'}}/>
              <input type="text" placeholder="Buscar paciente por nombre, documento..." className="pr-search" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
            </div>
            {(['todos','activo','hoy'] as const).map(f => (
              <button key={f} className={`pr-filter-pill${filtroEstado===f?' active':''}`}
                onClick={()=>setFiltroEstado(f)}>
                {f==='todos'?'Todos':f==='activo'?'Activos':'Hoy'}
              </button>
            ))}
            <button className="pr-toolbar-btn" title="Actualizar" onClick={e=>{
              const svg=e.currentTarget.querySelector('svg');
              svg?.classList.remove('pr-spin-once');
              void (svg as any)?.offsetWidth;
              svg?.classList.add('pr-spin-once');
              fetchPatients();
            }}>
              <RefreshCcw size={15}/>
            </button>
            <span className="pr-toolbar-count">
              {filteredPatients.length} / {patients.length}
            </span>
          </div>

          {/* ══ CONTENT ══ */}
          {loading ? (
            <div style={{height:340,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
              <Loader2 size={32} className="pr-spin" style={{color:'#1ba1d8'}}/>
              <span style={{fontSize:13,fontWeight:600,color:'#b8bcc8'}}>Cargando pacientes...</span>
            </div>

          ) : filteredPatients.length===0&&!errorSync ? (
            <div className="pr-empty pr-slide">
              <div style={{width:60,height:60,borderRadius:20,background:'linear-gradient(135deg,#f5f6f8,#eef0f2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
                <Users size={28} style={{color:'#b8bcc8'}}/>
              </div>
              <p style={{color:'#1e293b',fontWeight:700,fontSize:18,marginBottom:6}}>Sin pacientes registrados</p>
              <p style={{color:'#b8bcc8',fontSize:14}}>Presiona "Nuevo Paciente" para agregar el primero.</p>
            </div>

          ) : (
            <div className="pr-table-wrap pr-slide" style={{animationDelay:'.30s'}}>
              <div className="pr-table-scroll">
              <table className="pr-table">
                <thead className="pr-thead">
                  <tr>
                    <th className="pr-th pr-col-index" style={{width:48}}>
                      <span style={{padding:'12px 12px',display:'block',fontSize:10,fontWeight:800,color:'#94a3b8',letterSpacing:'.12em'}}>#</span>
                    </th>
                    <th className="pr-th pr-col-patient" style={{minWidth:240}}>
                      <button className={`pr-th-btn${sortField==='nombre'?' sorted':''}`} onClick={()=>handleSort('nombre')}>Paciente <SortIcon field="nombre"/></button>
                    </th>
                    <th className="pr-th pr-col-document">
                      <button className={`pr-th-btn${sortField==='cc'?' sorted':''}`} onClick={()=>handleSort('cc')}>Documento <SortIcon field="cc"/></button>
                    </th>
                    <th className="pr-th pr-col-contact">
                      <button className={`pr-th-btn${sortField==='telefono'?' sorted':''}`} onClick={()=>handleSort('telefono')}>Contacto <SortIcon field="telefono"/></button>
                    </th>
                    <th className="pr-th pr-col-age">
                      <button className={`pr-th-btn${sortField==='edad'?' sorted':''}`} onClick={()=>handleSort('edad')}>Edad <SortIcon field="edad"/></button>
                    </th>
                    <th className="pr-th pr-col-rh">
                      <button className="pr-th-btn no-sort">RH</button>
                    </th>
                    <th className="pr-th pr-col-date">
                      <button className={`pr-th-btn${sortField==='creado_en'?' sorted':''}`} onClick={()=>handleSort('creado_en')}>Registro <SortIcon field="creado_en"/></button>
                    </th>
                    <th className="pr-th pr-col-city">
                      <button className="pr-th-btn no-sort">Ciudad</button>
                    </th>
                    <th className="pr-th pr-col-address">
                      <button className="pr-th-btn no-sort">Dirección</button>
                    </th>
                    <th className="pr-th pr-col-status">
                      <button className="pr-th-btn no-sort">Estado</button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p,i)=>{
                    const age = p?.edad !== undefined && p?.edad !== null ? p.edad : calculateAge(p?.fecha_nacimiento);
                    return (
                      <tr key={p?.id||i} className="pr-tr" style={{animationDelay:`${Math.min(i,25)*0.03}s`}} onClick={()=>p&&setSelectedPatient(p)} onContextMenu={(event)=>handleContextMenu(event,p)}>
                        <td className="pr-col-index" style={{padding:'10px 12px',color:'#cbd5e1',fontSize:12,fontWeight:700,verticalAlign:'middle',width:48,borderRight:'1px solid #e7edf4'}}>{i+1}</td>
                        <td className="pr-td pr-col-patient">
                          <div className="pr-name-cell">
                            <div className="pr-av" style={{background:'#adb5bd'}}>{ini(p?.nombre,p?.apellidos)}</div>
                            <div>
                              <div className="pr-name-main">{p?.nombre||'--'} {p?.apellidos||''}</div>
                              <div className="pr-name-sub">{formatPatientSerial(p?.id)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="pr-td pr-col-document"><span className="pr-badge pr-badge-doc">{p?.cc||'--'}</span></td>
                        <td className="pr-td pr-col-contact">
                          <div className="pr-contact-stack">
                            <div className="pr-contact"><Phone size={12}/><span className="pr-contact-text">{p?.telefono||'--'}</span></div>
                            {p?.email && <div className="pr-contact"><Mail size={12}/><span className="pr-contact-text">{p.email}</span></div>}
                          </div>
                        </td>
                        <td className="pr-td pr-col-age">{age !== null ? <span className="pr-badge pr-badge-age">{age} a.</span> : <span style={{color:'#cbd5e1'}}>--</span>}</td>
                        <td className="pr-td pr-col-rh"><span className="pr-badge pr-badge-age">{formatPatientRh(p?.tipo_sangre_rh, '--')}</span></td>
                        <td className="pr-td pr-col-date"><span className="pr-date">{fmtDate(p?.creado_en)}</span></td>
                        <td className="pr-td pr-col-city"><span className="pr-cell-text" style={{fontSize:13,color:'#475569'}}>{p?.municipio_ciudad||'—'}</span></td>
                        <td className="pr-td pr-col-address"><span className="pr-cell-text" style={{fontSize:13,color:'#475569'}}>{p?.direccion||'—'}</span></td>
                        <td className="pr-td pr-col-status"><span className="pr-badge pr-badge-active">Activo</span></td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="pr-tfoot">
                <span className="pr-tfoot-text">{filteredPatients.length} de {patients.length} pacientes</span>
                <span className="pr-tfoot-text">
                  Ordenado por {sortField==='nombre'?'nombre':sortField==='edad'?'edad':sortField==='cc'?'documento':sortField==='telefono'?'contacto':sortField==='email'?'email':'fecha'} {sortDir==='asc'?'(A-Z)':'(Z-A)'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ══ MODALS ══ */}
        {isWizardOpen && (
          <NewPatientWizard onClose={()=>{ setIsWizardOpen(false); fetchPatients(); }}/>
        )}

        {contextMenuState && (
          <ContextMenu
            x={contextMenuState.x}
            y={contextMenuState.y}
            patient={contextMenuState.patient}
            menuRef={menuRef}
            onClose={() => setContextMenuState(null)}
            onView={() => { setSelectedPatient(contextMenuState.patient); }}
            onEdit={() => { setQuickEditPatient(contextMenuState.patient); setQuickEditOpen(true); }}
            onDelete={() => { setConfirmDeleteId(contextMenuState.patient.id); }}
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
              setDeleteError('Error al eliminar paciente. Intente de nuevo.');
            } finally {
              setDeleting(false);
            }
          }}
          patientName={patients.find(p => p.id === confirmDeleteId)?.nombre + ' ' + patients.find(p => p.id === confirmDeleteId)?.apellidos || ''}
          deleting={deleting}
          error={deleteError}
        />
      </div>
    </>
  );
};