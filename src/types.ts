export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  title: string;
  content: string;
  response: string;
  mode: ReflectionMode;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  modelUsed?: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface SecurityEvent {
  id: string;
  uid: string;
  timestamp: string;
  patternCategory: string;
  sourceRoute: string;
  excerpt: string;
}

export interface SecurityEventsResponse {
  count: number;
  recentCategories: string[];
  events: SecurityEvent[];
}

export interface JournalEmbedding {
  id: string; // Strictly equal to interactionId for direct 1:1 join
  userId: string;
  interactionId: string;
  textChunk: string;
  vector: number[];
  model?: string;
  outputDimensionality?: number;
  taskType?: string;
  normalized?: boolean;
  createdAt: string;
}

export interface AdminAggregateMetrics {
  totalUsers: number;
  totalInteractions: number;
  flaggedInteractions: number;
  totalSecurityEvents: number;
  modeCounts?: Record<string, number>;
  modeDistribution: Record<string, string>;
  calculatedAt: string;
}

export interface AdminAggregateResponse {
  success: boolean;
  roleVerifiedVia: string;
  aggregateMetrics: AdminAggregateMetrics;
  securityGuarantee: string;
}

export interface AskSource {
  interactionId: string;
  title: string;
  date: string;
  snippet: string;
  similarity: number;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  modelUsed?: string;
  noMatch?: boolean;
}

export interface DashboardTheme {
  label: string;
  description: string;
}

export interface DashboardActionItem {
  title: string;
  description: string;
  suggestedDate: string;
}

export interface DashboardSummaryResponse {
  totalEntries: number;
  entriesLast7Days: number;
  entriesLast30Days: number;
  currentStreak: number;
  modeDistribution: {
    reflect: number;
    summarize: number;
    brainstorm: number;
  };
  sparkline14Days: number[];
  narrative?: string;
  themes: DashboardTheme[];
  moodArc?: string;
  actionItems: DashboardActionItem[];
  aiAvailable: boolean;
  modelUsed?: string;
  empty?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
