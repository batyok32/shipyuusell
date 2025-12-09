"use client";

import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ArrowRight, Sparkles, Zap, Globe, Shield } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";

export function HeroSection() {
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const floatingRef = useRef(null);
  const [isMounted, setIsMounted] = useState(false);
  const [particles, setParticles] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsMounted(true);

    // Generate particle positions only once after mount
    if (typeof window !== "undefined") {
      setParticles(
        Array.from({ length: 30 }, (_, i) => ({
          id: i,
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          duration: Math.random() * 10 + 10,
          size: Math.random() * 4 + 2,
        }))
      );
    }

    // Removed GSAP animation for title

    if (floatingRef.current) {
      gsap.to(floatingRef.current.children, {
        y: 20,
        duration: 2,
        repeat: -1,
        yoyo: true,
        stagger: 0.2,
        ease: "power1.inOut",
      });
    }

    // Mouse move tracking for parallax
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[calc(100vh-5rem)] flex items-center justify-center overflow-hidden pt-16 md:pt-20"
    >
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient animate-gradient opacity-40" />

      {/* Animated gradient orbs - smaller on mobile */}
      <div className="absolute top-20 left-20 w-48 h-48 md:w-96 md:h-96 bg-orange-500 rounded-full animated-blob opacity-20 md:opacity-30" />
      <div
        className="absolute bottom-20 right-20 w-48 h-48 md:w-96 md:h-96 bg-red-500 rounded-full animated-blob opacity-20 md:opacity-30"
        style={{ animationDelay: "2s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-orange-400 rounded-full animated-blob opacity-10 md:opacity-20 hidden md:block"
        style={{ animationDelay: "4s" }}
      />

      {/* Pattern overlay */}
      <div className="absolute inset-0 pattern-dots opacity-30" />

      {/* Floating particles - enhanced */}
      {isMounted && particles.length > 0 && (
        <div
          ref={floatingRef}
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-gradient-to-br from-orange-400 to-red-500 opacity-50"
              style={{
                width: `${particle.size}px`,
                height: `${particle.size}px`,
              }}
              initial={{
                x: particle.x,
                y: particle.y,
              }}
              animate={{
                y: [
                  particle.y,
                  particle.y + (Math.random() * 300 - 150),
                  particle.y,
                ],
                x: [
                  particle.x,
                  particle.x + (Math.random() * 300 - 150),
                  particle.x,
                ],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Parallax floating icons - hidden on mobile */}
      <div className="absolute inset-0 pointer-events-none hidden md:block">
        <motion.div
          className="absolute top-20 left-10 p-4 rounded-full glass-card"
          animate={{
            x: mousePosition.x * 0.5,
            y: mousePosition.y * 0.5,
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 6, repeat: Infinity }}
        >
          <Zap className="w-8 h-8 text-orange-500" />
        </motion.div>
        <motion.div
          className="absolute top-40 right-20 p-4 rounded-full glass-card"
          animate={{
            x: mousePosition.x * -0.3,
            y: mousePosition.y * -0.3,
            rotate: [0, -15, 15, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        >
          <Globe className="w-8 h-8 text-orange-500" />
        </motion.div>
        <motion.div
          className="absolute bottom-32 left-1/4 p-4 rounded-full glass-card"
          animate={{
            x: mousePosition.x * 0.4,
            y: mousePosition.y * 0.4,
            rotate: [0, 20, -20, 0],
          }}
          transition={{ duration: 7, repeat: Infinity }}
        >
          <Shield className="w-8 h-8 text-orange-500" />
        </motion.div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 1, bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-card mb-8 glow-effect-orange"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-orange-500" />
            </motion.div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              International Logistics Platform
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black mb-6 md:mb-8 leading-tight">
            <span className="block gradient-text text-shadow-glow">
              YuuSell
            </span>
            <span className="block text-gray-900 dark:text-white mt-1 md:mt-2">
              Logistics
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed font-light px-4"
          >
            Ship globally with{" "}
            <span className="font-bold gradient-text">ease</span>. Buy & ship
            from <span className="font-bold gradient-text">anywhere</span>.
            Track shipments in{" "}
            <span className="font-bold gradient-text">real-time</span>. Fast,
            reliable, and transparent international freight forwarding.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center mb-12 md:mb-16 px-4"
          >
            <Link href="/quote">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group relative w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 btn-premium text-white rounded-xl font-bold text-lg md:text-xl overflow-hidden glow-effect"
              >
                <span className="relative z-10 flex items-center gap-3">
                  Get Instant Quote
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.div>
                </span>
              </motion.button>
            </Link>

            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 glass-card text-gray-900 dark:text-white rounded-xl font-bold text-lg md:text-xl hover:glow-effect transition-all"
              >
                View Dashboard
              </motion.button>
            </Link>
          </motion.div>

          {/* Enhanced Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto px-4"
          >
            {[
              { label: "Countries", value: "200+", icon: Globe },
              { label: "Packages Shipped", value: "50K+", icon: Zap },
              { label: "Happy Customers", value: "10K+", icon: Sparkles },
              { label: "On-Time Delivery", value: "99%", icon: Shield },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{
                  delay: 1.2 + i * 0.1,
                  type: "spring",
                  bounce: 0.5,
                }}
                whileHover={{ scale: 1.1, y: -10, rotate: 5 }}
                className="card-modern p-4 md:p-6 lg:p-8 text-center relative overflow-hidden group"
              >
                <div className="absolute inset-0 gradient-bg-soft opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.2 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex p-4 rounded-2xl gradient-bg mb-4 glow-effect-orange"
                  >
                    <stat.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <div className="text-4xl font-black gradient-text mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
