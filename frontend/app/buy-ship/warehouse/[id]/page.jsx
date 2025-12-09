"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Package,
  Camera,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";

export default function WarehouseArrivalPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [buyingRequest, setBuyingRequest] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
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
        // If package exists, get photos
        if (data.package?.photos) {
          // Photos are already in the package data
        }
      } else {
        throw new Error(data.error || "Failed to load buying request");
      }
    } catch (error) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectShipping = () => {
    router.push(`/buy-ship/shipping/${params.id}`);
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

  const photos = buyingRequest.package?.photos || [];
  const hasPhotos = photos.length > 0;

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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wider">
                Item Received
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-green-600 via-emerald-500 to-green-500 bg-clip-text text-transparent">
                Item Arrived at Warehouse!
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Your item has been received, inspected, and photographed
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Photo Carousel */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-0 overflow-hidden bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              {hasPhotos ? (
                <>
                  <div className="relative h-96 w-full bg-gray-100 dark:bg-gray-700">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPhotoIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                      >
                        <Image
                          src={photos[currentPhotoIndex]}
                          alt={`Photo ${currentPhotoIndex + 1}`}
                          fill
                          className="object-cover"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Navigation */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setCurrentPhotoIndex(
                              (prev) =>
                                (prev - 1 + photos.length) % photos.length
                            )
                          }
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-lg"
                        >
                          <ArrowLeft className="w-6 h-6 text-gray-900 dark:text-white" />
                        </button>
                        <button
                          onClick={() =>
                            setCurrentPhotoIndex(
                              (prev) => (prev + 1) % photos.length
                            )
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors shadow-lg"
                        >
                          <ArrowRight className="w-6 h-6 text-gray-900 dark:text-white" />
                        </button>
                      </>
                    )}

                    {/* Photo Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-semibold">
                      {currentPhotoIndex + 1} / {photos.length}
                    </div>
                  </div>

                  {/* Thumbnail Strip */}
                  {photos.length > 1 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex gap-2 overflow-x-auto">
                      {photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                            index === currentPhotoIndex
                              ? "border-orange-500 scale-110"
                              : "border-gray-200 dark:border-gray-600 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <Image
                            src={photo}
                            alt={`Thumbnail ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-96 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  <div className="text-center">
                    <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Photos will be available soon
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Package Details */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                  <Package className="w-8 h-8 text-orange-500" />
                  Package Details
                </h2>

                {buyingRequest.package && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Reference Number:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {buyingRequest.package.reference_number}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Status:
                      </span>
                      <span className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold text-sm">
                        {buyingRequest.package.status
                          ?.replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Weight:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {buyingRequest.package.actual_weight} kg
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        Item Verified
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Your item has been inspected, weighed, and photographed.
                        It's ready for international shipping!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                onClick={handleSelectShipping}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
              >
                Select International Shipping
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
