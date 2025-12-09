"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Car,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Ruler,
  Weight,
  FileText,
  Calendar,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";

export default function VehicleShipPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const [formData, setFormData] = useState({
    // Step 1: Vehicle Details
    vehicle_type: "",
    make: "",
    model: "",
    year: "",
    vin: "",
    condition: "running",
    // Step 2: Dimensions
    length: "",
    width: "",
    height: "",
    weight: "",
    // Step 3: Shipping Details
    origin_country: "",
    destination_country: "",
    shipping_method: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login?redirect=/vehicles/ship");
      return;
    }
    fetchCountries();
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Auto-calculate pricing when dimensions and countries are filled
    if (
      step >= 3 &&
      formData.length &&
      formData.width &&
      formData.height &&
      formData.weight &&
      formData.origin_country &&
      formData.destination_country
    ) {
      calculatePricing();
    }
  }, [
    formData.length,
    formData.width,
    formData.height,
    formData.weight,
    formData.origin_country,
    formData.destination_country,
    formData.condition,
    formData.vehicle_type,
    step,
  ]);

  const fetchCountries = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/logistics/countries/`);
      const data = await response.json();
      setCountries(data);
    } catch (error) {
      console.error("Failed to fetch countries:", error);
    }
  };

  const calculatePricing = async () => {
    if (
      !formData.length ||
      !formData.width ||
      !formData.height ||
      !formData.weight ||
      !formData.origin_country ||
      !formData.destination_country
    ) {
      return;
    }

    setLoadingPricing(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/vehicles/calculate-pricing/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            origin_country: formData.origin_country,
            destination_country: formData.destination_country,
            vehicle_type: formData.vehicle_type,
            length: parseFloat(formData.length),
            width: parseFloat(formData.width),
            height: parseFloat(formData.height),
            weight: parseFloat(formData.weight),
            condition: formData.condition,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPricing(data);
      } else {
        throw new Error(data.error || "Failed to calculate pricing");
      }
    } catch (error) {
      console.error("Failed to calculate pricing:", error);
    } finally {
      setLoadingPricing(false);
    }
  };

  const handleNext = () => {
    // Validation
    if (step === 1) {
      if (
        !formData.vehicle_type ||
        !formData.make ||
        !formData.model ||
        !formData.year
      ) {
        toast.error("Please fill in all required vehicle details");
        return;
      }
    } else if (step === 2) {
      if (
        !formData.length ||
        !formData.width ||
        !formData.height ||
        !formData.weight
      ) {
        toast.error("Please fill in all dimensions");
        return;
      }
    } else if (step === 3) {
      if (
        !formData.origin_country ||
        !formData.destination_country ||
        !formData.shipping_method
      ) {
        toast.error("Please fill in all shipping details");
        return;
      }
    }

    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!pricing || !formData.shipping_method) {
      toast.error("Please select a shipping method");
      return;
    }

    const selectedPricing = pricing[formData.shipping_method];
    if (!selectedPricing) {
      toast.error("Invalid shipping method selected");
      return;
    }

    setLoading(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/vehicles/create/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          ...formData,
          year: parseInt(formData.year),
          length: parseFloat(formData.length),
          width: parseFloat(formData.width),
          height: parseFloat(formData.height),
          weight: parseFloat(formData.weight),
          quote_amount: selectedPricing.price,
          deposit_percent: 25,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Vehicle shipping request created!");
        sessionStorage.setItem("vehicleId", data.id);
        router.push(`/vehicles/deposit/${data.id}`);
      } else {
        throw new Error(data.error || "Failed to create vehicle request");
      }
    } catch (error) {
      toast.error(error.message || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const progressSteps = [
    { number: 1, label: "Vehicle Details", icon: Car },
    { number: 2, label: "Dimensions", icon: Ruler },
    { number: 3, label: "Route & Pricing", icon: MapPin },
    { number: 4, label: "Review & Submit", icon: CheckCircle },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Vehicle Shipping
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Ship Your Vehicle
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete the form below to get a quote for shipping your vehicle
            </p>
          </motion.div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -z-10">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  initial={{ width: "0%" }}
                  animate={{
                    width: `${
                      ((step - 1) / (progressSteps.length - 1)) * 100
                    }%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {progressSteps.map((stepItem, index) => {
                const isActive = step >= stepItem.number;
                const StepIcon = stepItem.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center relative z-10"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                        isActive
                          ? "bg-gradient-to-r from-orange-600 to-red-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500"
                      }`}
                    >
                      {isActive ? (
                        <StepIcon className="w-6 h-6" />
                      ) : (
                        stepItem.number
                      )}
                    </motion.div>
                    <span className="mt-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                      {stepItem.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1: Vehicle Details */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <Car className="w-8 h-8 text-orange-500" />
                Vehicle Information
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                    Vehicle Type *
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) =>
                      setFormData({ ...formData, vehicle_type: e.target.value })
                    }
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    required
                  >
                    <option value="">Select Type</option>
                    <option value="car">Car</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="boat">Boat</option>
                    <option value="rv">RV/Camper</option>
                    <option value="truck">Truck</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Make *
                    </label>
                    <input
                      type="text"
                      value={formData.make}
                      onChange={(e) =>
                        setFormData({ ...formData, make: e.target.value })
                      }
                      placeholder="Toyota"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Model *
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="Camry"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Year *
                    </label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      placeholder="2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      VIN (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.vin}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vin: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="1HGBH41JXMN109186"
                      maxLength={17}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                    Condition *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="condition"
                        value="running"
                        checked={formData.condition === "running"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condition: e.target.value,
                          })
                        }
                        className="w-5 h-5 text-orange-500"
                      />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Running (Operational)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="condition"
                        value="non_running"
                        checked={formData.condition === "non_running"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condition: e.target.value,
                          })
                        }
                        className="w-5 h-5 text-orange-500"
                      />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Non-Running (+$400-800)
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black flex items-center gap-2"
                >
                  Next: Dimensions
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Dimensions */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <Ruler className="w-8 h-8 text-orange-500" />
                Vehicle Dimensions
              </h2>

              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      <Ruler className="w-4 h-4 text-orange-500" />
                      Length (cm) *
                    </label>
                    <input
                      type="number"
                      value={formData.length}
                      onChange={(e) =>
                        setFormData({ ...formData, length: e.target.value })
                      }
                      placeholder="450"
                      step="0.1"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      <Ruler className="w-4 h-4 text-orange-500" />
                      Width (cm) *
                    </label>
                    <input
                      type="number"
                      value={formData.width}
                      onChange={(e) =>
                        setFormData({ ...formData, width: e.target.value })
                      }
                      placeholder="180"
                      step="0.1"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      <Ruler className="w-4 h-4 text-orange-500" />
                      Height (cm) *
                    </label>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData({ ...formData, height: e.target.value })
                      }
                      placeholder="150"
                      step="0.1"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                    <Weight className="w-4 h-4 text-orange-500" />
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({ ...formData, weight: e.target.value })
                    }
                    placeholder="1500"
                    step="0.1"
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    required
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <motion.button
                  onClick={() => setStep(step - 1)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-black text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </motion.button>
                <motion.button
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black flex items-center gap-2"
                >
                  Next: Route & Pricing
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Route & Pricing */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                  <MapPin className="w-8 h-8 text-orange-500" />
                  Shipping Route
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Origin Country *
                    </label>
                    <select
                      value={formData.origin_country}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          origin_country: e.target.value,
                        });
                        setPricing(null);
                      }}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    >
                      <option value="">Select Origin</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Destination Country *
                    </label>
                    <select
                      value={formData.destination_country}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          destination_country: e.target.value,
                        });
                        setPricing(null);
                      }}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      required
                    >
                      <option value="">Select Destination</option>
                      {countries.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingPricing && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Calculating pricing...
                    </p>
                  </div>
                )}

                {pricing && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8"
                  >
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
                      Shipping Method Comparison
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* RoRo */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.shipping_method === "roro"
                            ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-orange-300"
                        }`}
                        onClick={() =>
                          setFormData({ ...formData, shipping_method: "roro" })
                        }
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xl font-black text-gray-900 dark:text-white">
                            RoRo (Roll-on/Roll-off)
                          </h4>
                          {formData.shipping_method === "roro" && (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          )}
                        </div>
                        <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-2">
                          ${pricing.roro.price.toFixed(2)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          {pricing.roro.description}
                        </p>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          <div className="font-semibold mb-2">
                            Transit: {pricing.roro.transit_days[0]}-
                            {pricing.roro.transit_days[1]} days
                          </div>
                          {pricing.roro.extra_fees > 0 && (
                            <div className="text-orange-600 dark:text-orange-400">
                              + ${pricing.roro.extra_fees.toFixed(2)}{" "}
                              (Non-running)
                            </div>
                          )}
                        </div>
                      </motion.div>

                      {/* Container Options */}
                      {[
                        "container_20ft",
                        "container_40ft",
                        "container_shared",
                      ].map((method) => {
                        const methodData = pricing[method];
                        const methodLabel =
                          method === "container_20ft"
                            ? "20ft Container"
                            : method === "container_40ft"
                            ? "40ft Container"
                            : "Shared Container";
                        return (
                          <motion.div
                            key={method}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                              formData.shipping_method === method
                                ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-orange-300"
                            }`}
                            onClick={() =>
                              setFormData({
                                ...formData,
                                shipping_method: method,
                              })
                            }
                          >
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-xl font-black text-gray-900 dark:text-white">
                                {methodLabel}
                              </h4>
                              {formData.shipping_method === method && (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              )}
                            </div>
                            <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-2">
                              ${methodData.price.toFixed(2)}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                              {methodData.description}
                            </p>
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              <div className="font-semibold">
                                Transit: {methodData.transit_days[0]}-
                                {methodData.transit_days[1]} days
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex justify-between">
                <motion.button
                  onClick={() => setStep(step - 1)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-black text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </motion.button>
                <motion.button
                  onClick={handleNext}
                  disabled={!formData.shipping_method || !pricing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black flex items-center gap-2 disabled:opacity-50"
                >
                  Next: Review
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Review */}
          {step === 4 && pricing && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-orange-500" />
                Review & Submit
              </h2>

              <div className="space-y-6 mb-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                    Vehicle Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Type:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">
                        {formData.vehicle_type}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Make/Model:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">
                        {formData.make} {formData.model}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Year:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">
                        {formData.year}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Condition:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white ml-2">
                        {formData.condition === "running"
                          ? "Running"
                          : "Non-Running"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                    Shipping Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Route:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formData.origin_country} →{" "}
                        {formData.destination_country}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Method:
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        {formData.shipping_method
                          ?.replace("_", " ")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Total Cost:
                      </span>
                      <span className="text-2xl font-black text-orange-600 dark:text-orange-400">
                        ${pricing[formData.shipping_method]?.price.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Deposit (25%):
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">
                        $
                        {(
                          pricing[formData.shipping_method]?.price * 0.25
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <motion.button
                  onClick={() => setStep(step - 1)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-black text-gray-700 dark:text-gray-300 flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </motion.button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Request
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
