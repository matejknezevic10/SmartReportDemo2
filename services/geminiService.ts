import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationInput, ReportType } from '../types';

// @ts-ignore - Vite specific
const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';

const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

interface ReportJSON {
  report_title: string;
  location_context: string;
  findings: {
    heading: string;
    content: string;
  }[];
  recommendations: string[];
  severity_level: 'Niedrig' | 'Mittel' | 'Hoch';
}

function getReportTypeContext(type: ReportType): string {
  switch (type) {
    case ReportType.DAMAGE:
      return 'Schadensbericht (z.B. Wasserschaden, Brandschaden, Sturmschaden, Schimmelbefall)';
    case ReportType.INSPECTION:
      return 'Inspektionsbericht (z.B. Zustandsprüfung, Wartungsinspektion, Bauabnahme)';
    case ReportType.OFFER:
      return 'Angebotsbericht mit Kostenschätzung für Sanierungsmaßnahmen';
    default:
      return 'Technischer Bericht';
  }
}

function formatJSONToMarkdown(json: ReportJSON, input: GenerationInput): string {
  const date = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let markdown = `# ${json.report_title}\n\n`;
  
  markdown += `**Datum:** ${date}  \n`;
  markdown += `**Kunde/Objekt:** ${input.customerName}  \n`;
  markdown += `**Erstellt von:** ${input.companyName || 'Fachbetrieb'}  \n`;
  markdown += `**Örtlichkeit:** ${json.location_context}  \n`;
  markdown += `**Schadensklassifizierung:** ${json.severity_level}\n\n`;
  
  markdown += `---\n\n`;
  
  markdown += `## Befundaufnahme\n\n`;
  for (const finding of json.findings) {
    markdown += `### ${finding.heading}\n\n`;
    markdown += `${finding.content}\n\n`;
  }
  
  markdown += `---\n\n`;
  
  markdown += `## Empfohlene Maßnahmen\n\n`;
  for (let i = 0; i < json.recommendations.length; i++) {
    markdown += `${i + 1}. ${json.recommendations[i]}\n`;
  }
  markdown += '\n';
  
  markdown += `---\n\n`;
  
  markdown += `*Dieser Bericht wurde nach bestem Wissen und Gewissen erstellt. Änderungen und Ergänzungen nach eingehender Prüfung vor Ort vorbehalten.*\n\n`;
  markdown += `*${input.companyName || 'Fachbetrieb'} • ${date}*`;
  
  return markdown;
}

