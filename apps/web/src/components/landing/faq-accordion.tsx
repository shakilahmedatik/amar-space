"use client";

import { useLanguage } from "@omniheaven/ui";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

const luxuryEase = [0.16, 1, 0.3, 1] as const;

export function FaqAccordion() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: t("faq.q1", "How does the 0% commission direct booking engine work?"),
      answer: t(
        "faq.a1",
        "omniHeaven equips your hotel or resort with a bespoke booking engine hosted on your own subdomain or domain. When guests reserve suites directly, payments flow through your merchant account (bKash, Paystation, Stripe). omniHeaven takes zero percentage markup or commission, allowing you to retain 100% of guest revenue.",
      ),
    },
    {
      question: t(
        "faq.q2",
        "Can we continue using Booking.com, Agoda, and Airbnb alongside omniHeaven?",
      ),
      answer: t(
        "faq.a2",
        "Yes. omniHeaven operates harmoniously alongside existing OTA channels. You can use omniHeaven as your central property management system (PMS) while channeling high-yield repeat guests and direct traffic to your 0% commission engine to gradually eliminate OTA dependency.",
      ),
    },
    {
      question: t(
        "faq.q3",
        "How does automated bKash reconciliation work for residential buildings?",
      ),
      answer: t(
        "faq.a3",
        "When utility bills and rent statements are auto-generated on the 1st of the month, tenants receive an SMS/email with a direct tokenized bKash payment link. Once cleared, our webhook automatically updates the tenant's ledger in real time, marks the month as paid, and issues an official tax invoice without any manual TrxID verification.",
      ),
    },
    {
      question: t("faq.q4", "Is our data hosted locally with sovereign privacy?"),
      answer: t(
        "faq.a4",
        "Yes. omniHeaven utilizes self-hosted PostgreSQL with organization-level tenant schema isolation and SeaweedFS distributed storage. Your financial folios, guest passports, and contracts remain under your direct sovereign control, backed up with daily automated point-in-time recovery snapshots.",
      ),
    },
    {
      question: t("faq.q5", "What happens after our 180-day complimentary period ends?"),
      answer: t(
        "faq.a5",
        "You will receive an advisory notification on day 150. You can choose to continue seamlessly on our transparent monthly subscription (starting from ৳2,500/month flat), or export your complete forensic database and guest lists with one click. There are zero penalties, zero setup fees, and zero lock-ins.",
      ),
    },
    {
      question: t(
        "faq.q6",
        "Can non-technical front-desk staff and building caretakers learn it easily?",
      ),
      answer: t(
        "faq.a6",
        "omniHeaven was designed with Swiss hospitality ergonomic principles: clean room cards, high contrast, large touch targets (minimum 48px), and full support for English and Bengali. Most estate managers master the front-desk matrix in under 15 minutes.",
      ),
    },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
      <div className="text-center space-y-3 mb-14">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[hsl(var(--primary))] flex items-center justify-center gap-1.5">
          <HelpCircle className="size-3.5 text-[hsl(var(--primary))]" />
          <span>{t("faq.tag", "Executive Advisory & Clarifications")}</span>
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-[hsl(var(--foreground))] font-bold tracking-tight">
          {t("faq.title", "Frequently Asked Questions")}
        </h2>
        <p className="text-sm sm:text-base text-[hsl(var(--foreground-muted))]">
          {t(
            "faq.subtitle",
            "Everything hoteliers, developers, and residential estate owners need to know.",
          )}
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={faq.question}
              className="bg-[hsl(var(--surface-elevated))] rounded-2xl border border-[hsl(var(--border))] overflow-hidden transition-all duration-200"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-[hsl(var(--surface))]/40 transition-colors"
              >
                <span className="font-serif text-base sm:text-lg font-bold text-[hsl(var(--foreground))]">
                  {faq.question}
                </span>
                <span
                  className={`size-8 rounded-full bg-[hsl(var(--surface))] flex items-center justify-center text-[hsl(var(--primary))] transition-transform duration-300 shrink-0 ${
                    isOpen ? "rotate-180 bg-[hsl(var(--primary))]/10" : ""
                  }`}
                >
                  <ChevronDown className="size-4" />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: luxuryEase }}
                  >
                    <div className="px-5 sm:px-6 pb-6 text-xs sm:text-sm text-[hsl(var(--foreground-muted))] leading-relaxed border-t border-[hsl(var(--border))]/60 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
