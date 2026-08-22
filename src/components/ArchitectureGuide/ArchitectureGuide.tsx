import React from 'react';
import { 
  ShieldCheck, Database, Smartphone, 
  Terminal, Lock, CheckCircle2, Cpu 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ArchitectureGuide: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <div
      className={`h-full overflow-y-auto custom-scrollbar p-6 space-y-8 transition-colors duration-300 ${
        isDark ? 'text-white bg-[#060608]' : 'text-[#0F172A] bg-white'
      }`}
    >
      {/* Header */}
      <div className={`space-y-2 border-b pb-6 ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066FF]/15 border border-[#0066FF]/30 text-[10px] font-extrabold tracking-widest text-[#0066FF] uppercase">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Documentación de Arquitectura Senior</span>
        </div>
        <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
          Arquitectura Limpia & Servidor Privado en Flutter / Firebase
        </h1>
        <p className={`text-sm max-w-3xl leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
          Diseño integral para aplicaciones cerradas tipo bóveda donde el administrador es el único emisor de contenido y los miembros registrados acceden a descargas de alta fidelidad, debaten en foros privados y gestionan sus membresías.
        </p>
      </div>

      {/* Layer Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Layer 1: Presentation */}
        <div
          className={`p-5 rounded-2xl border space-y-3 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-slate-50 border-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0066FF]/15 flex items-center justify-center text-[#0066FF]">
              <Smartphone className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase font-mono ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Capa 1
            </span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Presentación & UI</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            Widgets declarativos, transiciones suaves (AnimatedSwitcher, ScaleTransition), diseño Deep Black (#000000) / Clean Light y acentos en Azul Vibrante (#0066FF).
          </p>
          <div className={`pt-2 border-t text-[11px] font-mono ${isDark ? 'border-[#1E1E24] text-[#5A5A62]' : 'border-[#E2E8F0] text-[#94A3B8]'}`}>
            • LoginScreen • VaultScreen • DetailScreen • MembershipScreen
          </div>
        </div>

        {/* Layer 2: State & Domain */}
        <div
          className={`p-5 rounded-2xl border space-y-3 shadow-lg shadow-[#0066FF]/10 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#0066FF]/40'
              : 'bg-blue-50/50 border-[#0066FF]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center text-white">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-[#0066FF] uppercase font-mono">Capa 2</span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Estado con Riverpod</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            <code className="text-[#0066FF]">AsyncNotifierProvider</code> para sesión de usuario y <code className="text-[#0066FF]">StreamProvider</code> para sincronización de recursos y comentarios reactivos en tiempo real.
          </p>
          <div className={`pt-2 border-t text-[11px] text-[#0066FF] font-mono ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            • AuthNotifier • VaultStreamProvider • SelectedCategoryProvider
          </div>
        </div>

        {/* Layer 3: Backend & Storage */}
        <div
          className={`p-5 rounded-2xl border space-y-3 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-slate-50 border-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-[#0066FF]/15 flex items-center justify-center text-[#0066FF]">
              <Database className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold uppercase font-mono ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Capa 3
            </span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>Firebase Backend</h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            Firebase Auth para la puerta de acceso obligatoria, Cloud Firestore para metadatos y subcolecciones de debate, y Firebase Storage con Dio para descargas locales.
          </p>
          <div className={`pt-2 border-t text-[11px] font-mono ${isDark ? 'border-[#1E1E24] text-[#5A5A62]' : 'border-[#E2E8F0] text-[#94A3B8]'}`}>
            • AuthRepository • VaultRepository • DownloadService (Dio)
          </div>
        </div>
      </div>

      {/* Security Architecture & Firestore Rules Breakdown */}
      <div
        className={`p-6 rounded-2xl border space-y-4 transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-slate-50 border-[#E2E8F0]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Lock className="w-5 h-5 text-[#0066FF]" />
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
            Estrategia de Seguridad: Firebase Firestore & Supabase RLS
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div
            className={`p-4 rounded-xl border space-y-2 transition-colors ${
              isDark
                ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-white border-[#E2E8F0] text-[#64748B] shadow-sm'
            }`}
          >
            <div className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              <CheckCircle2 className="w-4 h-4 text-[#0066FF]" />
              <span>Acceso Exclusivo de Administrador Único</span>
            </div>
            <p>
              Solo el correo verificado <code className="text-[#0066FF] font-bold">astroarg02@gmail.com</code> tiene permisos <code className={isDark ? 'text-white' : 'text-[#0F172A]'}>create</code>, <code className={isDark ? 'text-white' : 'text-[#0F172A]'}>update</code> y <code className={isDark ? 'text-white' : 'text-[#0F172A]'}>delete</code> tanto en Firestore (<code className="text-[#0066FF]">/vault_items</code>) como en Supabase PostgreSQL (<code className="text-[#0066FF]">public.vault_items</code>). Ningún otro correo puede recibir el rol de Admin.
            </p>
          </div>

          <div
            className={`p-4 rounded-xl border space-y-2 transition-colors ${
              isDark
                ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-white border-[#E2E8F0] text-[#64748B] shadow-sm'
            }`}
          >
            <div className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Políticas RLS en Supabase Storage & Tablas</span>
            </div>
            <p>
              El bucket privado <code className="text-[#0066FF]">vault_files</code> y la tabla <code className="text-[#0066FF]">public.vault_items</code> aplican la función <code className="text-emerald-400 font-mono">public.is_authorized_admin()</code> en tiempo de ejecución para rechazar cualquier intento de mutación no firmado por el Administrador Root.
            </p>
          </div>
        </div>

      </div>

      {/* Step by step Flutter Setup Checklist */}
      <div
        className={`p-6 rounded-2xl border space-y-4 transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-slate-50 border-[#E2E8F0]'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-[#0066FF]" />
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
            Guía de Implementación en tu Entorno Local
          </h3>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div
            className={`p-3 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#000000] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-[#0066FF]"># 1. Crear proyecto Flutter & añadir dependencias</span>
            <div className="text-white mt-1">
              flutter create --org com.vaultserver vault_private_server
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#000000] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-[#0066FF]"># 2. Configurar Firebase para Android e iOS</span>
            <div className="text-white mt-1">
              flutterfire configure --project=tu-firebase-project-id
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#000000] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-[#0066FF]"># 3. Compilar para Android (APK Universal)</span>
            <div className="text-white mt-1">
              flutter build apk --release --no-tree-shake-icons
            </div>
          </div>

          <div
            className={`p-3 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#000000] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <span className="text-emerald-400"># 4. Compilar para iPhone (iOS Release / Sideloading)</span>
            <div className="text-white mt-1">
              flutter build ios --release --no-codesign
            </div>
            <div className="text-xs text-slate-400 mt-1 font-sans">
              * Puedes abrir el proyecto en Xcode (<code className="text-blue-400 font-mono">open ios/Runner.xcworkspace</code>) para instalar directo en tu iPhone con tu Apple ID personal, o usar AltStore / Sideloadly con el paquete zip generado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
