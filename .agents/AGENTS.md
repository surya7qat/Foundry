# Workspace Rules & Conventions: Foundry Web Application

This repository contains a multi-tenant Foundry procurement web application with a Django backend and a React (TypeScript) frontend.

## GENERAL RULE: DUAL-VIEWPORT SYNCHRONIZATION
When updating, adding, or saving any layout, screen, list, data model, search input, status indicator, or action flow, developers **must** implement, synchronize, and save changes for BOTH the desktop Web viewport and the Mobile viewport. Never update one layout without immediately adapting and updating the other.

---

## 1. Project Overview & Architecture
- **Web Backend & Database**: Django REST Framework (DRF) running on `http://127.0.0.1:8000`. It utilizes custom tenant middleware (`core/middleware.py`) and a custom router to route requests to tenant-isolated MySQL databases dynamically based on client authentication mapping.
- **Web & Mobile Frontend**: React (TypeScript) + Vite running in `anti/frontend/`.
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
- **Web (Desktop Table) Format**: Combine Address Line 1, Line 2, Area, and Pincode into a single "Address" column. Render columns in this exact order: Supplier ID, Supplier Name, Supplier Code, GST NO, Address, PAN.
- **Mobile (Card List) Format**: Stack data fields vertically inside a card. The layout order of fields inside the card must match the desktop column/form order: Supplier ID, Supplier Name, Supplier Code, GST NO, Address (combined), PAN.

## 3. Raw Material Master Layout (mockup-aligned)
- **Model Fields**:
  - `departments` (List of static strings, JSONField)
  - `name` (Required, max length 100)
  - `code` (Unique, required, max length 15)
  - `unit` (Required, max length 30)
  - `category` (Required, `PRODUCTION` or `RAW_MATERIAL`)
- **Web (Desktop Table) Format**: Render columns in this exact order: Departments (comma-separated), Raw Material Name, Raw Material Code, Type (Unit), Category.
- **Mobile (Card List) Format**: Stack fields vertically in a card in this order: Departments, Name, Code, Unit, Category.
- **Static Departments**:
  - `Pattern`, `Core`, `Moulding`, `Melting`, `Pouring`, `Short Blast`, `Bed Grinding`, `Despatch - Fettling`, `Despatch - Hand Grinding`, `Despatch - Painting`.
- **Static Units/Types**:
  - `Nos`, `Kg`, `g`, `Pair`, `Set`, `Box`, `Bag`, `Can`, `Litre`, `Millilitre`, `Meter`, `Centimeter`, `Inch`, `Packet`, `Roll`, `Bottle`, `Foot`, `Square Feet`, `Square Meter`, `Cubic Meter`, `Ton`, `Sheet`, `Piece`.

## 4. Mobile & Desktop Responsive Design Guidelines
- **Responsive Table Rule**: Do NOT use CSS-based transformations (`display: block !important`) to convert HTML table tags (`<table>`, `<tr>`, `<td>`) into vertical cards. Browser layout engines fail to compute the width of text nodes under these hacks.
- **Web (Desktop-Only View)**: Wrap all desktop tables inside `<div className="desktop-only-view">`.
- **Mobile (Mobile-Only View)**: Wrap all mobile card lists inside `<div className="mobile-only-view mobile-card-list">`.
- **Breakpoint Styling**: Viewports toggle styling dynamically at a `768px` breakpoint defined at the bottom of [MasterStyles.css](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/master/MasterStyles.css).

## 5. Clean Database Clean/Reset Sequence
(This database cleaning sequence operates centralized backend schemas, supporting both Web and Mobile client databases).
1. Delete migration files (except `__init__.py`) in `inventory/migrations/` and `purchases/migrations/`.
2. Generate migrations: `python manage.py makemigrations`.
3. Reset MySQL databases: `python reset_db.py`.
4. Migrate central DB: `python manage.py migrate`.
5. Migrate tenant DB: `python manage.py migrate --database=surya_castings`.
6. Seed primary client and user login: `python create_surya_user.py` (Creates user `surya` / `Surya@123` linked to tenant database `surya_castings`).
7. Seed exactly 50 dummy master records: `python seed_50.py` to fill the seeded tables in `surya_castings`.

## 6. Form Field and Table Display Alignment Conventions
- **Form/Layout Synchronization**: The display order of data columns in Web desktop tables and the fields in Mobile details cards MUST match the exact order of elements in the corresponding data entry forms:
  - **Supplier Master**: Supplier ID, Supplier Name, Supplier Code, GST NO, Address (combines lines/area/pin), PAN.
  - **Raw Material Master**: Departments, Name, Code, Type (Unit), Category.

