"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ShoppingCart,
  Link as LinkIcon,
  FileText,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Zap,
  MapPin,
  Package,
  Ruler,
  Info,
  Truck,
  Clock,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector } from "@/store/hooks";
import { buyingAPI } from "@/lib/api";

export default function BuyShipRequestPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [formData, setFormData] = useState({
    product_url: "",
    product_name: "",
    product_description: "",
    product_image: "",
    // Shipping address
    shipping_address: {
      full_name: "",
      street_address: "",
      street_address_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      phone: "",
    },
    // Optional immediate quote fields
    weight: "",
    dimensions: {
      length: "",
      width: "",
      height: "",
    },
    price: "",
    item_type: "", // 'vehicle', 'car', or empty for regular items
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showImmediateQuote, setShowImmediateQuote] = useState(false);
  const [approximateQuotes, setApproximateQuotes] = useState([]);
  const [showApproximateQuotes, setShowApproximateQuotes] = useState(false);
  const [submittedRequestId, setSubmittedRequestId] = useState(null);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [quotesPreviewed, setQuotesPreviewed] = useState(false);

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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_url && !formData.product_description.trim()) {
      newErrors.product_description =
        "Please provide either a product URL or description";
    }

    if (formData.product_url && !isValidUrl(formData.product_url)) {
      newErrors.product_url = "Please enter a valid URL";
    }

    // Shipping address validation
    if (!formData.shipping_address.full_name.trim()) {
      newErrors["shipping_address.full_name"] = "Full name is required";
    }
    if (!formData.shipping_address.street_address.trim()) {
      newErrors["shipping_address.street_address"] =
        "Street address is required";
    }
    if (!formData.shipping_address.city.trim()) {
      newErrors["shipping_address.city"] = "City is required";
    }
    if (!formData.shipping_address.postal_code.trim()) {
      newErrors["shipping_address.postal_code"] = "Postal code is required";
    }
    if (!formData.shipping_address.country.trim()) {
      newErrors["shipping_address.country"] = "Country is required";
    }

    // Immediate quote validation (if enabled)
    if (showImmediateQuote) {
      if (formData.weight && parseFloat(formData.weight) <= 0) {
        newErrors.weight = "Weight must be greater than 0";
      }
      if (formData.price && parseFloat(formData.price) <= 0) {
        newErrors.price = "Price must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handlePreviewQuotes = async () => {
    // Validate form first
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    // Check if user provided weight and price for quote preview
    if (!showImmediateQuote || !formData.weight || !formData.price) {
      toast.error(
        "Please enable immediate quote and provide weight and price to preview quotes"
      );
      return;
    }

    setLoadingQuotes(true);
    try {
      const previewData = {
        shipping_address: formData.shipping_address,
        weight: parseFloat(formData.weight),
        dimensions: {
          length: formData.dimensions.length
            ? parseFloat(formData.dimensions.length)
            : 10,
          width: formData.dimensions.width
            ? parseFloat(formData.dimensions.width)
            : 10,
          height: formData.dimensions.height
            ? parseFloat(formData.dimensions.height)
            : 10,
        },
        price: parseFloat(formData.price),
        product_description: formData.product_description,
        item_type: formData.item_type || undefined, // Include item_type if selected
      };

      const response = await buyingAPI.previewQuotes(previewData);

      if (response.data && response.data.approximate_quotes) {
        setApproximateQuotes(response.data.approximate_quotes);
        setShowApproximateQuotes(true);
        setQuotesPreviewed(true);
        toast.success(
          `Found ${response.data.approximate_quotes.length} shipping options!`
        );
      } else {
        toast.error("No quotes available. Please check your information.");
      }
    } catch (error) {
      console.error("Error previewing quotes:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Failed to preview quotes";
      toast.error(errorMessage);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please log in to submit a buying request");
      router.push("/login?redirect=/buy-ship/request");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    try {
      // Prepare request data
      const requestData = {
        product_url: formData.product_url || undefined,
        product_name: formData.product_name || undefined,
        product_description: formData.product_description,
        product_image: formData.product_image || undefined,
        shipping_address: formData.shipping_address,
      };

      console.log(
        "Submitting buying request with data:",
        JSON.stringify(requestData, null, 2)
      );

      // Add immediate quote data if provided
      if (showImmediateQuote && (formData.weight || formData.price)) {
        requestData.weight = formData.weight
          ? parseFloat(formData.weight)
          : undefined;
        requestData.dimensions = {
          length: formData.dimensions.length
            ? parseFloat(formData.dimensions.length)
            : 10,
          width: formData.dimensions.width
            ? parseFloat(formData.dimensions.width)
            : 10,
          height: formData.dimensions.height
            ? parseFloat(formData.dimensions.height)
            : 10,
        };
        requestData.price = formData.price
          ? parseFloat(formData.price)
          : undefined;
        // Include item_type if selected (for vehicle/car category)
        if (formData.item_type) {
          requestData.item_type = formData.item_type;
        }
      }

      const response = await buyingAPI.createRequest(requestData);

      if (response.data) {
        toast.success("Buying request submitted successfully!");

        // If quotes were already previewed, navigate to quotes page
        if (quotesPreviewed) {
          router.push(`/buy-ship/quotes?request_id=${response.data.id}`);
        } else if (
          response.data.approximate_quotes &&
          response.data.approximate_quotes.length > 0
        ) {
          // Show approximate quotes if available (for cases where user didn't preview)
          setApproximateQuotes(response.data.approximate_quotes);
          setSubmittedRequestId(response.data.id);
          setShowApproximateQuotes(true);
          toast.success(`Approximate quotes calculated! Review them below.`);
        } else {
          toast.success(
            "An agent will review your request and create quotes within 24-48 hours."
          );
          // Navigate to dashboard or quotes page
          router.push(`/buy-ship/quotes?request_id=${response.data.id}`);
        }
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      console.error("Error details:", {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });

      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.message ||
        "Failed to submit buying request";

      toast.error(errorMessage);

      // Log full error for debugging
      if (error.response?.data) {
        console.error(
          "Full error response:",
          JSON.stringify(error.response.data, null, 2)
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    validateForm();
  };

  const updateShippingAddress = (field, value) => {
    setFormData({
      ...formData,
      shipping_address: {
        ...formData.shipping_address,
        [field]: value,
      },
    });
    if (errors[`shipping_address.${field}`]) {
      setErrors({ ...errors, [`shipping_address.${field}`]: null });
    }
  };

  const updateDimensions = (field, value) => {
    setFormData({
      ...formData,
      dimensions: {
        ...formData.dimensions,
        [field]: value,
      },
    });
  };

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
                Buy & Ship Service
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Request a Product
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Share the product URL or description, and our buying agents will
              find it, verify it, and provide you with a complete quote.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-modern p-8 md:p-12 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
          >
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Product URL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <LinkIcon className="w-5 h-5 text-orange-500" />
                  Product URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.product_url}
                  onChange={(e) => {
                    setFormData({ ...formData, product_url: e.target.value });
                    if (errors.product_url) {
                      setErrors({ ...errors, product_url: null });
                    }
                  }}
                  onBlur={() => handleBlur("product_url")}
                  placeholder="https://example.com/product"
                  className={`w-full px-5 py-4 rounded-xl border-2 ${
                    errors.product_url
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg`}
                />
                <AnimatePresence>
                  {errors.product_url && touched.product_url && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                    >
                      <XCircle className="w-4 h-4" />
                      {errors.product_url}
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  If you have a direct link to the product, paste it here
                </p>
              </div>

              {/* Product Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Product Description *
                </label>
                <textarea
                  value={formData.product_description}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      product_description: e.target.value,
                    });
                    if (errors.product_description) {
                      setErrors({ ...errors, product_description: null });
                    }
                  }}
                  onBlur={() => handleBlur("product_description")}
                  placeholder="Describe the product you want to buy... Include brand, model, size, color, and any specific requirements."
                  rows={6}
                  className={`w-full px-5 py-4 rounded-xl border-2 ${
                    errors.product_description
                      ? "border-red-500"
                      : "border-gray-200 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold resize-none`}
                  required
                />
                <AnimatePresence>
                  {errors.product_description &&
                    touched.product_description && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                      >
                        <XCircle className="w-4 h-4" />
                        {errors.product_description}
                      </motion.div>
                    )}
                </AnimatePresence>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Be as detailed as possible to help our agents find the exact
                  product you want
                </p>
              </div>

              {/* Product Name */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  <ShoppingCart className="w-5 h-5 text-orange-500" />
                  Product Name (Optional)
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => {
                    setFormData({ ...formData, product_name: e.target.value });
                  }}
                  placeholder="e.g., iPhone 15 Pro Max 256GB"
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Product name if you know it
                </p>
              </div>

              {/* Shipping Address Section */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-8">
                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-orange-500" />
                  Shipping Address
                </h3>

                <div className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.full_name}
                      onChange={(e) =>
                        updateShippingAddress("full_name", e.target.value)
                      }
                      onBlur={() => handleBlur("shipping_address.full_name")}
                      placeholder="John Doe"
                      className={`w-full px-5 py-4 rounded-xl border-2 ${
                        errors["shipping_address.full_name"]
                          ? "border-red-500"
                          : "border-gray-200 dark:border-gray-600"
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                      required
                    />
                    <AnimatePresence>
                      {errors["shipping_address.full_name"] &&
                        touched["shipping_address.full_name"] && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                          >
                            <XCircle className="w-4 h-4" />
                            {errors["shipping_address.full_name"]}
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>

                  {/* Street Address */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.street_address}
                      onChange={(e) =>
                        updateShippingAddress("street_address", e.target.value)
                      }
                      onBlur={() =>
                        handleBlur("shipping_address.street_address")
                      }
                      placeholder="123 Main Street"
                      className={`w-full px-5 py-4 rounded-xl border-2 ${
                        errors["shipping_address.street_address"]
                          ? "border-red-500"
                          : "border-gray-200 dark:border-gray-600"
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                      required
                    />
                    <AnimatePresence>
                      {errors["shipping_address.street_address"] &&
                        touched["shipping_address.street_address"] && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                          >
                            <XCircle className="w-4 h-4" />
                            {errors["shipping_address.street_address"]}
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>

                  {/* Street Address 2 */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Apartment, Suite, etc. (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.shipping_address.street_address_2}
                      onChange={(e) =>
                        updateShippingAddress(
                          "street_address_2",
                          e.target.value
                        )
                      }
                      placeholder="Apt 4B"
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                    />
                  </div>

                  {/* City, State, Postal Code */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping_address.city}
                        onChange={(e) =>
                          updateShippingAddress("city", e.target.value)
                        }
                        onBlur={() => handleBlur("shipping_address.city")}
                        placeholder="New York"
                        className={`w-full px-5 py-4 rounded-xl border-2 ${
                          errors["shipping_address.city"]
                            ? "border-red-500"
                            : "border-gray-200 dark:border-gray-600"
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                        required
                      />
                      <AnimatePresence>
                        {errors["shipping_address.city"] &&
                          touched["shipping_address.city"] && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              {errors["shipping_address.city"]}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={formData.shipping_address.state_province}
                        onChange={(e) =>
                          updateShippingAddress(
                            "state_province",
                            e.target.value
                          )
                        }
                        placeholder="NY"
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Postal Code *
                      </label>
                      <input
                        type="text"
                        value={formData.shipping_address.postal_code}
                        onChange={(e) =>
                          updateShippingAddress("postal_code", e.target.value)
                        }
                        onBlur={() =>
                          handleBlur("shipping_address.postal_code")
                        }
                        placeholder="10001"
                        className={`w-full px-5 py-4 rounded-xl border-2 ${
                          errors["shipping_address.postal_code"]
                            ? "border-red-500"
                            : "border-gray-200 dark:border-gray-600"
                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                        required
                      />
                      <AnimatePresence>
                        {errors["shipping_address.postal_code"] &&
                          touched["shipping_address.postal_code"] && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              {errors["shipping_address.postal_code"]}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Country and Phone */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Country *
                      </label>
                      {loadingCountries ? (
                        <div className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <select
                          value={formData.shipping_address.country}
                          onChange={(e) =>
                            updateShippingAddress("country", e.target.value)
                          }
                          onBlur={() => handleBlur("shipping_address.country")}
                          className={`w-full px-5 py-4 rounded-xl border-2 ${
                            errors["shipping_address.country"]
                              ? "border-red-500"
                              : "border-gray-200 dark:border-gray-600"
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                          required
                        >
                          <option value="">Select Country</option>
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <AnimatePresence>
                        {errors["shipping_address.country"] &&
                          touched["shipping_address.country"] && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              {errors["shipping_address.country"]}
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.shipping_address.phone}
                        onChange={(e) =>
                          updateShippingAddress("phone", e.target.value)
                        }
                        placeholder="+1234567890"
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Immediate Quote Section */}
              <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Info className="w-6 h-6 text-orange-500" />
                    Get Immediate Approximate Quote (Optional)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowImmediateQuote(!showImmediateQuote)}
                    className="px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    {showImmediateQuote ? "Hide" : "Show"}
                  </button>
                </div>

                {showImmediateQuote && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      If you know the product size and price, we can provide an
                      approximate quote immediately. An agent will still review
                      and create final quotes.
                    </p>

                    {/* Item Type Selection */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <Package className="w-4 h-4 text-orange-500" />
                        Item Type
                      </label>
                      <select
                        value={formData.item_type}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            item_type: e.target.value,
                          });
                        }}
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                      >
                        <option value="">Regular Item</option>
                        <option value="vehicle">Vehicle / Car</option>
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Select "Vehicle / Car" if you're buying a vehicle. This
                        will use vehicle shipping rates.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          <Package className="w-4 h-4 text-orange-500" />
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={formData.weight}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              weight: e.target.value,
                            });
                            if (errors.weight) {
                              setErrors({ ...errors, weight: null });
                            }
                          }}
                          onBlur={() => handleBlur("weight")}
                          placeholder="1.5"
                          step="0.1"
                          min="0"
                          className={`w-full px-5 py-4 rounded-xl border-2 ${
                            errors.weight
                              ? "border-red-500"
                              : "border-gray-200 dark:border-gray-600"
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                        />
                        <AnimatePresence>
                          {errors.weight && touched.weight && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              {errors.weight}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          <DollarSign className="w-4 h-4 text-orange-500" />
                          Product Price (USD)
                        </label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => {
                            setFormData({ ...formData, price: e.target.value });
                            if (errors.price) {
                              setErrors({ ...errors, price: null });
                            }
                          }}
                          onBlur={() => handleBlur("price")}
                          placeholder="299.99"
                          step="0.01"
                          min="0"
                          className={`w-full px-5 py-4 rounded-xl border-2 ${
                            errors.price
                              ? "border-red-500"
                              : "border-gray-200 dark:border-gray-600"
                          } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold`}
                        />
                        <AnimatePresence>
                          {errors.price && touched.price && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="flex items-center gap-2 mt-2 text-red-600 dark:text-red-400 text-sm font-semibold"
                            >
                              <XCircle className="w-4 h-4" />
                              {errors.price}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <Ruler className="w-4 h-4 text-orange-500" />
                        Dimensions (cm) - Optional
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <input
                            type="number"
                            value={formData.dimensions.length}
                            onChange={(e) =>
                              updateDimensions("length", e.target.value)
                            }
                            placeholder="Length"
                            step="0.1"
                            min="0"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={formData.dimensions.width}
                            onChange={(e) =>
                              updateDimensions("width", e.target.value)
                            }
                            placeholder="Width"
                            step="0.1"
                            min="0"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={formData.dimensions.height}
                            onChange={(e) =>
                              updateDimensions("height", e.target.value)
                            }
                            placeholder="Height"
                            step="0.1"
                            min="0"
                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Info Box */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                      What Happens Next?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Our buying agent will receive your request and create
                          quotes with multiple shipping options (24-48 hours)
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          You'll receive an email with detailed quotes showing
                          all costs breakdown
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Review and approve a quote, then pay securely via
                          Stripe
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          After payment, agent purchases and ships to our
                          warehouse with reference number
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Warehouse receives package, then ships internationally
                          to your address with tracking
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>

              {/* Get Quotes Button (if immediate quote enabled) */}
              {showImmediateQuote && !quotesPreviewed && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePreviewQuotes}
                  disabled={
                    loadingQuotes || !formData.weight || !formData.price
                  }
                  className="w-full px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
                >
                  {loadingQuotes ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Calculating Quotes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Get Shipping Quotes
                      <ArrowRight className="w-6 h-6" />
                    </>
                  )}
                </motion.button>
              )}

              {/* Quotes Preview Section (show when quotes are previewed) */}
              {showApproximateQuotes &&
                approximateQuotes.length > 0 &&
                quotesPreviewed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800"
                  >
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Truck className="w-6 h-6 text-orange-500" />
                      Preview Shipping Quotes
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Review the shipping options below. Click "Continue with
                      Request" to submit your buying request.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {approximateQuotes.map((quote, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <Truck className="w-5 h-5 text-orange-500" />
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {quote.transport_mode ||
                                quote.transport_mode_code?.toUpperCase() ||
                                "Standard Shipping"}
                            </h4>
                          </div>
                          {quote.service_name && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {quote.service_name}
                            </p>
                          )}
                          {quote.transit_days && (
                            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4" />
                              Estimated: {quote.transit_days} days
                            </div>
                          )}
                          {quote.cost_breakdown && (
                            <div className="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Product:
                                </span>
                                <span className="font-semibold">
                                  $
                                  {quote.cost_breakdown.product_cost.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Buying Fee (
                                  {quote.cost_breakdown.buying_fee_percent}%):
                                </span>
                                <span className="font-semibold">
                                  ${quote.cost_breakdown.buying_fee.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">
                                  Shipping:
                                </span>
                                <span className="font-semibold">
                                  $
                                  {quote.cost_breakdown.shipping_cost.toFixed(
                                    2
                                  )}
                                </span>
                              </div>
                              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                <div className="flex justify-between">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    Total:
                                  </span>
                                  <span className="font-black text-lg text-orange-600 dark:text-orange-400">
                                    $
                                    {quote.cost_breakdown.total_cost.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full px-8 py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {quotesPreviewed
                      ? "Submitting Request..."
                      : "Submitting Request..."}
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6" />
                    {quotesPreviewed
                      ? "Continue with Request"
                      : "Submit Buying Request"}
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Approximate Quotes Modal (only show after submission if not previewed) */}
          <AnimatePresence>
            {showApproximateQuotes &&
              approximateQuotes.length > 0 &&
              !quotesPreviewed &&
              submittedRequestId && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => {
                    setShowApproximateQuotes(false);
                    router.push(
                      `/buy-ship/quotes?request_id=${submittedRequestId}`
                    );
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-orange-200 dark:border-orange-800"
                  >
                    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                      <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                          Approximate Quotes
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          These are approximate quotes based on your provided
                          information. An agent will review and create final
                          quotes.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setShowApproximateQuotes(false);
                          router.push(
                            `/buy-ship/quotes?request_id=${submittedRequestId}`
                          );
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <X className="w-6 h-6 text-gray-500" />
                      </button>
                    </div>

                    <div className="p-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        {approximateQuotes.map((quote, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-orange-50/50 dark:from-gray-700 dark:to-orange-900/10"
                          >
                            <div className="flex items-center gap-3 mb-4">
                              <Truck className="w-6 h-6 text-orange-500" />
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                                {quote.transport_mode ||
                                  quote.transport_mode_code?.toUpperCase() ||
                                  "Standard Shipping"}
                              </h3>
                            </div>

                            {quote.service_name && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                {quote.service_name}
                              </p>
                            )}

                            {quote.transit_days && (
                              <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                                <Clock className="w-4 h-4" />
                                Estimated: {quote.transit_days} days
                              </div>
                            )}

                            {quote.cost_breakdown && (
                              <div className="space-y-2 mb-4 p-4 rounded-lg bg-white dark:bg-gray-800">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Product Cost:
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    $
                                    {quote.cost_breakdown.product_cost.toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Buying Fee (
                                    {quote.cost_breakdown.buying_fee_percent}%):
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    $
                                    {quote.cost_breakdown.buying_fee.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Shipping:
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">
                                    $
                                    {quote.cost_breakdown.shipping_cost.toFixed(
                                      2
                                    )}
                                  </span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                                  <div className="flex justify-between">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                      Total:
                                    </span>
                                    <span className="font-black text-xl text-orange-600 dark:text-orange-400">
                                      $
                                      {quote.cost_breakdown.total_cost.toFixed(
                                        2
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-800">
                              <p className="text-xs text-orange-700 dark:text-orange-400 font-semibold">
                                ⚠️ Approximate - Final quotes may vary
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="mt-6 flex gap-4">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowApproximateQuotes(false);
                            router.push(
                              `/buy-ship/quotes?request_id=${submittedRequestId}`
                            );
                          }}
                          className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                          View Request & Wait for Final Quotes
                          <ArrowRight className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>
      <Footer />
    </>
  );
}
