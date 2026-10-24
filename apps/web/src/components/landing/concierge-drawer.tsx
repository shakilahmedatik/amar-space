"use client";

import { useLanguage } from "@omniheaven/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Globe,
  Headphones,
  Hotel,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./toast-provider";

interface ConciergeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const luxuryEase = [0.16, 1, 0.3, 1] as const;

export function ConciergeDrawer({ isOpen, onClose }: ConciergeDrawerProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast({
        title: "VIP Advisory Request Received",
        description: `Head Concierge will contact ${inquiryPhone || "you"} within 15 minutes.`,
        type: "gold",
      });
      setInquiryName("");
      setInquiryPhone("");
      onClose();
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Dimmed Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Off-Canvas Drawer (Slide from Right) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: luxuryEase }}
              className="w-screen max-w-md bg-[hsl(var(--surface-elevated))] border-l border-[hsl(var(--border-gold))]/50 shadow-2xl p-6 flex flex-col justify-between pointer-events-auto overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[hsl(var(--border))]">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-xl bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] flex items-center justify-center font-serif font-bold text-sm">
                      <Headphones className="size-4" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[hsl(var(--foreground))]">
                        {t("concierge.title", "Concierge Desk")}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                        {t("concierge.status", "Live • 24/7 Priority Support")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="size-8 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Direct Portal Switcher */}
                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[hsl(var(--foreground-muted))] block">
                    {t("concierge.jumpTitle", "Jump to Monorepo Portals")}
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <a
                      href="http://localhost:3000"
                      className="p-3 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] hover:border-[hsl(var(--border-gold))] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Hotel className="size-4 text-[hsl(var(--primary))]" />
                        <div>
                          <div className="text-xs font-bold text-[hsl(var(--foreground))]">
                            Property Manager Dashboard
                          </div>
                          <span className="text-[10px] text-[hsl(var(--foreground-muted))]">
                            app.omniheaven.com (:3000)
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    <a
                      href="http://localhost:3002"
                      className="p-3 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] hover:border-[hsl(var(--border-gold))] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="size-4 text-[hsl(var(--primary))]" />
                        <div>
                          <div className="text-xs font-bold text-[hsl(var(--foreground))]">
                            Resident &amp; Tenant Folio
                          </div>
                          <span className="text-[10px] text-[hsl(var(--foreground-muted))]">
                            renter.omniheaven.com (:3002)
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    <a
                      href="http://localhost:3003"
                      className="p-3 rounded-xl bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] hover:border-[hsl(var(--border-gold))] transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Globe className="size-4 text-[hsl(var(--primary))]" />
                        <div>
                          <div className="text-xs font-bold text-[hsl(var(--foreground))]">
                            Dynamic Guest Engine Demo
                          </div>
                          <span className="text-[10px] text-[hsl(var(--foreground-muted))]">
                            [slug].omniheaven.com (:3003)
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 text-[hsl(var(--primary))] group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  </div>
                </div>

                {/* VIP Advisory Quick Request */}
                <div className="p-4 rounded-2xl bg-[hsl(var(--surface))] border border-[hsl(var(--border))] space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-[hsl(var(--primary))]" />
                    <h4 className="font-serif font-bold text-xs text-[hsl(var(--foreground))]">
                      {t("concierge.inquiryTitle", "Priority Executive Advisory")}
                    </h4>
                  </div>
                  <p className="text-[11px] text-[hsl(var(--foreground-muted))] leading-relaxed">
                    {t(
                      "concierge.inquiryDesc",
                      "Request an architect walkthrough or bespoke enterprise SLA migration.",
                    )}
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <input
                      type="text"
                      required
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                      placeholder={t("concierge.namePlaceholder", "Your Name / Title")}
                      className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--border-gold))]"
                    />
                    <input
                      type="tel"
                      required
                      value={inquiryPhone}
                      onChange={(e) => setInquiryPhone(e.target.value)}
                      placeholder={t("concierge.phonePlaceholder", "Direct Mobile / WhatsApp")}
                      className="w-full px-3 py-2 rounded-xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--border-gold))]"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#C5A880] to-[#E5C378] text-[#1F1714] font-bold text-xs shadow-sm hover:brightness-105 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="size-3.5" />
                      <span>
                        {isSubmitting
                          ? t("concierge.sending", "Transmitting to Concierge...")
                          : t("concierge.sendInquiry", "Send Priority Request")}
                      </span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-6 border-t border-[hsl(var(--border))] text-[11px] text-[hsl(var(--foreground-muted))] space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 className="size-3.5" />
                  <span>180-Day Complimentary Pass Applies Automatically</span>
                </div>
                <p>© {new Date().getFullYear()} omniHeaven Concierge Operations.</p>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
