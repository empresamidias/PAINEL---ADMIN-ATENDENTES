import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Agent, SupabaseCredentials } from '../types';

let supabase: SupabaseClient | null = null;

// Hardcoded credentials as requested
const SUPABASE_URL = 'https://ndkkkjacphqpqcwdxjac.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ka2tramFjcGhxcHFjd2R4amFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mzk5NjIwMCwiZXhwIjoyMDc5NTcyMjAwfQ.4NC9LJUz80EmsM1D7NWAc5b58KmlkG5LQP_ekq5fJA4';

// Initialize automatically
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  console.error("Failed to init supabase", e);
}

export const initSupabase = (creds?: SupabaseCredentials): boolean => {
  // Always return true as we are using hardcoded creds
  return !!supabase;
};

export const getSupabase = () => supabase;

// --- Mock Data for Demo Mode (Fallback) ---
const MOCK_STORAGE_KEY = 'mock_agents_data_v3';

export const mockDb = {
  getAgents: (): Agent[] => {
    const data = localStorage.getItem(MOCK_STORAGE_KEY);
    if (data) return JSON.parse(data);
    const initial: Agent[] = [
      { 
        id: 1, 
        nome: 'Ana Silva', 
        numero: 'Ramal 101', 
        status: true, 
        em_atendimento: false, 
        cliente_nome: null, 
        cliente_numero: null, 
        posicao_fila: 0,
        inicio_atendimento: null,
        fim_atendimento: null
      },
      { 
        id: 2, 
        nome: 'Carlos Souza', 
        numero: 'Ramal 102', 
        status: false, 
        em_atendimento: true, 
        cliente_nome: 'Roberto Dias', 
        cliente_numero: '(11) 99999-8888', 
        posicao_fila: 1,
        inicio_atendimento: new Date().toISOString(),
        fim_atendimento: null
      },
    ];
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  },
  saveAgents: (agents: Agent[]) => {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(agents));
  }
};