## 7. Status Indicator Styling Conventions
- **Avoid Bulky Text Badges**: Do NOT use bulky `ACTIVE` / `INACTIVE` text badges inside compact table column cells on desktop web views, as they can wrap or overflow underneath adjacent columns.
- **Web (Desktop) Format**: Display status indicators as a **sleek glowing LED indicator dot** directly to the left of the record Name:
  - Green (`#22c55e`) with a subtle shadow glow for Active.
  - Red (`#ef4444`) with a subtle shadow glow for Inactive.
- **Mobile (Mobile Card) Format**: Replicate the exact glowing LED indicator dot to the left of the username/record name on mobile card headers for clean visual consistency.

## 8. Pattern Master Flow & Sub-Masters
- **Pattern Master (Pink)**:
  - **Web (Desktop) Format**: Wide table displaying Customer, Pattern ID, Top Plate, Bottom Plate, Products (with cavities), Core Boxes, and pattern type choices (Co2, Black, Same).
  - **Mobile (Card) Format**: Card layout rendering header details, image/photos download links, and cavity/corebox chips.
- **Sub-Masters (Purple)**:
  - **Customer Master**: Customer ID, Name, Code, GST, Address, PAN (identical schema structure to Supplier Master).
  - **Pattern Material Master**: Material ID, Name (holds material types such as Aluminum, Wood, Cast Iron mapping to plate assemblies and tooling products).
  - **Product Master**: Product ID, Product Name.
  - **Core Box Master**: Name, Top Box (from Material Master), Bottom Box (from Material Master), Products (with cavities), type choices (Co2, Oil, Amine), max 3 JPG photos, and description.

## 9. Search Bar Behavior & API Integration
- **Web (Desktop) Format**: Search bar layout at the top-right of desktop table viewports containing Search and Clear buttons.
- **Mobile (Mobile Card) Format**: Search bar spans 100% width above mobile cards.
- **Persistence**: Saved in `sessionStorage` (e.g. `[table_name]_search_query`) so that it persists across component/tab switching and browser reloads.
- **API Integration**: The frontend should dynamically query the API by passing a `search` query parameter when the user initiates search or clear actions. The backend's `get_queryset` method must process the `search` query parameter:
  - Trim the query string.
  - Perform case-insensitive containment searches (`__icontains`) using `Q` objects across all text fields of the model.
  - If the search term is exactly "active" or "inactive", it should filter specifically on the `is_active` boolean field.

## 10. Purchase Flow Search & Mobile Compatibility Conventions
- **Search Scope**: All columns in transactional listings (Inward Date, Bill Date, Total Value, Status, Remarks) must be searchable via the single search bar query parameter:
  - Dates should use `__icontains` containment matches.
  - Totals must be annotated dynamically using database expressions (`Sum`, `F`, `Coalesce`) and filterable via float ranges.
  - Status fields must support case-insensitive containment mapping matching terms like `draft` or `completed`.
- **Mobile Styling Compatibility**: Mobile CSS forms must normalize WebKit browser styles (e.g., `-webkit-appearance: none`) and utilize flexible grid configurations (`min-width: 0`, responsive columns) to guarantee datepickers and inputs scale cleanly without horizontal overflows on iPhone 16 Pro Max Chrome/Safari viewports.

## 11. Table Scroll Navigation Arrow Convention
- **Web (Desktop) Layout**:
  - Always implement floating left and right scroll chevron buttons positioned at the vertical level of the table's header row (`top: '12px'`) on the left and right sides of the table wrapper (`left: '-26px'`, `right: '-26px'`).
  - Chevron buttons must use a molten orange gradient background (`linear-gradient(135deg, #ff6b35, #ff9f43)`), white text color (`#ffffff`), rounded shape, shadow glow (`0 4px 15px rgba(255, 107, 53, 0.4)`), scale/shadow animations on hover, and Lucide `ChevronLeft`/`ChevronRight` icons (size 20, strokeWidth 3).
  - HTML Wrapper Format: Wrap components in an outer `.data-table-wrapper` relative container, with sibling left/right `<button>` elements, an inner container carrying `className="data-table-container"` and `ref={tableContainerRef}` containing `<table>`, and sibling pagination controls at the bottom inside `.pagination-controls`.
  - Set `flex-shrink: 0` and `min-width` on critical flex layouts (e.g. `.sidebar`) to guarantee desktop menus are completely rigid and do not warp or overlap when wide tables are rendering on sibling content containers.
- **Mobile (Mobile Card) Layout**:
  - Chevron buttons are disabled on mobile card views since card list components natively stack vertically and scroll vertically. Responsive layouts should not render absolute-positioned scroll buttons on mobile viewports.

