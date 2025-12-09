"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Package,
  Truck,
  Globe,
  CheckCircle,
  ArrowRight,
  Warehouse,
  Shield,
  Zap,
  Building2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const warehouses = [
  {
    id: 1,
    name: "YuuSell Logistics - Los Angeles",
    code: "LAX",
    country: "United States",
    countryCode: "US",
    city: "Los Angeles",
    state: "California",
    address: "123 Warehouse Street",
    addressLine2: "Building A, Suite 100",
    postalCode: "90001",
    phone: "+1 (555) 123-4567",
    email: "warehouse.lax@yuusell.com",
    operatingHours: "Monday - Friday: 9:00 AM - 6:00 PM PST",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "LTL Freight",
      "Vehicle Storage",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "Express Processing",
    ],
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&h=600&fit=crop",
    coordinates: { lat: 34.0522, lng: -118.2437 },
  },
  {
    id: 2,
    name: "YuuSell Logistics - New York",
    code: "NYC",
    country: "United States",
    countryCode: "US",
    city: "New York",
    state: "New York",
    address: "456 Logistics Boulevard",
    addressLine2: "Floor 3, Unit 301",
    postalCode: "10001",
    phone: "+1 (555) 234-5678",
    email: "warehouse.nyc@yuusell.com",
    operatingHours: "Monday - Friday: 8:00 AM - 7:00 PM EST",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "FTL Freight",
      "Super Heavy/Oversized",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "Express Processing",
      "Customs Clearance",
    ],
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop",
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    id: 3,
    name: "YuuSell Logistics - London",
    code: "LHR",
    country: "United Kingdom",
    countryCode: "GB",
    city: "London",
    state: "England",
    address: "789 Distribution Way",
    addressLine2: "Unit 5, Industrial Park",
    postalCode: "SW1A 1AA",
    phone: "+44 20 1234 5678",
    email: "warehouse.lhr@yuusell.com",
    operatingHours: "Monday - Friday: 8:00 AM - 6:00 PM GMT",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "LTL Freight",
      "EU Distribution",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "EU Customs Expertise",
    ],
    image:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
    coordinates: { lat: 51.5074, lng: -0.1278 },
  },
  {
    id: 4,
    name: "YuuSell Logistics - Tokyo",
    code: "NRT",
    country: "Japan",
    countryCode: "JP",
    city: "Tokyo",
    state: "Tokyo Prefecture",
    address: "321 Shipping Center",
    addressLine2: "Building 2, Floor 4",
    postalCode: "100-0001",
    phone: "+81 3 1234 5678",
    email: "warehouse.nrt@yuusell.com",
    operatingHours: "Monday - Friday: 9:00 AM - 6:00 PM JST",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "LTL Freight",
      "Asia-Pacific Distribution",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "Japanese Customs Expertise",
    ],
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: 5,
    name: "YuuSell Logistics - Dubai",
    code: "DXB",
    country: "United Arab Emirates",
    countryCode: "AE",
    city: "Dubai",
    state: "Dubai",
    address: "654 Freight Terminal",
    addressLine2: "Zone A, Warehouse 12",
    postalCode: "00000",
    phone: "+971 4 123 4567",
    email: "warehouse.dxb@yuusell.com",
    operatingHours: "Sunday - Thursday: 8:00 AM - 6:00 PM GST",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "LTL Freight",
      "FTL Freight",
      "Vehicle Storage",
      "Middle East Distribution",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "GCC Customs Expertise",
    ],
    image:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop",
    coordinates: { lat: 25.2048, lng: 55.2708 },
  },
  {
    id: 6,
    name: "YuuSell Logistics - Sydney",
    code: "SYD",
    country: "Australia",
    countryCode: "AU",
    city: "Sydney",
    state: "New South Wales",
    address: "987 Logistics Park",
    addressLine2: "Block C, Unit 15",
    postalCode: "2000",
    phone: "+61 2 1234 5678",
    email: "warehouse.syd@yuusell.com",
    operatingHours: "Monday - Friday: 8:00 AM - 5:00 PM AEST",
    services: [
      "Small Parcels (0-30kg)",
      "Heavy Parcels (30-100kg)",
      "LTL Freight",
      "Oceania Distribution",
    ],
    features: [
      "24/7 Security",
      "Climate Controlled",
      "Photo Documentation",
      "Real-time Tracking",
      "Australian Customs Expertise",
    ],
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    coordinates: { lat: -33.8688, lng: 151.2093 },
  },
];

