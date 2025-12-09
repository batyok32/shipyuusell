# Comprehensive Guide: International & Domestic Shipping Workflows

## Table of Contents

1. [Overview](#overview)
2. [Quote Calculation System](#quote-calculation-system)
3. [Shipping Types & Routing Logic](#shipping-types--routing-logic)
4. [Complete Workflow: Step-by-Step](#complete-workflow-step-by-step)
5. [Pricing Formulas & Calculations](#pricing-formulas--calculations)
6. [EasyShip Integration](#easyship-integration)
7. [Package Management](#package-management)
8. [Pickup Service Workflow](#pickup-service-workflow)
9. [Label Generation & Tracking](#label-generation--tracking)
10. [Admin Operations](#admin-operations)
11. [Status Flows & Transitions](#status-flows--transitions)

---

## Overview

YuuSell handles three main types of shipping:

1. **Local Shipping** (Same Country): EasyShip quotes only - user buys label, direct delivery
2. **International Parcels** (< 100kg, not vehicles): Two-leg shipping
   - Leg 1: User → Warehouse (EasyShip)
   - Leg 2: Warehouse → Destination (YuuSell routes)
3. **YuuSell-Handled** (Cars OR >100kg): YuuSell's own calculation with local pickup only

---

## Quote Calculation System

### API Endpoint: `/api/v1/logistics/calculate-shipping/`

**Method**: `POST`  
**Access**: Public (no authentication required for quotes)

### Request Parameters

```json
{
  "origin_country": "US", // ISO country code
  "destination_country": "CA", // ISO country code
  "weight": 5.5, // Weight in kg
  "dimensions": {
    // Dimensions in cm
    "length": 30,
    "width": 20,
    "height": 15
  },
  "declared_value": 150.0, // Declared value in USD
  "shipping_category": "small_parcel", // Optional: auto, small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle
  "origin_address": {
    // Optional: Full address for pickup calculation
    "full_name": "John Doe",
    "street_address": "123 Main St",
    "city": "New York",
    "state_province": "NY",
    "postal_code": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "destination_address": {
    // Required for local shipping
    "full_name": "Jane Smith",
    "street_address": "456 Oak Ave",
    "city": "Toronto",
    "state_province": "ON",
    "postal_code": "M5H 2N2",
    "country": "CA",
    "phone": "+14161234567"
  },
  "items": [
    // Optional: Item details for customs
    {
      "description": "Electronics",
      "hs_code": "85171200",
      "quantity": 1,
      "value": 150.0,
      "currency": "USD"
    }
  ]
}
```

### Response Structure

```json
{
  "quotes": [
    {
      "transport_mode": "AIR",              // Transport mode code
      "transport_mode_name": "Air Freight",  // Display name
      "route_id": 1,                         // ShippingRoute ID
      "carrier": "Multiple Carriers",        // Carrier name
      "service_name": "Express Air",         // Service name
      "base_rate": 45.00,                    // Base shipping cost
      "pickup_cost": 25.00,                  // Pickup cost (if required)
      "total": 70.00,                        // Total cost
      "transit_days": (3, 7),                // Min-max transit days
      "transit_days_min": 3,
      "transit_days_max": 7,
      "shipping_category": "small_parcel",
      "pickup_required": false,
      "is_local_shipping": false,
      "is_international_parcel": false,
      "is_yuusell_handled": false,
      "breakdown": {                         // Cost breakdown
        "base_rate": 45.00,
        "fuel_surcharge": 6.75,
        "security_fee": 25.00,
        "markup": 11.50
      }
    }
  ],
  "quote_request_id": 123,                  // QuoteRequest ID for later conversion
  "pickup_required": false,
  "is_local_shipping": false
}
```

### How Quote Calculation Works

#### Step 1: Determine Shipping Type

The system checks:

1. **Is Local Shipping?**

   ```python
   is_local = origin_country == destination_country
   ```

   - If `True`: Use EasyShip quotes only (skip warehouse)
   - If `False`: Continue to next check

2. **Is International Parcel?**

   ```python
   is_international_parcel = (
       shipping_category in ['small_parcel', 'heavy_parcel'] and
       weight <= 100 and
       shipping_category != 'vehicle'
   )
   ```

   - If `True`: Two-leg shipping (EasyShip + Routes)
   - If `False`: Continue to next check

3. **Is YuuSell-Handled?**
   ```python
   is_yuusell_handled = (shipping_category == 'vehicle' or weight > 100)
   ```
   - If `True`: YuuSell's own calculation + pickup required
   - If `False`: Standard route-based calculation

#### Step 2: Get Warehouse Address

For international shipping, system selects warehouse:

```python
warehouse_address = calculator.get_warehouse_address(
    origin_country,      # e.g., 'US'
    shipping_category   # e.g., 'small_parcel'
)
```

**Selection Logic**:

1. Find warehouses in origin country
2. Filter by `is_active=True`
3. Check if warehouse supports shipping category (via `shipping_categories` JSONField)
4. Select highest priority warehouse
5. Return warehouse address dict

**Warehouse Address Format**:

```json
{
  "full_name": "YuuSell Logistics Warehouse",
  "company": "YuuSell Logistics Warehouse",
  "street_address": "123 Warehouse St",
  "street_address_2": "",
  "city": "Los Angeles",
  "state_province": "CA",
  "postal_code": "90001",
  "country": "US",
  "phone": "+1-555-123-4567",
  "email": "warehouse@logistics.yuusell.com"
}
```

#### Step 3: Calculate Quotes Based on Type

**A. Local Shipping** (`is_local=True`):

- Calls `get_local_shipping_quotes()`
- Uses EasyShip API directly
- Returns all available EasyShip rates
- No warehouse involved
- No pickup required (user drops off or uses carrier pickup)

**B. International Parcels** (`is_international_parcel=True`):

- Calls `get_international_parcel_quotes()`
- **Leg 1**: EasyShip rates from origin to warehouse
- **Leg 2**: Route-based quotes from warehouse to destination
- Combines both legs into single quote
- Returns quotes with breakdown showing both legs

**C. YuuSell-Handled** (`is_yuusell_handled=True`):

- Uses route-based calculation only
- Validates pickup availability
- Adds pickup cost
- No EasyShip to warehouse (pickup replaces it)

**D. Standard** (everything else):

- Route-based calculation
- Optional pickup if weight/category requires
- Optional EasyShip to warehouse if no pickup

---

## Shipping Types & Routing Logic

### Type 1: Local Shipping (Same Country)

**When**: `origin_country == destination_country`

**How It Works**:

1. System calls EasyShip API with full origin and destination addresses
2. EasyShip returns all available carrier rates
3. System formats and returns quotes
4. User selects a quote and pays
5. System generates EasyShip label
6. User drops off package or carrier picks up
7. Package ships directly to destination (no warehouse)

**Quote Structure**:

```json
{
  "transport_mode": "local_courier",
  "transport_mode_name": "FedEx - Express",
  "carrier": "FedEx",
  "service_name": "FedEx Express",
  "total": 25.50,
  "transit_days": (1, 3),
  "is_local_shipping": true,
  "requires_drop_off": false,              // true if user must drop off
  "easyship_rate_id": "rate_123456",
  "easyship_rate_data": {...},             // Full EasyShip rate object
  "breakdown": {
    "shipment_charge": 20.00,
    "insurance_fee": 2.00,
    "fuel_surcharge": 3.50
  }
}
```

**Features**:

- All quotes from EasyShip
- No warehouse involved
- Direct delivery
- May require drop-off (USPS, some DHL services)
- May offer free pickup (FedEx, UPS)

### Type 2: International Parcels (Two-Leg Shipping)

**When**:

- Different countries
- Weight ≤ 100kg
- Category: `small_parcel` or `heavy_parcel`
- Not a vehicle

**How It Works**:

**Leg 1: User → Warehouse (EasyShip)**

1. System gets EasyShip rates from user's origin address to warehouse address
2. Multiple EasyShip options available (FedEx, UPS, DHL, etc.)
3. Each option has different cost and transit time

**Leg 2: Warehouse → Destination (YuuSell Routes)**

1. System finds available routes from warehouse country to destination country
2. Filters routes by shipping category:
   - `small_parcel`: Air only
   - `heavy_parcel`: Air + Sea
3. Calculates cost using `ShippingCalculationSettings`
4. Multiple transport modes available (Air, Sea, Rail, Truck)

**Combined Quote Structure**:

```json
{
  "transport_mode": "AIR",
  "transport_mode_name": "Air Freight",
  "total": 125.50,
  "is_international_parcel": true,
  "leg1_easyship": {                        // Leg 1: User → Warehouse
    "cost": 25.50,
    "carrier": "FedEx",
    "service_name": "FedEx Ground",
    "transit_days": (2, 4),
    "easyship_rate_id": "rate_123456",
    "easyship_rate_data": {...}
  },
  "leg2_route": {                           // Leg 2: Warehouse → Destination
    "cost": 100.00,
    "transport_mode": "AIR",
    "transit_days": (3, 7),
    "breakdown": {
      "base_rate": 80.00,
      "fuel_surcharge": 12.00,
      "security_fee": 25.00,
      "markup": 15.00
    }
  },
  "breakdown": {
    "leg1_cost": 25.50,
    "leg2_cost": 100.00,
    "total": 125.50
  }
}
```

**Workflow**:

1. User selects quote
2. User pays
3. System generates EasyShip label for Leg 1 (user → warehouse)
4. User ships package to warehouse with reference number
5. Warehouse receives package
6. System uses Leg 2 route to ship from warehouse to destination
7. Package delivered to user

### Type 3: YuuSell-Handled Shipping

**When**:

- Shipping category is `vehicle` OR
- Weight > 100kg

**How It Works**:

1. System validates pickup availability for origin address
2. If pickup not available, returns empty quotes (cannot proceed)
3. Calculates route-based shipping cost (warehouse → destination)
4. Calculates pickup cost (origin → warehouse)
5. Combines both costs
6. Returns quote with pickup required

**Quote Structure**:

```json
{
  "transport_mode": "SEA",
  "transport_mode_name": "Sea Freight",
  "total": 2500.0,
  "is_yuusell_handled": true,
  "pickup_required": true,
  "pickup_cost": 150.0,
  "shipping_cost": 2350.0,
  "breakdown": {
    "pickup_cost": 150.0,
    "base_rate": 2000.0,
    "port_fees": 200.0,
    "customs": 75.0,
    "delivery": 80.0,
    "markup": 350.0
  }
}
```

**Workflow**:

1. User selects quote
2. User pays
3. System creates `PickupRequest`
4. Worker schedules pickup
5. Worker picks up item
6. Item delivered to warehouse
7. Warehouse processes and ships via route
8. Package delivered to destination

---

## Complete Workflow: Step-by-Step

### Phase 1: Quote Request (Anonymous)

**Step 1: User Fills Quote Form** (Frontend)

- User enters origin and destination addresses
- User enters weight, dimensions, declared value
- User clicks "Get Quote"

**Step 2: System Calculates Quotes** (Backend)

- API: `POST /api/v1/logistics/calculate-shipping/`
- System determines shipping type
- System calculates quotes based on type
- System creates `QuoteRequest` with session ID
- System stores quotes in `QuoteRequest.quote_data`

**Step 3: User Reviews Quotes** (Frontend)

- System displays all available quotes
- Quotes sorted by price (lowest first)
- User can see:
  - Transport mode
  - Carrier/service name
  - Total cost
  - Transit time
  - Cost breakdown
  - Pickup requirements

**Step 4: User Selects Quote** (Frontend)

- User clicks on a quote
- System stores selected quote in session
- User proceeds to login/register

### Phase 2: Shipment Creation (After Login)

**Step 5: User Proceeds with Quote** (Frontend → Backend)

- API: `POST /api/v1/logistics/proceed-with-quote/`
- User must be authenticated
- System retrieves `QuoteRequest` by ID
- System validates quote hasn't been converted
- System creates `LogisticsShipment`:
  ```python
  LogisticsShipment.objects.create(
      user=request.user,
      shipment_number=uuid.uuid4()[:8].upper(),
      source_type='ship_my_items',
      shipping_category=quote_request.shipping_category,
      transport_mode=selected_quote.transport_mode,
      actual_weight=weight,
      chargeable_weight=max(actual_weight, dimensional_weight),
      origin_address=origin_address,
      destination_address=destination_address,
      shipping_cost=total_cost - pickup_cost,
      pickup_cost=pickup_cost,
      total_cost=total_cost,
      status='quote_approved',
      quote_request=quote_request,
      is_local_shipping=is_local
  )
  ```
- System creates `PickupRequest` if pickup required
- System marks `QuoteRequest.converted_to_shipment = True`

**Step 6: User Pays** (Frontend → Stripe)

- API: `POST /api/v1/logistics/create-payment-session/`
- System creates Stripe checkout session
- System creates `Payment` record (status: `pending`)
- System updates shipment status to `payment_pending`
- User completes payment on Stripe
- Stripe webhook updates payment status to `completed`
- System updates shipment status to `payment_received`

### Phase 3: Label Generation & Package Creation

**Step 7: Generate Shipping Label** (Frontend/Admin)

**For Local Shipping**:

- API: `POST /api/v1/logistics/shipments/{id}/generate-label/`
- System calls EasyShip API to create shipment
- System uses `easyship_rate_id` from selected quote
- System sets destination as final destination address
- EasyShip generates label
- System updates shipment:
  - `easyship_shipment_id`
  - `easyship_label_url`
  - `tracking_number`
  - `status = 'label_generating'`
- EasyShip webhook confirms label creation
- System updates `status = 'processing'`

**For International Parcels**:

- API: `POST /api/v1/logistics/shipments/{id}/generate-label/`
- System calls EasyShip API to create shipment
- System uses `leg1_easyship.easyship_rate_id` from selected quote
- **Important**: System sets destination as **warehouse address** (not final destination)
- System uses package reference number as `contact_name` in origin address
- EasyShip generates label for Leg 1 (user → warehouse)
- System updates shipment with label info
- System creates `Package` automatically:
  ```python
  Package.objects.create(
      user=shipment.user,
      reference_number=generate_package_reference_number(),  # PKG-YYYYMMDD-XXXXXX
      tracking_number=easyship_tracking_number,
      weight=shipment.actual_weight,
      dimensions=shipment.quote_request.dimensions,
      declared_value=shipment.quote_request.declared_value,
      status='pending',
      shipment=shipment
  )
  ```

**For YuuSell-Handled**:

- No EasyShip label (pickup service)
- System creates `PickupRequest` only
- Package created when item arrives at warehouse

**Step 8: User Ships Package** (Physical)

**For Local Shipping**:

- User prints EasyShip label
- User drops off at carrier location OR carrier picks up
- Package ships directly to destination

**For International Parcels**:

- User prints EasyShip label
- User ships package to warehouse using label
- Package arrives at warehouse with reference number

**For YuuSell-Handled**:

- Worker picks up item
- Worker delivers to warehouse
- Package created at warehouse

### Phase 4: Warehouse Operations

**Step 9: Warehouse Receives Package** (Admin)

**For International Parcels**:

1. Package arrives with reference number (PKG- or BS- prefix)
2. Worker goes to `/admin/logistics/package/`
3. Worker searches for package by reference number
4. Worker clicks "📦 Receive" button
5. Worker fills receiving form:
   - Weight (verify against expected)
   - Dimensions (verify)
   - Storage location
   - Upload photos (up to 5)
   - Notes
6. System updates:
   - Package status: `received`
   - Package `received_date`
   - Shipment status: `processing`
   - Creates `TrackingUpdate`

**For YuuSell-Handled**:

1. Worker picks up item (see Pickup Workflow)
2. Worker delivers to warehouse
3. Worker receives package same as above

**Step 10: Package Processing** (Admin)

Worker uses status action buttons:

1. **"✓ Inspected"** (Status: `received` → `inspected`)

   - Confirms package inspection complete
   - Creates `TrackingUpdate`

2. **"🚀 Ready to Ship"** (Status: `inspected` → `ready`)

   - Marks package ready for shipping
   - Updates shipment status: `ready_to_ship`
   - Creates `TrackingUpdate`

3. **"🚚 In Transit"** (Status: `ready` → `in_transit`)
   - Marks package as shipped
   - Updates shipment status: `in_transit`
   - Creates `TrackingUpdate`

**For International Parcels - Leg 2 Shipping**:

- System uses route from warehouse to destination
- Worker ships via selected transport mode (Air, Sea, Rail, Truck)
- System tracks via `LogisticsShipment` status

### Phase 5: Delivery

**Step 11: Package Delivered** (Admin)

1. Worker clicks "✅ Delivered" button
2. Worker uploads delivery photos (up to 5)
3. System updates:
   - Package status: `delivered`
   - Shipment status: `delivered`
   - Shipment `actual_delivery` timestamp
   - Creates `TrackingUpdate`
4. System sends email to user with delivery photos

---

## Pricing Formulas & Calculations

### Air Freight Formula

**Chargeable Weight**:

```
chargeable_weight = max(actual_weight, dimensional_weight)

dimensional_weight = (length × width × height in cm) / dimensional_weight_divisor
```

**Cost Calculation**:

```
base_rate = base_rate_setting + (chargeable_weight × per_kg_rate)
fuel_surcharge = base_rate × (fuel_surcharge_percent / 100)
security_fee = security_fee_setting
handling_fee = handling_fee_setting (optional)
bulk_discount = total × (bulk_discount_percent / 100) (if applicable)

total = base_rate + fuel_surcharge + security_fee + handling_fee - bulk_discount
final_total = total + (total × markup_percent / 100)
```

**Example**:

- Weight: 10kg
- Dimensions: 30×20×15 cm
- Dimensional weight: (30×20×15) / 5000 = 1.8 kg
- Chargeable weight: max(10, 1.8) = 10 kg
- Base rate: $0 + (10 × $8.50) = $85.00
- Fuel surcharge: $85.00 × 15% = $12.75
- Security fee: $25.00
- Total: $85.00 + $12.75 + $25.00 = $122.75
- Markup (10%): $122.75 × 10% = $12.28
- **Final Total: $135.03**

### Sea Freight Formula (LCL)

**Volume Calculation**:

```
length_m = length_cm / 100
width_m = width_cm / 100
height_m = height_cm / 100
volume_cbm = length_m × width_m × height_m
weight_ton = weight_kg / 1000
```

**Cost Calculation**:

```
cost_by_volume = volume_cbm × rate_per_cbm
cost_by_weight = weight_ton × rate_per_ton
base_shipping = max(cost_by_volume, cost_by_weight)

ocean_freight_base = ocean_freight_base_setting
port_origin_handling = port_origin_handling_setting
port_destination_handling = port_destination_handling_setting
documentation_fee = documentation_fee_setting
customs_clearance_fee = customs_clearance_fee_setting
destination_delivery_fee = destination_delivery_fee_setting

total = ocean_freight_base + base_shipping + port_origin_handling +
        port_destination_handling + documentation_fee +
        customs_clearance_fee + destination_delivery_fee
final_total = total + (total × markup_percent / 100)
```

**Example**:

- Weight: 500kg (0.5 tons)
- Dimensions: 200×150×100 cm = 3 CBM
- Cost by volume: 3 × $65 = $195.00
- Cost by weight: 0.5 × $150 = $75.00
- Base shipping: max($195, $75) = $195.00
- Ocean freight base: $150.00
- Port fees: $75 + $120 = $195.00
- Documentation: $45.00
- Customs: $75.00
- Delivery: $80.00
- Total: $150 + $195 + $195 + $45 + $75 + $80 = $740.00
- Markup (10%): $74.00
- **Final Total: $814.00**

### Sea Freight Formula (FCL - Container)

**Container Selection**:

```
if volume_cbm <= 20ft_cbm_capacity (28 CBM):
    use 20ft container
    container_cost = container_20ft_price
elif volume_cbm <= 40ft_cbm_capacity (58 CBM):
    use 40ft container
    container_cost = container_40ft_price
else:
    use multiple containers
```

**Cost Calculation**:

```
container_cost = container_20ft_price OR container_40ft_price
origin_fees = container_origin_fees
destination_fees = container_destination_fees
customs_fee = container_customs_fee
delivery_fee = container_delivery_fee

total = container_cost + origin_fees + destination_fees +
        customs_fee + delivery_fee
final_total = total + (total × markup_percent / 100)
```

**Example**:

- Volume: 25 CBM (fits in 20ft container)
- Container cost: $2,200.00
- Origin fees: $200.00
- Destination fees: $300.00
- Customs: $150.00
- Delivery: $200.00
- Total: $2,200 + $200 + $300 + $150 + $200 = $3,050.00
- Markup (10%): $305.00
- **Final Total: $3,355.00**

### Rail Freight Formula

```
base_route_cost = base_rate_rail_setting
per_kg_rate = per_kg_rate_rail_setting
terminal_handling = terminal_handling_fee_setting
customs_fee = customs_fee_rail_setting

base_rate = base_route_cost + (weight_kg × per_kg_rate)
total = base_rate + terminal_handling + customs_fee
final_total = total + (total × markup_percent / 100)
```

**Example**:

- Weight: 1000kg
- Base route: $200.00
- Per kg: $2.50
- Base rate: $200 + (1000 × $2.50) = $2,700.00
- Terminal handling: $100.00
- Customs: $50.00
- Total: $2,700 + $100 + $50 = $2,850.00
- Markup (10%): $285.00
- **Final Total: $3,135.00**

### Truck/Road Freight Formula

**LTL (Less Than Truckload)** - Weight < 10,000 lbs:

```
weight_lbs = weight_kg × 2.20462
cwt = weight_lbs / 100  // Hundredweight (100 lbs units)
base_rate_per_cwt = base_rate_truck_setting
freight_class_multiplier = freight_class / 100  // e.g., 70 = 0.70

base_rate = cwt × base_rate_per_cwt × freight_class_multiplier
fuel_surcharge = base_rate × (fuel_surcharge_percent / 100)
accessorials = handling_fee_setting

total = base_rate + fuel_surcharge + accessorials
final_total = total + (total × markup_percent / 100)
```

**FTL (Full Truckload)** - Weight ≥ 10,000 lbs:

```
base_rate = base_rate_truck_setting × 40  // Scaled for FTL
fuel_surcharge = base_rate × (fuel_surcharge_percent / 100)
accessorials = 0

total = base_rate + fuel_surcharge
final_total = total + (total × markup_percent / 100)
```

**Example (LTL)**:

- Weight: 500kg = 1,102 lbs
- CWT: 1,102 / 100 = 11.02
- Base rate per CWT: $50.00
- Freight class: 70 (multiplier: 0.70)
- Base rate: 11.02 × $50 × 0.70 = $385.70
- Fuel surcharge (15%): $385.70 × 15% = $57.86
- Accessorials: $50.00
- Total: $385.70 + $57.86 + $50.00 = $493.56
- Markup (10%): $49.36
- **Final Total: $542.92**

### Pickup Cost Formula

**Distance Calculation** (Simplified):

```
if origin_country != warehouse_country:
    distance_km = 0  // Different countries, no distance-based cost
elif origin_city == warehouse_city:
    distance_km = 15  // Same city
elif origin_state == warehouse_state:
    distance_km = 100  // Same state, different city
else:
    distance_km = 500  // Different states
```

**Chargeable Weight**:

```
chargeable_weight = max(actual_weight, dimensional_weight)
// Uses PickupCalculationSettings.dimensional_weight_divisor
```

**Cost Calculation**:

```
base_cost = base_pickup_fee
weight_cost = chargeable_weight × per_kg_rate
distance_cost = distance_km × per_km_rate

total = base_cost + weight_cost + distance_cost

// Add residential fee if residential address
if not origin_address.get('company'):
    total += residential_fee

// Add lift gate fee for heavy items
if shipping_category in ['ltl_freight', 'ftl_freight', 'vehicle', 'super_heavy']:
    total += lift_gate_fee

// Apply markup
if markup_percent > 0:
    total += total × (markup_percent / 100)

// Ensure minimum
final_total = max(total, minimum_pickup_fee)
```

**Example**:

- Weight: 50kg
- Distance: 100km (same state, different city)
- Base fee: $25.00
- Per kg: $0.50
- Per km: $1.50
- Weight cost: 50 × $0.50 = $25.00
- Distance cost: 100 × $1.50 = $150.00
- Total: $25 + $25 + $150 = $200.00
- Residential fee: $5.00
- Total: $205.00
- Minimum: $15.00
- **Final Total: $205.00**

---

## EasyShip Integration

### EasyShip API Endpoints Used

1. **Get Rates**: `POST /2024-09/rates`

   - Used for: Local shipping quotes, Leg 1 quotes (international parcels)
   - Returns: List of available carrier rates

2. **Create Shipment**: `POST /2024-09/shipments`

   - Used for: Generating shipping labels
   - Returns: Shipment ID, label URL, tracking number

3. **Address Validation**: `POST /2024-09/addresses/validations`
   - Used for: Validating user addresses before quote submission
   - Returns: Validated address or validation errors

### EasyShip Rate Structure

```json
{
  "id": "rate_123456789", // Rate ID (used for label generation)
  "courier_service": {
    "id": "service_123",
    "name": "FedEx Express",
    "umbrella_name": "FedEx",
    "courier_id": "fedex",
    "logo": "https://..."
  },
  "total_charge": 25.5, // Total cost
  "shipment_charge": 20.0, // Base shipping cost
  "insurance_fee": 2.0, // Insurance cost
  "fuel_surcharge": 3.5, // Fuel surcharge
  "additional_services_surcharge": 0.0, // Additional services
  "min_delivery_time": 1, // Min transit days
  "max_delivery_time": 3, // Max transit days
  "available_handover_options": [
    // Pickup/drop-off options
    "free_pickup",
    "dropoff"
  ],
  "tracking_rating": 5, // Tracking quality (1-5)
  "cost_rank": 1, // Price ranking (lower = cheaper)
  "delivery_time_rank": 1, // Speed ranking (lower = faster)
  "value_for_money_rank": 1 // Value ranking (lower = better)
}
```

### EasyShip Webhook Events

**Webhook URL**: `/api/v1/logistics/easyship-webhook/`

**Event Types Handled**:

1. **`shipment.label.created`**

   - When: Label successfully generated
   - Action:
     - Update shipment `easyship_label_url`
     - Update shipment `tracking_number`
     - Update shipment `tracking_page_url`
     - Change status: `label_generating` → `processing`
     - Create `TrackingUpdate`

2. **`shipment.label.failed`**

   - When: Label generation failed
   - Action:
     - Revert status: `label_generating` → `payment_received`
     - Create `TrackingUpdate` with failure status

3. **`shipment.tracking.status.changed`**

   - When: Tracking status updated
   - Action:
     - Update shipment status (mapped from EasyShip status)
     - Update tracking number
     - Create `TrackingUpdate`

4. **`shipment.tracking.checkpoints.created`**

   - When: New tracking checkpoints added
   - Action:
     - Create `TrackingUpdate` for each checkpoint
     - Update shipment status based on latest checkpoint

5. **`shipment.cancelled`**
   - When: Shipment cancelled in EasyShip
   - Action:
     - Update shipment status: `cancelled`
     - Create `TrackingUpdate`

### Status Mapping (EasyShip → YuuSell)

```
EasyShip Status          →  YuuSell Status
─────────────────────────────────────────────
Label Created            →  processing
Picked Up                →  dispatched
In Transit               →  in_transit
In Transit to Customer   →  in_transit
Out for Delivery         →  out_for_delivery
Delivered                →  delivered
```

---

## Package Management

### Package Creation

**Automatic Creation**:

- Created when EasyShip label is generated for `ship_my_items` shipments
- Created when package arrives at warehouse (for buy-and-ship)

**Package Reference Number**:

- Format: `PKG-YYYYMMDD-XXXXXX`
- Example: `PKG-20251209-A5SCDZ`
- Auto-generated using `generate_package_reference_number()`

**Package Fields**:

```python
Package(
    user=shipment.user,
    reference_number="PKG-20251209-A5SCDZ",
    tracking_number="1Z999AA10123456784",  # Inbound tracking from EasyShip
    weight=5.5,                              # Actual weight in kg
    length=30,                               # Dimensions in cm
    width=20,
    height=15,
    declared_value=150.00,
    status='pending',                        # pending, received, inspected, ready, in_transit, delivered
    shipment=shipment,                       # Linked to LogisticsShipment
    received_date=None,                      # Set when received
    storage_location="A-12-3",              # Warehouse location
    photo_1=ImageField,                      # Inbound photos (up to 5)
    delivery_photo_1=ImageField              # Delivery photos (up to 5)
)
```

### Package Status Workflow

```
pending → received → inspected → ready → in_transit → delivered
```

**Status Transitions**:

1. **pending** → **received**

   - Trigger: Worker receives package at warehouse
   - Action: Upload photos, enter weight/dimensions, set storage location
   - Updates: `received_date`, `status`, shipment status → `processing`

2. **received** → **inspected**

   - Trigger: Worker clicks "✓ Inspected" button
   - Action: Confirms inspection complete
   - Updates: `status`, creates `TrackingUpdate`

3. **inspected** → **ready**

   - Trigger: Worker clicks "🚀 Ready to Ship" button
   - Action: Marks ready for shipping
   - Updates: `status`, shipment status → `ready_to_ship`, creates `TrackingUpdate`

4. **ready** → **in_transit**

   - Trigger: Worker clicks "🚚 In Transit" button
   - Action: Marks as shipped
   - Updates: `status`, shipment status → `in_transit`, creates `TrackingUpdate`

5. **in_transit** → **delivered**
   - Trigger: Worker clicks "✅ Delivered" button
   - Action: Upload delivery photos, mark delivered
   - Updates: `status`, shipment status → `delivered`, `actual_delivery`, creates `TrackingUpdate`, sends email

### Package-Shipment Relationship

- **Many-to-Many**: One shipment can have multiple packages
- **Primary Link**: `Package.shipment` (ForeignKey)
- **Reverse Access**: `LogisticsShipment.packages` (ManyToMany)

**When Package Status Changes**:

- System automatically updates linked `LogisticsShipment` status
- System creates `TrackingUpdate` records
- Status hierarchy prevents downgrades (e.g., won't go from `delivered` back to `in_transit`)

---

## Pickup Service Workflow

### When Pickup is Required

1. **YuuSell-Handled Items**:

   - Vehicles
   - Weight > 100kg
   - Always requires pickup

2. **Standard Items**:

   - Weight ≥ threshold (configurable, default: heavy items)
   - Shipping category: `ltl_freight`, `ftl_freight`, `super_heavy`
   - User requests pickup

3. **Pickup Available Check**:
   - System checks `PickupCalculationSettings` for origin address
   - Must have settings for: Country + State + Category
   - If no settings found, pickup not available

### PickupRequest Creation

**Automatic Creation**:

- Created when shipment is created with `pickup_required=True`
- Created when `pickup_cost > 0`

**PickupRequest Fields**:

```python
PickupRequest(
    shipment=shipment,                       # OneToOne link
    worker=None,                             # Assigned warehouse worker
    pickup_address=origin_address,           # Full pickup address
    contact_name="John Doe",
    contact_phone="+1234567890",
    special_instructions="Ring doorbell",
    scheduled_date=None,                     # Scheduled date
    scheduled_time=None,                     # Scheduled time
    scheduled_datetime=None,                 # Combined datetime (auto-calculated)
    status='pending',                        # pending, scheduled, in_progress, completed, failed, cancelled
    pickup_attempts=0,
    expected_weight=50.0,
    expected_dimensions={'length': 30, 'width': 20, 'height': 15}
)
```

### Pickup Workflow

**Step 1: Pickup Request Created**

- Status: `pending`
- Worker: Not assigned
- System creates `TrackingUpdate`: "Pickup request created"

**Step 2: Worker Schedules Pickup** (Admin)

- Admin goes to `/admin/logistics/pickuprequest/`
- Admin opens pickup request
- Admin assigns worker
- Admin sets `scheduled_date` and `scheduled_time`
- System auto-calculates `scheduled_datetime`
- Status: `scheduled`
- System creates `TrackingUpdate`: "Pickup scheduled"

**Step 3: Worker Picks Up** (Admin)

- Worker clicks "Picked Up" button
- System updates:
  - `picked_up_at` = now
  - `status` = `in_progress`
  - `pickup_attempts` += 1
- System creates `TrackingUpdate`: "Picked up"

**Step 4: Worker Delivers to Warehouse** (Admin)

- Worker clicks "Dropped Off" button
- System updates:
  - `delivered_to_warehouse_at` = now
  - `status` = `completed`
  - `completed_at` = now
- System updates shipment:
  - `status` = `processing`
- System creates `TrackingUpdate`: "Warehouse received"

**Step 5: Package Created** (If not already created)

- System creates `Package` when item arrives at warehouse
- Links to `LogisticsShipment`
- Status: `pending`

### Pickup Rescheduling

**When**:

- Worker changes `scheduled_date` or `scheduled_time`
- System detects change in `scheduled_datetime`

**Action**:

- System creates `TrackingUpdate`: "Pickup rescheduled"
- Includes old and new scheduled times

---

## Label Generation & Tracking

### Label Generation Process

**API**: `POST /api/v1/logistics/shipments/{id}/generate-label/`

**Prerequisites**:

- Shipment status: `quote_approved`, `payment_received`, or `processing`
- Payment completed
- No existing label
- Not already generating

**Process**:

1. **Validate Shipment**

   ```python
   if shipment.status == 'label_generating':
       return error("Label generation already in progress")
   if shipment.easyship_label_url:
       return error("Label already exists")
   if not is_shipment_paid(shipment):
       return error("Payment required")
   ```

2. **Prepare Parcels Data**

   ```python
   parcels = [{
       'total_actual_weight': shipment.actual_weight,
       'items': [{
           'description': 'General Merchandise',
           'hs_code': '999999',
           'quantity': 1,
           'dimensions': {...},
           'actual_weight': shipment.actual_weight,
           'declared_customs_value': declared_value,
           'declared_currency': 'USD',
           'origin_country_alpha2': origin_country
       }]
   }]
   ```

3. **Determine Destination Address**

   - **Local Shipping**: Use final destination address
   - **International Parcels**: Use warehouse address (Leg 1 only)
   - **YuuSell-Handled**: No EasyShip label (pickup only)

4. **Get Rate ID**

   - Extract from `QuoteRequest.quote_data.selected_quote`
   - For international parcels: `leg1_easyship.easyship_rate_id`
   - For local shipping: `easyship_rate_id`

5. **Get Package Reference Number**

   - If package exists, use `package.reference_number`
   - Use as `contact_name` in origin address for EasyShip

6. **Call EasyShip API**

   ```python
   easyship_result = easyship.create_shipment(
       rate_id=rate_id,
       origin_address=origin_address,
       destination_address=easyship_destination_address,
       parcels=parcels,
       courier_name=courier_name,
       package_reference_number=package_reference_number
   )
   ```

7. **Update Shipment**

   ```python
   shipment.status = 'label_generating'
   shipment.easyship_shipment_id = easyship_result['easyship_shipment_id']
   shipment.save()
   ```

8. **Wait for Webhook**
   - EasyShip sends webhook when label is created
   - Webhook updates: `easyship_label_url`, `tracking_number`, `status = 'processing'`

### Tracking System

**Tracking Updates** are created for:

1. **EasyShip Webhooks**:

   - Label created
   - Tracking status changed
   - New checkpoints
   - Shipment cancelled

2. **Package Status Changes**:

   - Received
   - Inspected
   - Ready to ship
   - In transit
   - Delivered

3. **Pickup Status Changes**:

   - Scheduled
   - Picked up
   - Delivered to warehouse
   - Rescheduled

4. **Shipment Status Changes**:
   - Any status change triggers `TrackingUpdate` (via signal)

**TrackingUpdate Structure**:

```python
TrackingUpdate(
    shipment=shipment,
    carrier_tracking_number="1Z999AA10123456784",
    status="in_transit",
    location="New York, NY, 10001, USA",
    timestamp=datetime.now(),
    source="webhook",  # or "manual"
    raw_data={
        "event_type": "shipment.tracking.checkpoints.created",
        "checkpoint": {...},
        "message": "Arrived at Regional Facility"
    }
)
```

**Tracking Display**:

- Shown in shipment detail page as timeline
- Ordered by timestamp (newest first)
- Includes location, status, message
- Shows source (webhook vs manual)

---

## Admin Operations

### Viewing Shipments

**List View**: `/admin/logistics/logisticsshipment/`

**Filters**:

- Status
- Source Type (ship_my_items, buy_and_ship, vehicle)
- Shipping Category
- Transport Mode
- Created Date

**Search**:

- Shipment Number
- User Email
- Tracking Number

**List Display**:

- Shipment Number
- User
- Source Type
- Status (color-coded badge)
- Transport Mode
- Total Cost
- Created Date

### Shipment Detail Page

**Sections**:

1. **Basic Information**

   - User
   - Shipment Number
   - Source Type
   - Shipping Category
   - Transport Mode
   - Service Level
   - Status

2. **Weight & Dimensions**

   - Actual Weight
   - Chargeable Weight
   - Actual Volume (CBM)

3. **Addresses**

   - Origin Address (JSONField)
   - Destination Address (JSONField)

4. **Pricing**

   - Shipping Cost
   - Insurance Cost
   - Service Fee
   - Pickup Cost
   - Total Cost

5. **Tracking**

   - Tracking Number
   - Carrier
   - EasyShip Shipment ID
   - EasyShip Label URL (clickable link)
   - Tracking Page URL (clickable link)
   - Estimated Delivery
   - Actual Delivery

6. **Linked Objects**

   - Quote Request (if from quote page)
   - Packages (ManyToMany - shows all linked packages)
   - Vehicle (OneToOne - if vehicle shipment)
   - Pickup Request (OneToOne - if pickup required)

7. **Tracking Updates** (Timeline)
   - Shows all tracking events
   - Displays: Timestamp, Status, Location, Source
   - Ordered by timestamp (newest first)

### Package Management (Admin)

**List View**: `/admin/logistics/package/`

**Status Action Buttons**:

- Appear based on current status
- Each button performs specific action
- See [Package Status Workflow](#package-status-workflow)

**Receive Package**:

1. Click "📦 Receive" button
2. Form opens with package details
3. Fill in:
   - Weight
   - Dimensions
   - Tracking number
   - Storage location
   - Upload photos
   - Notes
4. Submit
5. Package status: `received`
6. Shipment status: `processing`

### Pickup Request Management (Admin)

**List View**: `/admin/logistics/pickuprequest/`

**Action Buttons**:

- **Picked Up**: Marks as in progress
- **Dropped Off**: Marks as completed, updates shipment

**Scheduling**:

1. Open pickup request
2. Assign worker
3. Set scheduled date and time
4. Save
5. System creates `TrackingUpdate`: "Pickup scheduled"

### Generating Labels (Admin)

**For Local Shipping**:

- Label generated automatically when user pays
- Or manually via frontend "Generate Label" button
- Label URL shown in shipment detail page

**For International Parcels**:

- Label generated for Leg 1 (user → warehouse)
- User ships package to warehouse
- Leg 2 handled by warehouse (route-based)

**For YuuSell-Handled**:

- No EasyShip label
- Pickup service only

---

## Status Flows & Transitions

### LogisticsShipment Status Flow

```
quote_requested → quote_approved → payment_pending → payment_received →
label_generating → processing → ready_to_ship → dispatched → in_transit →
customs_clearance → out_for_delivery → delivered → cancelled
```

**Status Descriptions**:

- **quote_requested**: Quote calculated, user reviewing
- **quote_approved**: User selected quote, shipment created
- **payment_pending**: Payment session created, waiting for payment
- **payment_received**: Payment completed
- **label_generating**: EasyShip label generation in progress
- **processing**: Label created, package at warehouse or in transit to warehouse
- **ready_to_ship**: Package ready to ship from warehouse
- **dispatched**: Package dispatched from warehouse
- **in_transit**: Package in transit to destination
- **customs_clearance**: Package in customs
- **out_for_delivery**: Package out for delivery
- **delivered**: Package delivered
- **cancelled**: Shipment cancelled

### Package Status Flow

```
pending → received → inspected → ready → in_transit → delivered
```

**Status Descriptions**:

- **pending**: Package not yet received at warehouse
- **received**: Package received at warehouse
- **inspected**: Package inspected
- **ready**: Package ready to ship
- **in_transit**: Package in transit
- **delivered**: Package delivered to user

### PickupRequest Status Flow

```
pending → scheduled → in_progress → completed
```

**Status Descriptions**:

- **pending**: Pickup request created, not scheduled
- **scheduled**: Pickup scheduled with date/time
- **in_progress**: Item picked up, in transit to warehouse
- **completed**: Item delivered to warehouse
- **failed**: Pickup failed (not used currently)
- **cancelled**: Pickup cancelled

---

## Key Admin Tasks

### Task 1: Review Quote Requests

1. Go to `/admin/logistics/quoterequest/`
2. View quote requests (anonymous users)
3. Check if converted to shipment
4. View quote data (JSONField)

### Task 2: Monitor Shipments

1. Go to `/admin/logistics/logisticsshipment/`
2. Filter by status
3. Check payment status
4. View tracking updates

### Task 3: Receive Packages

1. Go to `/admin/logistics/package/`
2. Search by reference number
3. Click "📦 Receive" button
4. Fill receiving form
5. Submit

### Task 4: Process Packages

1. Open package detail page
2. Use status action buttons:
   - "✓ Inspected"
   - "🚀 Ready to Ship"
   - "🚚 In Transit"
   - "✅ Delivered"

### Task 5: Manage Pickups

1. Go to `/admin/logistics/pickuprequest/`
2. Open pickup request
3. Assign worker
4. Schedule pickup
5. Mark "Picked Up" when done
6. Mark "Dropped Off" when at warehouse

### Task 6: Generate Labels (If Needed)

1. Open shipment detail page
2. Check if label exists
3. If not, user generates via frontend
4. Or manually trigger if needed

---

## Important Notes

### Two-Leg Shipping for International Parcels

**Critical**: For international parcels, the EasyShip label is generated for **Leg 1 only** (user → warehouse). The destination address in the EasyShip shipment is the **warehouse address**, not the final destination.

**Why**:

- User ships package to warehouse
- Warehouse receives package
- Warehouse then ships to final destination using Leg 2 route

### Package Reference Numbers

**Format**: `PKG-YYYYMMDD-XXXXXX`

**Usage**:

- Used as `contact_name` in EasyShip origin address
- Helps warehouse identify packages
- Displayed on shipping labels

### EasyShip Rate ID Storage

**For International Parcels**:

- Rate ID stored in: `QuoteRequest.quote_data.selected_quote.leg1_easyship.easyship_rate_id`
- Also stored at top level: `selected_quote.easyship_rate_id`

**For Local Shipping**:

- Rate ID stored in: `QuoteRequest.quote_data.selected_quote.easyship_rate_id`
- Also in: `selected_quote.easyship_rate_data.id`

### Markup Application

All route-based calculations include markup:

```
final_total = total + (total × SHIPPING_MARKUP_PERCENTAGE / 100)
```

Markup percentage is configured in Django settings: `SHIPPING_MARKUP_PERCENTAGE`

### Category-Based Pricing

`ShippingCalculationSettings` can be filtered by `shipping_categories`:

- Empty list = applies to all categories
- `['all']` = applies to all categories
- `['small_parcel', 'heavy_parcel']` = applies only to these categories

System selects most specific settings first, then falls back to global defaults.

---

**End of Guide**

This guide covers the complete international and domestic shipping workflow. For buy-and-ship workflows, see the main Comprehensive Admin Guide.
