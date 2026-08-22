import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  Terminal, 
  Copy, 
  Check, 
  Download, 
  Smartphone, 
  ExternalLink, 
  Play, 
  FileCode, 
  Layers, 
  Zap,
  CheckCircle2,
  X,
  HelpCircle,
  QrCode
} from 'lucide-react';
import { exportProjectZip } from '../../services/zipExporter';

interface AndroidBuildGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidBuildGuideModal: React.FC<AndroidBuildGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'colab' | 'termux' | 'flutlab' | 'local'>('colab');
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await exportProjectZip();
    } catch (err) {
      console.error('Error al generar ZIP:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const colabScript = `# ==========================================================
# SCRIPT DE COMPILACIÓN AUTOMÁTICA APK ANDROID (Google Colab)
# ==========================================================
# 1. Instalar dependencias del sistema y Flutter SDK
!apt-get update -qq > /dev/null
!apt-get install -y default-jdk unzip curl -qq > /dev/null
!git clone https://github.com/flutter/flutter.git -b stable --depth 1 /content/flutter > /dev/null
import os
os.environ['PATH'] += ":/content/flutter/bin"

# 2. Descomprimir el código de App 66
!unzip -o *.zip -d app_android > /dev/null
%cd app_android

# 3. Regenerar estructura Android y dependencias
!mkdir -p assets/images && touch assets/images/.gitkeep
!flutter create . --platforms=android --org=com.vault.privateserver --project-name=vault_private_server
!flutter pub get

# 4. Compilar APK Universal para teléfonos Android
!flutter build apk --release --no-tree-shake-icons

# 5. Descarga directa automática a tu teléfono o PC
from google.colab import files
files.download('build/app/outputs/flutter-apk/app-release.apk')`;

  const termuxScript = `# 1. En Termux Android (ejecutar con proot ubuntu):
pkg update && pkg install proot-distro -y
proot-distro install ubuntu
proot-distro login ubuntu

# 2. Dentro de Ubuntu en tu móvil:
apt update && apt install -y git openjdk-17-jdk unzip curl wget
git clone https://github.com/flutter/flutter.git -b stable /opt/flutter
export PATH="$PATH:/opt/flutter/bin"

# 3. Entrar a tu carpeta y compilar:
cd app_android
flutter create . --platforms=android
flutter build apk --release`;

  const localScript = `# En la terminal de tu PC (Windows PowerShell, macOS o Linux):
# 1. Regenerar módulo nativo Android
flutter create . --platforms=android --org=com.vault.privateserver

# 2. Obtener dependencias
flutter pub get

# 3. Compilar APK Release instalable
flutter build apk --release --no-tree-shake-icons

# El archivo final queda en:
# build/app/outputs/flutter-apk/app-release.apk`;

  return (
    <div 
      id="android-build-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
    >
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24] text-white shadow-black/90'
            : 'bg-white border-[#E2E8F0] text-[#0F172A] shadow-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-[#1E1E24] bg-black/60' : 'border-[#E2E8F0] bg-[#F8FAFC]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Compilar APK para Android (Sin GitHub)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% GRATIS
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Métodos probados para generar el instalador <code className="text-emerald-400 font-mono">.apk</code> listo para tu celular.
              </p>
            </div>
          </div>

          <button
            id="close-android-guide-modal"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-[#1E1E24] hover:bg-[#1A1A22] text-[#8E8E93] hover:text-white'
                : 'border-[#E2E8F0] hover:bg-slate-100 text-[#64748B] hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div className={`flex items-center gap-2 px-6 pt-4 border-b overflow-x-auto ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
          <button
            id="tab-method-colab"
            onClick={() => setSelectedMethod('colab')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              selectedMethod === 'colab'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : isDark
                ? 'border-transparent text-[#8E8E93] hover:text-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>1. Google Colab (Recomendado)</span>
          </button>

          <button
            id="tab-method-flutlab"
            onClick={() => setSelectedMethod('flutlab')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              selectedMethod === 'flutlab'
                ? 'border-[#0066FF] text-[#0066FF] bg-[#0066FF]/10'
                : isDark
                ? 'border-transparent text-[#8E8E93] hover:text-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>2. FlutLab Web (Con QR)</span>
          </button>

          <button
            id="tab-method-local"
            onClick={() => setSelectedMethod('local')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              selectedMethod === 'local'
                ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                : isDark
                ? 'border-transparent text-[#8E8E93] hover:text-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>3. En tu Computadora</span>
          </button>

          <button
            id="tab-method-termux"
            onClick={() => setSelectedMethod('termux')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              selectedMethod === 'termux'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : isDark
                ? 'border-transparent text-[#8E8E93] hover:text-white'
                : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>4. Directo en Android (Termux)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-xs">
          {/* METHOD 1: GOOGLE COLAB */}
          {selectedMethod === 'colab' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-slate-50 border-[#E2E8F0]'}`}>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Paso a Paso con Google Colab (3 Minutos)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>
                    <strong className="text-white">Descarga el código:</strong> Haz clic en el botón inferior <span className="text-[#0066FF] font-semibold">"Descargar ZIP del Proyecto"</span>.
                  </li>
                  <li>
                    <strong className="text-white">Abre Google Colab:</strong> Entra a{' '}
                    <a 
                      href="https://colab.research.google.com/" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-emerald-400 underline font-semibold inline-flex items-center gap-1"
                    >
                      colab.research.google.com <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    y selecciona <strong>"Nuevo Cuaderno"</strong>.
                  </li>
                  <li>
                    <strong className="text-white">Sube el ZIP:</strong> En la barra lateral izquierda de Colab, toca el icono de carpeta 📁 y arrastra el archivo ZIP descargado.
                  </li>
                  <li>
                    <strong className="text-white">Copia y Ejecuta el Script:</strong> Pega el código de abajo en la celda y dale al botón <Play className="w-3 h-3 inline text-emerald-400" /> <strong>Play</strong>.
                  </li>
                  <li>
                    <strong className="text-white">Listo:</strong> El APK se compilará en los servidores de Google y tu navegador descargará <code className="text-emerald-400 bg-black/40 px-1.5 py-0.5 rounded font-mono">app-release.apk</code> automáticamente.
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloadingZip}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingZip ? 'Generando ZIP...' : '1. Descargar ZIP del Proyecto'}</span>
                </button>

                <a
                  href="https://colab.research.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>2. Abrir Google Colab</span>
                </a>
              </div>

              {/* Code Snippet */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8E8E93]">
                  <span>Script para pegar en la celda de Google Colab:</span>
                  <button
                    onClick={() => copyToClipboard(colabScript, 'colab')}
                    className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    {copiedId === 'colab' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'colab' ? '¡Copiado!' : 'Copiar Script'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-[#1E1E24] text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-56">
                  {colabScript}
                </pre>
              </div>
            </div>
          )}

          {/* METHOD 2: FLUTLAB */}
          {selectedMethod === 'flutlab' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-slate-50 border-[#E2E8F0]'}`}>
                <div className="flex items-center gap-2 text-[#0066FF] font-bold text-sm mb-2">
                  <QrCode className="w-4 h-4" />
                  <span>FlutLab.io (Compilación en la Nube con Código QR)</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>
                    Descarga el proyecto con el botón <strong>"Descargar ZIP"</strong>.
                  </li>
                  <li>
                    Entra a{' '}
                    <a 
                      href="https://flutlab.io/" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[#0066FF] underline font-semibold inline-flex items-center gap-1"
                    >
                      FlutLab.io <ExternalLink className="w-3 h-3" />
                    </a>{' '}
                    e inicia sesión gratis.
                  </li>
                  <li>
                    Haz clic en <strong>"Upload ZIP"</strong> y selecciona el archivo que descargaste.
                  </li>
                  <li>
                    En la barra superior, presiona el botón <strong>"Build" $\rightarrow$ "Build Android APK"</strong>.
                  </li>
                  <li>
                    Al finalizar, verás un <strong>Código QR</strong> en pantalla: escanéalo con tu móvil Android para instalar la app directamente sin cables.
                  </li>
                </ol>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloadingZip}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar ZIP del Proyecto</span>
                </button>

                <a
                  href="https://flutlab.io/"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black border border-white/20 hover:bg-[#141418] text-white font-bold transition-all shadow-md active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ir a FlutLab.io</span>
                </a>
              </div>
            </div>
          )}

          {/* METHOD 3: LOCAL PC */}
          {selectedMethod === 'local' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-slate-50 border-[#E2E8F0]'}`}>
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm mb-2">
                  <Terminal className="w-4 h-4" />
                  <span>Compilar en tu PC (Windows, Mac o Linux)</span>
                </div>
                <p className="text-slate-300 mb-3">
                  Si tienes instalado el <strong>Flutter SDK</strong> y <strong>Android Studio</strong> en tu computadora:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>Descarga y descomprime el ZIP en una carpeta de tu PC.</li>
                  <li>Abre la terminal o PowerShell en esa carpeta.</li>
                  <li>Ejecuta los siguientes comandos:</li>
                </ol>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8E8E93]">
                  <span>Comandos para la consola de tu PC:</span>
                  <button
                    onClick={() => copyToClipboard(localScript, 'local')}
                    className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-bold"
                  >
                    {copiedId === 'local' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'local' ? '¡Copiado!' : 'Copiar Comandos'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-[#1E1E24] text-purple-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {localScript}
                </pre>
              </div>
            </div>
          )}

          {/* METHOD 4: TERMUX */}
          {selectedMethod === 'termux' && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-slate-50 border-[#E2E8F0]'}`}>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                  <Smartphone className="w-4 h-4" />
                  <span>Compilar directamente dentro de tu móvil Android con Termux</span>
                </div>
                <p className="text-slate-300 mb-3">
                  Puedes compilar el APK usando una distribución ligera de Ubuntu dentro de la app <strong>Termux</strong> en tu propio celular Android:
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#8E8E93]">
                  <span>Comandos para Termux (Android):</span>
                  <button
                    onClick={() => copyToClipboard(termuxScript, 'termux')}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold"
                  >
                    {copiedId === 'termux' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === 'termux' ? '¡Copiado!' : 'Copiar Comandos'}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black border border-[#1E1E24] text-amber-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {termuxScript}
                </pre>
              </div>
            </div>
          )}

          {/* Installation note */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-300">¿Cómo instalar el APK en tu Android?</span>
              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                Una vez descargado el archivo <code className="font-mono font-bold">app-release.apk</code>, ábrelo en tu teléfono. Si Android te avisa sobre instalación de fuentes externas, toca en <strong>"Configuración $\rightarrow$ Permitir desde esta fuente"</strong> y pulsa <strong>Instalar</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-6 py-3.5 border-t ${
            isDark ? 'border-[#1E1E24] bg-black/40' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] text-[#8E8E93]">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>El método de <strong>Google Colab</strong> no consume espacio ni batería de tu dispositivo.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1E1E24] hover:bg-[#2A2A32] text-white text-xs font-bold transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
