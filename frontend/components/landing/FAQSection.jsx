"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does international shipping work?",
    answer:
      "Simply ship your packages to our warehouse using your unique warehouse ID. We'll receive, inspect, and prepare your items for international shipping. Choose your preferred transport mode and we'll handle the rest.",
  },
  {
    question: "What shipping options are available?",
    answer:
      "We offer Air Freight (1-8 days), Sea Freight (15-45 days), Rail Freight (10-20 days), and Truck/Road (2-10 days). The available options depend on your origin and destination countries.",
  },
  {
    question: "How much does shipping cost?",
    answer:
      "Shipping costs vary based on weight, dimensions, origin, destination, and transport mode. Use our instant quote calculator to get real-time rates from multiple carriers.",
  },
  {
    question: "Do you offer buying services?",
    answer:
      "Absolutely! Share a product URL or description, and our buying agents will purchase the item, ship it to our warehouse, then forward it to you internationally with a complete quote breakdown.",
  },
  {
    question: "How do I track my shipment?",
    answer:
      "Once your shipment is dispatched, you'll receive a tracking number. Track your package in real-time through your dashboard with live updates and notifications.",
  },
  {
    question: "What countries do you ship to?",
    answer:
      "We ship to 200+ countries worldwide. Use our quote calculator to check if we serve your destination country.",
  },
  {
    question: "Are my packages insured?",
    answer:
      "Yes, all shipments are fully insured. You can also purchase additional insurance coverage based on your package's declared value.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 pattern-grid opacity-10" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6"
          >
            <HelpCircle className="w-5 h-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              Frequently Asked Questions
            </span>
          </motion.div>

          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            <span className="gradient-text">Got Questions?</span>
            <br />
            <span className="text-gray-900 dark:text-white">
              We've Got Answers
            </span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
            Everything you need to know about our shipping services
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="glass-card rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
              >
                <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-white pr-4">
                  {faq.question}
                </span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown className="w-6 h-6 text-orange-500" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 py-4 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
