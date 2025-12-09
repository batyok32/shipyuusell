# YuuSell Logistics Platform - Comprehensive Codebase Documentation

**Version**: 1.0  
**Last Updated**: 2025-12-07  
**Platform**: Django 5.x + Next.js 14+

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Models & Relationships](#database-models--relationships)
3. [Core Workflows](#core-workflows)
4. [Admin Interfaces](#admin-interfaces)
5. [API Endpoints](#api-endpoints)
6. [Services & Business Logic](#services--business-logic)
7. [Payment Processing](#payment-processing)
8. [Email Notifications](#email-notifications)
9. [Status Management](#status-management)
10. [Pricing & Calculations](#pricing--calculations)
11. [External Integrations](#external-integrations)
12. [Frontend Integration](#frontend-integration)

---

## 1. System Architecture

### 1.1 Technology Stack

**Backend**:

- Django 5.x with Django REST Framework
- SQLite (development) / PostgreSQL (production)
- Celery for background tasks
- Redis for caching
- Stripe for payments
- EasyShip API for shipping labels

**Frontend**:

- Next.js 14+ with App Router
- React with TypeScript
- TailwindCSS
- Zustand for state management
- React Hook Form with Zod validation

### 1.2 Application Structure

```
backend/
├── accounts/          # User authentication & profiles
├── buying/            # Buy & Ship service
├── logistics/         # Core shipping & logistics
├── vehicles/          # Vehicle shipping service
├── payments/          # Payment processing
├── warehouse/         # Warehouse operations
└── config/            # Django settings & URLs
```

### 1.3 URL Routing

**Main URL Configuration** (`config/urls.py`):

- `/admin/` - Django admin interface
- `/api/v1/auth/` - Authentication endpoints
- `/api/v1/logistics/` - Shipping & logistics
- `/api/v1/buying/` - Buy & Ship service
- `/api/v1/vehicles/` - Vehicle shipping
- `/api/v1/payments/` - Payment processing
- `/api/v1/warehouse/` - Warehouse operations
- `/swagger/` - API documentation (Swagger UI)
- `/redoc/` - API documentation (ReDoc)

---

## 2. Database Models & Relationships

### 2.1 Core Models Overview

#### **User & Accounts** (`accounts/models.py`)

**User Model**:

- Extends Django's `AbstractUser`
- Email-based authentication (no username)
- Auto-generates `warehouse_id` (format: `JS-12345`)
- Fields: `email`, `email_verified`, `warehouse_id`, `phone`, `stripe_customer_id`

**Address Model**:

- User saved addresses (shipping, billing, warehouse)
- Fields: `type`, `full_name`, `street_address`, `city`, `state_province`, `postal_code`, `country`, `is_default`

**UserPreference Model**:

- User settings: `language`, `currency`, `notifications_email`, `theme`

#### **Buying Service** (`buying/models.py`)

**BuyingServiceSettings Model**:

- Global buying fee configuration
- Fields: `default_buying_fee_percent` (7.5%), `buying_fee_percent_min` (5%), `buying_fee_percent_max` (10%)
- Only one active instance allowed

**BuyingRequest Model**:

- User buy-and-ship requests
- **Status Workflow**: `pending` → `quoted` → `quote_approved` → `payment_received` → `purchased` → `delivered`
- **Key Fields**:
  - `product_url`, `product_name`, `product_description`, `product_image`
  - `shipping_address` (JSONField)
  - `approximate_quote_data` (JSONField) - For immediate quotes
  - `reference_number` (auto-generated: `BS-YYYYMMDD-XXXXXX`)
  - `package` (OneToOne to Package)
  - `shipment` (ForeignKey to LogisticsShipment)

**BuyAndShipQuote Model**:

- Multiple quotes per buying request (different shipping modes)
- **Status**: `pending`, `approved`, `rejected`, `expired`
- **Key Fields**:
  - `product_cost`, `sales_tax`, `buying_service_fee`, `buying_service_fee_percent`
  - `shipping_mode` (ForeignKey to TransportMode)
  - `shipping_cost`, `shipping_service_name`, `estimated_delivery_days`
  - `total_cost` = product_cost + tax + buying_fee + shipping_cost
  - `quote_data` (JSONField) - Stores EasyShip rate IDs, etc.
  - `shipment` (OneToOne to LogisticsShipment when approved)

#### **Logistics** (`logistics/models.py`)

**Country Model**:

- ISO country codes
- Fields: `code` (ISO 3166-1 alpha-2), `name`, `continent`, `customs_required`

**TransportMode Model**:

- Shipping transport modes
- Fields: `code`, `type` (air/sea/rail/truck), `name`, `transit_days_min/max`, `is_active`

**ShippingRoute Model**:

- Routes between countries with transport modes
- Fields: `origin_country`, `destination_country`, `transport_mode`, `is_available`, `priority`, `pickup_available`, `local_shipping_only`

**Package Model**:

- Packages received at warehouse
- **Status**: `pending` → `received` → `inspected` → `ready` → `in_transit` → `delivered`
- **Key Fields**:
  - `reference_number` (auto-generated: `PKG-YYYYMMDD-XXXXXX`)
  - `weight`, `length`, `width`, `height`
  - `photo_1` to `photo_5` (ImageField) - Inbound photos
  - `delivery_photo_1` to `delivery_photo_5` (ImageField) - Delivery photos
  - `photos`, `delivery_photos` (JSONField) - Legacy URL support
  - `shipment` (ForeignKey to LogisticsShipment)
  - `user` (ForeignKey to User)

**LogisticsShipment Model**:

- International shipments (all services)
- **Source Types**: `ship_my_items`, `buy_and_ship`, `vehicle`
- **Status**: `quote_requested` → `quote_approved` → `payment_received` → `processing` → `dispatched` → `in_transit` → `customs_clearance` → `out_for_delivery` → `delivered`
- **Key Fields**:
  - `shipment_number` (UUID-based)
  - `source_type`, `shipping_category` (small_parcel, heavy_parcel, ltl_freight, ftl_freight, vehicle)
  - `transport_mode` (ForeignKey to TransportMode)
  - `actual_weight`, `chargeable_weight`, `actual_volume` (CBM)
  - `origin_address`, `destination_address` (JSONField)
  - `shipping_cost`, `pickup_cost`, `insurance_cost`, `service_fee`, `total_cost`
  - `tracking_number`, `carrier`, `easyship_shipment_id`, `easyship_label_url`
  - `packages` (ManyToMany to Package)
  - `quote_request` (ForeignKey to QuoteRequest)

**ShippingCalculationSettings Model**:

- Configurable pricing parameters by route and transport mode
- **Settings Types**:
  - Global Default: `route=None`, `is_global_default=True`
  - Route-Specific: `route=ShippingRoute`, `is_global_default=False`
- **Shipping Categories**: Multi-select JSONField (`small_parcel`, `heavy_parcel`, `ltl_freight`, `ftl_freight`, `vehicle`, `car`, `super_heavy`, `all`)
- **Pricing Fields** (varies by transport mode):
  - **Air**: `base_rate`, `per_kg_rate`, `fuel_surcharge_percent`, `security_fee`, `dimensional_weight_divisor`, `handling_fee`
  - **Sea LCL**: `base_rate_sea`, `per_kg_rate_sea`, `rate_per_cbm`, `rate_per_ton`, `ocean_freight_base`, `port_origin_handling`, `port_destination_handling`, `documentation_fee`, `customs_clearance_fee`, `destination_delivery_fee`
  - **Sea FCL**: `container_20ft_price`, `container_40ft_price`, `container_20ft_cbm`, `container_40ft_cbm`, `container_origin_fees`, `container_destination_fees`, `container_customs_fee`, `container_delivery_fee`
  - **Rail**: `base_rate_rail`, `per_kg_rate_rail`, `terminal_handling_fee`, `customs_fee_rail`
  - **Truck**: `base_rate_truck`, `per_kg_rate_truck`, `customs_fee_truck`

**PickupCalculationSettings Model**:

- Pickup pricing by location and category
- **Fields**: `country`, `state` (required for USA), `shipping_category`, `base_pickup_fee`, `per_kg_rate`, `per_km_rate`, `minimum_pickup_fee`, `dimensional_weight_divisor`, `residential_fee`, `lift_gate_fee`, `markup_percent`
- **Fallback**: `is_global_fallback=True` for global defaults

**QuoteRequest Model**:

- Temporary quote requests (session-based)
- Fields: `session_id`, `origin_country`, `destination_country`, `weight`, `dimensions`, `declared_value`, `shipping_category`, `pickup_required`, `quote_data` (JSONField), `converted_to_shipment`, `expires_at`

**TrackingUpdate Model**:

- Status change history for shipments
- Fields: `shipment`, `status`, `location`, `timestamp`, `source` (system/webhook/manual), `carrier_tracking_number`, `raw_data` (JSONField)

**PickupRequest Model**:

- Local pickup requests for workers
- **Status**: `pending` → `scheduled` → `in_progress` → `completed` / `failed`
- Fields: `shipment` (OneToOne), `worker`, `pickup_address`, `scheduled_datetime`, `pickup_attempts`, `actual_weight`, `actual_dimensions`

**Warehouse Model**:

- Warehouse locations
- Fields: `country`, `city`, `state_province`, `full_name`, `company`, `street_address`, `shipping_categories` (JSONField - multi-select), `is_active`, `priority`

**EasyShipRate Model**:

- Cached EasyShip rates (5-minute expiry)
- Fields: `origin_country`, `destination_country`, `weight`, `dimensions`, `carrier`, `service_name`, `rate`, `currency`, `transit_days`, `rate_data` (JSONField), `expires_at`

#### **Vehicles** (`vehicles/models.py`)

**VehicleDocument Model**:

- Documents requiring signature before payment
- Fields: `name`, `document_type` (shipping_agreement, export_declaration, power_of_attorney, customs_declaration, insurance_waiver, other), `file` (FileField), `description`, `is_required`, `is_active`

**Vehicle Model**:

- Vehicle shipping requests
- **Status Workflow**: `pending_documents` → `documents_signed` → `payment_pending` → `payment_received` → `pickup_scheduled` → `inspection_pending` → `inspection_completed` → `condition_report_pending` → `condition_report_signed` → `in_transit_to_warehouse` → `received_at_warehouse` → `in_transit` → `customs_clearance` → `out_for_delivery` → `delivered`
- **Key Fields**:
  - `make`, `model`, `year`, `vin`, `vehicle_type`, `shipping_method` (roro, container_20ft, container_40ft, container_shared), `condition` (running/non_running)
  - `length`, `width`, `height` (cm), `weight` (kg)
  - `origin_address`, `destination_address` (JSONField)
  - `quote_amount`, `pickup_cost`, `total_amount`, `payment_paid`
  - `documents_signed` (JSONField), `documents_signed_at`
  - `inspection_photo_1` to `inspection_photo_20` (ImageField)
  - `inspection_report` (JSONField), `inspection_completed_at`, `inspected_by`
  - `condition_report` (FileField), `condition_report_signed`, `condition_report_signature` (JSONField)
  - `export_documentation`, `customs_documentation` (JSONField)
  - `received_at_warehouse_at`, `warehouse_receiving_notes`
  - `shipment` (OneToOne to LogisticsShipment)

#### **Payments** (`payments/models.py`)

**Payment Model**:

- All payment records
- **Status**: `pending` → `processing` → `completed` / `failed` / `refunded`
- **Payment Types**: `shipping`, `quote`, `buy_and_ship_quote`, `buying_service` (legacy), `vehicle_deposit` (legacy), `vehicle_shipping`, `warehouse_label`, `storage`, `insurance`
- **Key Fields**:
  - `payment_id` (UUID), `stripe_payment_intent_id`, `stripe_checkout_session_id`
  - `amount`, `currency`, `payment_type`, `status`
  - `shipment` (ForeignKey), `buying_request` (ForeignKey), `vehicle` (ForeignKey)
  - `metadata` (JSONField)

#### **Warehouse** (`warehouse/models.py`)

**WarehouseReceiving Model**:

- Package receiving records
- Fields: `package` (OneToOne), `received_by`, `received_at`, `storage_location`, `inspection_notes`, `damage_reported`, `prohibited_items_found`

**WarehouseLabel Model**:

- Prepaid shipping labels to warehouse
- **Status**: `pending` → `generated` → `printed` → `in_transit` → `delivered`
- Fields: `user`, `label_number`, `carrier`, `service_name`, `tracking_number`, `label_url`, `cost`, `weight`, `dimensions`, `pickup_address`, `warehouse_address`, `easyship_label_id`

**PickupSchedule Model**:

- Scheduled pickup requests
- **Status**: `pending` → `confirmed` → `scheduled` → `picked_up` / `cancelled`
- Fields: `user`, `pickup_number`, `pickup_address`, `pickup_date`, `pickup_time_slot`, `weight`, `dimensions`, `number_of_packages`, `contact_name`, `contact_phone`, `carrier`, `service_name`, `easyship_pickup_id`, `tracking_number`

### 2.2 Model Relationships

```
User
├── Address (OneToMany)
├── UserPreference (OneToOne)
├── BuyingRequest (OneToMany)
├── LogisticsShipment (OneToMany)
├── Package (OneToMany)
├── Vehicle (OneToMany)
└── Payment (OneToMany)

BuyingRequest
├── BuyAndShipQuote (OneToMany)
├── Package (OneToOne)
└── LogisticsShipment (ManyToOne)

BuyAndShipQuote
└── LogisticsShipment (OneToOne)

LogisticsShipment
├── Package (ManyToMany)
├── TrackingUpdate (OneToMany)
├── PickupRequest (OneToOne)
├── QuoteRequest (ManyToOne)
├── Payment (OneToMany)
└── Vehicle (OneToOne)

Package
├── WarehouseReceiving (OneToOne)
└── LogisticsShipment (ManyToMany + ForeignKey)

Vehicle
├── VehicleDocument (ManyToMany via documents_signed JSONField)
└── LogisticsShipment (OneToOne)

ShippingRoute
└── ShippingCalculationSettings (OneToMany)

TransportMode
└── ShippingCalculationSettings (OneToMany)
```

---

## 3. Core Workflows

### 3.1 Buy & Ship Workflow

**Complete Flow**:

1. **User Submits Request** (`POST /api/v1/buying/requests/`)

   - Provides: `product_url` or `product_description`, `shipping_address`
   - Optional: `weight`, `dimensions`, `price`, `item_type` (for immediate approximate quotes)
   - Creates `BuyingRequest` with status `pending`
   - If optional data provided: Calculates approximate quotes using `PricingCalculator`
   - Returns approximate quotes to user immediately

2. **Agent Reviews Request** (Django Admin)

   - Agent views request in `BuyingRequestAdmin`
   - Fills in product details if missing
   - Clicks **"🚀 Generate Quotes Automatically"** button
   - System calls `QuoteGenerator.create_all_shipping_quotes()`
   - Creates `BuyAndShipQuote` instances for all available shipping modes (Air, Sea, Rail, Truck)
   - Updates status to `quoted`
   - Sends email to user if status was `pending`

3. **User Views Quotes** (`GET /api/v1/buying/requests/<id>/quotes/list/`)

   - User sees all available quotes
   - Each quote shows: shipping mode, total cost, estimated delivery days
   - User can compare options

4. **User Approves Quote** (`POST /api/v1/buying/quotes/<id>/approve/`)

   - User selects a quote
   - System updates `BuyAndShipQuote.status` to `approved`
   - Updates `BuyingRequest.status` to `quote_approved`
   - Creates Stripe checkout session
   - Returns checkout URL

5. **User Pays** (Stripe Checkout)

   - User completes payment on Stripe
   - Stripe webhook triggers (`POST /api/v1/payments/webhook/`)
   - Payment webhook handler:
     - Creates `Payment` record with `payment_type='buy_and_ship_quote'`
     - Updates `BuyingRequest.status` to `payment_received`
     - Creates `LogisticsShipment` with `source_type='buy_and_ship'`
     - Links `BuyAndShipQuote` to `LogisticsShipment`
     - Creates `TrackingUpdate` with status `payment_received`
     - Sends payment receipt email to user
     - Sends payment notification email to agent

6. **Agent Purchases Item** (Django Admin)

   - Agent marks `BuyingRequest.status` as `purchased`
   - System generates `reference_number` (format: `BS-YYYYMMDD-XXXXXX`)
   - Agent enters purchase details: `purchase_receipt`, `purchase_tracking`, `purchase_date`
   - System sends email to user confirming purchase

7. **Item Ships to Warehouse**

   - Agent ships item to warehouse with reference number
   - Warehouse worker receives package

8. **Warehouse Receives Package** (Django Admin or API)

   - Worker enters reference number
   - System finds `BuyingRequest` by `reference_number`
   - Creates `Package` instance
   - Links `Package` to `BuyingRequest` and `LogisticsShipment`
   - Updates `BuyingRequest.status` to `received_at_warehouse`
   - Updates `Package.status` to `received`
   - Worker uploads inbound photos

9. **Package Shipped to User**

   - Warehouse worker updates `LogisticsShipment.status` to `shipped` or `in_transit`
   - System creates `TrackingUpdate` record
   - User receives tracking number

10. **Package Delivered**
    - Warehouse worker updates `Package.status` to `delivered`
    - Worker uploads delivery photos (`delivery_photo_1` to `delivery_photo_5`)
    - System sends email to user with delivery photos
    - Updates `BuyingRequest.status` to `delivered`

**Key Services**:

- `QuoteGenerator` (`buying/services/quote_generator.py`) - Generates quotes
- `PricingCalculator` (`logistics/services/pricing_calculator.py`) - Calculates shipping costs
- Email service (`buying/services/email_service.py`) - Sends notifications

### 3.2 Ship My Items Workflow

**Complete Flow**:

1. **User Requests Quote** (`POST /api/v1/logistics/calculate-shipping/`)

   - Provides: `origin_country`, `destination_country`, `weight`, `dimensions`, `declared_value`
   - Optional: `origin_address`, `destination_address` (required for local shipping)
   - System creates `QuoteRequest` (session-based)
   - `PricingCalculator.get_all_quotes()` calculates quotes for all transport modes
   - Returns quotes array with costs, transit days, shipping modes

2. **User Proceeds with Quote** (`POST /api/v1/logistics/proceed-with-quote/`)

   - User selects a quote and provides addresses
   - System creates `LogisticsShipment` with `source_type='ship_my_items'`
   - Status: `quote_approved`
   - Links to `QuoteRequest`
   - Creates `PickupRequest` if pickup required

3. **User Pays** (`POST /api/v1/logistics/create-payment-session/`)

   - Creates Stripe checkout session
   - User completes payment
   - Stripe webhook triggers
   - Payment webhook handler:
     - Creates `Payment` with `payment_type='shipping'`
     - Updates `LogisticsShipment.status` to `payment_received`
     - **Creates `Package` automatically** (if not vehicle)
     - Generates EasyShip label if local shipping or pickup required
     - Creates `TrackingUpdate`
     - Sends payment receipt email

4. **Pickup (if required)**

   - Worker views `PickupRequest` in admin
   - Worker schedules pickup
   - Worker completes pickup
   - Updates `PickupRequest.status` to `completed`
   - Creates `TrackingUpdate` with status `picked_up`
   - Updates `LogisticsShipment.status` to `processing`

5. **Package at Warehouse**

   - Package arrives at warehouse
   - Worker receives package via admin or API
   - Updates `Package.status` to `received`
   - Uploads inbound photos

6. **Package Shipped**

   - Worker generates label if not already generated
   - Updates `LogisticsShipment.status` to `dispatched` or `in_transit`
   - Creates `TrackingUpdate`
   - User receives tracking number

7. **Package Delivered**
   - Worker updates `Package.status` to `delivered`
   - Worker uploads delivery photos
   - System sends email to user with photos
   - Updates `LogisticsShipment.status` to `delivered`

**Key Differences from Buy & Ship**:

- No agent involvement
- User ships their own items to warehouse
- Package created automatically on payment
- Can use warehouse label service to prepay shipping to warehouse

### 3.3 Vehicle Shipping Workflow

**Complete Flow**:

1. **User Calculates Pricing** (`POST /api/v1/vehicles/calculate-pricing/`)

   - Provides: vehicle details, origin/destination addresses
   - System calculates RoRo vs Container pricing
   - Returns quote options

2. **User Gets Required Documents** (`GET /api/v1/vehicles/documents/`)

   - System returns all `VehicleDocument` instances where `is_required=True` and `is_active=True`
   - User must sign these before payment

3. **User Signs Documents** (`POST /api/v1/vehicles/<id>/sign-documents/`)

   - User provides signature data for each document
   - System updates `Vehicle.documents_signed` JSONField
   - Updates `Vehicle.status` to `documents_signed`
   - Sets `Vehicle.documents_signed_at` timestamp

4. **User Creates Vehicle Request** (`POST /api/v1/vehicles/create/`)

   - Provides: vehicle details, addresses, shipping method
   - System validates documents are signed
   - Creates `Vehicle` with status `documents_signed`
   - Calculates `total_amount` = `quote_amount` + `pickup_cost`

5. **User Pays** (`POST /api/v1/vehicles/<id>/payment/`)

   - Creates Stripe checkout session for full payment
   - User completes payment
   - Stripe webhook triggers
   - Payment webhook handler:
     - Creates `Payment` with `payment_type='vehicle_shipping'`
     - Updates `Vehicle.status` to `payment_received`
     - Sets `Vehicle.payment_paid = True`
     - Creates `LogisticsShipment` with `source_type='vehicle'`
     - Links `Vehicle` to `LogisticsShipment`
     - Creates `TrackingUpdate` with status `payment_received`
     - Updates `Vehicle.status` to `pickup_scheduled`
     - Sends payment receipt emails

6. **Pickup Driver Arrives**

   - Driver accesses inspection endpoint
   - Driver uploads inspection photos (`inspection_photo_1` to `inspection_photo_20`)
   - Driver submits inspection report (`POST /api/v1/vehicles/<id>/inspection/`)
   - System updates:
     - `Vehicle.inspection_report` (JSONField)
     - `Vehicle.inspection_completed_at`
     - `Vehicle.inspected_by`
     - `Vehicle.status` to `inspection_completed`
   - System generates condition report PDF
   - System sends email to user with:
     - Inspection report photos
     - Link to sign condition report
     - Link to vehicle request page

7. **User Signs Condition Report**

   - User accesses vehicle request page
   - User views inspection photos and report
   - User signs condition report (`POST /api/v1/vehicles/<id>/sign-report/`)
   - System updates:
     - `Vehicle.condition_report_signed = True`
     - `Vehicle.condition_report_signed_at`
     - `Vehicle.condition_report_signature` (JSONField)
     - `Vehicle.status` to `condition_report_signed`

8. **Vehicle Transported to Warehouse**

   - System updates `Vehicle.status` to `in_transit_to_warehouse`
   - Updates `LogisticsShipment.status` to `in_transit`
   - Creates `TrackingUpdate`

9. **Warehouse Receives Vehicle** (`POST /api/v1/vehicles/<id>/receive/`)

   - Warehouse worker submits receiving report
   - System updates:
     - `Vehicle.status` to `received_at_warehouse`
     - `Vehicle.received_at_warehouse_at`
     - `Vehicle.warehouse_receiving_notes`
     - `LogisticsShipment.status` to `processing`
   - Creates `TrackingUpdate` with status `warehouse_received`

10. **Vehicle Shipped to Destination**

    - System updates `LogisticsShipment.status` to `in_transit`
    - Creates `TrackingUpdate` records for status changes
    - User can track via tracking number

11. **Vehicle Delivered**
    - System updates `Vehicle.status` to `delivered`
    - Updates `LogisticsShipment.status` to `delivered`
    - Creates final `TrackingUpdate`

**Key Features**:

- Document signing required before payment
- Full payment (no deposit)
- Inspection with photo uploads
- Condition report signing
- Comprehensive status tracking

### 3.4 Status Transitions

**BuyingRequest Status Flow**:

```
pending → quoted → quote_approved → payment_received → purchased →
received_at_warehouse → shipped → in_transit → delivered → completed
```

**LogisticsShipment Status Flow**:

```
quote_requested → quote_approved → payment_received → processing →
dispatched → in_transit → customs_clearance → out_for_delivery → delivered
```

**Vehicle Status Flow**:

```
pending_documents → documents_signed → payment_pending → payment_received →
pickup_scheduled → inspection_pending → inspection_completed →
condition_report_pending → condition_report_signed →
in_transit_to_warehouse → received_at_warehouse →
in_transit → customs_clearance → out_for_delivery → delivered
```

**Package Status Flow**:

```
pending → received → inspected → ready → in_transit → delivered
```

**Payment Status Flow**:

```
pending → processing → completed / failed / refunded
```

---

## 4. Admin Interfaces

### 4.1 Buying Service Admins

#### **BuyingServiceSettingsAdmin**

- **Purpose**: Configure global buying fee settings
- **Key Actions**:
  - Set default buying fee percentage (5-10% range)
  - Only one active settings instance allowed
- **Location**: `Buying → Buying Service Settings`

#### **BuyingRequestAdmin**

- **Purpose**: Manage buy-and-ship requests
- **Key Features**:
  - **List View**: Shows ID, user email, product name, status badge, reference number, quote count, created date
  - **Custom Button**: "🚀 Generate Quotes Automatically"
    - Clicking generates quotes for all shipping modes
    - Sends email to user if status was `pending`
  - **Inline Quotes**: View/edit `BuyAndShipQuote` instances
  - **Auto Email**: Sends emails on status changes:
    - `quoted`: Quote ready email
    - `purchased`: Purchase confirmation
    - `delivered`: Delivery confirmation with photos
  - **Fieldsets**:
    - User Information
    - Product Information
    - Shipping Address
    - Quote Information
    - Purchase Details
    - Status & Notes
    - Actions (Generate Quotes button)
    - Linked Objects (Package, Shipment)
- **Location**: `Buying → Buying Requests`

#### **BuyAndShipQuoteAdmin**

- **Purpose**: Manage individual quotes
- **Key Features**:
  - **List View**: Shows ID, buying request link, shipping mode, total cost, status badge
  - **Filters**: By status, shipping mode, date
  - **Fieldsets**:
    - Buying Request
    - Product Costs
    - Shipping Details
    - Total Cost
    - Status & Notes
- **Location**: `Buying → Buy And Ship Quotes`

### 4.2 Logistics Admins

#### **CountryAdmin**

- **Purpose**: Manage countries
- **Features**: Add/edit countries with ISO codes, mark customs requirements
- **Location**: `Logistics → Countries`

#### **TransportModeAdmin**

- **Purpose**: Configure transport modes
- **Features**: Set transit times, activate/deactivate modes
- **Location**: `Logistics → Transport Modes`

#### **ShippingRouteAdmin**

- **Purpose**: Define shipping routes
- **Features**:
  - Create routes: origin → destination with transport mode
  - Set priority (higher = shown first)
  - Enable/disable availability
  - Inline `ShippingCalculationSettings`
- **Location**: `Logistics → Shipping Routes`

#### **ShippingCalculationSettingsAdmin**

- **Purpose**: Configure pricing parameters
- **Key Features**:
  - **Settings Types**:
    - Global Default: Leave `route` empty, set `is_global_default=True`
    - Route-Specific: Select `route`, set `is_global_default=False`
  - **Shipping Categories**: Multi-select JSONField widget
  - **Pricing Fields** (by transport mode):
    - Air: Base rate, per-kg rate, fuel surcharge %, security fee, dimensional weight divisor
    - Sea LCL: Base rate, per-kg rate, rate per CBM, rate per ton, port fees, documentation, customs, delivery
    - Sea FCL: Container prices (20ft/40ft), CBM capacity, origin/destination fees, customs, delivery
    - Rail: Base rate, per-kg rate, terminal handling, customs
    - Truck: Base rate, per-kg rate, customs
- **Location**: `Logistics → Shipping Calculation Settings`

#### **PickupCalculationSettingsAdmin**

- **Purpose**: Configure pickup pricing
- **Key Features**:
  - Set by country, state (required for USA), shipping category
  - Pricing: Base fee, per-kg rate, per-km rate, minimum fee
  - Additional fees: Residential fee, lift gate fee
  - Markup percentage
  - `is_global_fallback=True` for global defaults
- **Location**: `Logistics → Pickup Calculation Settings`

#### **PackageAdmin**

- **Purpose**: Manage packages
- **Key Features**:
  - **List View**: Reference number, user email, status badge, weight, dimensions, received date
  - **Photo Management**:
    - Inbound photos: `photo_1` to `photo_5` (ImageField)
    - Delivery photos: `delivery_photo_1` to `delivery_photo_5` (ImageField)
    - Legacy: `photos`, `delivery_photos` (JSONField URLs)
  - **Custom View**: Warehouse receiving view (`/admin/logistics/package/<id>/receive/`)
    - Form for receiving package
    - Upload photos
    - Enter storage location
    - Update status
  - **Auto Email**: Sends email when status changes to `delivered` with photos
- **Location**: `Logistics → Packages`

#### **LogisticsShipmentAdmin**

- **Purpose**: Manage shipments
- **Key Features**:
  - **List View**: Shipment number, user email, status badge, transport mode, total cost, tracking link
  - **Status Tracking**: Auto-creates `TrackingUpdate` on status changes (via `post_save` signal)
  - **Fieldsets**:
    - Shipment Information
    - Transport Details
    - Weight & Dimensions
    - Addresses (JSON display)
    - Pricing
    - Tracking Information
    - Packages (ManyToMany)
  - **Filters**: By status, source type, shipping category, transport mode, date
- **Location**: `Logistics → Logistics Shipments`

#### **TrackingUpdateAdmin**

- **Purpose**: View tracking history
- **Features**: Shows all status changes with timestamps, locations, sources
- **Location**: `Logistics → Tracking Updates`

#### **PickupRequestAdmin**

- **Purpose**: Manage pickup requests
- **Key Features**:
  - **List View**: Shipment number, status badge, worker name, scheduled datetime, pickup attempts
  - **Custom Actions**: Mark as scheduled, completed, failed
  - **Fieldsets**:
    - Shipment Information
    - Worker Assignment
    - Pickup Address
    - Scheduling
    - Status Tracking
    - Completion Details
    - Package Details
- **Location**: `Logistics → Pickup Requests`

#### **WarehouseAdmin**

- **Purpose**: Manage warehouse locations
- **Key Features**:
  - **Shipping Categories**: Multi-select JSONField
  - Set priority (higher = preferred)
  - Mark as active/inactive
- **Location**: `Logistics → Warehouses`

### 4.3 Vehicle Admins

#### **VehicleDocumentAdmin**

- **Purpose**: Manage documents requiring signature
- **Features**: Upload PDFs, mark as required, activate/deactivate
- **Location**: `Vehicles → Vehicle Documents`

#### **VehicleAdmin**

- **Purpose**: Manage vehicle shipping requests
- **Key Features**:
  - **List View**: Make, model, year, user, shipping method, status badge, payment status
  - **Status Badge**: Color-coded status display
  - **Inspection Photos Display**: Shows uploaded photos
  - **Documents Signed Display**: Shows signed documents
  - **Custom Actions**: Mark as pickup scheduled, received at warehouse
  - **Fieldsets**:
    - Vehicle Information
    - Dimensions & Weight
    - Addresses
    - Pricing
    - Document Signing
    - Inspection Details
    - Condition Report
    - Documentation
    - Warehouse Receiving
    - Linked Shipment
- **Location**: `Vehicles → Vehicles`

### 4.4 Payment Admin

#### **PaymentAdmin**

- **Purpose**: Track all payments
- **Features**: View payments by status, type, user, date
- **Location**: `Payments → Payments`

### 4.5 Accounts Admin

#### **UserAdmin**

- **Purpose**: Manage user accounts
- **Features**: View/edit users, manage permissions, view Stripe customer IDs
- **Location**: `Accounts → Users`

#### **AddressAdmin**

- **Purpose**: View user addresses
- **Location**: `Accounts → Addresses`

### 4.6 Warehouse Admins

#### **WarehouseReceivingAdmin**

- **Purpose**: Track package receiving
- **Location**: `Warehouse → Warehouse Receivings`

#### **WarehouseLabelAdmin**

- **Purpose**: Manage warehouse labels
- **Location**: `Warehouse → Warehouse Labels`

---

## 5. API Endpoints

### 5.1 Authentication (`/api/v1/auth/`)

- `POST /register/` - User registration
- `POST /login/` - User login (JWT tokens)
- `POST /token/refresh/` - Refresh JWT token
- `POST /verify-email/` - Email verification
- `POST /forgot-password/` - Password reset request
- `POST /reset-password/<uid>/<token>/` - Reset password

### 5.2 Buying Service (`/api/v1/buying/`)

- `POST /requests/` - Create buying request
- `GET /requests/` - List user's buying requests
- `GET /requests/<id>/` - Get buying request details
- `GET /requests/<id>/quotes/list/` - List quotes for request
- `POST /quotes/<id>/approve/` - Approve quote (creates payment session)
- `POST /requests/<id>/mark-purchased/` - Mark as purchased (agent)
- `POST /preview-quotes/` - Get approximate quotes (before submitting request)

### 5.3 Logistics (`/api/v1/logistics/`)

**Quote & Shipment**:

- `POST /calculate-shipping/` - Calculate shipping quotes (public)
- `POST /proceed-with-quote/` - Convert quote to shipment
- `POST /create-payment-session/` - Create Stripe checkout for shipment
- `POST /shipments/<id>/generate-label/` - Generate EasyShip label

**Tracking**:

- `GET /shipments/<id>/track/` - Track shipment (includes packages)
- `GET /track/<tracking_number>/` - Track by number (public, includes packages)

**Packages**:

- `GET /packages/` - List user packages (ViewSet)
- `GET /packages/my_packages/` - Get all user packages with details
- `GET /shipments/<id>/packages/` - Get packages for shipment

**Warehouse**:

- `GET /warehouse/address/` - Get warehouse address
- `POST /warehouse/rates/` - Get EasyShip rates to warehouse
- `POST /warehouse/labels/create/` - Create warehouse label

**Reference Data**:

- `GET /countries/` - List countries (public)
- `GET /transport-modes/` - List transport modes (public)
- `GET /available-transport-modes/` - Get available modes for route (public)

**Pickup Management**:

- `GET /pickups/` - List pickup requests
- `GET /pickups/<id>/` - Get pickup request details
- `POST /pickups/<id>/schedule/` - Schedule pickup
- `POST /pickups/<id>/update-status/` - Update pickup status
- `POST /pickups/<id>/mark-delivered/` - Mark delivered to warehouse

**Webhooks**:

- `POST /easyship-webhook/` - EasyShip tracking webhook

### 5.4 Vehicles (`/api/v1/vehicles/`)

- `POST /calculate-pricing/` - Calculate vehicle shipping pricing
- `GET /documents/` - Get required documents
- `POST /<id>/sign-documents/` - Sign documents
- `POST /create/` - Create vehicle request (requires documents signed)
- `POST /<id>/payment/` - Create payment session
- `POST /<id>/inspection/` - Submit inspection (pickup driver)
- `POST /<id>/sign-report/` - Sign condition report
- `POST /<id>/receive/` - Warehouse receives vehicle

### 5.5 Payments (`/api/v1/payments/`)

- `POST /create-checkout/` - Create Stripe checkout session
- `POST /webhook/` - Stripe webhook handler

### 5.6 Warehouse (`/api/v1/warehouse/`)

- `GET /address/` - Get warehouse address
- `POST /receive-package/` - Receive package by reference number

---

## 6. Services & Business Logic

### 6.1 QuoteGenerator Service (`buying/services/quote_generator.py`)

**Purpose**: Generate buy-and-ship quotes automatically

**Key Methods**:

- `__init__()` - Initializes with `PricingCalculator` and `BuyingServiceSettings`
- `_get_settings()` - Gets active `BuyingServiceSettings`
- `get_buying_fee_percent()` - Gets buying fee percentage (from settings or request)
- `calculate_buying_fee(product_cost, fee_percent)` - Calculates buying fee
- `generate_shipping_quotes(buying_request)` - Generates shipping quotes using `PricingCalculator`
- `create_quote_for_shipping_mode(buying_request, quote_data, transport_mode)` - Creates `BuyAndShipQuote` for a shipping mode
- `create_all_shipping_quotes(buying_request)` - Creates quotes for all available shipping modes

**How It Works**:

1. Gets product cost from `approximate_quote_data` or existing quotes
2. Calculates buying fee using settings
3. Gets shipping quotes from `PricingCalculator` (warehouse to destination only)
4. Creates `BuyAndShipQuote` for each shipping mode
5. Stores quote data including EasyShip rate IDs

### 6.2 PricingCalculator Service (`logistics/services/pricing_calculator.py`)

**Purpose**: Calculate shipping costs for all transport modes

**Key Methods**:

- `__init__()` - Initializes calculator
- `get_warehouse_address(origin_country, shipping_category)` - Gets warehouse address by country and category
- `get_all_quotes(origin, destination, weight, dimensions, declared_value, items, shipping_category, origin_address, warehouse_address, destination_address, skip_origin_to_warehouse=False)` - Main method to get all quotes
- `get_calculation_settings(route, transport_mode, shipping_category='all')` - Gets pricing settings (route-specific or global default, filtered by category)
- `calculate_air_freight(route, weight, dimensions, declared_value, shipping_category)` - Calculates air freight cost
- `calculate_sea_freight(route, weight, dimensions, declared_value, shipping_category)` - Calculates sea freight cost (LCL and FCL)
- `calculate_rail_freight(route, weight, dimensions, declared_value, shipping_category)` - Calculates rail freight cost
- `calculate_truck_freight(route, weight, dimensions, declared_value, shipping_category)` - Calculates truck/road freight cost
- `calculate_pickup_cost_custom(origin_address, warehouse_address, weight, dimensions, shipping_category)` - Calculates pickup cost using `PickupCalculationSettings`
- `calculate_dimensional_weight(length, width, height, divisor)` - Calculates dimensional weight
- `determine_pickup_required(weight, shipping_category)` - Determines if pickup is needed
- `is_local_shipping(origin_country, destination_country)` - Checks if same-country shipping

**How It Works**:

1. Determines shipping category from weight or item type
2. Gets warehouse address if needed
3. Finds available routes between origin and destination
4. For each route and transport mode:
   - Gets `ShippingCalculationSettings` (route-specific or global, filtered by category)
   - Calculates cost using mode-specific formula
   - Applies surcharges (fuel, security, handling, etc.)
   - Calculates dimensional weight if applicable
5. For international parcels: Uses EasyShip API for local legs
6. Returns quotes sorted by priority and cost

**Pricing Formulas**:

**Air Freight**:

```
base_cost = base_rate + (chargeable_weight × per_kg_rate)
fuel_surcharge = base_cost × (fuel_surcharge_percent / 100)
total = base_cost + fuel_surcharge + security_fee + handling_fee
```

**Sea Freight LCL**:

```
volume_cost = (length × width × height / 1,000,000) × rate_per_cbm
weight_cost = weight × per_kg_rate_sea
tonnage_cost = (weight / 1000) × rate_per_ton
base_cost = max(volume_cost, weight_cost, tonnage_cost) + ocean_freight_base
total = base_cost + port_origin_handling + port_destination_handling +
        documentation_fee + customs_clearance_fee + destination_delivery_fee
```

**Sea Freight FCL**:

```
container_price = container_20ft_price or container_40ft_price
total = container_price + container_origin_fees + container_destination_fees +
        container_customs_fee + container_delivery_fee
```

**Rail Freight**:

```
base_cost = base_rate_rail + (weight × per_kg_rate_rail)
total = base_cost + terminal_handling_fee + customs_fee_rail
```

**Truck/Road Freight**:

```
base_cost = base_rate_truck (per 100 lbs/CWT) + (weight × per_kg_rate_truck)
total = base_cost + customs_fee_truck
```

**Pickup Cost**:

```
weight_cost = base_pickup_fee + (weight × per_kg_rate)
distance_cost = distance_km × per_km_rate
cost = max(weight_cost, distance_cost, minimum_pickup_fee)
cost += residential_fee + lift_gate_fee
cost += cost × (markup_percent / 100)
```

### 6.3 EasyShipService (`logistics/services/easyship_service.py`)

**Purpose**: Integrate with EasyShip API for shipping labels

**Key Methods**:

- `__init__()` - Initializes with API credentials
- `get_rates(origin_country, destination_country, weight, dimensions, declared_value, items, origin_address, destination_address)` - Gets shipping rates from EasyShip
- `create_shipment(rate_id, origin_address, destination_address, parcels, courier_name, package_reference_number)` - Creates shipment and generates label
- `get_tracking(tracking_number)` - Gets tracking information

**How It Works**:

1. **Get Rates**:

   - Formats addresses for EasyShip 2024-09 API
   - Builds parcels with items array
   - Calls EasyShip API
   - Caches rates for 5 minutes
   - Stores in `EasyShipRate` model

2. **Create Shipment**:
   - Uses `package_reference_number` as `contact_name` if provided
   - Formats addresses and parcels
   - Calls EasyShip API to create shipment
   - Buys label if `rate_id` provided
   - Returns shipment ID, tracking number, label URL

**API Version**: Uses EasyShip 2024-09 API format

### 6.4 Email Services

**Buying Service Email** (`buying/services/email_service.py`):

- `send_quote_created_user_email(buying_request, quotes)` - Sends quote options to user
- `send_quote_created_agent_email(buying_request)` - Notifies agent of new request
- `send_payment_receipt_user_email(buying_request, payment)` - Sends payment receipt
- `send_payment_received_agent_email(buying_request, payment)` - Notifies agent of payment
- `send_purchased_user_email(buying_request)` - Confirms purchase
- `send_delivered_user_email(buying_request)` - Sends delivery confirmation with photos

**Vehicle Service Email** (`vehicles/services/email_service.py`):

- `send_inspection_report_user_email(vehicle)` - Sends inspection report with photos
- `send_condition_report_signed_user_email(vehicle)` - Confirms condition report signing
- `send_vehicle_payment_receipt_user_email(vehicle, payment)` - Sends payment receipt
- `send_vehicle_payment_received_agent_email(vehicle, payment)` - Notifies agent

---

## 7. Payment Processing

### 7.1 Payment Flow

1. **Create Checkout Session**:

   - User/System calls `POST /api/v1/payments/create-checkout/` or service-specific endpoint
   - Creates Stripe checkout session
   - Creates `Payment` record with status `pending`
   - Returns checkout URL

2. **User Pays**:

   - User redirected to Stripe Checkout
   - User completes payment
   - Stripe redirects to success URL

3. **Webhook Processing** (`POST /api/v1/payments/webhook/`):
   - Stripe sends webhook event
   - System verifies webhook signature
   - Handles `checkout.session.completed` event
   - Updates `Payment.status` to `completed`
   - **Payment Type Handling**:
     - `buy_and_ship_quote`: Creates `LogisticsShipment`, links to `BuyAndShipQuote`, sends emails
     - `vehicle_shipping`: Creates `LogisticsShipment`, links to `Vehicle`, sends emails
     - `shipping`: Creates `Package` (if ship_my_items), generates EasyShip label, sends emails

### 7.2 Payment Types

- `shipping` - Regular shipping quote payment
- `quote` - Shipping quote payment (legacy)
- `buy_and_ship_quote` - Buy & Ship quote payment
- `buying_service` - Buying service payment (legacy)
- `vehicle_deposit` - Vehicle deposit (legacy)
- `vehicle_shipping` - Vehicle shipping full payment
- `warehouse_label` - Warehouse label payment
- `storage` - Storage fee payment
- `insurance` - Insurance payment

---

## 8. Email Notifications

### 8.1 Email Triggers

**BuyingRequest Status Changes**:

- `pending` → `quoted`: Quote ready email to user
- `quoted` → `purchased`: Purchase confirmation to user
- `purchased` → `delivered`: Delivery confirmation with photos to user

**Payment Events**:

- Payment completed: Receipt email to user, notification to agent

**Package Status Changes**:

- `delivered`: Delivery email with photos to user

**Vehicle Events**:

- Inspection completed: Inspection report email to user
- Condition report signed: Confirmation email to user
- Payment completed: Receipt email to user, notification to agent

### 8.2 Email Templates

All emails use HTML templates with:

- Company branding
- Clear call-to-action buttons
- Links to relevant pages
- Photo attachments (for delivery emails)

---

## 9. Status Management

### 9.1 Automatic Status Updates

**LogisticsShipment**:

- `post_save` signal creates `TrackingUpdate` on every status change
- Source: `'system'` or `'manual'` (admin)

**BuyingRequest**:

- Status changes trigger email notifications
- Reference number generated when status changes to `purchased`

**Package**:

- Status change to `delivered` triggers email with photos

### 9.2 Status Validation

- Status transitions are validated in views
- Invalid transitions return error responses
- Admin allows manual status changes (for flexibility)

---

## 10. Pricing & Calculations

### 10.1 Quote Calculation Flow

1. **Determine Shipping Category**:

   - From weight: <30kg = small_parcel, <100kg = heavy_parcel, <4000kg = ltl_freight, >=4000kg = ftl_freight
   - From item_type: 'car' = vehicle category

2. **Get Warehouse Address**:

   - Filters `Warehouse` by `country` and `shipping_categories` JSONField
   - Returns warehouse address for origin country

3. **Find Available Routes**:

   - Queries `ShippingRoute` by origin/destination countries
   - Filters by `is_available=True`
   - Sorted by priority

4. **Calculate Costs**:

   - For each route and transport mode:
     - Gets `ShippingCalculationSettings` (route-specific or global, filtered by category)
     - Calculates base cost using mode-specific formula
     - Applies surcharges
     - Calculates dimensional weight if applicable
     - Uses chargeable weight (max of actual or dimensional)

5. **Pickup Cost** (if required):

   - Gets `PickupCalculationSettings` by country/state/category
   - Falls back to global settings (`is_global_fallback=True`)
   - Calculates using weight-based or distance-based formula
   - Applies minimum fee, additional fees, markup

6. **EasyShip Integration** (for local shipping or international parcels):
   - Calls EasyShip API for rates
   - Combines with YuuSell route calculations

### 10.2 Buy-and-Ship Pricing

**Total Quote Cost**:

```
product_cost = (from agent input or approximate_quote_data)
sales_tax = (calculated or from agent input)
buying_fee = product_cost × (buying_fee_percent / 100)
shipping_cost = (from PricingCalculator - warehouse to destination only)
total_cost = product_cost + sales_tax + buying_fee + shipping_cost
```

**Note**: For buy-and-ship, only warehouse-to-destination shipping is calculated (marketplace ships to warehouse).

---

## 11. External Integrations

### 11.1 Stripe Integration

**Configuration**:

- `STRIPE_SECRET_KEY` - Secret key for API calls
- `STRIPE_PUBLISHABLE_KEY` - Public key for frontend
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification

**Usage**:

- Checkout sessions for payments
- Webhook for payment confirmation
- Customer ID storage in User model

### 11.2 EasyShip Integration

**Configuration**:

- `EASYSHIP_API_URL` - API base URL
- `EASYSHIP_API_KEY` - API authentication key
- `EASYSHIP_WEBHOOK_SECRET` - Webhook signature verification

**Usage**:

- Get shipping rates
- Create shipments
- Generate labels
- Track shipments

**API Version**: 2024-09 format

---

## 12. Frontend Integration

### 12.1 API Client (`frontend/lib/api.js`)

**Buying API**:

- `createRequest(data)` - Create buying request
- `getQuotes(requestId)` - Get quotes for request
- `approveQuote(quoteId)` - Approve quote
- `previewQuotes(data)` - Get approximate quotes

**Logistics API**:

- `calculateShipping(data)` - Calculate shipping quotes
- `proceedWithQuote(data)` - Convert quote to shipment
- `createPaymentSession(shipmentId)` - Create payment session
- `trackShipment(shipmentId)` - Track shipment

**Vehicle API**:

- `calculatePricing(data)` - Calculate vehicle pricing
- `getDocuments()` - Get required documents
- `signDocuments(vehicleId, signatures)` - Sign documents
- `createRequest(data)` - Create vehicle request
- `createPaymentSession(vehicleId)` - Create payment session

### 12.2 State Management

**Zustand Stores** (`frontend/store/slices/`):

- `authSlice.js` - Authentication state
- `quoteSlice.js` - Quote state
- `shipmentSlice.js` - Shipment state
- `packagesSlice.js` - Package state

### 12.3 Key Frontend Pages

- `/buy-ship/request` - Buy & Ship request form
- `/buy-ship/quotes` - View quotes for request
- `/quote/review` - Review selected quote
- `/quote/payment` - Payment page
- `/vehicles/ship` - Vehicle shipping form
- `/track/[trackingNumber]` - Track shipment
- `/dashboard` - User dashboard

---

## 13. Reference Number Formats

- **BuyingRequest**: `BS-YYYYMMDD-XXXXXX` (e.g., `BS-20241207-ABC123`)
- **Package**: `PKG-YYYYMMDD-XXXXXX` (e.g., `PKG-20241207-ABC123`)
- **User Warehouse ID**: `JS-12345` (5 digits)
- **LogisticsShipment**: UUID-based (8 characters)

---

## 14. Important Notes

### 14.1 Buy-and-Ship Specifics

- **No Origin-to-Warehouse Calculation**: Only warehouse-to-destination shipping is calculated
- **Package Reference Number**: Used as `contact_name` in EasyShip shipments
- **Automatic Package Creation**: Package is created automatically on payment (for buy-and-ship and ship_my_items), physically bound to LogisticsShipment. Package status updates automatically update LogisticsShipment status via Package.save() method.

### 14.2 Ship My Items Specifics

- **Automatic Package Creation**: Package created automatically when payment completes (if not vehicle)
- **Pickup Optional**: Pickup only required for heavy items or if user requests
- **Warehouse Label Service**: Users can prepay shipping to warehouse

### 14.3 Vehicle Shipping Specifics

- **Document Signing Required**: Must sign documents before payment
- **Full Payment**: No deposit system
- **Inspection Required**: Pickup driver must upload photos and submit report
- **Condition Report**: User must sign condition report after inspection
- **No Package Creation**: Vehicles don't create Package instances

### 14.4 Admin Best Practices

1. **Always use "Generate Quotes Automatically" button** for buy-and-ship requests
2. **Check shipping categories** when configuring warehouses and calculation settings
3. **Use global fallback settings** for pickup calculations if no specific settings exist
4. **Upload photos via ImageFields** (not JSONField URLs) for packages
5. **Status changes trigger emails automatically** - be careful when updating statuses
6. **Tracking updates are created automatically** for LogisticsShipment status changes

---

## 15. Configuration Files

### 15.1 Django Settings (`config/settings.py`)

**Key Settings**:

- `QUOTE_REQUEST_EXPIRY_HOURS` - Quote request expiration (default: 24)
- `FRONTEND_URL` - Frontend URL for redirects
- `STRIPE_SECRET_KEY` - Stripe API key
- `EASYSHIP_API_URL` - EasyShip API URL
- `EASYSHIP_API_KEY` - EasyShip API key
- `MEDIA_ROOT` - File upload directory
- `STATIC_ROOT` - Static files directory

### 15.2 Environment Variables

Required in `.env`:

- `SECRET_KEY` - Django secret key
- `DEBUG` - Debug mode
- `DATABASE_URL` - Database connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `EASYSHIP_API_URL` - EasyShip API URL
- `EASYSHIP_API_KEY` - EasyShip API key
- `FRONTEND_URL` - Frontend URL

---

## 16. Database Migrations

### 16.1 Key Migrations

- `buying/migrations/0003_fix_nullable_fields.py` - Made product fields nullable
- `logistics/migrations/0007_*` - Warehouse shipping_categories JSONField
- `vehicles/migrations/XXXX_remake_vehicle_workflow.py` - Vehicle workflow remake
- `payments/migrations/XXXX_add_vehicle_shipping_payment_type.py` - Payment type updates

### 16.2 Migration Best Practices

- Always test migrations on development database first
- Create data migrations for field changes
- Use `SeparateDatabaseAndState` for complex index changes
- Answer migration prompts carefully (e.g., "Was deposit_paid renamed?" → No)

---

## 17. Testing & Debugging

### 17.1 Logging

- Use `logger.debug()`, `logger.info()`, `logger.warning()`, `logger.error()`
- Avoid `print()` statements in production code
- Log levels configured in `settings.py`

### 17.2 Common Issues

1. **Missing Calculation Settings**: Create global defaults in admin
2. **No Warehouse Found**: Create warehouse for origin country with correct shipping categories
3. **No Routes Available**: Create shipping routes in admin
4. **Email Failures**: Check email backend configuration
5. **Payment Webhook Failures**: Verify Stripe webhook secret and endpoint URL

---

## 18. Security Considerations

1. **Authentication**: JWT tokens for API access
2. **Permissions**: `IsAuthenticated` for most endpoints, `AllowAny` for public quotes
3. **Webhook Verification**: Stripe and EasyShip webhooks verified with signatures
4. **Input Validation**: Serializers validate all input data
5. **SQL Injection**: Django ORM prevents SQL injection
6. **XSS Protection**: Django templates auto-escape HTML

---

## 19. Performance Optimizations

1. **Database Queries**: Use `select_related()` and `prefetch_related()`
2. **Caching**: EasyShip rates cached for 5 minutes
3. **Indexes**: Database indexes on frequently queried fields
4. **Pagination**: API endpoints support pagination

---

## 20. Future Enhancements

1. **Package Consolidation**: Combine multiple packages into single shipment
2. **Real-time Tracking**: WebSocket updates for tracking
3. **Mobile App**: React Native app for drivers and warehouse workers
4. **Advanced Analytics**: Dashboard with shipping analytics
5. **Multi-warehouse Support**: Support for multiple warehouse locations
6. **Automated Customs**: Integration with customs clearance services

---

**End of Documentation**

This documentation covers all aspects of the YuuSell Logistics platform. For specific implementation details, refer to the source code and inline comments.
