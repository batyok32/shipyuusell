"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShipments } from "@/store/slices/shipmentsSlice";
import { buyingAPI } from "@/lib/api";
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight,
  MapPin,
  TrendingUp,
  DollarSign,
  Calendar,
  Eye,
  PackageSearch,
  ShoppingCart,
  Boxes,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { shipments, loading: shipmentsLoading } = useAppSelector(
    (state) => state.shipments
  );
  const {
    user,
    isAuthenticated,
    loading: authLoading,
  } = useAppSelector((state) => state.auth);

  const [buyingRequests, setBuyingRequests] = useState([]);
  const [loadingBuyingRequests, setLoadingBuyingRequests] = useState(false);

  // Protect route - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchShipments());
      fetchBuyingRequests();
    }
  }, [dispatch, isAuthenticated]);

  const fetchBuyingRequests = async () => {
    setLoadingBuyingRequests(true);
    try {
      const response = await buyingAPI.getDashboard();
      setBuyingRequests(response.data || []);
    } catch (error) {
      console.error("Error fetching buying requests:", error);
      toast.error("Failed to load buying requests");
    } finally {
      setLoadingBuyingRequests(false);
    }
  };

  const isLoading = shipmentsLoading;

  // Show loading or nothing while checking authentication
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: "In Transit",
      value: shipments?.filter((s) => s.status === "in_transit").length || 0,
      icon: Truck,
      color: "from-purple-500 to-pink-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600 dark:text-purple-400",
      image:
        "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&h=300&fit=crop",
    },
    {
      label: "Delivered",
      value: shipments?.filter((s) => s.status === "delivered").length || 0,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      textColor: "text-green-600 dark:text-green-400",
      image:
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop",
    },
    {
      label: "Pending",
      value:
        shipments?.filter(
          (s) =>
            s.status === "pending" ||
            s.status === "payment_pending" ||
            s.status === "processing"
        ).length || 0,
      icon: Clock,
      color: "from-orange-500 to-red-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      textColor: "text-orange-600 dark:text-orange-400",
      image:
        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop",
    },
  ];

  const quickActions = [
    {
      title: "Get Quote",
      description: "Calculate shipping costs instantly",
      icon: TrendingUp,
      href: "/quote",
      gradient: "from-blue-500 to-purple-500",
      image:
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop",
    },
    {
      title: "Buy & Ship",
      description: "Request product purchase",
      icon: ShoppingCart,
      href: "/buy-ship",
      gradient: "from-emerald-500 to-teal-500",
      image:
        "https://images.unsplash.com/photo-1556740758-90de374c12ad?w=300&h=200&fit=crop",
    },
    {
      title: "Ship My Items",
      description: "Send packages to warehouse",
      icon: PackageSearch,
      href: "/ship",
      gradient: "from-orange-500 to-red-500",
      image:
        "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&h=200&fit=crop",
    },
  ];

  const recentShipments =
    shipments && shipments.length > 0
      ? [...shipments]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5)
      : [];

  const getStatusColor = (status) => {
    const colors = {
      pending:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      received:
        "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      in_transit:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      delivered:
        "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      processing:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      dispatched:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    return (
      colors[status] ||
      "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
    );
  };

  const formatStatus = (status) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black mb-2">
                  <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                    Welcome Back
                  </span>
                  {user?.username && (
                    <span className="text-gray-900 dark:text-white">
                      , {user.username}
                    </span>
                  )}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400">
                  Manage your shipments, packages, and logistics all in one
                  place
                </p>
              </div>
              <Link href="/quote">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="w-5 h-5" />
                  New Shipment
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700"
              >
                <div className="relative h-32 w-full">
                  <Image
                    src={stat.image}
                    alt={stat.label}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-3 right-3">
                    <div
                      className={`p-2 rounded-lg bg-white/20 backdrop-blur-md`}
                    >
                      <stat.icon className={`w-5 h-5 text-white`} />
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-3xl font-black mb-1 bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Left Column - Quick Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700"
              >
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  {quickActions.map((action, i) => (
                    <Link key={i} href={action.href}>
                      <motion.div
                        whileHover={{ x: 4, scale: 1.02 }}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                      >
                        <div
                          className={`p-2 rounded-lg bg-gradient-to-r ${action.gradient}`}
                        >
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">
                            {action.title}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {action.description}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right Column - Recent Activity */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Shipments */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Recent Shipments
                  </h3>
                  {shipments?.length > 0 && (
                    <Link
                      href="/dashboard/shipments"
                      className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
                    >
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                {isLoading && shipments?.length === 0 ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                    <p className="text-gray-500">Loading shipments...</p>
                  </div>
                ) : recentShipments.length > 0 ? (
                  <div className="space-y-3">
                    {recentShipments.map((shipment, i) => {
                      // Statuses that come after or equal to "in_transit"
                      const statusesAfterInTransit = [
                        "in_transit",
                        "customs_clearance",
                        "out_for_delivery",
                        "delivered",
                      ];

                      // If status is "in_transit" or later, go to tracking page
                      // Otherwise, go to shipment detail page
                      const href = statusesAfterInTransit.includes(
                        shipment.status
                      )
                        ? `/track/${
                            shipment.tracking_number || shipment.shipment_number
                          }`
                        : `/dashboard/shipments/${shipment.id}`;

                      return (
                        <Link key={shipment.id} href={href}>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 + i * 0.1 }}
                            whileHover={{ x: 4 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-orange-50/50 dark:from-gray-700 dark:to-orange-900/10 border-2 border-gray-100 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                  <Truck className="w-6 h-6 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {shipment.shipment_number || "N/A"}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                      shipment.status
                                    )}`}
                                  >
                                    {formatStatus(shipment.status)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  {shipment.tracking_number && (
                                    <span className="font-mono">
                                      {shipment.tracking_number.slice(0, 12)}...
                                    </span>
                                  )}
                                  {shipment.destination_address?.country && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {shipment.destination_address.country}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                {shipment.total_cost && (
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    $
                                    {parseFloat(shipment.total_cost).toFixed(2)}
                                  </div>
                                )}
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(
                                    shipment.created_at
                                  ).toLocaleDateString()}
                                </div>
                              </div>
                              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                            </div>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                      <Truck className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No shipments yet
                    </p>
                    <Link href="/quote">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold"
                      >
                        Create Your First Shipment
                      </motion.button>
                    </Link>
                  </div>
                )}
              </motion.div>

              {/* Buying Requests */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-orange-500" />
                    Buy & Ship Requests
                  </h3>
                  {buyingRequests?.length > 0 && (
                    <Link
                      href="/dashboard/buying-requests"
                      className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors flex items-center gap-1"
                    >
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  )}
                </div>
                {loadingBuyingRequests ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                    <p className="text-gray-500">Loading requests...</p>
                  </div>
                ) : buyingRequests.length > 0 ? (
                  <div className="space-y-3">
                    {buyingRequests.slice(0, 5).map((item, i) => {
                      const br = item.buying_request;
                      const quotes = item.quotes || [];
                      const approvedQuote = quotes.find(
                        (q) => q.status === "approved"
                      );
                      return (
                        <Link
                          key={br.id}
                          href={`/dashboard/buying-requests/${br.id}`}
                        >
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.1 + i * 0.1 }}
                            whileHover={{ x: 4 }}
                            className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-orange-50/50 dark:from-gray-700 dark:to-orange-900/10 border-2 border-gray-100 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="relative">
                                {br.product_image ? (
                                  <div className="w-12 h-12 rounded-xl overflow-hidden">
                                    <Image
                                      src={br.product_image}
                                      alt={br.product_name || "Product"}
                                      width={48}
                                      height={48}
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                                    <ShoppingCart className="w-6 h-6 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-gray-900 dark:text-white truncate">
                                    {br.product_name ||
                                      br.product_description?.slice(0, 30) ||
                                      "Product"}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                      br.status
                                    )}`}
                                  >
                                    {formatStatus(br.status)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                  {quotes.length > 0 && (
                                    <span>{quotes.length} Quote(s)</span>
                                  )}
                                  {approvedQuote && (
                                    <span className="text-green-600 dark:text-green-400">
                                      $
                                      {parseFloat(
                                        approvedQuote.total_cost
                                      ).toFixed(2)}
                                    </span>
                                  )}
                                  {br.reference_number && (
                                    <span className="font-mono text-xs">
                                      {br.reference_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                          </motion.div>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No buy & ship requests yet
                    </p>
                    <Link href="/buy-ship/request">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-semibold"
                      >
                        Create Your First Request
                      </motion.button>
                    </Link>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
