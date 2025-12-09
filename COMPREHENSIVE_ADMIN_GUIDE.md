# Comprehensive Django Admin Guide for YuuSell Logistics Platform

## Table of Contents

1. [User & Group Management](#user--group-management)
2. [Themes & User Preferences](#themes--user-preferences)
3. [Buy & Ship Workflow](#buy--ship-workflow)
4. [Logistics Models & Admin](#logistics-models--admin)
5. [Pricing & Calculation System](#pricing--calculation-system)
6. [Complete Workflows](#complete-workflows)
7. [Admin Buttons & Actions](#admin-buttons--actions)
8. [Field Explanations](#field-explanations)
9. [Questions for Clarification](#questions-for-clarification)

---

## User & Group Management

### User Admin (`/admin/accounts/user/`)

**Purpose**: Manage all platform users (customers, agents, warehouse workers)

**Key Features**:

- **List Display**: Email, Warehouse ID, Email Verified status, Staff status, Created date
- **Search Fields**: Email, Warehouse ID, First Name, Last Name
- **Filters**: Email Verified, Staff, Superuser, Created date

**Fields Explained**:

- **Email**: Primary login identifier (replaces username)
- **Warehouse ID**: Auto-generated unique ID (format: `JS-12345`) - used for package identification
- **Email Verified**: Whether user has verified their email address
- **Email Verification Code**: 6-digit code sent for verification
- **Phone**: User's phone number
- **Stripe Customer ID**: Stripe customer identifier for payments
- **Is Staff**: Can access Django admin
- **Is Superuser**: Full admin access
- **Groups**: Django permission groups
- **User Permissions**: Individual permissions

**Actions**:

- Create new users
- Edit user details
- Reset passwords
- Assign to groups
- Grant/revoke staff/superuser status

**Best Practices**:

- Warehouse workers should have `is_staff=True` but not necessarily `is_superuser=True`
- Agents should have staff access to manage buying requests
- Regular customers should NOT have staff access

---

### User Preferences Admin (`/admin/accounts/userpreference/`)

**Purpose**: Manage user preferences (theme, language, currency, notifications)

**Fields**:

- **User**: One-to-one link to User
- **Language**: User's preferred language (default: 'en')
- **Currency**: Preferred currency (default: 'USD')
- **Notifications Email**: Email notifications enabled (default: True)
- **Notifications SMS**: SMS notifications enabled (default: False)
- **Theme**: Light or Dark theme (default: 'light')

**Usage**: Usually managed by users through frontend, but can be adjusted in admin if needed

---

## Themes & User Preferences

### Theme System

**Current Implementation**:

- Stored in `UserPreference.theme` field
- Options: `'light'` or `'dark'`
- Default: `'light'`

**How It Works**:

1. User selects theme in frontend
2. Preference saved to `UserPreference` model
3. Frontend reads preference and applies theme

**Admin Access**:

- View/Edit via `/admin/accounts/userpreference/`
- Can override user's theme selection if needed

**Future Enhancements** (Questions to answer):

- Do you want admin-level theme control?
- Should there be a global default theme?
- Should themes be customizable per user or global?

---

## Buy & Ship Workflow

### Complete Workflow Overview

```
1. User Submits Request → 2. Agent Reviews → 3. Agent Generates Quotes →
4. User Approves & Pays → 5. Agent Purchases → 6. Package Arrives at Warehouse →
7. Worker Receives Package → 8. Package Shipped to User → 9. Delivered
```

### Step-by-Step Admin Guide

#### Step 1: User Submits Request

**What Happens**:

- User fills form with:
  - Product URL or description
  - Shipping address
  - Optional: Weight, dimensions, price (for immediate approximate quote)
- System creates `BuyingRequest` with status `'pending'`
- If user provided size/price, approximate quotes are calculated immediately

**Admin View**: `/admin/buying/buyingrequest/`

**Initial Status**: `pending`

**Fields to Review**:

- `product_url`: Link to product
- `product_name`: Product name (if provided)
- `product_description`: Full description
- `shipping_address`: JSON field with full address
- `approximate_quote_data`: Contains weight, dimensions, declared_value if user provided
- `max_budget`: User's maximum budget (if provided)

#### Step 2: Agent Reviews Request

**Admin Actions**:

1. Open the buying request from list view
2. Review product information
3. Check shipping address
4. Review approximate quote data (if available)

**What to Check**:

- Is product URL valid?
- Is shipping address complete?
- Are weight/dimensions reasonable?
- Does product cost seem accurate?

#### Step 3: Agent Generates Quotes

**Admin Button**: "🚀 Generate Quotes Automatically"

**Location**: In the buying request detail page, under "Actions" fieldset

**What It Does**:

1. Calls `QuoteGenerator.create_all_shipping_quotes()`
2. Generates quotes for ALL available shipping modes (Air, Sea, Rail, Truck)
3. Calculates:
   - Product cost (from approximate_quote_data or existing quotes)
   - Sales tax
   - Buying service fee (7.5% of product cost - hardcoded)
   - Domestic shipping cost (if applicable)
   - International shipping cost (warehouse to destination)
   - Total cost

**After Generation**:

- Status changes to `'quoted'` (if was `'pending'`)
- Email sent to user (if status was `'pending'`)
- Multiple `BuyAndShipQuote` objects created (one per shipping mode)

**Quote Details**:

- Each quote includes:
  - `product_cost`: Product price
  - `sales_tax`: Tax amount
  - `buying_service_fee`: 7.5% of product cost
  - `domestic_shipping_cost`: Cost to ship from seller to warehouse
  - `shipping_cost`: Cost from warehouse to user's address
  - `total_cost`: Sum of all costs
  - `estimated_delivery_days`: Estimated transit time
  - `shipping_mode`: Transport mode (Air, Sea, etc.)

**Manual Adjustments**:

- Agent can edit any quote values if needed
- Click on quote in inline section to edit
- Adjust shipping cost, product cost, tax, etc.
- Save to update

#### Step 4: User Approves & Pays

**What Happens** (Frontend):

1. User receives email with quote link
2. User reviews quotes
3. User selects a quote
4. User pays via Stripe
5. Payment webhook creates:
   - `LogisticsShipment` linked to quote
   - `Package` (for non-vehicle items)
   - `Vehicle` (if shipping category is 'vehicle')

**Admin View**:

- Buying request status changes to `'quote_approved'` → `'payment_pending'` → `'payment_received'`
- Check `/admin/payments/payment/` for payment record
- Check `/admin/logistics/logisticsshipment/` for created shipment

#### Step 5: Agent Purchases Item

**Admin Actions**:

1. Open buying request
2. Update status to `'purchasing'`
3. Purchase item from marketplace
4. Fill in purchase details:
   - `purchase_receipt`: URL to receipt
   - `purchase_tracking`: Tracking number from seller
   - `purchase_date`: Date of purchase
   - `reference_number`: Auto-generated (format: `BS-YYYYMMDD-XXXXXX`)
5. Update status to `'purchased'`

**Reference Number**:

- Format: `BS-YYYYMMDD-XXXXXX` (e.g., `BS-20251209-A5SCDZ`)
- Used by warehouse to identify package
- Auto-generated when agent marks as purchased
- Can be manually set if needed

**Email**: User receives email confirming purchase

#### Step 6: Package Arrives at Warehouse

**What Happens**:

- Package arrives with reference number
- Warehouse worker needs to receive it

#### Step 7: Worker Receives Package

**Admin Access**: `/admin/logistics/package/`

**Method 1: Using "Receive" Button** (Recommended)

1. Find package in list (search by reference number)
2. Click "📦 Receive" button in "Status Actions" column
3. Form opens with package details pre-filled
4. Fill in:
   - Weight (kg)
   - Dimensions (length, width, height in cm)
   - Tracking number (from seller)
   - Storage location
   - Description/notes
   - Upload photos (up to 5)
   - Check damage/prohibited items if applicable
5. Click "Mark as Received"
6. Package status changes to `'received'`
7. Linked shipment status updates to `'processing'`
8. `TrackingUpdate` created

**Method 2: Using Receive Page Directly**

1. Go to `/admin/logistics/package/receive-package/`
2. Enter reference number (BS- or PKG- prefix)
3. Fill in receiving details
4. Submit

**What Gets Created**:

- `WarehouseReceiving` record
- Package status updated
- Photos uploaded
- Shipment status updated
- Tracking update created

#### Step 8: Package Status Updates

**Status Flow**:

```
pending → received → inspected → ready → in_transit → delivered
```

**Admin Buttons** (in Package detail page):

- **📦 Received**: Mark as received (with photo upload)
- **✓ Inspected**: Mark as inspected
- **🚀 Ready to Ship**: Mark as ready to ship
- **🚚 In Transit**: Mark as in transit
- **✅ Delivered**: Mark as delivered (requires delivery photos)

**Each Button**:

- Updates package status
- Creates `TrackingUpdate` record
- Updates linked `LogisticsShipment` status (if applicable)
- Sends email notifications (for delivered)

#### Step 9: Delivered

**When Marking as Delivered**:

1. Click "✅ Delivered" button
2. Upload delivery photos (up to 5)
3. System:
   - Updates package status to `'delivered'`
   - Updates shipment status to `'delivered'`
   - Sets `actual_delivery` timestamp
   - Creates `TrackingUpdate`
   - Sends email to user with photos

**Email**: User receives email with delivery photos

---

## Logistics Models & Admin

### Package Admin (`/admin/logistics/package/`)

**Purpose**: Manage all packages received at warehouse

**List Display**:

- Reference Number
- User Email
- Status Badge (color-coded)
- Weight
- Dimensions Display
- Received Date
- Status Actions (buttons)

**Key Fields**:

**Package Information**:

- `user`: Owner of package
- `reference_number`: Unique ID (PKG-YYYYMMDD-XXXXXX)
- `tracking_number`: Inbound tracking from seller
- `status`: Current status (pending, received, inspected, ready, in_transit, delivered, returned)
- `shipment`: Linked LogisticsShipment

**Dimensions & Weight**:

- `weight`: Weight in kg
- `length`, `width`, `height`: Dimensions in cm
- `declared_value`: Declared value for insurance

**Warehouse Details**:

- `received_date`: When received at warehouse
- `storage_expiry_date`: When storage expires
- `storage_location`: Physical location in warehouse

**Photos**:

- `photo_1` to `photo_5`: Inbound photos (uploaded files)
- `delivery_photo_1` to `delivery_photo_5`: Delivery photos (uploaded files)
- `photos`: Legacy JSONField for URL photos
- `delivery_photos`: Legacy JSONField for delivery URL photos

**Status Actions Buttons**:

- Appear based on current status
- Each button performs specific action
- See [Admin Buttons & Actions](#admin-buttons--actions) section

**Filters**:

- Status
- Received Date

**Search**:

- Reference Number
- User Email

---

### LogisticsShipment Admin (`/admin/logistics/logisticsshipment/`)

**Purpose**: Manage all shipments (international and domestic)

**List Display**:

- Shipment Number
- User
- Source Type
- Status
- Transport Mode
- Total Cost
- Created Date

**Key Fields**:

**Basic Information**:

- `user`: Customer
- `shipment_number`: Unique UUID
- `source_type`: 'ship_my_items', 'buy_and_ship', or 'vehicle'
- `shipping_category`: small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle, super_heavy
- `transport_mode`: Air, Sea, Rail, Truck
- `service_level`: Express, Standard, Economy
- `status`: Current status (see status choices below)

**Status Choices**:

- `quote_requested`: Quote requested
- `quote_approved`: Quote approved
- `payment_pending`: Waiting for payment
- `payment_received`: Payment received
- `label_generating`: Generating shipping label
- `processing`: Processing at warehouse
- `dispatched`: Dispatched
- `in_transit`: In transit
- `customs_clearance`: In customs
- `out_for_delivery`: Out for delivery
- `delivered`: Delivered
- `cancelled`: Cancelled

**Weight & Dimensions**:

- `actual_weight`: Actual weight in kg
- `chargeable_weight`: Chargeable weight (max of actual or dimensional)
- `actual_volume`: Volume in CBM

**Addresses**:

- `origin_address`: JSONField with origin address
- `destination_address`: JSONField with destination address

**Pricing**:

- `shipping_cost`: Shipping cost
- `insurance_cost`: Insurance cost
- `service_fee`: Service fee
- `total_cost`: Total cost
- `pickup_cost`: Pickup cost (if applicable)

**Tracking**:

- `tracking_number`: Main tracking number
- `carrier`: Carrier name
- `easyship_shipment_id`: EasyShip shipment ID
- `easyship_label_url`: Label PDF URL
- `tracking_page_url`: EasyShip tracking page URL
- `local_carrier_tracking_number`: Local carrier tracking
- `estimated_delivery`: Estimated delivery date
- `actual_delivery`: Actual delivery date

**Linked Objects**:

- `quote_request`: Link to QuoteRequest (if from quote page)
- `packages`: ManyToMany to Package (multiple packages per shipment)
- `vehicle`: OneToOne to Vehicle (if vehicle shipment)
- `pickup_request`: OneToOne to PickupRequest (if pickup required)

**Tracking Updates Display**:

- Shows timeline of all tracking events
- Includes webhook updates and manual updates
- Displays location, status, timestamp, source

**Admin Actions**:

- Generate Label (if EasyShip integration)
- View Tracking Updates
- Link/Unlink Packages
- Update Status

---

### ShippingRoute Admin (`/admin/logistics/shippingroute/`)

**Purpose**: Define available shipping routes between countries

**List Display**:

- Route Display (Origin → Destination)
- Transport Mode
- Is Available
- Pickup Available
- Local Shipping Only
- Priority
- Calculation Settings Count

**Key Fields**:

- `origin_country`: Origin country
- `destination_country`: Destination country
- `transport_mode`: Air, Sea, Rail, or Truck
- `is_available`: Whether route is active
- `pickup_available`: Whether pickup service is available
- `local_shipping_only`: Skip warehouse for same-country shipping
- `priority`: Higher priority shown first
- `carrier`: Carrier name

**Inlines**:

- `ShippingCalculationSettings`: Pricing settings for this route

**Usage**:

- Create routes for country pairs
- Set transport modes available
- Configure pricing via inline settings
- Set priority for route ordering

---

### ShippingCalculationSettings Admin (`/admin/logistics/shippingcalculationsettings/`)

**Purpose**: Configure pricing formulas for shipping calculations

**Key Fields**:

**Route & Mode**:

- `route`: Specific route (null for global defaults)
- `transport_mode`: Air, Sea, Rail, or Truck
- `shipping_categories`: Multi-select JSONField - which categories these settings apply to
- `is_global_default`: True for global defaults, False for route-specific

**Air Freight Settings**:

- `base_rate`: Base flat fee
- `per_kg_rate`: Per kilogram rate (default: $8.50/kg)
- `fuel_surcharge_percent`: Fuel surcharge % (default: 15%)
- `security_fee`: Security fee (default: $25)
- `dimensional_weight_divisor`: Divisor for dimensional weight (default: 5000)
- `handling_fee`: Handling fee
- `bulk_discount_percent`: Bulk discount %

**Sea Freight Settings (LCL)**:

- `base_rate_sea`: Base rate
- `per_kg_rate_sea`: Per kg rate
- `rate_per_cbm`: Rate per cubic meter (default: $65/CBM)
- `rate_per_ton`: Rate per ton (default: $150/ton)
- `ocean_freight_base`: Base ocean freight (default: $150)
- `port_origin_handling`: Origin port handling (default: $75)
- `port_destination_handling`: Destination port handling (default: $120)
- `documentation_fee`: Documentation fee (default: $45)
- `customs_clearance_fee`: Customs clearance (default: $75)
- `destination_delivery_fee`: Delivery fee (default: $80)

**Sea Freight Settings (FCL - Container)**:

- `container_20ft_price`: 20ft container price (default: $2,200)
- `container_40ft_price`: 40ft container price (default: $3,800)
- `container_20ft_cbm`: 20ft container CBM capacity (default: 28 CBM)
- `container_40ft_cbm`: 40ft container CBM capacity (default: 58 CBM)
- `container_origin_fees`: Origin fees (default: $200)
- `container_destination_fees`: Destination fees (default: $300)
- `container_customs_fee`: Customs fee (default: $150)
- `container_delivery_fee`: Delivery fee (default: $200)

**Rail Freight Settings**:

- `base_rate_rail`: Base route cost (default: $200)
- `per_kg_rate_rail`: Per kg rate (default: $2.50/kg)
- `terminal_handling_fee`: Terminal handling (default: $100)
- `customs_fee_rail`: Customs fee (default: $50)

**Truck/Road Freight Settings**:

- `base_rate_truck`: Base rate per 100 lbs (CWT) (default: $50)
- `per_kg_rate_truck`: Per kg rate (optional)
- `customs_fee_truck`: Customs fee

**How It Works**:

1. System looks for route-specific settings first
2. If not found, uses global default for transport mode
3. Filters by `shipping_categories` (e.g., 'small_parcel', 'vehicle')
4. If category not in list, uses settings with empty categories (applies to all)

**Best Practices**:

- Create global defaults first
- Override with route-specific settings as needed
- Use category filtering to have different prices for different item types

---

### PickupCalculationSettings Admin (`/admin/logistics/pickupcalculationsettings/`)

**Purpose**: Configure pickup pricing by country, state, and category

**Key Fields**:

- `country`: Country
- `state`: State/Province (required for USA, empty for country-wide)
- `shipping_category`: Category (small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle, super_heavy, all)
- `is_global_fallback`: Use as fallback when no specific settings found

**Pricing Structure**:

- `base_pickup_fee`: Base fee (default: $25)
- `per_kg_rate`: Per kg rate (default: $0.50/kg)
- `per_km_rate`: Per km rate for distance (default: $1.50/km)
- `minimum_pickup_fee`: Minimum fee (default: $15)

**Additional Fees**:

- `residential_fee`: Additional fee for residential (default: $5)
- `lift_gate_fee`: Lift gate fee for heavy items (default: $0)

**Dimensional Weight**:

- `dimensional_weight_divisor`: Divisor (default: 5000)
- `use_dimensional_weight`: Use if greater than actual weight

**Markup**:

- `markup_percent`: Markup percentage

**Calculation Logic**:

1. Try: Country + State + Category (most specific)
2. Fallback: Country + Category (no state)
3. Fallback: Country + 'all' category
4. Fallback: Global fallback settings (`is_global_fallback=True`)
5. Last resort: Hardcoded defaults

**Formula**:

```
Pickup Cost = base_pickup_fee + (chargeable_weight × per_kg_rate) + (distance_km × per_km_rate)
+ residential_fee (if residential)
+ lift_gate_fee (if heavy)
+ markup
Minimum: minimum_pickup_fee
```

---

### PickupRequest Admin (`/admin/logistics/pickuprequest/`)

**Purpose**: Manage pickup requests for items requiring pickup service

**List Display**:

- Pickup Request ID
- Shipment Number
- Status
- Scheduled Date/Time
- Worker
- Pickup Address

**Key Fields**:

- `shipment`: OneToOne link to LogisticsShipment
- `worker`: Assigned warehouse worker
- `pickup_address`: JSONField with full pickup address
- `contact_name`: Contact person name
- `contact_phone`: Contact phone
- `special_instructions`: Special instructions
- `scheduled_date`: Scheduled date
- `scheduled_time`: Scheduled time
- `scheduled_datetime`: Combined datetime (auto-calculated)
- `status`: pending, scheduled, in_progress, completed, failed, cancelled
- `pickup_attempts`: Number of attempts
- `picked_up_at`: When picked up
- `delivered_to_warehouse_at`: When delivered to warehouse

**Action Buttons**:

- **Picked Up**: Marks as in_progress, sets picked_up_at
- **Dropped Off**: Marks as completed, sets delivered_to_warehouse_at, updates shipment status

**Vehicle Details Display**:

- Shows vehicle information if linked shipment is a vehicle
- Displays make, model, year, VIN, condition

**Tracking Updates**:

- Automatically creates TrackingUpdate when:
  - Status changes
  - Scheduled datetime changes (rescheduled)
  - Picked up
  - Dropped off

---

### Warehouse Admin (`/admin/logistics/warehouse/`)

**Purpose**: Manage YuuSell warehouse locations

**Key Fields**:

- `name`: Warehouse name
- `country`: Country location
- `shipping_categories`: Multi-select JSONField - which categories this warehouse handles
- `full_name`: Contact name
- `company`: Company name (default: 'YuuSell Logistics Warehouse')
- `street_address`: Street address
- `city`: City
- `state_province`: State/Province
- `postal_code`: Postal code
- `phone`: Phone number
- `is_active`: Whether warehouse is active
- `priority`: Higher priority selected first

**Usage**:

- System selects warehouse based on:
  1. Origin country
  2. Shipping category
  3. Priority (highest first)
  4. Active status

**Best Practices**:

- Create warehouses for each country you operate in
- Set appropriate shipping categories
- Use priority to prefer certain warehouses
- Keep addresses accurate for shipping calculations

---

### TransportMode Admin (`/admin/logistics/transportmode/`)

**Purpose**: Define available transport modes

**Key Fields**:

- `code`: Unique code (e.g., 'AIR', 'SEA', 'RAIL', 'TRUCK')
- `type`: Mode type (air, sea, rail, truck)
- `name`: Display name
- `transit_days_min`: Minimum transit days
- `transit_days_max`: Maximum transit days
- `co2_per_kg`: CO2 emissions per kg
- `is_active`: Whether mode is active

**Usage**:

- Referenced by ShippingRoute
- Used in pricing calculations
- Displayed to users in quotes

---

### Country Admin (`/admin/logistics/country/`)

**Purpose**: Manage countries in the system

**Key Fields**:

- `code`: ISO 3166-1 alpha-2 code (e.g., 'US', 'CA')
- `name`: Country name
- `continent`: Continent
- `customs_required`: Whether customs clearance is required

**Usage**:

- Referenced by ShippingRoute, Warehouse, PickupCalculationSettings
- Used in address validation
- Determines customs requirements

---

### QuoteRequest Admin (`/admin/logistics/quoterequest/`)

**Purpose**: Store anonymous quote requests (before user login)

**Key Fields**:

- `session_id`: Session ID for anonymous users
- `origin_country`: Origin country
- `destination_country`: Destination country
- `weight`: Weight in kg
- `dimensions`: JSONField with length, width, height
- `declared_value`: Declared value
- `shipping_category`: Category
- `pickup_required`: Whether pickup is required
- `quote_data`: JSONField with calculated quotes
- `expires_at`: When quote expires
- `converted_to_shipment`: Whether user proceeded to create shipment

**Usage**:

- Temporary storage for quotes before user creates account
- Expires after set time
- Converted to shipment when user pays

---

### TrackingUpdate Admin (`/admin/logistics/trackingupdate/`)

**Purpose**: Store all tracking events

**Key Fields**:

- `shipment`: Link to LogisticsShipment
- `carrier_tracking_number`: Tracking number
- `status`: Status description
- `location`: Location
- `timestamp`: When event occurred
- `source`: 'webhook' or 'manual'
- `raw_data`: JSONField with full event data

**Usage**:

- Created automatically by:
  - EasyShip webhooks
  - Package status changes
  - PickupRequest status changes
  - Shipment status changes
  - Manual admin updates

**Display**:

- Shown in LogisticsShipment detail page as timeline
- Displayed to users in frontend tracking page

---

## Pricing & Calculation System

### How Prices Are Calculated

#### Buy & Ship Quotes

**Formula**:

```
Total Cost = Product Cost + Sales Tax + Buying Service Fee (7.5%) + Domestic Shipping + International Shipping
```

**Breakdown**:

1. **Product Cost**: From user input or agent entry
2. **Sales Tax**: Calculated or entered by agent
3. **Buying Service Fee**: 7.5% of product cost (hardcoded)
4. **Domestic Shipping**: Cost from seller to warehouse (if applicable)
5. **International Shipping**: Calculated using PricingCalculator

#### International Shipping Calculations

**Two-Leg Shipping** (for "Ship My Items"):

1. **Leg 1**: User → Warehouse (EasyShip API)
2. **Leg 2**: Warehouse → Destination (Route-based calculation)

**One-Leg Shipping** (for "Buy & Ship"):

- Only Warehouse → Destination (marketplace ships to warehouse)

#### Air Freight Formula

```
Base Cost = base_rate
Weight Cost = chargeable_weight × per_kg_rate
Fuel Surcharge = (Base Cost + Weight Cost) × (fuel_surcharge_percent / 100)
Security Fee = security_fee
Handling Fee = handling_fee
Bulk Discount = (if applicable) Total × (bulk_discount_percent / 100)

Total = Base Cost + Weight Cost + Fuel Surcharge + Security Fee + Handling Fee - Bulk Discount
```

**Chargeable Weight**:

- Actual weight OR dimensional weight (whichever is higher)
- Dimensional weight = (L × W × H in cm) / dimensional_weight_divisor

#### Sea Freight Formula (LCL)

**Option 1: Per CBM**

```
CBM = (length × width × height) / 1,000,000 (convert cm³ to m³)
Ocean Freight = CBM × rate_per_cbm
Port Fees = port_origin_handling + port_destination_handling
Documentation = documentation_fee
Customs = customs_clearance_fee
Delivery = destination_delivery_fee

Total = Ocean Freight + Port Fees + Documentation + Customs + Delivery
```

**Option 2: Per Ton**

```
Weight in Tons = weight / 1000
Ocean Freight = Weight in Tons × rate_per_ton
+ Port Fees + Documentation + Customs + Delivery
```

**Option 3: Per Kg**

```
Ocean Freight = weight × per_kg_rate_sea
+ Port Fees + Documentation + Customs + Delivery
```

**System uses whichever method is configured in ShippingCalculationSettings**

#### Sea Freight Formula (FCL - Container)

**For 20ft Container**:

```
Container Cost = container_20ft_price
Origin Fees = container_origin_fees
Destination Fees = container_destination_fees
Customs = container_customs_fee
Delivery = container_delivery_fee

Total = Container Cost + Origin Fees + Destination Fees + Customs + Delivery
```

**For 40ft Container**: Same formula with 40ft prices

**Container Selection**:

- If volume ≤ 20ft CBM capacity → 20ft container
- If volume > 20ft CBM capacity → 40ft container
- If volume > 40ft CBM capacity → Multiple containers

#### Rail Freight Formula

```
Base Cost = base_rate_rail
Weight Cost = chargeable_weight × per_kg_rate_rail
Terminal Handling = terminal_handling_fee
Customs = customs_fee_rail

Total = Base Cost + Weight Cost + Terminal Handling + Customs
```

#### Truck/Road Freight Formula

```
Base Cost = base_rate_truck (per 100 lbs / CWT)
Weight Cost = (chargeable_weight / 45.36) × base_rate_truck  # Convert kg to 100 lbs
OR
Weight Cost = chargeable_weight × per_kg_rate_truck (if configured)
Customs = customs_fee_truck

Total = Base Cost + Weight Cost + Customs
```

#### Pickup Cost Formula

```
Distance = calculate_distance_km(origin, warehouse)
Chargeable Weight = max(actual_weight, dimensional_weight)

Base Cost = base_pickup_fee
Weight Cost = chargeable_weight × per_kg_rate
Distance Cost = distance × per_km_rate
Residential Fee = residential_fee (if residential address)
Lift Gate Fee = lift_gate_fee (if heavy category)
Markup = Total × (markup_percent / 100)

Total = Base Cost + Weight Cost + Distance Cost + Residential Fee + Lift Gate Fee + Markup
Minimum: minimum_pickup_fee
```

**Distance Calculation** (Simplified):

- Same city: 15 km
- Same state, different city: 100 km
- Different states: 500 km
- Different countries: 0 km (no distance-based cost)

---

## Complete Workflows

### Workflow 1: User Requests Buy & Ship

**Step-by-Step**:

1. **User Submits Request** (Frontend)

   - Fills form with product URL, description, shipping address
   - Optionally provides weight, dimensions, price
   - System creates `BuyingRequest` (status: `pending`)
   - If size/price provided, approximate quotes shown immediately

2. **Agent Reviews** (Admin)

   - Go to `/admin/buying/buyingrequest/`
   - Open the request
   - Review product info and address
   - Check approximate quote data

3. **Agent Generates Quotes** (Admin)

   - Click "🚀 Generate Quotes Automatically" button
   - System creates quotes for all shipping modes
   - Status changes to `quoted`
   - Email sent to user

4. **User Approves & Pays** (Frontend)

   - User receives email
   - Reviews quotes
   - Selects a quote
   - Pays via Stripe
   - Payment webhook creates:
     - `LogisticsShipment`
     - `Package` (if not vehicle)
     - `Vehicle` (if vehicle category)
   - Status: `quote_approved` → `payment_received`

5. **Agent Purchases** (Admin)

   - Open buying request
   - Update status to `purchasing`
   - Purchase item
   - Fill purchase details:
     - Receipt URL
     - Tracking number
     - Purchase date
   - Reference number auto-generated
   - Update status to `purchased`
   - Email sent to user

6. **Package Arrives** (Physical)

   - Package arrives at warehouse with reference number

7. **Worker Receives Package** (Admin)

   - Go to `/admin/logistics/package/`
   - Find package (search by reference number)
   - Click "📦 Receive" button
   - Fill receiving form:
     - Weight, dimensions
     - Tracking number
     - Storage location
     - Upload photos
   - Submit
   - Status: `received`
   - Shipment status: `processing`

8. **Package Processing** (Admin)

   - Click "✓ Inspected" → Status: `inspected`
   - Click "🚀 Ready to Ship" → Status: `ready`, Shipment: `ready_to_ship`
   - Click "🚚 In Transit" → Status: `in_transit`, Shipment: `in_transit`

9. **Package Delivered** (Admin)
   - Click "✅ Delivered" button
   - Upload delivery photos (up to 5)
   - Submit
   - Status: `delivered`
   - Shipment status: `delivered`
   - Email sent to user with photos

---

### Workflow 2: User Requests International/Domestic Shipping

**Step-by-Step**:

1. **User Gets Quote** (Frontend)

   - Fills quote form:
     - Origin address
     - Destination address
     - Weight, dimensions
     - Declared value
   - System creates `QuoteRequest` (anonymous)
   - Quotes calculated and displayed

2. **User Proceeds** (Frontend)

   - User creates account or logs in
   - Selects a quote
   - Pays via Stripe
   - Payment webhook creates:
     - `LogisticsShipment`
     - `Package` (if "Ship My Items")
     - `PickupRequest` (if pickup required)

3. **Label Generation** (Automatic or Admin)

   - If EasyShip integration:
     - System requests label
     - Status: `label_generating`
     - EasyShip webhook confirms creation
     - Status: `processing`
     - Label URL stored

4. **Pickup (If Required)** (Admin)

   - Go to `/admin/logistics/pickuprequest/`
   - Open pickup request
   - Assign worker
   - Set scheduled date/time
   - Status: `scheduled`
   - Worker clicks "Picked Up" → Status: `in_progress`
   - Worker clicks "Dropped Off" → Status: `completed`, Shipment: `processing`

5. **Package Processing** (Admin)
   - Same as Buy & Ship workflow steps 7-9

---

### Workflow 3: Vehicle Shipping

**Step-by-Step**:

1. **User Submits Vehicle Request** (Frontend)

   - Fills vehicle form:
     - Make, model, year, VIN
     - Origin and destination addresses
     - Dimensions, weight
   - System creates `Vehicle` (status: `pending_documents`)

2. **User Signs Documents** (Frontend)

   - System shows required `VehicleDocument`s
   - User signs digitally
   - Status: `documents_signed`

3. **User Pays** (Frontend)

   - User pays full shipping cost
   - Payment webhook creates:
     - `LogisticsShipment`
     - Links to `Vehicle`
     - `PickupRequest` (if pickup required)
   - Status: `payment_received`

4. **Pickup Scheduled** (Admin)

   - Go to `/admin/logistics/pickuprequest/`
   - Schedule pickup
   - Status: `pickup_scheduled`

5. **Pickup & Inspection** (Pickup Driver)

   - Driver arrives
   - Takes inspection photos (up to 20)
   - Fills inspection report
   - Submits via API
   - Status: `inspection_completed`
   - Email sent to user with photos

6. **Condition Report** (Frontend)

   - User receives email with condition report
   - User signs condition report
   - Status: `condition_report_signed`

7. **Vehicle at Warehouse** (Admin)

   - Go to `/admin/vehicles/vehicle/`
   - Open vehicle
   - Click "📦 Received" → Status: `received_at_warehouse`
   - Click "✓ Inspected" → Status: `inspection_completed`

8. **Shipping** (Automatic)

   - Vehicle shipped via RoRo or Container
   - Status updates via tracking

9. **Delivered** (Automatic/Admin)
   - Vehicle delivered
   - Status: `delivered`

---

## Admin Buttons & Actions

### BuyingRequest Admin Buttons

**"🚀 Generate Quotes Automatically"**

- **Location**: Buying request detail page, "Actions" fieldset
- **When**: Always visible if request exists
- **Action**: Generates quotes for all shipping modes
- **Result**: Creates multiple `BuyAndShipQuote` objects, updates status to `quoted`, sends email

---

### Package Admin Buttons

**"📦 Received"**

- **Location**: Package list or detail page
- **When**: Status is `pending`
- **Action**: Opens receive package form
- **Result**: Updates status to `received`, creates `WarehouseReceiving`, uploads photos

**"✓ Inspected"**

- **Location**: Package detail page, "Quick Actions" fieldset
- **When**: Status is `received`
- **Action**: Confirms inspection
- **Result**: Updates status to `inspected`, creates `TrackingUpdate`

**"🚀 Ready to Ship"**

- **Location**: Package detail page
- **When**: Status is `inspected`
- **Action**: Marks as ready
- **Result**: Updates status to `ready`, shipment status to `ready_to_ship`, creates `TrackingUpdate`

**"🚚 In Transit"**

- **Location**: Package detail page
- **When**: Status is `ready`
- **Action**: Marks as in transit
- **Result**: Updates status to `in_transit`, shipment status to `in_transit`, creates `TrackingUpdate`

**"✅ Delivered"**

- **Location**: Package detail page
- **When**: Status is `in_transit`
- **Action**: Opens delivery form with photo upload
- **Result**: Updates status to `delivered`, shipment status to `delivered`, uploads delivery photos, sends email

---

### PickupRequest Admin Buttons

**"Picked Up"**

- **Location**: Pickup request detail page
- **When**: Status is `scheduled` or `in_progress`
- **Action**: Marks as picked up
- **Result**: Updates `picked_up_at`, status to `in_progress`, increments `pickup_attempts`, creates `TrackingUpdate`

**"Dropped Off"**

- **Location**: Pickup request detail page
- **When**: Status is `in_progress`
- **Action**: Marks as delivered to warehouse
- **Result**: Updates `delivered_to_warehouse_at`, status to `completed`, updates shipment status to `processing`, creates `TrackingUpdate`

---

### Vehicle Admin Buttons

**"📦 Received"**

- **Location**: Vehicle detail page, "Actions" fieldset
- **When**: Not yet received
- **Action**: Marks as received at warehouse
- **Result**: Updates `received_at_warehouse_at`, status to `received_at_warehouse`, creates `TrackingUpdate`

**"✓ Inspected"**

- **Location**: Vehicle detail page
- **When**: Received but not inspected
- **Action**: Marks as inspected
- **Result**: Updates `inspection_completed_at`, status to `inspection_completed`, creates `TrackingUpdate`

---

## Field Explanations

### BuyingRequest Fields

- **product_url**: URL to product page
- **product_name**: Product name
- **product_description**: Full description
- **product_image**: Product image URL
- **max_budget**: User's maximum budget
- **shipping_address**: JSONField with full shipping address
- **approximate_quote_data**: JSONField with weight, dimensions, declared_value (if user provided)
- **reference_number**: Auto-generated reference (BS-YYYYMMDD-XXXXXX)
- **purchase_receipt**: URL to purchase receipt
- **purchase_tracking**: Tracking number from seller
- **purchase_date**: Date of purchase
- **package**: OneToOne link to Package (when received)
- **shipment**: ForeignKey to LogisticsShipment (when paid)
- **status**: Current status in workflow
- **notes**: Agent notes

### BuyAndShipQuote Fields

- **buying_request**: ForeignKey to BuyingRequest
- **product_cost**: Product price
- **sales_tax**: Tax amount
- **buying_service_fee**: 7.5% of product cost
- **buying_service_fee_percent**: 7.5 (hardcoded)
- **domestic_shipping_cost**: Cost from seller to warehouse
- **shipping_mode**: TransportMode (Air, Sea, etc.)
- **shipping_cost**: Cost from warehouse to destination
- **shipping_service_name**: Service name
- **estimated_delivery_days**: Transit days
- **total_cost**: Sum of all costs
- **status**: pending, approved, rejected, expired
- **shipment**: OneToOne to LogisticsShipment (when approved)
- **quote_data**: JSONField with full quote data (for shipment creation)
- **notes**: Agent notes or adjustments

### Package Fields

- **user**: Owner
- **reference_number**: Unique ID (PKG-YYYYMMDD-XXXXXX)
- **tracking_number**: Inbound tracking from seller
- **weight**: Weight in kg
- **length, width, height**: Dimensions in cm
- **declared_value**: Declared value
- **status**: pending, received, inspected, ready, in_transit, delivered, returned
- **received_date**: When received at warehouse
- **storage_expiry_date**: Storage expiry
- **storage_location**: Physical location
- **description**: Notes
- **shipment**: ForeignKey to LogisticsShipment
- **photo_1 to photo_5**: Inbound photos (ImageField)
- **delivery_photo_1 to delivery_photo_5**: Delivery photos (ImageField)

### LogisticsShipment Fields

- **user**: Customer
- **shipment_number**: Unique UUID
- **source_type**: 'ship_my_items', 'buy_and_ship', 'vehicle'
- **shipping_category**: small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle, super_heavy
- **transport_mode**: Air, Sea, Rail, Truck
- **service_level**: Express, Standard, Economy
- **status**: Current status
- **actual_weight**: Weight in kg
- **chargeable_weight**: Chargeable weight
- **actual_volume**: Volume in CBM
- **origin_address**: JSONField with origin
- **destination_address**: JSONField with destination
- **shipping_cost**: Shipping cost
- **insurance_cost**: Insurance
- **service_fee**: Service fee
- **total_cost**: Total cost
- **pickup_cost**: Pickup cost
- **tracking_number**: Main tracking
- **carrier**: Carrier name
- **easyship_shipment_id**: EasyShip ID
- **easyship_label_url**: Label PDF URL
- **tracking_page_url**: Tracking page URL
- **estimated_delivery**: Estimated date
- **actual_delivery**: Actual date
- **packages**: ManyToMany to Package
- **vehicle**: OneToOne to Vehicle
- **pickup_request**: OneToOne to PickupRequest

---

## Questions for Clarification

To make this guide more concrete and tailored to your needs, please answer:

### General Questions

1. **User Roles**: What specific roles do you have? (e.g., Super Admin, Agent, Warehouse Worker, Customer Service)
2. **Permissions**: Should different roles have different admin access levels?
3. **Email Notifications**: Which status changes should trigger emails? (Currently: quote created, purchased, delivered)
4. **Themes**: Do you want admin-level theme customization, or is user-level sufficient?

### Buy & Ship Workflow

5. **Quote Generation**: Should agents be able to manually create quotes without using the auto-generate button?
6. **Quote Editing**: Can agents edit auto-generated quotes, or should they be locked?
7. **Multiple Quotes**: Should users be able to approve multiple quotes, or only one?
8. **Reference Numbers**: Should reference numbers be editable, or always auto-generated?
9. **Purchase Tracking**: Should purchase tracking numbers be required before marking as purchased?

### Package Management

10. **Package Receiving**: Should there be a bulk receive option for multiple packages?
11. **Photo Requirements**: Are photos required when receiving packages, or optional?
12. **Storage Location**: Should storage locations be free text or from a predefined list?
13. **Status Workflow**: Can packages skip statuses (e.g., go directly from received to ready)?

### Pricing & Calculations

14. **Buying Fee**: Should the 7.5% buying fee be configurable per request, or always fixed?
15. **Shipping Adjustments**: Can agents manually adjust shipping costs, or must they use calculated prices?
16. **Currency**: Do you support multiple currencies, or only USD?
17. **Tax Calculation**: Is sales tax calculated automatically or entered manually?

### Shipping Routes & Settings

18. **Route Priority**: How should route priority affect quote ordering?
19. **Category-Specific Pricing**: Do you need different prices for the same route but different categories?
20. **Global Defaults**: Should there always be global default settings, or can routes exist without defaults?

### Pickup Service

21. **Pickup Scheduling**: Should workers be able to schedule pickups directly, or only admins?
22. **Pickup Attempts**: What happens after maximum pickup attempts?
23. **Distance Calculation**: Should distance be calculated using a geocoding API, or is the simplified method sufficient?

### Vehicle Shipping

24. **Document Signing**: Are all documents required, or can some be optional?
25. **Inspection Photos**: Is there a minimum number of photos required?
26. **Condition Report**: Should condition reports be auto-generated or manually created?

### Warehouse Operations

27. **Warehouse Selection**: Should the system automatically select warehouses, or should agents choose?
28. **Storage Expiry**: Should packages have automatic storage expiry dates?
29. **Multiple Warehouses**: Can a shipment use multiple warehouses?

### Tracking & Updates

30. **Tracking Sources**: Should manual tracking updates be allowed, or only from webhooks?
31. **Tracking Display**: Should all tracking updates be visible to users, or only certain ones?
32. **Status Mapping**: Are there any status mappings that need adjustment?

### Reporting & Analytics

33. **Reports Needed**: What reports do you need? (e.g., revenue, package counts, status breakdowns)
34. **Export Options**: Should admin data be exportable (CSV, Excel)?
35. **Dashboard**: Do you want an admin dashboard with key metrics?

---

## Quick Reference

### Status Flows

**BuyingRequest**:

```
pending → quoted → quote_approved → payment_pending → payment_received →
purchasing → purchased → in_transit_to_warehouse → received_at_warehouse →
ready_to_ship → shipped → in_transit → delivered → completed
```

**Package**:

```
pending → received → inspected → ready → in_transit → delivered
```

**LogisticsShipment**:

```
quote_requested → quote_approved → payment_pending → payment_received →
label_generating → processing → dispatched → in_transit →
customs_clearance → out_for_delivery → delivered
```

**PickupRequest**:

```
pending → scheduled → in_progress → completed
```

**Vehicle**:

```
pending_documents → documents_signed → payment_pending → payment_received →
pickup_scheduled → inspection_pending → inspection_completed →
condition_report_pending → condition_report_signed →
in_transit_to_warehouse → received_at_warehouse → in_transit →
customs_clearance → out_for_delivery → delivered
```

### Common Admin Tasks

1. **Generate Quotes**: BuyingRequest → Click "Generate Quotes" button
2. **Receive Package**: Package → Click "Receive" button → Fill form
3. **Update Package Status**: Package → Click status action button
4. **Schedule Pickup**: PickupRequest → Set scheduled_date and scheduled_time
5. **Mark Vehicle Received**: Vehicle → Click "Received" button
6. **View Tracking**: LogisticsShipment → See "Tracking Updates" section

### Important URLs

- Users: `/admin/accounts/user/`
- Buying Requests: `/admin/buying/buyingrequest/`
- Quotes: `/admin/buying/buyandshipquote/`
- Packages: `/admin/logistics/package/`
- Shipments: `/admin/logistics/logisticsshipment/`
- Pickup Requests: `/admin/logistics/pickuprequest/`
- Vehicles: `/admin/vehicles/vehicle/`
- Shipping Routes: `/admin/logistics/shippingroute/`
- Calculation Settings: `/admin/logistics/shippingcalculationsettings/`
- Pickup Settings: `/admin/logistics/pickupcalculationsettings/`
- Warehouses: `/admin/logistics/warehouse/`

---

**End of Guide**

This guide covers the essential aspects of your Django admin system. Please answer the questions above to make it more specific to your needs, and I can update the guide accordingly.
