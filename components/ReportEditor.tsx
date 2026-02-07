
import React, { useState } from 'react';
import { Report, ReportType, User, ReportImage } from '../types';
import { Save, ArrowLeft, Copy, Check, FileDown, FileText, Image as ImageIcon, X, Mail, Send, Loader2, CloudUpload, Sparkles, Edit3, Home, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, Footer, PageNumber } from 'docx';
import { generateProfessionalReport } from '../services/geminiService';
import ImageEditor from './ImageEditor';

interface ReportEditorProps {
  report: Report;
  currentUser: User;
  isOnline: boolean;
  onSave: (updated: Report) => void;
  onBack: () => void;
}

const ReportEditor: React.FC<ReportEditorProps> = ({ report, currentUser, isOnline, onSave, onBack }) => {
  const [content, setContent] = useState(report.content);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);

  // SANEO Corporate Identity (nur für Export)
  const saneoNavy = [0, 45, 91]; // #002D5B
  const saneoLime = [137, 217, 0]; // #89D900

  const cleanContent = (text: string) => {
    return text.replace(/\*\*/g, '').replace(/__/g, '').replace(/^\s*#+\s*/gm, '');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSync = async () => {
    if (!report.rawInput) return;
    setIsSyncing(true);
    try {
      const result = await generateProfessionalReport({
        type: report.rawInput.type,
        keywords: report.rawInput.keywords,
        customerName: report.customer,
        images: report.images || []
      });
      const updatedReport: Report = {
        ...report,
        content: result,
        isOfflineDraft: false,
        title: report.title.replace(' (Entwurf)', '')
      };
      setContent(result);
      onSave(updatedReport);
    } catch (error) {
      alert("Fehler bei KI-Überarbeitung.");
    } finally {
      setIsSyncing(false);
    }
  };

  const saveBlobNative = (blob: Blob, fileName: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const footerLimit = pageHeight - 30; // Mehr Platz für die Fußzeile lassen

      const addFooter = (pageNum: number, total: number) => {
        // Trennlinie über der Fußzeile
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'normal');
        
        // Links: Firma
        doc.text('SANEO SCHADENSERVICE GMBH | Dokumentation', margin, pageHeight - 12);
        
        // Rechts: Seitenzahl (KEINE Überlappung mehr möglich)
        doc.text(`Seite ${pageNum} von ${total}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      };

      // Header Brand Block
      doc.setFillColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Logo Grafik (Minimalistisches Haus)
      doc.setDrawColor(saneoLime[0], saneoLime[1], saneoLime[2]);
      doc.setLineWidth(1);
      doc.line(margin, 22, margin + 8, 12);
      doc.line(margin + 8, 12, margin + 16, 22);
      doc.line(margin + 3, 22, margin + 3, 27);
      doc.line(margin + 13, 22, margin + 13, 27);
      doc.line(margin + 3, 27, margin + 13, 27);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('SANEO', margin + 20, 24);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('SCHADENSERVICE GMBH', margin + 20, 29);

      doc.setFontSize(8);
      doc.text(`BELEGDATEN: ${report.date}`, pageWidth - margin, 24, { align: 'right' });
      doc.text(`DOK-ID: SR-${report.id.slice(-6).toUpperCase()}`, pageWidth - margin, 29, { align: 'right' });

      // Titel
      doc.setTextColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(report.title.toUpperCase(), margin, 55);

      // Info-Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, 63, pageWidth - (margin * 2), 20, 1, 1, 'F');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('KUNDE / OBJEKTANSCHRIFT', margin + 6, 70);
      doc.setTextColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(report.customer, margin + 6, 77);

      let yPos = 95;
      const lines = content.split('\n');

      lines.forEach((line) => {
        const isHeading = line.startsWith('#');
        const cleanLine = line.replace(/^\s*#+\s*/, '').replace(/\*\*/g, '').trim();
        
        if (!cleanLine) {
          yPos += 4;
          return;
        }

        if (isHeading) {
          // Prüfen: Genug Platz für Headline + mind. 3 Zeilen Text? (ca. 35mm)
          if (yPos + 35 > footerLimit) {
            doc.addPage();
            yPos = 30;
          }

          yPos += 10;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(saneoLime[0], saneoLime[1], saneoLime[2]);
          doc.text(cleanLine, margin, yPos);
          yPos += 8;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
        } else {
          const splitText = doc.splitTextToSize(cleanLine, pageWidth - (margin * 2));
          splitText.forEach((textLine: string) => {
             if (yPos > footerLimit) {
               doc.addPage();
               yPos = 30;
             }
             doc.text(textLine, margin, yPos);
             yPos += 7.5; // Angenehmer Zeilenabstand
          });
        }
      });

      // Grundriss-Skizze (vor Fotos)
      if (report.floorplanSketch) {
        doc.addPage();
        yPos = 30;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
        doc.text('GRUNDRISS-SKIZZE', margin, yPos);
        yPos += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('Technische Vor-Ort-Dokumentation mit Maßangaben und Schadenspunkten', margin, yPos + 8);
        yPos += 20;

        try {
          // Skizze zentriert und groß darstellen
          const sketchWidth = pageWidth - (margin * 2);
          const sketchHeight = sketchWidth * 0.75; // 4:3 Ratio
          
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.5);
          doc.rect(margin - 1, yPos - 1, sketchWidth + 2, sketchHeight + 2);
          
          doc.addImage(report.floorplanSketch, 'PNG', margin, yPos, sketchWidth, sketchHeight);
        } catch (e) { 
          console.error('Fehler beim Einfügen der Skizze:', e); 
        }
      }

      // Bilderanhang
      if (report.images && report.images.length > 0) {
        doc.addPage();
        yPos = 30;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
        doc.text('TECHNISCHE FOTODOKUMENTATION', margin, yPos);
        yPos += 15;

        report.images.forEach((img, idx) => {
          const imgHeight = 65;
          // Prüfen: Bild + Beschriftung + Puffer
          if (yPos + imgHeight + 20 > footerLimit) {
            doc.addPage();
            yPos = 30;
          }
          try {
            const imgWidth = 85;
            doc.setDrawColor(241, 245, 249);
            doc.rect(margin - 0.5, yPos - 0.5, imgWidth + 1, imgHeight + 1);
            doc.addImage(`data:${img.mimeType};base64,${img.data}`, 'JPEG', margin, yPos, imgWidth, imgHeight);
            doc.setFontSize(9);
            doc.setTextColor(saneoNavy[0], saneoNavy[1], saneoNavy[2]);
            doc.text(`ABBILDUNG ${idx + 1}: BEFUNDAUFNAHME VOR ORT`, margin, yPos + imgHeight + 7);
            yPos += imgHeight + 25;
          } catch (e) { console.error(e); }
        });
      }

      // Seitenzahlen am Ende hinzufügen
      const totalPages = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }
      doc.save(`SANEO_PROTOKOLL_${report.customer.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToDocx = async () => {
    setIsExporting(true);
    try {
      const children: any[] = [
        new Paragraph({
          children: [
            new TextRun({ text: "SANEO ", bold: true, color: "002D5B", size: 32 }),
            new TextRun({ text: "SCHADENSERVICE", color: "89D900", size: 32, bold: true })
          ],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 600 }
        }),
        new Paragraph({ 
          text: report.title.toUpperCase(), 
          heading: HeadingLevel.HEADING_1, 
          spacing: { after: 400 },
          keepNext: true 
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: "002D5B" },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: "002D5B" },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "PROJEKT / KUNDE", bold: true, color: "89D900", size: 18 })] }), new Paragraph({ text: report.customer })],
                  margins: { top: 120, bottom: 120, left: 120 },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: "DATUM", bold: true, color: "89D900", size: 18 })] }), new Paragraph({ text: report.date })],
                  margins: { top: 120, bottom: 120, left: 120 },
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 400 } }),
      ];

      content.split('\n').forEach(line => {
        const isHeading = line.startsWith('#');
        const cleanLine = line.replace(/^\s*#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!cleanLine) return;
        
        children.push(new Paragraph({
          children: [new TextRun({ 
            text: cleanLine, 
            bold: isHeading, 
            size: isHeading ? 28 : 22, 
            color: isHeading ? "89D900" : "334155" 
          })],
          heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
          spacing: { after: isHeading ? 200 : 180, before: isHeading ? 400 : 0 },
          keepNext: isHeading, 
          keepLines: true 
        }));
      });

      if (report.images && report.images.length > 0) {
        children.push(new Paragraph({ 
          text: "ANHANG: FOTODOKUMENTATION", 
          heading: HeadingLevel.HEADING_2, 
          spacing: { before: 800, after: 400 },
          keepNext: true 
        }));
        report.images.forEach((img, idx) => {
          const binaryData = atob(img.data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) bytes[i] = binaryData.charCodeAt(i);
          children.push(new Paragraph({
            children: [
              new ImageRun({ data: bytes, transformation: { width: 480, height: 360 } } as any),
              new TextRun({ text: `\nABBILDUNG ${idx + 1}: BEFUNDNAHME VOR ORT`, size: 16, color: "002D5B", bold: true })
            ],
            spacing: { after: 600, before: 200 },
            alignment: AlignmentType.CENTER,
            keepLines: true
          }));
        });
      }

      const doc = new Document({ 
        sections: [{ 
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.LEFT,
                  children: [
                    new TextRun({ text: "SANEO SCHADENSERVICE GMBH | Seite ", size: 18, color: "94A3B8" }), 
                    new TextRun({ children: [PageNumber.CURRENT] }),
                    new TextRun({ text: " von ", size: 18, color: "94A3B8" }),
                    new TextRun({ children: [PageNumber.TOTAL_PAGES] })
                  ],
                }),
              ],
            }),
          },
          children 
        }] 
      });
      const blob = await Packer.toBlob(doc);
      saveBlobNative(blob, `SANEO_Dossier_${report.customer.replace(/\s+/g, '_')}.docx`);
    } finally {
      setIsExporting(false);
    }
  };

  const simulateEmailSend = (targetEmail: string) => {
    if (!targetEmail.includes('@')) return alert("Gültige E-Mail erforderlich.");
    setIsSending(true);
    setTimeout(() => { 
      setIsSending(false); 
      setSendSuccess(true); 
      setTimeout(() => {
        setSendSuccess(false);
        setShowEmailModal(false);
      }, 2000); 
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col font-sans">
      <div className="border-b px-6 py-4 flex items-center justify-between bg-white shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 hover:bg-slate-100 rounded-2xl transition-all text-slate-600"><ArrowLeft size={22} /></button>
          <div>
            <h2 className="font-black uppercase tracking-tight text-slate-900">Dossier-Review</h2>
            <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest leading-none mt-1">Prüfung & Export</p>
          </div>
        </div>
        <div className="flex gap-2">
          {report.isOfflineDraft && isOnline && (
            <button onClick={handleSync} disabled={isSyncing} className="bg-indigo-600 text-white px-6 py-2 rounded-2xl text-xs font-black tracking-widest uppercase flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} KI-Politur
            </button>
          )}
          <button onClick={handleCopy} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors">
            {copied ? <Check size={22} /> : <Copy size={22} />}
          </button>
          <button onClick={() => onSave({ ...report, content })} className="bg-slate-100 text-slate-700 px-6 py-2 rounded-2xl text-xs font-black tracking-widest uppercase hover:bg-slate-200 transition-colors">
            Sichern
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSyncing}
            className={`flex-1 w-full p-12 border-none rounded-[3rem] focus:ring-4 focus:ring-indigo-500/10 outline-none font-medium text-slate-700 text-xl leading-relaxed shadow-xl transition-all ${isSyncing ? 'bg-white/50 animate-pulse' : 'bg-white'}`}
            placeholder="Warten auf KI-Generierung..."
          />
        </div>

        {/* Sidebar for images and sketch */}
        {(report.images && report.images.length > 0) || report.floorplanSketch ? (
          <div className="w-full md:w-80 bg-white border-l p-8 overflow-y-auto">
            {/* Floorplan Sketch */}
            {report.floorplanSketch && (
              <div className="mb-8">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Edit3 size={16} /> Grundriss-Skizze
                </h4>
                <div className="rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-sm">
                  <img src={report.floorplanSketch} className="w-full object-contain bg-white" alt="Grundriss" />
                </div>
              </div>
            )}
            
            {/* Photo documentation */}
            {report.images && report.images.length > 0 && (
              <>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <ImageIcon size={16} /> Fotodokumentation ({report.images.length})
                </h4>
                <div className="space-y-4">
                  {report.images.map((img, idx) => (
                    <div key={idx} className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-slate-50 shadow-sm group">
                      <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" alt={`Beweis ${idx}`} />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button onClick={() => setEditingImageIndex(idx)} className="p-3 bg-white text-indigo-600 rounded-2xl shadow-xl hover:scale-110 active:scale-95"><Edit3 size={24} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="p-8 border-t bg-white flex flex-col sm:flex-row justify-between items-center gap-8 shadow-2xl">
        <div className="flex items-center gap-6">
           <div className="hidden lg:block text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Saneo Corporate Layout</p>
              <p className="text-xs text-slate-500 font-medium">Export erfolgt im firmeneigenen Design</p>
           </div>
           <div className="flex gap-3">
              <button onClick={exportToPDF} disabled={isExporting} className="flex items-center gap-3 px-8 py-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-3xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 transition-all active:scale-95 shadow-sm">
                <FileDown size={20} className="text-red-500" /> PDF Export
              </button>
              <button onClick={exportToDocx} disabled={isExporting} className="flex items-center gap-3 px-8 py-4 bg-slate-50 border border-slate-200 text-slate-700 rounded-3xl font-black text-xs uppercase tracking-widest hover:border-indigo-600 transition-all active:scale-95 shadow-sm">
                <FileText size={20} className="text-blue-500" /> Word Export
              </button>
           </div>
        </div>
        
        <button onClick={() => setShowEmailModal(true)} disabled={!isOnline} className="w-full sm:w-auto flex items-center justify-center gap-3 px-16 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
          <Mail size={22} /> Dossier versenden
        </button>
      </div>

      {editingImageIndex !== null && report.images && (
        <ImageEditor 
          image={report.images[editingImageIndex]}
          onSave={(updated) => {
            const newImages = [...(report.images || [])];
            newImages[editingImageIndex] = updated;
            onSave({ ...report, images: newImages });
            setEditingImageIndex(null);
          }}
          onClose={() => setEditingImageIndex(null)}
        />
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in duration-300">
             {isSending ? (
                <div className="py-6">
                  <Loader2 className="animate-spin mx-auto text-indigo-600 mb-4" size={48} />
                  <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Übertragung läuft...</p>
                </div>
              ) : sendSuccess ? (
                <div className="py-6">
                  <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
                  <h3 className="text-xl font-black text-slate-900 uppercase">Versendet!</h3>
                </div>
              ) : (
                <>
                  <Mail className="mx-auto text-indigo-600 mb-4" size={48} />
                  <h3 className="text-xl font-black text-slate-900 uppercase mb-6">Bericht versenden</h3>
                  <div className="space-y-4">
                    <button onClick={() => simulateEmailSend(currentUser.email)} className="w-full p-4 border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-600 font-bold text-sm transition-colors text-left flex items-center justify-between">
                      <span>An mich ({currentUser.email})</span>
                      <ArrowLeft size={16} className="rotate-180" />
                    </button>
                    <input 
                      type="email" 
                      placeholder="Empfänger E-Mail..." 
                      className="w-full p-4 border border-slate-200 rounded-2xl focus:border-indigo-600 outline-none text-center font-bold" 
                      value={manualEmail} 
                      onChange={(e) => setManualEmail(e.target.value)} 
                    />
                    <button onClick={() => simulateEmailSend(manualEmail)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg">
                      Jetzt versenden
                    </button>
                    <button onClick={() => setShowEmailModal(false)} className="w-full py-2 text-slate-400 font-bold text-xs uppercase tracking-widest">Schließen</button>
                  </div>
                </>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportEditor;
