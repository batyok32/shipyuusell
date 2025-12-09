"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { verifyEmail } from "@/store/slices/authSlice";
import {
  Mail,
  Loader2,
  Package,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    // Get email from query params or from user state
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else if (user?.email) {
      setEmail(user.email);
    } else {
      // If no email, redirect to login
      router.push("/login");
    }
  }, [searchParams, user, router]);

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split("");
      setCode(newCode);
      document.getElementById("code-5")?.focus();
    }
  };

  const handleVerify = async () => {
    const verificationCode = code.join("");
    if (verificationCode.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }

    if (!email) {
      toast.error("Email is required");
      return;
    }

    setVerifying(true);
    try {
      const result = await dispatch(
        verifyEmail({ email, code: verificationCode })
      ).unwrap();

      // If verification successful, tokens are returned
      if (result.access && result.refresh) {
        localStorage.setItem("access_token", result.access);
        localStorage.setItem("refresh_token", result.refresh);
        toast.success("Email verified successfully! Redirecting...");
        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        toast.success("Email verified successfully!");
        router.push("/login");
      }
    } catch (error) {
      toast.error(error || "Invalid verification code. Please try again.");
      // Clear code on error
      setCode(["", "", "", "", "", ""]);
      document.getElementById("code-0")?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }

    setResending(true);
    try {
      await api.post("/auth/resend-verification-code/", { email });
      toast.success("Verification code sent! Please check your email.");
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          "Failed to resend code. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Animated background elements */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-orange-400 rounded-full animated-blob opacity-10" />
      <div
        className="absolute bottom-20 right-20 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-10"
        style={{ animationDelay: "2s" }}
      />
      <div className="absolute inset-0 pattern-dots opacity-5" />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8"
        >
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
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
          <div className="mb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="inline-flex p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4"
            >
              <Mail className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-black mb-3">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Verify Your Email
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-lg font-semibold text-orange-600 dark:text-orange-400 mt-1">
              {email || "your email"}
            </p>
          </div>

          {/* Verification Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-4 text-center text-gray-700 dark:text-gray-300">
              Enter Verification Code
            </label>
            <div className="flex justify-center gap-3 mb-4">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              Didn't receive the code?{" "}
              <button
                onClick={handleResendCode}
                disabled={resending}
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : "Resend Code"}
              </button>
            </p>
          </div>

          {/* Verify Button */}
          <motion.button
            type="button"
            onClick={handleVerify}
            disabled={verifying || code.some((d) => !d)}
            whileHover={{ scale: code.every((d) => d) ? 1.02 : 1, y: -2 }}
            whileTap={{ scale: code.every((d) => d) ? 0.98 : 1 }}
            className="w-full px-6 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all mb-4"
          >
            {verifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify Email
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-semibold mb-1">Check your inbox</p>
                <p>
                  The verification code may take a few minutes to arrive. Make
                  sure to check your spam folder as well.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Wrong email?{" "}
              <Link
                href="/register"
                className="font-bold text-orange-500 hover:text-orange-600 transition-colors"
              >
                Go back
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
