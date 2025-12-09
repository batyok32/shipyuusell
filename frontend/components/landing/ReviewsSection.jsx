"use client";

import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Star, Quote } from "lucide-react";

const reviews = [
  {
    name: "Sarah Johnson",
    location: "New York, USA",
    rating: 5,
    text: "Amazing service! I've shipped multiple packages through YuuSell and every single one arrived safely and on time. The real-time tracking and transparent pricing make it the best logistics platform I've used!",
    image: "👩‍💼",
  },
  {
    name: "Michael Chen",
    location: "London, UK",
    rating: 5,
    text: "Best logistics platform I've used. The real-time tracking is fantastic, and their customer support is always helpful. Highly recommend!",
    image: "👨‍💻",
  },
  {
    name: "Emma Rodriguez",
    location: "Sydney, Australia",
    rating: 5,
    text: "The buying service is a game-changer! I can now shop from US stores without worrying about international shipping. The whole process is so smooth.",
    image: "👩‍🎨",
  },
  {
    name: "David Thompson",
    location: "Toronto, Canada",
    rating: 5,
    text: "Fast, reliable, and transparent pricing. I love that I can compare different shipping options and choose what works best for my budget and timeline.",
    image: "👨‍🏫",
  },
  {
    name: "Lisa Wang",
    location: "Singapore",
    rating: 5,
    text: "Fast, reliable, and transparent pricing. I love that I can compare different shipping options and choose what works best for my budget and timeline. Excellent service!",
    image: "👩‍⚕️",
  },
  {
    name: "James Wilson",
    location: "Berlin, Germany",
    rating: 5,
    text: "Professional, efficient, and cost-effective. The dashboard is easy to use and the quotes are always accurate. Couldn't ask for more!",
    image: "👨‍🔬",
  },
];

export function ReviewsSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section
      ref={ref}
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-900 dark:via-gray-800 relative overflow-hidden"
    >
      <div className="absolute inset-0 pattern-dots opacity-10" />
      <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-orange-400 rounded-full animated-blob opacity-10" />
      <div
        className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-red-400 rounded-full animated-blob opacity-10"
        style={{ animationDelay: "2s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            <span className="gradient-text">What Our Customers</span>
            <br />
            <span className="text-gray-900 dark:text-white">Say About Us</span>
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Don't just take our word for it - see what thousands of satisfied
            customers have to say
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {reviews.map((review, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6, type: "spring" }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="card-modern p-6 md:p-8 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-30 transition-opacity">
                <Quote className="w-16 h-16 text-orange-500" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl">{review.image}</div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-lg">
                      {review.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {review.location}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  "{review.text}"
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
