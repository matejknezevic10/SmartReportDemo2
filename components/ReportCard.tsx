
import React from 'react';
import { Report, ReportType } from '../types';
import { FileText, AlertTriangle, CheckCircle, Briefcase, ImageIcon, CloudUpload } from 'lucide-react';

interface ReportCardProps {
  report: Report;
  onClick: (id: string) => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const getIcon = () => {
    switch (report.type) {
      case ReportType.DAMAGE: return <AlertTriangle className="text-red-500" />;
      case ReportType.INSPECTION: return <CheckCircle className="text-blue-500" />;
      case ReportType.OFFER: return <Briefcase className="text-green-500" />;
      default: return <FileText className="text-gray-500" />;
    }
  };

  const typeLabel = {
    [ReportType.DAMAGE]: 'Schaden',
    [ReportType.INSPECTION]: 'Inspektion',
    [ReportType.OFFER]: 'Angebot'
  };

  return (
    <div 
      onClick={() => onClick(report.id)}
      className={`bg-white p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4 shadow-sm hover:shadow-md ${report.isOfflineDraft ? 'border-orange-200 border-dashed bg-orange-50/20' : 'border-slate-200'}`}
    >
      <div className={`p-3 rounded-lg ${report.isOfflineDraft ? 'bg-orange-100' : 'bg-slate-50'}`}>
        {report.isOfflineDraft ? <CloudUpload className="text-orange-600" /> : getIcon()}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-slate-800 truncate flex items-center gap-2">
            {report.title || 'Ohne Titel'}
            {report.isOfflineDraft && (
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse shrink-0" title="Sync erforderlich"></span>
            )}
          </h3>
          <span className="text-xs text-slate-400 whitespace-nowrap">{report.date}</span>
        </div>
        <p className="text-sm text-slate-500 truncate">{report.customer}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            report.isOfflineDraft ? 'bg-orange-100 text-orange-600' :
            report.type === ReportType.DAMAGE ? 'bg-red-50 text-red-600' :
            report.type === ReportType.OFFER ? 'bg-green-50 text-green-600' :
            'bg-blue-50 text-blue-600'
          }`}>
            {report.isOfflineDraft ? 'Wartet auf Sync' : typeLabel[report.type]}
          </span>
          {report.images && report.images.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded uppercase">
              <ImageIcon size={10} /> {report.images.length} Foto{report.images.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCard;
