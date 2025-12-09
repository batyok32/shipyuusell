"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight } from "lucide-react";

const features = [
  {
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
    title: "Personal Warehouse Address",
    description:
      "Get your unique warehouse ID and dedicated shipping address. Use it like your own address when shopping online.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&h=600&fit=crop",
    title: "Photo Documentation",
    description:
      "Every package is professionally photographed upon arrival. See exactly what we received before shipping.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1605902715550-c2f867826f8c?w=800&h=600&fit=crop",
    title: "Precise Weighing",
    description:
      "Accurate weight and dimensional measurements ensure you only pay for what you ship, nothing more.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    title: "Quality Inspection",
    description:
      "Our team inspects each package for damage and verifies contents match your descriptions.",
  },
  {
    image:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=600&fit=crop",
    title: "30 Days Free Storage",
    description:
      "Keep your packages safe at our warehouse for a full month at no charge. Perfect for shopping sprees!",
  },
  {
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop",
    title: "Real-Time Updates",
    description:
      "Get instant notifications when packages arrive, during processing, and throughout shipping.",
  },
];

const steps = [
  {
    number: "01",
    title: "Sign Up & Get Address",
    description:
      "Create your free account and receive your unique warehouse ID and shipping address",
    image:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&h=400&fit=crop",
  },
  {
    number: "02",
    title: "Shop & Ship to Warehouse",
    description:
      "Use your warehouse address when shopping online or send packages from anywhere",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop",
  },
  {
    number: "03",
    title: "We Receive & Process",
    description:
      "We scan, photograph, weigh, measure, and inspect every package that arrives",
    image:
      "https://images.unsplash.com/photo-1586511925558-a4c5d295c4b4?w=600&h=400&fit=crop",
  },
  {
    number: "04",
    title: "Choose Shipping Method",
    description:
      "Select Air, Sea, Rail, or Road freight. Compare quotes and pick what works best",
    image:
      "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop",
  },
  {
    number: "05",
    title: "Track to Your Door",
    description:
      "Monitor your shipment in real-time with detailed tracking until delivery",
    image:
      "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop",
  },
];

const transportModes = [
  {
    name: "Air Freight",
    image:
      "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&h=400&fit=crop",
    speed: "1-8 days",
    description: "Lightning fast delivery",
    bestFor: "Urgent shipments",
  },
  {
    name: "Sea Freight",
    image:
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=600&h=400&fit=crop",
    speed: "15-45 days",
    description: "Most cost-effective",
    bestFor: "Large items",
  },
  {
    name: "Rail Freight",
    image:
      "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=400&fit=crop",
    speed: "10-20 days",
    description: "Eco-friendly option",
    bestFor: "Europe-Asia routes",
  },
  {
    name: "Truck/Road",
    image:
      "https://images.unsplash.com/photo-1601581875108-80d3ebb7e1d4?w=600&h=400&fit=crop",
    speed: "2-10 days",
    description: "Regional delivery",
    bestFor: "Land borders",
  },
];

export default function ShipPage() {
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
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-20" />
          <div
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-20"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute inset-0 pattern-grid opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    Ship My Items
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                  <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                    Ship Your Packages
                  </span>
                  <br />
                  <span className="text-gray-900 dark:text-white">
                    Globally with Ease
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                  Send your packages to our secure warehouse, and we'll handle
                  international shipping with full tracking, insurance, and
                  multiple transport options.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/register">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                    >
                      Get Started Free
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="/quote">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 glass-card text-gray-900 dark:text-white rounded-xl font-bold text-lg border-2 border-orange-200 dark:border-orange-800"
                    >
                      Get Instant Quote
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
                <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop"
                    alt="Modern warehouse"
                    fill
                    className="object-cover"
                    priority
                  />
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
                  Complete Package Management
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Professional handling from the moment your package arrives until
                it reaches your door
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
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="text-gray-900 dark:text-white">How It</span>{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  Works
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Simple, transparent, and efficient shipping process
              </p>
            </motion.div>

            <div className="grid md:grid-cols-5 gap-6 md:gap-8">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="relative"
                >
                  <div className="card-modern overflow-hidden p-0 text-center h-full bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
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
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-8 h-8 text-orange-500" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Transport Modes */}
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
                Choose Your{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  Transport Mode
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Multiple options to fit your timeline and budget
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {transportModes.map((mode, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="card-modern overflow-hidden p-0 text-center bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={mode.image}
                      alt={mode.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 md:p-8">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {mode.name}
                    </h3>
                    <div className="text-orange-500 font-bold mb-3">
                      {mode.speed}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {mode.description}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full inline-block">
                      {mode.bestFor}
                    </div>
                  </div>
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
                Ready to Start Shipping?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Join thousands of customers who trust us for their international
                shipping needs
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
                <Link href="/quote">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
                  >
                    Get Instant Quote
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
