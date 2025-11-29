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
  Play,
  Search,
  RefreshCw,
  Moon,
  Sun,
  LogOut,
  Clock
} from 'lucide-react';
import { Agent, ToastMessage } from './types';
import { AgentRow } from './components/AgentRow';
import { AgentForm } from './components/AgentForm';
import { Login } from './components/Login';
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
      // Fallback only if supabase fails to init (unlikely with hardcoded keys)
      if (email === 'admin@admin.com' && pass === '123') {
        setIsAuthenticated(true);
        setCurrentUserEmail(email);
      }
      else throw new Error('Supabase client not available');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });

    if (error) {
      throw error;
    }
    
    setIsAuthenticated(true);
    setCurrentUserEmail(data.user?.email || email);
    addToast('success', 'Login realizado com sucesso!');
  };

  // --- Data Fetching ---
  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('atendentes')
        .select('*');
        // We order by position initially, but frontend logic splits them
      
      if (error) {
        addToast('error', 'Erro ao carregar dados do Supabase.');
      } else {
        setAgents(data || []);
      }
    } else {
      // Mock Fallback
      setAgents(mockDb.getAgents());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAgents();
    }
  }, [isAuthenticated, fetchAgents]);

  // --- Actions ---

  const handleAddOrEditAgent = async (data: Partial<Agent>) => {
    const supabase = getSupabase();
    
    if (editingAgent) {
      // Update
      const updatedList = agents.map(a => a.id === editingAgent.id ? { ...a, ...data } : a);
      setAgents(updatedList); // Optimistic

      if (supabase) {
        const { error } = await supabase.from('atendentes').update(data).eq('id', editingAgent.id);
        if (error) addToast('error', 'Erro ao salvar edição.');
        else addToast('success', 'Atendente atualizado.');
      } else {
        mockDb.saveAgents(updatedList as Agent[]);
        addToast('success', 'Atendente atualizado (Demo).');
      }
    } else {
      // Create
      // Determine next position (last)
      const maxPos = agents.length > 0 ? Math.max(...agents.map(a => a.posicao_fila)) : -1;
      const newAgent = { 
        ...data, 
        posicao_fila: maxPos + 1,
        status: true,
        em_atendimento: false,
        cliente_nome: null,
        cliente_numero: null,
        inicio_atendimento: null,
        fim_atendimento: null
      };

      if (supabase) {
        const { error, data: inserted } = await supabase.from('atendentes').insert([newAgent]).select();
        if (error) {
          addToast('error', 'Erro ao adicionar atendente.');
        } else if (inserted) {
          setAgents([...agents, inserted[0]]);
          addToast('success', 'Atendente adicionado.');
        }
      } else {
        const mockAgent = { ...newAgent, id: Date.now() } as Agent;
        const newList = [...agents, mockAgent];
        setAgents(newList);
        mockDb.saveAgents(newList);
        addToast('success', 'Atendente adicionado (Demo).');
      }
    }
    setEditingAgent(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja remover este atendente?')) return;

    const remaining = agents.filter(a => a.id !== id);
    setAgents(remaining); // Optimistic

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('atendentes').delete().eq('id', id);
      if (error) {
        addToast('error', 'Erro ao deletar.');
        fetchAgents(); // Revert
      }
    } else {
      mockDb.saveAgents(remaining);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const updates: any = { status: newStatus };
    
    // Logic: If becoming available (ending break/busy), move to bottom of queue
    let newPos = 0;
    if (newStatus === true) {
      const maxPos = agents.length > 0 ? Math.max(...agents.map(a => a.posicao_fila)) : 0;
      newPos = maxPos + 1;
      
      updates.em_atendimento = false;
      updates.cliente_nome = null;
      updates.cliente_numero = null;
      updates.posicao_fila = newPos;
      updates.inicio_atendimento = null; // Reset time
      updates.fim_atendimento = null;
    }

    // Update Local State with Sort consideration
    const updatedAgents = agents.map(a => a.id === id ? { ...a, ...updates } : a);
    
    // Sort logic handled in render split
    setAgents(updatedAgents);

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('atendentes').update(updates).eq('id', id);
    } else {
      mockDb.saveAgents(updatedAgents);
    }
  };

  // --- Queue Management (Drag & Drop) ---

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    // Only allow sorting if we are dragging and dropping within the available list
    if (over && active.id !== over.id) {
      setAgents((items) => {
        // Separate the lists logically to find indices
        const queueItems = items.filter(a => !a.em_atendimento).sort((a,b) => a.posicao_fila - b.posicao_fila);
        const busyItems = items.filter(a => a.em_atendimento);

        const oldIndex = queueItems.findIndex((i) => i.id === active.id);
        const newIndex = queueItems.findIndex((i) => i.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return items; // Safety check
        
        const reorderedQueue = arrayMove(queueItems, oldIndex, newIndex);
        
        // Update posicao_fila for the reordered queue section
        const updatedQueueWithPos = reorderedQueue.map((agent, index) => ({
          ...agent,
          posicao_fila: index // 0 to N
        }));

        // Combine back
        const finalAgents = [...updatedQueueWithPos, ...busyItems];

        // Persist only the changed ones (queue)
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
          
          supabase.from('atendentes').upsert(updates, { onConflict: 'id' }).then(({ error }) => {
            if (error) {
              console.error('Erro detalhado Supabase:', error);
              addToast('error', `Erro ao reordenar fila: ${error.message}`);
            }
          });
        } else {
          mockDb.saveAgents(finalAgents);
        }

        return finalAgents;
      });
    }
  };

  // --- Next Agent Logic ---

  const callNextAgent = async () => {
    // Select from available queue
    const queueAgents = agents
      .filter(a => !a.em_atendimento && a.status === true)
      .sort((a, b) => a.posicao_fila - b.posicao_fila);
    
    const available = queueAgents[0];

    if (!available) {
      addToast('info', 'Todos os atendentes estão ocupados no momento.');
      return;
    }

    // Input prompt for client info (simple version)
    const clientName = prompt("Nome do Cliente:");
    if (!clientName) return; 
    
    const clientNumber = `(11) 9${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;

    const updates = {
      status: false,
      em_atendimento: true,
      cliente_nome: clientName,
      cliente_numero: clientNumber,
      // We set posicao_fila to 0 as per instructions for busy agents, or keep it irrelevant
      // The requirement says "eles meio que não estão na fila". 
      // We will handle order via inicio_atendimento
      inicio_atendimento: new Date().toISOString()
    };

    // Update local state
    const updatedList = agents.map(a => a.id === available.id ? { ...a, ...updates } : a);
    
    setAgents(updatedList);
    addToast('success', `${available.nome} agora está atendendo ${clientName}`);

    const supabase = getSupabase();
    if (supabase) {
      await supabase.from('atendentes').update(updates).eq('id', available.id);
    } else {
      mockDb.saveAgents(updatedList);
    }
  };

  // Render Login if not authenticated
  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin} 
        isDark={darkMode}
        toggleTheme={() => setDarkMode(!darkMode)}
      />
    );
  }

  // --- LIST SEPARATION LOGIC ---
  
  // 1. Available/Queue Agents (Sortable)
  let queueAgents = agents.filter(a => !a.em_atendimento);
  if (filterActive) {
    queueAgents = queueAgents.filter(a => a.status === true);
  }
  // Always sort by manual position
  queueAgents.sort((a, b) => a.posicao_fila - b.posicao_fila);

  // 2. Busy Agents (Not Sortable, Static at bottom)
  // Sorted by inicio_atendimento (Oldest start time first, or Newest? "se o joão entrar em atendimento, ele deve ficar depois de mim")
  // "After me" implies ascending order of start time.
  const busyAgents = agents
    .filter(a => a.em_atendimento)
    .sort((a, b) => {
      const timeA = a.inicio_atendimento ? new Date(a.inicio_atendimento).getTime() : 0;
      const timeB = b.inicio_atendimento ? new Date(b.inicio_atendimento).getTime() : 0;
      return timeA - timeB;
    });

  return (
    <div className="min-h-screen pb-20 bg-slate-100 dark:bg-slate-900 transition-colors duration-200">
      {/* Top Navigation */}
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/30">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Painel Gestor</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400">Online • {currentUserEmail}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={callNextAgent}
              className="hidden md:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Play size={16} fill="currentColor" />
              Chamar Próximo
            </button>
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 mx-2 hidden md:block"></div>
            
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Alternar Tema"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button
              onClick={() => {
                setIsAuthenticated(false);
                setCurrentUserEmail('');
              }}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition-all hover:-translate-y-0.5 ml-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar atendente..." 
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none shadow-sm transition-all"
                />
             </div>
             <button 
               onClick={fetchAgents} 
               className={`p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all ${loading ? 'animate-spin' : ''}`}
               title="Atualizar lista"
             >
               <RefreshCw size={18} />
             </button>
          </div>

          <div className="flex bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-sm">
            <button 
              onClick={() => setFilterActive(false)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${!filterActive ? 'bg-slate-800 dark:bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterActive(true)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${filterActive ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              Disponíveis
            </button>
          </div>
        </div>

        {/* List Header */}
        <div className="hidden md:flex items-center gap-4 px-6 pb-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="w-5"></div>
          <div className="w-12 text-center">Fila</div>
          <div className="w-1/4">Atendente</div>
          <div className="flex-1 pl-4 border-l border-slate-300 dark:border-slate-700">Status / Cliente</div>
          <div className="w-40 text-right pr-4">Ações</div>
        </div>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Section 1: Queue (Draggable) */}
          <SortableContext 
            items={queueAgents.map(a => a.id)} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3 min-h-[50px]">
              {queueAgents.map((agent) => (
                <AgentRow 
                  key={agent.id} 
                  agent={agent} 
                  isAdmin={isAdmin}
                  onDelete={handleDelete}
                  onEdit={(a) => {
                    setEditingAgent(a);
                    setIsFormOpen(true);
                  }}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
              {queueAgents.length === 0 && !loading && (
                <div className="py-4 text-center text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                  Nenhum atendente na fila de espera.
                </div>
              )}
            </div>
          </SortableContext>
          
          {/* Section 2: Active/Busy Agents (Static - Non Draggable) */}
          {busyAgents.length > 0 && (
            <div className="mt-8">
               <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} /> Em Atendimento
                  </span>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
               </div>
               
               <div className="space-y-3 opacity-90">
                 {busyAgents.map((agent) => (
                    // We render AgentRow but NOT inside SortableContext, so it's not a drag target
                    <AgentRow 
                      key={agent.id} 
                      agent={agent} 
                      isAdmin={isAdmin}
                      onDelete={handleDelete}
                      onEdit={(a) => {
                        setEditingAgent(a);
                        setIsFormOpen(true);
                      }}
                      onToggleStatus={handleToggleStatus}
                    />
                 ))}
               </div>
            </div>
          )}

          {/* Overlay for drag visual */}
          <DragOverlay>
            {activeDragId ? (
               <AgentRow 
                 agent={agents.find(a => a.id === activeDragId)!}
                 isAdmin={isAdmin}
                 onDelete={() => {}}
                 onEdit={() => {}}
                 onToggleStatus={() => {}}
                 isOverlay
               />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Modals */}
      <AgentForm 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false);
          setEditingAgent(null);
        }} 
        onSubmit={handleAddOrEditAgent}
        editingAgent={editingAgent}
      />

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`
              pointer-events-auto shadow-xl rounded-lg px-4 py-3 text-sm font-bold text-white flex items-center gap-3 animate-bounce-in
              ${toast.type === 'success' ? 'bg-emerald-600' : ''}
              ${toast.type === 'error' ? 'bg-red-500' : ''}
              ${toast.type === 'info' ? 'bg-slate-800' : ''}
            `}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;