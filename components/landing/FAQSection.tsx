"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/motion";
import { LANDING_FAQS } from "@/lib/landing-faqs";

const faqs = LANDING_FAQS;

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

return (
    <section className="relative bg-bc-surface py-14 lg:py-20" aria-labelledby="faq-heading">
      <div className="section-container">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-9 lg:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-light border border-primary/10 mb-5">
            <span className="text-xs font-semibold text-primary">FAQ</span>
          </div>
          <h2 id="faq-heading" className="heading-lg text-bc-text mb-5">
            Pertanyaan yang{" "}
            <span className="text-bc-accent">Sering Diajukan</span>
          </h2>
          <p className="text-base lg:text-lg text-bc-text-2 leading-relaxed">
            Masih ragu? Temukan jawaban untuk pertanyaan yang paling sering ditanyakan.
          </p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto space-y-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            const panelId = `faq-panel-${i}`;
            const buttonId = `faq-button-${i}`;
            return (
              <motion.div
                key={i}
                variants={fadeInUp}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-bc-accent bg-bc-accent-soft shadow-bc-1"
                    : "border-bc-line bg-bc-surface-2 hover:border-bc-border"
                }`}
              >
                <h3>
                  <button
                    id={buttonId}
                    onClick={() => toggleFAQ(i)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="flex items-center justify-between w-full p-5 lg:p-6 text-left focus-ring rounded-2xl"
                  >
                    <span className="text-sm lg:text-base font-semibold text-bc-text pr-4">
                      {faq.q}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen ? "bg-bc-brand text-bc-on-brand rotate-45" : "bg-bc-surface text-bc-text-3"
                      }`}
                      aria-hidden="true"
                    >
                      <Plus size={16} />
                    </div>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className={isOpen ? "animate-fade-in" : ""}
                >
                  {isOpen && (
                    <div className="px-5 lg:px-6 pb-5 lg:pb-6">
                      <div className="w-8 h-0.5 bg-bc-accent rounded-full mb-4" />
                      <p className="text-sm text-bc-text-2 leading-relaxed">
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="text-center mt-10">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-sm font-semibold text-bc-accent-strong hover:text-bc-accent transition-colors focus-ring rounded"
          >
            Lihat semua pertanyaan
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
