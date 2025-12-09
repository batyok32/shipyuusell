"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  CheckCircle,
  Download,
  Printer,
  Package,
  Truck,
  Loader2,
  Copy,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";

function WarehouseLabelSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [labelData, setLabelData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      // Payment was successful, create the label
      createLabelFromSession(sessionId);
    } else {
      toast.error("No payment session found");
      router.push("/warehouse-label");
    }
  }, [isAuthenticated, router, searchParams]);

  const createLabelFromSession = async () => {
    try {
      // Get label data from sessionStorage (stored before payment)
      const storedData = sessionStorage.getItem("warehouseLabelData");
      if (!storedData) {
        toast.error("Label data not found");
        router.push("/warehouse-label");
        return;
      }

      const labelData = JSON.parse(storedData);

      // Create label via backend
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/warehouse/labels/create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            pickup_address: labelData.pickup_address,
            package_details: labelData.package_details,
            carrier: labelData.carrier,
            rate_id: labelData.rate_id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setLabelData(data);
        toast.success("Label generated successfully!");
        // Clear stored data
        sessionStorage.removeItem("warehouseLabelData");
      } else {
        throw new Error(data.error || "Failed to generate label");
      }
    } catch (error) {
      toast.error(error.message || "Failed to generate label");
      router.push("/warehouse-label");
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingNumber = () => {
    if (labelData?.tracking_number) {
      navigator.clipboard.writeText(labelData.tracking_number);
      setCopied(true);
      toast.success("Tracking number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
        <Footer />
      </>
    );
  }

  if (!labelData) {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
              className="inline-flex p-6 rounded-full bg-green-100 dark:bg-green-900/30 mb-6"
            >
              <CheckCircle className="w-16 h-16 text-green-500" />
            </motion.div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 bg-clip-text text-transparent">
                Label Generated!
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Your warehouse shipping label is ready
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-800"
          >
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white">
                Download Your Label
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Print and attach this label to your package before shipping
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <motion.a
                href={labelData.label_url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
              >
                <Download className="w-6 h-6" />
                Download Label PDF
              </motion.a>
              <motion.button
                onClick={() => window.print()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Printer className="w-6 h-6" />
                Print Label
              </motion.button>
            </div>

            {labelData.tracking_number && (
              <div className="p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-500 uppercase mb-2">
                      Tracking Number
                    </div>
                    <div className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                      {labelData.tracking_number}
                      <button
                        onClick={copyTrackingNumber}
                        className="p-2 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                      >
                        <Copy className="w-5 h-5 text-orange-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-orange-500">
                    <Truck className="w-8 h-8 text-white" />
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-blue-500" />
                Next Steps
              </h3>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-3">
                  <span className="font-bold text-blue-500">1.</span>
                  <span>Download and print your shipping label</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-blue-500">2.</span>
                  <span>Attach the label securely to your package</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-blue-500">3.</span>
                  <span>
                    {labelData.pickup_option === "scheduled_pickup"
                      ? "Wait for scheduled pickup"
                      : "Drop off at carrier location or schedule pickup"}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-blue-500">4.</span>
                  <span>
                    Track your package using the tracking number provided
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="font-bold text-blue-500">5.</span>
                  <span>
                    Once received at warehouse, you'll be notified and can
                    proceed with international shipping
                  </span>
                </li>
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <Link
                href="/warehouse-label"
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Buy Another Label
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function WarehouseLabelSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <WarehouseLabelSuccessContent />
    </Suspense>
  );
}
