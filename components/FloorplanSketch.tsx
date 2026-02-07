import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Square, Circle, Minus, Type, Trash2, Undo, Download, Move, PenTool, Droplets, Flame, AlertTriangle, Check, RotateCcw, ZoomIn, ZoomOut, Grid3X3 } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DrawnElement {
  id: string;
  type: 'rect' | 'line' | 'circle' | 'freehand' | 'text' | 'measurement' | 'marker';
  points: Point[];
  color: string;
  text?: string;
  markerType?: 'damage' | 'water' | 'fire' | 'mold';
  width?: number;
  height?: number;
}

interface FloorplanSketchProps {
  onSave: (imageData: string) => void;
  onClose: () => void;
  existingSketch?: string;
}

const MARKER_ICONS: Record<string, { icon: typeof Droplets; label: string; color: string }> = {
  damage: { icon: AlertTriangle, label: 'Schaden', color: '#ef4444' },
  water: { icon: Droplets, label: 'Wasser', color: '#3b82f6' },
  fire: { icon: Flame, label: 'Brand', color: '#f97316' },
  mold: { icon: Circle, label: 'Schimmel', color: '#22c55e' },
};

const FloorplanSketch: React.FC<FloorplanSketchProps> = ({ onSave, onClose, existingSketch }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [tool, setTool] = useState<'select' | 'rect' | 'line' | 'freehand' | 'text' | 'measurement' | 'marker'>('rect');
  const [selectedMarker, setSelectedMarker] = useState<'damage' | 'water' | 'fire' | 'mold'>('damage');
  const [color, setColor] = useState('#1e40af');
  const [elements, setElements] = useState<DrawnElement[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(1);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [measurementInput, setMeasurementInput] = useState('');
  const [measurementPosition, setMeasurementPosition] = useState<{ start: Point; end: Point } | null>(null);

  // Colors for tools
  const colors = [
    { value: '#1e40af', label: 'Blau (Wände)' },
    { value: '#dc2626', label: 'Rot (Schaden)' },
    { value: '#16a34a', label: 'Grün (OK)' },
    { value: '#ca8a04', label: 'Gelb (Warnung)' },
    { value: '#6b7280', label: 'Grau (Möbel)' },
    { value: '#0891b2', label: 'Cyan (Wasser)' },
  ];

  const getCanvasCoords = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }, [scale]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!showGrid) return;
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    const gridSize = 20;
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [showGrid]);

  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawnElement) => {
    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (element.type) {
      case 'rect':
        if (element.points.length >= 2) {
          const [start, end] = element.points;
          ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
        }
        break;

      case 'line':
        if (element.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          ctx.lineTo(element.points[1].x, element.points[1].y);
          ctx.stroke();
        }
        break;

      case 'freehand':
        if (element.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'text':
        if (element.points.length > 0 && element.text) {
          ctx.font = 'bold 14px Inter, sans-serif';
          ctx.fillText(element.text, element.points[0].x, element.points[0].y);
        }
        break;

      case 'measurement':
        if (element.points.length >= 2 && element.text) {
          const [start, end] = element.points;
          
          // Draw measurement line with end markers
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // End markers
          const markerSize = 8;
          ctx.beginPath();
          ctx.moveTo(start.x, start.y - markerSize);
          ctx.lineTo(start.x, start.y + markerSize);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(end.x, end.y - markerSize);
          ctx.lineTo(end.x, end.y + markerSize);
          ctx.stroke();
          
          // Measurement text with background
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          ctx.font = 'bold 12px Inter, sans-serif';
          const textWidth = ctx.measureText(element.text).width;
          
          ctx.fillStyle = 'white';
          ctx.fillRect(midX - textWidth / 2 - 4, midY - 10, textWidth + 8, 20);
          ctx.strokeStyle = '#6366f1';
          ctx.strokeRect(midX - textWidth / 2 - 4, midY - 10, textWidth + 8, 20);
          
          ctx.fillStyle = '#6366f1';
          ctx.fillText(element.text, midX - textWidth / 2, midY + 4);
        }
        break;

      case 'marker':
        if (element.points.length > 0 && element.markerType) {
          const pos = element.points[0];
          const markerInfo = MARKER_ICONS[element.markerType];
          
          // Draw marker circle
          ctx.fillStyle = markerInfo.color;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw white icon placeholder
          ctx.fillStyle = 'white';
          ctx.font = 'bold 14px Inter, sans-serif';
          const symbol = element.markerType === 'damage' ? '!' : 
                        element.markerType === 'water' ? '~' :
                        element.markerType === 'fire' ? '🔥' : '●';
          ctx.fillText(symbol, pos.x - 5, pos.y + 5);
        }
        break;
    }
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid(ctx, canvas.width, canvas.height);
    
    // Draw all elements
    elements.forEach(element => drawElement(ctx, element));
    
    // Draw current element being drawn
    if (isDrawing && startPoint && currentPoints.length > 0) {
      const tempElement: DrawnElement = {
        id: 'temp',
        type: tool === 'select' ? 'rect' : tool as DrawnElement['type'],
        points: tool === 'freehand' ? currentPoints : [startPoint, currentPoints[currentPoints.length - 1]],
        color: color,
        markerType: tool === 'marker' ? selectedMarker : undefined,
      };
      drawElement(ctx, tempElement);
    }
  }, [elements, isDrawing, startPoint, currentPoints, tool, color, selectedMarker, drawGrid, drawElement]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const point = getCanvasCoords(e);
    
    if (tool === 'text') {
      setTextPosition(point);
      return;
    }
    
    if (tool === 'marker') {
      const newElement: DrawnElement = {
        id: Date.now().toString(),
        type: 'marker',
        points: [point],
        color: MARKER_ICONS[selectedMarker].color,
        markerType: selectedMarker,
      };
      setElements([...elements, newElement]);
      return;
    }
    
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoints([point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    
    const point = getCanvasCoords(e);
    
    if (tool === 'freehand') {
      setCurrentPoints([...currentPoints, point]);
    } else {
      setCurrentPoints([point]);
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint) return;
    e.preventDefault();
    
    const endPoint = currentPoints[currentPoints.length - 1] || startPoint;
    
    if (tool === 'measurement') {
      setMeasurementPosition({ start: startPoint, end: endPoint });
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoints([]);
      return;
    }
    
    const newElement: DrawnElement = {
      id: Date.now().toString(),
      type: tool === 'select' ? 'rect' : tool as DrawnElement['type'],
      points: tool === 'freehand' ? currentPoints : [startPoint, endPoint],
      color: color,
    };
    
    setElements([...elements, newElement]);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentPoints([]);
  };

  const handleTextSubmit = () => {
    if (textPosition && textInput.trim()) {
      const newElement: DrawnElement = {
        id: Date.now().toString(),
        type: 'text',
        points: [textPosition],
        color: color,
        text: textInput,
      };
      setElements([...elements, newElement]);
    }
    setTextPosition(null);
    setTextInput('');
  };

  const handleMeasurementSubmit = () => {
    if (measurementPosition && measurementInput.trim()) {
      const newElement: DrawnElement = {
        id: Date.now().toString(),
        type: 'measurement',
        points: [measurementPosition.start, measurementPosition.end],
        color: '#6366f1',
        text: measurementInput,
      };
      setElements([...elements, newElement]);
    }
    setMeasurementPosition(null);
    setMeasurementInput('');
  };

  const undo = () => {
    setElements(elements.slice(0, -1));
  };

  const clearAll = () => {
    if (confirm('Alle Zeichnungen löschen?')) {
      setElements([]);
    }
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a new canvas for export with professional styling
    const exportCanvas = document.createElement('canvas');
    const padding = 40;
    const headerHeight = 60;
    const footerHeight = 40;
    
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2 + headerHeight + footerHeight;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;
    
    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    
    // Header
    ctx.fillStyle = '#002D5B';
    ctx.fillRect(0, 0, exportCanvas.width, headerHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillText('GRUNDRISS-SKIZZE', padding, 38);
    
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = '#89D900';
    const date = new Date().toLocaleDateString('de-DE');
    ctx.fillText(`Erstellt: ${date}`, exportCanvas.width - padding - 120, 38);
    
    // Border around sketch
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding - 1, headerHeight + padding - 1, canvas.width + 2, canvas.height + 2);
    
    // Copy the actual sketch
    ctx.drawImage(canvas, padding, headerHeight + padding);
    
    // Footer
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, exportCanvas.height - footerHeight, exportCanvas.width, footerHeight);
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(0, exportCanvas.height - footerHeight);
    ctx.lineTo(exportCanvas.width, exportCanvas.height - footerHeight);
    ctx.stroke();
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText('SANEO SCHADENSERVICE GMBH • Technische Dokumentation', padding, exportCanvas.height - 15);
    
    // Legend
    const legendX = exportCanvas.width - padding - 200;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Inter, sans-serif';
    ctx.fillText('Legende:', legendX, exportCanvas.height - 25);
    
    let legendOffset = 0;
    Object.entries(MARKER_ICONS).forEach(([key, info]) => {
      ctx.fillStyle = info.color;
      ctx.beginPath();
      ctx.arc(legendX + 50 + legendOffset, exportCanvas.height - 22, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.fillText(info.label, legendX + 58 + legendOffset, exportCanvas.height - 18);
      legendOffset += 50;
    });
    
    const imageData = exportCanvas.toDataURL('image/png');
    onSave(imageData);
  };

  const tools = [
    { id: 'rect', icon: Square, label: 'Rechteck (Raum)' },
    { id: 'line', icon: Minus, label: 'Linie (Wand)' },
    { id: 'freehand', icon: PenTool, label: 'Freihand' },
    { id: 'measurement', icon: Move, label: 'Maßlinie' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'marker', icon: AlertTriangle, label: 'Marker' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-[200] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500">
            <X size={24} />
          </button>
          <div>
            <h2 className="font-black text-slate-900 uppercase tracking-tight">Grundriss-Skizze</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Zeichnen & Dokumentieren</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={elements.length === 0} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 disabled:opacity-30">
            <Undo size={20} />
          </button>
          <button onClick={clearAll} className="p-2 hover:bg-red-50 rounded-xl text-red-500">
            <Trash2 size={20} />
          </button>
          <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded-xl ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'text-slate-400 hover:bg-slate-100'}`}>
            <Grid3X3 size={20} />
          </button>
          <button onClick={exportCanvas} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">
            <Check size={18} /> Übernehmen
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Tool Sidebar */}
        <div className="w-20 bg-white border-r flex flex-col items-center py-4 gap-2 overflow-y-auto">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tools</p>
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id as typeof tool)}
              className={`w-14 h-14 flex flex-col items-center justify-center rounded-2xl transition-all ${
                tool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
              title={t.label}
            >
              <t.icon size={20} />
              <span className="text-[8px] font-bold mt-1 uppercase">{t.id.slice(0, 4)}</span>
            </button>
          ))}
          
          <div className="w-full h-px bg-slate-100 my-2" />
          
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Farbe</p>
          {colors.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-10 h-10 rounded-xl border-2 transition-all ${
                color === c.value ? 'border-slate-900 scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          
          {tool === 'marker' && (
            <>
              <div className="w-full h-px bg-slate-100 my-2" />
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Marker</p>
              {Object.entries(MARKER_ICONS).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setSelectedMarker(key as typeof selectedMarker)}
                  className={`w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all ${
                    selectedMarker === key ? 'ring-2 ring-offset-2 ring-current' : ''
                  }`}
                  style={{ 
                    backgroundColor: info.color + '20', 
                    color: info.color
                  }}
                  title={info.label}
                >
                  <info.icon size={18} />
                  <span className="text-[7px] font-bold mt-0.5">{info.label.slice(0, 5)}</span>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 bg-slate-100 p-4 overflow-auto flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="touch-none cursor-crosshair"
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
            />
          </div>
        </div>
      </div>

      {/* Text Input Modal */}
      {textPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80">
            <h3 className="font-bold text-slate-900 mb-4">Text hinzufügen</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="z.B. Küche, Bad, Flur..."
              className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 focus:border-indigo-600 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setTextPosition(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">
                Abbrechen
              </button>
              <button onClick={handleTextSubmit} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Measurement Input Modal */}
      {measurementPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[250]">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-80">
            <h3 className="font-bold text-slate-900 mb-4">Maß eingeben</h3>
            <input
              type="text"
              value={measurementInput}
              onChange={(e) => setMeasurementInput(e.target.value)}
              placeholder="z.B. 3,50 m"
              className="w-full border-2 border-slate-200 rounded-xl p-3 mb-4 focus:border-indigo-600 outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setMeasurementPosition(null)} className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold">
                Abbrechen
              </button>
              <button onClick={handleMeasurementSubmit} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold">
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Hint */}
      <div className="bg-slate-800 text-white px-4 py-2 text-center text-xs">
        <span className="text-slate-400">Tipp:</span> Rechteck für Räume • Linie für Wände • Maßlinie für Abmessungen • Marker für Schadenspunkte
      </div>
    </div>
  );
};

export default FloorplanSketch;
