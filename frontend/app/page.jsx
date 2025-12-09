"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { TrackingSection } from "@/components/landing/TrackingSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CTASection } from "@/components/landing/CTASection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ReviewsSection } from "@/components/landing/ReviewsSection";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calculator, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16 md:pt-20">
        <HeroSection />
        <TrackingSection />
        {/* Quote Calculator CTA Section */}
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="card-modern p-8 md:p-12 bg-gradient-to-br from-orange-500 to-red-500 border-2 border-orange-400 dark:border-orange-600 text-center"
            >
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-white/20 backdrop-blur-md mb-6">
                  <Calculator className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Get Your Shipping Quote
                </h2>
                <p className="text-lg md:text-xl text-orange-50 mb-8 max-w-2xl">
                  Calculate shipping costs instantly and find the best rates for
                  your shipment
                </p>
                <Link href="/quote">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    Calculate Shipping Cost
                    <ArrowRight className="w-5 h-5" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
        <ServicesSection />
        <HowItWorksSection />
        <FeaturesSection />
        <ReviewsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
