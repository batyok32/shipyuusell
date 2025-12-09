"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Target } from "lucide-react";

const features = [
  {
    image:
      "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop",
    title: "Global Shopping Access",
    description:
      "Buy from stores worldwide that don't ship internationally. We break down barriers.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    title: "Expert Buying Agents",
    description:
      "Experienced agents handle purchases, negotiations, and communication with retailers.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&h=600&fit=crop",
    title: "Transparent Cost Breakdown",
    description:
      "See every cost before approval: product price, tax, fees, and shipping - nothing hidden.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
    title: "Quality Verification",
    description:
      "Agents verify product specifications, check availability, and ensure accuracy.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=600&fit=crop",
    title: "Fast Quote Processing",
    description:
      "Receive detailed quotes within 24-48 hours. Quick approval means quick purchase.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1590447158019-883d8d5f8bc7?w=800&h=600&fit=crop",
    title: "Seamless Forwarding",
    description:
      "Items automatically ship to our warehouse, then we forward them internationally to you.",
  },
];

const steps = [
  {
    number: "01",
    title: "Submit Product Request",
    description: "Share the product URL or description with our buying team",
    image:
      "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=600&h=400&fit=crop",
  },
  {
    number: "02",
    title: "Agent Research & Quote",
    description:
      "Our agents research the product and provide a complete cost breakdown",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
  },
  {
    number: "03",
    title: "Review & Approve",
    description:
      "Review the detailed quote and approve if everything looks good",
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&h=400&fit=crop",
  },
  {
    number: "04",
    title: "We Purchase Item",
    description: "Agent makes the purchase immediately after your approval",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
  },
  {
    number: "05",
    title: "Warehouse Receives",
    description:
      "Item ships to our warehouse where we inspect and photograph it",
    image:
      "https://images.unsplash.com/photo-1586511925558-a4c5d295c4b4?w=600&h=400&fit=crop",
  },
  {
    number: "06",
    title: "International Shipping",
    description: "Choose shipping method and we forward it to your address",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop",
  },
];

const pricing = [
  {
    item: "Product Cost",
    description: "Exact price from the retailer",
  },
  {
    item: "Sales Tax",
    description: "Local sales tax (if applicable)",
  },
  {
    item: "Buying Service Fee",
    description: "5-10% of product cost",
  },
  {
    item: "Domestic Shipping",
    description: "Store to our warehouse",
  },
  {
    item: "International Shipping",
    description: "Warehouse to your address",
  },
];

const benefits = [
  "Access products from stores that don't ship internationally",
  "No need for foreign credit cards or addresses",
  "Expert agents handle language barriers and communication",
  "Price comparison to ensure you get the best deal",
  "Complete transparency - see all costs upfront",
  "Automatic forwarding - seamless process from purchase to delivery",
];

export default function BuyShipPage() {
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
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-20" />
          <div
            className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-20"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute inset-0 pattern-dots opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    Buy & Ship
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                  <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                    Buy from Anywhere
                  </span>
                  <br />
                  <span className="text-gray-900 dark:text-white">
                    Ship to You
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                  Want to buy from a store that doesn't ship to your country?
                  Our buying agents purchase items for you and handle everything
                  from ordering to international delivery.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/buy-ship/request">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                    >
                      Start Buying Now
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="/dashboard">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 glass-card text-gray-900 dark:text-white rounded-xl font-bold text-lg border-2 border-orange-200 dark:border-orange-800"
                    >
                      View Dashboard
                    </motion.button>
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="card-modern p-8 lg:p-12 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800">
                  <div className="relative h-32 w-full mb-6 rounded-xl overflow-hidden">
                    <Image
                      src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=400&fit=crop"
                      alt="Shopping"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                    Complete Cost Breakdown
                  </h3>
                  <div className="space-y-4">
                    {pricing.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-4 pb-4 border-b border-orange-200 dark:border-orange-800 last:border-0"
                      >
                        <div className="flex-1">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {item.item}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-orange-100 dark:bg-orange-900/30 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold">
                      <span>All costs shown before approval</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* What We Offer */}
        <section ref={ref} className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  Complete Buying Service
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                From product research to international delivery - we handle it
                all
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100/50 via-red-100/50 to-orange-100/50 dark:from-orange-900/30 dark:via-red-900/30 relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-10" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="text-gray-900 dark:text-white">Simple</span>{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  6-Step Process
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                From request to delivery, we handle everything
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="card-modern overflow-hidden p-0 text-center bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="relative h-40 w-full">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-black text-lg shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                Why Use{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  Buy & Ship
                </span>
                ?
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-3 glass-card p-4 rounded-xl border-2 border-orange-100 dark:border-orange-900"
                >
                  <Target className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {benefit}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full animated-blob" />
          <div
            className="absolute bottom-10 right-10 w-64 h-64 bg-white/10 rounded-full animated-blob"
            style={{ animationDelay: "3s" }}
          />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                Start Shopping Globally
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Access products from anywhere in the world. Submit your first
                buying request today!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
                  >
                    Create Free Account
                  </motion.button>
                </Link>
                <Link href="/contact">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
                  >
                    Ask Questions
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
