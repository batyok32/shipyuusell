"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { calculateQuotes } from "@/store/slices/quotesSlice";
import {
  Loader2,
  Package,
  DollarSign,
  Clock,
  ArrowRight,
  MapPin,
  Weight,
  Ruler,
  Sparkles,
  TrendingUp,
  Zap,
  Car,
  Boxes,
  Scale,
  Truck,
  AlertCircle,
  Calendar,
  FileText,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export function QuoteCalculatorSection() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { quotes, loading, error } = useAppSelector((state) => state.quotes);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const [formData, setFormData] = useState({
    shipping_category: "auto",
    origin_country: "",
    destination_country: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    declared_value: "",
    // Vehicle-specific fields
    vehicle_type: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_year: "",
    vehicle_vin: "",
    vehicle_condition: "",
    // Freight-specific fields
    freight_class: "",
    pallet_count: "",
    // Super heavy fields
    permits_required: false,
    special_handling: "",
    // Pickup options
    pickup_option: "drop_off", // drop_off or scheduled_pickup
    warehouse_type: "standard", // standard or vehicle_warehouse
  });

  const shippingCategories = [
    {
      value: "auto",
      label: "Auto-detect",
      description: "Automatically select based on weight",
      icon: Sparkles,
    },
    {
      value: "small_parcel",
      label: "Small Parcel (0-30kg)",
      description: "Courier shipping",
      icon: Package,
    },
    {
      value: "heavy_parcel",
      label: "Heavy Parcel (30-100kg)",
      description: "Freight carriers",
      icon: Boxes,
    },
    {
      value: "ltl_freight",
      label: "LTL Freight (100-4000kg)",
      description: "Less Than Truckload, palletized",
      icon: Scale,
    },
    {
      value: "ftl_freight",
      label: "FTL Freight (4000+kg)",
      description: "Full Truckload",
      icon: Truck,
    },
    {
      value: "vehicle",
      label: "Vehicle",
      description: "Cars, motorcycles, boats (RoRo/Container)",
      icon: Car,
    },
    {
      value: "super_heavy",
      label: "Super Heavy/Oversized",
      description: "Construction equipment, permits required",
      icon: AlertCircle,
    },
  ];

  // Auto-detect category based on weight
  useEffect(() => {
    if (formData.shipping_category === "auto" && formData.weight) {
      const weight = parseFloat(formData.weight);
      if (weight > 4000) {
        setFormData((prev) => ({ ...prev, shipping_category: "ftl_freight" }));
      } else if (weight > 100) {
        setFormData((prev) => ({ ...prev, shipping_category: "ltl_freight" }));
      } else if (weight > 30) {
        setFormData((prev) => ({ ...prev, shipping_category: "heavy_parcel" }));
      } else if (weight > 0) {
        setFormData((prev) => ({ ...prev, shipping_category: "small_parcel" }));
      }
    }
  }, [formData.weight, formData.shipping_category]);

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/logistics/countries/`);
      const data = await response.json();
      setCountries(data);
    } catch (err) {
      console.error("Failed to fetch countries:", err);
      toast.error("Failed to load countries");
    } finally {
      setLoadingCountries(false);
    }
  };

  const handleCalculate = async () => {
    // Category-specific validation
    if (
      !formData.origin_country ||
      !formData.destination_country ||
      !formData.weight
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Vehicle-specific validation
    if (formData.shipping_category === "vehicle") {
      if (
        !formData.vehicle_type ||
        !formData.vehicle_make ||
        !formData.vehicle_model
      ) {
        toast.error("Please fill in vehicle details");
        return;
      }
    }

    // LTL/FTL validation
    if (
      formData.shipping_category === "ltl_freight" ||
      formData.shipping_category === "ftl_freight"
    ) {
      if (!formData.freight_class) {
        toast.error("Please select freight class");
        return;
      }
    }

    const quoteData = {
      origin_country: formData.origin_country,
      destination_country: formData.destination_country,
      weight: parseFloat(formData.weight),
      dimensions: {
        length: parseFloat(formData.length) || 10,
        width: parseFloat(formData.width) || 10,
        height: parseFloat(formData.height) || 10,
      },
      declared_value: parseFloat(formData.declared_value) || 0,
      shipping_category:
        formData.shipping_category === "auto"
          ? null
          : formData.shipping_category,
    };

    // Add category-specific data
    if (formData.shipping_category === "vehicle") {
      quoteData.vehicle_details = {
        type: formData.vehicle_type,
        make: formData.vehicle_make,
        model: formData.vehicle_model,
        year: formData.vehicle_year,
        vin: formData.vehicle_vin,
        condition: formData.vehicle_condition,
      };
    }

    if (
      formData.shipping_category === "ltl_freight" ||
      formData.shipping_category === "ftl_freight"
    ) {
      quoteData.freight_class = parseInt(formData.freight_class);
      quoteData.pallet_count = parseInt(formData.pallet_count) || 1;
    }

    if (formData.shipping_category === "super_heavy") {
      quoteData.permits_required = formData.permits_required;
      quoteData.special_handling = formData.special_handling;
    }

    await dispatch(calculateQuotes(quoteData))
      .unwrap()
      .then(() => {
        toast.success("Quotes calculated successfully!");
      })
      .catch((err) => {
        toast.error(err || "Failed to calculate quotes");
      });
  };

  return (
    <section className="py-12 md:py-16 lg:py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced background */}
      <div className="absolute inset-0 mesh-gradient opacity-30" />
      <div className="absolute inset-0 pattern-dots opacity-10" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-20" />
      <div
        className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-20"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-card mb-6 glow-effect-orange"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-orange-500" />
            </motion.div>
            <span className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Instant Quote Calculator
            </span>
          </motion.div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6">
            <span className="gradient-text">Get Instant</span>
            <br />
            <span className="text-gray-900 dark:text-white">
              Shipping Quote
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-4">
            Compare rates across all transport modes and carriers in real-time
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Enhanced Form */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" }}
            className="card-modern p-6 md:p-8 lg:p-10 relative overflow-hidden group"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-orange-400/20 to-red-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl gradient-bg glow-effect-orange">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                  Shipping Details
                </h3>
              </div>

              <div className="space-y-6">
                {/* Shipping Category Selector */}
                <div className="group">
                  <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    <Layers className="w-5 h-5 text-orange-500" />
                    Shipping Category
                  </label>
                  <select
                    value={formData.shipping_category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shipping_category: e.target.value,
                      })
                    }
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                  >
                    {shippingCategories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <option key={category.value} value={category.value}>
                          {category.label} - {category.description}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {
                      shippingCategories.find(
                        (c) => c.value === formData.shipping_category
                      )?.description
                    }
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      Origin Country
                    </label>
                    {loadingCountries ? (
                      <div className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <select
                        value={formData.origin_country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            origin_country: e.target.value,
                          })
                        }
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      >
                        <option value="">Select Origin Country</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <MapPin className="w-5 h-5 text-orange-500" />
                      Destination Country
                    </label>
                    {loadingCountries ? (
                      <div className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : (
                      <select
                        value={formData.destination_country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            destination_country: e.target.value,
                          })
                        }
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                      >
                        <option value="">Select Destination Country</option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Weight - shown for all categories except vehicles (which use vehicle details) */}
                {formData.shipping_category !== "vehicle" && (
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <Weight className="w-5 h-5 text-orange-500" />
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
                      }
                      placeholder="5.0"
                      step="0.1"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    />
                  </div>
                )}

                {/* Dimensions - hidden for vehicles */}
                {formData.shipping_category !== "vehicle" && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <Ruler className="w-5 h-5 text-orange-500" />
                      Dimensions (cm)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <input
                        type="number"
                        value={formData.length}
                        onChange={(e) =>
                          setFormData({ ...formData, length: e.target.value })
                        }
                        placeholder="Length"
                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      />
                      <input
                        type="number"
                        value={formData.width}
                        onChange={(e) =>
                          setFormData({ ...formData, width: e.target.value })
                        }
                        placeholder="Width"
                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      />
                      <input
                        type="number"
                        value={formData.height}
                        onChange={(e) =>
                          setFormData({ ...formData, height: e.target.value })
                        }
                        placeholder="Height"
                        className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      />
                    </div>
                  </div>
                )}

                {/* Vehicle-specific fields */}
                {formData.shipping_category === "vehicle" && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800"
                    >
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Car className="w-5 h-5 text-orange-500" />
                        Vehicle Details
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            Vehicle Type *
                          </label>
                          <select
                            value={formData.vehicle_type}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_type: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            Make *
                          </label>
                          <input
                            type="text"
                            value={formData.vehicle_make}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_make: e.target.value,
                              })
                            }
                            placeholder="Toyota"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            Model *
                          </label>
                          <input
                            type="text"
                            value={formData.vehicle_model}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_model: e.target.value,
                              })
                            }
                            placeholder="Camry"
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            Year
                          </label>
                          <input
                            type="number"
                            value={formData.vehicle_year}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_year: e.target.value,
                              })
                            }
                            placeholder="2020"
                            min="1900"
                            max={new Date().getFullYear() + 1}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            VIN
                          </label>
                          <input
                            type="text"
                            value={formData.vehicle_vin}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_vin: e.target.value.toUpperCase(),
                              })
                            }
                            placeholder="1HGBH41JXMN109186"
                            maxLength={17}
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                            Condition
                          </label>
                          <select
                            value={formData.vehicle_condition}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                vehicle_condition: e.target.value,
                              })
                            }
                            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select Condition</option>
                            <option value="excellent">Excellent</option>
                            <option value="good">Good</option>
                            <option value="fair">Fair</option>
                            <option value="poor">Poor</option>
                            <option value="non-running">Non-Running</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Estimated Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={formData.weight}
                          onChange={(e) =>
                            setFormData({ ...formData, weight: e.target.value })
                          }
                          placeholder="1500"
                          step="0.1"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Freight Class for LTL and FTL */}
                {(formData.shipping_category === "ltl_freight" ||
                  formData.shipping_category === "ftl_freight") && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
                    >
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Freight Class *
                        </label>
                        <select
                          value={formData.freight_class}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              freight_class: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                        >
                          <option value="">Select Class</option>
                          <option value="50">Class 50 - Dense, Heavy</option>
                          <option value="55">Class 55</option>
                          <option value="60">Class 60</option>
                          <option value="65">Class 65</option>
                          <option value="70">Class 70 - Standard</option>
                          <option value="77.5">Class 77.5</option>
                          <option value="85">Class 85</option>
                          <option value="92.5">Class 92.5</option>
                          <option value="100">Class 100</option>
                          <option value="110">Class 110</option>
                          <option value="125">Class 125</option>
                          <option value="150">Class 150</option>
                          <option value="175">Class 175</option>
                          <option value="200">Class 200</option>
                          <option value="250">Class 250</option>
                          <option value="300">Class 300</option>
                          <option value="400">Class 400</option>
                          <option value="500">Class 500 - Light, Bulky</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Number of Pallets
                        </label>
                        <input
                          type="number"
                          value={formData.pallet_count}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pallet_count: e.target.value,
                            })
                          }
                          placeholder="1"
                          min="1"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Super Heavy/Oversized fields */}
                {formData.shipping_category === "super_heavy" && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800"
                    >
                      <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        Special Requirements
                      </h4>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="permits_required"
                          checked={formData.permits_required}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              permits_required: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-orange-500 rounded"
                        />
                        <label
                          htmlFor="permits_required"
                          className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                        >
                          Permits Required
                        </label>
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Special Handling Instructions
                        </label>
                        <textarea
                          value={formData.special_handling}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              special_handling: e.target.value,
                            })
                          }
                          placeholder="Describe any special handling requirements..."
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* Declared Value - shown for all except vehicles (which use vehicle value) */}
                {formData.shipping_category !== "vehicle" && (
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <DollarSign className="w-5 h-5 text-orange-500" />
                      Declared Value (USD)
                    </label>
                    <input
                      type="number"
                      value={formData.declared_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          declared_value: e.target.value,
                        })
                      }
                      placeholder="100"
                      step="0.01"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    />
                  </div>
                )}

                {/* Pickup Options - Different for vehicles and freight */}
                {formData.shipping_category === "vehicle" ||
                formData.shipping_category === "ltl_freight" ||
                formData.shipping_category === "ftl_freight" ||
                formData.shipping_category === "super_heavy" ? (
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <span className="font-bold text-gray-900 dark:text-white">
                        Pickup Required
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      This category requires scheduled pickup. You'll be able to
                      schedule pickup after quote approval.
                    </p>
                  </div>
                ) : (
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      Shipping Option
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pickup_option"
                          value="drop_off"
                          checked={formData.pickup_option === "drop_off"}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pickup_option: e.target.value,
                            })
                          }
                          className="w-5 h-5 text-orange-500"
                        />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Drop Off at Carrier
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="pickup_option"
                          value="scheduled_pickup"
                          checked={
                            formData.pickup_option === "scheduled_pickup"
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pickup_option: e.target.value,
                            })
                          }
                          className="w-5 h-5 text-orange-500"
                        />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          Schedule Pickup
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Warehouse Type - Different for vehicles */}
                {formData.shipping_category === "vehicle" && (
                  <div className="group">
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      <Package className="w-5 h-5 text-orange-500" />
                      Warehouse Type
                    </label>
                    <select
                      value={formData.warehouse_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          warehouse_type: e.target.value,
                        })
                      }
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                    >
                      <option value="vehicle_warehouse">
                        Vehicle Warehouse (Specialized)
                      </option>
                      <option value="standard">Standard Warehouse</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Vehicle warehouse is recommended for cars, motorcycles,
                      and boats
                    </p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCalculate}
                  disabled={loading}
                  className="w-full px-8 py-5 btn-premium text-white rounded-xl font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50 glow-effect"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Calculating Quotes...
                    </>
                  ) : (
                    <>
                      <Zap className="w-6 h-6" />
                      Calculate Quotes
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </motion.button>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 font-semibold"
                  >
                    {error}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Enhanced Results */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, type: "spring" }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                Available Quotes
              </h3>
              {quotes.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 dark:bg-green-900/20">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    {quotes.length} Options
                  </span>
                </div>
              )}
            </div>

            <AnimatePresence>
              {quotes.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {quotes.map((quote, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.1, type: "spring" }}
                      whileHover={{ scale: 1.03, y: -6 }}
                      className="card-modern p-8 relative overflow-hidden group"
                    >
                      {/* Badge for best price */}
                      {i === 0 && (
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg">
                          Best Price
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-2 group-hover:gradient-text transition-all">
                            {quote.transport_mode_name}
                          </h4>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            {quote.carrier}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-black gradient-text mb-1">
                            ${quote.total.toFixed(2)}
                          </div>
                          <div className="text-xs font-semibold text-gray-500">
                            Base: ${quote.base_rate.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6 pt-6 border-t-2 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <Clock className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase">
                              Transit Time
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              {quote.transit_days[0]}-{quote.transit_days[1]}{" "}
                              days
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                            <DollarSign className="w-5 h-5 text-orange-500" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-500 uppercase">
                              Markup
                            </div>
                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                              ${quote.markup.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          // Store quote and form data in sessionStorage
                          const quoteData = {
                            quote,
                            quoteRequest: formData,
                          };
                          sessionStorage.setItem(
                            "selectedQuote",
                            JSON.stringify(quoteData)
                          );
                          router.push("/quote/review");
                        }}
                        className="w-full px-6 py-4 gradient-bg text-white rounded-xl font-black text-lg shadow-lg hover:shadow-xl transition-all glow-effect"
                      >
                        Select This Option
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card-modern p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-600"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-flex p-6 rounded-2xl bg-orange-50 dark:bg-orange-900/20 mb-6"
                  >
                    <Package className="w-16 h-16 text-orange-500" />
                  </motion.div>
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                    Ready to Get Quotes?
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                    Fill in your shipping details and click "Calculate Quotes"
                    to see all available options with real-time pricing
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
