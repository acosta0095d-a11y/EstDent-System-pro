import React from 'react';
import { Stethoscope, Smile } from 'lucide-react';

interface NewConsultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'odontologia' | 'ortodoncia') => void;
}

export const NewConsultModal = ({ isOpen, onClose, onSelect }: NewConsultModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .modal-overlay, .modal-overlay * { 
          font-family: system-ui, -apple-system, sans-serif; 
          box-sizing: border-box; 
        }
        
        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(15, 23, 42, 0.4);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 9999; 
          padding: 20px; 
        }
        
        .modal-content { 
          background: white;
          border-radius: 12px; 
          width: 100%;
          max-width: 480px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          position: relative;
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }
        
        .modal-close { 
          position: absolute; 
          top: 12px; 
          right: 12px; 
          background: transparent;
          border: 1px solid #e5e7eb;
          cursor: pointer; 
          padding: 6px 7px; 
          border-radius: 6px; 
          color: #6b7280; 
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          width: 32px;
          height: 32px;
          font-size: 18px;
        }
        
        .modal-close:hover { 
          background: #f3f4f6;
          color: #111827;
          border-color: #d1d5db;
        }
        
        .modal-header {
          padding: 24px;
          text-align: center;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          background: #eff6ff;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          font-size: 24px;
        }
        
        .modal-title { 
          font-size: 20px; 
          font-weight: 600; 
          color: #111827; 
          margin-bottom: 4px;
        }
        
        .modal-subtitle { 
          color: #6b7280; 
          font-size: 13px; 
          margin-bottom: 0;
          font-weight: 400;
        }
        
        .modal-body { 
          padding: 24px; 
        }
        
        .modal-subtitle-body {
          font-size: 11px;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 12px;
          display: block;
        }
        
        .modal-options { 
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        
        .modal-option { 
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px;
          border: 1px solid #e5e7eb;
          border-radius: 8px; 
          background: white;
          color: #1f2937; 
          font-size: 14px; 
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          gap: 8px;
        }
        
        .modal-option:hover { 
          background: #f9fafb;
          border-color: #3b82f6;
          color: #3b82f6;
        }
        
        .modal-option-icon {
          font-size: 24px;
        }
        
        .modal-option-text {
          font-size: 13px;
          font-weight: 600;
        }
        
        .modal-cancel { 
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%; 
          padding: 10px 16px; 
          border: 1px solid #d1d5db;
          background: white;
          color: #6b7280; 
          border-radius: 8px; 
          font-size: 14px; 
          font-weight: 500; 
          cursor: pointer; 
          transition: all 0.2s ease;
        }
        
        .modal-cancel:hover { 
          background: #f3f4f6;
          border-color: #9ca3af;
          color: #374151;
        }
      `}</style>
      
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>✕</button>
          
          <div className="modal-header">
            <div className="modal-icon">📋</div>
            <h2 className="modal-title">Nueva Consulta</h2>
            <p className="modal-subtitle">Selecciona el tipo de atención</p>
          </div>
          
          <div className="modal-body">
            <span className="modal-subtitle-body">Tipo de Consulta</span>
            
            <div className="modal-options">
              <button
                onClick={() => onSelect('odontologia')}
                className="modal-option"
              >
                <span className="modal-option-icon">🦷</span>
                <span className="modal-option-text">Odontología</span>
              </button>
              
              <button
                onClick={() => onSelect('ortodoncia')}
                className="modal-option"
              >
                <span className="modal-option-icon">😁</span>
                <span className="modal-option-text">Ortodoncia</span>
              </button>
            </div>
            
            <button
              onClick={onClose}
              className="modal-cancel"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};