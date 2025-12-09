"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  Package,
  ShoppingCart,
  Boxes,
  Truck,
  Plane,
  Ship,
  Train,
  Car,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

const services = [
  {
    title: "Ship My Items",
    description:
      "Send packages to our warehouse, we ship internationally with full transport mode selection and real-time tracking.",
    icon: Package,
    href: "/ship",
    color: "from-orange-500 to-red-500",
    features: ["Real-time Tracking", "Multiple Carriers", "Secure Packaging"],
  },
  {
    title: "Buy & Ship",
    description:
      "Request products via URL or description, our buying agents purchase and ship to you with complete transparency.",
    icon: ShoppingCart,
    href: "/buy-ship",
    color: "from-orange-600 to-orange-400",
    features: ["Expert Sourcing", "Price Comparison", "Quality Assurance"],
  },
];

const transportModes = [
  {
    name: "Air Freight",
    icon: Plane,
    speed: "1-8 days",
    color: "text-orange-500",
    gradient: "from-orange-500 to-red-500",
  },
  {
    name: "Sea Freight",
    icon: Ship,
    speed: "15-45 days",
    color: "text-orange-600",
    gradient: "from-orange-600 to-orange-400",
  },
  {
    name: "Rail Freight",
    icon: Train,
    speed: "10-20 days",
    color: "text-orange-500",
    gradient: "from-orange-500 to-red-500",
  },
  {
    name: "Truck/Road",
    icon: Truck,
    speed: "2-10 days",
    color: "text-orange-600",
    gradient: "from-orange-600 to-orange-400",
  },
  {
    name: "Vehicles",
    icon: Car,
    speed: "10-60 days",
    color: "text-red-500",
    gradient: "from-red-500 to-orange-500",
  },
];

export function ServicesSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-b from-white via-orange-50/30 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-10" />
      <div
        className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-10"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={inView ? { scale: 1 } : {}}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            className="inline-block mb-6"
          >
            <span className="px-6 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold text-sm uppercase tracking-wider">
              Our Services
            </span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-4 md:mb-6 px-4">
            <span className="gradient-text block">Comprehensive</span>
            <span className="text-gray-900 dark:text-white block">
              Logistics Solutions
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed px-4">
            Everything you need for seamless international shipping and freight
            forwarding
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, rotateY: -15 }}
              animate={inView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.8, type: "spring" }}
            >
              <Link href={service.href}>
                <motion.div
                  whileHover={{ y: -12, scale: 1.02 }}
                  className="group relative h-full card-modern p-10 overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  />

                  {/* Icon with enhanced design */}
                  <motion.div
                    className={`relative z-10 inline-flex p-5 rounded-2xl bg-gradient-to-br ${service.color} mb-6 glow-effect-orange`}
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    <service.icon className="w-10 h-10 text-white" />
                  </motion.div>

                  {/* Content */}
                  <div className="relative z-10">
                    <h3 className="text-2xl md:text-3xl font-black mb-4 text-gray-900 dark:text-white group-hover:gradient-text transition-all duration-300">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-lg">
                      {service.description}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <motion.div
                      className="flex items-center text-orange-500 dark:text-orange-400 font-bold text-lg group-hover:gap-3 transition-all duration-300"
                      initial={false}
                      whileHover={{ x: 5 }}
                    >
                      Learn more
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                    </motion.div>
                  </div>

                  {/* Shimmer effect */}
                  <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Transport Modes - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-center"
        >
          <h3 className="text-4xl md:text-5xl font-black mb-4 text-gray-900 dark:text-white">
            Transport <span className="gradient-text">Modes</span>
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-12">
            Multiple shipping options to fit your timeline and budget
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {transportModes.map((mode, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={inView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
                transition={{
                  delay: 0.8 + i * 0.1,
                  type: "spring",
                  bounce: 0.5,
                }}
                whileHover={{ scale: 1.15, y: -10, rotate: 5 }}
                className="group relative"
              >
                <div className="card-modern p-8 text-center">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.6 }}
                    className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${mode.gradient} mb-4 glow-effect-orange`}
                  >
                    <mode.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <div className="font-black text-lg text-gray-900 dark:text-white mb-2 group-hover:gradient-text transition-all duration-300">
                    {mode.name}
                  </div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {mode.speed}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
