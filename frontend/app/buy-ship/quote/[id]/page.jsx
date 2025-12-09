"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  Loader2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Receipt,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import Image from "next/image";

export default function BuyShipQuotePage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [buyingRequest, setBuyingRequest] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/buy-ship/quote/" + params.id);
      return;
    }

    fetchBuyingRequest();
  }, [isAuthenticated, params.id, router]);

  const fetchBuyingRequest = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/buying/requests/${params.id}/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setBuyingRequest(data);
      } else {
        throw new Error(data.error || "Failed to load buying request");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load quote");
      router.push("/buy-ship");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/buying/requests/${params.id}/approve/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success("Quote approved! Agent will proceed with purchase.");
        setBuyingRequest(data);
        // Navigate to tracking page
        setTimeout(() => {
          router.push(`/buy-ship/track/${params.id}`);
        }, 2000);
      } else {
        throw new Error(data.error || "Failed to approve quote");
      }
    } catch (error) {
      toast.error(error.message || "Failed to approve quote");
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!buyingRequest) {
    return null;
  }

  const quote = {
    product_cost: parseFloat(buyingRequest.product_cost || 0),
    sales_tax: parseFloat(buyingRequest.sales_tax || 0),
    buying_service_fee: parseFloat(buyingRequest.buying_service_fee || 0),
    buying_service_fee_percent: parseFloat(
      buyingRequest.buying_service_fee_percent || 0
    ),
    domestic_shipping: parseFloat(buyingRequest.domestic_shipping_cost || 0),
    total: parseFloat(buyingRequest.quote_amount || 0),
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                Quote Ready
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 bg-clip-text text-transparent">
                Your Quote is Ready!
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Review the detailed breakdown below
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Product Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 sticky top-24">
                {buyingRequest.product_image && (
                  <div className="relative h-64 w-full rounded-xl overflow-hidden mb-4">
                    <Image
                      src={buyingRequest.product_image}
                      alt={buyingRequest.product_name || "Product"}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  {buyingRequest.product_name || "Product"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {buyingRequest.product_description}
                </p>
                {buyingRequest.product_url && (
                  <a
                    href={buyingRequest.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                  >
                    View Original Listing
                    <ArrowRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>

            {/* Quote Breakdown */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Receipt className="w-8 h-8 text-orange-500" />
                  Cost Breakdown
                </h2>

                <div className="space-y-4 mb-6">
                  <AnimatePresence>
                    {[
                      {
                        label: "Product Cost",
                        value: quote.product_cost,
                        icon: ShoppingCart,
                        color: "blue",
                      },
                      {
                        label: "Sales Tax",
                        value: quote.sales_tax,
                        icon: TrendingUp,
                        color: "purple",
                      },
                      {
                        label: `Buying Service Fee (${quote.buying_service_fee_percent}%)`,
                        value: quote.buying_service_fee,
                        icon: Package,
                        color: "orange",
                      },
                      {
                        label: "Domestic Shipping to Warehouse",
                        value: quote.domestic_shipping,
                        icon: Truck,
                        color: "green",
                      },
                    ].map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                          className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`p-3 rounded-lg bg-${item.color}-50 dark:bg-${item.color}-900/20`}
                            >
                              <Icon
                                className={`w-6 h-6 text-${item.color}-500`}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {item.label}
                              </div>
                            </div>
                          </div>
                          <div className="text-xl font-black text-gray-900 dark:text-white">
                            ${item.value.toFixed(2)}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                    className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 text-white"
                  >
                    <div>
                      <div className="text-sm font-semibold text-orange-100 uppercase mb-1">
                        Total Quote Amount
                      </div>
                      <div className="text-4xl font-black">
                        ${quote.total.toFixed(2)}
                      </div>
                    </div>
                    <DollarSign className="w-12 h-12 text-orange-200" />
                  </motion.div>
                </div>
              </div>

              {/* Info Box */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="card-modern p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                      What's Included
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Product purchase and verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Domestic shipping to our warehouse (included)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          International shipping will be quoted separately once
                          item arrives at warehouse
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="flex gap-4"
              >
                <motion.button
                  onClick={handleApprove}
                  disabled={
                    approving || buyingRequest.status !== "quote_generated"
                  }
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-8 py-5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                >
                  {approving ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-6 h-6" />
                      Approve & Proceed
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
