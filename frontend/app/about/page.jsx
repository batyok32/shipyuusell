"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowRight,
  Award,
  Globe,
  Users,
  Target,
  Heart,
  Shield,
  TrendingUp,
  CheckCircle,
  FileText,
  Building,
  Calendar,
  MapPin,
  Mail,
  Phone,
  Eye,
} from "lucide-react";

const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "CEO & Founder",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    bio: "15+ years in logistics. Former VP at global shipping company.",
  },
  {
    name: "Michael Chen",
    role: "CTO",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
    bio: "Tech innovator with expertise in supply chain automation.",
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Operations",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    bio: "Warehouse and fulfillment specialist with global experience.",
  },
  {
    name: "David Kim",
    role: "Head of Customer Success",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    bio: "Dedicated to ensuring exceptional customer experiences.",
  },
  {
    name: "Lisa Thompson",
    role: "Head of Finance",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
    bio: "Financial strategist with expertise in international trade.",
  },
  {
    name: "James Wilson",
    role: "Head of Logistics",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop",
    bio: "Logistics expert with 20+ years managing global shipments.",
  },
];

const certificates = [
  {
    name: "ISO 9001:2015 Certified",
    description: "Quality Management System",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
  },
  {
    name: "IATA Certified",
    description: "International Air Transport Association",
    image:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=400&fit=crop",
  },
  {
    name: "Customs Broker License",
    description: "Licensed Customs Brokerage Services",
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop",
  },
  {
    name: "FMC Licensed",
    description: "Federal Maritime Commission",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop",
  },
];

const values = [
  {
    icon: Target,
    title: "Customer First",
    description:
      "We put our customers at the center of everything we do. Your success is our success.",
  },
  {
    icon: Shield,
    title: "Trust & Transparency",
    description:
      "Complete transparency in pricing, processes, and communication. No hidden fees, no surprises.",
  },
  {
    icon: TrendingUp,
    title: "Innovation",
    description:
      "Constantly improving our technology and processes to deliver better service and value.",
  },
  {
    icon: Heart,
    title: "Reliability",
    description:
      "You can count on us to deliver on our promises, every single time.",
  },
];

const achievements = [
  {
    number: "50K+",
    label: "Packages Shipped",
    icon: Globe,
  },
  {
    number: "150+",
    label: "Countries Served",
    icon: MapPin,
  },
  {
    number: "98%",
    label: "Customer Satisfaction",
    icon: Heart,
  },
  {
    number: "24/7",
    label: "Support Available",
    icon: Phone,
  },
];

const milestones = [
  {
    year: "2015",
    title: "Founded",
    description:
      "YuuSell Logistics was founded with a vision to make international shipping accessible to everyone.",
  },
  {
    year: "2017",
    title: "First Warehouse",
    description:
      "Opened our first state-of-the-art warehouse facility, enabling seamless international shipping services.",
  },
  {
    year: "2019",
    title: "Global Expansion",
    description:
      "Expanded operations to serve customers in over 50 countries worldwide.",
  },
  {
    year: "2021",
    title: "Technology Platform",
    description:
      "Launched our comprehensive platform with real-time tracking and automated quotes.",
  },
  {
    year: "2023",
    title: "50K Milestone",
    description:
      "Celebrated shipping our 50,000th package with continued commitment to excellence.",
  },
  {
    year: "2024",
    title: "Innovation Leader",
    description:
      "Recognized as a leading innovator in logistics technology and customer service.",
  },
];

