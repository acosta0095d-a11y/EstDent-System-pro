import { useEffect, useState } from 'react';
import { usePatient } from '../../../core/context/PatientContext';

export const OrthoConsultation = ({ onExit }: { onExit: () => void }) => {
  const { selectedPatient } = usePatient();
  const [tiempo, setTiempo] = useState(0);
  const [formData, setFormData] = useState({
    arcoSuperior: '',
    arcoInferior: '',
    elasticos: '',
    observaciones: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setTiempo(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!selectedPatient) return null;

  return (
    <div style={{ padding: '20px' }}>
      {/* Header con temporizador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2>😬 Ortodoncia (Brackets) - {selectedPatient.nombre}</h2>
        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
          ⏱️ {new Date(tiempo * 1000).toISOString().substr(11, 8)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Columna izquierda: Odontograma Ortodoncia */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>😬 Mapa de Brackets</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '5px', marginTop: '20px' }}>
            {[...Array(32)].map((_, i) => (
              <div key={i} style={{
                width: '40px',
                height: '40px',
                background: '#f0f0f0',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid #0284c7'
              }}>
                {i + 11}
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: Formulario Ortodoncia */}
        <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h3>📏 Control Ortodoncia</h3>
          
          <div style={{ marginTop: '15px' }}>
            <label>Arco Superior:</label>
            <select
              value={formData.arcoSuperior}
              onChange={e => setFormData({...formData, arcoSuperior: e.target.value})}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Seleccionar</option>
              <option value="0.12 Niti">0.12 Niti</option>
              <option value="0.14 Niti">0.14 Niti</option>
              <option value="0.16 Niti">0.16 Niti</option>
              <option value="0.16 Acero">0.16 Acero</option>
              <option value="0.18 Acero">0.18 Acero</option>
            </select>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label>Arco Inferior:</label>
            <select
              value={formData.arcoInferior}
              onChange={e => setFormData({...formData, arcoInferior: e.target.value})}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="">Seleccionar</option>
              <option value="0.12 Niti">0.12 Niti</option>
              <option value="0.14 Niti">0.14 Niti</option>
              <option value="0.16 Niti">0.16 Niti</option>
              <option value="0.16 Acero">0.16 Acero</option>
              <option value="0.18 Acero">0.18 Acero</option>
            </select>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label>Elásticos:</label>
            <input
              type="text"
              value={formData.elasticos}
              onChange={e => setFormData({...formData, elasticos: e.target.value})}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
              placeholder="Ej: 3/16 medianos"
            />
          </div>

          <div style={{ marginTop: '15px' }}>
            <label>Observaciones:</label>
            <textarea
              value={formData.observaciones}
              onChange={e => setFormData({...formData, observaciones: e.target.value})}
              style={{ width: '100%', height: '80px', marginTop: '5px' }}
            />
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={onExit}>Finalizar</button>
            <button onClick={onExit}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
};