## 12. User Access UI & Seeding Conventions
- **Web & Mobile (Clean Typography)**: Tabs, buttons, and sub-headings inside the User Access controls view must NOT use the stylized `'Orbitron'` font. They must strictly match standard master fonts (e.g. `Inter` or `sans-serif`) to maintain visual cleanliness and readabilities.
- **Web (Header Layout)**: Actions such as `+ New Role` or `+ New User` buttons must be aligned to the top-right of the main master page header (conditionally displayed based on active tab and state).
- **Mobile (Header Layout)**: Buttons wrap or scale cleanly on mobile viewports to prevent overflow.
- **LED Status Indicators**: Status display on User details must use a sleek glowing LED indicator dot to the left of the username on both Web tables and Mobile cards.
- **Scroll Chevrons & Pagination**: Both Role and User lists must utilize the standard `.data-table-wrapper` pattern, including left/right scroll chevrons (on desktop Web) and `.pagination-controls` at the bottom of the listing (on both Web and Mobile).
- **User and Role Seeding (`seed_5.py`)**: Seeding processes via `seed_5.py` must populate exactly 5 users (usernames `surya1` to `surya5` with password `Surya@123`) mapping to corresponding roles inside the central database, in addition to seeding 5 dummy records for tenant-level tables.

## 13. Record Audit Log Popup Convention
- **Audit Fields**: Every tenant-level data model must support:
  - `created_at` (DateTimeField set on creation)
  - `created_by` (CharField capturing username)
  - `updated_at` (DateTimeField updated on every change via `auto_now=True`)
  - `updated_by` (CharField capturing username of last editor)
- **Visibility Constraint**: The Audit Log data and control button must **ONLY** be visible or accessible to user accounts where `sessionStorage.getItem('is_superuser') === 'true'` (applies to both Web and Mobile).
- **History Button Trigger**: Do not render logs directly inside table listings as columns or cards as plain text. Instead, render a custom styled History button (`<History size={16} />`) next to the Edit button:
  - **Web (Desktop) Format**: Place the history icon button directly inside the list table row actions cell.
  - **Mobile (Mobile Card) Format**: Place the history icon button directly inside the card actions footer cell next to the Edit/Details button.
- **Glassmorphic Popup Modal**: Clicking the History button must set the active item audit log state to open a clean fixed screen overlay modal:
  - Background overlay: `rgba(0,0,0,0.6)` with backdrop blur `4px`.
  - Panel style: Rich glassmorphic card with a molten yellow border (`1px solid rgba(255,107,53,0.3)`) and shadow projections.
  - Displays creation and last modification records (username and formatted local datetime) in structured, clean containers.
  - Includes a prominent secondary close button to clear the state and close the popup overlay.

---

## 14. Inventory Stock & Correction Log Layouts
- **Material Stock Master**:
  - **Model Fields**: `raw_material` (ForeignKey), `batch_no` (CharField), `expiry_date` (DateField), `quantity` (FloatField).
  - **Web (Desktop Table) Format**: Render columns in this exact order: Raw Material Name/Code, Material Type, Batch No, Expiry Date, Quantity, Actions (Edit/Correct Stock).
  - **Mobile (Card List) Format**: Stack fields vertically in a card in this order: Raw Material Name/Code, Material Type, Batch No, Expiry Date, Current Quantity, Actions (Correct Stock).
  - **Grouping Rule**: Group stocks dynamically by Raw Material, Batch, and Expiry Date. Normalizes blank/empty batches to `""` and empty expiry dates to `None` to ensure duplicate entries are grouped together as a single record.
- **Material Stock Correction Log**:
  - **Web (Desktop Table) Format**: Date & Time, Material / Batch, Original Qty, Corrected Qty, Reason, Corrected By.
  - **Mobile (Card List) Format**: Material Name, Date & Time, Batch No, Original Qty, Corrected Qty, Reason, Corrected By.
- **Product Stock Master**:
  - **Model Fields**: `customer` (ForeignKey), `product` (ForeignKey), `batch_no` (CharField), `quantity` (FloatField).
  - **Web (Desktop Table) Format**: Customer Name / Code, Product Name / ID, Batch No, Quantity, Actions (Edit/Correct Stock).
  - **Mobile (Card List) Format**: Product Name, Batch No, Customer Name/Code, Product ID, Current Quantity, Actions (Correct Stock).
- **Product Stock Correction Log**:
  - **Web (Desktop Table) Format**: Date & Time, Product / Batch, Customer Name / Code, Original Qty, Corrected Qty, Reason, Corrected By.
  - **Mobile (Card List) Format**: Product Name, Date & Time, Customer Name/Code, Batch No, Original Qty, Corrected Qty, Reason, Corrected By.
- **Scroll Chevrons & Pagination**: Both stock and log modules must follow the molten orange table scroll chevrons convention (desktop Web) and pagination controls (both Web and Mobile).
