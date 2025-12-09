"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { buyingAPI } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShoppingCart,
  Package,
  Calendar,
  MapPin,
  DollarSign,
  ArrowRight,
  Loader2,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  Eye,
  Truck,
  Box,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig = {
  pending: {
    label: "Pending",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    icon: Clock,
  },
  quoted: {
    label: "Quoted",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    icon: FileText,
  },
  quote_approved: {
    label: "Quote Approved",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    borderColor: "border-indigo-300 dark:border-indigo-700",
    icon: CheckCircle,
  },
  payment_received: {
    label: "Payment Received",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    icon: CheckCircle,
  },
  purchased: {
    label: "Purchased",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-300 dark:border-purple-700",
    icon: ShoppingCart,
  },
  received_at_warehouse: {
    label: "Received at Warehouse",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-300 dark:border-cyan-700",
    icon: Package,
  },
  ready_to_ship: {
    label: "Ready to Ship",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-700",
    icon: Box,
  },
  shipped: {
    label: "Shipped",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    borderColor: "border-pink-300 dark:border-pink-700",
    icon: Truck,
  },
  in_transit: {
    label: "In Transit",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
    icon: XCircle,
  },
};

export default function BuyingRequestsPage() {
  const router = useRouter();
  const [buyingRequests, setBuyingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchBuyingRequests();
  }, []);

  const fetchBuyingRequests = async () => {
    setLoading(true);
    try {
      const response = await buyingAPI.getRequests();
      setBuyingRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching buying requests:", error);
      toast.error("Failed to load buying requests");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = buyingRequests.filter((request) => {
    const matchesSearch =
      request.reference_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.product_description
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.shipping_address?.city
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      request.shipping_address?.country
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || request.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Buy & Ship Requests
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage and track your buying requests
                </p>
              </div>
              <Link
                href="/buy-ship/request"
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                New Request
              </Link>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by reference, product name, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                >
                  <option value="all">All Status</option>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center"
            >
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No buying requests found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Create your first buy & ship request"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link
                  href="/buy-ship/request"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Request
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request, index) => {
                const status =
                  statusConfig[request.status] || statusConfig.pending;
                const StatusIcon = status.icon || Clock;
                const quotesCount = request.quotes?.length || 0;
                const approvedQuote = request.quotes?.find(
                  (q) => q.is_approved
                );

                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`/dashboard/buying-requests/${request.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Product Info */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg flex items-center justify-center">
                              <ShoppingCart className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                  {request.product_name || "Product Request"}
                                </h3>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}
                                >
                                  <StatusIcon className="w-3 h-3" />
                                  {status.label}
                                </span>
                              </div>
                              {request.product_description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                                  {request.product_description}
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                {request.reference_number && (
                                  <span className="flex items-center gap-1">
                                    <FileText className="w-4 h-4" />
                                    {request.reference_number}
                                  </span>
                                )}
                                {request.shipping_address && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {request.shipping_address.city},{" "}
                                    {request.shipping_address.country}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(
                                    request.created_at
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quotes & Actions */}
                        <div className="flex flex-col sm:items-end gap-2">
                          {quotesCount > 0 && (
                            <div className="text-right">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {quotesCount} Quote
                                {quotesCount !== 1 ? "s" : ""}
                              </span>
                              {approvedQuote && (
                                <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                  $
                                  {parseFloat(
                                    approvedQuote.total_cost || 0
                                  ).toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                            <span className="text-sm font-medium">
                              View Details
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
