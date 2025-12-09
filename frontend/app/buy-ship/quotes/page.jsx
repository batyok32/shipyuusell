"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { buyingAPI } from "@/lib/api";
import toast from "react-hot-toast";
import {
  ShoppingCart,
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowLeft,
  DollarSign,
  Package,
  CreditCard,
  Search,
  Filter,
  Calendar,
  MapPin,
} from "lucide-react";

function QuotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const requestId = searchParams.get("request_id");
  const quoteId = searchParams.get("quote_id");

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    if (requestId) {
      // If request_id is provided, show quotes for that specific request
      fetchQuotesForRequest(requestId);
    } else {
      // Otherwise, show all quotes
      fetchAllQuotes();
    }
  }, [requestId, statusFilter, searchQuery, sortBy]);

  const fetchQuotesForRequest = async () => {
    setLoading(true);
    try {
      const response = await buyingAPI.getQuotes(requestId);
      setQuotes(response.data || []);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllQuotes = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const response = await buyingAPI.getAllQuotes(params);
      let quotesData = response.data || [];

      // Apply sorting
      if (sortBy === "newest") {
        quotesData = [...quotesData].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      } else if (sortBy === "oldest") {
        quotesData = [...quotesData].sort(
          (a, b) => new Date(a.created_at) - new Date(b.created_at)
        );
      } else if (sortBy === "price_low") {
        quotesData = [...quotesData].sort(
          (a, b) => parseFloat(a.total_cost) - parseFloat(b.total_cost)
        );
      } else if (sortBy === "price_high") {
        quotesData = [...quotesData].sort(
          (a, b) => parseFloat(b.total_cost) - parseFloat(a.total_cost)
        );
      }

      setQuotes(quotesData);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Failed to load quotes");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuote = async (quote) => {
    setApproving(true);
    try {
      const response = await buyingAPI.approveQuote(quote.id);
      if (response.data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
      } else {
        toast.error("Failed to create payment session");
      }
    } catch (error) {
      console.error("Error approving quote:", error);
      toast.error(error.response?.data?.error || "Failed to approve quote");
    } finally {
      setApproving(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      approved:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      expired:
        "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return colors[status] || colors.pending;
  };

  const formatStatus = (status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && quotes.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600">Loading quotes...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-4xl md:text-5xl font-black mb-2">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                {requestId ? "Available Quotes" : "All Buy & Ship Quotes"}
              </span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {requestId
                ? "View quotes for this request"
                : "Manage all your buy and ship quotes in one place"}
            </p>
          </motion.div>

          {/* Filters and Search */}
          {!requestId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6 flex flex-col md:flex-row gap-4"
            >
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by product name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-4 pr-8 py-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-orange-500 focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>
            </motion.div>
          )}

          {/* Quotes Grid */}
          {quotes.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quotes.map((quote, index) => (
                <motion.div
                  key={quote.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`card-modern p-6 bg-white dark:bg-gray-800 border-2 ${
                    quote.status === "approved"
                      ? "border-green-300 dark:border-green-700"
                      : "border-gray-100 dark:border-gray-700"
                  }`}
                >
                  {/* Product Info */}
                  {quote.buying_request && (
                    <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3 mb-2">
                        {quote.buying_request.product_image && (
                          <Image
                            src={quote.buying_request.product_image}
                            alt={quote.buying_request.product_name || "Product"}
                            width={50}
                            height={50}
                            className="rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {quote.buying_request.product_name || "Product"}
                          </h3>
                          {quote.buying_request.reference_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {quote.buying_request.reference_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quote Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Truck className="w-5 h-5 text-orange-500" />
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                          {quote.shipping_mode_name || "Standard Shipping"}
                        </h3>
                      </div>
                      {quote.shipping_service_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {quote.shipping_service_name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        quote.status
                      )}`}
                    >
                      {formatStatus(quote.status)}
                    </span>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="space-y-2 mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Product Cost:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(quote.product_cost).toFixed(2)}
                      </span>
                    </div>
                    {quote.sales_tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Sales Tax:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${parseFloat(quote.sales_tax).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        Buying Fee ({quote.buying_service_fee_percent}%):
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(quote.buying_service_fee).toFixed(2)}
                      </span>
                    </div>
                    {quote.domestic_shipping_cost > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Domestic Shipping:
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${parseFloat(quote.domestic_shipping_cost).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        International Shipping:
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${parseFloat(quote.shipping_cost).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="font-bold text-gray-900 dark:text-white">
                          Total:
                        </span>
                        <span className="font-black text-xl text-orange-600 dark:text-orange-400">
                          ${parseFloat(quote.total_cost).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="mb-4 space-y-2">
                    {quote.estimated_delivery_days && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        Estimated delivery: {quote.estimated_delivery_days} days
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <Calendar className="w-3 h-3" />
                      Created: {formatDate(quote.created_at)}
                    </div>
                  </div>

                  {/* Action Button */}
                  {quote.status === "pending" ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleApproveQuote(quote)}
                      disabled={approving}
                      className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          Approve & Pay
                        </>
                      )}
                    </motion.button>
                  ) : quote.status === "approved" ? (
                    <div className="w-full px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-xl font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Approved
                    </div>
                  ) : (
                    <div className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold flex items-center justify-center gap-2">
                      <XCircle className="w-5 h-5" />
                      {formatStatus(quote.status)}
                    </div>
                  )}

                  {/* View Request Link */}
                  {quote.buying_request && (
                    <Link
                      href={`/buy-ship/quotes?request_id=${quote.buying_request.id}`}
                      className="mt-3 block text-center text-sm text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      View All Quotes for This Request
                    </Link>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <ShoppingCart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {requestId ? "No quotes available yet" : "No quotes found"}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {requestId
                  ? "Please wait for an agent to create quotes for your request."
                  : "Create a buying request to get quotes, or adjust your filters."}
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function QuotesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      }
    >
      <QuotesContent />
    </Suspense>
  );
}
