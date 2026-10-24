"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, Sparkles, X } from "lucide-react";
import type React from "react";
import { createContext, useContext, useState } from "react";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "info" | "gold";
}

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (toast: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { ...toast, id };
    setToasts((prev) => [...prev.slice(-3), newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto p-4 rounded-2xl bg-[hsl(var(--surface-elevated))]/95 backdrop-blur-xl border border-[hsl(var(--border-gold))]/60 shadow-luxury-lg flex items-start gap-3 select-none"
            >
              <div className="size-8 rounded-xl bg-[hsl(var(--primary))]/15 flex items-center justify-center shrink-0 text-[hsl(var(--primary))] border border-[hsl(var(--border-gold))]/40">
                {toast.type === "gold" ? (
                  <Sparkles className="size-4 text-[#D8C29D]" />
                ) : toast.type === "info" ? (
                  <Info className="size-4 text-blue-500" />
                ) : (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                )}
              </div>

              <div className="flex-1 pr-1">
                <h5 className="font-serif font-bold text-xs text-[hsl(var(--foreground))]">
                  {toast.title}
                </h5>
                {toast.description && (
                  <p className="text-[11px] text-[hsl(var(--foreground-muted))] mt-0.5 leading-snug">
                    {toast.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] p-1 rounded-lg transition-colors cursor-pointer"
                aria-label="Dismiss toast notification"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
