import { useEffect, useState } from 'react';
import { usePatient } from '../../../core/context/PatientContext';

interface Props {
  onExit: () => void;
}

export const OrthoConsultation = ({ onExit }: Props) => {
  const { selectedPatient } = usePatient();
  const [tiempo, setTiempo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTiempo(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!selectedPatient) return <div>No hay paciente</div>;

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ color: '#00A4E4' }}>😬 Consulta Ortodoncia</h1>
      <p>Paciente: {selectedPatient.nombre} {selectedPatient.apellidos}</p>
      <p>Tiempo: {tiempo} segundos</p>
      <button onClick={onExit}>Finalizar</button>
    </div>
  );
};