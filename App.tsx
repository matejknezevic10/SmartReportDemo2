import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, LayoutDashboard, History, Loader2, Camera, X, BookOpen, AlertTriangle, CheckCircle, Briefcase, LogOut, Mic, MicOff, Sparkles, Database, PenTool } from 'lucide-react';
import { Report, ReportType, GenerationInput, Template, User, UserRole, ReportImage } from './types';
import { generateProfessionalReport } from './services/geminiService';
import ReportCard from './components/ReportCard';
import ReportEditor from './components/ReportEditor';
import TemplateManager from './components/TemplateManager';
import BusinessDashboard from './components/BusinessDashboard';
import Login from './components/Login';
import FloorplanSketch from './components/FloorplanSketch';
import { hashPassword } from './utils/security';

const App: React.FC = () => {
  // --- STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'reports' | 'dashboard'>('reports');
  const [isRecording, setIsRecording] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSketchOpen, setIsSketchOpen] = useState(false);
  const [sketchData, setSketchData] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const [formInput, setFormInput] = useState<GenerationInput>({
    type: ReportType.DAMAGE,
    keywords: '',
    customerName: '',
    additionalInfo: '',
    images: []
  });

  // --- PERSISTENCE & INITIALIZATION ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Team-Datenbank laden
    const savedTeam = localStorage.getItem('saneo_team_db');
    if (savedTeam) {
      setTeamMembers(JSON.parse(savedTeam));
    } else {
      // Initialer Admin-Account (Passwörter sind jetzt gehasht)
      const initialTeam: User[] = [
        { 
          id: 'admin-1', 
          name: 'Zentrale Leitung', 
          role: UserRole.MANAGER, 
          email: 'zentrale@saneo.de', 
          passwordHash: hashPassword('1234')
        },
        { 
          id: 'tech-1', 
          name: 'Max Mustermann', 
          role: UserRole.TECHNICIAN, 
          email: 'm.mustermann@saneo.de', 
          passwordHash: hashPassword('0000')
        }
      ];
      setTeamMembers(initialTeam);
      localStorage.setItem('saneo_team_db', JSON.stringify(initialTeam));
    }

    // Berichte laden
    const savedReports = localStorage.getItem('saneo_reports_db');
    if (savedReports) setReports(JSON.parse(savedReports));

    // Templates laden
    const savedTemplates = localStorage.getItem('saneo_templates_db');
    if (savedTemplates) {
      setTemplates(JSON.parse(savedTemplates));
    } else {
      // Standard-Templates
      const defaultTemplates: Template[] = [
        {
          id: 'tpl-1',
          type: ReportType.DAMAGE,
          name: 'Wasserschaden Standard',
          description: 'Vorlage für Wasserschäden in Wohngebäuden',
          category: 'Sanitär',
          structure: 'Schadensort, Ursache, Ausmaß, Sofortmaßnahmen, Empfehlung'
        },
        {
          id: 'tpl-2',
          type: ReportType.INSPECTION,
          name: 'Jahresinspektion Heizung',
          description: 'Standardprüfung für Heizungsanlagen',
          category: 'Heizung',
          structure: 'Anlagentyp, Prüfpunkte, Messwerte, Zustand, Empfehlungen'
        }
      ];
      setTemplates(defaultTemplates);
      localStorage.setItem('saneo_templates_db', JSON.stringify(defaultTemplates));
    }
    
    // Session check (nur ID speichern, nicht das ganze User-Objekt)
    const savedSessionId = localStorage.getItem('saneo_session_id');
    if (savedSessionId) {
      const savedTeamParsed = savedTeam ? JSON.parse(savedTeam) : [];
      const user = savedTeamParsed.find((u: User) => u.id === savedSessionId);
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
      }
    }

    // Speech Recognition Setup
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'de-DE';
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setFormInput(prev => ({
            ...prev,
            keywords: prev.keywords + (prev.keywords ? ' ' : '') + finalTranscript
          }));
        }
      };
      
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);
      
      recognitionRef.current = recognition;
    }

    // Cleanup function - wichtig für Memory Leak Prevention
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      // Speech Recognition cleanup
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
      }
    };
  }, []);

  // Sync Team to DB
  useEffect(() => {
    if (teamMembers.length > 0) {
      localStorage.setItem('saneo_team_db', JSON.stringify(teamMembers));
    }
  }, [teamMembers]);

  // Sync Reports to DB
  useEffect(() => {
    localStorage.setItem('saneo_reports_db', JSON.stringify(reports));
  }, [reports]);

  // Sync Templates to DB
  useEffect(() => {
    localStorage.setItem('saneo_templates_db', JSON.stringify(templates));
  }, [templates]);

  // --- ACTIONS ---
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    // Nur die User-ID speichern, nicht das ganze Objekt
    localStorage.setItem('saneo_session_id', user.id);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('saneo_session_id');
    setActiveTab('reports');
  };

  const loadDemoData = () => {
    if (!currentUser) return;
    const demoReport: Report = {
      id: 'demo-' + Date.now(),
      type: ReportType.DAMAGE,
      title: 'TECHNISCHES GUTACHTEN: MASSIVER WASSERSCHADEN',
      customer: 'Hausverwaltung "Berliner Altbau-Residenz" / Objekt: Kurfürstendamm 210, 10719 Berlin',
      date: new Date().toLocaleDateString('de-DE'),
      status: 'Draft',
      createdById: currentUser.id,
      createdByName: currentUser.name,
      images: [],
      content: `# ZUSAMMENFASSUNG DES SCHADENSEREIGNISSES
Am heutigen Vormittag erfolgte ein Notfall-Einsatz im Objekt Kurfürstendamm 210. Der Mieter der Wohneinheit im 3. OG (links) meldete massiven Wasseraustritt im Bereich des Master-Badezimmers.

# TECHNISCHE BEFUNDAUFNAHME
Die Überprüfung mittels Thermografiekamera zeigte eine deutliche Wärme-Anomalie im Bereich der Waschtisch-Installation. Der Wasserdruck lag bei Ankunft bei 4,2 bar (Sollwert: 3,0 bar).

# SOFORTMASSNAHMEN
1. Hauptwasserzufuhr abgesperrt
2. Betroffene Bereiche mit Industrietrockner behandelt
3. Temporäre Abdichtung der defekten Leitung

# EMPFEHLUNG
Austausch des gesamten Leitungsabschnitts empfohlen. Geschätzte Kosten: 2.800 - 3.500 EUR`
    };

    setReports([demoReport, ...reports]);
    setSelectedReportId(demoReport.id);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Spracherkennung wird von diesem Browser nicht unterstützt.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        // Bildgröße prüfen (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert(`Bild "${file.name}" ist zu groß (max. 5MB)`);
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          const newImage: ReportImage = { data: base64String, mimeType: file.type };
          setFormInput(prev => ({ ...prev, images: [...prev.images, newImage] }));
        };
        reader.readAsDataURL(file);
      });
    }
    // Input zurücksetzen für erneute Auswahl derselben Datei
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormInput(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleCreateReport = async () => {
    if (!formInput.keywords.trim()) {
      alert("Bitte gib einen Befund ein.");
      return;
    }
    if (!formInput.customerName.trim()) {
      alert("Bitte gib einen Kunden an.");
      return;
    }
    if (!currentUser) return;
    
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsLoading(true);
    try {
      const result = await generateProfessionalReport(formInput);
      const newReport: Report = {
        id: Date.now().toString(),
        type: formInput.type,
        title: `${formInput.type === ReportType.DAMAGE ? 'Schadensbericht' : formInput.type === ReportType.INSPECTION ? 'Inspektionsbericht' : 'Angebot'} - ${formInput.customerName}`,
        customer: formInput.customerName,
        content: result,
        date: new Date().toLocaleDateString('de-DE'),
        status: 'Draft',
        images: formInput.images,
        floorplanSketch: sketchData || undefined,
        createdById: currentUser.id,
        createdByName: currentUser.name,
        isOfflineDraft: false,
        rawInput: {
          keywords: formInput.keywords,
          type: formInput.type
        }
      };
      setReports([newReport, ...reports]);
      setSelectedReportId(newReport.id);
      setIsCreating(false);
      setSketchData(null);
      setFormInput({ type: ReportType.DAMAGE, keywords: '', customerName: '', additionalInfo: '', images: [] });
    } catch (error) {
      console.error('Report generation failed:', error);
      alert("Fehler bei der Generierung. Bitte prüfe deine Internetverbindung.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplates = (updatedTemplates: Template[]) => {
    setTemplates(updatedTemplates);
  };

  const filteredReports = reports.filter(r => 
    r.customer.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeReport = reports.find(r => r.id === selectedReportId);

  // --- RENDER LOGIN ---
  if (!isLoggedIn) {
    return <Login users={teamMembers} onLogin={handleLogin} />;
  }

  // --- RENDER TEMPLATE MANAGER ---
  if (isManagingTemplates) {
    return (
      <TemplateManager 
        templates={templates} 
        onSave={handleSaveTemplates} 
        onBack={() => setIsManagingTemplates(false)} 
      />
    );
  }

  // --- RENDER MAIN APP ---
  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <header className="sticky top-0 bg-white border-b border-slate-200 z-30 px-6 py-4 shadow-sm">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none uppercase">
                SmartReport <span className="text-slate-400 font-medium lowercase">| Business Edition</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isOnline && (
              <span className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl text-xs font-bold">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                Offline
              </span>
            )}
            <button onClick={loadDemoData} className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-all mr-2">
              <Database size={16} /> Demo laden
            </button>
            <div className="hidden sm:flex flex-col items-end mr-1">
              <p className="text-xs font-black uppercase">{currentUser?.name}</p>
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                {currentUser?.role === UserRole.MANAGER ? 'Büro' : 'Außendienst'}
              </p>
            </div>
            <button onClick={handleLogout} title="Abmelden" className="p-2.5 bg-slate-100 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {currentUser?.role === UserRole.MANAGER && (
          <div className="flex p-1.5 bg-slate-200/50 rounded-3xl w-fit mb-4">
            <button onClick={() => setActiveTab('reports')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <Plus size={16} className="inline mr-2 mb-0.5" /> Berichterstellung
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutDashboard size={16} className="inline mr-2 mb-0.5" /> Dashboard
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && currentUser?.role === UserRole.MANAGER ? (
          <BusinessDashboard 
            reports={reports} 
            team={teamMembers} 
            onUpdateTeam={setTeamMembers}
            onOpenReport={(id) => setSelectedReportId(id)}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Kunde oder Projekt suchen..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={() => setIsManagingTemplates(true)} className="flex items-center justify-center gap-3 px-6 py-4 bg-white border border-slate-200 rounded-3xl text-slate-700 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                <BookOpen size={18} className="text-indigo-600" /> Vorlagen
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { type: ReportType.DAMAGE, label: 'Schaden', sub: 'Erfassung', icon: AlertTriangle, color: 'red' },
                { type: ReportType.INSPECTION, label: 'Inspektion', sub: 'Prüfung', icon: CheckCircle, color: 'blue' },
                { type: ReportType.OFFER, label: 'Angebot', sub: 'Kalkulation', icon: Briefcase, color: 'green' }
              ].map(item => (
                <button 
                  key={item.type}
                  onClick={() => { setFormInput({...formInput, type: item.type}); setIsCreating(true); }}
                  className="flex items-center gap-5 p-6 bg-white border border-slate-200 rounded-[2.5rem] hover:border-indigo-600 hover:shadow-xl hover:-translate-y-1 transition-all group shadow-sm active:scale-95 text-left"
                >
                  <div className={`p-4 rounded-2xl ${item.color === 'red' ? 'bg-red-50 text-red-600' : item.color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'} group-hover:scale-110 transition-transform`}>
                    <item.icon size={28} />
                  </div>
                  <div>
                    <span className="block text-base font-black leading-none uppercase">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 block">{item.sub}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-black flex items-center gap-3 uppercase tracking-tighter">
                <History size={22} className="text-indigo-600" /> Meine aktuellen Berichte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReports.filter(r => r.createdById === currentUser?.id).length > 0 ? (
                  filteredReports.filter(r => r.createdById === currentUser?.id).map(report => (
                    <ReportCard key={report.id} report={report} onClick={(id) => setSelectedReportId(id)} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
                    <p className="font-bold">Keine eigenen Berichte vorhanden</p>
                    <p className="text-sm mt-2">Erstelle deinen ersten Bericht über die Buttons oben</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Create Report Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-[3rem] rounded-t-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] flex flex-col">
            {/* Header - fixed */}
            <div className="p-5 sm:p-8 border-b bg-white flex justify-between items-center shrink-0">
              <h3 className="text-xl sm:text-2xl font-black tracking-tight uppercase">Neuer Bericht</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={24}/></button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8">
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Kunde / Objekt</label>
                  <input type="text" placeholder="z.B. Müller, Berlin" className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-indigo-600 outline-none font-bold transition-colors" value={formInput.customerName} onChange={(e) => setFormInput({...formInput, customerName: e.target.value})} />
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Befund (Stichpunkte)</label>
                  <div className="relative">
                    <textarea rows={3} placeholder="Beschreibe den Befund..." className="w-full border-2 border-slate-100 rounded-2xl p-4 pr-16 bg-slate-50 focus:border-indigo-600 outline-none font-bold resize-none transition-colors" value={formInput.keywords} onChange={(e) => setFormInput({...formInput, keywords: e.target.value})} />
                    <button onClick={toggleRecording} className={`absolute right-3 bottom-3 p-3 rounded-xl shadow-lg transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                  {isRecording && (
                    <p className="text-xs text-red-500 font-bold mt-2 ml-2 animate-pulse">
                      🎤 Aufnahme läuft...
                    </p>
                  )}
                </div>

                {/* Fotos & Skizze in kompakterem Layout */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Fotos */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Fotos ({formInput.images.length}/10)</label>
                    <div className="flex flex-wrap gap-2">
                      {formInput.images.slice(0, 3).map((img, idx) => (
                        <div key={idx} className="relative w-12 h-12 rounded-xl overflow-hidden border-2 border-slate-100 group">
                          <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" alt="Beweis" />
                          <button onClick={() => removeImage(idx)} className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X size={14}/></button>
                        </div>
                      ))}
                      {formInput.images.length > 3 && (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          +{formInput.images.length - 3}
                        </div>
                      )}
                      {formInput.images.length < 10 && (
                        <button onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-200 transition-all text-slate-400 hover:text-indigo-600">
                          <Camera size={20} />
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                  </div>

                  {/* Grundriss-Skizze */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Skizze</label>
                    {sketchData ? (
                      <div className="relative h-12 rounded-xl overflow-hidden border-2 border-indigo-200 bg-indigo-50 flex items-center px-3 gap-2">
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
                          <PenTool size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 flex-1">Vorhanden</span>
                        <button onClick={() => setIsSketchOpen(true)} className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600">
                          <PenTool size={14} />
                        </button>
                        <button onClick={() => setSketchData(null)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsSketchOpen(true)}
                        className="w-full h-12 border-2 border-dashed border-slate-200 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-all text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-2"
                      >
                        <PenTool size={18} />
                        <span className="text-xs font-bold">Zeichnen</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer - fixed */}
            <div className="p-5 sm:p-6 bg-slate-50 border-t shrink-0">
              <button onClick={handleCreateReport} disabled={isLoading || !isOnline} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-[0.98]">
                {isLoading ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Report erstellen'}
              </button>
              {!isOnline && (
                <p className="text-xs text-orange-600 font-bold text-center mt-3">
                  ⚠️ Offline - KI nicht verfügbar
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Editor */}
      {activeReport && currentUser && (
        <ReportEditor 
          report={activeReport} 
          currentUser={currentUser}
          isOnline={isOnline}
          onBack={() => setSelectedReportId(null)}
          onSave={(updated) => {
            setReports(reports.map(r => r.id === updated.id ? updated : r));
            setSelectedReportId(null);
          }}
        />
      )}

      {/* Floorplan Sketch Tool */}
      {isSketchOpen && (
        <FloorplanSketch
          onSave={(imageData) => {
            setSketchData(imageData);
            setIsSketchOpen(false);
          }}
          onClose={() => setIsSketchOpen(false)}
          existingSketch={sketchData || undefined}
        />
      )}
    </div>
  );
};

export default App;
