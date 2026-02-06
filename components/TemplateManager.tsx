
import React, { useState, useMemo } from 'react';
import { Template, ReportType } from '../types';
import { ArrowLeft, Plus, Save, Trash2, FileText, AlertTriangle, CheckCircle, Briefcase, Edit3, Tag, Filter } from 'lucide-react';

interface TemplateManagerProps {
  templates: Template[];
  onSave: (templates: Template[]) => void;
  onBack: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ templates, onSave, onBack }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [form, setForm] = useState<Partial<Template>>({
    type: ReportType.INSPECTION,
    name: '',
    structure: '',
    description: '',
    category: ''
  });

  const categories = useMemo(() => {
    const cats = new Set<string>();
    templates.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return ['Alle', ...Array.from(cats)].sort();
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'Alle') return templates;
    return templates.filter(t => t.category === selectedCategory);
  }, [templates, selectedCategory]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach(t => {
      const cat = t.category || 'Keine Kategorie';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const handleEdit = (t: Template) => {
    setEditingId(t.id);
    setForm(t);
  };

  const handleAddNew = () => {
    setEditingId('new');
    setForm({
      type: ReportType.INSPECTION,
      name: '',
      structure: '',
      description: '',
      category: selectedCategory !== 'Alle' ? selectedCategory : ''
    });
  };

  const handleSave = () => {
    if (!form.name || !form.structure) {
      alert("Name und Struktur sind erforderlich.");
      return;
    }

    let updatedTemplates;
    if (editingId === 'new') {
      const newT: Template = {
        ...(form as Template),
        id: Date.now().toString()
      };
      updatedTemplates = [...templates, newT];
    } else {
      updatedTemplates = templates.map(t => t.id === editingId ? (form as Template) : t);
    }

    onSave(updatedTemplates);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Vorlage wirklich löschen?")) {
      onSave(templates.filter(t => t.id !== id));
    }
  };

  const getIcon = (type: ReportType) => {
    switch (type) {
      case ReportType.DAMAGE: return <AlertTriangle className="text-red-500" size={18} />;
      case ReportType.INSPECTION: return <CheckCircle className="text-blue-500" size={18} />;
      case ReportType.OFFER: return <Briefcase className="text-green-500" size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="border-b px-4 py-3 flex items-center justify-between bg-slate-50">
        <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-bold text-slate-800">Vorlagen-Manager</h2>
        <button 
          onClick={handleAddNew}
          className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-all active:scale-95 shadow-md"
        >
          <Plus size={20} />
        </button>
      </div>

      {!editingId && templates.length > 0 && (
        <div className="px-4 py-3 bg-white border-b overflow-x-auto flex gap-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {editingId ? (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 shadow-inner">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Edit3 size={18} /> {editingId === 'new' ? 'Neue Vorlage' : 'Vorlage bearbeiten'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Berichtstyp</label>
                <select 
                  className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value as ReportType})}
                >
                  <option value={ReportType.DAMAGE}>Schaden</option>
                  <option value={ReportType.INSPECTION}>Inspektion</option>
                  <option value={ReportType.OFFER}>Angebot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Vorlagen-Name</label>
                <input 
                  type="text"
                  className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="z.B. Standard Wartung"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Tag size={12} /> Kategorie
                </label>
                <input 
                  type="text"
                  className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  placeholder="z.B. Sanitär, Elektro..."
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.filter(c => c !== 'Alle').map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Kurzbeschreibung</label>
                <input 
                  type="text"
                  className="w-full border rounded-lg p-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  placeholder="Wofür wird diese Vorlage genutzt?"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Struktur / KI-Anweisung</label>
              <textarea 
                rows={8}
                className="w-full border rounded-lg p-3 bg-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={form.structure}
                onChange={(e) => setForm({...form, structure: e.target.value})}
                placeholder="Definiere die Struktur oder Standard-Abschnitte..."
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setEditingId(null)}
                className="flex-1 py-2 px-4 border border-slate-300 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
              >
                <Save size={18} /> Speichern
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.keys(groupedTemplates).length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <FileText className="mx-auto mb-4 opacity-10" size={64} />
                <p>Keine Vorlagen in dieser Kategorie gefunden.</p>
                <button onClick={handleAddNew} className="text-indigo-600 font-bold mt-2">Jetzt erste Vorlage erstellen</button>
              </div>
            ) : (
              Object.entries(groupedTemplates).map(([category, items]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">{category}</h3>
                    <div className="flex-1 h-px bg-slate-100"></div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map(t => (
                      <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between group hover:border-indigo-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="p-2 bg-slate-50 rounded-lg shrink-0">
                            {getIcon(t.type)}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-slate-800 truncate">{t.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{t.description || 'Keine Beschreibung'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(t)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit3 size={18} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateManager;