export default function WarehousesPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWarehouses = warehouses.filter(
    (warehouse) =>
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
              <Warehouse className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                Global Network
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black mb-4">
              <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                Our Warehouses
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Strategically located warehouses worldwide to serve you better.
              Ship to any of our facilities and we'll handle the rest.
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="relative max-w-2xl mx-auto">
              <input
                type="text"
                placeholder="Search warehouses by name, city, or country..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-6 py-4 pl-14 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all font-semibold text-lg"
              />
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </motion.div>

          {/* Warehouse Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {filteredWarehouses.map((warehouse, index) => (
              <motion.div
                key={warehouse.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => setSelectedWarehouse(warehouse)}
                className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900 cursor-pointer group"
              >
                {/* Image */}
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={warehouse.image}
                    alt={warehouse.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-black uppercase">
                    {warehouse.code}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-2xl font-black text-white mb-1">
                      {warehouse.name}
                    </h3>
                    <p className="text-sm text-white/90 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {warehouse.city}, {warehouse.country}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                      <Building2 className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Address
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {warehouse.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Operating Hours
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {warehouse.operatingHours}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <Package className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase">
                        Services
                      </div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        {warehouse.services.length} Services Available
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        View Details
                      </span>
                      <ArrowRight className="w-5 h-5 text-orange-500 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredWarehouses.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No warehouses found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search terms
              </p>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card-modern p-8 md:p-12 bg-gradient-to-br from-orange-600 to-red-500 text-white text-center"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Ready to Ship?
            </h2>
            <p className="text-xl mb-8 text-orange-50 max-w-2xl mx-auto">
              Get a quote and start shipping to any of our warehouses today
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/quote"
                className="px-8 py-4 bg-white text-orange-600 rounded-xl font-black text-lg hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Get Instant Quote
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/warehouse-label"
                className="px-8 py-4 bg-orange-700 text-white rounded-xl font-black text-lg hover:bg-orange-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Buy Warehouse Label
                <Truck className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Warehouse Detail Modal */}
      {selectedWarehouse && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedWarehouse(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="card-modern max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800"
          >
            <div className="relative h-64 w-full overflow-hidden">
              <Image
                src={selectedWarehouse.image}
                alt={selectedWarehouse.name}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <button
                onClick={() => setSelectedWarehouse(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
              >
                <ArrowRight className="w-6 h-6 rotate-45" />
              </button>
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-4xl font-black text-white mb-2">
                  {selectedWarehouse.name}
                </h2>
                <p className="text-lg text-white/90 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  {selectedWarehouse.city}, {selectedWarehouse.state},{" "}
                  {selectedWarehouse.country}
                </p>
              </div>
            </div>

            <div className="p-8">
              {/* Contact Information */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="p-6 rounded-xl bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-orange-500">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      Address
                    </h3>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedWarehouse.address}
                    {selectedWarehouse.addressLine2 && (
                      <>
                        <br />
                        {selectedWarehouse.addressLine2}
                      </>
                    )}
                    <br />
                    {selectedWarehouse.city}, {selectedWarehouse.state}{" "}
                    {selectedWarehouse.postalCode}
                    <br />
                    {selectedWarehouse.country}
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-blue-500">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                      Contact
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedWarehouse.phone}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedWarehouse.email}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {selectedWarehouse.operatingHours}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-6 h-6 text-orange-500" />
                  Available Services
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedWarehouse.services.map((service, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {service}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-orange-500" />
                  Warehouse Features
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedWarehouse.features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20"
                    >
                      <Zap className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <Link
                  href="/warehouse-label"
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-black text-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Truck className="w-5 h-5" />
                  Buy Shipping Label
                </Link>
                <Link
                  href="/quote"
                  className="flex-1 px-6 py-4 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl font-black text-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                >
                  Get Quote
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </>
  );
}
