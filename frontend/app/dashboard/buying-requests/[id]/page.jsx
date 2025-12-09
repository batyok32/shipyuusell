"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { buyingAPI } from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShoppingCart,
  Package,
  Calendar,
  MapPin,
  DollarSign,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Copy,
  FileText,
  Box,
  PackageCheck,
  ArrowRight,
  Info,
  ExternalLink,
  Mail,
  Phone,
  Truck,
  Receipt,
  CreditCard,
  Link as LinkIcon,
  Image as ImageIcon,
  Eye,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  quoted: {
    label: "Quoted",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  quote_approved: {
    label: "Quote Approved",
    icon: CheckCircle,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  payment_pending: {
    label: "Payment Pending",
    icon: Clock,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  payment_received: {
    label: "Payment Received",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  purchasing: {
    label: "Purchasing",
    icon: ShoppingCart,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  purchased: {
    label: "Purchased",
    icon: ShoppingCart,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  in_transit_to_warehouse: {
    label: "In Transit to Warehouse",
    icon: Truck,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  received_at_warehouse: {
    label: "Received at Warehouse",
    icon: Package,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  ready_to_ship: {
    label: "Ready to Ship",
    icon: Box,
    color: "text-orange-600",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  shipped: {
    label: "Shipped",
    icon: Truck,
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  in_transit: {
    label: "In Transit",
    icon: Truck,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
};

export default function BuyingRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id;
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (requestId) {
      fetchRequest();
    }
  }, [requestId]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await buyingAPI.getRequest(requestId);
      setRequest(response.data);
    } catch (error) {
      console.error("Error fetching buying request:", error);
      toast.error("Failed to load buying request details");
      router.push("/dashboard/buying-requests");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRequest();
    setRefreshing(false);
    toast.success("Refreshed");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  const status = statusConfig[request.status] || statusConfig.pending;
  const StatusIcon = status.icon || Clock;
  const quotes = request.quotes || [];
  const approvedQuote = quotes.find(
    (q) => q.is_approved || q.status === "approved"
  );
  const packageInfo = request.package;
  const shipmentInfo = request.shipment_tracking;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex items-center gap-4 mb-4">
              <Link
                href="/dashboard/buying-requests"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Buy & Ship Request Details
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Request #{request.id}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${status.bgColor} ${status.color}`}
              >
                <StatusIcon className="w-4 h-4" />
                {status.label}
              </span>
              {request.reference_number && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Ref: {request.reference_number}
                </span>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Product Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Product Information
                </h2>
                <div className="space-y-4">
                  {request.product_image && (
                    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={request.product_image}
                        alt={request.product_name || "Product"}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Product Name
                    </label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {request.product_name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Description
                    </label>
                    <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
                      {request.product_description}
                    </p>
                  </div>
                  {request.product_url && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Product URL
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <a
                          href={request.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                        >
                          <LinkIcon className="w-4 h-4" />
                          Open Link
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {request.max_budget && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Maximum Budget
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1">
                        ${parseFloat(request.max_budget).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Shipping Address */}
              {request.shipping_address && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Shipping Address
                  </h2>
                  <div className="space-y-2">
                    <p className="text-gray-900 dark:text-white">
                      {request.shipping_address.full_name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {request.shipping_address.street_address}
                    </p>
                    {request.shipping_address.street_address_2 && (
                      <p className="text-gray-600 dark:text-gray-400">
                        {request.shipping_address.street_address_2}
                      </p>
                    )}
                    <p className="text-gray-600 dark:text-gray-400">
                      {request.shipping_address.city},{" "}
                      {request.shipping_address.state_province}{" "}
                      {request.shipping_address.postal_code}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {request.shipping_address.country}
                    </p>
                    {request.shipping_address.phone && (
                      <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {request.shipping_address.phone}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Quotes */}
              {quotes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Quotes ({quotes.length})
                  </h2>
                  <div className="space-y-4">
                    {quotes.map((quote, index) => (
                      <div
                        key={quote.id}
                        className={`border rounded-lg p-4 ${
                          quote.is_approved || quote.status === "approved"
                            ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {quote.shipping_mode_name || "Shipping Option"}
                            </h3>
                            {quote.shipping_service_name && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {quote.shipping_service_name}
                              </p>
                            )}
                          </div>
                          {(quote.is_approved ||
                            quote.status === "approved") && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                              Approved
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Product Cost:
                            </span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${parseFloat(quote.product_cost || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Buying Fee ({quote.buying_service_fee_percent}%):
                            </span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              $
                              {parseFloat(
                                quote.buying_service_fee || 0
                              ).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Shipping Cost:
                            </span>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              ${parseFloat(quote.shipping_cost || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">
                              Total Cost:
                            </span>
                            <p className="font-semibold text-orange-600 dark:text-orange-400 text-lg">
                              ${parseFloat(quote.total_cost || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        {quote.estimated_delivery_days && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            Estimated Delivery: {quote.estimated_delivery_days}{" "}
                            days
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Package Information */}
              {packageInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Package Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Reference Number
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-900 dark:text-white font-mono">
                          {packageInfo.reference_number}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(packageInfo.reference_number)
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 capitalize">
                        {packageInfo.status?.replace("_", " ")}
                      </p>
                    </div>
                    {packageInfo.photos && packageInfo.photos.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          Package Photos
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {packageInfo.photos.map((photo, idx) => (
                            <div
                              key={idx}
                              className="relative w-full h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
                            >
                              <Image
                                src={photo}
                                alt={`Package photo ${idx + 1}`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Vehicle Information */}
              {request.vehicle_info && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Vehicle Information
                  </h2>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Vehicle
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 font-semibold">
                        {request.vehicle_info.year} {request.vehicle_info.make}{" "}
                        {request.vehicle_info.model}
                      </p>
                    </div>
                    {request.vehicle_info.vin && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          VIN
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1 font-mono text-sm">
                          {request.vehicle_info.vin}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Type
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 capitalize">
                        {request.vehicle_info.vehicle_type?.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Shipping Method
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 capitalize">
                        {request.vehicle_info.shipping_method?.replace(
                          "_",
                          " "
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Condition
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 capitalize">
                        {request.vehicle_info.condition?.replace("_", " ")}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </label>
                      <p className="text-gray-900 dark:text-white mt-1 capitalize">
                        {request.vehicle_info.status?.replace("_", " ")}
                      </p>
                    </div>
                    <Link
                      href={`/vehicles/${request.vehicle_info.id}`}
                      className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors text-sm font-medium mt-2"
                    >
                      View Full Vehicle Details
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              )}

              {/* Shipment Tracking */}
              {shipmentInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Shipment Tracking
                  </h2>
                  <div className="space-y-3">
                    {shipmentInfo.shipment_number && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Shipment Number
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-900 dark:text-white font-mono">
                            {shipmentInfo.shipment_number}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(shipmentInfo.shipment_number)
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    )}
                    {shipmentInfo.tracking_number && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Tracking Number
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-gray-900 dark:text-white font-mono">
                            {shipmentInfo.tracking_number}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(shipmentInfo.tracking_number)
                            }
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <Copy className="w-4 h-4 text-gray-500" />
                          </button>
                          <Link
                            href={`/track/${shipmentInfo.tracking_number}`}
                            className="text-orange-600 dark:text-orange-400 hover:underline text-sm flex items-center gap-1"
                          >
                            Track
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    )}
                    {shipmentInfo.status && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1 capitalize">
                          {shipmentInfo.status?.replace("_", " ")}
                        </p>
                      </div>
                    )}
                    {shipmentInfo.carrier && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Carrier
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1">
                          {shipmentInfo.carrier}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Request Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Request Details
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Request ID
                    </label>
                    <p className="text-gray-900 dark:text-white mt-1 font-mono">
                      #{request.id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Created At
                    </label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Updated
                    </label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {new Date(request.updated_at).toLocaleString()}
                    </p>
                  </div>
                  {request.reference_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Reference Number
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-gray-900 dark:text-white font-mono text-sm">
                          {request.reference_number}
                        </p>
                        <button
                          onClick={() =>
                            copyToClipboard(request.reference_number)
                          }
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Purchase Details */}
              {(request.purchase_receipt ||
                request.purchase_tracking ||
                request.purchase_date) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Purchase Details
                  </h2>
                  <div className="space-y-3">
                    {request.purchase_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Purchase Date
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1">
                          {new Date(request.purchase_date).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.purchase_tracking && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Purchase Tracking
                        </label>
                        <p className="text-gray-900 dark:text-white mt-1 font-mono text-sm">
                          {request.purchase_tracking}
                        </p>
                      </div>
                    )}
                    {request.purchase_receipt && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Receipt
                        </label>
                        <a
                          href={request.purchase_receipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 dark:text-orange-400 hover:underline text-sm flex items-center gap-1 mt-1"
                        >
                          View Receipt
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Notes */}
              {request.notes && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Notes
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {request.notes}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
