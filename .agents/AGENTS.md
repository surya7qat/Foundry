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

## 5. Clean Database Clean/Reset Sequence
If transactional database cleanup is needed:
1. Delete migration files (except `__init__.py`) in `inventory/migrations/` and `purchases/migrations/`.
2. Generate migrations: `python manage.py makemigrations`.
3. Reset MySQL databases: `python reset_db.py`.
4. Migrate central DB: `python manage.py migrate`.
5. Migrate tenant DB: `python manage.py migrate --database=surya_castings`.
6. Seed primary client and user login: `python create_surya_user.py` (Creates user `surya` / `Surya@123` linked to tenant database `surya_castings`).
7. Seed exactly 50 dummy master records: `python seed_50.py` to fill the seeded tables in `surya_castings`.

## 6. Form Field and Table Display Alignment Conventions
- The display order of data columns in the desktop tables and the fields in the mobile details cards MUST match the exact order of elements in the corresponding data entry forms:
  - **Supplier Master**: Supplier ID, Supplier Name, Supplier Code, GST NO, Address (combines lines/area/pin), PAN.
  - **Raw Material Master**: Departments, Name, Code, Type (Unit), Category.

## 7. Status Indicator Styling Conventions
- Do NOT use bulky `ACTIVE` / `INACTIVE` text badges inside compact table column cells on desktop web views, as they can wrap or overflow underneath adjacent columns.
- Always display status indicators as a **sleek glowing LED indicator dot** directly to the left of the record Name:
  - Green (`#22c55e`) with a subtle shadow glow for Active.
  - Red (`#ef4444`) with a subtle shadow glow for Inactive.
- Replicate this indicator style on mobile card headers next to the name for clean visual consistency.

## 8. Pattern Master Flow & Sub-Masters
- **Main Master (Pink)**:
  - **Pattern Master**: Linked to Customer, Top Plate, Bottom Plate, Products (with cavities), Core Boxes, and pattern type choices (Co2, Black, Same).
- **Extra Sub-Masters (Purple)**:
  - **Customer Master**: Customer ID, Name, Code, GST, Address, PAN (identical schema structure to Supplier Master).
  - **Pattern Material Master**: Material ID, Name (holds material types such as Aluminum, Wood, Cast Iron mapping to plate assemblies and tooling products).
  - **Product Master**: Product ID, Product Name.
  - **Core Box Master**: Name, Top Box (from Material Master), Bottom Box (from Material Master), Products (with cavities), type choices (Co2, Oil, Amine), max 3 JPG photos, and description.
- **Pre-existing Verification Rule**: If a master model or flow already exists in the workspace (e.g., Supplier Master, Raw Material Master), do NOT duplicate or recreate it. Always verify the workspace before adding new elements.

## 9. Search Bar Behavior & API Integration
- For all master and transactional tables, a search input with a "Search" and "Clear" button must be implemented.
- The search state must be saved in `sessionStorage` (e.g. `[table_name]_search_query`) so that it persists across component/tab switching and browser reloads.
- The frontend should dynamically query the API by passing a `search` query parameter when the user initiates search or clear actions.
- The backend's `get_queryset` method must process the `search` query parameter:
  - Trim the query string.
  - Perform case-insensitive containment searches (`__icontains`) using `Q` objects across all text fields of the model.
  - If the search term is exactly "active" or "inactive", it should filter specifically on the `is_active` boolean field.

## 10. Purchase Flow Search & Mobile Compatibility Conventions
- All columns in transactional listings (Inward Date, Bill Date, Total Value, Status, Remarks) must be searchable via the single search bar query parameter:
  - Dates should use `__icontains` containment matches.
  - Totals must be annotated dynamically using database expressions (`Sum`, `F`, `Coalesce`) and filterable via float ranges.
  - Status fields must support case-insensitive containment mapping matching terms like `draft` or `completed`.
- Mobile CSS forms must normalize WebKit browser styles (e.g., `-webkit-appearance: none`) and utilize flexible grid configurations (`min-width: 0`, responsive columns) to guarantee datepickers and inputs scale cleanly without horizontal overflows on iPhone 16 Pro Max Chrome/Safari viewports.

## 11. Table Scroll Navigation Arrow Convention
- For all wide desktop tables that utilize horizontal scrolling (e.g., Master lists, Inward/Rejection/Return list and creation tables), always implement floating left and right scroll chevron buttons positioned at the vertical level of the table's header row (`top: '12px'`) on the left and right sides of the table wrapper (`left: '-26px'`, `right: '-26px'`).
- Set `flex-shrink: 0` and `min-width` on critical flex layouts (e.g. `.sidebar`) to guarantee desktop menus are completely rigid and do not warp or overlap when wide tables are rendering on sibling content containers.


