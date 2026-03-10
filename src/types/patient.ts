export interface Patient {
  id: string;
  cc: string;
  nombre: string;
  edad: number;
  sangre: string;
  sexo: 'M' | 'F' | string;
  celular: string;
  correo: string;
  ciudad: string;
  fechaRegistro: string;
  totalCitas: number;
  ultimaVisita: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export type ViewType = 'inicio' | 'pacientes' | 'agenda' | 'inventario' | 'ajustes';
