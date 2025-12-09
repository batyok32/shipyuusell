"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShipmentById } from "@/store/slices/shipmentsSlice";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { api } from "@/lib/api";
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  DollarSign,
  Download,
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
  Printer,
  ExternalLink,
  Mail,
  Phone,
  CalendarDays,
  X,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";

const statusConfig = {
  quote_requested: {
    label: "Quote Requested",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  quote_approved: {
    label: "Quote Approved",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
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
  label_generating: {
    label: "Generating Label",
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  processing: {
    label: "Processing",
    icon: PackageCheck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  dispatched: {
    label: "Dispatched",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  in_transit: {
    label: "In Transit",
    icon: Truck,
    color: "text-cyan-600",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  customs_clearance: {
    label: "Customs Clearance",
    icon: FileText,
    color: "text-amber-600",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: Truck,
    color: "text-pink-600",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
  },
  delivered: {
    label: "Delivered",
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

export default function ShipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params.id;
  const dispatch = useAppDispatch();
  const { selectedShipment, loading } = useAppSelector(
    (state) => state.shipments
  );
  const { isAuthenticated, loading: authLoading } = useAppSelector(
    (state) => state.auth
  );

  const [pickupRequest, setPickupRequest] = useState(null);
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");
  const [labelError, setLabelError] = useState(null);
  const [labelGenerating, setLabelGenerating] = useState(false);
  const [warehouseAddress, setWarehouseAddress] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
      return;
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated && shipmentId) {
      dispatch(fetchShipmentById(shipmentId));
    }
  }, [dispatch, isAuthenticated, shipmentId]);

  useEffect(() => {
    if (selectedShipment) {
      fetchPickupRequest();
      fetchWarehouseAddress();
    }
  }, [selectedShipment]);

  const fetchPickupRequest = async () => {
    if (!selectedShipment?.pickup_request_id) return;
    setLoadingPickup(true);
    try {
      const response = await api.get(
        `/logistics/pickups/${selectedShipment.pickup_request_id}/`
      );
      setPickupRequest(response.data);
    } catch (error) {
      console.error("Failed to fetch pickup request:", error);
    } finally {
      setLoadingPickup(false);
    }
  };

  const fetchWarehouseAddress = async () => {
    try {
      const response = await api.get(
        `/logistics/warehouse/address/?category=${
          selectedShipment.shipping_category || "all"
        }`
      );
      setWarehouseAddress(response.data);
    } catch (error) {
      console.error("Failed to fetch warehouse address:", error);
    }
  };

  const generateLabel = async () => {
    // Check if payment is completed
    if (!selectedShipment?.is_paid) {
      toast.error(
        "Payment is required before generating a shipping label. Please complete payment for your quote first."
      );
      return;
    }

    // Check if label is already generating
    if (shipment?.status === "label_generating") {
      toast.error("Label generation is already in progress. Please wait.");
      return;
    }

    // Check if label already exists
    if (shipment?.easyship_label_url) {
      toast.error("Label has already been generated for this shipment.");
      return;
    }

    setLabelGenerating(true);
    setLabelError(null);
    try {
      const response = await api.post(
        `/logistics/shipments/${shipmentId}/generate-label/`,
        {}
      );
      const data = response.data;
      // Refresh shipment data to get updated status
      dispatch(fetchShipmentById(shipmentId));
      toast.success(
        "Label generation started! You'll be notified when it's ready."
      );
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Failed to generate label. Please try again.";
      setLabelError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLabelGenerating(false);
    }
  };

  const validateDateTime = (date, time) => {
    setDateError("");
    setTimeError("");

    if (!date) {
      setDateError("Please select a date");
      return false;
    }

    if (!time) {
      setTimeError("Please select a time");
      return false;
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is in the past
    if (selectedDate < today) {
      setDateError("Cannot schedule pickup in the past");
      return false;
    }

    // Check if date is today, then validate time
    if (selectedDate.toDateString() === today.toDateString()) {
      const now = new Date();
      const [hours, minutes] = time.split(":");
      const selectedDateTime = new Date();
      selectedDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (selectedDateTime < now) {
        setTimeError(
          "Cannot schedule pickup in the past. Please select a future time."
        );
        return false;
      }
    }

    return true;
  };

  const handleSchedulePickup = async () => {
    // Check if payment is completed
    if (!selectedShipment?.is_paid) {
      toast.error(
        "Payment is required before scheduling a pickup. Please complete payment for your quote first."
      );
      return;
    }

    if (!validateDateTime(scheduleDate, scheduleTime)) {
      return;
    }

    setScheduling(true);
    try {
      const response = await api.post(
        `/logistics/pickups/${selectedShipment.pickup_request_id}/schedule/`,
        {
          scheduled_date: scheduleDate,
          scheduled_time: scheduleTime,
          special_instructions: specialInstructions,
        }
      );
      toast.success("Pickup scheduled successfully!");
      setShowScheduleModal(false);
      setScheduleDate("");
      setScheduleTime("");
      setSpecialInstructions("");
      setDateError("");
      setTimeError("");
      fetchPickupRequest();
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Failed to schedule pickup";
      toast.error(errorMessage);

      // Set field-specific errors if available
      if (errorMessage.includes("past")) {
        if (errorMessage.includes("date")) {
          setDateError(errorMessage);
        } else if (errorMessage.includes("time")) {
          setTimeError(errorMessage);
        }
      }
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelPickup = async () => {
    if (!confirm("Are you sure you want to cancel this pickup?")) return;
    try {
      await api.post(
        `/logistics/pickups/${selectedShipment.pickup_request_id}/update-status/`,
        {
          status: "cancelled",
        }
      );
      toast.success("Pickup cancelled successfully");
      fetchPickupRequest();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to cancel pickup");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!selectedShipment) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Shipment not found
            </h2>
            <Link
              href="/dashboard/shipments"
              className="text-orange-600 dark:text-orange-400 hover:underline"
            >
              Back to shipments
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const statusInfo =
    statusConfig[selectedShipment.status] || statusConfig.quote_requested;
  const StatusIcon = statusInfo.icon;
  const needsPickup = selectedShipment.pickup_cost > 0;
  const isInternational = !selectedShipment.is_local_shipping;
  const needsLabel = !needsPickup && !selectedShipment.easyship_label_url;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <Link
            href="/dashboard/shipments"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Shipments
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                  {selectedShipment.shipment_number}
                </h1>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold ${statusInfo.bgColor} ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-5 h-5" />
                    {statusInfo.label}
                  </span>
                  {selectedShipment.tracking_number && (
                    <Link
                      href={`/track/${selectedShipment.tracking_number}`}
                      className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Track Shipment
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500 uppercase mb-1">
                  Total Cost
                </div>
                <div className="text-3xl font-black text-gray-900 dark:text-white">
                  ${parseFloat(selectedShipment.total_cost).toFixed(2)}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Instructions Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-orange-500" />
                  Shipping Instructions
                </h2>

                {needsPickup ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                      <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        Pickup Required
                      </h3>
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        Your shipment requires pickup service. A YuuSell
                        representative will collect your package from the origin
                        address.
                      </p>
                    </div>

                    {pickupRequest && (
                      <div className="space-y-3">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500 mb-1">Status</div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {pickupRequest.status
                                  ?.replace("_", " ")
                                  .toUpperCase()}
                              </div>
                            </div>
                            {pickupRequest.scheduled_date && (
                              <div>
                                <div className="text-gray-500 mb-1">
                                  Scheduled
                                </div>
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {new Date(
                                    pickupRequest.scheduled_date
                                  ).toLocaleDateString()}
                                  {pickupRequest.scheduled_time && (
                                    <> at {pickupRequest.scheduled_time}</>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pickup Management Buttons */}
                        <div className="flex flex-wrap gap-3">
                          {!selectedShipment?.is_paid && (
                            <div className="w-full p-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg space-y-3">
                              <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Payment is required before scheduling a pickup.
                                Please complete payment for your quote first.
                              </p>
                              <Link
                                href={`/quote/payment?shipment_id=${selectedShipment.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                              >
                                <DollarSign className="w-4 h-4" />
                                Go to Payment
                              </Link>
                            </div>
                          )}
                          {pickupRequest.status === "pending" && (
                            <button
                              onClick={() => setShowScheduleModal(true)}
                              disabled={!selectedShipment?.is_paid}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CalendarDays className="w-5 h-5" />
                              Schedule Pickup
                            </button>
                          )}
                          {pickupRequest.status === "scheduled" && (
                            <>
                              <button
                                onClick={() => setShowScheduleModal(true)}
                                disabled={!selectedShipment?.is_paid}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Edit className="w-5 h-5" />
                                Reschedule
                              </button>
                              <button
                                onClick={handleCancelPickup}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                              >
                                <X className="w-5 h-5" />
                                Cancel Pickup
                              </button>
                            </>
                          )}
                          {pickupRequest.contact_phone && (
                            <a
                              href={`tel:${pickupRequest.contact_phone}`}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                              <Phone className="w-5 h-5" />
                              Contact
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {isInternational && warehouseAddress && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl">
                        <h3 className="font-bold text-yellow-900 dark:text-yellow-100 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Two-Step Shipping Process
                        </h3>
                        <ol className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200 list-decimal list-inside">
                          <li>
                            Print and attach the shipping label to your package
                          </li>
                          <li>
                            Drop off your package at the nearest carrier
                            location (e.g., USPS, UPS, FedEx)
                          </li>
                          <li>
                            The carrier will deliver your package to our
                            warehouse
                          </li>
                          <li>
                            Once received, we'll process and ship it to your
                            destination
                          </li>
                        </ol>
                      </div>
                    )}

                    {!isInternational && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl">
                        <h3 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Direct Shipping
                        </h3>
                        <p className="text-sm text-green-800 dark:text-green-200">
                          Your package will be shipped directly from origin to
                          destination using the selected carrier service.
                        </p>
                      </div>
                    )}

                    {/* Label Section */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Download className="w-5 h-5 text-orange-500" />
                        Shipping Label
                      </h3>

                      {selectedShipment.easyship_label_url ? (
                        <div className="space-y-3">
                          <a
                            href={selectedShipment.easyship_label_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                          >
                            <Download className="w-5 h-5" />
                            Download Label
                          </a>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <strong>How to use your label:</strong>
                            <ol className="list-decimal list-inside mt-2 space-y-1">
                              <li>
                                Print the label on a standard 8.5" x 11" paper
                              </li>
                              <li>Cut along the dotted lines if needed</li>
                              <li>
                                Securely tape the label to the top of your
                                package
                              </li>
                              <li>
                                Ensure the barcode is clearly visible and not
                                covered
                              </li>
                              <li>
                                Drop off at the carrier location specified in
                                the label
                              </li>
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {!selectedShipment?.is_paid && (
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg space-y-3">
                              <p className="text-sm text-orange-800 dark:text-orange-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Payment is required before generating a shipping
                                label. Please complete payment for your quote
                                first.
                              </p>
                              <Link
                                href={`/quote/payment?shipment_id=${selectedShipment.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                              >
                                <DollarSign className="w-4 h-4" />
                                Go to Payment
                              </Link>
                            </div>
                          )}
                          {labelError ? (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-sm text-red-800 dark:text-red-200 mb-2">
                                {labelError}
                              </p>
                              <button
                                onClick={generateLabel}
                                disabled={
                                  !selectedShipment?.is_paid ||
                                  labelGenerating ||
                                  shipment?.status === "label_generating"
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {labelGenerating ||
                                shipment?.status === "label_generating" ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-4 h-4" />
                                    Retry Label Generation
                                  </>
                                )}
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Your shipping label will be generated shortly.
                                If it's not ready yet, you can generate it
                                manually.
                              </p>
                              <button
                                onClick={generateLabel}
                                disabled={
                                  !selectedShipment?.is_paid ||
                                  labelGenerating ||
                                  shipment?.status === "label_generating"
                                }
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {labelGenerating ||
                                shipment?.status === "label_generating" ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {shipment?.status === "label_generating"
                                      ? "Generating Label..."
                                      : "Generating Label..."}
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-5 h-5" />
                                    Generate Label
                                  </>
                                )}
                              </button>
                              {shipment?.status === "label_generating" && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                  Label generation is in progress. You'll be
                                  notified when it's ready.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Warehouse Address for International Shipments */}
                    {isInternational && warehouseAddress && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                        <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                          <Box className="w-5 h-5" />
                          Warehouse Address
                        </h3>
                        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <div className="font-bold">
                            {warehouseAddress.full_name}
                          </div>
                          {warehouseAddress.company && (
                            <div>{warehouseAddress.company}</div>
                          )}
                          <div>{warehouseAddress.street_address}</div>
                          {warehouseAddress.street_address_2 && (
                            <div>{warehouseAddress.street_address_2}</div>
                          )}
                          <div>
                            {warehouseAddress.city},{" "}
                            {warehouseAddress.state_province}{" "}
                            {warehouseAddress.postal_code}
                          </div>
                          <div>{warehouseAddress.country}</div>
                          {warehouseAddress.phone && (
                            <div className="mt-2">
                              Phone: {warehouseAddress.phone}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              `${warehouseAddress.full_name}\n${
                                warehouseAddress.company || ""
                              }\n${warehouseAddress.street_address}\n${
                                warehouseAddress.city
                              }, ${warehouseAddress.state_province} ${
                                warehouseAddress.postal_code
                              }\n${warehouseAddress.country}`
                            )
                          }
                          className="mt-3 flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Address
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Shipment Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
              >
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                  Shipment Details
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      Origin Address
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {selectedShipment.origin_address?.full_name}
                      </div>
                      <div>
                        {selectedShipment.origin_address?.street_address}
                      </div>
                      {selectedShipment.origin_address?.street_address_2 && (
                        <div>
                          {selectedShipment.origin_address.street_address_2}
                        </div>
                      )}
                      <div>
                        {selectedShipment.origin_address?.city},{" "}
                        {selectedShipment.origin_address?.state_province}{" "}
                        {selectedShipment.origin_address?.postal_code}
                      </div>
                      <div>{selectedShipment.origin_address?.country}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-500" />
                      Destination Address
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {selectedShipment.destination_address?.full_name}
                      </div>
                      <div>
                        {selectedShipment.destination_address?.street_address}
                      </div>
                      {selectedShipment.destination_address
                        ?.street_address_2 && (
                        <div>
                          {
                            selectedShipment.destination_address
                              .street_address_2
                          }
                        </div>
                      )}
                      <div>
                        {selectedShipment.destination_address?.city},{" "}
                        {selectedShipment.destination_address?.state_province}{" "}
                        {selectedShipment.destination_address?.postal_code}
                      </div>
                      <div>{selectedShipment.destination_address?.country}</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Tracking Updates */}
              {selectedShipment.tracking_updates &&
                selectedShipment.tracking_updates.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
                  >
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Truck className="w-6 h-6 text-orange-500" />
                      Tracking History
                    </h2>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>

                      {/* Tracking updates */}
                      <div className="space-y-6">
                        {selectedShipment.tracking_updates
                          .slice()
                          .reverse()
                          .map((update, index) => {
                            const isLast =
                              index ===
                              selectedShipment.tracking_updates.length - 1;
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
                              statusColors[update.status] || "bg-gray-500";

                            return (
                              <div key={update.id} className="relative pl-12">
                                {/* Timeline dot */}
                                <div
                                  className={`absolute left-0 top-1 w-8 h-8 rounded-full ${dotColor} border-4 border-white dark:border-gray-800 shadow-lg flex items-center justify-center`}
                                >
                                  <div className="w-2 h-2 rounded-full bg-white"></div>
                                </div>

                                {/* Update content */}
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-gray-900 dark:text-white capitalize">
                                      {update.status.replace(/_/g, " ")}
                                    </h3>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        update.timestamp
                                      ).toLocaleString()}
                                    </span>
                                  </div>

                                  {update.location && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      <MapPin className="w-4 h-4" />
                                      {update.location}
                                    </div>
                                  )}

                                  {update.raw_data?.status_message && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {update.raw_data.status_message}
                                    </p>
                                  )}

                                  {update.raw_data?.worker && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      Worker: {update.raw_data.worker}
                                    </p>
                                  )}

                                  {update.raw_data?.scheduled_datetime && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      Scheduled:{" "}
                                      {new Date(
                                        update.raw_data.scheduled_datetime
                                      ).toLocaleString()}
                                    </p>
                                  )}

                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400">
                                      {update.source === "webhook"
                                        ? "🤖 System"
                                        : "👤 Manual"}
                                    </span>
                                    {update.carrier_tracking_number && (
                                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                                        {update.carrier_tracking_number}
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
                )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">
                  Quick Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Weight
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {parseFloat(selectedShipment.actual_weight).toFixed(1)} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Shipping Category
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedShipment.shipping_category
                        ?.replace("_", " ")
                        .toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Transport Mode
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedShipment.transport_mode?.name || "N/A"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Created
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {new Date(
                        selectedShipment.created_at
                      ).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedShipment.estimated_delivery && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        Estimated Delivery
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {new Date(
                          selectedShipment.estimated_delivery
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Cost Breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700"
              >
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">
                  Cost Breakdown
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Shipping
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      $
                      {parseFloat(selectedShipment.shipping_cost || 0).toFixed(
                        2
                      )}
                    </span>
                  </div>
                  {selectedShipment.pickup_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Pickup
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ${parseFloat(selectedShipment.pickup_cost).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedShipment.insurance_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Insurance
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        $
                        {parseFloat(selectedShipment.insurance_cost).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {selectedShipment.service_fee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Service Fee
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        ${parseFloat(selectedShipment.service_fee).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">
                      Total
                    </span>
                    <span className="font-black text-orange-600 dark:text-orange-400 text-lg">
                      ${parseFloat(selectedShipment.total_cost).toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Pickup Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full border-2 border-gray-200 dark:border-gray-700 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-orange-500" />
                  Schedule Pickup
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Choose a convenient date and time for package collection
                </p>
              </div>
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleDate("");
                  setScheduleTime("");
                  setSpecialInstructions("");
                  setDateError("");
                  setTimeError("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Pickup Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => {
                    setScheduleDate(e.target.value);
                    setDateError("");
                  }}
                  min={new Date().toISOString().split("T")[0]}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                    dateError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 dark:border-gray-600 focus:ring-orange-500"
                  }`}
                />
                {dateError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {dateError}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a date for pickup (today or later)
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Pickup Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => {
                    setScheduleTime(e.target.value);
                    setTimeError("");
                  }}
                  min={
                    scheduleDate === new Date().toISOString().split("T")[0]
                      ? new Date().toTimeString().slice(0, 5)
                      : undefined
                  }
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 transition-all ${
                    timeError
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-200 dark:border-gray-600 focus:ring-orange-500"
                  }`}
                />
                {timeError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {timeError}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select a time for pickup (business hours: 9:00 AM - 6:00 PM)
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Special Instructions{" "}
                  <span className="text-gray-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="e.g., Gate code, apartment number, call before arrival, etc."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Help our driver locate your pickup address
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSchedulePickup}
                  disabled={scheduling || !scheduleDate || !scheduleTime}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {scheduling ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scheduling...
                    </span>
                  ) : (
                    "Schedule"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </>
  );
}
