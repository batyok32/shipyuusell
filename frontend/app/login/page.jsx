"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loginUser,
  googleLogin,
  facebookLogin,
} from "@/store/slices/authSlice";
import {
  Mail,
  Lock,
  Loader2,
  Package,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle,
  TrendingUp,
  Shield,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";

const features = [
  {
    icon: Globe,
    text: "Ship to 200+ countries",
  },
  {
    icon: Shield,
    text: "Secure & insured",
  },
  {
    icon: TrendingUp,
    text: "Real-time tracking",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, isAuthenticated } = useAppSelector((state) => state.auth);

  // Get redirect URL from query params
  const [redirectUrl, setRedirectUrl] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    if (isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      router.push(redirect || "/dashboard");
      return;
    }

    // Get redirect from URL params
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    if (redirect) {
      setRedirectUrl(redirect);
    }
  }, [isAuthenticated, router]);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' or 'facebook'

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const result = await dispatch(loginUser(formData)).unwrap();
      toast.success("Login successful!");
      // Redirect to the specified URL or default to dashboard
      const redirect = redirectUrl || "/dashboard";
      router.push(redirect);
    } catch (error) {
      // Check if error is about email verification
      if (error && typeof error === "object" && error.requiresVerification) {
        toast.error(
          error.message || "Please verify your email before logging in."
        );
        router.push(
          `/verify-email?email=${encodeURIComponent(
            error.email || formData.email
          )}`
        );
      } else {
        const errorMessage = typeof error === "object" ? error.message : error;
        toast.error(
          errorMessage || "Login failed. Please check your credentials."
        );
      }
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
                  Welcome Back
                </span>
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Sign in to access your dashboard and manage your shipments
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-6 mb-6">
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
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Lock className="w-5 h-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter your password"
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
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                  />
                  Remember me
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
                >
                  Forgot password?
                </Link>
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
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Social Login */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <motion.button
                type="button"
                onClick={() => {
                  setOauthLoading("google");
                  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
                  if (!clientId) {
                    toast.error("Google OAuth not configured");
                    setOauthLoading(null);
                    return;
                  }
                  const redirectUri = `${window.location.origin}/auth/google/callback`;
                  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
                    redirectUri
                  )}&response_type=token&scope=email profile&state=login`;
                  window.location.href = authUrl;
                }}
                disabled={oauthLoading !== null}
                whileHover={{
                  scale: oauthLoading === null ? 1.05 : 1,
                  y: oauthLoading === null ? -2 : 0,
                }}
                whileTap={{ scale: oauthLoading === null ? 0.95 : 1 }}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-50"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Google
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setOauthLoading("facebook");
                  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
                  if (!appId) {
                    toast.error("Facebook OAuth not configured");
                    setOauthLoading(null);
                    return;
                  }
                  const redirectUri = `${window.location.origin}/auth/facebook/callback`;
                  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
                    redirectUri
                  )}&scope=email,public_profile&state=login&response_type=token`;
                  window.location.href = authUrl;
                }}
                disabled={oauthLoading !== null}
                whileHover={{
                  scale: oauthLoading === null ? 1.05 : 1,
                  y: oauthLoading === null ? -2 : 0,
                }}
                whileTap={{ scale: oauthLoading === null ? 0.95 : 1 }}
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all disabled:opacity-50"
              >
                {oauthLoading === "facebook" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                Facebook
              </motion.button>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-orange-500 hover:text-orange-600 transition-colors"
              >
                Sign up for free
              </Link>
            </p>
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
                <Package className="w-16 h-16 text-white" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-black mb-6">
              Ship Globally with Confidence
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of customers who trust YuuSell for their
              international shipping needs
            </p>
            <div className="space-y-4">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg font-semibold">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Decorative image overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="relative h-full w-full">
            <Image
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=1200&fit=crop"
              alt="Logistics"
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
