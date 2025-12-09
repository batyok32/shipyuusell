"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Package, Search, CheckCircle, Truck, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Send to Warehouse",
    description:
      "Ship your items to our warehouse using your unique warehouse ID with prepaid labels",
    icon: Package,
    gradient: "from-orange-500 to-red-500",
  },
  {
    number: "02",
    title: "We Receive & Inspect",
    description:
      "We receive, photograph, weigh, and inspect your packages with detailed reports",
    icon: Search,
    gradient: "from-orange-600 to-orange-400",
  },
  {
    number: "03",
    title: "Choose Shipping",
    description:
      "Select your preferred transport mode and get instant quotes with real-time rates",
    icon: CheckCircle,
    gradient: "from-red-500 to-orange-500",
  },
  {
    number: "04",
    title: "Track & Deliver",
    description:
      "Track your shipment in real-time until delivery with live updates and notifications",
    icon: Truck,
    gradient: "from-orange-500 to-red-500",
  },
];

export function HowItWorksSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800"
    >
      {/* Background decorations */}
      <div className="absolute inset-0 pattern-dots opacity-20" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-300 rounded-full animated-blob opacity-10" />
      <div
        className="absolute bottom-0 left-1/4 w-96 h-96 bg-red-300 rounded-full animated-blob opacity-10"
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
              Process
            </span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6">
            <span className="gradient-text">How It</span>
            <br />
            <span className="text-gray-900 dark:text-white">Works</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Simple, transparent, and efficient shipping process in just 4 easy
            steps
          </p>
        </motion.div>

        <div className="relative">
          {/* Animated connection line */}
          <motion.div
            className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 opacity-30 rounded-full"
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.5, delay: 0.5 }}
          />

          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 60, scale: 0.8 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{
                  delay: i * 0.2,
                  duration: 0.8,
                  type: "spring",
                  bounce: 0.4,
                }}
                className="relative"
              >
                <div className="relative z-10 text-center">
                  {/* Step card */}
                  <motion.div
                    whileHover={{ scale: 1.1, y: -10, rotate: 5 }}
                    className="relative mb-8"
                  >
                    <motion.div
                      className={`inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br ${step.gradient} shadow-2xl glow-effect-orange`}
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <step.icon className="w-12 h-12 text-white" />
                    </motion.div>

                    {/* Step number badge */}
                    <motion.div
                      className="absolute -top-3 -right-3 w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-black text-lg shadow-xl"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={inView ? { scale: 1, rotate: 0 } : {}}
                      transition={{
                        delay: i * 0.2 + 0.3,
                        type: "spring",
                        bounce: 0.6,
                      }}
                    >
                      {step.number}
                    </motion.div>
                  </motion.div>

                  {/* Content */}
                  <div className="card-modern p-6">
                    <h3 className="text-xl md:text-2xl font-black mb-3 text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                      {step.description}
                    </p>

                    {/* Arrow connector (except last) */}
                    {i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                        <motion.div
                          animate={{ x: [0, 10, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        >
                          <ArrowRight className="w-8 h-8 text-orange-500" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
