import React from 'react';

interface NewConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'odontologia' | 'ortodoncia') => void;
}

export const NewConsultModal = ({ isOpen, onClose, onSelect }: NewConsultModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Nueva Consulta</h2>
        <p>Seleccione el tipo de consulta:</p>
        
        <button
          onClick={() => onSelect('odontologia')}
          className="modal-option odontologia"
        >
          🦷 Odontología General
        </button>
        
        <button
          onClick={() => onSelect('ortodoncia')}
          className="modal-option ortodoncia"
        >
          😬 Ortodoncia
        </button>

        <button
          onClick={onClose}
          className="modal-cancel"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};