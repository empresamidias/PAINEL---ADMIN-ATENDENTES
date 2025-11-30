import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Edit2, User, Phone, Lock, Square } from 'lucide-react';
import { Agent } from '../types';
import { Switch } from './ui/Switch';

interface AgentRowProps {
  agent: Agent;
  onDelete: (id: number) => void;
  onEdit: (agent: Agent) => void;
  onToggleStatus: (id: number, currentStatus: boolean) => void;
  onFinishAttendance: (id: number) => void;
  isOverlay?: boolean;
  isAdmin?: boolean;
}

export const AgentRow: React.FC<AgentRowProps> = ({ 
  agent, 
  onDelete, 
  onEdit, 
  onToggleStatus, 
  onFinishAttendance,
  isOverlay, 
  isAdmin 
}) => {
  const isBusy = agent.em_atendimento; // True if handling a client
  const isAvailable = agent.status && !isBusy; // True if waiting
  
  // Drag is only allowed if the agent is fully available (Status True AND Not Busy)
  const isDraggable = isAvailable;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: agent.id,
    disabled: !isDraggable 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isOverlay ? 999 : 'auto',
  };

  // Visual Styles based on state
  const getContainerStyles = () => {
    if (isBusy) return 'bg-red-50 dark:bg-red-900/10 border-l-red-500 shadow-sm';
    if (isAvailable) return 'bg-white dark:bg-slate-800 border-l-emerald-500 shadow-sm';
    return 'bg-slate-100 dark:bg-slate-800/50 border-l-slate-400 dark:border-l-slate-600 opacity-75'; // Unavailable/Paused
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex flex-col md:flex-row md:items-center gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 border-l-4
        ${getContainerStyles()}
        ${isOverlay ? 'shadow-xl scale-105' : ''}
        transition-all duration-200
      `}
    >
      {/* Drag Handle & Position */}
      <div className="flex items-center gap-3">
        {isDraggable ? (
          <div 
            {...attributes} 
            {...listeners} 
            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            title="Arrastar para reordenar"
          >
            <GripVertical size={20} />
          </div>
        ) : (
          <div className="p-1 text-slate-300 dark:text-slate-600 cursor-not-allowed" title="Posição bloqueada (Ocupado/Indisponível)">
            <Lock size={16} />
          </div>
        )}
        
        <div className="flex flex-col items-center justify-center min-w-[2.5rem]">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Pos</span>
          <span className="text-xl font-black text-slate-700 dark:text-slate-200">#{agent.posicao_fila}</span>
        </div>
      </div>

      {/* Agent Info */}
      <div className="md:w-1/4 min-w-0">
        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">{agent.nome}</h3>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mt-0.5">
           <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono text-slate-600 dark:text-slate-300">{agent.numero}</span>
        </div>
      </div>

      {/* Status / Client Info Area */}
      <div className="flex-1 pl-0 md:pl-4 md:border-l md:border-slate-200 dark:md:border-slate-700 border-t md:border-t-0 pt-2 md:pt-0 border-slate-200 dark:border-slate-700">
        {isBusy ? (
          <div className="flex items-center justify-between gap-3 animate-fade-in text-red-700 dark:text-red-400">
            <div className="flex flex-col gap-1">
              <span className="w-fit px-2.5 py-1 rounded-md text-xs font-black bg-red-600 text-white uppercase tracking-wider shadow-sm">
                Em Atendimento
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm font-bold mt-1">
                <span className="flex items-center gap-1">
                  <User size={14} className="opacity-75"/> {agent.cliente_nome}
                </span>
                <span className="hidden sm:inline opacity-50">•</span>
                <span className="flex items-center gap-1 font-mono opacity-80">
                  <Phone size={14} /> {agent.cliente_numero}
                </span>
              </div>
            </div>

            {/* Finish Button */}
            <button 
              onClick={() => onFinishAttendance(agent.id)}
              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg transition-colors border border-red-200 dark:border-red-800 group"
              title="Finalizar Atendimento"
            >
              <Square size={16} fill="currentColor" className="group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase hidden sm:inline">Finalizar</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                {agent.status ? (
                  <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                    Disponível
                  </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase tracking-wider border border-slate-300 dark:border-slate-600">
                    Indisponível
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                  {agent.status ? 'Aguardando próximo cliente...' : 'Pausa / Fora de serviço'}
                </span>
             </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mr-2">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
             {agent.status ? 'Ativo' : 'Inativo'}
           </span>
           <Switch 
            checked={agent.status} 
            onChange={() => onToggleStatus(agent.id, agent.status)} 
            disabled={isBusy}
           />
        </div>

        {isAdmin && (
          <>
            <button 
              onClick={() => onEdit(agent)}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Editar"
            >
              <Edit2 size={18} />
            </button>

            <button 
              onClick={() => onDelete(agent.id)}
              className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Excluir"
            >
              <Trash2 size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};