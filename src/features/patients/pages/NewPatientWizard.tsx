import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { patientService } from '../services/patientService';
import { FullClinicalHistory } from '../components/FullClinicalHistory';
import { 
  User, Phone, Calendar, Mail, ArrowRight, 
  Loader2, X, AlertCircle, Sparkles 
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
    telefono: '', fecha_nacimiento: '', municipio_ciudad: 'Colombia', email: '', estado: 'ACTIVO'
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
          estado: basicData.estado || 'ACTIVO'
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

  return (
    <div className="fixed inset-0 bg-slate-100/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 lg:p-8 animate-in fade-in duration-300">
      <div className="bg-white rounded-[1.5rem] shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden font-sans border border-slate-200">
        
        <div className="bg-white p-8 text-slate-900 relative flex-shrink-0 border-b border-slate-200">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all">
            <X size={20}/>
          </button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-widest border flex items-center gap-1.5 ${step === 1 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
              <Sparkles size={12}/> {step === 1 ? 'PASO 1 DE 2' : 'PASO 2 DE 2'}
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {step === 1 ? 'Identidad del Paciente' : 'Historia Clínica Completa'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {step === 1 ? 'Ingresa los datos legales de registro.' : 'Diligencia el expediente médico inicial del paciente.'}
          </p>
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {errorMessage && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle size={20}/>
              <p className="text-sm font-bold">{errorMessage}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4">
              <div className="space-y-3">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.28em] flex items-center gap-2"><User size={14}/> Nombres</label>
                <input type="text" placeholder="Ej. Carlos Andrés" className="input-pro w-full font-medium text-slate-700" 
                  value={basicData.nombre} onChange={(e) => setBasicData({...basicData, nombre: e.target.value})} />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.28em]">Apellidos</label>
                <input type="text" placeholder="Ej. Pérez Acosta" className="input-pro w-full font-medium text-slate-700"
                  value={basicData.apellidos} onChange={(e) => setBasicData({...basicData, apellidos: e.target.value})} />
              </div>

              <div className="space-y-3 md:col-span-2 lg:col-span-1">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.28em]">Identificación</label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-3xl p-1 transition-all focus-within:ring-2 focus-within:ring-[var(--estdent-blue)]/20">
                  <select 
                    className="w-28 bg-transparent pl-4 pr-2 py-4 font-bold text-slate-600 border-r border-slate-200 outline-none cursor-pointer"
                    value={basicData.tipo_documento} onChange={(e) => setBasicData({...basicData, tipo_documento: e.target.value})}
                  >
                    <option value="CC">CC</option>
                    <option value="TI">TI</option>
                    <option value="CE">CE</option>
                    <option value="RC">RC</option>
                  </select>
                  <input type="text" placeholder="Número..." className="flex-1 bg-transparent outline-none font-semibold text-slate-700"
                    value={basicData.cc} onChange={(e) => setBasicData({...basicData, cc: e.target.value.replace(/\D/g, '')})} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={14}/> Nacimiento
                  </label>
                  {edadActual !== null && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                      {edadActual} años
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="DD / MM / AAAA"
                  className={`input-pro w-full font-bold tracking-[0.18em] text-slate-700 ${birthInvalid ? 'border-rose-400 ring-2 ring-rose-100' : ''}`}
                  value={birthInput}
                  onChange={(e) => handleBirthInputChange(e.target.value)}
                  onKeyDown={handleKeyDigitOnly}
                />
                <p className="text-[11px] text-slate-400">Formato DD/MM/AAAA. El sistema calcula la edad en vivo.</p>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Celular</label>
                 <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-[var(--estdent-blue)]/20 focus-within:border-[var(--estdent-blue)]">
                   <div className="bg-slate-100 px-4 py-3 text-slate-600 text-sm font-semibold">
                     +57
                   </div>
                   <input
                     type="text"
                     inputMode="numeric"
                     pattern="[0-9]*"
                     placeholder="300 123 4567"
                     className="flex-1 bg-transparent border-none outline-none py-3 px-4 text-slate-700 font-semibold tracking-[0.12em]"
                     value={formatPhone(basicData.telefono)}
                     onChange={(e) => handlePhoneChange(e.target.value)}
                     onKeyDown={handleKeyDigitOnly}
                   />
                 </div>
                 <p className="text-[11px] text-slate-400">Celular colombiano exacto de 10 dígitos.</p>
              </div>

              <div className="space-y-3 relative">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.28em] flex items-center gap-2"><Mail size={14}/> Correo (Opcional)</label>
                <input type="email" placeholder="paciente@..." className="input-pro w-full font-medium text-slate-700"
                  value={basicData.email} onChange={handleEmailChange} />
                
                {showEmailSuggestions && (
                  <div className="absolute top-[100%] mt-2 left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    {EMAIL_DOMAINS.map(domain => {
                      const prefix = basicData.email.split('@')[0];
                      return (
                        <button key={domain} onClick={() => selectEmailDomain(domain)} className="w-full text-left px-5 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium border-b border-slate-50 last:border-0">
                          {prefix}<span className="font-bold text-slate-900">@{domain}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <button type="button" onClick={handleSaveBasic} className="btn-blue md:col-span-2 mt-10 py-5 rounded-[1.5rem] font-bold shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase tracking-widest text-xs">
                {loading ? <Loader2 className="animate-spin" /> : <>Guardar e Iniciar Historia <ArrowRight size={18}/></>}
              </button>
            </div>
          ) : (
            /* PASO 2: COMPONENTE SEPARADO */
            newPatientId && (
              <FullClinicalHistory 
                patientId={newPatientId} 
                onSave={() => {
                  onClose();
                }}
                onBack={() => setStep(1)} 
              />
            )
          )}
        </div>
      </div>
    </div>
  );
};