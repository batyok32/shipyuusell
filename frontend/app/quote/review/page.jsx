"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  MapPin,
  Package,
  DollarSign,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  Truck,
  Plane,
  Ship,
  Train,
  Calendar,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, logisticsAPI } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { AnimatePresence } from "framer-motion";

export default function QuoteReviewPage() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [quoteData, setQuoteData] = useState(null);
  const [quoteRequest, setQuoteRequest] = useState(null);

  const [originAddress, setOriginAddress] = useState({
    full_name: "",
    company: "",
    street_address: "",
    street_address_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    phone: "",
  });

  const [destinationAddress, setDestinationAddress] = useState({
    full_name: "",
    company: "",
    street_address: "",
    street_address_2: "",
    city: "",
    state_province: "",
    postal_code: "",
    country: "",
    phone: "",
  });

  // Store initial values to determine which fields were pre-filled
  const [initialOriginAddress, setInitialOriginAddress] = useState(null);
  const [initialDestinationAddress, setInitialDestinationAddress] =
    useState(null);

  // Address verification state
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [addressVerificationModal, setAddressVerificationModal] =
    useState(null); // { type: 'origin'|'destination', original: {}, validated: {} }
  const [verifiedAddresses, setVerifiedAddresses] = useState({
    origin: null,
    destination: null,
  });
  const [addressChanged, setAddressChanged] = useState({
    origin: false,
    destination: false,
  });

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated) {
      toast.error("Please log in to proceed with your quote");
      const currentUrl = window.location.href;
      router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Check for quote_request_id in URL (if redirected from login)
    const urlParams = new URLSearchParams(window.location.search);
    const quoteRequestId = urlParams.get("quote_request_id");

    // Load quote data from sessionStorage
    const storedQuote = sessionStorage.getItem("selectedQuote");
    if (!storedQuote && !quoteRequestId) {
      toast.error("No quote selected. Please get a quote first.");
      router.push("/quote");
      return;
    }

    try {
      if (storedQuote) {
        const data = JSON.parse(storedQuote);
        setQuoteData(data.quote);
        setQuoteRequest(data.quoteRequest);

        // Pre-populate full addresses from stored quote data
        // Priority: quoteRequest.origin_country > origin_address.country
        const originCountryCode = (
          data.quoteRequest?.origin_country ||
          data.origin_address?.country ||
          ""
        ).toUpperCase();

        if (data.origin_address) {
          const initialOrigin = {
            full_name: data.origin_address.full_name || "",
            company: data.origin_address.company || "",
            street_address: data.origin_address.street_address || "",
            street_address_2: data.origin_address.street_address_2 || "",
            city: data.origin_address.city || "",
            state_province: data.origin_address.state_province || "",
            postal_code: data.origin_address.postal_code || "",
            country: originCountryCode, // Use quoteRequest country, not address country
            phone: data.origin_address.phone || "",
            email: data.origin_address.email || "",
          };
          setOriginAddress(initialOrigin);
          setInitialOriginAddress(initialOrigin); // Store initial state for readonly check
        } else if (data.quoteRequest?.origin_country) {
          // Fallback: just country if address not stored
          const initialOrigin = {
            full_name: "",
            company: "",
            street_address: "",
            street_address_2: "",
            city: "",
            state_province: "",
            postal_code: "",
            country: originCountryCode,
            phone: "",
            email: "",
          };
          setOriginAddress(initialOrigin);
          setInitialOriginAddress(initialOrigin);
        }

        // Pre-populate destination address
        // Priority: quoteRequest.destination_country > destination_address.country
        // This ensures we use the country from the quote, not stale address data
        const destinationCountryCode = (
          data.quoteRequest?.destination_country ||
          data.destination_address?.country ||
          ""
        ).toUpperCase();

        if (data.destination_address) {
          const initialDestination = {
            full_name: data.destination_address.full_name || "",
            company: data.destination_address.company || "",
            street_address: data.destination_address.street_address || "",
            street_address_2: data.destination_address.street_address_2 || "",
            city: data.destination_address.city || "",
            state_province: data.destination_address.state_province || "",
            postal_code: data.destination_address.postal_code || "",
            country: destinationCountryCode, // Use quoteRequest country, not address country
            phone: data.destination_address.phone || "",
            email: data.destination_address.email || "",
          };
          setDestinationAddress(initialDestination);
          setInitialDestinationAddress(initialDestination); // Store initial state for readonly check
        } else if (data.quoteRequest?.destination_country) {
          // Fallback: just country if address not stored
          const initialDestination = {
            full_name: "",
            company: "",
            street_address: "",
            street_address_2: "",
            city: "",
            state_province: "",
            postal_code: "",
            country: destinationCountryCode,
            phone: "",
            email: "",
          };
          setDestinationAddress(initialDestination);
          setInitialDestinationAddress(initialDestination);
        }

        console.log("quoteData", quoteData);
        console.log(
          "Destination country from quoteRequest:",
          data.quoteRequest?.destination_country
        );
        console.log(
          "Destination country from address:",
          data.destination_address?.country
        );
        console.log(
          "Using destination country (priority: quoteRequest > address):",
          destinationCountryCode
        );
      } else if (quoteRequestId) {
        // If we have quote_request_id but no stored quote, fetch it
        // This shouldn't normally happen, but handle it gracefully
        toast.error("Please select a quote again");
        router.push("/quote");
      }
    } catch (err) {
      toast.error("Invalid quote data");
      router.push("/quote");
    }

    // Fetch countries
    fetchCountries();
  }, [isAuthenticated, router]);

  const fetchCountries = async () => {
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/logistics/countries/`);
      const data = await response.json();
      // Normalize country codes to uppercase for consistency
      const normalizedCountries = data.map((country) => ({
        ...country,
        code: country.code?.toUpperCase() || country.code,
      }));
      // Sort countries alphabetically by name for better UX
      normalizedCountries.sort((a, b) => a.name.localeCompare(b.name));
      setCountries(normalizedCountries);
      console.log("Countries loaded:", normalizedCountries.length);
      const caCountry = normalizedCountries.find((c) => c.code === "CA");
      console.log("CA country found:", caCountry);

      // Ensure destination country is properly set if it exists
      if (destinationAddress.country) {
        const countryCode = destinationAddress.country.toUpperCase();
        const foundCountry = normalizedCountries.find(
          (c) => c.code === countryCode
        );
        if (foundCountry) {
          console.log(`Country ${countryCode} matched: ${foundCountry.name}`);
        } else {
          console.warn(`Country ${countryCode} not found in countries list`);
        }
      }
    } catch (err) {
      console.error("Failed to fetch countries:", err);
    }
  };

  // Ensure country codes are normalized when countries load
  useEffect(() => {
    if (countries.length > 0 && destinationAddress.country) {
      const normalizedCountry = destinationAddress.country.toUpperCase();
      if (normalizedCountry !== destinationAddress.country) {
        handleAddressChange("destination", "country", normalizedCountry);
      }
    }
    if (countries.length > 0 && originAddress.country) {
      const normalizedCountry = originAddress.country.toUpperCase();
      if (normalizedCountry !== originAddress.country) {
        handleAddressChange("origin", "country", normalizedCountry);
      }
    }
  }, [countries.length]);

  // Track address changes
  const handleAddressChange = (type, field, value) => {
    if (type === "origin") {
      setOriginAddress((prev) => ({
        ...prev,
        [field]: value,
      }));
    } else {
      setDestinationAddress((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
    // Mark address as changed
    setAddressChanged((prev) => ({ ...prev, [type]: true }));
    // Clear verified address since it changed
    setVerifiedAddresses((prev) => ({ ...prev, [type]: null }));
  };

  // Verify address with EasyShip
  const verifyAddress = async (address, type) => {
    if (
      !address.street_address ||
      !address.city ||
      !address.postal_code ||
      !address.country
    ) {
      return null; // Skip verification if required fields are missing
    }

    try {
      setVerifyingAddress(true);
      const response = await logisticsAPI.validateAddress({
        street_address: address.street_address,
        street_address_2: address.street_address_2 || "",
        city: address.city,
        state_province: address.state_province || "",
        postal_code: address.postal_code,
        country: address.country,
        country_alpha2: address.country,
        company_name: address.company || "",
      });

      if (response.data.success && response.data.validated) {
        const validated = response.data.validated_address;
        const original = response.data.original_address;

        // Check if address was actually changed
        const addressChanged =
          validated.street_address !== original.street_address ||
          validated.city !== original.city ||
          validated.postal_code !== original.postal_code ||
          validated.state_province !== original.state_province;

        if (addressChanged) {
          // Show modal to ask user if they want to use validated address
          setAddressVerificationModal({
            type,
            original: address,
            validated: validated,
          });
          return false; // Don't proceed yet, wait for user confirmation
        } else {
          // Address is valid, no changes needed
          setVerifiedAddresses((prev) => ({ ...prev, [type]: validated }));
          setAddressChanged((prev) => ({ ...prev, [type]: false }));
          return true; // Proceed
        }
      }
      return true; // If validation fails, proceed with original address
    } catch (error) {
      console.error("Address verification error:", error);
      toast.error("Address verification failed. Using your entered address.");
      return true; // Proceed with original address on error
    } finally {
      setVerifyingAddress(false);
    }
  };

  // Handle user accepting validated address
  const acceptValidatedAddress = (type) => {
    const validated = addressVerificationModal.validated;
    if (type === "origin") {
      setOriginAddress((prev) => ({
        ...prev,
        ...validated,
        // Preserve fields that aren't part of validation
        full_name: prev.full_name,
        phone: prev.phone,
        email: prev.email,
      }));
    } else {
      setDestinationAddress((prev) => ({
        ...prev,
        ...validated,
        // Preserve fields that aren't part of validation
        full_name: prev.full_name,
        phone: prev.phone,
        email: prev.email,
      }));
    }
    setVerifiedAddresses((prev) => ({ ...prev, [type]: validated }));
    setAddressChanged((prev) => ({ ...prev, [type]: false }));
    setAddressVerificationModal(null);
  };

  // Handle user rejecting validated address
  const rejectValidatedAddress = (type) => {
    setVerifiedAddresses((prev) => ({ ...prev, [type]: null }));
    setAddressChanged((prev) => ({ ...prev, [type]: false }));
    setAddressVerificationModal(null);
  };

  const handleContinue = async () => {
    // Validate addresses
    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !originAddress.full_name ||
      !originAddress.street_address ||
      !originAddress.city ||
      !originAddress.postal_code ||
      !originAddress.country ||
      !originAddress.phone ||
      !originAddress.email ||
      !emailRegex.test(originAddress.email)
    ) {
      toast.error(
        "Please fill in all required origin address fields, including a valid email address"
      );
      return;
    }

    if (
      !destinationAddress.full_name ||
      !destinationAddress.street_address ||
      !destinationAddress.city ||
      !destinationAddress.postal_code ||
      !destinationAddress.country ||
      !destinationAddress.phone ||
      !destinationAddress.email ||
      !emailRegex.test(destinationAddress.email)
    ) {
      toast.error(
        "Please fill in all required destination address fields, including a valid email address"
      );
      return;
    }

    // Verify addresses before submitting if they have changed or haven't been verified
    if (addressChanged.origin || !verifiedAddresses.origin) {
      const canProceed = await verifyAddress(originAddress, "origin");
      if (!canProceed) {
        return; // Wait for user to accept/reject validated address
      }
    }

    if (addressChanged.destination || !verifiedAddresses.destination) {
      const canProceed = await verifyAddress(destinationAddress, "destination");
      if (!canProceed) {
        return; // Wait for user to accept/reject validated address
      }
    }

    setLoading(true);
    try {
      // Use proceed_with_quote endpoint
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      // Get quote_request_id from stored data
      const storedQuote = sessionStorage.getItem("selectedQuote");
      const storedData = storedQuote ? JSON.parse(storedQuote) : null;
      const quoteRequestId =
        storedData?.quoteRequestId || quoteRequest?.quote_request_id;

      if (!quoteRequestId) {
        throw new Error("Quote request ID not found. Please get a new quote.");
      }

      // Use the api client to ensure proper authentication and token handling
      // Validate EasyShip rate for local shipping
      if (quoteData.is_local_shipping && !quoteData.easyship_rate_id) {
        toast.error(
          "Invalid shipping option selected. Please go back and select a valid shipping option."
        );
        return;
      }

      const response = await api.post("/logistics/proceed-with-quote/", {
        quote_request_id: quoteRequestId,
        selected_quote: quoteData,
        origin_address: {
          ...originAddress,
          dimensions: quoteRequest?.dimensions || {},
          declared_value: quoteRequest?.declared_value || 0,
        },
        destination_address: destinationAddress,
      });

      const data = response.data;

      // Check if quote was already converted to shipment
      if (data.already_converted) {
        const isPaid = data.shipment?.is_paid || data.is_paid || false;
        if (!isPaid) {
          toast.error(
            "This quote has already been converted to a shipment, but payment is required before you can generate labels or schedule pickups. Please complete payment first.",
            { duration: 7000 }
          );
          // Redirect to payment page if shipment_id is available
          if (data.shipment_id) {
            router.push(`/quote/payment?shipment_id=${data.shipment_id}`);
            return;
          }
        } else {
          toast(
            data.message ||
              "This quote has already been converted to a shipment.",
            { icon: "ℹ️", duration: 5000 }
          );
        }
        // Redirect to the shipment tracking page or dashboard
        const redirectUrl =
          data.redirect_url || `/track/${data.shipment_number}` || "/dashboard";
        router.push(redirectUrl);
        return;
      }

      // Store shipment data and navigate to payment
      sessionStorage.setItem("shipmentData", JSON.stringify(data.shipment));
      router.push(`/quote/payment?shipment_id=${data.shipment_id}`);
    } catch (err) {
      // Check if the error indicates the quote was already converted
      if (err.response?.data?.already_converted) {
        const data = err.response.data;
        const isPaid = data.shipment?.is_paid || data.is_paid || false;
        if (!isPaid) {
          toast.error(
            "This quote has already been converted to a shipment, but payment is required before you can generate labels or schedule pickups. Please complete payment first.",
            { duration: 7000 }
          );
          // Redirect to payment page if shipment_id is available
          if (data.shipment_id) {
            router.push(`/quote/payment?shipment_id=${data.shipment_id}`);
            return;
          }
        } else {
          toast(
            data.message ||
              "This quote has already been converted to a shipment.",
            { icon: "ℹ️", duration: 5000 }
          );
        }
        const redirectUrl =
          data.redirect_url || `/track/${data.shipment_number}` || "/dashboard";
        router.push(redirectUrl);
        return;
      }
      toast.error(
        err.response?.data?.error || err.message || "Failed to create shipment"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!quoteData || !quoteRequest) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const getTransportIcon = (modeName) => {
    const modeLower = modeName?.toLowerCase() || "";
    if (modeLower.includes("air")) return Plane;
    if (modeLower.includes("sea")) return Ship;
    if (modeLower.includes("rail")) return Train;
    return Truck;
  };

  const TransportIcon = getTransportIcon(quoteData.transport_mode_name);

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
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-3 sm:mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Review Your Quote
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">
              Enter your shipping addresses to proceed
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
            {/* Quote Summary */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1 order-2 lg:order-1"
            >
              <div className="card-modern p-4 sm:p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 lg:sticky lg:top-24">
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-4 sm:mb-6">
                  Quote Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-900/20">
                    <div className="p-2 rounded-lg bg-orange-500">
                      <TransportIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Transport Mode
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {quoteData.transport_mode_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                    <div className="p-2 rounded-lg bg-blue-500">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Carrier
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {quoteData.carrier}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <div className="p-2 rounded-lg bg-green-500">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Transit Time
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {quoteData.transit_days[0]}-{quoteData.transit_days[1]}{" "}
                        days
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                      Total
                    </span>
                    <span className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                      ${quoteData.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Base Rate:</span>
                      <span>
                        ${parseFloat(quoteData.base_rate || 0).toFixed(2)}
                      </span>
                    </div>
                    {quoteData.fuel_surcharge !== undefined && (
                      <div className="flex justify-between">
                        <span>Fuel Surcharge:</span>
                        <span>
                          $
                          {parseFloat(quoteData.fuel_surcharge || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {quoteData.security_fee !== undefined && (
                      <div className="flex justify-between">
                        <span>Security Fee:</span>
                        <span>
                          ${parseFloat(quoteData.security_fee || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {quoteData.pickup_cost > 0 && (
                      <div className="flex justify-between text-orange-600 dark:text-orange-400">
                        <span>Pickup Cost:</span>
                        <span className="font-semibold">
                          ${parseFloat(quoteData.pickup_cost).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Insurance:</span>
                      <span>
                        $
                        {(
                          (parseFloat(quoteRequest.declared_value) || 0) * 0.01
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Address Forms */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-2 space-y-6 md:space-y-8 order-1 lg:order-2"
            >
              {/* Origin Address */}
              <div className="card-modern p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">Address Information</p>
                      <p>
                        Fields that were used to calculate your quote are locked
                        to maintain accuracy. Empty fields can be filled in to
                        complete your shipping information.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                    Origin Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={originAddress.full_name}
                      onChange={(e) =>
                        setOriginAddress({
                          ...originAddress,
                          full_name: e.target.value,
                        })
                      }
                      readOnly={!!initialOriginAddress?.full_name}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.full_name
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Company
                    </label>
                    <input
                      type="text"
                      value={originAddress.company}
                      onChange={(e) =>
                        setOriginAddress({
                          ...originAddress,
                          company: e.target.value,
                        })
                      }
                      readOnly={!!initialOriginAddress?.company}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.company
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={originAddress.phone}
                      onChange={(e) =>
                        setOriginAddress({
                          ...originAddress,
                          phone: e.target.value,
                        })
                      }
                      readOnly={!!initialOriginAddress?.phone}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.phone
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={originAddress.email}
                      onChange={(e) =>
                        setOriginAddress({
                          ...originAddress,
                          email: e.target.value,
                        })
                      }
                      readOnly={!!initialOriginAddress?.email}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.email
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={originAddress.street_address}
                      onChange={(e) =>
                        handleAddressChange(
                          "origin",
                          "street_address",
                          e.target.value
                        )
                      }
                      readOnly={!!initialOriginAddress?.street_address}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.street_address
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Street Address 2
                    </label>
                    <input
                      type="text"
                      value={originAddress.street_address_2}
                      onChange={(e) =>
                        handleAddressChange(
                          "origin",
                          "street_address_2",
                          e.target.value
                        )
                      }
                      readOnly={!!initialOriginAddress?.street_address_2}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.street_address_2
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      City *
                    </label>
                    <input
                      type="text"
                      value={originAddress.city}
                      onChange={(e) =>
                        handleAddressChange("origin", "city", e.target.value)
                      }
                      readOnly={!!initialOriginAddress?.city}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.city
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={originAddress.state_province}
                      onChange={(e) =>
                        handleAddressChange(
                          "origin",
                          "state_province",
                          e.target.value
                        )
                      }
                      readOnly={!!initialOriginAddress?.state_province}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.state_province
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={originAddress.postal_code}
                      onChange={(e) =>
                        handleAddressChange(
                          "origin",
                          "postal_code",
                          e.target.value
                        )
                      }
                      readOnly={!!initialOriginAddress?.postal_code}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.postal_code
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Country *
                    </label>
                    <select
                      key={`origin-country-${countries.length}-${originAddress.country}`}
                      value={
                        originAddress.country
                          ? originAddress.country.toUpperCase()
                          : ""
                      }
                      onChange={(e) =>
                        setOriginAddress({
                          ...originAddress,
                          country: e.target.value.toUpperCase(),
                        })
                      }
                      disabled={!!initialOriginAddress?.country}
                      suppressHydrationWarning
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialOriginAddress?.country
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.length > 0 ? (
                        countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))
                      ) : originAddress.country ? (
                        <option value={originAddress.country}>
                          {originAddress.country} (Loading...)
                        </option>
                      ) : null}
                    </select>
                  </div>
                </div>
              </div>

              {/* Destination Address */}
              <div className="card-modern p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-500">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                    Destination Address
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.full_name}
                      onChange={(e) =>
                        setDestinationAddress({
                          ...destinationAddress,
                          full_name: e.target.value,
                        })
                      }
                      readOnly={!!initialDestinationAddress?.full_name}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.full_name
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Company
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.company}
                      onChange={(e) =>
                        setDestinationAddress({
                          ...destinationAddress,
                          company: e.target.value,
                        })
                      }
                      readOnly={!!initialDestinationAddress?.company}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.company
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={destinationAddress.phone}
                      onChange={(e) =>
                        setDestinationAddress({
                          ...destinationAddress,
                          phone: e.target.value,
                        })
                      }
                      readOnly={!!initialDestinationAddress?.phone}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.phone
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={destinationAddress.email}
                      onChange={(e) =>
                        setDestinationAddress({
                          ...destinationAddress,
                          email: e.target.value,
                        })
                      }
                      readOnly={!!initialDestinationAddress?.email}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.email
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                      placeholder="recipient@example.com"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.street_address}
                      onChange={(e) =>
                        handleAddressChange(
                          "destination",
                          "street_address",
                          e.target.value
                        )
                      }
                      readOnly={!!initialDestinationAddress?.street_address}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.street_address
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Street Address 2
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.street_address_2}
                      onChange={(e) =>
                        handleAddressChange(
                          "destination",
                          "street_address_2",
                          e.target.value
                        )
                      }
                      readOnly={!!initialDestinationAddress?.street_address_2}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.street_address_2
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      City *
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.city}
                      onChange={(e) =>
                        handleAddressChange(
                          "destination",
                          "city",
                          e.target.value
                        )
                      }
                      readOnly={!!initialDestinationAddress?.city}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.city
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      State/Province
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.state_province}
                      onChange={(e) =>
                        handleAddressChange(
                          "destination",
                          "state_province",
                          e.target.value
                        )
                      }
                      readOnly={!!initialDestinationAddress?.state_province}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.state_province
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={destinationAddress.postal_code}
                      onChange={(e) =>
                        handleAddressChange(
                          "destination",
                          "postal_code",
                          e.target.value
                        )
                      }
                      readOnly={!!initialDestinationAddress?.postal_code}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.postal_code
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase">
                      Country *
                    </label>
                    <select
                      key={`destination-country-${countries.length}-${destinationAddress.country}`}
                      value={
                        destinationAddress.country
                          ? destinationAddress.country.toUpperCase()
                          : ""
                      }
                      onChange={(e) => {
                        const selectedCountry = e.target.value.toUpperCase();
                        console.log("Country selected:", selectedCountry);
                        handleAddressChange(
                          "destination",
                          "country",
                          selectedCountry
                        );
                      }}
                      disabled={!!initialDestinationAddress?.country}
                      suppressHydrationWarning
                      className={`w-full px-4 py-3 rounded-xl border-2 ${
                        initialDestinationAddress?.country
                          ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                      required
                    >
                      <option value="">Select Country</option>
                      {countries.length > 0 ? (
                        countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))
                      ) : destinationAddress.country ? (
                        <option
                          value={destinationAddress.country.toUpperCase()}
                        >
                          {destinationAddress.country.toUpperCase()}{" "}
                          (Loading...)
                        </option>
                      ) : null}
                    </select>
                    {destinationAddress.country && countries.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {countries.find(
                          (c) =>
                            c.code === destinationAddress.country.toUpperCase()
                        )?.name ||
                          `Code: ${destinationAddress.country.toUpperCase()}`}
                      </p>
                    )}
                    {destinationAddress.country &&
                      countries.length > 0 &&
                      !countries.find(
                        (c) => c.code === destinationAddress.country
                      ) && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Country code "{destinationAddress.country}" not found
                          in list
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* Pickup Notice */}
              {quoteData?.pickup_required && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        Pickup Required
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This shipment requires pickup. After payment, you'll be
                        able to schedule a pickup time. Pickup cost: $
                        {quoteData.pickup_cost?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Local Shipping Notice */}
              {quoteData?.is_local_shipping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 mb-6"
                >
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white mb-1">
                        Local Shipping
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This is a local shipment. You'll receive a label to drop
                        off at the carrier location (e.g., USPS).
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Continue Button */}
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleContinue}
                disabled={loading}
                className="w-full px-4 sm:px-6 md:px-8 py-4 sm:py-5 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                    <span className="hidden sm:inline">
                      Creating Shipment...
                    </span>
                    <span className="sm:hidden">Creating...</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">
                      Continue to Payment
                    </span>
                    <span className="sm:hidden">Continue</span>
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />

      {/* Address Verification Modal */}
      <AnimatePresence>
        {addressVerificationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setAddressVerificationModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Address Verification
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We found a corrected address. Would you like to use it?
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Original Address */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    Your Entered Address
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {addressVerificationModal.original.street_address}
                      {addressVerificationModal.original.street_address_2 && (
                        <span>
                          , {addressVerificationModal.original.street_address_2}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {addressVerificationModal.original.city}
                      {addressVerificationModal.original.state_province && (
                        <span>
                          , {addressVerificationModal.original.state_province}
                        </span>
                      )}{" "}
                      {addressVerificationModal.original.postal_code}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {addressVerificationModal.original.country}
                    </p>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-6 h-6 text-blue-500" />
                </div>

                {/* Validated Address */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Verified Address (Recommended)
                  </h4>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-2 border-green-200 dark:border-green-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {addressVerificationModal.validated.street_address}
                      {addressVerificationModal.validated.street_address_2 && (
                        <span>
                          ,{" "}
                          {addressVerificationModal.validated.street_address_2}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {addressVerificationModal.validated.city}
                      {addressVerificationModal.validated.state_province && (
                        <span>
                          , {addressVerificationModal.validated.state_province}
                        </span>
                      )}{" "}
                      {addressVerificationModal.validated.postal_code}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {addressVerificationModal.validated.country}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() =>
                      acceptValidatedAddress(addressVerificationModal.type)
                    }
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Yes, Use Verified Address
                  </button>
                  <button
                    onClick={() =>
                      rejectValidatedAddress(addressVerificationModal.type)
                    }
                    className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                  >
                    No, Keep My Address
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay for address verification */}
      {verifyingAddress && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Verifying address...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
