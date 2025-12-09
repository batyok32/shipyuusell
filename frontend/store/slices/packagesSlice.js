import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

const initialState = {
  packages: [],
  loading: false,
  error: null,
  selectedPackage: null,
};

export const fetchPackages = createAsyncThunk(
  "packages/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/logistics/packages/");
      return response.data.results || response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch packages"
      );
    }
  }
);

export const fetchPackageById = createAsyncThunk(
  "packages/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/logistics/packages/${id}/`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to fetch package"
      );
    }
  }
);

export const createPackage = createAsyncThunk(
  "packages/create",
  async (packageData, { rejectWithValue }) => {
    try {
      const response = await api.post("/logistics/packages/", packageData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Failed to create package"
      );
    }
  }
);

const packagesSlice = createSlice({
  name: "packages",
  initialState,
  reducers: {
    setSelectedPackage: (state, action) => {
      state.selectedPackage = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all packages
      .addCase(fetchPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
      })
      .addCase(fetchPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch package by ID
      .addCase(fetchPackageById.fulfilled, (state, action) => {
        state.selectedPackage = action.payload;
      })
      // Create package
      .addCase(createPackage.fulfilled, (state, action) => {
        state.packages.unshift(action.payload);
      });
  },
});

export const { setSelectedPackage, clearError } = packagesSlice.actions;
export default packagesSlice.reducer;
