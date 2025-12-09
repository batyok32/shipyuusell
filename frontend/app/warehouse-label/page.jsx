"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  Package,
  MapPin,
  Weight,
  Ruler,
  DollarSign,
  Truck,
  Calendar,
  Clock,
  CheckCircle,
  Loader2,
  ArrowRight,
  Download,
  Printer,
  Plus,
  X,
  Info,
  Sparkles,
  AlertCircle,
  FileText,
  Mail,
  Shield,
  Box,
  Warehouse,
} from "lucide-react";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";

export default function WarehouseLabelPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [step, setStep] = useState(1); // 1: Package Details, 2: Carrier Selection, 3: Payment, 4: Label Generated
  const [loading, setLoading] = useState(false);
  const [warehouseAddress, setWarehouseAddress] = useState(null);
  const [rates, setRates] = useState([]);
  const [selectedRate, setSelectedRate] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showPickupForm, setShowPickupForm] = useState(false);
  const [multipleBoxes, setMultipleBoxes] = useState(false);
  const [boxes, setBoxes] = useState([
    { weight: "", length: "", width: "", height: "" },
  ]);
  const [insurance, setInsurance] = useState(false);
  const [insuranceValue, setInsuranceValue] = useState("");
  const [labelGenerated, setLabelGenerated] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);

  const [formData, setFormData] = useState({
    pickup_address: {
      full_name: "",
      company: "",
      street_address: "",
      street_address_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "US",
      phone: "",
    },
    pickup_option: "drop_off", // drop_off or scheduled_pickup
    pickup_date: "",
    pickup_time_slot: "09:00-12:00",
    contact_name: "",
    contact_phone: "",
    special_instructions: "",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error("Please log in to purchase warehouse labels");
      router.push("/login?redirect=/warehouse-label");
      return;
    }
    fetchWarehouseAddress();
    fetchSavedAddresses();
  }, [isAuthenticated, router]);

  const fetchWarehouseAddress = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/warehouse/address/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setWarehouseAddress(data);
      } else {
        toast.error("Failed to load warehouse address");
      }
    } catch (error) {
      toast.error("Failed to load warehouse address");
    }
  };

  const fetchSavedAddresses = async () => {
    // TODO: Fetch from user's saved addresses
    setSavedAddresses([]);
  };

  const handleGetRates = async () => {
    if (
      !formData.pickup_address.street_address ||
      !formData.pickup_address.city ||
      !formData.pickup_address.postal_code
    ) {
      toast.error("Please enter a valid pickup address");
      return;
    }

    const totalWeight = boxes.reduce(
      (sum, box) => sum + parseFloat(box.weight || 0),
      0
    );
    if (totalWeight <= 0) {
      toast.error("Please enter package weight");
      return;
    }

    setLoading(true);
    try {
      const avgDimensions = {
        length:
          boxes.reduce((sum, box) => sum + parseFloat(box.length || 10), 0) /
          boxes.length,
        width:
          boxes.reduce((sum, box) => sum + parseFloat(box.width || 10), 0) /
          boxes.length,
        height:
          boxes.reduce((sum, box) => sum + parseFloat(box.height || 10), 0) /
          boxes.length,
      };

      // Fetch EasyShip rates for domestic shipping to warehouse
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/warehouse/rates/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            pickup_address: formData.pickup_address,
            weight: totalWeight,
            dimensions: avgDimensions,
            declared_value: insurance ? parseFloat(insuranceValue) : 0,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.rates) {
        setRates(data.rates);
        setStep(2);
        toast.success(`Found ${data.rates.length} carrier options!`);
      } else {
        throw new Error(data.error || "Failed to get rates");
      }
    } catch (error) {
      toast.error(error.message || "Failed to get shipping rates");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (!selectedRate) {
      toast.error("Please select a carrier");
      return;
    }

    setStep(3);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const totalWeight = boxes.reduce(
        (sum, box) => sum + parseFloat(box.weight || 0),
        0
      );

      // Store label data for after payment
      const labelData = {
        pickup_address: formData.pickup_address,
        package_details: {
          weight: totalWeight,
          length: boxes[0].length || 10,
          width: boxes[0].width || 10,
          height: boxes[0].height || 10,
          declared_value: insurance ? parseFloat(insuranceValue) : 0,
        },
        carrier: selectedRate.carrier,
        rate_id: selectedRate.easyship_rate_id,
        pickup_option: formData.pickup_option,
      };
      sessionStorage.setItem("warehouseLabelData", JSON.stringify(labelData));

      // Create payment session
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const paymentResponse = await fetch(
        `${API_URL}/api/v1/payments/create-checkout/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            amount: parseFloat(selectedRate.total),
            currency: "USD",
            payment_type: "warehouse_label",
            metadata: {
              rate_id: selectedRate.easyship_rate_id,
              carrier: selectedRate.carrier,
            },
            success_url: `${window.location.origin}/warehouse-label/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/warehouse-label?cancelled=true`,
          }),
        }
      );

      const paymentData = await paymentResponse.json();

      if (paymentResponse.ok && paymentData.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = paymentData.checkout_url;
      } else {
        throw new Error(
          paymentData.error || "Failed to create payment session"
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to process payment");
      setLoading(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!selectedRate) {
      toast.error("Please select a carrier");
      return;
    }

    setLoading(true);
    try {
      const totalWeight = boxes.reduce(
        (sum, box) => sum + parseFloat(box.weight || 0),
        0
      );

      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_URL}/api/v1/logistics/warehouse/labels/create/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            pickup_address: formData.pickup_address,
            package_details: {
              weight: totalWeight,
              length: boxes[0].length || 10,
              width: boxes[0].width || 10,
              height: boxes[0].height || 10,
              declared_value: insurance ? parseFloat(insuranceValue) : 0,
              description: "Package to Warehouse",
            },
            carrier: selectedRate.carrier,
            rate_id: selectedRate.easyship_rate_id,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setLabelGenerated(data);
        setStep(4);
        toast.success("Label generated successfully!");
      } else {
        throw new Error(data.error || "Failed to generate label");
      }
    } catch (error) {
      toast.error(error.message || "Failed to generate label");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedulePickup = async () => {
    if (
      !formData.pickup_date ||
      !formData.contact_name ||
      !formData.contact_phone
    ) {
      toast.error("Please fill in all pickup details");
      return;
    }

    setLoading(true);
    try {
      const totalWeight = boxes.reduce(
        (sum, box) => sum + parseFloat(box.weight || 0),
        0
      );

      await api.post("/warehouse/pickup/schedule/", {
        pickup_address: formData.pickup_address,
        pickup_date: formData.pickup_date,
        pickup_time_slot: formData.pickup_time_slot,
        weight: totalWeight,
        dimensions: {
          length: boxes[0].length || 10,
          width: boxes[0].width || 10,
          height: boxes[0].height || 10,
        },
        number_of_packages: boxes.length,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        special_instructions: formData.special_instructions,
      });

      toast.success("Pickup scheduled successfully!");
      setShowPickupForm(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to schedule pickup");
    } finally {
      setLoading(false);
    }
  };

  const addBox = () => {
    setBoxes([...boxes, { weight: "", length: "", width: "", height: "" }]);
  };

  const removeBox = (index) => {
    if (boxes.length > 1) {
      setBoxes(boxes.filter((_, i) => i !== index));
    }
  };

  const progressSteps = [
    { number: 1, label: "Package Details", icon: Package },
    { number: 2, label: "Select Carrier", icon: Truck },
    { number: 3, label: "Payment", icon: DollarSign },
    { number: 4, label: "Download Label", icon: Download },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Ship to Warehouse
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Buy Shipping Label
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Purchase prepaid shipping labels to send your packages to our
              warehouse
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

          {/* Step 1: Package Details */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white">
                Package Details
              </h2>

              {/* Multiple Boxes Toggle */}
              <div className="mb-6 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="multiple-boxes"
                  checked={multipleBoxes}
                  onChange={(e) => setMultipleBoxes(e.target.checked)}
                  className="w-5 h-5 text-orange-500 rounded"
                />
                <label
                  htmlFor="multiple-boxes"
                  className="font-semibold text-gray-700 dark:text-gray-300"
                >
                  Shipping multiple boxes?
                </label>
              </div>

              {/* Box Details */}
              <div className="space-y-6 mb-6">
                {boxes.map((box, index) => (
                  <div
                    key={index}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-6"
                  >
                    {boxes.length > 1 && (
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          Box {index + 1}
                        </h3>
                        <button
                          onClick={() => removeBox(index)}
                          className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                          <Weight className="w-4 h-4 text-orange-500" />
                          Weight (kg)
                        </label>
                        <input
                          type="number"
                          value={box.weight}
                          onChange={(e) => {
                            const newBoxes = [...boxes];
                            newBoxes[index].weight = e.target.value;
                            setBoxes(newBoxes);
                          }}
                          placeholder="5.0"
                          step="0.1"
                          min="0.1"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                          <Ruler className="w-4 h-4 text-orange-500" />
                          Length (cm)
                        </label>
                        <input
                          type="number"
                          value={box.length}
                          onChange={(e) => {
                            const newBoxes = [...boxes];
                            newBoxes[index].length = e.target.value;
                            setBoxes(newBoxes);
                          }}
                          placeholder="30"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                          <Ruler className="w-4 h-4 text-orange-500" />
                          Width (cm)
                        </label>
                        <input
                          type="number"
                          value={box.width}
                          onChange={(e) => {
                            const newBoxes = [...boxes];
                            newBoxes[index].width = e.target.value;
                            setBoxes(newBoxes);
                          }}
                          placeholder="20"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
                          <Ruler className="w-4 h-4 text-orange-500" />
                          Height (cm)
                        </label>
                        <input
                          type="number"
                          value={box.height}
                          onChange={(e) => {
                            const newBoxes = [...boxes];
                            newBoxes[index].height = e.target.value;
                            setBoxes(newBoxes);
                          }}
                          placeholder="15"
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {multipleBoxes && (
                <button
                  onClick={addBox}
                  className="mb-6 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg font-semibold flex items-center gap-2 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Another Box
                </button>
              )}

              {/* Pickup Address */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                    <MapPin className="w-5 h-5 text-orange-500" />
                    Pickup Address
                  </label>
                  {savedAddresses.length > 0 && (
                    <select className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600">
                      <option>Select saved address</option>
                    </select>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={formData.pickup_address.full_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          full_name: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Company (Optional)"
                    value={formData.pickup_address.company}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          company: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={formData.pickup_address.street_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          street_address: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Apartment, Suite, etc. (Optional)"
                    value={formData.pickup_address.street_address_2}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          street_address_2: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.pickup_address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          city: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State/Province"
                    value={formData.pickup_address.state_province}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          state_province: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.pickup_address.postal_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          postal_code: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.pickup_address.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: {
                          ...formData.pickup_address,
                          phone: e.target.value,
                        },
                      })
                    }
                    className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Warehouse Address Display */}
              {warehouseAddress && (
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-start gap-3">
                    <Warehouse className="w-6 h-6 text-orange-500 mt-1" />
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                        Ship To: YuuSell Warehouse
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {warehouseAddress.full_name}
                        {"\n"}
                        {warehouseAddress.street_address}
                        {"\n"}
                        {warehouseAddress.city},{" "}
                        {warehouseAddress.state_province}{" "}
                        {warehouseAddress.postal_code}
                        {"\n"}
                        {warehouseAddress.country}
                      </p>
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                        Warehouse ID: {warehouseAddress.warehouse_id}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Insurance */}
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="insurance"
                    checked={insurance}
                    onChange={(e) => setInsurance(e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded"
                  />
                  <label
                    htmlFor="insurance"
                    className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <Shield className="w-5 h-5 text-orange-500" />
                    Add Insurance (Optional)
                  </label>
                </div>
                {insurance && (
                  <input
                    type="number"
                    placeholder="Declared Value (USD)"
                    value={insuranceValue}
                    onChange={(e) => setInsuranceValue(e.target.value)}
                    className="w-full md:w-1/3 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                )}
              </div>

              {/* Pickup Option */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300">
                  <Truck className="w-5 h-5 text-orange-500" />
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
                      I'll Drop Off at Carrier Location
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pickup_option"
                      value="scheduled_pickup"
                      checked={formData.pickup_option === "scheduled_pickup"}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          pickup_option: e.target.value,
                        });
                        setShowPickupForm(
                          e.target.value === "scheduled_pickup"
                        );
                      }}
                      className="w-5 h-5 text-orange-500"
                    />
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Schedule Pickup at My Address
                    </span>
                  </label>
                </div>
              </div>

              {/* Pickup Scheduling Form */}
              <AnimatePresence>
                {showPickupForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border-2 border-orange-200 dark:border-orange-800"
                  >
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                      Pickup Details
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Pickup Date
                        </label>
                        <input
                          type="date"
                          value={formData.pickup_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pickup_date: e.target.value,
                            })
                          }
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                          Time Slot
                        </label>
                        <select
                          value={formData.pickup_time_slot}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              pickup_time_slot: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="09:00-12:00">
                            Morning (9:00 AM - 12:00 PM)
                          </option>
                          <option value="12:00-17:00">
                            Afternoon (12:00 PM - 5:00 PM)
                          </option>
                          <option value="17:00-20:00">
                            Evening (5:00 PM - 8:00 PM)
                          </option>
                        </select>
                      </div>
                      <input
                        type="text"
                        placeholder="Contact Name"
                        value={formData.contact_name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_name: e.target.value,
                          })
                        }
                        className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <input
                        type="tel"
                        placeholder="Contact Phone"
                        value={formData.contact_phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contact_phone: e.target.value,
                          })
                        }
                        className="px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <textarea
                        placeholder="Special Instructions (Optional)"
                        value={formData.special_instructions}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            special_instructions: e.target.value,
                          })
                        }
                        rows={3}
                        className="md:col-span-2 px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                onClick={handleGetRates}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-lg flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Getting Rates...
                  </>
                ) : (
                  <>
                    Get Shipping Rates
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Step 2: Carrier Selection */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white">
                  Select Carrier
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {rates.map((rate, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      onClick={() => setSelectedRate(rate)}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedRate === rate
                          ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {rate.carrier}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {rate.transport_mode_name}
                          </p>
                        </div>
                        {selectedRate === rate && (
                          <CheckCircle className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                      <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-2">
                        ${parseFloat(rate.total).toFixed(2)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {rate.transit_days[0]}-{rate.transit_days[1]} days
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <motion.button
                    onClick={handleProceedToPayment}
                    disabled={!selectedRate}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-bold disabled:opacity-50"
                  >
                    Continue to Payment
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === 3 && selectedRate && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
            >
              <h2 className="text-3xl font-black mb-6 text-gray-900 dark:text-white">
                Payment
              </h2>

              <div className="mb-8 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    Selected Carrier:
                  </span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {selectedRate.carrier}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    Service:
                  </span>
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {selectedRate.service_name}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    Transit Time:
                  </span>
                  <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {selectedRate.transit_days[0]}-
                    {selectedRate.transit_days[1]} days
                  </span>
                </div>
                <div className="pt-4 border-t-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      Total:
                    </span>
                    <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                      ${parseFloat(selectedRate.total).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800 mb-6">
                <Shield className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Secure payment powered by Stripe
                </span>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <motion.button
                  onClick={handlePayment}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Pay with Stripe"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Label Generated */}
          {step === 4 && labelGenerated && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-green-500 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30 mb-6"
              >
                <CheckCircle className="w-16 h-16 text-green-500" />
              </motion.div>
              <h2 className="text-3xl font-black mb-4 text-gray-900 dark:text-white">
                Label Generated Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your shipping label is ready. Download and print it to attach to
                your package.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={labelGenerated.label_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                >
                  <Download className="w-5 h-5" />
                  Download Label
                </a>
                <button
                  onClick={() => window.print()}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Printer className="w-5 h-5" />
                  Print Label
                </button>
              </div>
              <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Tracking Number: {labelGenerated.tracking_number}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Your package will be automatically tracked once it's shipped
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
