"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  MapPin,
  Weight,
  Ruler,
  DollarSign,
  Plane,
  Ship,
  Train,
  Truck,
  Loader2,
  ArrowRight,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Package,
  AlertCircle,
  Layers,
  Car,
  Boxes,
  Scale,
  Calendar,
  Info,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, logisticsAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function QuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("price"); // "price" or "speed"
  const [quoteRequestId, setQuoteRequestId] = useState(null);
  const [pickupRequired, setPickupRequired] = useState(false);
  const [isLocalShipping, setIsLocalShipping] = useState(false);
  const [availableModes, setAvailableModes] = useState([]);
  const [loadingModes, setLoadingModes] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);

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

  const [formData, setFormData] = useState({
    origin_country: "",
    destination_country: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    declared_value: "",
    shipping_category: "auto", // auto, small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle, super_heavy
    // Address fields (optional, but required for local shipping or pickup)
    origin_address: {
      full_name: "",
      company: "",
      street_address: "",
      street_address_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      phone: "",
      email: "",
    },
    destination_address: {
      full_name: "",
      company: "",
      street_address: "",
      street_address_2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
      phone: "",
      email: "",
    },
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
  });

  const shippingCategories = [
    {
      value: "auto",
      label: "Auto-detect (Recommended)",
      description: "Automatically select based on weight",
    },
    {
      value: "small_parcel",
      label: "Small Parcel (0-30kg)",
      description: "Courier shipping",
    },
    {
      value: "heavy_parcel",
      label: "Heavy Parcel (30-100kg)",
      description: "Freight carriers",
    },
    {
      value: "ltl_freight",
      label: "LTL Freight (100-4000kg)",
      description: "Less Than Truckload, palletized",
    },
    {
      value: "ftl_freight",
      label: "FTL Freight (4000+kg)",
      description: "Full Truckload",
    },
    {
      value: "vehicle",
      label: "Vehicle",
      description: "Cars, motorcycles, boats (RoRo/Container)",
    },
    {
      value: "super_heavy",
      label: "Super Heavy/Oversized",
      description: "Construction equipment, permits required",
    },
  ];

  useEffect(() => {
    fetchCountries();
  }, []);

  // Fetch available transport modes when countries are selected
  useEffect(() => {
    if (formData.origin_country && formData.destination_country) {
      fetchAvailableModes();
    } else {
      setAvailableModes([]);
      setDeliveryAvailable(true);
    }
  }, [
    formData.origin_country,
    formData.destination_country,
    formData.shipping_category,
  ]);

  // Update address countries when country selections change
  useEffect(() => {
    if (formData.origin_country) {
      setFormData((prev) => ({
        ...prev,
        origin_address: {
          ...prev.origin_address,
          country: prev.origin_address.country || prev.origin_country,
        },
      }));
      // Mark origin address as changed when country changes
      setAddressChanged((prev) => ({ ...prev, origin: true }));
    }
  }, [formData.origin_country]);

  useEffect(() => {
    if (formData.destination_country) {
      setFormData((prev) => ({
        ...prev,
        destination_address: {
          ...prev.destination_address,
          country: prev.destination_address.country || prev.destination_country,
        },
      }));
      // Mark destination address as changed when country changes
      setAddressChanged((prev) => ({ ...prev, destination: true }));
    }
  }, [formData.destination_country]);

  // Track address changes to trigger re-verification
  const handleAddressChange = (type, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [type === "origin" ? "origin_address" : "destination_address"]: {
        ...prev[type === "origin" ? "origin_address" : "destination_address"],
        [field]: value,
      },
    }));
    // Mark address as changed
    setAddressChanged((prev) => ({ ...prev, [type]: true }));
    // Clear verified address since it changed
    setVerifiedAddresses((prev) => ({ ...prev, [type]: null }));
  };

  // Verify address with EasyShip
  const verifyAddress = async (address, type) => {
    console.log("Verifying address:", address);

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
      logger("Address verification response:", response);
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
    setFormData((prev) => ({
      ...prev,
      [type === "origin" ? "origin_address" : "destination_address"]: {
        ...prev[type === "origin" ? "origin_address" : "destination_address"],
        ...validated,
        // Preserve fields that aren't part of validation
        full_name:
          prev[type === "origin" ? "origin_address" : "destination_address"]
            .full_name,
        phone:
          prev[type === "origin" ? "origin_address" : "destination_address"]
            .phone,
        email:
          prev[type === "origin" ? "origin_address" : "destination_address"]
            .email,
      },
    }));
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

  // Countries that require postal code
  const postalCodeRequiredCountries = [
    "AD",
    "AF",
    "AI",
    "AL",
    "AM",
    "AQ",
    "AR",
    "AS",
    "AT",
    "AU",
    "AX",
    "AZ",
    "BA",
    "BB",
    "BD",
    "BE",
    "BG",
    "BL",
    "BM",
    "BN",
    "BQ",
    "BR",
    "BT",
    "BV",
    "BY",
    "CA",
    "CC",
    "CH",
    "CL",
    "CN",
    "CO",
    "CR",
    "CU",
    "CV",
    "CX",
    "CY",
    "CZ",
    "DE",
    "DK",
    "DO",
    "DZ",
    "EC",
    "EE",
    "EG",
    "EH",
    "ES",
    "ET",
    "FI",
    "FK",
    "FM",
    "FO",
    "FR",
    "GA",
    "GB",
    "GE",
    "GF",
    "GG",
    "GI",
    "GL",
    "GP",
    "GR",
    "GS",
    "GT",
    "GU",
    "GW",
    "HM",
    "HN",
    "HR",
    "HT",
    "HU",
    "ID",
    "IE",
    "IL",
    "IM",
    "IN",
    "IO",
    "IQ",
    "IR",
    "IS",
    "IT",
    "JE",
    "JO",
    "JP",
    "KG",
    "KH",
    "KR",
    "KW",
    "KY",
    "KZ",
    "LA",
    "LB",
    "LI",
    "LK",
    "LR",
    "LS",
    "LT",
    "LU",
    "LV",
    "MA",
    "MC",
    "MD",
    "ME",
    "MF",
    "MG",
    "MH",
    "MK",
    "MM",
    "MN",
    "MP",
    "MQ",
    "MT",
    "MV",
    "MX",
    "MY",
    "MZ",
    "NA",
    "NC",
    "NE",
    "NF",
    "NG",
    "NI",
    "NL",
    "NO",
    "NP",
    "NZ",
    "OM",
    "PE",
    "PF",
    "PG",
    "PH",
    "PK",
    "PL",
    "PM",
    "PN",
    "PR",
    "PS",
    "PT",
    "PW",
    "PY",
    "RE",
    "RO",
    "RS",
    "RU",
    "SD",
    "SE",
    "SG",
    "SH",
    "SI",
    "SJ",
    "SK",
    "SM",
    "SN",
    "SS",
    "SV",
    "SX",
    "SZ",
    "TC",
    "TD",
    "TH",
    "TJ",
    "TM",
    "TN",
    "TR",
    "TW",
    "UA",
    "UM",
    "US",
    "UY",
    "UZ",
    "VA",
    "VC",
    "VE",
    "VG",
    "VI",
    "VN",
    "WF",
    "WS",
    "YT",
    "ZA",
    "ZM",
  ];

  // Countries that require state/province
  const stateRequiredCountries = [
    "AU",
    "CA",
    "CN",
    "ID",
    "MX",
    "MY",
    "TH",
    "US",
    "VN",
  ];

  // Calculate if addresses are required
  const isLocal = formData.origin_country === formData.destination_country;
  const willRequirePickup =
    parseFloat(formData.weight) >= 100 ||
    formData.shipping_category === "vehicle" ||
    formData.shipping_category === "super_heavy";

  // Check if origin country requires detailed address fields
  const originNeedsPostalCode =
    formData.origin_country &&
    postalCodeRequiredCountries.includes(formData.origin_country);
  const originNeedsState =
    formData.origin_country &&
    stateRequiredCountries.includes(formData.origin_country);
  const originNeedsDetailedAddress = originNeedsPostalCode || originNeedsState;

  // Show address fields if: local shipping, pickup required, OR origin country requires detailed address
  const addressesRequired =
    isLocal || willRequirePickup || originNeedsDetailedAddress;

  const fetchAvailableModes = async () => {
    setLoadingModes(true);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const params = new URLSearchParams({
        origin_country: formData.origin_country,
        destination_country: formData.destination_country,
      });
      // Add shipping category filter if not auto
      if (formData.shipping_category && formData.shipping_category !== "auto") {
        params.append("shipping_category", formData.shipping_category);
      }
      const response = await fetch(
        `${API_URL}/api/v1/logistics/available-transport-modes/?${params.toString()}`
      );
      const data = await response.json();
      setAvailableModes(data.available_modes || []);
      setDeliveryAvailable(data.delivery_available !== false);
    } catch (err) {
      console.error("Failed to fetch transport modes:", err);
      setDeliveryAvailable(true); // Default to true on error
    } finally {
      setLoadingModes(false);
    }
  };

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

  const handleCalculate = async (e) => {
    e.preventDefault();
    let isLocalCheck = formData.origin_country === formData.destination_country;
    // Verify addresses before submitting if they have changed or haven't been verified
    const needsOriginAddress =
      addressesRequired && formData.origin_address.street_address;
    const needsDestinationAddress =
      isLocalCheck && formData.destination_address.street_address;

    if (
      needsOriginAddress &&
      (addressChanged.origin || !verifiedAddresses.origin)
    ) {
      const canProceed = await verifyAddress(formData.origin_address, "origin");
      if (!canProceed) {
        return; // Wait for user to accept/reject validated address
      }
    }

    if (
      needsDestinationAddress &&
      (addressChanged.destination || !verifiedAddresses.destination)
    ) {
      const canProceed = await verifyAddress(
        formData.destination_address,
        "destination"
      );
      if (!canProceed) {
        return; // Wait for user to accept/reject validated address
      }
    }

    // Check if delivery is available
    if (!deliveryAvailable) {
      toast.error(
        "Delivery is not available to this destination. Please contact support."
      );
      return;
    }

    // Category-specific validation
    if (!formData.origin_country || !formData.destination_country) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Weight is required except for vehicles
    if (formData.shipping_category !== "vehicle" && !formData.weight) {
      toast.error("Please fill in weight");
      return;
    }

    // Reuse the same country lists (defined at component level)

    // Check if addresses are required (local shipping or pickup required)
    // const isLocalCheck =
    //   formData.origin_country === formData.destination_country;
    const willRequirePickupCheck =
      parseFloat(formData.weight) >= 100 ||
      formData.shipping_category === "vehicle" ||
      formData.shipping_category === "super_heavy";

    const addressesRequiredCheck = isLocalCheck || willRequirePickupCheck;

    // Always validate origin address based on origin country requirements
    const originCountry =
      formData.origin_address.country || formData.origin_country;
    const needsPostalCode = postalCodeRequiredCountries.includes(originCountry);
    const needsState = stateRequiredCountries.includes(originCountry);

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Email is always required for origin address
    if (
      !formData.origin_address.email ||
      !formData.origin_address.email.trim() ||
      !emailRegex.test(formData.origin_address.email.trim())
    ) {
      toast.error(
        "A valid email address is required for origin address. Please fill in the email field."
      );
      return;
    }

    // City is always required for EasyShip (based on origin country)
    if (!formData.origin_address.city || !formData.origin_address.city.trim()) {
      toast.error(
        "City is required for origin address. Please fill in the city field."
      );
      return;
    }

    // Postal code required for specific countries (based on origin country)
    if (
      needsPostalCode &&
      (!formData.origin_address.postal_code ||
        !formData.origin_address.postal_code.trim())
    ) {
      toast.error(
        "Postal code is required for origin country. Please fill in the postal code field."
      );
      return;
    }

    // State required for specific countries (based on origin country)
    if (
      needsState &&
      (!formData.origin_address.state_province ||
        !formData.origin_address.state_province.trim())
    ) {
      toast.error(
        "State/Province is required for origin country. Please fill in the state/province field."
      );
      return;
    }

    // Additional validation for local shipping or pickup
    if (addressesRequiredCheck) {
      if (
        !formData.origin_address.street_address ||
        !formData.origin_address.country
      ) {
        toast.error(
          "Address is required for local shipping or pickup service. Please fill in all required fields."
        );
        return;
      }
    }

    // Validate destination address (only for local shipping)
    // For local shipping, destination should also be validated based on destination country
    if (isLocalCheck) {
      const destCountry =
        formData.destination_address.country || formData.destination_country;
      const destNeedsPostalCode =
        postalCodeRequiredCountries.includes(destCountry);
      const destNeedsState = stateRequiredCountries.includes(destCountry);

      // Email is required for destination address (local shipping)
      if (
        !formData.destination_address.email ||
        !formData.destination_address.email.trim() ||
        !emailRegex.test(formData.destination_address.email.trim())
      ) {
        toast.error(
          "A valid email address is required for destination address. Please fill in the email field."
        );
        return;
      }

      // City is always required for destination
      if (
        !formData.destination_address.city ||
        !formData.destination_address.city.trim()
      ) {
        toast.error(
          "City is required for destination address. Please fill in the city field."
        );
        return;
      }

      // Postal code required for specific countries (based on destination country)
      if (
        destNeedsPostalCode &&
        (!formData.destination_address.postal_code ||
          !formData.destination_address.postal_code.trim())
      ) {
        toast.error(
          "Postal code is required for destination country. Please fill in the postal code field."
        );
        return;
      }

      // State required for specific countries (based on destination country)
      if (
        destNeedsState &&
        (!formData.destination_address.state_province ||
          !formData.destination_address.state_province.trim())
      ) {
        toast.error(
          "State/Province is required for destination country. Please fill in the state/province field."
        );
        return;
      }

      if (
        !formData.destination_address.street_address ||
        !formData.destination_address.country
      ) {
        toast.error(
          "Destination address is required for local shipping. Please fill in all required fields."
        );
        return;
      }
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

    setLoading(true);
    setError(null);
    try {
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const requestBody = {
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

      // Add addresses if provided OR if origin country requires detailed address
      const needsOriginAddress =
        addressesRequiredCheck || originNeedsDetailedAddress;
      if (needsOriginAddress && formData.origin_address.street_address) {
        requestBody.origin_address = {
          ...formData.origin_address,
          country: formData.origin_address.country || formData.origin_country,
        };
      } else if (originNeedsDetailedAddress) {
        // Even if no street address, we need city/state/postal for countries that require it
        requestBody.origin_address = {
          city: formData.origin_address.city || "",
          state_province: formData.origin_address.state_province || "",
          postal_code: formData.origin_address.postal_code || "",
          country: formData.origin_country,
        };
      }

      // For local shipping, always include destination address (required by EasyShip API)
      if (isLocalCheck) {
        requestBody.destination_address = {
          full_name: formData.destination_address.full_name || "",
          company: formData.destination_address.company || "",
          street_address: formData.destination_address.street_address || "",
          street_address_2: formData.destination_address.street_address_2 || "",
          city: formData.destination_address.city || "",
          state_province: formData.destination_address.state_province || "",
          postal_code: formData.destination_address.postal_code || "",
          country:
            formData.destination_address.country ||
            formData.destination_country,
          phone: formData.destination_address.phone || "",
          email: formData.destination_address.email || "",
        };
      }

      // Add email to origin address if provided
      if (addressesRequiredCheck && formData.origin_address.street_address) {
        requestBody.origin_address.email = formData.origin_address.email || "";
      }

      // Add category-specific data
      if (formData.shipping_category === "vehicle") {
        requestBody.vehicle_details = {
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
        requestBody.freight_class = parseInt(formData.freight_class);
        requestBody.pallet_count = parseInt(formData.pallet_count) || 1;
      }

      if (formData.shipping_category === "super_heavy") {
        requestBody.permits_required = formData.permits_required;
        requestBody.special_handling = formData.special_handling;
      }

      const response = await fetch(
        `${API_URL}/api/v1/logistics/calculate-shipping/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Check if it's a local shipping error with no rates
        if (
          data.is_local_shipping &&
          (!data.quotes || data.quotes.length === 0)
        ) {
          toast.error(
            data.error ||
              "No shipping rates available for this route. Please check your addresses and try again."
          );
        } else {
          toast.error(data.error || "Failed to calculate quotes");
        }
        throw new Error(data.error || "Failed to calculate quotes");
      }

      // Validate that we have quotes for local shipping
      if (
        data.is_local_shipping &&
        (!data.quotes || data.quotes.length === 0)
      ) {
        toast.error(
          "No shipping rates available. Please ensure addresses are complete and try again."
        );
        setError("No shipping rates available for this route.");
        return;
      }

      // Store quote request ID and flags
      setQuoteRequestId(data.quote_request_id);
      setPickupRequired(data.pickup_required || false);
      setIsLocalShipping(data.is_local_shipping || false);

      // Show info about YuuSell handling vs EasyShip
      if (data.is_yuusell_handled) {
        toast(
          "YuuSell handles this shipment with local pickup only. Using our own calculation method.",
          { duration: 6000, icon: "ℹ️" }
        );
      } else if (data.is_local_shipping) {
        toast("Local shipping: Quotes provided via EasyShip partners.", {
          duration: 5000,
          icon: "ℹ️",
        });
      }

      // Sort quotes
      let sortedQuotes = data.quotes || [];
      if (sortBy === "price") {
        sortedQuotes.sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
      } else {
        sortedQuotes.sort((a, b) => a.transit_days[0] - b.transit_days[0]);
      }

      setQuotes(sortedQuotes);

      // Show info about pickup or local shipping
      if (data.pickup_required) {
        toast.success(
          `Found ${sortedQuotes.length} shipping options! Pickup will be scheduled.`,
          { duration: 5000 }
        );
      } else if (data.is_local_shipping) {
        toast.success(`Found ${sortedQuotes.length} local shipping options!`, {
          duration: 5000,
        });
      } else {
        toast.success(`Found ${sortedQuotes.length} shipping options!`);
      }
    } catch (err) {
      setError(err.message || "Failed to calculate quotes");
      toast.error(err.message || "Failed to calculate quotes");
    } finally {
      setLoading(false);
    }
  };

  const transportModeIcons = {
    air: Plane,
    sea: Ship,
    rail: Train,
    road: Truck,
    truck: Truck,
  };

  const getTransportIcon = (modeName) => {
    const modeLower = modeName?.toLowerCase() || "";
    for (const [key, icon] of Object.entries(transportModeIcons)) {
      if (modeLower.includes(key)) {
        return icon;
      }
    }
    return Truck;
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Instant Quote Calculator
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Get Instant Shipping Quote
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Compare rates across all transport modes and carriers in
              real-time. Get the best price for your shipment.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-2"
            >
              <div className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-500">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white">
                    Shipping Details
                  </h2>
                </div>

                <form onSubmit={handleCalculate} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        Origin Country
                      </label>
                      {loadingCountries ? (
                        <div className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
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
                          className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold text-lg"
                          required
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
                    <div>
                      <label className="flex items-center gap-2 text-sm font-bold mb-3 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Destination Country
                      </label>
                      {loadingCountries ? (
                        <div className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
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
                          className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold text-lg"
                          required
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

                  {/* Address Fields - Required for local shipping, pickup, or if origin country requires detailed address */}
                  {(formData.origin_country === formData.destination_country ||
                    parseFloat(formData.weight) >= 100 ||
                    formData.shipping_category === "vehicle" ||
                    formData.shipping_category === "super_heavy" ||
                    (formData.origin_country &&
                      (postalCodeRequiredCountries.includes(
                        formData.origin_country
                      ) ||
                        stateRequiredCountries.includes(
                          formData.origin_country
                        )))) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <MapPin className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Address Information
                          <span className="text-red-500 ml-1">*</span>
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {formData.origin_country ===
                        formData.destination_country
                          ? "Addresses are required for local shipping."
                          : willRequirePickup
                          ? "Address is required for pickup service."
                          : "Origin address details are required for accurate shipping calculations."}
                      </p>

                      {/* Origin Address */}
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-500" />
                          Origin Address (Pickup Location)
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.full_name}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "full_name",
                                  e.target.value
                                )
                              }
                              placeholder="John Doe"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required={addressesRequired}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Company
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.company}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "company",
                                  e.target.value
                                )
                              }
                              placeholder="Company Name"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Street Address *
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.street_address}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "street_address",
                                  e.target.value
                                )
                              }
                              placeholder="123 Main Street"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required={addressesRequired}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Street Address 2
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.street_address_2}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "street_address_2",
                                  e.target.value
                                )
                              }
                              placeholder="Apt, Suite, Unit, etc."
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              City {originNeedsDetailedAddress && "*"}
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.city}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "city",
                                  e.target.value
                                )
                              }
                              placeholder="Los Angeles"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required={
                                originNeedsDetailedAddress || addressesRequired
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              State/Province {originNeedsState && "*"}
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.state_province}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "state_province",
                                  e.target.value
                                )
                              }
                              placeholder="CA"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required={originNeedsState || addressesRequired}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Postal Code {originNeedsPostalCode && "*"}
                            </label>
                            <input
                              type="text"
                              value={formData.origin_address.postal_code}
                              onChange={(e) =>
                                handleAddressChange(
                                  "origin",
                                  "postal_code",
                                  e.target.value
                                )
                              }
                              placeholder="90001"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required={
                                originNeedsPostalCode || addressesRequired
                              }
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Phone
                            </label>
                            <input
                              type="tel"
                              value={formData.origin_address.phone}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  origin_address: {
                                    ...formData.origin_address,
                                    phone: e.target.value,
                                  },
                                })
                              }
                              placeholder="+1-555-123-4567"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                              Email *
                            </label>
                            <input
                              type="email"
                              value={formData.origin_address.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  origin_address: {
                                    ...formData.origin_address,
                                    email: e.target.value,
                                  },
                                })
                              }
                              placeholder="contact@example.com"
                              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* Destination Address - Only for local shipping */}
                      {formData.origin_country ===
                        formData.destination_country && (
                        <div className="space-y-4 pt-4 border-t border-blue-300 dark:border-blue-700">
                          <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" />
                            Destination Address (Delivery Location)
                          </h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Full Name *
                              </label>
                              <input
                                type="text"
                                value={formData.destination_address.full_name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      full_name: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Jane Doe"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Company
                              </label>
                              <input
                                type="text"
                                value={formData.destination_address.company}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      company: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Company Name"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Street Address *
                              </label>
                              <input
                                type="text"
                                value={
                                  formData.destination_address.street_address
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      street_address: e.target.value,
                                    },
                                  })
                                }
                                placeholder="456 Oak Avenue"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Street Address 2
                              </label>
                              <input
                                type="text"
                                value={
                                  formData.destination_address.street_address_2
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      street_address_2: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Apt, Suite, Unit, etc."
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                City *
                              </label>
                              <input
                                type="text"
                                value={formData.destination_address.city}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      city: e.target.value,
                                    },
                                  })
                                }
                                placeholder="New York"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                State/Province *
                              </label>
                              <input
                                type="text"
                                value={
                                  formData.destination_address.state_province
                                }
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      state_province: e.target.value,
                                    },
                                  })
                                }
                                placeholder="NY"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Postal Code *
                              </label>
                              <input
                                type="text"
                                value={formData.destination_address.postal_code}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      postal_code: e.target.value,
                                    },
                                  })
                                }
                                placeholder="10001"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Phone
                              </label>
                              <input
                                type="tel"
                                value={formData.destination_address.phone}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      phone: e.target.value,
                                    },
                                  })
                                }
                                placeholder="+1-555-987-6543"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={formData.destination_address.email}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    destination_address: {
                                      ...formData.destination_address,
                                      email: e.target.value,
                                    },
                                  })
                                }
                                placeholder="recipient@example.com"
                                className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Weight - shown for all categories except vehicles */}
                  {formData.shipping_category !== "vehicle" && (
                    <div>
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
                        min="0.1"
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold text-lg"
                        required
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
                          step="0.1"
                          min="1"
                          className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold"
                        />
                        <input
                          type="number"
                          value={formData.width}
                          onChange={(e) =>
                            setFormData({ ...formData, width: e.target.value })
                          }
                          placeholder="Width"
                          step="0.1"
                          min="1"
                          className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold"
                        />
                        <input
                          type="number"
                          value={formData.height}
                          onChange={(e) =>
                            setFormData({ ...formData, height: e.target.value })
                          }
                          placeholder="Height"
                          step="0.1"
                          min="1"
                          className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold"
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Optional - Default: 10x10x10 cm if not specified
                      </p>
                    </div>
                  )}

                  {/* Vehicle-specific fields */}
                  {formData.shipping_category === "vehicle" && (
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
                  )}

                  {/* Freight Class for LTL and FTL */}
                  {(formData.shipping_category === "ltl_freight" ||
                    formData.shipping_category === "ftl_freight") && (
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
                  )}

                  {/* Super Heavy/Oversized fields */}
                  {formData.shipping_category === "super_heavy" && (
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
                  )}

                  {/* Declared Value - shown for all except vehicles */}
                  {formData.shipping_category !== "vehicle" && (
                    <div>
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
                        placeholder="100.00"
                        step="0.01"
                        min="0"
                        className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold text-lg"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Optional - For insurance purposes
                      </p>
                    </div>
                  )}

                  <div>
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
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all font-semibold text-lg"
                    >
                      {shippingCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} - {cat.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Select shipping category based on weight and item type.
                      Auto-detect recommended.
                    </p>
                  </div>

                  {/* No Delivery Available Message */}
                  {!loadingModes && !deliveryAvailable && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border-2 border-red-200 dark:border-red-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="font-bold text-red-900 dark:text-red-300">
                          Delivery Not Available
                        </span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        We do not currently deliver to this destination. Please
                        contact support for alternative options.
                      </p>
                    </div>
                  )}

                  {/* Available Transport Modes Info */}
                  {availableModes.length > 0 &&
                    !loadingModes &&
                    deliveryAvailable && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-3">
                          <Plane className="w-5 h-5 text-blue-500" />
                          <span className="font-bold text-gray-900 dark:text-white">
                            Available Transport Modes
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {availableModes.map((mode, idx) => {
                            const ModeIcon = getTransportIcon(mode.name);
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                              >
                                <ModeIcon className="w-3 h-3" />
                                {mode.name}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                          These transport modes are available for this route.
                          Quotes will show all options.
                        </p>
                      </div>
                    )}

                  {loadingModes &&
                    formData.origin_country &&
                    formData.destination_country && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">
                            Checking available transport modes...
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Pickup Info - Will be determined automatically */}
                  {formData.shipping_category === "vehicle" ||
                  formData.shipping_category === "ltl_freight" ||
                  formData.shipping_category === "ftl_freight" ||
                  formData.shipping_category === "super_heavy" ||
                  (formData.weight && parseFloat(formData.weight) >= 100) ? (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        <span className="font-bold text-gray-900 dark:text-white">
                          Pickup Required
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        This shipment requires scheduled pickup. Pickup cost
                        will be calculated and added to your quote. You'll be
                        able to schedule pickup after payment.
                      </p>
                    </div>
                  ) : null}

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
                      className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl"
                    >
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>
            </motion.div>

            {/* Info Panel */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="card-modern p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-100 dark:border-orange-900">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-orange-500">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">
                    Real-Time Pricing
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get instant quotes from multiple carriers and transport modes
                  with transparent pricing.
                </p>
              </div>

              <div className="card-modern p-6 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                  Transport Modes
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Plane className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Air Freight - Fastest
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Ship className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Sea Freight - Most Economical
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Train className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Rail Freight - Eco-Friendly
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-4 h-4 text-orange-500" />
                    <span className="text-gray-600 dark:text-gray-400">
                      Road/Truck - Regional
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Results Section */}
          {quotes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white">
                  Available Quotes ({quotes.length})
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Sort by:
                  </span>
                  <button
                    onClick={() => {
                      const sorted =
                        sortBy === "price"
                          ? [...quotes].sort(
                              (a, b) =>
                                parseFloat(a.total) - parseFloat(b.total)
                            )
                          : [...quotes].sort(
                              (a, b) => a.transit_days[0] - b.transit_days[0]
                            );
                      setQuotes(sorted);
                      setSortBy(sortBy === "price" ? "speed" : "price");
                    }}
                    className="px-4 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-semibold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    {sortBy === "price" ? "Price" : "Speed"}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.map((quote, i) => {
                  const TransportIcon = getTransportIcon(
                    quote.transport_mode_name
                  );
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -8, scale: 1.02 }}
                      className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 relative"
                    >
                      {i === 0 && (
                        <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-black uppercase shadow-lg">
                          Best Price
                        </div>
                      )}
                      <div className="relative h-32 w-full">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 opacity-90" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <TransportIcon className="w-16 h-16 text-white opacity-80" />
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                          {quote.transport_mode_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {quote.carrier}
                        </p>
                        {quote.carrier_umbrella_name &&
                          quote.carrier_umbrella_name !== quote.carrier && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                              {quote.carrier_umbrella_name}
                            </p>
                          )}
                        {quote.full_description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                            {quote.full_description}
                          </p>
                        )}
                        <div className="text-3xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-4">
                          ${parseFloat(quote.total).toFixed(2)}
                        </div>
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">
                              Transit Time:
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {quote.transit_days_min || quote.transit_days[0]}-
                              {quote.transit_days_max || quote.transit_days[1]}{" "}
                              days
                            </span>
                          </div>

                          {/* Drop-off requirement warning with process explanation */}
                          {quote.requires_drop_off && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-yellow-800 dark:text-yellow-300">
                                  <p className="font-semibold mb-2">
                                    Drop-off Required - Shipping Process
                                  </p>
                                  {quote.drop_off_instructions && (
                                    <p className="text-yellow-700 dark:text-yellow-400 mb-2">
                                      {quote.drop_off_instructions}
                                    </p>
                                  )}
                                  {quote.is_international_parcel ? (
                                    <div className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-400">
                                      <p className="font-medium">
                                        International Parcel Shipping Timeline:
                                      </p>
                                      <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>
                                          You drop off package at local carrier
                                          location (same day)
                                        </li>
                                        <li>
                                          Package travels to warehouse:{" "}
                                          {quote.leg1_easyship
                                            ?.transit_days[0] || 0}
                                          -
                                          {quote.leg1_easyship
                                            ?.transit_days[1] || 0}{" "}
                                          days
                                        </li>
                                        <li>
                                          Package processed and shipped to
                                          destination (
                                          {quote.leg2_route?.transport_mode ||
                                            "International"}
                                          ):{" "}
                                          {quote.leg2_route?.transit_days[0] ||
                                            0}
                                          -
                                          {quote.leg2_route?.transit_days[1] ||
                                            0}{" "}
                                          days
                                        </li>
                                      </ol>
                                      <p className="mt-2 text-xs">
                                        Total estimated delivery:{" "}
                                        {quote.transit_days_min ||
                                          quote.transit_days[0]}
                                        -
                                        {quote.transit_days_max ||
                                          quote.transit_days[1]}{" "}
                                        days
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-400">
                                      <p className="font-medium">
                                        Shipping Timeline:
                                      </p>
                                      <ol className="list-decimal list-inside space-y-1 ml-2">
                                        <li>
                                          You drop off package at local carrier
                                          location (same day)
                                        </li>
                                        <li>
                                          Package travels to warehouse:{" "}
                                          {quote.transit_days_min ||
                                            quote.transit_days[0]}
                                          -
                                          {quote.transit_days_max ||
                                            quote.transit_days[1]}{" "}
                                          days
                                        </li>
                                        <li>
                                          Package processed and shipped to
                                          destination: Additional{" "}
                                          {quote.transit_days_min ||
                                            quote.transit_days[0]}
                                          -
                                          {quote.transit_days_max ||
                                            quote.transit_days[1]}{" "}
                                          days
                                        </li>
                                      </ol>
                                      <p className="mt-2 text-xs">
                                        Total estimated delivery:{" "}
                                        {(quote.transit_days_min ||
                                          quote.transit_days[0]) * 2}
                                        -
                                        {(quote.transit_days_max ||
                                          quote.transit_days[1]) * 2}{" "}
                                        days
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Process explanation for non-drop-off local shipping */}
                          {quote.is_local_shipping &&
                            !quote.requires_drop_off && (
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start gap-2">
                                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div className="text-xs text-blue-800 dark:text-blue-300">
                                    <p className="font-semibold mb-2">
                                      Shipping Process:
                                    </p>
                                    <div className="space-y-1 text-blue-700 dark:text-blue-400">
                                      <p>
                                        • Free pickup available - we'll collect
                                        your package
                                      </p>
                                      <p>
                                        • Delivery time:{" "}
                                        {quote.transit_days_min ||
                                          quote.transit_days[0]}
                                        -
                                        {quote.transit_days_max ||
                                          quote.transit_days[1]}{" "}
                                        days
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Process explanation for international shipping */}
                          {!quote.is_local_shipping && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="flex items-start gap-2">
                                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-xs text-blue-800 dark:text-blue-300">
                                  <p className="font-semibold mb-2">
                                    Shipping Process:
                                  </p>
                                  <div className="space-y-1 text-blue-700 dark:text-blue-400">
                                    {quote.pickup_required ? (
                                      <>
                                        <p>
                                          • We'll pick up your package from
                                          origin address
                                        </p>
                                        <p>
                                          • Package travels to warehouse for
                                          processing
                                        </p>
                                        <p>
                                          • International shipping to
                                          destination:{" "}
                                          {quote.transit_days_min ||
                                            quote.transit_days[0]}
                                          -
                                          {quote.transit_days_max ||
                                            quote.transit_days[1]}{" "}
                                          days
                                        </p>
                                      </>
                                    ) : (
                                      <>
                                        <p>
                                          • Package shipped from origin to
                                          destination
                                        </p>
                                        <p>
                                          • Estimated delivery:{" "}
                                          {quote.transit_days_min ||
                                            quote.transit_days[0]}
                                          -
                                          {quote.transit_days_max ||
                                            quote.transit_days[1]}{" "}
                                          days
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Available handover options */}
                          {quote.available_handover_options &&
                            quote.available_handover_options.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {quote.available_handover_options.includes(
                                  "free_pickup"
                                ) && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                                    ✓ Free Pickup
                                  </span>
                                )}
                                {quote.available_handover_options.includes(
                                  "dropoff"
                                ) && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                                    Drop-off
                                  </span>
                                )}
                              </div>
                            )}

                          {/* Show two-leg breakdown for international parcels */}
                          {quote.is_international_parcel &&
                            quote.leg1_easyship &&
                            quote.leg2_route && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Two-Leg Shipping Breakdown:
                                </div>
                                <div className="pl-2 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Leg 1: Origin → Warehouse (EasyShip):
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.leg1_easyship.cost || 0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 pl-2">
                                    {quote.leg1_easyship.carrier} -{" "}
                                    {quote.leg1_easyship.transit_days[0]}-
                                    {quote.leg1_easyship.transit_days[1]} days
                                  </div>
                                  <div className="flex items-center justify-between text-xs mt-2">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Leg 2: Warehouse → Destination (
                                      {quote.leg2_route.transport_mode}):
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.leg2_route.cost || 0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500 pl-2">
                                    {quote.leg2_route.transit_days[0]}-
                                    {quote.leg2_route.transit_days[1]} days
                                  </div>
                                  <div className="flex items-center justify-between text-xs font-bold mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                                    <span className="text-gray-700 dark:text-gray-300">
                                      Total:
                                    </span>
                                    <span className="text-orange-600 dark:text-orange-400">
                                      ${parseFloat(quote.total || 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                          {/* Show breakdown if available (for non-international parcels) */}
                          {quote.breakdown &&
                            !quote.is_international_parcel && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-500 dark:text-gray-500">
                                    Shipment Charge:
                                  </span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                                    $
                                    {parseFloat(
                                      quote.breakdown.shipment_charge ||
                                        quote.base_rate ||
                                        quote.breakdown.base_rate ||
                                        0
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                {quote.breakdown.fuel_surcharge > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Fuel Surcharge:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.breakdown.fuel_surcharge || 0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.breakdown.insurance_fee > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Insurance:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.breakdown.insurance_fee || 0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.breakdown.additional_services_surcharge >
                                  0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Additional Services:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.breakdown
                                          .additional_services_surcharge || 0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.breakdown.estimated_import_duty > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Estimated Duty:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.breakdown.estimated_import_duty ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.breakdown.estimated_import_tax > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Estimated Tax:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.breakdown.estimated_import_tax ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {/* Legacy breakdown fields for non-EasyShip quotes */}
                                {!quote.is_local_shipping && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Base Rate:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.base_rate ||
                                          quote.breakdown.base_rate ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.fuel_surcharge !== undefined && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Fuel Surcharge:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.fuel_surcharge ||
                                          quote.breakdown.fuel_surcharge ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.security_fee !== undefined && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-500">
                                      Security Fee:
                                    </span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                                      $
                                      {parseFloat(
                                        quote.security_fee ||
                                          quote.breakdown.security_fee ||
                                          0
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.pickup_cost > 0 && (
                                  <div className="flex items-center justify-between text-xs text-orange-600 dark:text-orange-400">
                                    <span>Pickup Cost:</span>
                                    <span className="font-semibold">
                                      $
                                      {parseFloat(quote.pickup_cost).toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {quote.dimensional_weight &&
                                  quote.actual_weight && (
                                    <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400">
                                      <span>Chargeable Weight:</span>
                                      <span className="font-semibold">
                                        {parseFloat(
                                          quote.chargeable_weight ||
                                            quote.actual_weight
                                        ).toFixed(2)}{" "}
                                        kg
                                        {quote.dimensional_weight >
                                          quote.actual_weight && (
                                          <span className="ml-1 text-gray-500">
                                            (dim)
                                          </span>
                                        )}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            )}

                          {!quote.breakdown && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                Base Rate:
                              </span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                ${parseFloat(quote.base_rate || 0).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Show pickup required badge */}
                        {quote.pickup_required && (
                          <div className="mb-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold text-center">
                            Pickup Required
                          </div>
                        )}

                        {/* Show local shipping badge */}
                        {quote.is_local_shipping && (
                          <div className="mb-4 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold text-center">
                            Local Shipping
                          </div>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            // Store quote and form data in sessionStorage
                            const quoteData = {
                              quote,
                              quoteRequest: formData,
                              quoteRequestId,
                              pickupRequired,
                              isLocalShipping,
                              origin_address: formData.origin_address, // Store full address
                              destination_address: formData.destination_address, // Store full address
                            };
                            // For local shipping, validate EasyShip rate is available
                            if (
                              isLocalShipping &&
                              quote.is_local_shipping &&
                              !quote.easyship_rate_id
                            ) {
                              console.log(
                                "EasyShip rate is not available.",
                                isLocalShipping,
                                quote
                              );

                              toast.error(
                                "This shipping option is not available. Please select another option."
                              );
                              return;
                            }

                            sessionStorage.setItem(
                              "selectedQuote",
                              JSON.stringify(quoteData)
                            );

                            // Check if user is authenticated
                            const token = localStorage.getItem("access_token");
                            if (!token) {
                              // Redirect to login with return URL
                              router.push(
                                `/login?redirect=/quote/review&quote_request_id=${quoteRequestId}`
                              );
                            } else {
                              router.push("/quote/review");
                            }
                          }}
                          className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                          Select & Continue
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {!loading && quotes.length === 0 && !error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12 text-center"
            >
              <div className="card-modern p-12 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="inline-flex p-6 rounded-2xl bg-orange-50 dark:bg-orange-900/20 mb-6">
                  <Package className="w-16 h-16 text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                  Ready to Get Quotes?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Fill in your shipping details above and click "Calculate
                  Quotes" to see all available shipping options with real-time
                  pricing.
                </p>
              </div>
            </motion.div>
          )}
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
