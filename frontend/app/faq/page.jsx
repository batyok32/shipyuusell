"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ChevronDown,
  HelpCircle,
  Search,
  Package,
  ShoppingCart,
  Boxes,
  DollarSign,
  Clock,
  Shield,
  Globe,
  Truck,
} from "lucide-react";

const faqCategories = [
  {
    id: "general",
    name: "General Questions",
    icon: HelpCircle,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "shipping",
    name: "Shipping Services",
    icon: Package,
    color: "from-red-500 to-orange-500",
  },
  {
    id: "buying",
    name: "Buy & Ship",
    icon: ShoppingCart,
    color: "from-orange-600 to-red-600",
  },

  {
    id: "pricing",
    name: "Pricing & Payments",
    icon: DollarSign,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "tracking",
    name: "Tracking & Delivery",
    icon: Clock,
    color: "from-red-500 to-orange-500",
  },
  {
    id: "security",
    name: "Security & Insurance",
    icon: Shield,
    color: "from-orange-600 to-red-600",
  },
  {
    id: "international",
    name: "International Shipping",
    icon: Globe,
    color: "from-red-600 to-orange-600",
  },
];

const allFAQs = {
  general: [
    {
      question: "What is YuuSell Logistics?",
      answer:
        "YuuSell Logistics is a comprehensive international freight forwarding platform that allows you to ship packages globally and buy products from anywhere. We provide end-to-end logistics solutions with real-time tracking and transparent pricing.",
    },
    {
      question: "How does YuuSell Logistics work?",
      answer:
        "First, you get your unique warehouse ID. Ship your packages to our warehouse, and we'll receive, inspect, and photograph them. Then, you can choose your preferred shipping method, get instant quotes, and we'll handle the international shipping to your destination. You can track everything in real-time through your dashboard.",
    },
    {
      question: "Do I need to create an account to use your services?",
      answer:
        "Yes, you need to create a free account to use our services. This gives you access to your unique warehouse address, package tracking, shipping quotes, and all our features. Registration is quick and only requires your email address.",
    },
    {
      question: "What countries do you serve?",
      answer:
        "We ship to over 200 countries worldwide. Whether you're shipping from or to any major country, we can help. Use our quote calculator to check if we serve your specific origin and destination countries.",
    },
    {
      question: "How do I contact customer support?",
      answer:
        "You can reach our customer support team via email at support@yuusell.com, phone at +1 (234) 567-890, or through the contact form on our website. We're available Monday through Friday, 9 AM to 6 PM EST. We typically respond within 24 hours.",
    },
    {
      question: "What is a warehouse ID?",
      answer:
        "Your warehouse ID is a unique identifier assigned to you when you create an account. It helps us identify and organize your packages when they arrive at our warehouse. You'll use this ID when shipping packages to us from online stores or personal shipments.",
    },
  ],
  shipping: [
    {
      question: "What shipping methods are available?",
      answer:
        "We offer four main transport modes: Air Freight (1-8 days, fastest), Sea Freight (15-45 days, most economical), Rail Freight (10-20 days, eco-friendly), and Truck/Road (2-10 days, regional). The available options depend on your origin and destination countries.",
    },
    {
      question: "How do I ship items to your warehouse?",
      answer:
        "When you create an account, you'll receive a unique warehouse address. Simply use this address as the shipping address when ordering online or sending packages. Include your warehouse ID in the address line to ensure proper routing. You can also purchase prepaid domestic shipping labels through our platform.",
    },
    {
      question: "What happens after my package arrives at your warehouse?",
      answer:
        "When your package arrives, we'll scan it, match it to your account, photograph it, weigh and measure it, inspect it for damage, and notify you via email. The package will then be stored in our facility, and you can view it in your dashboard. You can then choose to ship it internationally.",
    },
    {
      question: "How long do you store packages at your warehouse?",
      answer:
        "We offer 30 days of free storage for all packages. After that, there's a small daily storage fee. You can check your storage timeline in your dashboard to see when free storage expires for each package.",
    },
    {
      question: "Can I ship packages from multiple online stores?",
      answer:
        "Yes! That's one of the benefits of using our service. You can shop from multiple stores and have all packages sent to our warehouse. Then you can ship them internationally using your preferred transport method.",
    },
    {
      question: "What items can I ship?",
      answer:
        "We can ship most items including clothing, electronics, books, household items, and more. However, we cannot ship prohibited items such as hazardous materials, weapons, illegal substances, perishable foods, or items restricted by international customs regulations. Check our terms of service for a complete list.",
    },
    {
      question: "What are the weight and size limits?",
      answer:
        "We handle packages from small parcels (0-30kg) to heavy freight (4000+kg). Small parcels are shipped via courier services, while larger shipments use freight carriers. For super heavy or oversized items (construction equipment, vehicles), we offer specialized shipping services. Contact us for details on specific items.",
    },
    {
      question: "How do I get a shipping quote?",
      answer:
        "Use our instant quote calculator on the homepage or quote page. Simply enter your origin and destination countries, package weight and dimensions, and declared value. You'll instantly see quotes from all available shipping methods sorted by price and speed.",
    },
  ],
  buying: [
    {
      question: "What is the Buy & Ship service?",
      answer:
        "Our Buy & Ship service allows you to purchase products from any online store, even if they don't ship internationally. Simply provide us with the product URL or description, and our buying agents will purchase the item, have it shipped to our warehouse, and then forward it to you internationally with a complete quote breakdown.",
    },
    {
      question: "How does the buying process work?",
      answer:
        "You submit a buying request with the product URL or description. Our agents will research the product, provide you with a detailed quote (product cost + sales tax + buying service fee + domestic shipping + international shipping), and wait for your approval. Once approved, we purchase the item and handle everything from there.",
    },
    {
      question: "What is the buying service fee?",
      answer:
        "Our buying service fee is typically 5-10% of the product cost. This covers our agent's time to research, purchase, and coordinate the order. The exact fee will be included in your quote before you approve the purchase.",
    },
    {
      question: "Can you buy from any website?",
      answer:
        "We can buy from most major e-commerce sites. However, some sites may have restrictions or require special arrangements. Our agents will let you know if there are any issues with a specific store when you submit your request.",
    },
    {
      question: "What if the product is out of stock?",
      answer:
        "If a product is out of stock, our agents will notify you immediately and provide alternatives if available. You can choose to wait for restocking, select an alternative, or cancel the request with no charges.",
    },
    {
      question: "How long does the buying process take?",
      answer:
        "Typically, we can provide a quote within 24-48 hours. Once approved, the purchase is made immediately. Domestic shipping to our warehouse takes 3-7 business days depending on the retailer. Then international shipping time depends on the transport method you choose.",
    },
  ],
  pricing: [
    {
      question: "How are shipping costs calculated?",
      answer:
        "Shipping costs are based on several factors: package weight and dimensions, origin and destination countries, chosen transport method, declared value, and any additional services. Each transport mode uses different pricing formulas. Our calculator shows all costs transparently before you commit.",
    },
    {
      question: "Are there any hidden fees?",
      answer:
        "No, we believe in transparent pricing. All fees are clearly shown in your quote: base shipping rate, fuel surcharges, handling fees, insurance, customs documentation, and any additional services. There are no hidden charges or surprise fees.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept all major credit cards (Visa, MasterCard, American Express), debit cards, and bank transfers. Payments are processed securely through Stripe. You can also save payment methods for faster future transactions.",
    },
    {
      question: "When do I pay for shipping?",
      answer:
        "Payment is required when you confirm and create a shipment. You'll see the full cost breakdown before payment, and we'll only process the payment after you've reviewed and approved everything.",
    },
    {
      question: "Do you offer discounts for bulk shipping?",
      answer:
        "Yes! We offer discounts for larger shipments and frequent customers. We also have loyalty programs and referral bonuses that can save you money.",
    },
    {
      question: "What is your refund policy?",
      answer:
        "If you cancel a shipment before it's dispatched, we'll provide a full refund minus any processing fees. Once a shipment is in transit, refunds are handled case-by-case depending on the situation. Contact our support team for assistance with refund requests.",
    },
    {
      question: "Are there additional fees for special services?",
      answer:
        "Some additional services have fees: photo inspection ($5), express processing ($10), additional insurance (percentage of declared value), and special packaging requests. All optional services are clearly marked and you only pay for what you choose.",
    },
  ],
  tracking: [
    {
      question: "How do I track my shipment?",
      answer:
        "Once your shipment is dispatched, you'll receive a tracking number via email. You can track your package in real-time through your dashboard, which shows the current location, transit status, and estimated delivery date. You can also use the tracking number on the carrier's website.",
    },
    {
      question: "What tracking information is available?",
      answer:
        "You'll see detailed tracking information including: pickup confirmation, warehouse processing, customs clearance (if applicable), in-transit updates, delivery attempts, and final delivery confirmation. We provide updates at every major milestone.",
    },
    {
      question: "How often is tracking updated?",
      answer:
        "Tracking updates depend on the carrier, but typically you'll see updates every 24-48 hours while in transit. For express shipments, updates can be as frequent as every few hours. You'll receive email notifications for major status changes.",
    },
    {
      question: "What if my package is delayed?",
      answer:
        "Delays can happen due to weather, customs, or carrier issues. If your shipment is significantly delayed beyond the estimated delivery date, contact our support team. We'll investigate and keep you informed about the status and any resolution.",
    },
    {
      question: "How accurate are delivery estimates?",
      answer:
        "Our delivery estimates are based on typical transit times for each transport mode and route. However, actual delivery times can vary due to factors beyond our control like customs delays, weather, or carrier performance. Estimates are meant as guidelines, not guarantees.",
    },
    {
      question: "Can I change the delivery address after shipping?",
      answer:
        "Address changes after shipment dispatch are difficult but sometimes possible depending on the carrier and current location of the package. Contact our support team immediately if you need to change the delivery address. There may be additional fees for rerouting.",
    },
  ],
  security: [
    {
      question: "Are my packages insured?",
      answer:
        "All shipments include basic insurance coverage. You can purchase additional insurance based on your package's declared value for extra protection. Insurance covers loss and damage during transit. Check your shipment details for specific coverage amounts.",
    },
    {
      question: "What happens if my package is lost or damaged?",
      answer:
        "If your package is lost or damaged, file a claim through your dashboard or contact our support team. We'll investigate the claim, coordinate with the carrier, and process any eligible insurance claims. Our team will guide you through the entire process.",
    },
    {
      question: "How do you ensure package security?",
      answer:
        "We use secure warehouse facilities with 24/7 surveillance, strict access controls, and professional handling procedures. All packages are scanned, photographed, and tracked throughout the process. Our staff is trained in proper handling and security protocols.",
    },
    {
      question: "What if I receive the wrong item?",
      answer:
        "If you receive the wrong item, contact our support team immediately with photos and details. We'll investigate and work to resolve the issue. Depending on the situation, we may arrange for the correct item to be shipped or provide a refund.",
    },
    {
      question: "Is my personal information secure?",
      answer:
        "Yes, we take data security seriously. We use industry-standard encryption for all data transmission and storage. Your personal and payment information is protected and never shared with third parties except as necessary for shipping services. Read our Privacy Policy for details.",
    },
    {
      question: "Can I add signature confirmation?",
      answer:
        "Yes, signature confirmation is available as an additional service for an extra fee. This ensures that packages are only delivered when someone is present to sign for them, providing extra security and proof of delivery.",
    },
  ],
  international: [
    {
      question: "What customs documentation is required?",
      answer:
        "We handle all necessary customs documentation for you. This typically includes commercial invoices, packing lists, and customs declarations. For certain items or countries, additional documentation may be required. Our team will guide you through any special requirements.",
    },
    {
      question: "Will I have to pay customs duties and taxes?",
      answer:
        "Customs duties and taxes are charged by the destination country's customs authority, not by us. Whether you pay depends on your country's regulations and the declared value of your shipment. We'll provide you with information about potential customs fees, but you're responsible for paying them upon delivery.",
    },
    {
      question: "What items are restricted or prohibited?",
      answer:
        "Restricted and prohibited items vary by country, but generally include: hazardous materials, weapons, illegal substances, perishable foods, live animals, plants, currency, and items that violate intellectual property rights. Check with us or your destination country's customs for specific restrictions.",
    },
    {
      question: "How long does customs clearance take?",
      answer:
        "Customs clearance typically takes 1-5 business days, but can take longer depending on the destination country, declared value, and complexity of the shipment. Delays are more common for high-value items or when additional documentation is required.",
    },
    {
      question: "What if my package is held by customs?",
      answer:
        "If customs holds your package, they'll typically contact you directly for additional information or payment. We'll also notify you and provide guidance on what's needed. In most cases, providing requested documentation or paying duties will resolve the issue.",
    },
    {
      question: "Do you handle all import/export paperwork?",
      answer:
        "Yes, we handle all the necessary import/export paperwork and documentation for your shipments. You don't need to worry about filling out customs forms or dealing with complex documentation - we take care of it all for you.",
    },
    {
      question: "What about VAT and other taxes?",
      answer:
        "VAT (Value Added Tax) and other taxes are the responsibility of the recipient and are determined by the destination country's tax regulations. These fees are separate from shipping costs and are typically collected by customs or the delivery carrier. We'll inform you about potential tax obligations when applicable.",
    },
  ],
};

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [openIndex, setOpenIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFAQs = allFAQs[selectedCategory].filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 mesh-gradient opacity-20" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-orange-400 rounded-full animated-blob opacity-10" />
          <div
            className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-red-400 rounded-full animated-blob opacity-10"
            style={{ animationDelay: "2s" }}
          />

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
                <HelpCircle className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Help Center
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6">
                <span className="gradient-text">Frequently Asked</span>
                <br />
                <span className="text-gray-900 dark:text-white">Questions</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Find answers to common questions about our shipping services,
                pricing, tracking, and more.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Search Bar */}
        <section className="px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/50 focus:border-orange-500 transition-all text-lg"
              />
            </motion.div>
          </div>
        </section>

        {/* Category Tabs */}
        <section className="px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center">
              {faqCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;
                return (
                  <motion.button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setOpenIndex(null);
                      setSearchQuery("");
                    }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all ${
                      isSelected
                        ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                        : "glass-card text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm md:text-base">
                      {category.name}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section ref={ref} className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-6 md:mb-8"
            >
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">
                {faqCategories.find((c) => c.id === selectedCategory)?.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {filteredFAQs.length}{" "}
                {filteredFAQs.length === 1 ? "question" : "questions"}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </motion.div>

            <div className="space-y-4">
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    className="card-modern rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(index)}
                      className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors"
                    >
                      <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-white pr-4">
                        {faq.question}
                      </span>
                      <motion.div
                        animate={{ rotate: openIndex === index ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex-shrink-0"
                      >
                        <ChevronDown className="w-6 h-6 text-orange-500" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {openIndex === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 py-4 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))
              ) : (
                <div className="card-modern p-12 text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try searching with different keywords or select a different
                    category.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16 md:pb-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="card-modern p-8 md:p-12 text-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-800"
            >
              <HelpCircle className="w-16 h-16 mx-auto mb-6 text-orange-500" />
              <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-4">
                Still Have Questions?
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                Can't find what you're looking for? Our support team is here to
                help. Reach out to us and we'll get back to you as soon as
                possible.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  href="/contact"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 gradient-bg text-white rounded-lg font-bold hover:glow-effect transition-all"
                >
                  Contact Support
                </motion.a>
                <motion.a
                  href="mailto:support@yuusell.com"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 glass-card text-gray-900 dark:text-white rounded-lg font-bold hover:glow-effect transition-all"
                >
                  Email Us
                </motion.a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
