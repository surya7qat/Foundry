# Walkthrough - Purchase Return & Rejection Layout & GST Fixes

Addressed sidebar layout displacement bugs and fixed a mapping issue causing missing GST percentages in the Purchase Rejection transaction form.

## 1. Sidebar Compression Fix (Layout Layer)
- Modified [DashboardLayout.css](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/layout/DashboardLayout.css):
  - Added `flex-shrink: 0;` and `min-width: 290px;` to `.sidebar` to prevent the flex engine from shrinking the sidebar to 0 width when wide transaction tables (e.g. 9-column tables) are loaded on the right.
  - Added `min-width: 0;` to `.main-wrapper` to ensure the content wrapper calculates and caps its width space correctly within the flex row layout.

## 2. Rejection Form GST Percentage Mapping Fix
- Updated [PurchaseRejectionTab.tsx](file:///c:/Users/ADMIN/Desktop/anti_gravity/anti/frontend/src/components/purchases/PurchaseRejectionTab.tsx):
  - Added `gst?: number;` to the `RejectionItem` interface definition.
  - Map `gst: item.gst` inside the `handleInwardChange` promise block to bind the returned GST percentage to form items list state. This displays the correct number (e.g., `18%` instead of `%` in the table column).
