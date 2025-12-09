import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import packagesReducer from "./slices/packagesSlice";
import shipmentsReducer from "./slices/shipmentsSlice";
import quotesReducer from "./slices/quotesSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    packages: packagesReducer,
    shipments: shipmentsReducer,
    quotes: quotesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});
