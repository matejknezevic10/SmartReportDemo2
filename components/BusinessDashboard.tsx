import React, { useState, useMemo } from 'react';
import { Report, User, UserRole } from '../types';
import { Users, FileText, Search, UserPlus, Mail, Shield, User as UserIcon, Calendar, ArrowRight, Trash2, Edit3, X, Check, Key, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { hashPassword, getPasswordStrength } from '../utils/security';

interface BusinessDashboardProps {
  reports: Report[];
  team: User[];
  onUpdateTeam: (team: User[]) => void;
  onOpenReport: (id: string) => void;
}

const BusinessDashboard: React.FC<BusinessDashboardProps> = ({ reports, team, onUpdateTeam, onOpenReport }) => {
  const [activeTab, setActiveTab] = useState<'team' | 'archive'>('team');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: UserRole.TECHNICIAN, password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filteredTeam = useMemo(() => 
    team.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())),
    [team, searchTerm]
  );

  const filteredArchive = useMemo(() => 
    reports.filter(r => r.customer.toLowerCase().includes(searchTerm.toLowerCase()) || r.createdByName.toLowerCase().includes(searchTerm.toLowerCase())),
    [reports, searchTerm]
  );

  const handleAddUser = () => {
    if (!newUser.name.trim()) {
      alert("Name ist erforderlich.");
      return;
    }
    if (!newUser.email.trim() || !newUser.email.includes('@')) {
      alert("Gültige E-Mail-Adresse erforderlich.");
      return;
    }
    if (!newUser.password || newUser.password.length < 4) {
      alert("Passwort muss mindestens 4 Zeichen haben.");
      return;
    }
    
    // Prüfen ob E-Mail schon existiert (außer beim Bearbeiten des eigenen Accounts)
    const emailExists = team.some(u => 
      u.email.toLowerCase() === newUser.email.toLowerCase() && 
      u.id !== editingUser?.id
    );
    if (emailExists) {
      alert("Diese E-Mail-Adresse wird bereits verwendet.");
      return;
    }
    
    if (editingUser) {
      // Bestehenden User aktualisieren
      onUpdateTeam(team.map(u => u.id === editingUser.id ? { 
        ...u, 
        name: newUser.name.trim(), 
        email: newUser.email.trim().toLowerCase(), 
        role: newUser.role, 
        passwordHash: hashPassword(newUser.password)
      } : u));
    } else {
      // Neuen User erstellen
      const user: User = {
        id: 'user-' + Date.now(),
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        role: newUser.role,
        passwordHash: hashPassword(newUser.password),
        createdAt: new Date().toISOString()
      };
      onUpdateTeam([...team, user]);
    }
    
    closeModal();
  };

  const closeModal = () => {
    setShowAddUserModal(false);
    setEditingUser(null);
    setNewUser({ name: '', email: '', role: UserRole.TECHNICIAN, password: '' });
    setShowPassword(false);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    // Passwort leer lassen - User muss neues setzen
    setNewUser({ name: user.name, email: user.email, role: user.role, password: '' });
    setShowAddUserModal(true);
  };

  const removeUser = (id: string) => {
    // Prüfen ob es der letzte Manager ist
    const managersCount = team.filter(u => u.role === UserRole.MANAGER).length;
    const userToDelete = team.find(u => u.id === id);
    
    if (userToDelete?.role === UserRole.MANAGER && managersCount <= 1) {
      alert("Der letzte Manager kann nicht gelöscht werden.");
      setConfirmDelete(null);
      return;
    }
    
    onUpdateTeam(team.filter(u => u.id !== id));
    setConfirmDelete(null);
  };

  const passwordStrength = getPasswordStrength(newUser.password);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sub-Navigation */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end md:items-center">
        <div className="flex gap-8 border-b-2 border-slate-100 w-full md:w-auto">
          <button 
            onClick={() => { setActiveTab('team'); setSearchTerm(''); }}
            className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'team' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Team-Verwaltung
            {activeTab === 'team' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => { setActiveTab('archive'); setSearchTerm(''); }}
            className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'archive' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Berichts-Archiv
            {activeTab === 'archive' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full"></div>}
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder={activeTab === 'team' ? "Mitarbeiter suchen..." : "Kunden/Archiv suchen..."}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {activeTab === 'team' ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{team.length} Teammitglieder aktiv</h3>
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <UserPlus size={14} /> Mitarbeiter einladen
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeam.map(user => (
              <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-indigo-600 flex items-center justify-center font-black text-lg border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 leading-tight">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {user.role === UserRole.MANAGER ? 'Büro / Manager' : 'Techniker / Außendienst'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Bearbeiten">
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => setConfirmDelete(user.id)} 
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Löschen"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 p-2.5 rounded-xl">
                      <Mail size={14} className="text-slate-400" /> {user.email}
                    </div>
                    {/* Kein Passwort mehr sichtbar! */}
                    <div className="flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50/50 p-2.5 rounded-xl border border-green-100/50">
                      <Shield size={14} className="text-green-500" /> Passwort geschützt
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktivität</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                    {reports.filter(r => r.createdById === user.id).length} Berichte
                  </span>
                </div>

                {/* Delete Confirmation */}
                {confirmDelete === user.id && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[2rem] flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <AlertTriangle className="text-red-500 mb-3" size={32} />
                    <p className="text-sm font-bold text-slate-900 text-center mb-1">Mitarbeiter löschen?</p>
                    <p className="text-xs text-slate-500 text-center mb-4">{user.name} wird unwiderruflich entfernt.</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setConfirmDelete(null)}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                      >
                        Abbrechen
                      </button>
                      <button 
                        onClick={() => removeUser(user.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all"
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Datum</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kunde / Projekt</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mitarbeiter</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredArchive.length > 0 ? (
                  filteredArchive.map(report => (
                    <tr key={report.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-slate-300" />
                          <span className="text-sm font-bold text-slate-600">{report.date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-900">{report.customer}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{report.title}</p>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black uppercase">
                            {report.createdByName.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-600">{report.createdByName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => onOpenReport(report.id)}
                          className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 ml-auto"
                        >
                          Details <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                      <p className="text-slate-400 font-bold">Keine Berichte im Archiv gefunden</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingUser ? 'Account bearbeiten' : 'Mitarbeiter einladen'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <X size={24}/>
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Vollständiger Name</label>
                  <input 
                    type="text" 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-indigo-600 outline-none font-bold"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    placeholder="Max Mustermann"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">E-Mail Adresse</label>
                  <input 
                    type="email" 
                    className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-indigo-600 outline-none font-bold"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="max@firma.de"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Rolle</label>
                    <select 
                      className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-indigo-600 outline-none font-bold appearance-none"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                    >
                      <option value={UserRole.TECHNICIAN}>Techniker</option>
                      <option value={UserRole.MANAGER}>Büro / Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">
                      {editingUser ? 'Neues Passwort' : 'Passwort / PIN'}
                    </label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        placeholder={editingUser ? 'Neues Passwort' : 'z.B. 1234'}
                        className="w-full border-2 border-slate-100 rounded-2xl p-4 bg-slate-50 focus:border-indigo-600 outline-none font-bold pr-12"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Password Strength Indicator */}
                    {newUser.password && (
                      <div className="mt-2 ml-2">
                        <div className="flex gap-1 mb-1">
                          {[1,2,3,4,5].map(i => (
                            <div 
                              key={i} 
                              className={`h-1 flex-1 rounded-full transition-all ${
                                i <= passwordStrength.score 
                                  ? passwordStrength.score <= 2 ? 'bg-red-400' 
                                    : passwordStrength.score <= 3 ? 'bg-yellow-400' 
                                    : 'bg-green-400'
                                  : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-[10px] font-bold ${
                          passwordStrength.score <= 2 ? 'text-red-500' 
                          : passwordStrength.score <= 3 ? 'text-yellow-600' 
                          : 'text-green-600'
                        }`}>
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t flex gap-4">
              <button 
                onClick={closeModal}
                className="flex-1 py-4 border-2 border-slate-200 text-slate-600 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-all"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleAddUser}
                className="flex-1 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <Check size={20} /> {editingUser ? 'Speichern' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDashboard;
