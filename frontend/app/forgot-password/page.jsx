"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Mail,
  Loader2,
  Package,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Lock,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password-reset/request/", { email });
      setSuccess(true);
      toast.success("Password reset email sent! Please check your inbox.");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to send reset email. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Animated background elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-orange-400 rounded-full animated-blob opacity-10" />
        <div
          className="absolute bottom-20 left-20 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-10"
          style={{ animationDelay: "2s" }}
        />
        <div className="absolute inset-0 pattern-dots opacity-5" />

        <div className="relative z-10 w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-8 group"
            >
              <motion.div
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6, type: "spring" }}
                className="relative"
              >
                <div className="absolute inset-0 bg-orange-500 rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 shadow-lg">
                  <Package className="w-7 h-7 text-white" />
                </div>
              </motion.div>
              <div className="flex flex-col">
                <span className="text-2xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent leading-tight">
                  YuuSell
                </span>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Logistics
                </span>
              </div>
            </Link>

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-black mb-3">
                <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  Forgot Password?
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {success
                  ? "Check your email for password reset instructions"
                  : "Enter your email address and we'll send you a link to reset your password"}
              </p>
            </div>

            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-900 text-center"
              >
                <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <CheckCircle className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Email Sent!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>.
                  Please check your inbox and follow the instructions.
                </p>
                <div className="space-y-3">
                  <Link href="/login">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      Back to Login
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                    className="w-full px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    Resend email
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                      required
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </motion.button>
              </form>
            )}

            <div className="mt-8 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-orange-500 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-orange-600 via-red-500 to-orange-500">
        <div className="absolute inset-0 pattern-dots opacity-10" />
        <div className="absolute top-10 right-10 w-64 h-64 bg-white/10 rounded-full animated-blob" />
        <div
          className="absolute bottom-10 left-10 w-96 h-96 bg-white/10 rounded-full animated-blob"
          style={{ animationDelay: "3s" }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center px-12 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="max-w-md text-center"
          >
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mb-8"
            >
              <div className="inline-flex p-6 rounded-2xl bg-white/20 backdrop-blur-md mb-6">
                <Lock className="w-16 h-16 text-white" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-black mb-6">Secure Password Reset</h2>
            <p className="text-xl text-white/90 mb-8">
              We'll send you a secure link to reset your password. Your account
              security is our priority.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">
                  256-bit encryption
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">
                  Secure email verification
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">
                  Link expires in 24 hours
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Decorative image overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="relative h-full w-full">
            <Image
              src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=1200&fit=crop"
              alt="Security"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
