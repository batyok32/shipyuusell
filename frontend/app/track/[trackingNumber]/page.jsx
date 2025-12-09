"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  PackageSearch,
  MapPin,
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Package,
  Plane,
  Ship,
  Train,
  Car,
  Globe,
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig = {
  quote_requested: {
    label: "Quote Requested",
    icon: Clock,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  quote_approved: {
    label: "Quote Approved",
    icon: CheckCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  payment_pending: {
    label: "Payment Pending",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  payment_received: {
    label: "Payment Received",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  processing: {
    label: "Processing",
    icon: Package,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  dispatched: {
    label: "Dispatched",
    icon: Truck,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  in_transit: {
    label: "In Transit",
    icon: Truck,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  customs_clearance: {
    label: "Customs Clearance",
    icon: Globe,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: Truck,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
};

const transportModeIcons = {
  air: Plane,
  sea: Ship,
  rail: Train,
  road: Car,
  truck: Car,
};

export default function TrackingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const trackingNumber = params.trackingNumber || "";
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (trackingNumber) {
      fetchTrackingData(trackingNumber);
    }
  }, [trackingNumber]);

  const fetchTrackingData = async (trackNumber) => {
    setLoading(true);
    setError(null);
    try {
      // Use a public API call (no auth required for tracking)
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/track/${encodeURIComponent(trackNumber)}/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("Error response data:", data);

        throw new Error(data.error || "Failed to fetch tracking information");
      }
      console.log("Tracking Data:", trackingData);

      setTrackingData(data);
    } catch (err) {
      const errorMessage =
        err.message ||
        "Failed to fetch tracking information. Please check your tracking number.";
      setError(errorMessage);
      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        toast.error("Tracking number not found");
      } else {
        toast.error("Failed to load tracking information");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTrackingNumber = formData.get("trackingNumber");
    if (newTrackingNumber) {
      router.push(`/track/${encodeURIComponent(newTrackingNumber)}`);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading tracking information...
            </p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 mb-8"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Home
              </motion.button>
            </Link>
            <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-red-100 dark:border-red-900 text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Tracking Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
              <form onSubmit={handleSearch} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="trackingNumber"
                    placeholder="Enter tracking number"
                    className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                    defaultValue={trackingNumber}
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-bold"
                  >
                    Search
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!trackingData) {
    return null;
  }

  const shipment = trackingData.shipment || trackingData;
  const statusInfo = statusConfig[shipment.status] || statusConfig.in_transit;
  const StatusIcon = statusInfo.icon;
  const TransportIcon =
    transportModeIcons[shipment.transport_mode?.code?.toLowerCase()] || Truck;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-500 mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </motion.button>
          </Link>

          {/* Tracking Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 mb-8"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                  Track Package
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Tracking Number:{" "}
                  <span className="font-bold">{trackingNumber}</span>
                </p>
              </div>
              <div
                className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl ${statusInfo.bgColor}`}
              >
                <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
                <span className={`font-bold ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Shipment Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                Origin
              </h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-400">
                {shipment.origin_address ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {shipment.origin_address.country}
                    </p>
                    {shipment.origin_address.city && (
                      <p>{shipment.origin_address.city}</p>
                    )}
                  </>
                ) : (
                  <p>Warehouse Location</p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-500" />
                Destination
              </h3>
              <div className="space-y-2 text-gray-600 dark:text-gray-400">
                {shipment.destination_address ? (
                  <>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {shipment.destination_address.country}
                    </p>
                    {shipment.destination_address.city && (
                      <p>{shipment.destination_address.city}</p>
                    )}
                  </>
                ) : (
                  <p>Not available</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Shipment Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 mb-8"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Shipment Details
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Shipment Number
                </p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {shipment.shipment_number || trackingNumber}
                </p>
              </div>
              {shipment.carrier && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Carrier
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {shipment.carrier}
                  </p>
                </div>
              )}
              {shipment.transport_mode && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Transport Mode
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TransportIcon className="w-4 h-4" />
                    {shipment.transport_mode.name || "N/A"}
                  </p>
                </div>
              )}
              {shipment.weight && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Weight
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {shipment.weight} kg
                  </p>
                </div>
              )}
              {shipment.estimated_delivery && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Estimated Delivery
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(shipment.estimated_delivery).toLocaleDateString()}
                  </p>
                </div>
              )}
              {shipment.actual_delivery && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Delivered On
                  </p>
                  <p className="font-semibold text-green-500 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {new Date(shipment.actual_delivery).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tracking Timeline */}
          {(trackingData.tracking_updates &&
            trackingData.tracking_updates.length > 0) ||
          (trackingData.tracking && trackingData.tracking.length > 0) ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                Tracking History
              </h3>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

                <div className="space-y-6">
                  {/* Use tracking_updates if available, otherwise fall back to tracking */}
                  {(trackingData.tracking_updates &&
                  trackingData.tracking_updates.length > 0
                    ? trackingData.tracking_updates
                    : trackingData.tracking || []
                  )
                    .slice()
                    .reverse()
                    .map((event, index) => {
                      const statusColors = {
                        pickup_scheduled: "bg-blue-500",
                        pickup_rescheduled: "bg-orange-500",
                        scheduled: "bg-blue-500",
                        in_progress: "bg-orange-500",
                        completed: "bg-green-500",
                        picked_up: "bg-green-500",
                        warehouse_received: "bg-green-500",
                        processing: "bg-purple-500",
                        in_transit: "bg-blue-500",
                        delivered: "bg-green-500",
                        cancelled: "bg-red-500",
                        failed: "bg-red-500",
                      };
                      const dotColor =
                        statusColors[event.status] || "bg-orange-500";

                      return (
                        <div key={event.id || index} className="relative pl-12">
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-0 top-1 w-8 h-8 rounded-full ${dotColor} border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center`}
                          >
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                          </div>

                          {/* Update content */}
                          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                            <div className="flex items-start justify-between mb-2">
                              <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                {event.status?.replace(/_/g, " ") ||
                                  event.description ||
                                  "Update"}
                              </p>
                              {event.timestamp && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(event.timestamp).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}

                            {event.raw_data?.status_message && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {event.raw_data.status_message}
                              </p>
                            )}

                            {event.raw_data?.worker && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Worker: {event.raw_data.worker}
                              </p>
                            )}

                            {event.raw_data?.scheduled_datetime && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                Scheduled:{" "}
                                {new Date(
                                  event.raw_data.scheduled_datetime
                                ).toLocaleString()}
                              </p>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              {event.source && (
                                <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                                  {event.source === "webhook"
                                    ? "🤖 System"
                                    : "👤 Manual"}
                                </span>
                              )}
                              {event.carrier_tracking_number && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                  {event.carrier_tracking_number}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>
      <Footer />
    </>
  );
}
