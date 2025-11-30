import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  agentName: string;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agentName 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 scale-100 animate-bounce-in">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
            <AlertTriangle size={32} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
            Confirmar Exclusão
          </h3>
          
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Você tem certeza que deseja remover o atendente <strong className="text-slate-800 dark:text-white">{agentName}</strong>?
            <br/>
            Esta ação não pode ser desfeita.
          </p>
          
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-500/30 flex items-center gap-2 transition-all active:scale-95 text-sm"
            >
              <Trash2 size={16} />
              Sim, Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};