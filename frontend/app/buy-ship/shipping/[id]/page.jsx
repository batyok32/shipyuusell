"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Plane,
  Ship,
  Train,
  Truck,
  DollarSign,
  Clock,
  CheckCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";

export default function BuyShipShippingPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [buyingRequest, setBuyingRequest] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [destinationCountry, setDestinationCountry] = useState("");
  const [countriesList, setCountriesList] = useState([]);
  const [flippedCard, setFlippedCard] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fetchBuyingRequest();
    fetchCountries();
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
      toast.error(error.message || "Failed to load data");
    }
  };

  const fetchCountries = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/logistics/countries/`);
      const data = await response.json();
      setCountriesList(data);
    } catch (error) {
      console.error("Failed to fetch countries:", error);
    }
  };

  const handleGetQuotes = async () => {
    if (!destinationCountry) {
      toast.error("Please select a destination country");
      return;
    }

    setLoadingQuotes(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/buying/requests/${params.id}/shipping-options/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            destination_country: destinationCountry,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setQuotes(data.quotes || []);
        toast.success(`Found ${data.quotes?.length || 0} shipping options!`);
      } else {
        throw new Error(data.error || "Failed to get shipping options");
      }
    } catch (error) {
      toast.error(error.message || "Failed to get shipping quotes");
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleSelectShipping = () => {
    if (!selectedQuote) {
      toast.error("Please select a shipping method");
      return;
    }

    // Store quote and navigate to shipping review
    sessionStorage.setItem(
      "buyingShipmentQuote",
      JSON.stringify({
        quote: selectedQuote,
        buyingRequestId: params.id,
        destinationCountry,
      })
    );
    router.push(`/buy-ship/shipping/${params.id}/review`);
  };

  const getTransportIcon = (modeName) => {
    const modeLower = modeName?.toLowerCase() || "";
    if (modeLower.includes("air")) return Plane;
    if (modeLower.includes("sea")) return Ship;
    if (modeLower.includes("rail")) return Train;
    return Truck;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Select Shipping Method
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Choose International Shipping
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Select your preferred shipping method to forward your item
              internationally
            </p>
          </motion.div>

          {/* Destination Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 mb-8"
          >
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
              Destination Country
            </h2>
            <div className="flex gap-4">
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
              >
                <option value="">Select Destination Country</option>
                {countriesList.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <motion.button
                onClick={handleGetQuotes}
                disabled={!destinationCountry || loadingQuotes}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black disabled:opacity-50 flex items-center gap-2"
              >
                {loadingQuotes ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Get Quotes
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Shipping Options */}
          <AnimatePresence>
            {quotes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
              >
                {quotes.map((quote, index) => {
                  const TransportIcon = getTransportIcon(
                    quote.transport_mode_name
                  );
                  const isFlipped = flippedCard === index;
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative h-96 perspective-1000"
                    >
                      <div
                        className="relative w-full h-full"
                        style={{
                          transformStyle: "preserve-3d",
                          transition: "transform 0.7s",
                          transform: isFlipped
                            ? "rotateY(180deg)"
                            : "rotateY(0deg)",
                        }}
                        onClick={() => setFlippedCard(isFlipped ? null : index)}
                      >
                        {/* Front */}
                        <div
                          className="absolute inset-0"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(0deg)",
                            display: isFlipped ? "none" : "block",
                          }}
                        >
                          <div
                            className={`card-modern h-full p-6 cursor-pointer border-2 transition-all ${
                              selectedQuote === quote
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-orange-300"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedQuote(quote);
                            }}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="p-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500">
                                <TransportIcon className="w-8 h-8 text-white" />
                              </div>
                              {selectedQuote === quote && (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                              {quote.transport_mode_name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {quote.carrier}
                            </p>
                            <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-4">
                              ${parseFloat(quote.total).toFixed(2)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                              <Clock className="w-4 h-4" />
                              {quote.transit_days[0]}-{quote.transit_days[1]}{" "}
                              days
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Click to see details
                            </div>
                          </div>
                        </div>

                        {/* Back */}
                        <div
                          className="absolute inset-0"
                          style={{
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                            display: isFlipped ? "block" : "none",
                          }}
                        >
                          <div className="card-modern h-full p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">
                              Details
                            </h3>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Base Rate:
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  ${parseFloat(quote.base_rate).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Service Fee:
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  $
                                  {parseFloat(quote.service_fee || 0).toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Insurance:
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  ${parseFloat(quote.insurance || 0).toFixed(2)}
                                </span>
                              </div>
                              <div className="pt-3 border-t-2 border-orange-200 dark:border-orange-800">
                                <div className="flex justify-between">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    Total:
                                  </span>
                                  <span className="text-xl font-black text-orange-600 dark:text-orange-400">
                                    ${parseFloat(quote.total).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Select Button */}
          {quotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <motion.button
                onClick={handleSelectShipping}
                disabled={!selectedQuote}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-lg flex items-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
              >
                {selectedQuote ? (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    Continue with Selected Shipping
                    <ArrowRight className="w-6 h-6" />
                  </>
                ) : (
                  "Please select a shipping method"
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
