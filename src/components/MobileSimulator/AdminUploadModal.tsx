import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileCode, Video, FileText, Music, Sliders, 
  Image as ImageIcon, CheckCircle2, FileUp, Trash2, Sparkles, FolderArchive, ArrowUpRight
} from 'lucide-react';
import { VaultItem, ResourceCategory } from '../../types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';

interface AdminUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (newItem: Omit<VaultItem, 'id' | 'createdAt' | 'likesCount' | 'likedBy' | 'comments'>) => void;
}

export const AdminUploadModal: React.FC<AdminUploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ResourceCategory>('code');
  const [fileType, setFileType] = useState('ZIP Paquete');
  const [fileSize, setFileSize] = useState('0 MB');
  const [coverImage, setCoverImage] = useState<string>('');
  const [coverFileName, setCoverFileName] = useState<string>('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [version, setVersion] = useState('v1.0');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [autoDetectedInfo, setAutoDetectedInfo] = useState<string | null>(null);
  const { isDark } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Formateador de peso de archivo automático
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Reconocimiento inteligente de archivos y metadatos
  const processUploadedFile = (file: File) => {
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const formattedSize = formatBytes(file.size);

    setUploadedFileName(file.name);
    setFileSize(formattedSize);

    // Si el usuario no ha escrito un título o tiene el default, sugerimos el nombre del archivo limpio
    const cleanTitle = nameWithoutExt
      .replace(/[-_.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!title || title.trim() === '') {
      setTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Detección automática de categoría y tipo de archivo por extensión y MIME
    let detectedCat: ResourceCategory = 'code';
    let detectedType = `${ext.toUpperCase()} Archivo`;

    const videoExts = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v', 'ts', 'flv', 'wmv'];
    const codeExts = ['zip', 'rar', '7z', 'tar', 'gz', 'dart', 'js', 'ts', 'tsx', 'jsx', 'json', 'py', 'apk', 'aab', 'ipa', 'dmg', 'pkg', 'html', 'css', 'cpp', 'rs'];
    const docExts = ['pdf', 'doc', 'docx', 'epub', 'txt', 'csv', 'xlsx', 'xls', 'pptx', 'ppt', 'md'];
    const audioExts = ['mp3', 'flac', 'wav', 'aac', 'ogg', 'm4a', 'aiff', 'wma'];
    const presetExts = ['cube', 'xmp', 'lut', 'dng', 'look', 'preset', 'psd', 'ai', 'fig'];

    if (videoExts.includes(ext) || file.type.startsWith('video/')) {
      detectedCat = 'video';
      detectedType = ext === 'mp4' ? 'MP4 Video HD/4K' : `${ext.toUpperCase()} Video`;
    } else if (docExts.includes(ext) || file.type === 'application/pdf') {
      detectedCat = 'document';
      detectedType = ext === 'pdf' ? 'PDF Documento Encriptado' : `${ext.toUpperCase()} Documento`;
    } else if (audioExts.includes(ext) || file.type.startsWith('audio/')) {
      detectedCat = 'audio';
      detectedType = ext === 'flac' ? 'FLAC Audio 24-bit' : `${ext.toUpperCase()} Audio Master`;
    } else if (presetExts.includes(ext)) {
      detectedCat = 'preset';
      detectedType = ext === 'cube' ? 'CUBE 3D LUTs Pack' : `${ext.toUpperCase()} Preset Pack`;
    } else if (codeExts.includes(ext)) {
      detectedCat = 'code';
      detectedType = ext === 'zip' ? 'ZIP Archivo / Código' : `${ext.toUpperCase()} Código Fuente`;
    }

    setCategory(detectedCat);
    setFileType(detectedType);

    // Creamos URL de objeto para permitir descarga real inmediata
    const fileBlobUrl = URL.createObjectURL(file);
    setDownloadUrl(fileBlobUrl);

    setAutoDetectedInfo(
      `Reconocido: ${detectedType} (${formattedSize}) → Categoría "${detectedCat.toUpperCase()}" asignada.`
    );
  };

  // Manejo de subida de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Manejo de imagen de portada (sin URL manual, subida directa o drop)
  const processCoverImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }
    setCoverFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCoverImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCoverImage(file);
    }
  };

  const handleDropCover = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processCoverImage(file);
    }
  };

  // Submit y publicación en la bóveda
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    // Fallback de portada si no sube una
    const finalCover = coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    const finalDownloadUrl = downloadUrl || '#';

    onUpload({
      title,
      description,
      category,
      fileType,
      fileSize: fileSize || '12 MB',
      downloadUrl: finalDownloadUrl,
      coverImage: finalCover,
      version: version || 'v1.0',
      author: {
        name: 'Administrador',
        badge: 'ADMIN ROOT',
      },
    });

    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="admin-upload-modal-container"
        className={`w-full max-w-lg rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24] text-white'
            : 'bg-white border-[#CBD5E1] text-[#0F172A]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between transition-colors ${
            isDark ? 'border-[#1E1E24] bg-black/50' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0066FF] flex items-center justify-center text-white shadow-md shadow-[#0066FF]/30">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Publicar Material en Bóveda
                </h3>
                <VerifiedBadge className="w-3.5 h-3.5" />
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Exclusivo para Administrador • Subida directa de archivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark
                ? 'text-[#8E8E93] hover:text-white hover:bg-[#121216]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          
          {/* SECCIÓN 1: SUBIR EL ARCHIVO DESCARGABLE */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider flex items-center justify-between text-[#0066FF]">
              <span className="flex items-center gap-1.5">
                <FileUp className="w-4 h-4" />
                <span>1. Archivo Descargable (Recurso)</span>
              </span>
              <span className={`text-[10px] lowercase font-normal ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Arrastra o haz clic
              </span>
            </label>

            {/* Input nativo oculto para archivos */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploadedFileName ? (
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between transition-colors ${
                  isDark
                    ? 'bg-[#121216] border-[#0066FF]/40'
                    : 'bg-blue-50/60 border-[#0066FF]/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0066FF]/20 flex items-center justify-center text-[#0066FF] shrink-0">
                    <FolderArchive className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                      {uploadedFileName}
                    </div>
                    <div className="text-[11px] text-[#0066FF] font-medium flex items-center gap-2">
                      <span>{fileSize}</span>
                      <span>•</span>
                      <span>{fileType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      isDark
                        ? 'bg-[#121216] hover:bg-[#1E1E24] text-white border-[#1E1E24]'
                        : 'bg-white hover:bg-slate-100 text-[#0F172A] border-[#CBD5E1]'
                    }`}
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFileName('');
                      setFileSize('0 MB');
                      setAutoDetectedInfo(null);
                      setDownloadUrl('');
                    }}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'text-[#8E8E93] hover:text-red-400 hover:bg-[#121216]'
                        : 'text-[#64748B] hover:text-red-600 hover:bg-red-50'
                    }`}
                    title="Eliminar archivo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDropFile}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  isDraggingFile
                    ? 'border-[#0066FF] bg-[#0066FF]/10'
                    : isDark
                    ? 'border-[#1E1E24] hover:border-[#0066FF]/60 bg-[#0A0A0C] hover:bg-[#121216]'
                    : 'border-[#CBD5E1] hover:border-[#0066FF]/60 bg-slate-50 hover:bg-blue-50/40'
                }`}
              >
                <div
                  className={`w-11 h-11 mx-auto mb-2 rounded-xl border flex items-center justify-center shadow-md ${
                    isDark ? 'bg-black border-[#1E1E24]' : 'bg-white border-[#CBD5E1]'
                  }`}
                >
                  <FileUp className="w-5 h-5 text-[#0066FF]" />
                </div>
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Haz clic para subir o arrastra cualquier archivo
                </div>
                <div className={`text-[11px] mt-1 max-w-sm mx-auto ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Soporta .ZIP, .PDF, .MP4, .FLAC, .APK, .DMG, .DART, .CUBE, etc. Reconocimiento automático de tamaño y formato.
                </div>
              </div>
            )}

            {/* Aviso inteligente de auto-detección */}
            {autoDetectedInfo && (
              <div className="p-2.5 rounded-xl bg-[#0066FF]/10 border border-[#0066FF]/25 flex items-center gap-2 text-xs text-[#0066FF] animate-fadeIn">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{autoDetectedInfo}</span>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: SUBIR PORTADA DE LA PUBLICACIÓN */}
          <div className="space-y-2">
            <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              <ImageIcon className="w-4 h-4 text-[#0066FF]" />
              <span>Portada de la Publicación</span>
            </label>

            {/* Input nativo oculto para imágenes */}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />

            {coverImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#0066FF]/40 bg-black group">
                <img
                  src={coverImage}
                  alt="Portada seleccionada"
                  className="w-full h-36 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex items-end justify-between p-3">
                  <div className="text-xs font-semibold text-white drop-shadow truncate max-w-xs">
                    {coverFileName || 'Portada cargada'}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-black/80 hover:bg-black text-xs text-white border border-white/20 backdrop-blur-md transition-colors"
                    >
                      Cambiar Portada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCoverImage('');
                        setCoverFileName('');
                      }}
                      className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors"
                      title="Eliminar portada"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
                onDragLeave={() => setIsDraggingCover(false)}
                onDrop={handleDropCover}
                onClick={() => coverInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  isDraggingCover
                    ? 'border-[#0066FF] bg-[#0066FF]/10'
                    : isDark
                    ? 'border-[#1E1E24] hover:border-[#0066FF]/60 bg-[#0A0A0C] hover:bg-[#121216]'
                    : 'border-[#CBD5E1] hover:border-[#0066FF]/60 bg-slate-50 hover:bg-blue-50/40'
                }`}
              >
                <div
                  className={`w-9 h-9 mx-auto mb-1.5 rounded-xl border flex items-center justify-center ${
                    isDark ? 'bg-black border-[#1E1E24]' : 'bg-white border-[#CBD5E1]'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-[#0066FF]" />
                </div>
                <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Haz clic para subir la imagen de portada
                </div>
                <div className={`text-[10px] mt-0.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  PNG, JPG o WEBP (Recomendado 1200x675 px)
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: DETALLES EDITABLES / AUTOCOMPLETADOS */}
          <div className={`pt-2 border-t space-y-4 ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            {/* Título del Material */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Título de la Publicación
              </label>
              <input
                id="admin-upload-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Masterclass: Arquitectura de Bóvedas y Microservicios"
                className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] transition-colors border ${
                  isDark
                    ? 'bg-[#121216] border-[#1E1E24] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                }`}
              />
            </div>

            {/* Categoría Selector */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Categoría en la Bóveda
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'video', label: 'Video', icon: Video },
                  { id: 'code', label: 'Código', icon: FileCode },
                  { id: 'document', label: 'PDF', icon: FileText },
                  { id: 'audio', label: 'Audio', icon: Music },
                  { id: 'preset', label: 'Preset', icon: Sliders },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as ResourceCategory)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'bg-[#0066FF] border-[#0066FF] text-white shadow-md shadow-[#0066FF]/25'
                          : isDark
                          ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93] hover:text-white'
                          : 'bg-slate-50 border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Descripción y Notas Exclusivas
              </label>
              <textarea
                id="admin-upload-desc-input"
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla el contenido, notas de versión o instrucciones de uso..."
                className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] transition-colors resize-none border ${
                  isDark
                    ? 'bg-[#121216] border-[#1E1E24] text-white'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                }`}
              />
            </div>

            {/* Metadatos Reconocidos: Formato, Peso y Versión */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Formato
                </label>
                <input
                  type="text"
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  placeholder="ZIP / MP4"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0066FF] border ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Peso Reconocido
                </label>
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="45 MB"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0066FF] border ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Versión
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="v1.0"
                  className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0066FF] border ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className={`pt-3 border-t flex gap-3 ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                isDark
                  ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                  : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cancelar
            </button>
            <button
              id="admin-publish-resource-btn"
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0066FF]/30"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Publicar en la Bóveda</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