export async function generateProfessionalReport(input: GenerationInput): Promise<string> {
  if (!genAI) {
    return generateFallbackReport(input);
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 8192,
      }
    });
    
    const reportTypeContext = getReportTypeContext(input.type);

    const prompt = `Du bist ein technischer Sachverständiger und erfahrener Gutachter für Gebäudeschäden, Sanierung und Bautechnik. Du schreibst seit über 20 Jahren professionelle Gutachten und Berichte für Versicherungen, Hausverwaltungen und Privatkunden.

Deine Aufgabe ist es, aus den folgenden Stichpunkten und ggf. Fotos einen professionellen ${reportTypeContext} zu generieren.

**Objekt/Kunde:** ${input.customerName}
**Firma:** ${input.companyName || 'Fachbetrieb'}
**Befund-Stichpunkte:** ${input.keywords}
${input.additionalInfo ? `**Zusätzliche Informationen:** ${input.additionalInfo}` : ''}

WICHTIGE ANWEISUNGEN FÜR DEN BERICHT:
- Schreibe im sachlichen, technischen Stil eines Vollprofis
- Verwende Passiv-Formulierungen (z.B. "Es wurde festgestellt...", "Der Schaden ist zurückzuführen auf...")
- Sei SEHR detailliert und ausführlich bei den Befunden
- Beschreibe technische Zusammenhänge und mögliche Ursachen
- Bei Bildern: Analysiere sie genau und beschreibe sichtbare Schäden, Materialien, Verfärbungen, Feuchtigkeit etc.
- Gib konkrete, umsetzbare Handlungsempfehlungen
- Schätze die Dringlichkeit/Schwere realistisch ein

Ausgabeformat: JSON. Halte dich STRIKT an dieses Schema. Schreibe KEINE Einleitungssätze vor dem JSON und KEINE Erklärungen danach. NUR das JSON.

Das JSON muss folgende Struktur haben:
{
  "report_title": "Ein professioneller Titel für den Bericht (z.B. 'Schadensbericht Wasserschaden Kellergeschoss')",
  "location_context": "Erkannter/vermuteter Ort basierend auf den Informationen (z.B. 'Untergeschoss / Heizungsraum' oder 'Erdgeschoss / Badezimmer')",
  "findings": [
    {
      "heading": "Überschrift des Befunds (z.B. 'Zustand der Heizungsanlage' oder 'Feuchtigkeitsschäden an der Wandfläche')",
      "content": "Detaillierter, ausführlicher Text im Passiv. Mindestens 3-4 Sätze pro Befund. Beschreibe genau was festgestellt wurde, welche Materialien betroffen sind, welche Ursachen vermutet werden, und welche Folgeschäden drohen könnten."
    }
  ],
  "recommendations": [
    "Konkrete Maßnahme 1 mit Begründung",
    "Konkrete Maßnahme 2 mit Begründung",
    "Weitere Maßnahmen..."
  ],
  "severity_level": "Niedrig | Mittel | Hoch"
}

WICHTIG: 
- Erstelle mindestens 2-4 verschiedene Findings je nach Komplexität
- Jeder Finding-Content sollte ausführlich sein (mindestens 50-100 Wörter)
- Die Recommendations sollten spezifisch und umsetzbar sein (mindestens 3-5 Empfehlungen)
- Antworte NUR mit dem JSON, ohne Markdown-Codeblöcke oder Backticks`;

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
    
    if (input.images && input.images.length > 0) {
      for (const img of input.images) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      }
      parts.push({ 
        text: '\n\nAnalysiere die beigefügten Fotos sehr genau. Beschreibe alle sichtbaren Schäden, Verfärbungen, Feuchtigkeit, Materialzustände und andere relevante Details in den Findings.' 
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text().trim();
    
    // Remove potential markdown code blocks
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    
    try {
      const reportJSON: ReportJSON = JSON.parse(text);
      return formatJSONToMarkdown(reportJSON, input);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.log('Raw response:', text);
      return text || generateFallbackReport(input);
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    return generateFallbackReport(input);
  }
}

function generateFallbackReport(input: GenerationInput): string {
  const date = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const typeLabels: Record<string, string> = {
    'DAMAGE': 'Schadensbericht',
    'INSPECTION': 'Inspektionsbericht',
    'OFFER': 'Angebot'
  };

  const reportType = typeLabels[input.type] || 'Bericht';
  const keywords = input.keywords.split(/[,;.]/).map(k => k.trim()).filter(k => k);

  return `# ${reportType} — ${input.customerName}

**Datum:** ${date}  
**Kunde/Objekt:** ${input.customerName}  
**Erstellt von:** ${input.companyName || 'Fachbetrieb'}  
**Schadensklassifizierung:** Ausstehend (manuelle Prüfung erforderlich)

---

## Befundaufnahme

### Festgestellte Sachverhalte

Im Rahmen der Ortsbegehung wurden folgende Sachverhalte dokumentiert und einer ersten Bewertung unterzogen:

${keywords.map(k => `- ${k}`).join('\n')}

${input.additionalInfo ? `\n### Zusätzliche Hinweise\n\n${input.additionalInfo}` : ''}

Es wird empfohlen, die festgestellten Punkte durch einen qualifizierten Fachbetrieb eingehend prüfen zu lassen, um das Schadensausmaß vollständig zu erfassen und geeignete Sanierungsmaßnahmen einzuleiten.

---

## Empfohlene Maßnahmen

1. Detaillierte Schadensanalyse durch qualifiziertes Fachpersonal vor Ort
2. Fotografische Dokumentation aller betroffenen Bereiche zur Beweissicherung
3. Erstellung eines detaillierten Sanierungskonzepts mit Kostenschätzung
4. Abstimmung der weiteren Vorgehensweise mit dem Auftraggeber
5. Ggf. Einschaltung der Gebäudeversicherung zur Schadensregulierung

---

*Dieser Bericht wurde automatisch erstellt. Eine abschließende Bewertung durch einen Sachverständigen vor Ort wird empfohlen.*

*${input.companyName || 'Fachbetrieb'} • ${date}*
`;
}
