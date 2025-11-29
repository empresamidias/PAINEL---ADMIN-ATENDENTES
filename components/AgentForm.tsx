import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone } from 'lucide-react';
import { Agent } from '../types';

interface AgentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (agentData: Partial<Agent>) => void;
  editingAgent?: Agent | null;
}

export const AgentForm: React.FC<AgentFormProps> = ({ isOpen, onClose, onSubmit, editingAgent }) => {
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [status, setStatus] = useState(true);

  useEffect(() => {
    if (editingAgent) {
      setNome(editingAgent.nome);
      setNumero(editingAgent.numero);
      setStatus(editingAgent.status);
    } else {
      setNome('');
      setNumero('');
      setStatus(true);
    }
  }, [editingAgent, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      nome,
      numero,
      status,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">
            {editingAgent ? 'Editar Atendente' : 'Novo Atendente'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Ex: Maria Silva"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Número / Ramal</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="Ex: 4002-8922 ou Ramal 10"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status Inicial</span>
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={status} 
                  onChange={(e) => setStatus(e.target.checked)}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${status ? 'bg-success' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${status ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm text-slate-600 dark:text-slate-400">{status ? 'Disponível' : 'Indisponível'}</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md shadow-blue-500/30 transition-all hover:-translate-y-0.5"
            >
              <Save size={18} />
              {editingAgent ? 'Salvar Alterações' : 'Adicionar Atendente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};