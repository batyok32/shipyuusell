"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShipments } from "@/store/slices/shipmentsSlice";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Truck,
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
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig = {
  quote_requested: {
    label: "Quote Requested",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-300 dark:border-yellow-700",
  },
  quote_approved: {
    label: "Quote Approved",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-700",
  },
  payment_pending: {
    label: "Payment Pending",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-700",
  },
  payment_received: {
    label: "Payment Received",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
  },
  processing: {
    label: "Processing",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    borderColor: "border-indigo-300 dark:border-indigo-700",
  },
  dispatched: {
    label: "Dispatched",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    borderColor: "border-purple-300 dark:border-purple-700",
  },
  in_transit: {
    label: "In Transit",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-300 dark:border-cyan-700",
  },
  customs_clearance: {
    label: "Customs Clearance",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    borderColor: "border-pink-300 dark:border-pink-700",
  },
  delivered: {
    label: "Delivered",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-300 dark:border-green-700",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

export default function ShipmentsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { shipments, loading } = useAppSelector((state) => state.shipments);
  const { isAuthenticated, loading: authLoading } = useAppSelector(
    (state) => state.auth
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchShipments());
    }
  }, [dispatch, isAuthenticated]);

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.shipment_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      shipment.origin_address?.country
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      shipment.destination_address?.country
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2">
                  My Shipments
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  View and manage all your shipments
                </p>
              </div>
              <Link
                href="/quote"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5" />
                New Shipment
              </Link>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by shipment number, origin, or destination..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white appearance-none"
                >
                  <option value="all">All Statuses</option>
                  {Object.keys(statusConfig).map((status) => (
                    <option key={status} value={status}>
                      {statusConfig[status].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Shipments List */}
          {filteredShipments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No shipments found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Start by creating your first shipment"}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Link
                  href="/quote"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create First Shipment
                </Link>
              )}
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {filteredShipments.map((shipment, index) => {
                const statusInfo =
                  statusConfig[shipment.status] || statusConfig.quote_requested;
                return (
                  <motion.div
                    key={shipment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/dashboard/shipments/${shipment.id}`}>
                      <div className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 transition-all cursor-pointer">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          {/* Left Side - Main Info */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                                  {shipment.shipment_number}
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(
                                    shipment.created_at
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-bold ${statusInfo.bgColor} ${statusInfo.color} ${statusInfo.borderColor} border`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              {/* Origin */}
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                                  <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                    From
                                  </div>
                                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {shipment.origin_address?.city},{" "}
                                    {shipment.origin_address?.country}
                                  </div>
                                </div>
                              </div>

                              {/* Destination */}
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                    To
                                  </div>
                                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                                    {shipment.destination_address?.city},{" "}
                                    {shipment.destination_address?.country}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Info */}
                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Package className="w-4 h-4" />
                                {parseFloat(shipment.actual_weight).toFixed(
                                  1
                                )}{" "}
                                kg
                              </div>
                              {shipment.pickup_cost > 0 && (
                                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
                                  <Truck className="w-4 h-4" />
                                  Pickup Required
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Side - Cost and Actions */}
                          <div className="flex flex-col items-end gap-3 lg:border-l-2 lg:border-gray-200 dark:lg:border-gray-700 lg:pl-6">
                            <div className="text-right">
                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                                Total Cost
                              </div>
                              <div className="text-2xl font-black text-gray-900 dark:text-white">
                                ${parseFloat(shipment.total_cost).toFixed(2)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold">
                              View Details
                              <ArrowRight className="w-5 h-5" />
                            </div>
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
