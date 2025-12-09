"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Package, Zap, User, LogOut, Info } from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { href: "/quote", label: "Get Quote", icon: Package },
    { href: "/services", label: "Services", icon: Zap },
    { href: "/about", label: "About", icon: Info },
    { href: "/faq", label: "FAQ", icon: "" },

    { href: "/dashboard", label: "Dashboard", icon: Package },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-orange-200/50 dark:border-orange-900/30 shadow-xl"
          : "glass border-b border-transparent"
      }`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-red-500/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-orange-500 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative p-2.5 rounded-xl gradient-bg shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
            </motion.div>
            <div className="flex flex-col">
              <span className="text-2xl font-black gradient-text leading-tight">
                YuuSell
              </span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Logistics
              </span>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, i) => {
              const isActive = pathname === item.href;
              return (
                <Link key={i} href={item.href}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className={`relative px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                      isActive
                        ? "text-orange-500"
                        : "text-gray-700 dark:text-gray-300 hover:text-orange-500"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                        initial={false}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {item.icon && <item.icon className="w-4 h-4" />}
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}

            {mounted && (
              <>
                {isAuthenticated ? (
                  <>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {user?.email?.split("@")[0] || "User"}
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => dispatch(logout())}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all"
                      >
                        <LogOut className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 mx-2" />
                    <Link href="/login">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2.5 gradient-bg text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all glow-effect"
                      >
                        Sign In
                      </motion.button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg glass-card text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-orange-200/50 dark:border-orange-900/30 glass"
          >
            <div className="px-4 py-6 space-y-2">
              {navItems.map((item, i) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={i}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                        isActive
                          ? "bg-orange-50 dark:bg-orange-900/20 text-orange-500"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {item.icon && <item.icon className="w-5 h-5" />}
                      {item.label}
                    </motion.div>
                  </Link>
                );
              })}
              {mounted && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {user?.email || "User"}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          dispatch(logout());
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold"
                      >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <Link href="/login" onClick={() => setIsOpen(false)}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full px-4 py-3 gradient-bg text-white rounded-lg font-bold shadow-lg"
                      >
                        Sign In
                      </motion.button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
