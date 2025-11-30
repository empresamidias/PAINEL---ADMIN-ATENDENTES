import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  Users, 
  Plus, 
  Search,
  RefreshCw,
  Moon,
  Sun,
  LogOut,
  Clock,
  Coffee
} from 'lucide-react';
import { Agent, ToastMessage } from './types';
import { AgentRow } from './components/AgentRow';
import { AgentForm } from './components/AgentForm';
import { Login } from './components/Login';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { getSupabase, mockDb } from './services/supabaseClient';

function App() {
  // Auth & Theme State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const [darkMode, setDarkMode] = useState(true); // Tema Dark Inicial

  // App State
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filterActive, setFilterActive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);

  // Admin Check
  const isAdmin = currentUserEmail === 'admin@admin.com';

  // Sensors for Drag and Drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- Theme Handler ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // --- Toast Helper ---
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // --- Auth Handler ---
  const handleLogin = async (email: string, pass: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      if (email === 'admin@admin.com' && pass === '123') {
        setIsAuthenticated(true);
        setCurrentUserEmail(email);
      } else {
         throw new Error('Supabase client not available');
      }
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });

    if (error) throw error;
    
    setIsAuthenticated(true);
    setCurrentUserEmail(data.user?.email || email);
    addToast('success', 'Login realizado com sucesso!');
  };

  // --- Data Fetching ---
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase.from('atendentes').select('*');
      if (error) {
        addToast('error', 'Erro ao carregar dados.');
      } else {
        setAgents(data || []);
      }
    } else {
      setAgents(mockDb.getAgents());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAgents();
  }, [isAuthenticated, fetchAgents]);

  // --- Realtime Subscription ---
  useEffect(() => {
    if (!isAuthenticated) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel('realtime_atendentes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendentes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newAgent = payload.new as Agent;
          setAgents((prev) => {
             if (prev.find(a => a.id === newAgent.id)) return prev;
             return [...prev, newAgent];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedAgent = payload.new as Agent;
          setAgents((prev) => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setAgents((prev) => prev.filter(a => a.id !== deletedId));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  // --- Helpers ---
  
  // Gets the next available position (Last in queue)
  const getNextQueuePosition = (currentAgents: Agent[]) => {
    const queueAgents = currentAgents.filter(a => a.status === true && !a.em_atendimento && Number(a.posicao_fila) > 0);
    if (queueAgents.length === 0) return 1;
    const maxPos = Math.max(...queueAgents.map(a => Number(a.posicao_fila)));
    return maxPos + 1;
  };

  // Normalize Queue: Resets the queue sequence to 1, 2, 3...
  // Should be called whenever an agent leaves the queue (Start Attendance, Pause, Delete)
  const reindexQueue = (allAgents: Agent[], excludeId?: number) => {
    const agentsToReindex = allAgents
      .filter(a => a.status === true && !a.em_atendimento && a.id !== excludeId)
      .sort((a, b) => Number(a.posicao_fila) - Number(b.posicao_fila));

    const updates = agentsToReindex.map((agent, index) => ({
      ...agent,
      posicao_fila: index + 1 // Sequence starts at 1
    }));
    
    return updates;
  };

  // --- Actions ---

  const handleAddOrEditAgent = async (data: Partial<Agent>) => {
    const supabase = getSupabase();
    
    if (editingAgent) {
      // Update
      const updatedList = agents.map(a => a.id === editingAgent.id ? { ...a, ...data } : a);
      setAgents(updatedList); 
      if (supabase) await supabase.from('atendentes').update(data).eq('id', editingAgent.id);
    } else {
      // Create
      const newPos = getNextQueuePosition(agents);
      const newAgent = { 
        ...data, 
        posicao_fila: newPos,
        status: true,
        em_atendimento: false,
        cliente_nome: null,
        cliente_numero: null,
        inicio_atendimento: null,
        fim_atendimento: null
      };
      if (supabase) await supabase.from('atendentes').insert([newAgent]);
    }
    setEditingAgent(null);
  };

  // Opens the delete confirmation modal
  const handleOpenDeleteModal = (id: number) => {
    const agent = agents.find(a => a.id === id);
    if (agent) {
      setAgentToDelete(agent);
      setDeleteModalOpen(true);
    }
  };

  // Executed after confirmation
  const confirmDelete = async () => {
    if (!agentToDelete) return;
    const id = agentToDelete.id;
    
    const supabase = getSupabase();
    if (supabase) {
      // 1. Delete
      await supabase.from('atendentes').delete().eq('id', id);
      
      // 2. Normalize remaining queue
      const remainingAgents = agents.filter(a => a.id !== id);
      setAgents(remainingAgents);
      
      const updates = reindexQueue(remainingAgents);
      if (updates.length > 0) {
        await supabase.from('atendentes').upsert(updates, { onConflict: 'id' });
      }
      
      addToast('success', 'Atendente removido.');
    }
    setDeleteModalOpen(false);
    setAgentToDelete(null);
  };

  // --- Status & Attendance Logic (Combined) ---
  
  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const agent = agents.find(a => a.id === id);
    if (!agent) return;

    const updatesToBatch: any[] = [];
    const newStatus = !currentStatus;

    // SCENARIO 1: Turning OFF (Going Busy or Paused)
    // SCENARIO 1: Turning OFF (Iniciar atendimento ou Pausar)
    if (newStatus === false) {
      const clientName = prompt("Iniciar Atendimento? Digite o nome do cliente.\n(Deixe vazio para apenas Pausa)");

      // 1 — Primeiro, garante que o atendente sai da fila imediatamente
      const agentPos = agent.posicao_fila;

      updatesToBatch.push({
        ...agent,
        status: false,
        em_atendimento: !!clientName,
        cliente_nome: clientName || null,
        posicao_fila: 0, // 🔥 AGORA SIM — tira ele da fila ANTES de recalcular
        inicio_atendimento: clientName ? new Date().toISOString() : null
      });

      // 2 — Agora decrementa quem estava ATRÁS dele
      const agentsToShift = agents.filter(a =>
          a.status === true &&
          !a.em_atendimento &&
          a.posicao_fila > agentPos
      );

      agentsToShift.forEach(a => {
        updatesToBatch.push({
          ...a,
          posicao_fila: a.posicao_fila - 1
        });
      });
    }

    
    // SCENARIO 2: Turning ON (Becoming Available)
    else {
      const newPos = getNextQueuePosition(agents);
      
      updatesToBatch.push({
        ...agent,
        status: true,
        em_atendimento: false,
        cliente_nome: null,
        cliente_numero: null,
        posicao_fila: newPos, // Goes to end
        inicio_atendimento: null,
        fim_atendimento: null
      });
      // No need to reindex others when adding to end
    }

    // Apply Updates
    // Optimistic
    const updatesMap = new Map(updatesToBatch.map(u => [u.id, u]));
    const updatedState = agents.map(a => {
      if (updatesMap.has(a.id)) return { ...a, ...updatesMap.get(a.id) };
      return a;
    });
    setAgents(updatedState);

    // DB Sync
    const { error } = await supabase.from('atendentes').upsert(updatesToBatch, { onConflict: 'id' });
    if (error) {
       console.error("Sync error", error);
       fetchAgents();
    }
  };

  const handleFinishAttendance = async (id: number) => {
    // Return to end of queue
    const newPos = getNextQueuePosition(agents);

    const updates = {
      status: true,
      em_atendimento: false,
      cliente_nome: null,
      cliente_numero: null,
      posicao_fila: newPos,
      inicio_atendimento: null,
      fim_atendimento: new Date().toISOString()
    };

    // Optimistic
    const updatedList = agents.map(a => a.id === id ? { ...a, ...updates } : a);
    setAgents(updatedList);
    addToast('success', 'Atendimento finalizado.');

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('atendentes').update(updates).eq('id', id);
    }
  };

  // --- Drag & Drop ---

  const handleDragStart = (event: any) => setActiveDragId(event.active.id);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      const queueAgentsList = agents
        .filter(a => a.status === true && !a.em_atendimento)
        .sort((a,b) => Number(a.posicao_fila) - Number(b.posicao_fila));
      
      const oldIndex = queueAgentsList.findIndex((i) => i.id === active.id);
      const newIndex = queueAgentsList.findIndex((i) => i.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;
      
      const reorderedQueue = arrayMove(queueAgentsList, oldIndex, newIndex);
      
      // Strict 1, 2, 3 sequence
      const updatedQueueWithPos = reorderedQueue.map((agent, index) => ({
        ...agent,
        posicao_fila: index + 1 
      }));

      // Merge back to full list for optimistic update
      const busyOrPaused = agents.filter(a => !a.status || a.em_atendimento);
      setAgents([...updatedQueueWithPos, ...busyOrPaused]); 

      const supabase = getSupabase();
      if (supabase) {
        const updates = updatedQueueWithPos.map(a => ({
           id: a.id,
           nome: a.nome,
           numero: a.numero,
           status: a.status,
           em_atendimento: a.em_atendimento,
           cliente_nome: a.cliente_nome,
           cliente_numero: a.cliente_numero,
           posicao_fila: a.posicao_fila,
           inicio_atendimento: a.inicio_atendimento,
           fim_atendimento: a.fim_atendimento
        }));
        await supabase.from('atendentes').upsert(updates, { onConflict: 'id' });
      }
    }
  };

  // --- Render ---

  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin} 
        isDark={darkMode}
        toggleTheme={() => setDarkMode(!darkMode)}
      />
    );
  }

  // Filter lists
  
  // 1. Fila Ativa: Status=True E Não Atendendo
  let queueAgents = agents.filter(a => a.status === true && !a.em_atendimento);
  if (filterActive) queueAgents = queueAgents.filter(a => a.status === true);
  queueAgents.sort((a, b) => Number(a.posicao_fila) - Number(b.posicao_fila));

  // 2. Em Atendimento: Em Atendimento=True
  const busyAgents = agents
    .filter(a => a.em_atendimento)
    .sort((a, b) => {
      const timeA = a.inicio_atendimento ? new Date(a.inicio_atendimento).getTime() : 0;
      const timeB = b.inicio_atendimento ? new Date(b.inicio_atendimento).getTime() : 0;
      return timeA - timeB;
    });

  // 3. Pausados / Indisponíveis: Status=False E Em Atendimento=False
  // (Para não sumirem da tela quando desativa o toggle)
  const pausedAgents = agents
    .filter(a => a.status === false && !a.em_atendimento)
    .sort((a, b) => a.id - b.id); // Ordenação padrão por ID ou Nome

  return (
    <div className="min-h-screen pb-20 bg-slate-100 dark:bg-slate-900 transition-colors duration-200">
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/30">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Painel Gestor</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Online • {currentUserEmail}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => { setIsAuthenticated(false); setCurrentUserEmail(''); }} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut size={20} />
            </button>
            {isAdmin && (
              <button onClick={() => setIsFormOpen(true)} className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-all hover:-translate-y-0.5 ml-2">
                <Plus size={18} />
                <span className="hidden sm:inline">Novo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input type="text" placeholder="Buscar atendente..." className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm transition-all" />
             </div>
             <button onClick={fetchAgents} className={`p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all ${loading ? 'animate-spin' : ''}`}>
               <RefreshCw size={18} />
             </button>
          </div>
          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
            <button onClick={() => setFilterActive(false)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!filterActive ? 'bg-slate-800 dark:bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Todos</button>
            <button onClick={() => setFilterActive(true)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterActive ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Disponíveis</button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 px-6 pb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="w-5"></div>
          <div className="w-12 text-center">Fila</div>
          <div className="w-1/4">Atendente</div>
          <div className="flex-1 pl-4 border-l border-slate-300 dark:border-slate-700">Status / Cliente</div>
          <div className="w-40 text-right pr-4">Ações</div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={queueAgents.map(a => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 min-h-[50px]">
              {queueAgents.map((agent) => (
                <AgentRow 
                  key={agent.id} 
                  agent={agent} 
                  isAdmin={isAdmin}
                  onDelete={handleOpenDeleteModal}
                  onEdit={(a) => { setEditingAgent(a); setIsFormOpen(true); }}
                  onToggleStatus={handleToggleStatus}
                  onFinishAttendance={handleFinishAttendance}
                />
              ))}
              {queueAgents.length === 0 && !loading && (
                <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-600 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p>Fila vazia.</p>
                </div>
              )}
            </div>
          </SortableContext>
          
          {/* Seção de Indisponíveis (Pausados) - Para não sumirem da tela */}
          {pausedAgents.length > 0 && !filterActive && (
             <div className="mt-8 animate-fade-in opacity-80">
                <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Coffee size={14} className="text-slate-400" /> 
                    Em Pausa / Indisponíveis
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
               </div>
               <div className="space-y-3 grayscale-[0.5]">
                 {pausedAgents.map((agent) => (
                    <AgentRow 
                      key={agent.id} 
                      agent={agent} 
                      isAdmin={isAdmin}
                      onDelete={handleOpenDeleteModal}
                      onEdit={(a) => { setEditingAgent(a); setIsFormOpen(true); }}
                      onToggleStatus={handleToggleStatus}
                      onFinishAttendance={handleFinishAttendance}
                    />
                 ))}
               </div>
             </div>
          )}

          {busyAgents.length > 0 && (
            <div className="mt-8 animate-fade-in">
               <div className="flex items-center gap-3 mb-4 px-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" /> 
                    Em Atendimento (Pos 0)
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
               </div>
               <div className="space-y-3">
                 {busyAgents.map((agent) => (
                    <AgentRow 
                      key={agent.id} 
                      agent={agent} 
                      isAdmin={isAdmin}
                      onDelete={handleOpenDeleteModal}
                      onEdit={(a) => { setEditingAgent(a); setIsFormOpen(true); }}
                      onToggleStatus={handleToggleStatus}
                      onFinishAttendance={handleFinishAttendance}
                    />
                 ))}
               </div>
            </div>
          )}

          <DragOverlay>
            {activeDragId ? (
               <AgentRow 
                 agent={agents.find(a => a.id === activeDragId)!}
                 isAdmin={isAdmin}
                 onDelete={() => {}}
                 onEdit={() => {}}
                 onToggleStatus={() => {}}
                 onFinishAttendance={() => {}}
                 isOverlay
               />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <AgentForm 
        isOpen={isFormOpen} 
        onClose={() => { setIsFormOpen(false); setEditingAgent(null); }} 
        onSubmit={handleAddOrEditAgent}
        editingAgent={editingAgent}
      />
      
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setAgentToDelete(null); }}
        onConfirm={confirmDelete}
        agentName={agentToDelete?.nome || ''}
      />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto shadow-xl rounded-lg px-4 py-3 text-sm font-bold text-white flex items-center gap-3 animate-bounce-in ${toast.type === 'success' ? 'bg-emerald-600' : ''} ${toast.type === 'error' ? 'bg-red-500' : ''} ${toast.type === 'info' ? 'bg-slate-800' : ''}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;