
import React, { useState, useRef, useEffect } from 'react';
import { X, RotateCw, FlipHorizontal, Square, Check, Crop } from 'lucide-react';
import { ReportImage } from '../types';

interface ImageEditorProps {
  image: ReportImage;
  onSave: (updatedImage: ReportImage) => void;
  onClose: () => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ image, onSave, onClose }) => {
  const [rotation, setRotation] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSquareCrop, setIsSquareCrop] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgElement, setImgElement] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = `data:${image.mimeType};base64,${image.data}`;
    img.onload = () => setImgElement(img);
  }, [image]);

  const applyChanges = () => {
    if (!canvasRef.current || !imgElement) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions based on rotation
    const isVertical = rotation % 180 !== 0;
    const sourceWidth = imgElement.width;
    const sourceHeight = imgElement.height;
    
    let targetWidth = isVertical ? sourceHeight : sourceWidth;
    let targetHeight = isVertical ? sourceWidth : sourceHeight;

    // Handle Square Crop
    let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    if (isSquareCrop) {
      const min = Math.min(sourceWidth, sourceHeight);
      sx = (sourceWidth - min) / 2;
      sy = (sourceHeight - min) / 2;
      sw = min;
      sh = min;
      targetWidth = min;
      targetHeight = min;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (isFlipped) ctx.scale(-1, 1);
    
    ctx.drawImage(
      imgElement, 
      sx, sy, sw, sh, 
      -sw / 2, -sh / 2, sw, sh
    );
    ctx.restore();

    const base64Data = canvas.toDataURL(image.mimeType).split(',')[1];
    onSave({ ...image, data: base64Data });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 w-full max-w-2xl flex items-center justify-center overflow-hidden">
        {imgElement ? (
          <div className="relative group transition-transform duration-500" style={{ transform: `rotate(${rotation}deg) scaleX(${isFlipped ? -1 : 1})` }}>
            <img 
              src={imgElement.src} 
              className={`max-w-full max-h-[60vh] rounded-lg shadow-2xl transition-all ${isSquareCrop ? 'aspect-square object-cover' : ''}`}
              alt="Editor Preview"
            />
            {isSquareCrop && (
              <div className="absolute inset-0 border-4 border-dashed border-white/50 pointer-events-none"></div>
            )}
          </div>
        ) : (
          <div className="text-white/20 animate-pulse font-black text-2xl uppercase tracking-widest">Wird geladen...</div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl flex flex-col gap-6 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-around items-center">
          <button 
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className="p-4 bg-slate-100 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <RotateCw size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Drehen</span>
          </button>

          <button 
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`p-4 rounded-2xl transition-all ${isFlipped ? 'bg-indigo-600 text-white' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
              <FlipHorizontal size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Spiegeln</span>
          </button>

          <button 
            onClick={() => setIsSquareCrop(!isSquareCrop)}
            className="flex flex-col items-center gap-2 group"
          >
            <div className={`p-4 rounded-2xl transition-all ${isSquareCrop ? 'bg-indigo-600 text-white' : 'bg-slate-100 group-hover:bg-slate-200'}`}>
              <Square size={24} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Zuschneiden</span>
          </button>
        </div>

        <button 
          onClick={applyChanges}
          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95"
        >
          <Check size={20} /> Änderungen übernehmen
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
