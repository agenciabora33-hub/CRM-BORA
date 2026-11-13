export const LEAD_STATUSES = [
  'Para Prospectar',
  'Contato Feito',
  'Interesse / Conversa',
  'Reunião / Proposta',
  'Fechado (Ganho)',
  'Perdido',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  companyName: string;
  contactName: string;
  phone: string;
  websiteOrSocial: string;
  websiteUrl: string;
  googleBusinessUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  otherSocialUrl: string;
  niche: string;
  status: LeadStatus;
  callCount: number;
  estimatedValue: number;
  nextFollowUp: string;
  notes: string;
}

export interface AgencySettings {
  companyName: string;
  logoUrl: string;
  teamMembers: [string, string];
  activeUser: string;
  appsScriptUrl: string;
  lastSyncedAt: string | null;
}

export type AppView = 'kanban' | 'dashboard' | 'table';

export type FollowUpUrgency = 'overdue' | 'today' | 'upcoming' | 'future' | 'none';

export interface ToastMessage {
  id: string;
  message: string;
  variant: 'success' | 'info' | 'error';
}
