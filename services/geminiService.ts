import { GoogleGenAI } from "@google/genai";
import { ReportType, GenerationInput } from "../types";

/**
 * WICHTIG: API-Key Handling
 * 
 * In einer Produktionsumgebung sollte der API-Key NIEMALS im Frontend sein!
 * 
 * Empfohlene Architektur:
 * 1. Erstelle einen Backend-Proxy (z.B. mit Express, Deno, oder Cloudflare Workers)
 * 2. Der Proxy hält den API-Key sicher auf dem Server
 * 3. Das Frontend ruft deinen Proxy auf, nicht direkt die Gemini API
 * 
 * Für diese Demo verwenden wir den direkten API-Aufruf mit Vite's env handling.
 * Stelle sicher, dass die .env.local Datei NICHT ins Git Repository kommt!
 */

// Für Vite: import.meta.env statt process.env
const getApiKey = (): string => {
  // Vite erwartet VITE_ prefix für env variablen
  // @ts-ignore - Vite specific
  const key = import.meta.env?.VITE_GEMINI_API_KEY;
  
  if (!key) {
    console.error('❌ VITE_GEMINI_API_KEY nicht gesetzt!');
    console.error('Erstelle eine .env.local Datei mit:');
    console.error('VITE_GEMINI_API_KEY=dein_api_key_hier');
    throw new Error('API Key nicht konfiguriert');
  }
  
  return key;
};

export const generateProfessionalReport = async (input: GenerationInput): Promise<string> => {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  
  const typeLabels: Record<ReportType, string> = {
    [ReportType.DAMAGE]: "Schadensmeldung / Technisches Gutachten",
    [ReportType.INSPECTION]: "Inspektionsbericht / Prüfprotokoll",
    [ReportType.OFFER]: "Angebot / Kostenvoranschlag"
  };

  const systemPrompt = `
Du bist ein erfahrener Experte für das Schreiben von professionellen Geschäftsberichten und Gutachten im Außendienst für die Firma SANEO Schadenservice GmbH.

Deine Aufgabe ist es, Stichpunkte und Bilder in eine formelle, perfekt strukturierte Version eines Berichts zu verwandeln.

FORMAT-REGELN (SEHR WICHTIG):
1. Nutze KEINE Markdown-Sonderzeichen wie Sternchen (**) oder Unterstriche (__) für Fettungen. 
2. Nutze ausschließlich klare Textbeschriftungen gefolgt von einem Doppelpunkt (z.B. "Kunde: Müller" statt "**Kunde:** Müller").
3. Nutze einfache Rauten (#) NUR für Hauptüberschriften.
4. Der Ton ist hochprofessionell, präzise und sachlich.
5. Der Berichtstyp ist: ${typeLabels[input.type]}.
6. Kunde/Objekt: ${input.customerName}.
7. Aktuelles Datum: ${new Date().toLocaleDateString('de-DE')}.

STRUKTUR FÜR ${typeLabels[input.type].toUpperCase()}:
${input.type === ReportType.DAMAGE ? `
- Kopfdaten: Typ, Kunde, Datum, Einsatzort
- Schadensbeschreibung: Was ist passiert?
- Technische Befundaufnahme: Detaillierte Analyse
- Sofortmaßnahmen: Was wurde vor Ort getan?
- Schadensumfang: Betroffene Bereiche/Materialien
- Empfehlung: Nächste Schritte, geschätzte Kosten
` : input.type === ReportType.INSPECTION ? `
- Kopfdaten: Typ, Kunde, Datum, Prüfobjekt
- Anlagenbeschreibung: Was wurde geprüft?
- Prüfergebnisse: Messwerte, Zustandsbewertung
- Mängelliste: Gefundene Probleme (falls vorhanden)
- Bewertung: Gesamtzustand (Ampelsystem)
- Empfehlung: Wartungshinweise, nächster Prüftermin
` : `
- Kopfdaten: Typ, Kunde, Datum, Projekt
- Projektbeschreibung: Was soll gemacht werden?
- Leistungsumfang: Detaillierte Auflistung
- Materialliste: Benötigte Materialien
- Kostenaufstellung: Arbeit + Material
- Zeitrahmen: Geschätzte Dauer
- Zahlungsbedingungen: Standard-Konditionen
`}

WICHTIG ZU DEN BILDERN:
${input.images.length > 0 ? `
- Dir liegen ${input.images.length} Foto(s) vor.
- Analysiere jedes Bild genau und beziehe dich im Text direkt darauf (z.B. "Wie in Abbildung 1 ersichtlich...").
- Beschreibe visuelle Beweise so, dass sie für Dritte (Versicherung, Auftraggeber) nachvollziehbar sind.
` : `
- Es wurden keine Fotos bereitgestellt.
- Weise im Bericht darauf hin, dass eine fotografische Dokumentation empfohlen wird.
`}

Gib NUR den fertigen, sauberen Berichtstext zurück, ohne zusätzliche Kommentare oder Erklärungen.
  `.trim();

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    {
      text: `
Erstelle ein(e) ${typeLabels[input.type]} für "${input.customerName}".

Stichworte/Befund: "${input.keywords}"
${input.additionalInfo ? `Zusätzliche Informationen: ${input.additionalInfo}` : ''}

Bitte den vollständigen, professionellen Bericht ausgeben.
      `.trim()
    }
  ];

  // Bilder hinzufügen
  input.images.forEach((img, index) => {
    parts.push({ text: `\n\nAbbildung ${index + 1}:` });
    parts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType
      }
    });
  });

  try {
    const response = await ai.models.generateContent({
      // Korrigierter Modellname - aktuelle Gemini Modelle:
      // - gemini-1.5-pro (beste Qualität)
      // - gemini-1.5-flash (schneller, günstiger)
      // - gemini-2.0-flash-exp (experimentell, sehr schnell)
      model: 'gemini-1.5-pro',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text;
    
    if (!text || text.trim().length === 0) {
      throw new Error("Leere Antwort von der KI erhalten");
    }
    
    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    
    // Spezifischere Fehlermeldungen
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error("API-Schlüssel ungültig. Bitte in .env.local prüfen.");
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        throw new Error("API-Limit erreicht. Bitte später erneut versuchen.");
      }
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error("Netzwerkfehler. Bitte Internetverbindung prüfen.");
      }
    }
    
    throw new Error("Konnte Bericht nicht generieren. Bitte später erneut versuchen.");
  }
};

/**
 * Prüft ob die API erreichbar ist (für Health-Checks)
 */
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
    // Minimaler API-Call zum Testen
    await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: { parts: [{ text: 'Test' }] },
      config: { maxOutputTokens: 10 }
    });
    
    return true;
  } catch {
    return false;
  }
};