export default function AboutPage() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [storyRef, storyInView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 dark:from-gray-900 dark:via-orange-900 dark:to-gray-900 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-orange-500/10" />
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-400 rounded-full animated-blob opacity-20" />
          <div
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-red-400 rounded-full animated-blob opacity-20"
            style={{ animationDelay: "2s" }}
          />
          <div className="absolute inset-0 pattern-grid opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-6">
                  <Building className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                    About YuuSell
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6">
                  <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                    Your Trusted Partner
                  </span>
                  <br />
                  <span className="text-gray-900 dark:text-white">
                    in Global Logistics
                  </span>
                </h1>
                <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                  We're revolutionizing international shipping by making it
                  simple, transparent, and affordable for everyone. From small
                  packages to full freight containers, we've got you covered.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/contact">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-500 text-white rounded-xl font-bold text-lg flex items-center gap-3 shadow-lg hover:shadow-xl transition-all"
                    >
                      Get in Touch
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>
                  </Link>
                  <Link href="/register">
                    <motion.button
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 glass-card text-gray-900 dark:text-white rounded-xl font-bold text-lg border-2 border-orange-200 dark:border-orange-800"
                    >
                      Join Us Today
                    </motion.button>
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative"
              >
                <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop"
                    alt="YuuSell Logistics Team"
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section ref={storyRef} className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={storyInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  How It All Started
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Our journey from a small startup to a global logistics leader
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={storyInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative h-96 rounded-2xl overflow-hidden"
              >
                <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop"
                  alt="Company founding"
                  fill
                  className="object-cover"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={storyInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-6">
                  The Beginning
                </h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  YuuSell Logistics was founded in 2015 with a simple mission:
                  to make international shipping accessible, affordable, and
                  transparent for everyone. Our founder, Sarah Johnson, saw how
                  difficult and expensive it was for individuals and small
                  businesses to ship packages internationally.
                </p>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  What started as a small warehouse operation has grown into a
                  global logistics platform serving customers in over 150
                  countries. We've shipped over 50,000 packages and continue to
                  innovate in the logistics space.
                </p>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  Today, we combine cutting-edge technology with personalized
                  service to deliver an unmatched shipping experience. Our team
                  of logistics experts, developers, and customer success
                  specialists work around the clock to ensure your packages
                  arrive safely and on time.
                </p>
              </motion.div>
            </div>

            {/* Timeline */}
            <div className="relative">
              <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-orange-500 to-red-500 hidden lg:block" />
              <div className="space-y-12">
                {milestones.map((milestone, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 40 }}
                    animate={storyInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
                    className={`flex flex-col lg:flex-row items-center gap-8 ${
                      i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="card-modern p-6 md:p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                          <Calendar className="w-4 h-4 text-orange-500" />
                          <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                            {milestone.year}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          {milestone.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-r from-orange-600 to-red-500 flex items-center justify-center text-white font-black text-xl shadow-lg">
                      {milestone.year.slice(-2)}
                    </div>
                    <div className="flex-1 hidden lg:block" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Values */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100/50 via-red-100/50 to-orange-100/50 dark:from-orange-900/30 dark:via-red-900/30 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                Our{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  Mission & Values
                </span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
              >
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 mb-6">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                  Our Mission
                </h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  To democratize international shipping by making it accessible,
                  affordable, and transparent for everyone. We believe that
                  distance shouldn't be a barrier to global commerce and
                  personal connections.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="card-modern p-8 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
              >
                <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 mb-6">
                  <Eye className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                  Our Vision
                </h3>
                <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                  To become the world's most trusted logistics platform, where
                  anyone can ship anything, anywhere, with complete confidence
                  and transparency. We envision a future where international
                  shipping is as simple as sending a local package.
                </p>
              </motion.div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {values.map((value, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="card-modern p-6 text-center bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 mb-4">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {value.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Team */}
        <section ref={ref} className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                Meet Our{" "}
                <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  Amazing Team
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                The passionate professionals behind YuuSell Logistics
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="relative h-64 w-full">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-6 text-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      {member.name}
                    </h3>
                    <p className="text-orange-500 font-semibold mb-3">
                      {member.role}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {member.bio}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Certificates & Licenses */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-100/50 via-red-100/50 to-orange-100/50 dark:from-orange-900/30 dark:via-red-900/30 relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-10" />
          <div className="relative z-10 max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                <span className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 bg-clip-text text-transparent">
                  Certifications & Licenses
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                Fully licensed and certified to handle your international
                shipments with confidence
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {certificates.map((cert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="card-modern overflow-hidden p-0 bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="relative h-48 w-full">
                    <Image
                      src={cert.image}
                      alt={cert.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/90 backdrop-blur-sm mb-2">
                        <Award className="w-4 h-4 text-white" />
                        <span className="text-xs font-bold text-white uppercase">
                          Certified
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {cert.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {cert.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements/Stats */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4">
                By The{" "}
                <span className="bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent">
                  Numbers
                </span>
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {achievements.map((achievement, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.05, y: -8 }}
                  className="card-modern p-8 text-center bg-white dark:bg-gray-800 border-2 border-orange-100 dark:border-orange-900"
                >
                  <div className="inline-flex p-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-500 mb-4">
                    <achievement.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-600 to-red-500 bg-clip-text text-transparent mb-2">
                    {achievement.number}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 font-semibold">
                    {achievement.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 relative overflow-hidden">
          <div className="absolute inset-0 pattern-dots opacity-10" />
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full animated-blob" />
          <div
            className="absolute bottom-10 right-10 w-64 h-64 bg-white/10 rounded-full animated-blob"
            style={{ animationDelay: "3s" }}
          />
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6">
                Join Us on Our Journey
              </h2>
              <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                Experience the difference that comes with working with a team
                that truly cares about your success
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:shadow-xl transition-all"
                  >
                    Get Started Free
                  </motion.button>
                </Link>
                <Link href="/contact">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
                  >
                    Contact Us
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
