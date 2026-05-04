import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { patientService } from '../services/patientService';
import { FullClinicalHistory } from '../components/FullClinicalHistory';
import { PATIENT_RH_OPTIONS, normalizePatientRh } from '../../../shared/lib/patientRhUtils';
import { 
  User, Phone, Calendar, Mail, ArrowRight, 
  Loader2, X, AlertCircle, MapPin, FileText, Shield, Contact
} from 'lucide-react';

const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'];

export const NewPatientWizard = ({ onClose, onComplete }: { onClose: () => void; onComplete?: () => void }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newPatientId, setNewPatientId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
  const today = new Date();
  const [birthInput, setBirthInput] = useState('');

  const [basicData, setBasicData] = useState({
    nombre: '', apellidos: '', tipo_documento: 'CC', cc: '', 
    telefono: '', fecha_nacimiento: '', municipio_ciudad: 'Colombia', direccion: '', email: '', estado: 'ACTIVO', tipo_sangre_rh: ''
  });

  const edadActual = useMemo(() => {
    if (!basicData.fecha_nacimiento) return null;
    const hoy = new Date();
    const nacimiento = new Date(basicData.fecha_nacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }, [basicData.fecha_nacimiento]);

  useEffect(() => {
    if (!basicData.fecha_nacimiento) {
      setBirthInput('');
      return;
    }
    const [year, month, day] = basicData.fecha_nacimiento.split('-');
    if (year && month && day) {
      setBirthInput(`${day}/${month}/${year}`);
    }
  }, [basicData.fecha_nacimiento]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (!digits) return '';
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setBasicData(prev => ({ ...prev, telefono: digits }));
  };

  const formatBirthText = (digits: string) => {
    const cleaned = digits.replace(/\D/g, '').slice(0, 8);
    if (!cleaned) return '';
    const parts = [cleaned.slice(0, 2)];
    if (cleaned.length > 2) parts.push(cleaned.slice(2, 4));
    if (cleaned.length > 4) parts.push(cleaned.slice(4, 8));
    return parts.join('/');
  };

  const isValidDate = (day: number, month: number, year: number) => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const buildIsoDate = (day: string, month: number, year: number) =>
    `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  const clampDay = (day: number, month: number, year: number) => {
    const max = new Date(year, month, 0).getDate();
    return Math.min(Math.max(1, day), max);
  };

  const handleBirthInputChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const formatted = formatBirthText(digits);
    setBirthInput(formatted);

    if (digits.length === 8) {
      const day = Number(digits.slice(0, 2));
      const month = Number(digits.slice(2, 4));
      const year = Number(digits.slice(4, 8));
      const iso = isValidDate(day, month, year) ? buildIsoDate(digits.slice(0, 2), month, year) : '';
      setBasicData(prev => ({ ...prev, fecha_nacimiento: iso }));
      return;
    }

    setBasicData(prev => ({ ...prev, fecha_nacimiento: '' }));
  };

  const handleKeyDigitOnly = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key.length === 1 && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const formatBirthInput = (value: string) => value.replace(/\D/g, '').slice(0, 8);

  const birthInvalid = birthInput.length === 10 && basicData.fecha_nacimiento === '';

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setBasicData({ ...basicData, email: val });
    if (val.includes('@') && !EMAIL_DOMAINS.some(d => val.endsWith(d))) {
      setShowEmailSuggestions(true);
    } else {
      setShowEmailSuggestions(false);
    }
  };

  const selectEmailDomain = (domain: string) => {
    const prefix = basicData.email.split('@')[0];
    setBasicData({ ...basicData, email: `${prefix}@${domain}` });
    setShowEmailSuggestions(false);
  };

  const handleSaveBasic = async () => {
    setErrorMessage(null);
      const cleanPhone = String(basicData.telefono).replace(/\D/g, '');
      if (!basicData.nombre || !basicData.apellidos || !basicData.cc || !basicData.fecha_nacimiento) {
        return setErrorMessage('Nombres, Apellidos, Identificación y Fecha de Nacimiento son obligatorios.');
      }
      if (cleanPhone && cleanPhone.length !== 10) {
        return setErrorMessage('El teléfono debe tener exactamente 10 dígitos.');
      }
      try {
        setLoading(true);

        const normalizedBirth = basicData.fecha_nacimiento ? String(basicData.fecha_nacimiento).slice(0, 10) : null;
        const payload = {
          cc: basicData.cc,
          tipo_documento: basicData.tipo_documento,
          nombre: basicData.nombre.trim(),
          apellidos: basicData.apellidos.trim(),
          fecha_nacimiento: normalizedBirth,
          telefono: cleanPhone,
          email: basicData.email || '',
          municipio_ciudad: basicData.municipio_ciudad || '',
          direccion: basicData.direccion || '',
          estado: basicData.estado || 'ACTIVO',
          tipo_sangre_rh: normalizePatientRh(basicData.tipo_sangre_rh)
        };

        console.log('Enviando datos...', payload);

      const response = await patientService.createPatient(payload);
      if (!response || response.length === 0) {
        throw new Error('No se pudo crear paciente. Verifica la conexión a la base de datos.');
      }

      const createdId = response[0].id;
      console.log('Paciente creado con ID:', createdId);
      setNewPatientId(createdId);
      if (onComplete) {
        onComplete();
      } else {
        setStep(2);
      }

    } catch (err: any) {
      console.error('Error de Supabase:', err);
      if (err?.code === '23505') {
        setErrorMessage("Este número de documento ya está registrado.");
      } else {
        const message = err?.message ? err.message : 'Error de conexión. Revisa los datos.';
        const details = err?.details ? ` Details: ${JSON.stringify(err.details)}` : '';
        const hint = err?.hint ? ` Hint: ${err.hint}` : '';
        setErrorMessage(`${message}${details}${hint}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    borderRadius: 10, border: '1.5px solid #e8edf2', padding: '11px 14px',
    fontSize: 13.5, fontWeight: 500, color: '#1e293b', outline: 'none',
    transition: 'border-color .18s, box-shadow .18s', fontFamily: 'inherit', width: '100%',
    background: '#fafbfc',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
    letterSpacing: '.08em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6,
  };
  const fieldBox: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 };

  /* card section wrapper */
  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
    boxShadow: '0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08)',
    overflow: 'hidden', transition: 'box-shadow .2s, transform .2s',
  };
  const cardHeaderStyle: React.CSSProperties = {
    padding: '16px 20px', borderBottom: '1px solid #eef2f7',
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  };
  const cardIconStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 11,
    background: 'linear-gradient(135deg, #e8edf4 0%, #dce3ed 100%)',
    border: '1px solid #d0d8e4',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,.06)',
  };
  const cardBodyStyle: React.CSSProperties = { padding: '20px 22px' };
  const contactCardStyle: React.CSSProperties = {
    ...cardStyle,
    overflow: 'visible',
    position: 'relative',
    zIndex: 4,
  };

  const focusIn = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor='#29b2e8'; e.currentTarget.style.boxShadow='0 0 0 3px rgba(41,178,232,.08)'; e.currentTarget.style.background='#fff'; };
  const focusOut = (e: React.FocusEvent<HTMLInputElement>) => { e.currentTarget.style.borderColor='#e8edf2'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.background='#fafbfc'; };

  return (
    <>
    <style>{`
      @keyframes npwSpin { to { transform:rotate(360deg); } }
      .npw-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08), 0 12px 32px rgba(0,0,0,.1) !important; transform: translateY(-1px); }
    `}</style>
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '16px',
      background: 'rgba(15,23,42,.18)', backdropFilter: 'blur(8px)',
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #f0f3f7 0%, #e8ecf1 100%)', width: '100%', maxWidth: 780, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: 22, border: '1px solid #d5dbe4',
        boxShadow: '0 4px 8px rgba(0,0,0,.06), 0 16px 48px rgba(15,23,42,.18), 0 48px 96px rgba(15,23,42,.12)',
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '20px 26px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,.04)',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:44,height:44,borderRadius:12,background:'linear-gradient(135deg, #e8edf4 0%, #dce3ed 100%)',border:'1px solid #d0d8e4',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px rgba(0,0,0,.07)'}}>
              <FileText size={20} style={{color:'#475569'}}/>
            </div>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
                <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', letterSpacing: '-.02em', margin: 0, lineHeight: 1.2 }}>
                  {step === 1 ? 'Nuevo Paciente' : 'Historia Clínica'}
                </h1>
                {/* step indicator */}
                <span style={{
                  padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'.06em',
                  background: step === 1 ? '#e0f2fe' : '#dcfce7',
                  color: step === 1 ? '#0369a1' : '#166534',
                }}>
                  Paso {step} de 2
                </span>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 12.5, margin: 0, fontWeight: 500 }}>
                {step === 1 ? 'Datos de identificación y contacto' : 'Antecedentes médicos del paciente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 10, border: '1.5px solid #e2e8f0',
            background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#64748b', transition: 'all .15s', flexShrink: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={15}/>
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="npw-scroll" style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
          {errorMessage && (
            <div style={{ marginBottom: 18, padding: '11px 15px', background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircle size={15}/>
              <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{errorMessage}</p>
            </div>
          )}

          {step === 1 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* ═══ CARD: Identificación Personal ═══ */}
              <div className="npw-card" style={{...cardStyle, gridColumn:'1/-1'}}>
                <div style={cardHeaderStyle}>
                  <div style={cardIconStyle}><User size={17} style={{color:'#475569'}}/></div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Identificación Personal</div>
                    <div style={{fontSize:11.5,color:'#94a3b8',fontWeight:500}}>Nombre completo y documento</div>
                  </div>
                </div>
                <div style={{...cardBodyStyle, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 16px'}}>
                  <div style={fieldBox}>
                    <label style={lbl}>Nombres</label>
                    <input type="text" placeholder="Ej. Carlos Andres" style={inp} value={basicData.nombre}
                      onChange={e => setBasicData({...basicData, nombre: e.target.value})}
                      onFocus={focusIn} onBlur={focusOut}/>
                  </div>
                  <div style={fieldBox}>
                    <label style={lbl}>Apellidos</label>
                    <input type="text" placeholder="Ej. Perez Acosta" style={inp} value={basicData.apellidos}
                      onChange={e => setBasicData({...basicData, apellidos: e.target.value})}
                      onFocus={focusIn} onBlur={focusOut}/>
                  </div>
                  <div style={fieldBox}>
                    <label style={lbl}><Shield size={11}/> Identificación</label>
                    <div style={{ display:'flex', borderRadius:10, border:'1.5px solid #e8edf2', overflow:'hidden', background:'#fafbfc', transition:'border-color .18s' }}
                      onFocusCapture={e => { e.currentTarget.style.borderColor='#29b2e8'; e.currentTarget.style.background='#fff'; }}
                      onBlurCapture={e => { e.currentTarget.style.borderColor='#e8edf2'; e.currentTarget.style.background='#fafbfc'; }}
                    >
                      <select style={{ width:72, background:'#f0f4f8', padding:'11px 6px 11px 10px', fontWeight:700, fontSize:12, color:'#64748b', border:'none', borderRight:'1.5px solid #e8edf2', outline:'none', cursor:'pointer', fontFamily:'inherit' }}
                        value={basicData.tipo_documento} onChange={e => setBasicData({...basicData, tipo_documento: e.target.value})}>
                        <option value="CC">CC</option>
                        <option value="TI">TI</option>
                        <option value="CE">CE</option>
                        <option value="RC">RC</option>
                      </select>
                      <input type="text" placeholder="Número..." style={{ flex:1, background:'transparent', outline:'none', fontWeight:600, fontSize:13.5, color:'#1e293b', padding:'11px 12px', border:'none', fontFamily:'inherit' }}
                        value={basicData.cc} onChange={e => setBasicData({...basicData, cc: e.target.value.replace(/\D/g,'')})}/>
                    </div>
                  </div>
                  <div style={fieldBox}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <label style={lbl}><Calendar size={11}/> Nacimiento</label>
                      {edadActual !== null && (
                        <span style={{ padding:'2px 9px', borderRadius:20, fontSize:10, fontWeight:700, background:'#e0f5fd', color:'#0e7da8', border:'1px solid #b3e8f8' }}>
                          {edadActual} años
                        </span>
                      )}
                    </div>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="DD / MM / AAAA"
                      style={{ ...inp, border: birthInvalid ? '1.5px solid #ef4444' : '1.5px solid #e8edf2', fontWeight:700, letterSpacing:'.12em' }}
                      onFocus={e => { if(!birthInvalid) focusIn(e); }}
                      onBlur={e => { if(!birthInvalid) focusOut(e); }}
                      value={birthInput} onChange={e => handleBirthInputChange(e.target.value)} onKeyDown={handleKeyDigitOnly}/>
                    <p style={{ fontSize:10.5, color:'#b8bcc8', margin:0 }}>DD/MM/AAAA · Edad calculada automáticamente</p>
                  </div>
                  <div style={fieldBox}>
                    <label style={lbl}>Tipo de Sangre / RH</label>
                    <select
                      style={{ ...inp, cursor:'pointer', fontWeight:600 }}
                      value={basicData.tipo_sangre_rh}
                      onChange={e => setBasicData({ ...basicData, tipo_sangre_rh: e.target.value })}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = '#29b2e8';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,178,232,.08)';
                        e.currentTarget.style.background = '#fff';
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = '#e8edf2';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = '#fafbfc';
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {PATIENT_RH_OPTIONS.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ═══ CARD: Contacto ═══ */}
              <div className="npw-card" style={contactCardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={cardIconStyle}><Contact size={17} style={{color:'#475569'}}/></div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Contacto</div>
                    <div style={{fontSize:11.5,color:'#94a3b8',fontWeight:500}}>Teléfono y correo</div>
                  </div>
                </div>
                <div style={{...cardBodyStyle, display:'flex', flexDirection:'column', gap:14, overflow:'visible'}}>
                  <div style={fieldBox}>
                    <label style={lbl}><Phone size={11}/> Celular</label>
                    <div style={{ display:'flex', borderRadius:10, border:'1.5px solid #e8edf2', overflow:'hidden', background:'#fafbfc', transition:'border-color .18s' }}
                      onFocusCapture={e => { e.currentTarget.style.borderColor='#29b2e8'; e.currentTarget.style.background='#fff'; }}
                      onBlurCapture={e => { e.currentTarget.style.borderColor='#e8edf2'; e.currentTarget.style.background='#fafbfc'; }}
                    >
                      <div style={{ background:'#f0f4f8', padding:'11px 12px', fontSize:11, fontWeight:700, color:'#64748b', borderRight:'1.5px solid #e8edf2', whiteSpace:'nowrap' }}>+57</div>
                      <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="300 123 4567"
                        style={{ flex:1, background:'transparent', border:'none', outline:'none', padding:'11px 12px', fontSize:13.5, color:'#1e293b', fontWeight:600, letterSpacing:'.06em', fontFamily:'inherit' }}
                        value={formatPhone(basicData.telefono)} onChange={e => handlePhoneChange(e.target.value)} onKeyDown={handleKeyDigitOnly}/>
                    </div>
                    <p style={{ fontSize:10.5, color:'#b8bcc8', margin:0 }}>10 dígitos — Colombia</p>
                  </div>
                  <div style={{ ...fieldBox, position:'relative' }}>
                    <label style={lbl}><Mail size={11}/> Correo <span style={{ fontWeight:400, color:'#cbd5e1', textTransform:'none', letterSpacing:0 }}>(opcional)</span></label>
                    <input type="email" placeholder="paciente@gmail.com" style={inp} value={basicData.email}
                      onChange={handleEmailChange} onFocus={focusIn} onBlur={focusOut}/>
                    {showEmailSuggestions && (
                      <div style={{ position:'absolute', top:'100%', marginTop:5, left:0, width:'100%', background:'#fff', border:'1.5px solid #e8edf2', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,.1)', zIndex:40, overflow:'hidden' }}>
                        {EMAIL_DOMAINS.map(domain => {
                          const prefix = basicData.email.split('@')[0];
                          return (
                            <button key={domain} onClick={() => selectEmailDomain(domain)}
                              style={{ width:'100%', textAlign:'left', padding:'9px 14px', fontSize:12.5, color:'#475569', background:'transparent', border:'none', borderBottom:'1px solid #f5f6f8', cursor:'pointer', transition:'background .12s', fontFamily:'inherit' }}
                              onMouseEnter={e => { e.currentTarget.style.background='#f0fafe'; e.currentTarget.style.color='#29b2e8'; }}
                              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#475569'; }}
                            >
                              {prefix}<span style={{ fontWeight:700, color:'#1e293b' }}>@{domain}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ═══ CARD: Ubicación ═══ */}
              <div className="npw-card" style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <div style={cardIconStyle}><MapPin size={17} style={{color:'#475569'}}/></div>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'#1e293b'}}>Ubicación</div>
                    <div style={{fontSize:11.5,color:'#94a3b8',fontWeight:500}}>Municipio y dirección</div>
                  </div>
                </div>
                <div style={{...cardBodyStyle, display:'flex', flexDirection:'column', gap:14}}>
                  <div style={fieldBox}>
                    <label style={lbl}>Municipio / Ciudad</label>
                    <input type="text" placeholder="Ej. Bogotá" style={inp} value={basicData.municipio_ciudad === 'Colombia' ? '' : basicData.municipio_ciudad}
                      onChange={e => setBasicData({...basicData, municipio_ciudad: e.target.value})}
                      onFocus={focusIn} onBlur={focusOut}/>
                  </div>
                  <div style={fieldBox}>
                    <label style={lbl}>Dirección</label>
                    <input type="text" placeholder="Ej. Calle 50 #30-20" style={inp} value={basicData.direccion || ''}
                      onChange={e => setBasicData({...basicData, direccion: e.target.value})}
                      onFocus={focusIn} onBlur={focusOut}/>
                  </div>
                </div>
              </div>

              {/* ── CTA ── */}
              <div style={{ gridColumn:'1/-1', marginTop: 4 }}>
                <button type="button" onClick={handleSaveBasic} disabled={loading} style={{
                  width:'100%', padding:'13px 24px', border:'none', borderRadius:12,
                  background: '#29b2e8', color:'#fff', fontSize:13, fontWeight:700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                  fontFamily:'inherit', letterSpacing:'.06em', textTransform:'uppercase',
                  boxShadow:'0 2px 6px rgba(41,178,232,.35), 0 8px 24px rgba(41,178,232,.22)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                  transition:'all .18s',
                }}
                  onMouseEnter={e => { if(!loading){ e.currentTarget.style.background='#18a3db'; e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(41,178,232,.3)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background='#29b2e8'; e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(41,178,232,.3),0 6px 20px rgba(41,178,232,.18)'; }}
                >
                  {loading ? <Loader2 size={17} style={{ animation:'npwSpin 1s linear infinite' }}/> : <><ArrowRight size={16}/> Guardar e Iniciar Historia</>}
                </button>
              </div>
            </div>
          ) : (
            newPatientId && (
              <FullClinicalHistory
                patientId={newPatientId}
                onSave={() => { onClose(); }}
                onBack={() => setStep(1)}
              />
            )
          )}
        </div>
      </div>
    </div>
    </>
  );
};