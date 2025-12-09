import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

const initialState = {
  shipments: [],
  loading: false,
  error: null,
  selectedShipment: null,
};

export const fetchShipments = createAsyncThunk(
  "shipments/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/logistics/shipments/");
      return response.data.results || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch shipments"
      );
    }
  }
);

export const fetchShipmentById = createAsyncThunk(
  "shipments/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/logistics/shipments/${id}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch shipment"
      );
    }
  }
);

export const trackShipment = createAsyncThunk(
  "shipments/track",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/logistics/shipments/${id}/track/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to track shipment"
      );
    }
  }
);

export const createShipment = createAsyncThunk(
  "shipments/create",
  async (shipmentData, { rejectWithValue }) => {
    try {
      const response = await api.post("/logistics/shipments/", shipmentData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create shipment"
      );
    }
  }
);

const shipmentsSlice = createSlice({
  name: "shipments",
  initialState,
  reducers: {
    setSelectedShipment: (state, action) => {
      state.selectedShipment = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all shipments
      .addCase(fetchShipments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShipments.fulfilled, (state, action) => {
        state.loading = false;
        state.shipments = action.payload;
      })
      .addCase(fetchShipments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch shipment by ID
      .addCase(fetchShipmentById.fulfilled, (state, action) => {
        state.selectedShipment = action.payload;
      })
      // Create shipment
      .addCase(createShipment.fulfilled, (state, action) => {
        state.shipments.unshift(action.payload);
      });
  },
});

export const { setSelectedShipment, clearError } = shipmentsSlice.actions;
export default shipmentsSlice.reducer;
