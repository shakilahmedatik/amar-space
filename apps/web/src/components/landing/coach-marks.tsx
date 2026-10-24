"use client";

import { useLanguage } from "@omniheaven/ui";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "./toast-provider";

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  highlightPill: string;
}

const TARGET_STEP_IDS = ["cockpit", "cockpit", "features", "calculator"] as const;

interface CoachMarksProps {
  isActive: boolean;
  onClose: () => void;
}

export function CoachMarks({ isActive, onClose }: CoachMarksProps) {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const { showToast } = useToast();

  const tourSteps: TourStep[] = [
    {
      targetId: "cockpit",
      title: t("coach.step1Title", "Live Suite & Villa Matrix"),
      description: t(
        "coach.step1Desc",
        "This is your real-time front desk sandbox. Click any room row to toggle its live state between Occupied, Turnover, and Available.",
      ),
      highlightPill: t("coach.step1Pill", "Step 1 of 4 • Front Desk Cockpit"),
    },
    {
      targetId: "cockpit",
      title: t("coach.step2Title", "Direct RevPAR Telemetry"),
      description: t(
        "coach.step2Desc",
        "Track daily RevPAR metrics, direct booking percentages, and click 'Simulate Voucher Download' to generate a cryptographic guest voucher.",
      ),
      highlightPill: t("coach.step2Pill", "Step 2 of 4 • Revenue Telemetry"),
    },
    {
      targetId: "features",
      title: t("coach.step3Title", "Dual-Industry Architecture & Palette Engine"),
      description: t(
        "coach.step3Desc",
        "Switch between Hotel & Resort Edition and Residential Building Edition. Test the live theme palette engine by clicking Champagne, Emerald, or Obsidian.",
      ),
      highlightPill: t("coach.step3Pill", "Step 3 of 4 • Interactive Bento Grid"),
    },
    {
      targetId: "calculator",
      title: t("coach.step4Title", "Interactive OTA Commission Calculator"),
      description: t(
        "coach.step4Desc",
        "Drag the room count and ADR sliders to calculate exact cash retained by bypassing 20% foreign OTA middleman commissions.",
      ),
      highlightPill: t("coach.step4Pill", "Step 4 of 4 • ROI Engine"),
    },
  ];

  useEffect(() => {
    if (isActive) {
      const targetId = TARGET_STEP_IDS[currentStep];
      if (targetId) {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [isActive, currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      showToast({
        title: "Interactive Tour Completed",
        description: "Explore the live sandbox or claim your 180-day complimentary pass.",
        type: "gold",
      });
      onClose();
      setCurrentStep(0);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = tourSteps[currentStep];
  if (!isActive || !step) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Soft Dimmed Vignette Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/45 backdrop-blur-[2px] pointer-events-auto cursor-pointer"
          onClick={onClose}
        />

        {/* Floating Coach Mark Card (Fixed Bottom-Center with pointer) */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto z-10">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 rounded-3xl bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border-gold))] shadow-2xl space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 px-3 py-1 rounded-full border border-[hsl(var(--border-gold))]/40">
                {step.highlightPill}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="text-[hsl(var(--foreground-muted))] hover:text-[hsl(var(--foreground))] transition-colors p-1"
                aria-label="Exit interactive tour"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div>
              <h4 className="font-serif text-lg font-bold text-[hsl(var(--foreground))]">
                {step.title}
              </h4>
              <p className="text-xs text-[hsl(var(--foreground-muted))] leading-relaxed mt-1">
                {step.description}
              </p>
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-[hsl(var(--border))]">
              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {tourSteps.map((_, i) => (
                  <span
                    key={`dot-${i}`}
                    className={`size-2 rounded-full transition-all ${
                      i === currentStep ? "w-6 bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"
                    }`}
                  />
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[hsl(var(--foreground))] bg-[hsl(var(--surface))] hover:bg-[hsl(var(--surface-elevated))] border border-[hsl(var(--border))] transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="size-3.5" />
                    <span>{t("coach.prev", "Previous")}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#1F1714] bg-gradient-to-r from-[#C5A880] to-[#E5C378] hover:brightness-105 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>
                    {currentStep === tourSteps.length - 1
                      ? t("coach.finish", "Complete Tour")
                      : t("coach.next", "Next Step")}
                  </span>
                  {currentStep === tourSteps.length - 1 ? (
                    <Check className="size-3.5" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
