# Workflow Diagrams & System Connections

**Version**: 1.0  
**Last Updated**: 2025-12-07

This document provides visual workflow diagrams and explains how all system components connect together.

---

## Table of Contents

1. [Buy & Ship Workflow Diagram](#buy--ship-workflow-diagram)
2. [Ship My Items Workflow Diagram](#ship-my-items-workflow-diagram)
3. [Vehicle Shipping Workflow Diagram](#vehicle-shipping-workflow-diagram)
4. [Payment Processing Flow](#payment-processing-flow)
5. [Pricing Calculation Flow](#pricing-calculation-flow)
6. [System Component Connections](#system-component-connections)
7. [Data Flow Diagrams](#data-flow-diagrams)

---

## 1. Buy & Ship Workflow Diagram

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Submit Request
       │    POST /api/v1/buying/requests/
       │    {product_url, shipping_address, weight, dimensions, price}
       ▼
┌─────────────────────┐
│  BuyingRequest      │
│  status: pending    │
│  approximate_     │
│  quote_data: {...}  │
└──────┬──────────────┘
       │
       │ 2. (Optional) Immediate Approximate Quotes
       │    Returns approximate quotes if weight/dimensions/price provided
       │
       ▼
┌─────────────────────┐
│   AGENT (Admin)     │
└──────┬──────────────┘
       │
       │ 3. Review Request
       │    Fill product details
       │
       │ 4. Click "Generate Quotes Automatically"
       │    QuoteGenerator.create_all_shipping_quotes()
       │
       ▼
┌─────────────────────┐
│  BuyAndShipQuote    │
│  (Multiple quotes)  │
│  - Air Freight      │
│  - Sea Freight      │
│  - Rail Freight     │
│  - Truck/Road       │
└──────┬──────────────┘
       │
       │ 5. Update status to 'quoted'
       │    Send email to user
       │
       ▼
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 6. View Quotes
       │    GET /api/v1/buying/requests/<id>/quotes/list/
       │
       │ 7. Approve Quote
       │    POST /api/v1/buying/quotes/<id>/approve/
       │    Creates Stripe checkout session
       │
       ▼
┌─────────────────────┐
│   STRIPE CHECKOUT   │
└──────┬──────────────┘
       │
       │ 8. User Pays
       │
       ▼
┌─────────────────────┐
│  STRIPE WEBHOOK     │
│  checkout.session.  │
│  completed          │
└──────┬──────────────┘
       │
       │ 9. Payment Processing
       │    - Create Payment record
       │    - Update BuyingRequest.status = 'payment_received'
       │    - Create LogisticsShipment
       │    - Link BuyAndShipQuote to LogisticsShipment
       │    - Create TrackingUpdate
       │    - Send payment receipt email
       │
       ▼
┌─────────────────────┐
│  LogisticsShipment  │
│  source_type:       │
│  'buy_and_ship'     │
│  status:            │
│  'payment_received' │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│      AGENT          │
└──────┬──────────────┘
       │
       │ 9. Purchase Item
       │     Mark BuyingRequest.status = 'purchased'
       │     System generates reference_number (BS-YYYYMMDD-XXXXXX)
       │     Send purchase confirmation email
       │
       │ 10. Ship to Warehouse
       │     Include reference_number on label
       │
       ▼
┌─────────────────────┐
│  WAREHOUSE WORKER   │
│  (Django Admin)     │
└──────┬──────────────┘
       │
       │ 11. Receive Package via Django Admin
       │     Navigate to /admin/logistics/package/receive-package/
       │     Enter reference_number (BS- or PKG- prefix)
       │     Package already exists (created on payment)
       │     Update Package with actual weight/dimensions
       │     Upload inbound photos (photo_1 to photo_5)
       │     Set storage_location
       │     Package.status = 'received'
       │     **Automatically updates LogisticsShipment.status = 'processing'**
       │
       ▼
┌─────────────────────┐
│      Package        │
│      status:        │
│      'received'     │
│      photo_1-5:     │
│      [uploaded]     │
└──────┬──────────────┘
       │
       │ 12. Ship to User
       │     Update Package.status = 'ready' or 'in_transit' (via Django Admin)
       │     **Automatically updates LogisticsShipment.status**
       │     System creates TrackingUpdate
       │
       │ 13. Deliver to User
       │     Update Package.status = 'delivered' (via Django Admin)
       │     Upload delivery_photo_1-5
       │     **Automatically updates LogisticsShipment.status = 'delivered'**
       │     System sends delivery email with photos
       │
       ▼
┌─────────────┐
│    USER     │
│  Receives   │
│  Package    │
└─────────────┘
```

**Key Points**:

- User can get approximate quotes immediately if they provide weight/dimensions/price
- Agent generates final quotes using "Generate Quotes Automatically" button
- Payment creates LogisticsShipment **AND Package** automatically (Package is physically bound to shipment)
- Reference number generated when agent marks as purchased
- **Package is created on payment, not when it arrives at warehouse**
- **Package status updates automatically update LogisticsShipment status** (via Package.save() method)
- Warehouse workers use **Django Admin** to receive packages (not API endpoint)
- Workers can search by BS- (BuyingRequest) or PKG- (Package) reference numbers
- Delivery photos trigger email automatically

---

## 2. Ship My Items Workflow Diagram

```
┌─────────────┐
│    USER      │
└──────┬───────┘
       │
       │ 1. Request Quote
       │    POST /api/v1/logistics/calculate-shipping/
       │    {origin_country, destination_country, weight, dimensions}
       │
       ▼
┌─────────────────────┐
│  PricingCalculator   │
│  .get_all_quotes()  │
└──────┬──────────────┘
       │
       │ 2. Calculate Quotes
       │    - Get warehouse address
       │    - Find shipping routes
       │    - Calculate costs for each transport mode
       │    - Get EasyShip rates (if local or international parcel)
       │
       ▼
┌─────────────────────┐
│   QuoteRequest       │
│   (Session-based)    │
│   quote_data: {...}  │
└──────┬──────────────┘
       │
       │ 3. Return Quotes to User
       │
       ▼
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 4. Select Quote & Proceed
       │    POST /api/v1/logistics/proceed-with-quote/
       │    {quote_request_id, selected_quote, origin_address, destination_address}
       │
       ▼
┌─────────────────────┐
│  LogisticsShipment  │
│  source_type:       │
│  'ship_my_items'    │
│  status:            │
│  'quote_approved'   │
└──────┬──────────────┘
       │
       │ 5. Create Payment Session
       │    POST /api/v1/logistics/create-payment-session/
       │
       ▼
┌─────────────────────┐
│   STRIPE CHECKOUT   │
└──────┬──────────────┘
       │
       │ 6. User Pays
       │
       ▼
┌─────────────────────┐
│  STRIPE WEBHOOK     │
└──────┬──────────────┘
       │
       │ 7. Payment Processing
       │    - Create Payment record
       │    - Update LogisticsShipment.status = 'payment_received'
       │    - **CREATE PACKAGE AUTOMATICALLY** (if not vehicle)
       │    - Generate EasyShip label (if local or pickup required)
       │    - Create TrackingUpdate
       │    - Send payment receipt email
       │
       ▼
┌─────────────────────┐
│      Package         │
│      (Auto-created)  │
│      reference_      │
│      number:         │
│      PKG-YYYYMMDD-   │
│      XXXXXX          │
└──────┬──────────────┘
       │
       │ 8. (If Pickup Required)
       │    Create PickupRequest
       │    Worker schedules pickup
       │    Worker completes pickup
       │
       │ 9. Package at Warehouse
       │    Worker receives package via **Django Admin**
       │    Updates Package.status = 'received'
       │    Uploads inbound photos
       │    **Automatically updates LogisticsShipment.status = 'processing'**
       │
       │ 10. Ship to User
       │     Update Package.status = 'ready' or 'in_transit' (via Django Admin)
       │     **Automatically updates LogisticsShipment.status**
       │     System creates TrackingUpdate
       │
       │ 11. Deliver to User
       │     Update Package.status = 'delivered' (via Django Admin)
       │     Upload delivery_photo_1-5
       │     **Automatically updates LogisticsShipment.status = 'delivered'**
       │     System sends delivery email with photos
       │
       ▼
┌─────────────┐
│    USER     │
│  Receives   │
│  Package    │
└─────────────┘
```

**Key Points**:

- Package created automatically on payment (if not vehicle) and **physically bound to LogisticsShipment**
- **Package status updates automatically update LogisticsShipment status** (via Package.save() method)
- Warehouse workers use **Django Admin** to receive and update packages (not API endpoint)
- Pickup only required for heavy items or if user requests
- EasyShip label generated automatically for local shipping or pickup
- Package reference number used as contact_name in EasyShip shipments

---

## 3. Vehicle Shipping Workflow Diagram

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 1. Calculate Pricing
       │    POST /api/v1/vehicles/calculate-pricing/
       │
       │ 2. Get Required Documents
       │    GET /api/v1/vehicles/documents/
       │    Returns VehicleDocument where is_required=True
       │
       │ 3. Sign Documents
       │    POST /api/v1/vehicles/<id>/sign-documents/
       │    {signatures: {document_id: signature_data}}
       │
       ▼
┌─────────────────────┐
│      Vehicle         │
│      status:         │
│      'documents_     │
│      signed'         │
│      documents_      │
│      signed: {...}   │
└──────┬──────────────┘
       │
       │ 4. Create Vehicle Request
       │    POST /api/v1/vehicles/create/
       │    System validates documents are signed
       │
       │ 5. Create Payment Session
       │    POST /api/v1/vehicles/<id>/payment/
       │    Creates Stripe checkout for full payment
       │
       ▼
┌─────────────────────┐
│   STRIPE CHECKOUT   │
└──────┬──────────────┘
       │
       │ 6. User Pays (Full Payment)
       │
       ▼
┌─────────────────────┐
│  STRIPE WEBHOOK     │
└──────┬──────────────┘
       │
       │ 7. Payment Processing
       │    - Create Payment record
       │    - Update Vehicle.status = 'payment_received'
       │    - Create LogisticsShipment
       │    - Link Vehicle to LogisticsShipment
       │    - Create TrackingUpdate
       │    - Update Vehicle.status = 'pickup_scheduled'
       │    - Send payment receipt emails
       │
       ▼
┌─────────────────────┐
│  LogisticsShipment  │
│  source_type:       │
│  'vehicle'          │
│  status:            │
│  'payment_received' │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  PICKUP DRIVER      │
└──────┬──────────────┘
       │
       │ 8. Arrive at Pickup Location
       │
       │ 9. Upload Inspection Photos
       │    inspection_photo_1 to inspection_photo_20
       │
       │ 10. Submit Inspection Report
       │     POST /api/v1/vehicles/<id>/inspection/
       │     {inspection_report: {...}, photos: [files]}
       │
       ▼
┌─────────────────────┐
│      Vehicle         │
│      status:         │
│      'inspection_   │
│      completed'      │
│      inspection_     │
│      photo_1-20:     │
│      [uploaded]      │
│      inspection_     │
│      report: {...}   │
└──────┬──────────────┘
       │
       │ 11. System Generates Condition Report PDF
       │     System sends email to user with:
       │     - Inspection photos
       │     - Inspection report
       │     - Link to sign condition report
       │
       ▼
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 12. Sign Condition Report
       │     POST /api/v1/vehicles/<id>/sign-report/
       │     {signature_data: {...}}
       │
       ▼
┌─────────────────────┐
│      Vehicle         │
│      status:         │
│      'condition_     │
│      report_signed'   │
│      condition_      │
│      report_signed:  │
│      True            │
└──────┬──────────────┘
       │
       │ 13. Transport to Warehouse
       │     Update Vehicle.status = 'in_transit_to_warehouse'
       │     Update LogisticsShipment.status = 'in_transit'
       │     Create TrackingUpdate
       │
       ▼
┌─────────────────────┐
│  WAREHOUSE WORKER    │
└──────┬──────────────┘
       │
       │ 14. Receive Vehicle
       │     POST /api/v1/vehicles/<id>/receive/
       │     {warehouse_receiving_notes: "..."}
       │
       ▼
┌─────────────────────┐
│      Vehicle         │
│      status:         │
│      'received_at_   │
│      warehouse'      │
│      received_at_    │
│      warehouse_at:  │
│      [timestamp]     │
└──────┬──────────────┘
       │
       │ 15. System Updates
       │     - LogisticsShipment.status = 'processing'
       │     - Creates TrackingUpdate with status 'warehouse_received'
       │
       │ 16. Ship to Destination
       │     Update LogisticsShipment.status
       │     System creates TrackingUpdate for each status change
       │
       │ 17. Deliver Vehicle
       │     Update Vehicle.status = 'delivered'
       │     Update LogisticsShipment.status = 'delivered'
       │     Create final TrackingUpdate
       │
       ▼
┌─────────────┐
│    USER     │
│  Receives   │
│  Vehicle    │
└─────────────┘
```

**Key Points**:

- Documents must be signed before payment
- Full payment (no deposit)
- Inspection with photo uploads required
- Condition report signing required after inspection
- No Package created for vehicles
- All status changes create TrackingUpdate records

---

## 4. Payment Processing Flow

```
┌─────────────┐
│  User/System │
└──────┬───────┘
       │
       │ 1. Create Payment Session
       │    POST /api/v1/payments/create-checkout/
       │    OR service-specific endpoint
       │
       ▼
┌─────────────────────┐
│  Stripe API          │
│  checkout.Session.  │
│  create()            │
└──────┬──────────────┘
       │
       │ 2. Create Payment Record
       │    Payment.status = 'pending'
       │    Payment.stripe_checkout_session_id = session.id
       │
       ▼
┌─────────────────────┐
│      Payment         │
│      status:         │
│      'pending'       │
└──────┬──────────────┘
       │
       │ 3. Return Checkout URL
       │
       ▼
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       │ 4. Redirect to Stripe Checkout
       │
       │ 5. User Completes Payment
       │
       ▼
┌─────────────────────┐
│  STRIPE WEBHOOK      │
│  checkout.session.   │
│  completed           │
└──────┬──────────────┘
       │
       │ 6. Verify Webhook Signature
       │
       │ 7. Update Payment
       │    Payment.status = 'completed'
       │
       │ 8. Handle by Payment Type
       │
       ├─► buy_and_ship_quote:
       │   - Update BuyingRequest.status = 'payment_received'
       │   - Create LogisticsShipment
       │   - Link BuyAndShipQuote to LogisticsShipment
       │   - Create TrackingUpdate
       │   - Send payment receipt email
       │
       ├─► vehicle_shipping:
       │   - Update Vehicle.status = 'payment_received'
       │   - Create LogisticsShipment
       │   - Link Vehicle to LogisticsShipment
       │   - Create TrackingUpdate
       │   - Update Vehicle.status = 'pickup_scheduled'
       │   - Send payment receipt emails
       │
       └─► shipping (ship_my_items):
          - Update LogisticsShipment.status = 'payment_received'
          - **CREATE PACKAGE AUTOMATICALLY** (if not vehicle)
          - Generate EasyShip label (if local or pickup)
          - Create TrackingUpdate
          - Send payment receipt email
       │
       ▼
┌─────────────┐
│  Payment    │
│  Completed  │
│  Related    │
│  Objects    │
│  Updated    │
└─────────────┘
```

**Key Points**:

- All payments go through Stripe Checkout
- Webhook processes payment completion
- Different payment types trigger different workflows
- Package created automatically for ship_my_items (not vehicles)

---

## 5. Pricing Calculation Flow

```
┌─────────────┐
│   Request   │
│  {origin,   │
│  dest,      │
│  weight,    │
│  dims}      │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  PricingCalculator   │
│  .get_all_quotes()  │
└──────┬──────────────┘
       │
       │ 1. Determine Shipping Category
       │    From weight or item_type
       │
       │ 2. Get Warehouse Address
       │    Filter Warehouse by country and shipping_categories
       │
       │ 3. Find Available Routes
       │    Query ShippingRoute by origin/destination
       │    Filter by is_available=True
       │
       │ 4. For Each Route & Transport Mode:
       │
       ├─► Get Calculation Settings
       │   - Try route-specific settings (filtered by category)
       │   - Fallback to global default (filtered by category)
       │   - Create new global default if none found
       │
       ├─► Calculate Base Cost
       │   - Air: base_rate + (weight × per_kg_rate)
       │   - Sea LCL: max(volume_cost, weight_cost, tonnage_cost) + base
       │   - Sea FCL: container_price + fees
       │   - Rail: base_rate_rail + (weight × per_kg_rate_rail)
       │   - Truck: base_rate_truck + (weight × per_kg_rate_truck)
       │
       ├─► Calculate Dimensional Weight
       │   - If applicable: (L × W × H) / divisor
       │   - Use max(actual_weight, dimensional_weight)
       │
       ├─► Apply Surcharges
       │   - Fuel surcharge %
       │   - Security fee
       │   - Handling fee
       │   - Customs fees
       │   - Port fees
       │
       └─► Calculate Pickup Cost (if required)
          - Get PickupCalculationSettings (country/state/category)
          - Fallback to global fallback
          - Calculate: max(weight_cost, distance_cost, minimum)
          - Add residential_fee, lift_gate_fee
          - Apply markup %
       │
       │ 5. For Local Shipping or International Parcels:
       │    - Call EasyShip API for rates
       │    - Combine with YuuSell route calculations
       │
       │ 6. Sort Quotes
       │    - By priority (higher first)
       │    - By total cost (lower first)
       │
       ▼
┌─────────────────────┐
│   Quotes Array       │
│   [{                 │
│     transport_mode,  │
│     total,           │
│     transit_days,    │
│     ...              │
│   }]                 │
└─────────────────────┘
```

**Key Points**:

- Shipping category determined from weight or item type
- Warehouse filtered by country and shipping categories
- Calculation settings filtered by route, transport mode, and category
- Route-specific settings override global defaults
- Pickup cost uses location-specific settings with fallback
- EasyShip used for local shipping or international parcel legs

---

## 6. System Component Connections

### 6.1 Model Relationships Diagram

```
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│BuyingRequest │  │Logistics     │  │   Vehicle    │
│              │  │Shipment      │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                  │                  │
       │                  │                  │
       ├──► BuyAndShip    │                  │
       │    Quote         │                  │
       │                  │                  │
       │                  ├──► Package       │
       │                  │    (ManyToMany)  │
       │                  │                  │
       │                  ├──► TrackingUpdate│
       │                  │    (OneToMany)   │
       │                  │                  │
       │                  ├──► PickupRequest│
       │                  │    (OneToOne)   │
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                          │
                    ┌─────▼──────┐
                    │  Payment   │
                    └───────────┘
```

### 6.2 Service Layer Architecture

```
┌─────────────────────────────────────────┐
│           API Endpoints                  │
│  (views.py in each app)                  │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌─────────────┐  ┌─────────────┐
│ Serializers │  │  Services   │
│             │  │             │
└─────────────┘  └──────┬──────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│QuoteGenerator│ │Pricing        │ │EasyShip      │
│              │ │Calculator     │ │Service       │
└──────────────┘ └───────────────┘ └──────────────┘
        │               │               │
        └───────────────┴───────────────┘
                        │
                        ▼
                 ┌─────────────┐
                 │   Models    │
                 │  (Database) │
                 └─────────────┘
```

### 6.3 Email Notification Flow

```
┌─────────────────────┐
│  Status Change /    │
│  Event Trigger      │
└──────┬──────────────┘
       │
       ├─► BuyingRequest.status = 'quoted'
       │   └─► send_quote_created_user_email()
       │
       ├─► BuyingRequest.status = 'purchased'
       │   └─► send_purchased_user_email()
       │
       ├─► BuyingRequest.status = 'delivered'
       │   └─► send_delivered_user_email()
       │
       ├─► Payment completed
       │   └─► send_payment_receipt_user_email()
       │       send_payment_received_agent_email()
       │
       ├─► Vehicle.inspection_completed
       │   └─► send_inspection_report_user_email()
       │
       ├─► Vehicle.condition_report_signed
       │   └─► send_condition_report_signed_user_email()
       │
       └─► Package.status = 'delivered'
          └─► send_delivered_user_email()
       │
       ▼
┌─────────────────────┐
│  Email Service       │
│  (Django Email)      │
└──────┬───────────────┘
       │
       ▼
┌─────────────┐
│    USER      │
│  Receives    │
│  Email       │
└─────────────┘
```

---

## 7. Data Flow Diagrams

### 7.1 Quote Generation Data Flow

```
User Input
  │
  ├─► product_url / product_description
  ├─► shipping_address
  └─► (optional) weight, dimensions, price
       │
       ▼
BuyingRequest
  │
  ├─► approximate_quote_data (if weight/dims/price provided)
  │   └─► Returns approximate quotes immediately
  │
  └─► Agent clicks "Generate Quotes"
       │
       ▼
QuoteGenerator
  │
  ├─► Get product_cost (from approximate_quote_data or default)
  ├─► Get buying_fee_percent (from BuyingServiceSettings)
  ├─► Calculate buying_fee = product_cost × (fee_percent / 100)
  │
  └─► PricingCalculator.get_all_quotes()
       │
       ├─► Get warehouse_address (by country + category)
       ├─► Find ShippingRoutes (origin → destination)
       ├─► For each route + transport_mode:
       │   ├─► Get ShippingCalculationSettings
       │   ├─► Calculate shipping_cost
       │   └─► Apply surcharges
       │
       └─► Return shipping quotes
            │
            ▼
      BuyAndShipQuote (for each transport mode)
        │
        ├─► product_cost
        ├─► sales_tax
        ├─► buying_service_fee
        ├─► shipping_cost
        └─► total_cost = sum of above
```

### 7.2 Payment to Shipment Creation Flow

```
Stripe Webhook
  │
  ├─► checkout.session.completed
  │
  ▼
Payment Record
  │
  ├─► payment_type: 'buy_and_ship_quote'
  │   └─► Get BuyAndShipQuote from metadata
  │       └─► Create LogisticsShipment
  │           ├─► source_type = 'buy_and_ship'
  │           ├─► Link to BuyAndShipQuote
  │           ├─► Link to BuyingRequest
  │           └─► Create TrackingUpdate
  │
  ├─► payment_type: 'vehicle_shipping'
  │   └─► Get Vehicle from metadata
  │       └─► Create LogisticsShipment
  │           ├─► source_type = 'vehicle'
  │           ├─► Link to Vehicle
  │           └─► Create TrackingUpdate
  │
  └─► payment_type: 'shipping'
      └─► Get LogisticsShipment from metadata
          ├─► Update status = 'payment_received'
          ├─► **CREATE PACKAGE** (if not vehicle)
          ├─► Generate EasyShip label (if local or pickup)
          └─► Create TrackingUpdate
```

### 7.3 Package Receiving Flow

```
Warehouse Worker (Django Admin)
  │
  ├─► Navigate to Package Admin
  │   /admin/logistics/package/receive-package/
  │
  ├─► Enters reference_number
  │   (BS-YYYYMMDD-XXXXXX or PKG-YYYYMMDD-XXXXXX)
  │
  ▼
System Finds
  │
  ├─► BuyingRequest (if BS- prefix)
  │   └─► Package already exists (created on payment)
  │       ├─► Update Package with actual weight/dimensions
  │       ├─► Upload photos (photo_1 to photo_5)
  │       ├─► Set storage_location
  │       ├─► Package.status = 'received'
  │       ├─► **Automatically updates LogisticsShipment.status = 'processing'**
  │       └─► Update BuyingRequest.status = 'received_at_warehouse'
  │
  └─► Package (if PKG- prefix)
      └─► Update existing Package
          ├─► Upload photos, set storage location
          └─► **Automatically updates LogisticsShipment.status**
  │
  ▼
Package Updated
  │
  ├─► status = 'received'
  ├─► photo_1 to photo_5 uploaded
  ├─► storage_location set
  ├─► received_date = now
  └─► **LogisticsShipment.status automatically updated**
```

### 7.4 Tracking Update Creation Flow

```
Status Change Event
  │
  ├─► LogisticsShipment.save()
  │   └─► post_save signal
  │       └─► Create TrackingUpdate
  │           ├─► status = new_status
  │           ├─► location = from address or 'System'
  │           ├─► timestamp = now
  │           ├─► source = 'system' or 'manual'
  │           └─► raw_data = {'old_status': old, 'new_status': new}
  │
  ├─► Package.save() (status change)
  │   └─► Package.save() method
  │       ├─► Updates LogisticsShipment.status automatically
  │       └─► Creates TrackingUpdate
  │           ├─► status = mapped shipment status
  │           ├─► location = destination city
  │           ├─► timestamp = now
  │           ├─► source = 'system'
  │           └─► raw_data = {'package_reference': ..., 'package_status': ...}
  │
  ├─► Payment completed
  │   └─► Manual TrackingUpdate creation
  │       └─► status = 'payment_received'
  │
  ├─► Pickup completed
  │   └─► Manual TrackingUpdate creation
  │       └─► status = 'picked_up'
  │
  └─► Warehouse receives
      └─► Package.save() creates TrackingUpdate
          └─► status = 'processing' (via Package → LogisticsShipment update)
  │
  ▼
TrackingUpdate Record
  │
  └─► Stored in database
      └─► Visible in admin and API
          └─► Shown in tracking page
```

---

## 8. Key Integration Points

### 8.1 EasyShip Integration Points

1. **Get Rates**:

   - Called from `PricingCalculator.get_all_quotes()`
   - Used for local shipping (same country)
   - Used for international parcel legs (user → warehouse)

2. **Create Shipment**:

   - Called from `generate_shipment_label` endpoint
   - Called from payment webhook (if local or pickup)
   - Uses `package_reference_number` as `contact_name`

3. **Webhook**:
   - Receives tracking updates from EasyShip
   - Creates `TrackingUpdate` records
   - Updates `LogisticsShipment.status`

### 8.2 Stripe Integration Points

1. **Create Checkout**:

   - Called from payment endpoints
   - Creates Stripe checkout session
   - Stores session ID in `Payment` record

2. **Webhook**:
   - Receives payment completion events
   - Updates `Payment.status`
   - Triggers workflow-specific actions

### 8.3 Email Integration Points

1. **Status Changes**:

   - `BuyingRequestAdmin.save_model()` - Sends emails on status changes
   - `PackageAdmin.save_model()` - Sends email on delivery

2. **Payment Events**:

   - Payment webhook - Sends receipt emails

3. **Vehicle Events**:
   - Inspection completion - Sends inspection report email
   - Condition report signing - Sends confirmation email

---

## 9. Reference Number Usage

### 9.1 BuyingRequest Reference Number

**Format**: `BS-YYYYMMDD-XXXXXX`

**Generated When**: Status changes to `purchased`

**Used For**:

- Warehouse identification
- Package receiving
- Linking BuyingRequest to Package

**Where Used**:

- EasyShip contact_name (if package exists)
- Warehouse receiving lookup
- Admin search

### 9.2 Package Reference Number

**Format**: `PKG-YYYYMMDD-XXXXXX`

**Generated When**: Package is created

**Used For**:

- EasyShip contact_name (primary use)
- Warehouse identification
- Package tracking

**Where Used**:

- EasyShip shipment creation (as contact_name)
- Warehouse receiving lookup
- Admin search
- API endpoints

---

## 10. Status Transition Rules

### 10.1 BuyingRequest Status Rules

- `pending` → `quoted`: Agent generates quotes
- `quoted` → `quote_approved`: User approves quote
- `quote_approved` → `payment_received`: Payment completed
- `payment_received` → `purchased`: Agent marks as purchased (generates reference_number)
- `purchased` → `received_at_warehouse`: Warehouse receives package
- `received_at_warehouse` → `shipped`: Package shipped to user
- `shipped` → `in_transit`: Package in transit
- `in_transit` → `delivered`: Package delivered
- `delivered` → `completed`: Final status

### 10.2 LogisticsShipment Status Rules

- `quote_requested` → `quote_approved`: User proceeds with quote
- `quote_approved` → `payment_received`: Payment completed
- `payment_received` → `processing`: Payment processed, label generated
- `processing` → `dispatched`: Package dispatched
- `dispatched` → `in_transit`: Package in transit
- `in_transit` → `customs_clearance`: In customs
- `customs_clearance` → `out_for_delivery`: Out for delivery
- `out_for_delivery` → `delivered`: Delivered

**Note**: Each status change automatically creates `TrackingUpdate` record.

### 10.3 Vehicle Status Rules

- `pending_documents` → `documents_signed`: User signs documents
- `documents_signed` → `payment_pending`: Payment session created
- `payment_pending` → `payment_received`: Payment completed
- `payment_received` → `pickup_scheduled`: System updates
- `pickup_scheduled` → `inspection_pending`: Pickup driver arrives
- `inspection_pending` → `inspection_completed`: Inspection submitted
- `inspection_completed` → `condition_report_pending`: System generates report
- `condition_report_pending` → `condition_report_signed`: User signs report
- `condition_report_signed` → `in_transit_to_warehouse`: Vehicle transported
- `in_transit_to_warehouse` → `received_at_warehouse`: Warehouse receives
- `received_at_warehouse` → `in_transit`: Vehicle shipped to destination
- `in_transit` → `customs_clearance`: In customs
- `customs_clearance` → `out_for_delivery`: Out for delivery
- `out_for_delivery` → `delivered`: Delivered

---

## 11. Data Validation & Constraints

### 11.1 Unique Constraints

- `BuyingRequest.reference_number` - Unique
- `Package.reference_number` - Unique
- `User.email` - Unique
- `User.warehouse_id` - Unique
- `Payment.payment_id` - Unique
- `LogisticsShipment.shipment_number` - Unique
- `ShippingRoute` - Unique together: (origin_country, destination_country, transport_mode)
- `ShippingCalculationSettings` - Unique together: (route, transport_mode)
- `PickupCalculationSettings` - Unique together: (country, state, shipping_category)

### 11.2 Required Fields

**BuyingRequest**:

- `user`, `product_description`, `shipping_address`

**BuyAndShipQuote**:

- `buying_request`, `product_cost`, `buying_service_fee`, `shipping_cost`, `total_cost`

**LogisticsShipment**:

- `user`, `source_type`, `actual_weight`, `chargeable_weight`, `origin_address`, `destination_address`, `shipping_cost`, `total_cost`

**Vehicle**:

- `user`, `make`, `model`, `year`, `vehicle_type`, `shipping_method`, `condition`, `length`, `width`, `height`, `weight`, `origin_address`, `destination_address`, `quote_amount`, `total_amount`

**Package**:

- `user`, `reference_number` (auto-generated)

---

## 12. API Request/Response Examples

### 12.1 Create Buying Request

**Request**:

```json
POST /api/v1/buying/requests/
{
  "product_url": "https://example.com/product",
  "product_name": "Product Name",
  "product_description": "Product description",
  "shipping_address": {
    "full_name": "John Doe",
    "street_address": "123 Main St",
    "city": "Seattle",
    "state_province": "Washington",
    "postal_code": "98133",
    "country": "US",
    "phone": "+1234567890"
  },
  "weight": 5,
  "dimensions": {"length": 30, "width": 20, "height": 15},
  "price": 100,
  "item_type": "small_parcel"
}
```

**Response**:

```json
{
  "id": 1,
  "status": "pending",
  "approximate_quotes": [
    {
      "transport_mode": "AIR",
      "transport_mode_name": "Air Freight",
      "total": 150.0,
      "transit_days": [5, 10],
      "shipping_cost": 50.0
    }
  ]
}
```

### 12.2 Approve Quote

**Request**:

```json
POST /api/v1/buying/quotes/1/approve/
```

**Response**:

```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_...",
  "payment_id": "uuid-..."
}
```

### 12.3 Calculate Shipping

**Request**:

```json
POST /api/v1/logistics/calculate-shipping/
{
  "origin_country": "US",
  "destination_country": "CA",
  "weight": 10,
  "dimensions": {"length": 40, "width": 30, "height": 20},
  "declared_value": 200,
  "shipping_category": "small_parcel",
  "origin_address": {...},
  "destination_address": {...}
}
```

**Response**:

```json
{
  "quotes": [
    {
      "transport_mode": "AIR",
      "transport_mode_name": "Air Freight",
      "total": 85.5,
      "shipping_cost": 85.5,
      "pickup_cost": 0,
      "transit_days": [5, 10],
      "carrier": "Multiple"
    }
  ],
  "shipping_category": "small_parcel",
  "quote_request_id": 1,
  "pickup_required": false
}
```

---

**End of Workflow Diagrams & Connections**

For detailed implementation, refer to:

- `COMPREHENSIVE_CODEBASE_DOCUMENTATION.md` - Full system documentation
- `DETAILED_ADMIN_OPERATIONS_GUIDE.md` - Step-by-step admin guide
