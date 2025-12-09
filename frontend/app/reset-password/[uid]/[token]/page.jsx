"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Lock,
  Loader2,
  Package,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  // Get URL parameters - Next.js auto-decodes
  // Clean token: remove any whitespace and line breaks that might have been copied from email
  const rawToken = params.token || "";
  const token = rawToken.replace(/\s+/g, "").trim();
  const uid = (params.uid || "").trim();

  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [validToken, setValidToken] = useState(false);

  useEffect(() => {
    // Validate token on mount
    if (uid && token) {
      setValidToken(true);
      setValidating(false);
    } else {
      setValidating(false);
    }
  }, [uid, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.new_password || !formData.confirm_password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.new_password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        new_password: formData.new_password,
      });

      setSuccess(true);
      toast.success("Password reset successfully!");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to reset password. The link may be invalid or expired.";

      // Check if token is invalid or expired (case insensitive)
      const isTokenInvalid =
        errorMessage.toLowerCase().includes("invalid or expired reset token") ||
        errorMessage.toLowerCase().includes("invalid or expired") ||
        errorMessage.toLowerCase().includes("already been used") ||
        errorMessage.toLowerCase().includes("expired reset token");

      if (isTokenInvalid) {
        toast.error(
          "This password reset link has expired or is invalid. Redirecting to request a new one..."
        );
        setTimeout(() => {
          router.push("/forgot-password");
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!validToken || !uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md w-full text-center">
          <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
            <Link href="/forgot-password">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold"
              >
                Request New Link
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md w-full text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-green-100 dark:border-green-900"
          >
            <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Password Reset Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been reset successfully. Redirecting to login...
            </p>
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 mx-auto"
              >
                Go to Login
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

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
                  Reset Password
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Enter your new password below
              </p>
            </div>

            {/* Reset Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.new_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        new_password: e.target.value,
                      })
                    }
                    placeholder="At least 8 characters"
                    className="w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirm_password}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirm_password: e.target.value,
                      })
                    }
                    placeholder="Confirm your new password"
                    className="w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
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
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

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
                <Shield className="w-16 h-16 text-white" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-black mb-6">Create New Password</h2>
            <p className="text-xl text-white/90 mb-8">
              Choose a strong password to keep your account secure. Make sure
              it's at least 8 characters long.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">
                  Minimum 8 characters
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">
                  Use letters and numbers
                </span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">Keep it unique</span>
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
