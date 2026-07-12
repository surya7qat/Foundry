# Workspace Rules & Conventions: Foundry Web Application

This repository contains a multi-tenant Foundry procurement web application with a Django backend and a React (TypeScript) frontend.

## 1. Project Overview & Architecture
- **Backend**: Django REST Framework (DRF) running on `http://127.0.0.1:8000`. It utilizes custom tenant middleware (`core/middleware.py`) and a custom router to route requests to tenant-isolated MySQL databases dynamically based on client authentication mapping.
- **Frontend**: React (TypeScript) + Vite running in `anti/frontend/`.
- **Database System**: MySQL.
  - Central DB: `castings` (contains users and clients mapping).
  - Tenant DB: `surya_castings` (contains supplier records, raw material records, purchase orders).
  - Connection credentials are saved in `anti/backend/.env`.

## 2. Supplier Master Layout (mockup-aligned)
- **Model Fields**:
  - `supplier_id` (Unique, required, max length 15)
  - `name` (Unique, required, max length 100)
  - `code` (Unique, required, max length 15)
  - `gst_number` (Unique, optional, exactly 15 chars)
  - `address_line1` (Optional, max length 100)
  - `address_line2` (Optional, max length 100)
  - `area` (Optional, max length 50)
  - `pincode` (Optional, max length 10)
  - `pan` (Unique, optional, exactly 10 chars)
- **Table Display**: Combine Address Line 1, Line 2, Area, and Pincode into a single "Address" column.

## 3. Raw Material Master Layout (mockup-aligned)
- **Model Fields**:
  - `departments` (List of static strings, JSONField)
  - `name` (Required, max length 100)
  - `code` (Unique, required, max length 15)
  - `unit` (Required, max length 30)
  - `category` (Required, `PRODUCTION` or `RAW_MATERIAL`)
- **Static Departments**:
  - `Pattern`, `Core`, `Moulding`, `Melting`, `Pouring`, `Short Blast`, `Bed Grinding`, `Despatch - Fettling`, `Despatch - Hand Grinding`, `Despatch - Painting`.
- **Static Units/Types**:
  - `Nos`, `Kg`, `g`, `Pair`, `Set`, `Box`, `Bag`, `Can`, `Litre`, `Millilitre`, `Meter`, `Centimeter`, `Inch`, `Packet`, `Roll`, `Bottle`, `Foot`, `Square Feet`, `Square Meter`, `Cubic Meter`, `Ton`, `Sheet`, `Piece`.

## 4. Mobile & Desktop Responsive Design Guidelines
- Do NOT use CSS-based transformations (`display: block !important`) to convert HTML table tags (`<table>`, `<tr>`, `<td>`) into vertical cards. Browser layout engines fail to compute the width of text nodes under these hacks.
- Always implement a **split viewport conditional layout** on the frontend:
  - Wrap desktop tables inside `<div className="desktop-only-view">`.
  - Wrap mobile card stacks inside `<div className="mobile-only-view mobile-card-list">`.
  - The styles toggling these displays at a `768px` breakpoint are declared at the bottom of [MasterStyles.css](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/master/MasterStyles.css).


## 5. Form Field and Table Display Alignment Conventions
- The display order of data columns in the desktop tables and the fields in the mobile details cards MUST match the exact order of elements in the corresponding data entry forms:
  - **Supplier Master**: Supplier ID, Supplier Name, Supplier Code, GST NO, Address (combines lines/area/pin), PAN.
  - **Raw Material Master**: Departments, Name, Code, Type (Unit), Category.

## 6. Status Indicator Styling Conventions
- Do NOT use bulky `ACTIVE` / `INACTIVE` text badges inside compact table column cells on desktop web views, as they can wrap or overflow underneath adjacent columns.
- Always display status indicators as a **sleek glowing LED indicator dot** directly to the left of the record Name:
  - Green (`#22c55e`) with a subtle shadow glow for Active.
  - Red (`#ef4444`) with a subtle shadow glow for Inactive.
- Replicate this indicator style on mobile card headers next to the name for clean visual consistency.

## 7. Pattern Master Flow & Sub-Masters
- **Main Master (Pink)**:
  - **Pattern Master**: Linked to Customer, Top Plate, Bottom Plate, Products (with cavities), Core Boxes, and pattern type choices (Co2, Black, Same).
- **Extra Sub-Masters (Purple)**:
  - **Customer Master**: Customer ID, Name, Code, GST, Address, PAN (identical schema structure to Supplier Master).
  - **Pattern Material Master**: Material ID, Name (holds material types such as Aluminum, Wood, Cast Iron mapping to plate assemblies and tooling products).
  - **Product Master**: Product ID, Product Name.
  - **Core Box Master**: Name, Top Box (from Material Master), Bottom Box (from Material Master), Products (with cavities), type choices (Co2, Oil, Amine), max 3 JPG photos, and description.
- **Pre-existing Verification Rule**: If a master model or flow already exists in the workspace (e.g., Supplier Master, Raw Material Master), do NOT duplicate or recreate it. Always verify the workspace before adding new elements.

