"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowRight,
  AlertTriangle,
  XCircle,
  Shield,
  Ban,
  AlertCircle,
  PackageX,
} from "lucide-react";

const categories = [
  {
    icon: AlertTriangle,
    title: "Hazardous Materials",
    items: [
      "Explosives and fireworks",
      "Flammable liquids and gases",
      "Toxic or corrosive substances",
      "Radioactive materials",
      "Compressed gases",
      "Lithium batteries (unapproved)",
    ],
    color: "from-red-500 to-orange-500",
  },
  {
    icon: XCircle,
    title: "Weapons & Ammunition",
    items: [
      "Firearms and parts",
      "Ammunition and bullets",
      "Knives and bladed weapons",
      "Replica weapons",
      "Tasers and stun guns",
      "Pepper spray",
    ],
    color: "from-red-600 to-pink-500",
  },
  {
    icon: Ban,
    title: "Illegal Substances",
    items: [
      "Controlled drugs and narcotics",
      "Prescription medications (unapproved)",
      "Cannabis and related products",
      "Drug paraphernalia",
      "Counterfeit medications",
    ],
    color: "from-purple-600 to-red-500",
  },
  {
    icon: PackageX,
    title: "Perishable & Live Items",
    items: [
      "Fresh food and produce",
      "Frozen foods",
      "Live animals",
      "Plants and seeds (without permits)",
      "Biological samples",
      "Human remains or ashes (special handling required)",
    ],
    color: "from-yellow-600 to-orange-500",
  },
  {
    icon: Shield,
    title: "Precious Items & Currency",
    items: [
      "Cash and coins",
      "Precious metals (bars, bullion)",
      "Stolen or counterfeit goods",
      "Bank notes exceeding limits",
      "Traveler's checks (restricted)",
    ],
    color: "from-blue-600 to-purple-500",
  },
  {
    icon: AlertCircle,
    title: "Restricted Items",
    items: [
      "Pornographic materials",
      "Counterfeit goods",
      "Items violating copyright",
      "Cultural artifacts (without permits)",
      "Products from embargoed countries",
      "ITAR-controlled items",
    ],
    color: "from-orange-600 to-red-500",
  },
];

const generalProhibitions = [
  "Items that are illegal in origin or destination countries",
  "Items that violate international trade agreements",
  "Items that require special licenses or permits",
  "Items that pose security or safety risks",
  "Items that violate carrier policies",
];

const consequences = [
  {
    title: "Package Seizure",
    description:
      "Prohibited items will be seized by customs or authorities without refund.",
  },
  {
    title: "Legal Action",
    description:
      "Sending prohibited items may result in criminal charges or fines.",
  },
  {
    title: "Account Suspension",
    description:
      "Your account may be permanently suspended for violating our terms.",
  },
  {
    title: "No Refund",
    description:
      "Shipping fees and service charges are non-refundable for prohibited items.",
  },
];

export default function ProhibitedItemsPage() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 dark:from-gray-900 dark:via-orange-900 dark:to-gray-900 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-20" />
          <div
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-20"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute inset-0 pattern-grid opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Important Notice
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  Prohibited Items
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed max-w-3xl mx-auto">
                Before shipping, please review our list of prohibited and
                restricted items. Shipping prohibited items can result in
                package seizure, legal action, and account suspension.
              </p>
              <Link href="/contact">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transition-all mx-auto"
                >
                  Have Questions?
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Categories */}
        <section ref={ref} className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="bg-gradient-to-r from-red-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  What Cannot Be Shipped
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Comprehensive list of prohibited and restricted items by
                category
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {categories.map((category, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="card-modern p-6 md:p-8 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900"
                >
                  <div
                    className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${category.color} mb-6 shadow-md`}
                  >
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    {category.title}
                  </h3>
                  <ul className="space-y-2">
                    {category.items.map((item, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-2 text-gray-600 dark:text-gray-400"
                      >
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* General Prohibitions */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-red-100/50 via-orange-100/50 to-red-100/50 dark:from-red-900/30 dark:via-orange-900/30 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  General Prohibitions
                </span>
              </h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900"
            >
              <ul className="space-y-4">
                {generalProhibitions.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </section>

        {/* Consequences */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="text-gray-900 dark:text-white">
                  Consequences of
                </span>{" "}
                <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  Shipping Prohibited Items
                </span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {consequences.map((consequence, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="card-modern p-6 text-center bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900"
                >
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 mb-4">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {consequence.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {consequence.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-red-600 via-orange-500 to-red-500 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <AlertTriangle className="w-16 h-16 text-white mx-auto mb-6" />
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
                When in Doubt, Ask Us
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                If you're unsure whether an item is prohibited, please contact
                our support team before shipping. We're here to help ensure your
                packages comply with all regulations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white text-red-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
                  >
                    Contact Support
                  </motion.button>
                </Link>
                <Link href="/faq">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
                  >
                    View FAQ
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
