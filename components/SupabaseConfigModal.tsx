import React, { useState } from 'react';
import { Database, Lock, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { SupabaseCredentials } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (creds: SupabaseCredentials) => void;
  currentCreds: SupabaseCredentials;
}

export const SupabaseConfigModal: React.FC<Props> = ({ isOpen, onClose, onSave, currentCreds }) => {
  const [url, setUrl] = useState(currentCreds.url);
  const [key, setKey] = useState(currentCreds.key);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-800">
            <Database className="text-primary" />
            <h2 className="text-lg font-bold">Configuração Supabase</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded text-amber-800 text-sm flex items-start gap-3">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-bold">Modo de Demonstração</p>
              <p className="mt-1">Se não preencher, o app usará dados locais simulados. Para persistência real, insira suas credenciais do projeto Supabase.</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Project URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none"
              placeholder="https://xyz.supabase.co"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Anon Public Key</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full pl-9 p-2 text-sm border border-slate-300 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary outline-none"
                placeholder="eyJh..."
              />
            </div>
          </div>
          
          <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-100 rounded border border-slate-200">
             Crie a tabela com este SQL no Supabase:
             <pre className="mt-1 font-mono bg-slate-800 text-slate-200 p-2 rounded overflow-x-auto text-[10px] leading-relaxed">
{`CREATE TABLE public.atendentes (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL,
  nome VARCHAR(100) NOT NULL,
  status BOOLEAN DEFAULT true,
  em_atendimento BOOLEAN DEFAULT false,
  cliente_nome VARCHAR(100),
  cliente_numero VARCHAR(20),
  posicao_fila INTEGER DEFAULT 0
);`}
             </pre>
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">
            Cancelar
          </button>
          <button 
            onClick={() => onSave({ url, key })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded shadow-sm"
          >
            <CheckCircle size={16} />
            Salvar e Conectar
          </button>
        </div>
      </div>
    </div>
  );
};