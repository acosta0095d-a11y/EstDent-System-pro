import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatient } from '../../../core/context/PatientContext';
import { FullClinicalHistory } from '../components/FullClinicalHistory';
import { patientService } from '../services/patientService';
import { formatPatientSerial } from './patientUtils';
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
  AlertCircle,
  CheckCircle,
  XCircle,
  X,
  Activity,
  ClipboardList,
  Stethoscope,
  CheckCircle2,
  Edit,
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
interface Consulta {
  id: string;
  fecha: string;
  hora: string;
  tipo: 'odontologia' | 'ortodoncia';
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  doctor: string;
  valor: number;
  estado: 'completada' | 'cancelada' | 'pendiente';
  observaciones?: string;
}

// ============================================
// DATOS MOCK
// ============================================
const MOCK_CONSULTAS: Consulta[] = [
  { id:'C-1001', fecha:'10/02/2026', hora:'09:30', tipo:'odontologia', motivo:'Dolor en muela', diagnostico:'Caries profunda', tratamiento:'Endodoncia parcial', doctor:'Dra. Martínez', valor:250000, estado:'completada', observaciones:'Control en 15 días' },
  { id:'C-1002', fecha:'15/01/2026', hora:'11:00', tipo:'ortodoncia',  motivo:'Control mensual',  diagnostico:'Evolución favorable', tratamiento:'Ajuste de brackets', doctor:'Dr. Rodríguez', valor:120000, estado:'completada' },
  { id:'C-1003', fecha:'20/12/2025', hora:'15:30', tipo:'odontologia', motivo:'Limpieza',         diagnostico:'Sano',               tratamiento:'Profilaxis',           doctor:'Dra. Martínez', valor:80000,  estado:'completada' },
];

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
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await patientService.updatePatient(patient.id, formData);
      onSave({ ...patient, ...formData });
      onClose();
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Error al actualizar paciente');
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
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        width: 480,
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
              Editar Información
            </h3>
            <p style={{ fontSize: 12, color: '#86868b', margin: 0 }}>
              Modifica los datos del paciente
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

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Documento
                </label>
                <input
                  type="text"
                  className="input-pro"
                  value={formData.cc}
                  onChange={(e) => setFormData({ ...formData, cc: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  className="input-pro"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Nombre
                </label>
                <input
                  type="text"
                  className="input-pro"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Apellidos
                </label>
                <input
                  type="text"
                  className="input-pro"
                  value={formData.apellidos}
                  onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="input-pro"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  className="input-pro"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1d1d1f', marginBottom: 6 }}>
                Municipio/Ciudad
              </label>
              <input
                type="text"
                className="input-pro"
                value={formData.municipio_ciudad}
                onChange={(e) => setFormData({ ...formData, municipio_ciudad: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                background: '#f5f5f7',
                border: '1px solid rgba(0,0,0,.09)',
                borderRadius: 980,
                fontSize: 13,
                fontWeight: 600,
                color: '#1d1d1f',
                cursor: 'pointer',
                transition: 'all .15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f7'}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-blue"
              disabled={saving}
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
interface NuevoConsultaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tipo: 'odontologia' | 'ortodoncia') => void;
}

const NuevoConsultaModal = ({ isOpen, onClose, onSelect }: NuevoConsultaModalProps) => {
  const [confirming, setConfirming] = useState<'odontologia' | 'ortodoncia' | null>(null);

  const handleClose = () => { setConfirming(null); onClose(); };

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes pdModalIn {
          from { opacity:0; transform:scale(.95) translateY(8px); }
          to   { opacity:1; transform:scale(1)   translateY(0);   }
        }
        @keyframes pdOverlayIn { from{opacity:0} to{opacity:1} }

        .pd-modal-overlay {
          position:fixed;inset:0;
          background:rgba(0,0,0,.18);
          backdrop-filter:blur(6px);
          display:flex;align-items:center;justify-content:center;
          z-index:1000;padding:20px;
          animation:pdOverlayIn .18s ease both;
        }
        .pd-modal-box {
          background:#fff;border-radius:20px;width:460px;max-width:100%;
          border:1px solid rgba(0,0,0,.08);
          box-shadow:0 24px 60px rgba(0,0,0,.12);
          animation:pdModalIn .22s cubic-bezier(.4,0,.2,1) both;
          overflow:hidden;
        }
        .pd-modal-header {
          display:flex;justify-content:space-between;align-items:center;
          padding:22px 28px;border-bottom:1px solid rgba(0,0,0,.06);
        }
        .pd-modal-body { padding:28px; }

        .pd-option-btn {
          width:100%;padding:18px;background:#fff;
          border:1.5px solid rgba(0,0,0,.08);border-radius:14px;
          cursor:pointer;text-align:left;
          display:flex;gap:14px;align-items:flex-start;
          transition:all .18s ease;
          font-family:'Geist',system-ui,sans-serif;
        }
        .pd-option-btn:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,0,0,.08); }
        .pd-option-btn.dental:hover { border-color:#0071e3;background:#f0f6ff; }
        .pd-option-btn.ortho:hover  { border-color:#8b5cf6;background:#f5f3ff; }

        .pd-modal-close {
          background:#f5f5f7;border:none;cursor:pointer;
          padding:7px;border-radius:50%;color:#86868b;
          display:flex;align-items:center;justify-content:center;
          transition:background .15s;
        }
        .pd-modal-close:hover { background:#e5e5e5; }

        .pd-confirm-back {
          flex:1;padding:13px;background:#fff;
          border:1px solid rgba(0,0,0,.09);border-radius:11px;
          color:#1d1d1f;font-weight:600;font-size:13px;cursor:pointer;
          font-family:'Geist',system-ui,sans-serif;
          transition:background .15s;
        }
        .pd-confirm-back:hover { background:#f5f5f7; }
        .pd-confirm-go {
          flex:1;padding:13px;border:none;border-radius:11px;
          color:#fff;font-weight:700;font-size:13px;cursor:pointer;
          font-family:'Geist',system-ui,sans-serif;
          transition:opacity .15s,transform .15s;
        }
        .pd-confirm-go:hover { opacity:.9;transform:translateY(-1px); }
      `}</style>

      <div className="pd-modal-overlay">
        <div className="pd-modal-box">
          {/* Header */}
          <div className="pd-modal-header">
            <div>
              <h3 style={{fontSize:17,fontWeight:700,color:'#1d1d1f',marginBottom:3}}>
                {confirming ? 'Confirmar inicio' : 'Nueva Consulta'}
              </h3>
              <p style={{fontSize:12,color:'#86868b',margin:0}}>
                {confirming ? 'Revise antes de continuar' : 'Seleccione el área clínica'}
              </p>
            </div>
            <button className="pd-modal-close" onClick={handleClose}><X size={18}/></button>
          </div>

          {/* Body */}
          <div className="pd-modal-body">
            {!confirming ? (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {/* Odontología */}
                <button className="pd-option-btn dental" onClick={()=>setConfirming('odontologia')}>
                  <div style={{padding:11,background:'#e0f2fe',borderRadius:11,color:'#0071e3',flexShrink:0}}>
                    <Stethoscope size={22}/>
                  </div>
                  <div>
                    <span style={{color:'#1d1d1f',fontWeight:700,fontSize:15,display:'block',marginBottom:4}}>Odontología General</span>
                    <p style={{fontSize:12,color:'#86868b',margin:0,lineHeight:1.5}}>Caries y resinas · Extracciones · Limpiezas · Endodoncias</p>
                  </div>
                </button>
                {/* Ortodoncia */}
                <button className="pd-option-btn ortho" onClick={()=>setConfirming('ortodoncia')}>
                  <div style={{padding:11,background:'#ede9fe',borderRadius:11,color:'#8b5cf6',flexShrink:0}}>
                    <Activity size={22}/>
                  </div>
                  <div>
                    <span style={{color:'#1d1d1f',fontWeight:700,fontSize:15,display:'block',marginBottom:4}}>Ortodoncia</span>
                    <p style={{fontSize:12,color:'#86868b',margin:0,lineHeight:1.5}}>Brackets · Arcos · Elásticos · Controles mensuales</p>
                  </div>
                </button>
              </div>
            ) : (
              <div style={{textAlign:'center'}}>
                <div style={{
                  width:68,height:68,margin:'0 auto 18px',borderRadius:'50%',
                  background: confirming==='odontologia' ? '#e0f2fe' : '#ede9fe',
                  color:       confirming==='odontologia' ? '#0071e3' : '#8b5cf6',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  boxShadow: `0 8px 18px ${confirming==='odontologia'?'rgba(0,113,227,.18)':'rgba(139,92,246,.18)'}`,
                }}>
                  <CheckCircle2 size={34}/>
                </div>
                <h4 style={{fontSize:18,fontWeight:800,color:'#1d1d1f',marginBottom:10}}>
                  ¿Iniciar consulta de {confirming==='odontologia'?'Odontología General':'Ortodoncia'}?
                </h4>
                <p style={{fontSize:13,color:'#86868b',marginBottom:28,lineHeight:1.6}}>
                  El expediente clínico y las herramientas especializadas se configurarán automáticamente.
                </p>
                <div style={{display:'flex',gap:10}}>
                  <button className="pd-confirm-back" onClick={()=>setConfirming(null)}>Volver</button>
                  <button
                    className="pd-confirm-go"
                    style={{background: confirming==='odontologia'?'#0071e3':'#8b5cf6'}}
                    onClick={()=>{ onSelect(confirming); setConfirming(null); }}
                  >
                    Aceptar e Iniciar
                  </button>
                </div>
              </div>
            )}
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
  const [historyViewOpen, setHistoryViewOpen] = useState(false);
  const [historyEditOpen, setHistoryEditOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMode, setHistoryMode] = useState<'view'|'edit'>('view');
  const [historyData, setHistoryData] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingPatientData, setLoadingPatientData] = useState(false);

  // Usar consultas reales del paciente en lugar de mock
  const consultas = selectedPatient?.consultas || [];

  if (!selectedPatient) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f7', fontFamily: "'Geist', sans-serif", color: '#86868b' }}>
        <div style={{ textAlign: 'center' }}>
          <User size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>No hay paciente seleccionado</h2>
          <p>Selecciona un paciente para ver su dashboard</p>
        </div>
      </div>
    );
  }

  /* stats */
  const totalConsultas = consultas.length;
  const totalPagado = consultas.reduce((s, c) => s + (c.detalles_clinicos?.valor || 0), 0);
  const ultimaConsulta = consultas[0]?.fecha || 'N/A';

  /* handler — lógica original intacta */
  const handleNuevaConsulta = (tipo: 'odontologia'|'ortodoncia') => {
    setModalOpen(false);
    if (tipo==='odontologia') navigate('/consulta/general');
    else                       navigate('/consulta/ortodoncia');
  };

  const ensurePatientData = async () => {
    if (!selectedPatient?.id) return;

    const needsRefresh = selectedPatient.consultas === undefined || !selectedPatient.clinical_history || !selectedPatient.telefono || !selectedPatient.email;
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

  const handleVerHistoria = async () => {
    await ensurePatientData();
    setHistoryMode('view');
    setHistoryOpen(true);
  };

  const clinicalHistory = selectedPatient?.clinical_history;
  const hasClinicalHistory = Boolean(clinicalHistory && Object.keys(clinicalHistory).length > 0);
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
      {/* ── ESTILOS — mismo token system que PatientRadar ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');

        .pd, .pd * { font-family:'Geist',system-ui,sans-serif; box-sizing:border-box; }
        .pd-mono    { font-family:'Geist Mono',monospace; }

        .pd { background:#f5f5f7; min-height:100vh; padding:28px 32px; }

        /* ── animaciones ── */
        @keyframes prFadeUp  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes prRowIn   { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }

        .pd-fade { animation:prFadeUp .38s cubic-bezier(.4,0,.2,1) both; }
        .pd-d1   { animation-delay:.05s }
        .pd-d2   { animation-delay:.10s }
        .pd-d3   { animation-delay:.15s }
        .pd-d4   { animation-delay:.20s }
        .pd-d5   { animation-delay:.25s }

        /* ── botón volver ── */
        .pd-back {
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 16px;background:#fff;
          border:1px solid rgba(0,0,0,.09);border-radius:980px;
          font-size:13px;font-weight:600;color:#1d1d1f;cursor:pointer;
          box-shadow:0 1px 4px rgba(0,0,0,.04);
          transition:all .15s;
          font-family:'Geist',system-ui,sans-serif;
        }
        .pd-back:hover { border-color:#0071e3;color:#0071e3;transform:translateX(-2px); }

        /* ── tarjeta base ── */
        .pd-card {
          background:#fff;border:1px solid rgba(0,0,0,.08);
          border-radius:18px;
          box-shadow:0 2px 12px rgba(0,0,0,.05);
          transition:box-shadow .2s;
        }

        /* ── hero paciente ── */
        .pd-hero { padding:28px 32px; }
        .pd-hero-avatar {
          width:72px;height:72px;border-radius:18px;
          display:flex;align-items:center;justify-content:center;
          color:#fff;font-size:24px;font-weight:800;
          box-shadow:0 8px 20px rgba(0,0,0,.15);
          flex-shrink:0;
        }
        .pd-hero-name {
          font-size:28px;font-weight:800;color:#1d1d1f;
          letter-spacing:-.025em;line-height:1;margin-bottom:8px;
        }
        .pd-badge-active {
          display:inline-flex;align-items:center;gap:5px;
          padding:4px 10px;border-radius:20px;
          background:#f0fdf4;color:#16a34a;
          font-size:11px;font-weight:700;
          border:1px solid rgba(22,163,74,.15);
        }
        .pd-badge-active::before { content:'';width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 5px #22c55e; }

        /* ── stat chips (igual que PatientRadar) ── */
        .pd-stats-strip {
          display:flex;gap:0;
          background:#f5f5f7;border-radius:14px;
          border:1px solid rgba(0,0,0,.07);
          overflow:hidden;
        }
        .pd-stat-chip {
          padding:14px 24px;text-align:center;flex:1;
          border-right:1px solid rgba(0,0,0,.07);
        }
        .pd-stat-chip:last-child { border-right:none; }
        .pd-stat-num  { font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums; }
        .pd-stat-lbl  { font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#86868b;margin-top:5px; }

        /* ── info row ── */
        .pd-info-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px; }
        .pd-info-item { display:flex;align-items:center;gap:11px; }
        .pd-info-icon { width:36px;height:36px;border-radius:10px;background:#f5f5f7;display:flex;align-items:center;justify-content:center;flex-shrink:0; }
        .pd-info-lbl  { font-size:11px;color:#86868b;font-weight:500;margin-bottom:2px; }
        .pd-info-val  { font-size:13px;font-weight:600;color:#1d1d1f; }

        /* ── botones acción ── */
        .pd-btn-secondary {
          display:flex;align-items:center;gap:8px;
          padding:10px 18px;background:#fff;
          border:1px solid rgba(0,0,0,.09);border-radius:980px;
          font-size:13px;font-weight:600;color:#1d1d1f;cursor:pointer;
          box-shadow:0 1px 3px rgba(0,0,0,.04);
          transition:all .15s;
          font-family:'Geist',system-ui,sans-serif;
        }
        .pd-btn-secondary:hover { border-color:#0071e3;color:#0071e3;transform:translateY(-1px); }

        .pd-btn-primary {
          display:flex;align-items:center;gap:8px;
          padding:10px 22px;background:#0071e3;border:none;border-radius:980px;
          font-size:13px;font-weight:700;color:#fff;cursor:pointer;
          box-shadow:0 2px 10px rgba(0,113,227,.3);
          transition:all .15s;
          font-family:'Geist',system-ui,sans-serif;
        }
        .pd-btn-primary:hover { background:#0077ed;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,113,227,.4); }
        .pd-btn-primary:active { transform:scale(.97); }

        /* ══ TABLA HISTORIAL — mismo estilo PatientRadar ══ */
        .pd-table-wrap {
          background:#fff;border:1px solid rgba(0,0,0,.08);
          border-radius:18px;overflow:hidden;
          box-shadow:0 2px 12px rgba(0,0,0,.05);
        }
        .pd-table-header {
          padding:20px 28px;border-bottom:1.5px solid rgba(0,0,0,.06);
          display:flex;align-items:center;gap:10px;background:#fff;
        }
        .pd-table { width:100%;border-collapse:collapse; }
        .pd-thead { background:#fafafa;border-bottom:1.5px solid rgba(0,0,0,.07); }
        .pd-th {
          padding:11px 18px;text-align:left;
          font-size:10px;font-weight:700;color:#86868b;
          text-transform:uppercase;letter-spacing:.1em;white-space:nowrap;
        }
        .pd-th:first-child { padding-left:28px; }
        .pd-th:last-child  { padding-right:28px;text-align:center; }

        .pd-tr {
          border-bottom:1px solid rgba(0,0,0,.05);
          transition:background .1s;
          animation:prRowIn .28s ease both;
        }
        .pd-tr:nth-child(even) { background:#fafafa; }
        .pd-tr:last-child      { border-bottom:none; }
        .pd-tr:hover           { background:#f0f6ff!important; }

        .pd-td { padding:16px 18px;vertical-align:middle; }
        .pd-td:first-child { padding-left:28px; }
        .pd-td:last-child  { padding-right:28px;text-align:center; }

        /* badges tabla */
        .pd-tipo-dental { display:inline-flex;padding:4px 10px;border-radius:7px;font-size:11px;font-weight:700;background:#f0f6ff;color:#0071e3;border:1px solid rgba(0,113,227,.15); }
        .pd-tipo-ortho  { display:inline-flex;padding:4px 10px;border-radius:7px;font-size:11px;font-weight:700;background:#f5f3ff;color:#7c3aed;border:1px solid rgba(124,58,237,.15); }

        .pd-tfoot { padding:10px 28px;border-top:1px solid rgba(0,0,0,.05);display:flex;align-items:center;justify-content:space-between;background:#fafafa; }
      `}</style>

      <div className="pd">
        <div style={{maxWidth:1200,margin:'0 auto',display:'flex',flexDirection:'column',gap:20}}>

          {/* ══ NAVEGACIÓN ══ */}
          <div className="pd-fade">
            <button className="pd-back" onClick={()=>setSelectedPatient(null)}>
              <ChevronLeft size={15} strokeWidth={2.5}/> Volver a pacientes
            </button>
          </div>

          {/* ══ HERO PACIENTE ══ */}
          <div className="pd-card pd-hero pd-fade pd-d1">
            {/* fila superior */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:20,marginBottom:24}}>
              {/* avatar + nombre */}
              <div style={{display:'flex',gap:20,alignItems:'center'}}>
                <div className="pd-hero-avatar" style={{background:`linear-gradient(135deg,${c1},${c2})`}}>
                  {initials}
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <h2 className="pd-hero-name">{selectedPatient.nombre} {selectedPatient.apellidos}</h2>
                    <button
                      onClick={() => {
                        setEditingPatient(selectedPatient);
                        setEditModalOpen(true);
                      }}
                      style={{
                        padding: '6px 10px',
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,.09)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#0071e3',
                        transition: 'all .15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f0f6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                    >
                      <Edit size={14} /> Editar
                    </button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <span className="pd-badge-active">Activo</span>
                    <span style={{background:'#f8fafc',color:'#475569',padding:'7px 12px',borderRadius:999,fontSize:12,fontWeight:700,letterSpacing:'.08em',border:'1px solid rgba(99,102,241,.12)'}}>{patientCode}</span>
                  </div>
                </div>
              </div>

              {/* stats strip — igual que PatientRadar */}
              <div className="pd-stats-strip">
                <div className="pd-stat-chip">
                  <div className="pd-stat-num" style={{color:'#0071e3'}}>{totalConsultas}</div>
                  <div className="pd-stat-lbl">Consultas</div>
                </div>
                <div className="pd-stat-chip">
                  <div className="pd-stat-num" style={{color:'#16a34a',fontSize:20}}>${totalPagado.toLocaleString()}</div>
                  <div className="pd-stat-lbl">Pagado</div>
                </div>
                <div className="pd-stat-chip">
                  <div className="pd-stat-num" style={{color:'#1d1d1f',fontSize:16}}>{ultimaConsulta}</div>
                  <div className="pd-stat-lbl">Última visita</div>
                </div>
              </div>
            </div>

            {/* divider */}
            <div style={{height:1,background:'rgba(0,0,0,.06)',marginBottom:20}}/>

            {/* info grid */}
            <div className="pd-info-grid">
              {[
                { icon:<User size={16} style={{stroke:'#86868b'}}/>,   lbl:'Documento',     val: selectedPatient.cc },
                { icon:<Calendar size={16} style={{stroke:'#86868b'}}/>,lbl:'Nacimiento',    val: `${selectedPatient.fecha_nacimiento||'N/A'} · ${selectedPatient.edad ?? calculateAge(selectedPatient.fecha_nacimiento) ?? 0} años` },
          { icon:<Phone size={16} style={{stroke:'#86868b'}}/>,   lbl:'Teléfono',      val: selectedPatient.telefono?.trim() ? selectedPatient.telefono : 'N/A' },
          { icon:<Mail size={16} style={{stroke:'#86868b'}}/>,    lbl:'Email',         val: selectedPatient.email?.trim() ? selectedPatient.email : 'N/A' },
              ].map(r=>(
                <div key={r.lbl} className="pd-info-item">
                  <div className="pd-info-icon">{r.icon}</div>
                  <div>
                    <div className="pd-info-lbl">{r.lbl}</div>
                    <div className="pd-info-val">{r.val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ══ ACCIONES ══ */}
          <div className="pd-fade pd-d2" style={{display:'flex',justifyContent:'flex-end',gap:10}}>
            <button
              className="pd-btn-secondary"
              onClick={handleVerHistoria}
            >
              <ClipboardList size={16}/> Ver Historia Clínica
            </button>
            <button className="pd-btn-primary" onClick={()=>setModalOpen(true)}>
              <Plus size={16} strokeWidth={2.5}/> Nueva Consulta
            </button>
          </div>

          {/* ══ TABLA HISTORIAL ══ */}
          <div className="pd-table-wrap pd-fade pd-d3">
            {/* cabecera */}
            <div className="pd-table-header">
              <div style={{width:32,height:32,borderRadius:9,background:'#f0f6ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <FileText size={16} style={{stroke:'#0071e3'}}/>
              </div>
              <div>
                <h3 style={{fontSize:15,fontWeight:700,color:'#1d1d1f',margin:0}}>Historial Clínico</h3>
                <p style={{fontSize:11,color:'#86868b',margin:0,marginTop:1}}>{consultas.length} consulta{consultas.length!==1?'s':''} registrada{consultas.length!==1?'s':''}</p>
              </div>
            </div>

            {/* tabla */}
            <div style={{overflowX:'auto'}}>
              <table className="pd-table">
                <thead className="pd-thead">
                  <tr>
                    <th className="pd-th">Fecha y hora</th>
                    <th className="pd-th">Tipo</th>
                    <th className="pd-th">Motivo / Diagnóstico</th>
                    <th className="pd-th">Doctor</th>
                    <th className="pd-th">Valor</th>
                    <th className="pd-th">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {consultas.map((c,i)=> {
                    const detalles = c.detalles_clinicos || {};
                    const fecha = new Date(c.fecha).toLocaleDateString('es-ES');
                    const hora = new Date(c.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <tr key={c.id} className="pd-tr" style={{animationDelay:`${i*0.05}s`}}>
                        {/* fecha */}
                        <td className="pd-td">
                          <div style={{fontWeight:700,color:'#1d1d1f',fontSize:13}}>{fecha}</div>
                          <div style={{display:'flex',alignItems:'center',gap:4,color:'#86868b',fontSize:11,marginTop:3}}>
                            <Clock size={11}/> {hora}
                          </div>
                        </td>

                        {/* tipo */}
                        <td className="pd-td">
                          <span className={c.tipo_consulta === 'GENERAL' ? 'pd-tipo-dental' : 'pd-tipo-ortho'}>
                            {c.tipo_consulta === 'GENERAL' ? 'General' : 'Ortodoncia'}
                          </span>
                        </td>

                        {/* motivo */}
                        <td className="pd-td">
                          <div style={{fontWeight:600,color:'#1d1d1f',fontSize:13}}>
                            {c.tipo_consulta === 'GENERAL' ? detalles.motivo : detalles.anamnesis?.motivo}
                          </div>
                          <div style={{color:'#86868b',fontSize:12,marginTop:2}}>
                            {c.hallazgos_odontograma?.length || 0} hallazgos odontograma
                          </div>
                        </td>

                        {/* doctor */}
                        <td className="pd-td" style={{fontSize:13,color:'#3d3d40',fontWeight:500}}>
                          {detalles.doctor || 'Dr. Actual'}
                        </td>

                        {/* valor */}
                        <td className="pd-td">
                          <span className="pd-mono" style={{fontSize:13,fontWeight:600,color:'#1d1d1f'}}>
                            ${detalles.valor?.toLocaleString() || '0'}
                          </span>
                        </td>

                        {/* estado */}
                        <td className="pd-td">
                          <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'#f0fdf4',color:'#16a34a',fontSize:11,fontWeight:700,border:'1px solid rgba(22,163,74,.15)'}}>
                            <CheckCircle size={12}/> Completada
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* pie */}
            <div className="pd-tfoot">
              <span style={{fontSize:11,color:'#86868b',fontVariantNumeric:'tabular-nums'}}>
                {consultas.length} consulta{consultas.length!==1?'s':''}
              </span>
              <span style={{fontSize:11,color:'#c0c0c5'}}>
                Total facturado: <span className="pd-mono" style={{fontWeight:600,color:'#1d1d1f'}}>${totalPagado.toLocaleString()}</span>
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
      />

      <EditPatientModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        patient={editingPatient}
        onSave={(updatedPatient) => {
          setSelectedPatient(updatedPatient);
        }}
      />

      {historyOpen && (
        <div style={{position:'fixed',inset:0,zIndex:1100,background:'rgba(15,23,42,.45)',backdropFilter:'blur(3px)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{width:'100%',maxWidth:'960px',background:'#fff',borderRadius:'16px',boxShadow:'0 20px 48px rgba(15,23,42,.30)',overflow:'hidden'}}>
            <div style={{padding:'14px 16px',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',gap:8}}>
                <button
                  className={`pd-btn-secondary ${historyMode==='view' ? 'active' : ''}`}
                  onClick={()=>setHistoryMode('view')}
                >Ver</button>
                <button
                  className={`pd-btn-secondary ${historyMode==='edit' ? 'active' : ''}`}
                  onClick={()=>setHistoryMode('edit')}
                >Editar</button>
              </div>
              <button onClick={()=>setHistoryOpen(false)} style={{border:'none',background:'#f8fafc',borderRadius:999,padding:'6px',cursor:'pointer'}}><X size={16}/></button>
            </div>

            {historyMode==='view' ? (
              <div style={{maxHeight:'80vh',overflowY:'auto',padding:'24px 28px',fontFamily:'Inter,system-ui',color:'#0f172a'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:24}}>
                  <div>
                    <div style={{textTransform:'uppercase',letterSpacing:'.22em',fontSize:11,fontWeight:700,color:'#2563eb'}}>EstDent Clinic</div>
                    <h3 style={{margin:'12px 0 6px',fontSize:26,fontWeight:800,color:'#0f172a'}}>Ficha Médica</h3>
                    <p style={{margin:0,fontSize:14,color:'#475569',maxWidth:560}}>Consulta la historia clínica organizada en tarjetas limpias, con identidad visual premium y clave médica.</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',borderRadius:18,background:'#eff6ff',border:'1px solid rgba(37,99,235,.16)'}}>
                    <div style={{width:42,height:42,display:'grid',placeItems:'center',borderRadius:14,background:'#fff',boxShadow:'0 18px 40px rgba(15,23,42,0.06)',fontSize:20}}>🩺</div>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#2563eb'}}>Paciente</div>
                      <div style={{fontSize:15,fontWeight:700,color:'#0f172a'}}>{selectedPatient.nombre} {selectedPatient.apellidos}</div>
                    </div>
                  </div>
                </div>

                {loadingHistory ? (
                  <p>Cargando historia clínica...</p>
                ) : hasClinicalHistory ? (
                  <div style={{display:'grid',gap:18}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
                      <div style={{padding:22,background:'#fff',borderRadius:24,boxShadow:'0 24px 60px rgba(15,23,42,0.08)',border:'1px solid rgba(148,163,184,0.18)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                          <span style={{fontSize:20}}></span>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>Hábitos</div>
                            <div style={{fontSize:12,color:'#64748b'}}>Rutina y estilo de vida</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gap:12,color:'#334155',fontSize:14}}>
                          <div><strong>Tabaco:</strong> {renderValue(clinicalHistory?.habitos?.fuma)}</div>
                          <div><strong>Alcohol:</strong> {renderValue(clinicalHistory?.habitos?.alcohol)}</div>
                          <div><strong>Deportes:</strong> {renderValue(clinicalHistory?.habitos?.deportes)}</div>
                          <div><strong>Sueño:</strong> {renderValue(clinicalHistory?.habitos?.sueno)}</div>
                          <div><strong>Estrés:</strong> {renderValue(clinicalHistory?.habitos?.estres)}</div>
                          <div><strong>Higiene:</strong> {renderValue(clinicalHistory?.habitos?.higiene_frecuencia)} veces por día</div>
                        </div>
                      </div>
                      <div style={{padding:22,background:'#fff',borderRadius:24,boxShadow:'0 24px 60px rgba(15,23,42,0.08)',border:'1px solid rgba(148,163,184,0.18)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                          <span style={{fontSize:20}}></span>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>Antecedentes</div>
                            <div style={{fontSize:12,color:'#64748b'}}>Condiciones actuales</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gap:12,color:'#334155',fontSize:14}}>
                          <div><strong>Diabetes:</strong> {renderValue(clinicalHistory?.sistemico?.diabetes)}</div>
                          <div><strong>Hipertensión:</strong> {renderValue(clinicalHistory?.sistemico?.hipertension)}</div>
                          <div><strong>Cardiopatías:</strong> {renderValue(clinicalHistory?.sistemico?.cardiopatias)}</div>
                          <div><strong>Asma:</strong> {renderValue(clinicalHistory?.sistemico?.asma)}</div>
                          <div><strong>Cáncer:</strong> {renderValue(clinicalHistory?.sistemico?.cancer)}</div>
                          <div><strong>Alergias:</strong> {renderValue(clinicalHistory?.sistemico?.alergias_gen)}</div>
                          <div><strong>Renales:</strong> {renderValue(clinicalHistory?.sistemico?.renales)}</div>
                          <div><strong>Hepáticas:</strong> {renderValue(clinicalHistory?.sistemico?.hepaticas)}</div>
                          <div><strong>VIH:</strong> {renderValue(clinicalHistory?.sistemico?.vih)}</div>
                          <div><strong>Otros sistemas:</strong> {renderValue(clinicalHistory?.sistemico?.otros_sistemas)}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>
                      <div style={{padding:22,background:'#fff',borderRadius:24,boxShadow:'0 24px 60px rgba(15,23,42,0.08)',border:'1px solid rgba(148,163,184,0.18)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                          <span style={{fontSize:20}}></span>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>Historia Dental</div>
                            <div style={{fontSize:12,color:'#64748b'}}>Detalles de consulta</div>
                          </div>
                        </div>
                        <div style={{display:'grid',gap:12,color:'#334155',fontSize:14}}>
                          <div><strong>Última visita:</strong> {renderValue(clinicalHistory?.odontologico?.ultima_visita)}</div>
                          <div><strong>Motivo:</strong> {renderValue(clinicalHistory?.odontologico?.motivo_consulta)}</div>
                          <div><strong>Experiencia previa:</strong> {renderValue(clinicalHistory?.odontologico?.experiencia_previa)}</div>
                          <div><strong>Sangrado de encías:</strong> {renderValue(clinicalHistory?.odontologico?.sangrado_encias)}</div>
                          <div><strong>Bruxismo:</strong> {renderValue(clinicalHistory?.odontologico?.bruxismo)}</div>
                          <div><strong>Diagnóstico inicial:</strong> {renderValue(clinicalHistory?.odontologico?.diagnostico_inicial)}</div>
                          <div><strong>Plan de tratamiento:</strong> {renderValue(clinicalHistory?.odontologico?.plan_tratamiento)}</div>
                        </div>
                      </div>
                      <div style={{padding:22,background:'#fff',borderRadius:24,boxShadow:'0 24px 60px rgba(15,23,42,0.08)',border:'1px solid rgba(148,163,184,0.18)'}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                          <span style={{fontSize:20}}></span>
                          <div>
                            <div style={{fontSize:13,fontWeight:700,color:'#2563eb'}}>Observaciones</div>
                            <div style={{fontSize:12,color:'#64748b'}}>Notas finales</div>
                          </div>
                        </div>
                        <p style={{margin:0,fontSize:14,color:'#334155',lineHeight:1.8}}>{renderValue(clinicalHistory?.observaciones_finales)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{padding:18,textAlign:'center',color:'#475569'}}>
                    <p style={{fontSize:14,fontWeight:600}}>No hay historia clínica registrada para este paciente.</p>
                    <p style={{fontSize:12,color:'#64748b',marginTop:6}}>Cambia a la pestaña Editar para crear la historia.</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{maxHeight:'80vh',overflowY:'auto'}}>
                <FullClinicalHistory
                  patientId={selectedPatient?.id || ''}
                  initialData={selectedPatient?.clinical_history || {}}
                  saveLabel="Guardar Cambios"
                  onSave={(history: any) => {
                    if (selectedPatient) {
                      setSelectedPatient({ ...selectedPatient, clinical_history: history, historia_completa: true });
                    }
                    setHistoryMode('view');
                  }}
                  onComplete={() => setHistoryMode('view')}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};