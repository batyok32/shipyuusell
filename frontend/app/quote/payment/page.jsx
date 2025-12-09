"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Loader2,
  CheckCircle,
  CreditCard,
  DollarSign,
  AlertCircle,
  ArrowRight,
  Shield,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";

export default function PaymentPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [error, setError] = useState(null);
  const [shipmentId, setShipmentId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to proceed with payment");
      router.push("/login?redirect=/quote/payment");
      return;
    }

    // Check for shipment_id in URL params or sessionStorage
    const urlParams = new URLSearchParams(window.location.search);
    const shipmentId = urlParams.get("shipment_id");

    if (shipmentId) {
      // Fetch shipment data using shipment_id
      setShipmentId(shipmentId);
      fetchShipmentData(shipmentId);
    } else {
      // Load shipment data from sessionStorage (fallback)
      const storedShipment = sessionStorage.getItem("shipmentData");
      if (!storedShipment) {
        toast.error("No shipment found. Please start from the beginning.");
        router.push("/quote");
        return;
      }

      try {
        const data = JSON.parse(storedShipment);
        setShipmentData(data);
        if (data.id) {
          setShipmentId(data.id);
          createCheckoutSession(data.id);
        } else {
          toast.error("Invalid shipment data");
          router.push("/quote");
        }
      } catch (err) {
        toast.error("Invalid shipment data");
        router.push("/quote");
      }
    }
  }, [isAuthenticated, router]);

  const fetchShipmentData = async (shipmentId) => {
    setLoading(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/shipments/${shipmentId}/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch shipment data");
      }

      const data = await response.json();
      setShipmentData(data);
      setShipmentId(shipmentId);
      createCheckoutSession(shipmentId);
    } catch (err) {
      toast.error(err.message || "Failed to load shipment");
      setError(err.message || "Failed to load shipment");
      setLoading(false);
    }
  };

  const createCheckoutSession = async (shipmentId) => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/create-payment-session/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            shipment_id: shipmentId,
            success_url: `${window.location.origin}/quote/confirmation?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/quote/payment?cancelled=true`,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      setCheckoutUrl(data.checkout_url);
      setError(null); // Clear error on success

      // Redirect to Stripe Checkout
      window.location.href = data.checkout_url;
    } catch (err) {
      const errorMessage = err.message || "Failed to initialize payment";
      toast.error(errorMessage);
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    if (shipmentId) {
      createCheckoutSession(shipmentId);
    } else if (shipmentData?.id) {
      createCheckoutSession(shipmentData.id);
    } else {
      toast.error("Shipment ID not found. Please go back and try again.");
    }
  };

  if (!shipmentData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Complete Payment
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Secure payment powered by Stripe
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Payment Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                Payment Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Shipment Number:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {shipmentData.shipment_number}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Shipping Cost:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${parseFloat(shipmentData.shipping_cost).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Service Fee:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${parseFloat(shipmentData.service_fee || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">
                    Insurance:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    ${parseFloat(shipmentData.insurance_cost || 0).toFixed(2)}
                  </span>
                </div>

                <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      Total:
                    </span>
                    <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                      ${parseFloat(shipmentData.total_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Secure payment powered by Stripe
                </span>
              </div>
            </motion.div>

            {/* Payment Loading/Error */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 flex flex-col items-center justify-center min-h-[400px]"
            >
              {error ? (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mb-6" />
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                    Payment Failed
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    {error}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleTryAgain}
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                      </>
                    )}
                  </motion.button>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-16 h-16 animate-spin text-orange-500 mb-6" />
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                    Redirecting to Payment...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center">
                    You will be redirected to Stripe Checkout to complete your
                    payment securely.
                  </p>
                </>
              ) : (
                <>
                  <CreditCard className="w-16 h-16 text-orange-500 mb-6" />
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                    Payment Processing
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    Please wait while we prepare your payment...
                  </p>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
