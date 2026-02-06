export enum ReportType {
  DAMAGE = 'DAMAGE',
  INSPECTION = 'INSPECTION',
  OFFER = 'OFFER'
}

export enum UserRole {
  TECHNICIAN = 'TECHNICIAN',
  MANAGER = 'MANAGER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  /** 
   * Gehashtes Passwort - niemals Klartext speichern!
   * Verwende hashPassword() aus utils/security.ts
   */
  passwordHash: string;
  avatar?: string;
  createdAt?: string;
  lastLogin?: string;
}

export interface ReportImage {
  data: string; // Base64
  mimeType: string;
  /** Optional: Bildunterschrift */
  caption?: string;
  /** Optional: Aufnahmedatum */
  takenAt?: string;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  customer: string;
  content: string;
  date: string;
  status: 'Draft' | 'Sent' | 'Completed';
  images?: ReportImage[];
  createdById: string; 
  createdByName: string;
  isOfflineDraft?: boolean;
  /** Rohdaten für spätere KI-Überarbeitung */
  rawInput?: {
    keywords: string;
    type: ReportType;
  };
  /** Tracking für Export-Historie */
  exports?: {
    type: 'pdf' | 'docx' | 'email';
    date: string;
    recipient?: string;
  }[];
}

export interface Template {
  id: string;
  type: ReportType;
  name: string;
  structure: string;
  description: string;
  category?: string;
  /** KI-spezifische Anweisungen */
  aiInstructions?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenerationInput {
  type: ReportType;
  keywords: string;
  customerName: string;
  additionalInfo?: string;
  images: ReportImage[];
  /** Optional: Template-ID für strukturierte Generierung */
  templateId?: string;
}

// TypeScript Declarations für Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}
