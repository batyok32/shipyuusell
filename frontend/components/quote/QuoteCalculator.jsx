"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { calculateQuotes } from "@/store/slices/quotesSlice";
import { Loader2, Package, DollarSign, Clock } from "lucide-react";
import toast from "react-hot-toast";

export function QuoteCalculator() {
  const dispatch = useAppDispatch();
  const { quotes, loading, error } = useAppSelector((state) => state.quotes);

  const [formData, setFormData] = useState({
    origin_country: "",
    destination_country: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    declared_value: "",
  });

  const handleCalculate = async () => {
    if (
      !formData.origin_country ||
      !formData.destination_country ||
      !formData.weight
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    await dispatch(
      calculateQuotes({
        origin_country: formData.origin_country,
        destination_country: formData.destination_country,
        weight: parseFloat(formData.weight),
        dimensions: {
          length: parseFloat(formData.length) || 10,
          width: parseFloat(formData.width) || 10,
          height: parseFloat(formData.height) || 10,
        },
        declared_value: parseFloat(formData.declared_value) || 0,
      })
    )
      .unwrap()
      .then(() => {
        toast.success("Quotes calculated successfully!");
      })
      .catch((err) => {
        toast.error(err || "Failed to calculate quotes");
      });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* Form */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="glass rounded-2xl p-8"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Shipping Details
        </h2>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Origin Country
              </label>
              <input
                type="text"
                value={formData.origin_country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    origin_country: e.target.value.toUpperCase(),
                  })
                }
                placeholder="US"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Destination Country
              </label>
              <input
                type="text"
                value={formData.destination_country}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    destination_country: e.target.value.toUpperCase(),
                  })
                }
                placeholder="GB"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
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
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Length (cm)
              </label>
              <input
                type="number"
                value={formData.length}
                onChange={(e) =>
                  setFormData({ ...formData, length: e.target.value })
                }
                placeholder="30"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Width (cm)
              </label>
              <input
                type="number"
                value={formData.width}
                onChange={(e) =>
                  setFormData({ ...formData, width: e.target.value })
                }
                placeholder="20"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) =>
                  setFormData({ ...formData, height: e.target.value })
                }
                placeholder="15"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Declared Value (USD)
            </label>
            <input
              type="number"
              value={formData.declared_value}
              onChange={(e) =>
                setFormData({ ...formData, declared_value: e.target.value })
              }
              placeholder="100"
              step="0.01"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCalculate}
            disabled={loading}
            className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Calculating...
              </>
            ) : (
              "Calculate Quotes"
            )}
          </motion.button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>
      </motion.div>

      {/* Results */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-4"
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
          Available Quotes
        </h2>

        <AnimatePresence>
          {quotes.length > 0 ? (
            quotes.map((quote, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -4 }}
                className="glass rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {quote.transport_mode_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {quote.carrier}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold gradient-text">
                      ${quote.total.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Base: ${quote.base_rate.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {quote.transit_days[0]}-{quote.transit_days[1]} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span>Markup: ${quote.markup.toFixed(2)}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
                >
                  Select This Option
                </motion.button>
              </motion.div>
            ))
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                Enter shipping details and click "Calculate Quotes" to see
                available options
              </p>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
