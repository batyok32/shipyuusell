"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  Shield,
  Zap,
  Globe,
  DollarSign,
  Clock,
  Headphones,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Secure & Insured",
    description:
      "All shipments are fully insured and tracked with end-to-end security protocols.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Zap,
    title: "Fast Processing",
    description:
      "Quick warehouse processing and dispatch with real-time status updates.",
    gradient: "from-orange-600 to-orange-400",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description:
      "Ship to 200+ countries worldwide with local expertise in every region.",
    gradient: "from-red-500 to-orange-500",
  },
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description:
      "No hidden fees, clear cost breakdown with upfront quotes and real-time rates.",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description:
      "Track your shipment every step of the way with live updates and notifications.",
    gradient: "from-orange-600 to-orange-400",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Dedicated customer support team available around the clock for your peace of mind.",
    gradient: "from-red-500 to-orange-500",
  },
];

export function FeaturesSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-white dark:bg-gray-900"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pattern-dots opacity-20" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-10" />
      <div
        className="absolute bottom-1/4 left-0 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-10"
        style={{ animationDelay: "2s" }}
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
              Why Choose Us
            </span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6">
            <span className="text-gray-900 dark:text-white">
              Everything You
            </span>
            <br />
            <span className="gradient-text">Need & More</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Comprehensive features designed to make international shipping
            effortless
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: -15 }}
              animate={inView ? { opacity: 1, y: 0, rotateX: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.8, type: "spring" }}
              whileHover={{ y: -12, scale: 1.02 }}
              className="group relative"
            >
              <div className="card-modern p-10 h-full">
                {/* Icon */}
                <motion.div
                  className={`inline-flex p-5 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6 glow-effect-orange`}
                  whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <feature.icon className="w-10 h-10 text-white" />
                </motion.div>

                {/* Content */}
                <h3 className="text-2xl font-black mb-4 text-gray-900 dark:text-white group-hover:gradient-text transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-lg mb-6">
                  {feature.description}
                </p>

                {/* Checkmark indicator */}
                <div className="flex items-center gap-2 text-orange-500 font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm">Included</span>
                </div>

                {/* Hover shimmer */}
                <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
