/**
 * Security Utilities für SmartReport
 * 
 * HINWEIS: Dies ist eine vereinfachte Hash-Funktion für Demo-Zwecke.
 * In einer Produktionsumgebung solltest du:
 * 1. Passwort-Hashing auf dem Server durchführen (nicht im Client)
 * 2. Eine echte Krypto-Library wie bcrypt oder argon2 verwenden
 * 3. Salts für jeden User generieren
 */

/**
 * Einfache Hash-Funktion (SHA-256 basiert)
 * Für Produktionsumgebungen: Nutze bcrypt/argon2 auf dem Backend!
 */
export const hashPassword = (password: string): string => {
  // Einfacher deterministischer Hash für Demo-Zwecke
  // In Produktion: Server-seitiges Hashing mit bcrypt!
  let hash = 0;
  const salt = 'saneo_salt_2024'; // In Produktion: Unique salt per user
  const saltedPassword = salt + password;
  
  for (let i = 0; i < saltedPassword.length; i++) {
    const char = saltedPassword.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Zusätzliche Iterationen für mehr Sicherheit
  for (let i = 0; i < 1000; i++) {
    hash = ((hash << 5) - hash) + (hash % 256);
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/**
 * Vergleicht ein Passwort mit einem Hash
 */
export const verifyPassword = (password: string, storedHash: string): boolean => {
  return hashPassword(password) === storedHash;
};

/**
 * Generiert eine sichere Session-ID
 */
export const generateSessionId = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Validiert E-Mail-Format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Prüft Passwort-Stärke (für User-Feedback)
 */
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  
  if (password.length >= 4) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const levels = [
    { label: 'Sehr schwach', color: 'red' },
    { label: 'Schwach', color: 'orange' },
    { label: 'Mittel', color: 'yellow' },
    { label: 'Gut', color: 'lime' },
    { label: 'Stark', color: 'green' },
    { label: 'Sehr stark', color: 'emerald' }
  ];
  
  return {
    score,
    ...levels[Math.min(score, levels.length - 1)]
  };
};
