"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Package,
  ShoppingCart,
  Boxes,
  ArrowRight,
  Truck,
  Plane,
  Ship,
  Train,
  CheckCircle,
} from "lucide-react";

const services = [
  {
    title: "Ship My Items",
    description:
      "Send packages to our warehouse, we ship internationally with full transport mode selection and real-time tracking.",
    icon: Package,
    href: "/ship",
    color: "from-orange-500 to-red-500",
    features: [
      "Unique warehouse address",
      "30 days free storage",
      "Real-time tracking",
      "Multiple carriers",
      "Full insurance coverage",
    ],
  },
  {
    title: "Buy & Ship",
    description:
      "Request products via URL or description, our buying agents purchase and ship to you with complete transparency.",
    icon: ShoppingCart,
    href: "/buy-ship",
    color: "from-red-500 to-orange-500",
    features: [
      "Shop from anywhere",
      "Expert buying agents",
      "Transparent pricing",
      "Quality assurance",
      "Automatic forwarding",
    ],
  },
];

const transportModes = [
  {
    name: "Air Freight",
    icon: Plane,
    speed: "1-8 days",
    description: "Fastest option for urgent shipments",
  },
  {
    name: "Sea Freight",
    icon: Ship,
    speed: "15-45 days",
    description: "Most economical for large items",
  },
  {
    name: "Rail Freight",
    icon: Train,
    speed: "10-20 days",
    description: "Eco-friendly for specific routes",
  },
  {
    name: "Truck/Road",
    icon: Truck,
    speed: "2-10 days",
    description: "Ideal for regional deliveries",
  },
];

export default function ServicesPage() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-20" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-orange-400 rounded-full animated-blob opacity-10" />
          <div
            className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-red-400 rounded-full animated-blob opacity-10"
            style={{ animationDelay: "2s" }}
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
                <Truck className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Our Services
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                <span className="gradient-text">Comprehensive</span>
                <br />
                <span className="text-gray-900 dark:text-white">
                  Logistics Solutions
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                Everything you need for seamless international shipping and
                freight forwarding. Choose the service that fits your needs.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Services */}
        <section ref={ref} className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 md:gap-12">
              {services.map((service, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 60 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.2, duration: 0.8, type: "spring" }}
                  className="h-full"
                >
                  <Link href={service.href}>
                    <motion.div
                      whileHover={{ y: -12, scale: 1.02 }}
                      className="group relative h-full card-modern p-8 md:p-10 overflow-hidden"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                      />

                      <motion.div
                        className={`relative z-10 inline-flex p-5 rounded-2xl bg-gradient-to-br ${service.color} mb-6 glow-effect-orange`}
                        whileHover={{ rotate: 360, scale: 1.1 }}
                        transition={{ duration: 0.6 }}
                      >
                        <service.icon className="w-10 h-10 text-white" />
                      </motion.div>

                      <div className="relative z-10">
                        <h3 className="text-2xl md:text-3xl font-black mb-4 text-gray-900 dark:text-white group-hover:gradient-text transition-all duration-300">
                          {service.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-lg">
                          {service.description}
                        </p>

                        <ul className="space-y-3 mb-8">
                          {service.features.map((feature, idx) => (
                            <li
                              key={idx}
                              className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                            >
                              <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <motion.div
                          className="flex items-center text-orange-500 dark:text-orange-400 font-bold text-lg group-hover:gap-3 transition-all duration-300"
                          initial={false}
                          whileHover={{ x: 5 }}
                        >
                          Learn more
                          <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                        </motion.div>
                      </div>

                      <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Transport Modes */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 relative overflow-hidden">
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
                Transport <span className="gradient-text">Modes</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Multiple shipping options to fit your timeline and budget
              </p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {transportModes.map((mode, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.1,
                    type: "spring",
                    bounce: 0.5,
                  }}
                  whileHover={{ scale: 1.15, y: -10, rotate: 5 }}
                  className="group relative"
                >
                  <div className="card-modern p-6 md:p-8 text-center">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.6 }}
                      className="inline-flex p-5 rounded-2xl gradient-bg mb-4 glow-effect-orange"
                    >
                      <mode.icon className="w-10 h-10 text-white" />
                    </motion.div>
                    <div className="font-black text-lg text-gray-900 dark:text-white mb-2 group-hover:gradient-text transition-all duration-300">
                      {mode.name}
                    </div>
                    <div className="text-sm font-semibold text-orange-500 mb-2">
                      {mode.speed}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {mode.description}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 gradient-bg relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Choose a service and start shipping globally today
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white text-orange-500 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
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
