import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

const initialState = {
  quotes: [],
  loading: false,
  error: null,
  quoteRequest: null,
  quoteRequestId: null,
  pickupRequired: false,
  isLocalShipping: false,
  shippingCategory: null,
};

export const calculateQuotes = createAsyncThunk(
  "quotes/calculate",
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post("/logistics/calculate-shipping/", {
        ...data,
        declared_value: data.declared_value || 0,
      });
      return {
        quotes: response.data.quotes || [],
        request: data,
        quoteRequestId: response.data.quote_request_id,
        pickupRequired: response.data.pickup_required || false,
        isLocalShipping: response.data.is_local_shipping || false,
        shippingCategory: response.data.shipping_category,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to calculate quotes"
      );
    }
  }
);

const quotesSlice = createSlice({
  name: "quotes",
  initialState,
  reducers: {
    clearQuotes: (state) => {
      state.quotes = [];
      state.quoteRequest = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(calculateQuotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateQuotes.fulfilled, (state, action) => {
        state.loading = false;
        state.quotes = action.payload.quotes;
        state.quoteRequest = action.payload.request;
        state.quoteRequestId = action.payload.quoteRequestId;
        state.pickupRequired = action.payload.pickupRequired;
        state.isLocalShipping = action.payload.isLocalShipping;
        state.shippingCategory = action.payload.shippingCategory;
      })
      .addCase(calculateQuotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearQuotes, clearError } = quotesSlice.actions;
export default quotesSlice.reducer;
