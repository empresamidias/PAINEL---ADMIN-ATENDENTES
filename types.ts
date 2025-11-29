export interface Agent {
  id: number;
  nome: string;
  numero: string;
  status: boolean; // true = Disponível, false = Indisponível/Ocupado
  em_atendimento: boolean; // true = Em atendimento, false = Livre
  cliente_nome: string | null;
  cliente_numero: string | null;
  posicao_fila: number;
  inicio_atendimento: string | null; // ISO Date String
  fim_atendimento: string | null; // ISO Date String
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export type AgentSortOption = 'manual' | 'name' | 'status';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}