# 01d – Đề xuất sửa Report 3 theo quyết định ngày 19/11/2026

- **Áp vào:** Report 3 – SRS (Google Doc của nhóm; bản sao đọc được là `docs/SEP_490_Group82(bản sao).docx`, mục thay đổi cuối 16/11/2026).
- **Người đề xuất:** Ninh. **Căn cứ:** quyết định của Ninh ngày 19/11/2026 (mục 0), code nhánh `chore/xoa-bang-chua-dung`, `specs/mrp`.
- **Cách dùng file này:**
  - Phần chữ đặt trong khung ```` ```text ```` là **nội dung tiếng Anh** để dán vào Report 3, cùng văn phong với tài liệu gốc.
  - Phần tiếng Việt là hướng dẫn: sửa ở đâu, vì sao.
- **Quy ước số hiệu:**
  - Không đánh số lại UC, BR, MSG. Mục bị bỏ thì **giữ số, ghi "Removed"**.
  - Lý do: code, spec và test đang dẫn chiếu theo số cũ (ví dụ `BR-MRP-21` trong chú thích code).
- Chưa sửa Google Doc. Nhóm duyệt xong thì người giữ Report 3 dán vào.

---

## 0. Quyết định đã chốt

| # | Câu hỏi (01_SYSTEM_DISCOVERY) | Quyết định |
|---|---|---|
| D1 | Q2 – Kiểm kê, huỷ hàng có cần Manager duyệt? | **Không.** Hoàn thành phiếu là điều chỉnh / trừ kho ngay (như code) |
| D2 | Q3 – UC-34, UC-42 | **Bỏ khỏi phạm vi** (chức năng không tồn tại; bảng đã xoá ngày 19/11) |
| D3 | Q4 – MRP | **Bổ sung vào Report 3** (mục 3 của file này) |
| D4 | Q5 – `docs/UnitTest.xlsx` | **Không phải mẫu test chính thức.** Ca test viết ở `specs/qa` |

### Các điểm phụ (đã chốt 19/11/2026 theo phương án mặc định, trừ O5)

| # | Điểm | Quyết định |
|---|---|---|
| O1 | Q2 phần sau: phiếu thu đã ghi có được sửa / huỷ không (UC-83 A83.1 nói có, BR-46 nói không) | **Theo code.** Phiếu thu sửa được thời gian, phương thức, ghi chú và huỷ được; phiếu chi NCC không sửa được. Sửa BR-46 (mục 1.6) |
| O2 | BR-43: mỗi dòng chênh lệch kiểm kê phải có lý do. Code chỉ có ghi chú chung cho cả phiếu | **Bỏ lý do từng dòng**, giữ ghi chú của phiếu (mục 1.4) |
| O3 | UC-81 "Track Restock / Repair / Scrap" chỉ có nghĩa khi có UC-42 | **Bỏ cùng UC-42** (mục 2.3) |
| O4 | UC-70 "Track Landed Cost & MAC": bỏ chi phí nhập thì còn theo dõi giá vốn | **Giữ UC, đổi tên** thành "Track Moving Average Cost" (mục 2.4) |
| O5 | Q1 – package test (xUnit, Mvc.Testing, Playwright) | Chưa trả lời; cần trước Phase 3 |

### Đã áp vào file Word

- Toàn bộ mục 1–3 đã được áp vào bản sao `docs/SEP_490_Group82(bản sao).docx` ngày 19/11/2026 bằng script (xem mục 5).
- Chỗ nào bản áp dụng khác nội dung đề xuất ban đầu, mục tương ứng bên dưới đã được sửa theo bản áp dụng.

---

## 1. Sửa theo D1 – kiểm kê, huỷ hàng không cần duyệt

### 1.1 Mục 2.2.2 – bảng UC Descriptions

- **UC-75 Approve Stocktake Adjustment** và **UC-76 Approve Inventory Disposal**: giữ số, đổi mô tả thành:

```text
Removed (19/11/2026): a stocktake adjusts inventory and a disposal deducts inventory when the Warehouse Accountant completes it; there is no Manager approval step.
```

### 1.2 Mục 2.2.3.27 – UC-72 Manage Inventory

- **Trigger:** `The Manager wants to monitor inventory, transfers, stocktakes or disposals.`
- **Description** thay bằng:

```text
This feature allows the Manager to view inventory across warehouses, monitor transfers, stocktakes and disposals, and view reorder and expiry alerts. Stocktakes and disposals take effect when the Warehouse Accountant completes them; there is no approval step.
```

- **Preconditions:** `Manager is logged in and has the inventory monitoring permission.`
- **Normal flows:** bước 1 là "Manager opens Goods, Transfers, Stocktakes or Disposals.", bước 3 là "(See A72.1 – A72.5)".
- **Alternative Flows:**
  - Bỏ A72.3 (Approve Stocktake Adjustment) và A72.4 (Approve Inventory Disposal).
  - Thêm A72.3 mới:

```text
A72.3: Track Stocktakes and Disposals
1. System displays stocktakes and disposals by status with the warehouse, the adjusted or disposed quantity and value, the person who completed them and the note.
```

  - Đổi số: A72.5 (Reorder Point Alerts) thành A72.4, A72.6 (Expiry Alerts) thành A72.5. UC-78 vẫn trong phạm vi, xem mục 1.7.
- **Exception:** thay E72.1 (Missing decision note), E72.2 (Request no longer pending) bằng `E72.1: Data cannot be retrieved` (giống E79.1).
- **Business Rules:** `BR-40, BR-41, BR-42, BR-43, BR-44, BR-48, BR-49`. Bỏ BR-50 vì UC này không còn bước duyệt.

### 1.3 Mục 5.1 – BR-42

Giữ nguyên. Trong BR-42, "completion approvals" là duyệt hoàn thành **lệnh sản xuất**, không liên quan kiểm kê.

### 1.4 Mục 5.1 – BR-43 (theo O2)

```text
BR-43: Inventory is adjusted to the counted quantity when the stocktake is completed; the variance quantity and value of each line are recorded. A completed stocktake can be cancelled, which reverses the adjustment.
```

### 1.5 Mục 5.1 – BR-44

```text
BR-44: A disposal must have a quantity not exceeding the available quantity and a reason. Inventory is reduced when the disposal is completed; cancelling a completed disposal restores the inventory.
```

### 1.6 Mục 5.1 – BR-46 (theo O1)

Code chỉ có sửa / huỷ cho phiếu thu khách hàng (`PUT`, `…/cancel` ở `/api/customers/{id}/receipts/{code}`). Phiếu chi NCC chỉ có tạo mới.

```text
BR-46: A voucher amount must be greater than 0 and not greater than the outstanding balance. After a customer receipt voucher is recorded, only its time, method and note can be changed; a wrong amount is corrected by cancelling the voucher, which reverses its effect on the debt. A supplier payment voucher cannot be changed after it is recorded.
```

### 1.7 Cảnh báo hạn dùng (UC-78)

Code không thu hạn dùng nên UC-78 hiện **Chưa có code**. Quyết định D1 không nói tới UC-78, nên mục này **không đổi** trong file này. Nếu nhóm cũng bỏ UC-78 thì xoá A72.6, bỏ vế "expiry alert" của BR-48, và ghi UC-78 là Removed.

### 1.8 Mục 5.3 – Assumptions

```text
Approvals: credit and production plan decisions are recorded in StockFlow by the Manager (Chief Accountant). Stocktakes and disposals take effect when the Warehouse Accountant completes them; there is no approval step. When company policy requires, the Manager consults the Director outside the system before recording a decision.
```

### 1.9 Sơ đồ cần vẽ lại

UC Diagram for Manager (2.2.1.5): bỏ UC-75, UC-76.

---

## 2. Sửa theo D2 – bỏ UC-34, UC-42

### 2.1 Mục 2.2.2 – UC Descriptions

- **UC-34 Allocate Inbound Costs**, **UC-42 Categorize Return Items**: giữ số, mô tả thay bằng:

```text
Removed (19/11/2026): out of scope.
```

- **UC-67 Purchasing & Receiving** (mô tả), thay bằng:

```text
Allows the Manager to monitor purchase orders, receipts, defective and returned goods, the Moving Average Cost and supplier payables.
```

### 2.2 Mục 2.2.3.13 – đặc tả UC-34

Xoá cả mục. Các mục 2.2.3.x phía sau giữ nguyên số, hoặc đánh lại số mục (số mục không phải số UC).

### 2.3 UC-81 Track Restock / Repair / Scrap (theo O3)

```text
Removed (19/11/2026): returned items are not categorized (see UC-42).
```

### 2.4 UC-70 (theo O4)

- **Tên:** `Track Moving Average Cost (extends UC-67)`.
- **Mô tả:**

```text
Allows the Manager to view how each completed goods receipt changed the Moving Average Cost of the received products.
```

### 2.5 Mục 2.2.3.26 – UC-67

- **Description:** thay "landed costs" bằng "the Moving Average Cost".
- **A67.3:** đổi tên thành "Track Moving Average Cost"; bỏ chữ "landed cost" trong các bước.
- **Business Rules:** `BR-23, BR-24, BR-25, BR-29` (bỏ BR-28).

### 2.6 Mục 2.2.3.17 – UC-41, mục 2.2.3.28 – UC-79

- **UC-41, Business Rules:** `BR-04, BR-19, BR-21` (bỏ BR-20).
- **UC-79, Description:**

```text
This feature allows the Manager to monitor sales and purchase returns and the resulting debt reduction or refund.
```

- **UC-79:** xoá A79.2. Đổi A79.3 thành A79.2. Business Rules: `BR-19, BR-21`.

### 2.7 Mục 2.2.3.29 – UC-83, A83.6

```text
2. System displays purchase cost and production material cost.
```

### 2.8 Mục 3.1.7 – Non-Screen Functions

Xoá dòng 1 "Landed Cost Allocation Engine". Dòng "MAC Recalculation Service" giữ nguyên.

### 2.9 Mục 3.1.8 – ERD

Xoá 3 entity: `InboundCostAllocation`, `InboundCost`, `ReturnProcessing`. Vẽ lại hình ERD (bản sinh từ schema thật: `database/StockFlow_Full_ERD.puml`).

### 2.10 Mục 5.1 – BR

```text
BR-20: Removed (19/11/2026): returned items are not categorized; completed returns are added back to the inventory of the receiving warehouse (BR-21).
BR-28: Removed (19/11/2026): landed cost allocation is out of scope.
BR-29: Moving Average Cost is recalculated at each completed purchase receipt: New MAC = (On-hand Qty × Current MAC + Added Cost) / (On-hand Qty + Added Qty).
```

### 2.11 Mục 5.2 – MSG

```text
MSG37: Removed (landed cost is out of scope).
MSG38: Removed (landed cost is out of scope).
```

### 2.12 Mục 5.3 – Out of scope (thêm vào cuối câu "Out of scope: …")

```text
…, landed cost allocation, categorization of returned goods (Restock / Repair / Scrap).
```

### 2.13 Sơ đồ cần vẽ lại

- UC Diagram for Warehouse Accountant: bỏ UC-34.
- UC Diagram for Sales Accountant: bỏ UC-42.
- UC Diagram for Manager: bỏ UC-81, đổi tên UC-70.
- Hình ERD.

---

## 3. Bổ sung MRP (D3)

### Nguyên tắc

- Mô tả **đúng hành vi code hiện tại**:
  - API: `/api/production/mrp/*` (8 endpoint).
  - Màn hình: `/production/mrp`.
  - Bảng: `trx_mrp_runs`, `dtl_mrp_run_lines`, `dtl_mrp_run_demands`.
  - Bộ tính: `Domain/Services/MrpPolicy.cs`.
- Luật trong `specs/mrp/review/03_MRP_BUSINESS_RULES.md` mà code chưa làm thì ghi **"Not applied in this version"**, không mô tả như đã có.
- **Số hiệu mới:**
  - UC-100 – UC-105.
  - BR-MRP-01 – BR-MRP-33: giữ 01–29 như `specs/mrp` vì code đang dẫn chiếu; thêm 30–33.
  - MSG75 – MSG81.

### 3.1 Mục I – Record of Changes (thêm 3 dòng)

```text
19/11 | A | NinhHQ | Add Material Requirements Planning (MRP): UC-100 – UC-105, BR-MRP-01 – BR-MRP-33, MSG75 – MSG81, the MRP screen, its screen authorization and the entities MrpRun, MrpRunLine, MrpRunDemand.
19/11 | M | NinhHQ | Add lead time to goods, expected delivery date to purchase orders and the material warehouse to production plans.
19/11 | M | NinhHQ | Remove UC-34, UC-42, UC-75, UC-76, UC-81 and the related rules (BR-20, BR-28), messages (MSG37, MSG38) and entities (InboundCost, InboundCostAllocation, ReturnProcessing); stocktakes and disposals take effect without Manager approval.
```

### 3.2 Mục 2.1 – Actors

- **Manager**: thêm vào sau "approves production plans, creates and runs production orders;":

```text
runs Material Requirements Planning (MRP) and orders the materials in shortage;
```

- **Production Accountant**: thêm vào cuối câu mô tả:

```text
, and runs Material Requirements Planning (MRP) to see which materials are short and when they must be ordered
```

### 3.3 Mục 2.2.2 – UC Descriptions (thêm 6 dòng)

```text
UC-100 | Plan Material Requirements (MRP) | Manager, Production Accountant | Allows the user to calculate the time-phased material requirements of approved production plans and open production orders against the stock of selected material warehouses and the purchase orders with an expected delivery date, and to see which materials are short, when, for which plans and orders, and when they must be ordered.
UC-101 | Run MRP (extends UC-100) | Manager, Production Accountant | Allows the user to calculate MRP for a period from today and selected material warehouses; the result is saved as an MRP run with a code.
UC-102 | View Material Requirements by Period (extends UC-100) | Manager, Production Accountant | Allows the user to view the requirement of each material by day, by ISO week (Monday to Sunday) or by month, with the plans and orders causing each daily requirement.
UC-103 | View Material Shortages (extends UC-100) | Manager, Production Accountant | Allows the user to view the materials in shortage: first shortage date, opening stock, total shortage, affected plans and orders, quantity on order without a delivery date, stock in other warehouses and status (on time, late, no lead time).
UC-104 | View Projected Stock (extends UC-100) | Manager, Production Accountant | Allows the user to view the day-by-day projected stock of a material without new purchases and after the suggested purchases.
UC-105 | Order Materials from MRP Suggestions (extends UC-100) | Manager, Production Accountant | Allows the user to view the purchase suggestions with quantity, required receipt date and order deadline, and to open a purchase order form prefilled with the suggested materials.
```

### 3.4 Mục 2.2.3 – đặc tả UC (thêm mục 2.2.3.35)

```text
2.2.3.35 UC-100 Plan Material Requirements (MRP)

ID and Name: UC-100: Plan Material Requirements (MRP)
Created By: NinhHQ | Date Created: 19/11/2026
Primary Actor: Manager, Production Accountant
Trigger: The planner wants to know which materials will be short, when, for which production plans or orders, and when they must be ordered.

Description:
This feature calculates the material requirements of approved production plans and open production orders day by day for a period, compares them with the usable stock of the selected material warehouses and with the purchase orders that have an expected delivery date, and shows the shortages and the purchase suggestions with the order deadline. Each run is saved as a snapshot. MRP does not reserve stock, does not block material issues and does not create purchase orders by itself.

Preconditions:
The user is logged in, the role has the MRP function and the production permission (read to view, update to run), and the user has access to the selected warehouses. Materials need a lead time for the order deadline to be calculated.

Post-conditions:
Success: An MRP run with a unique code is saved with its material lines and the allocation of each demand, and the result is displayed.
Failed: No run is saved and an error message is displayed.

Normal flows:
1. User opens Production > Material Planning (MRP).
2. System displays the latest run that the user may view. (See A100.6)
3. User clicks Calculate MRP.
4. User selects the period end date, the material warehouses and whether plans Pending Approval are included. (See E100.1, E100.2)
5. System reads the demands, the stock and the scheduled receipts, calculates the requirement of each material day by day, saves the run (MSG75) and displays the Overview tab: period, warehouses, number of materials with demand, in shortage and late, and the finished goods skipped because they have no active BOM.
6. User selects the required view. (See A100.1 – A100.5)

Alternative Flows:
A100.1: View requirements by month / week (UC-102)
1. User opens the Monthly / Weekly tab and selects Month or Week.
2. System displays the quantity of each material in every month or ISO week of the period and the total.
A100.2: View requirements by day (UC-102)
1. User opens the Daily tab.
2. System displays each need date, material, unit, quantity and the plans or orders that cause the requirement.
A100.3: View material shortages (UC-103)
1. User opens the Shortages tab and may show only the late materials.
2. System displays, for each material in shortage, the first shortage date, opening stock, total shortage, affected plans and orders, the quantity on order without a delivery date and the stock in other warehouses the user can access (transfer hint).
A100.4: View projected stock (UC-104)
1. User clicks a material code.
2. System displays, for each date, the gross requirement, scheduled receipt, projected stock without new purchases, suggested receipt, projected stock after the suggestions and the order date.
A100.5: Order materials (UC-105)
1. User opens the Purchase Suggestions tab and may filter by status (On time, Late, No lead time).
2. System displays each suggestion with material, suggested quantity, quantity rounded up for ordering, required receipt date, order deadline, supplier of the latest purchase order and status.
3. User clicks Create Purchase Order.
4. System opens the purchase order form for the current working warehouse with one line per material (total suggested quantity, rounded up) and a note with the run code; the user selects the supplier, reviews and saves the order (UC-30).
A100.6: Open a previous run / out-of-date result
1. User selects a previous run in the run list.
2. System displays the saved result. If input data changed after the run, the system shows the reasons (MSG78); the user may run MRP again.

Exception:
E100.1: Invalid period
1. Cause: The period end date is before today or more than 366 days after today.
2. Response: System displays MSG76.
3. The run is not created.
E100.2: Invalid warehouses
1. Cause: No warehouse or more than 20 warehouses are selected, a warehouse is inactive, or the user has no access to a warehouse.
2. Response: System displays MSG77 or MSG04.
3. The run is not created.
E100.3: Run not available
1. Cause: The run does not exist or the user has no access to one of its warehouses.
2. Response: System displays MSG79 or MSG04.
3. The run is not displayed.

Priority: High
Business Rules: BR-04, BR-31, BR-MRP-01 – BR-MRP-33
Other information: The result is not recalculated automatically. Cancelled production orders and the activation of another BOM version are not detected by the out-of-date warning.
```

### 3.5 Sửa các UC liên quan

**UC-30 Manage Purchase Orders (2.2.3.11).** Normal flows bước 3 thay bằng:

```text
3. Warehouse Accountant adds items with quantity, unit price and discount (or adds a whole category) and may enter the expected delivery date. (See E30.3)
```

Thêm exception (UC-30 đã có E30.1, E30.2) và thêm `BR-MRP-33` vào Business Rules:

```text
E30.3: Invalid expected delivery date
1. Cause: The expected delivery date is earlier than the order date.
2. Response: System displays MSG81.
3. The order is not saved.
```

**UC-51 Manage Master Data (2.2.3.23), A51.1.** Thay danh sách thuộc tính bằng:

```text
1. Manager creates or edits goods (code, name, type, category, unit and conversion units, selling price, cost, reorder point, lead time in days, images).
```

**UC-92 Manage Production Plans (2.2.3.31).** Normal flows bước 2 thay bằng:

```text
2. Planner enters the plan name, period, the material warehouse and the finished goods with quantity, start and end date, receiving warehouse and note.
```

### 3.6 Mục 3.1.6 – Screen Authorization (thêm 1 dòng)

```text
Material Planning (MRP) | X | X |  |  | X
```

Thứ tự cột: Administrator, Manager, Sales, Warehouse Accountant, Production Accountant. Admin vượt qua mọi kiểm tra quyền trong code. Quyền chạy MRP là `PROD_UPDATE`, quyền xem là `PROD_READ`, chức năng menu là `feat-production-mrp` (mặc định cho Manager và Production Accountant).

### 3.7 Mục 3.1.7 – Non-Screen Functions (thêm 1 dòng)

```text
Production Management | MRP Calculation Engine | Calculates the time-phased material requirements of a run: gross requirement from the active BOMs, scheduled receipts from purchase orders with an expected delivery date, projected stock, net requirement, suggested receipts and order deadlines from the material lead times; allocates the available supply to each plan and order to show which ones are short.
```

### 3.8 Mục 3.2.2 – Functional Specifications (thêm 3 mục)

```text
3.2.2.16 Material Planning (MRP)
Description:
This screen calculates and displays the material requirements of production plans and production orders.
Main Features:
Calculate MRP, open previous runs, view requirements by month, week or day, view shortages and projected stock, and create a purchase order from the suggestions.
Field Name | Description
Run Selector | Code and time of the runs the user may view
Calculate MRP Button | Opens the Calculate MRP popup
Out-of-date Warning | Reasons why input data changed after the run
Overview Tab | Period, warehouses, materials with demand, materials in shortage, materials late, finished goods without an active BOM
Monthly / Weekly Tab | Material code, name, unit, quantity per month or ISO week, total
Daily Tab | Need date, material code, name, unit, quantity, source plans and orders
Shortages Tab | Material code, name, unit, shortage from date, opening stock, total shortage, affected plans and orders, on order without delivery date, stock in other warehouses, status; option to show only late materials
Purchase Suggestions Tab | Material code, name, unit, suggested quantity, rounded order quantity, required receipt date, order deadline, supplier of the latest purchase, status (On time, Late, No lead time); filter by status
Create Purchase Order Button | Opens the purchase order form prefilled with one line per material for the current working warehouse

3.2.2.17 Calculate MRP <<Popup>>
Description:
This popup allows the user to start an MRP run.
Main Features:
Select the period and the material warehouses.
Field Name | Description
Period End Date | From today, at most 366 days ahead; the period starts today
Material Warehouses | One to twenty active warehouses the user can access
Include Pending Plans | Also count plans Pending Approval
Calculate Button | Runs MRP and opens the result

3.2.2.18 Projected Stock <<Popup>>
Description:
This popup shows the projected stock of one material in an MRP run.
Main Features:
Opened by clicking a material code in the MRP screen.
Field Name | Description
Projection Table | Date, gross requirement, scheduled receipt, projected stock without new purchases, suggested receipt, projected stock after suggestions, order date, late flag
```

**Sửa màn hình liên quan:**
- 3.2.2.2 Create / Update Goods Form: thêm dòng `Lead Time (days) | Days from ordering to receiving the goods, 0 – 365; empty when unknown`.
- 3.2.5.1 Purchase Order List & Form, dòng Order Form: thêm "expected delivery date".
- 3.2.2.10 Update Production Plan: thêm dòng `Material Warehouse | Warehouse from which the materials of the plan's production orders are issued; the material requirement panel compares with its stock`.

### 3.9 Mục 3.1.8 – ERD

**Thêm 3 entity:**

```text
MrpRun | MRP runs: code, run time, user, period, selected warehouses, include pending plans flag, number of materials, shortages and late materials; snapshot of the result.
MrpRunLine | Result per material and date of a run: gross requirement, scheduled receipt, projected stock, net requirement, suggested receipt, order date, late flag.
MrpRunDemand | Allocation of each demand of a run (plan or production order, finished good, material, need date) to the available supply: required, allocated and shortage quantities.
```

**Sửa mô tả 3 entity:**
- `Product`: thêm "lead time (days)".
- `PurchaseOrder`: thêm "expected delivery date".
- `ProductionPlan`: thêm "material warehouse".

### 3.10 Mục 5.1 – Business Rules (thêm 5 nhóm, cùng cách viết với BR-PP)

```text
BR-MRP-01 – BR-MRP-09 (Demand): The requirement of a material is calculated from the active BOM with BR-31. Demands are (a) the part of each line of an Approved production plan that has no production order yet (plans Pending Approval only when the user selects them), needed on the start date of the line, and (b) the quantity still to be issued (required − issued) of production orders Not Started or In Progress, needed on the start date of the plan line for a not-started order created from a plan, otherwise on the order start date. Need dates in the past count as today. Requirements of the same material on the same day are added together. Finished goods without an active BOM are skipped and listed in the result. Only one BOM level is exploded: a material that has its own BOM is treated as a purchased material. Not applied in this version: spreading a line over its dates (BR-MRP-08) and storing the BOM version used (BR-MRP-06).

BR-MRP-10 – BR-MRP-17 (Supply): The opening stock is the on-hand quantity of the selected warehouses, excluding lots expired before today. Scheduled receipts are the quantities still to be received (ordered − received by completed receipts) of purchase orders Ordered or Partially Received that have an expected delivery date within the period; a delivery date already passed counts as today and the material is flagged as having an overdue receipt. Purchase orders without an expected delivery date are shown but not counted. Stock of other warehouses is not counted; it is shown as a transfer hint. Draft receipts are not stock. Quantities reserved by customer bookings are not deducted (BR-MRP-17 not applied in this version).

BR-MRP-18 – BR-MRP-22 (Netting and allocation): For each material and date: Before = Projected stock of the previous date + Scheduled receipt − Gross requirement; Net requirement = max(0, Safety stock − Before); Suggested receipt = Net requirement; Projected stock = Before + Suggested receipt. Safety stock is 0 in this version (BR-MRP-20). The first shortage date is the first date with a net requirement. The result shows the projected stock without new purchases (may be negative) and after the suggestions. The available supply is allocated to the demands by need date, then production orders before plans, then creation order; a receipt arriving after a need date is not allocated to it. The allocation only shows which plans and orders are short; it does not reserve stock and does not block issues.

BR-MRP-23 – BR-MRP-29 (Purchase suggestions): The lead time is taken from the goods (calendar days). The required receipt date is the need date; the order deadline is the required receipt date minus the lead time. A material without a lead time has the status No lead time and no order deadline. An order deadline before today has the status Late, with the earliest available date = today + lead time. All days are working days in this version (BR-MRP-25 holiday calendar not applied). There is one suggestion per material and date (BR-MRP-26 weekly grouping not applied); the purchase order form receives one line per material with the total suggested quantity rounded up to a whole number. MRP never creates or approves a purchase order; the user saves it. Inactive materials are still calculated but get no purchase suggestion.

BR-MRP-30 – BR-MRP-33 (Runs): A run covers today to the selected period end (at most 366 days) and 1 to 20 active warehouses that the user can access; the run code is generated by the system with the prefix MRP. A run is a snapshot and is not recalculated; a user can view a run only with access to all of its warehouses. The system warns that a run is out of date when, after the run, a production plan is updated, a production order is created, a purchase order is created or updated, or a stock movement of one of its materials occurs. The lead time of goods is 0 – 365 days; the expected delivery date of a purchase order cannot be earlier than the order date, and merged purchase orders keep the earliest expected date.
```

### 3.11 Mục 5.2 – System Messages (thêm 7 dòng)

```text
MSG75 | Toast (Success) | MRP calculated | MRP run {code} has been calculated.
MSG76 | Inline (Error) | Invalid MRP period | The period end date must be from today and not more than 366 days ahead.
MSG77 | Inline (Error) | Invalid material warehouses | Please select from 1 to 20 active material warehouses.
MSG78 | Banner (Warning) | MRP result out of date | Data has changed since this run; the result may no longer be correct. Run MRP again to update it.
MSG79 | Toast (Error) | MRP run not found | This MRP run cannot be found.
MSG80 | Inline (Error) | Invalid lead time | Lead time must be a number of days from 0 to 365.
MSG81 | Inline (Error) | Invalid expected delivery date | The expected delivery date cannot be earlier than the order date.
```

Thông báo thật trong code (tiếng Việt), để người dán đối chiếu:

| MSG | Code |
|---|---|
| MSG75 | "Đã tính MRP {mã}." (`MrpScreen.tsx`) |
| MSG76 | "Ngày cuối kỳ phải từ hôm nay và không quá 366 ngày." (`RunMrpCommand`) |
| MSG77 | "Vui lòng chọn ít nhất một kho nguyên vật liệu." / "Chọn tối đa 20 kho." / "Kho không tồn tại hoặc đã ngừng hoạt động." |
| MSG78 | "Dữ liệu đã thay đổi sau lần tính này — kết quả có thể không còn đúng" + danh sách lý do (`GetMrpRunSummaryQuery`) |
| MSG79 | "Không tìm thấy lần chạy MRP này." (`MrpRunAccess`) |
| MSG04 | "Bạn không có quyền xem lần chạy MRP của kho này." (`MrpRunAccess`) |
| MSG80 | "Thời gian giao hàng phải là số ngày từ 0 đến 365." (`ProductLeadTime`) |
| MSG81 | "Ngày giao dự kiến không được trước ngày đặt hàng." (`PurchaseOrderHelper`) |

### 3.12 Sơ đồ cần vẽ lại

- UC Diagram for Manager và for Production Accountant: thêm UC-100 – UC-105.
- 1.2.2 Production workflow: thêm bước "Run MRP → order missing materials" giữa "Approve plan" và "Create production orders".
- Screens Flow (3.1.4, 3.1.5): thêm Material Planning (MRP) và 2 popup.
- Hình ERD: thêm 3 bảng MRP.

---

## 4. Ghi nhận D4

`docs/UnitTest.xlsx` không phải mẫu chính thức. Ca test và kết quả viết trong `specs/qa/` (Phase 2 trở đi). Khi có mẫu Report 5 chính thức thì chuyển sang mẫu đó.

---

## 5. Áp dụng vào `docs/SEP_490_Group82(bản sao).docx` (19/11/2026)

**Cách làm:**
- Script node sửa `word/document.xml` theo nội dung chữ: tìm bảng theo dòng tiêu đề, tìm đoạn theo chữ; không dựa vào vị trí. Vì vậy có thể chạy lại trên bản mới hơn.
- Sau đó đóng gói lại thành file `.docx` mới.
- Bản gốc được sao lưu trước khi sửa.

**Ngoài mục 1–3, đã sửa thêm cho nhất quán:**
- Bảng UC Descriptions (2.2.2): mô tả UC-72 (bỏ "approve") và UC-89 (bỏ "landed").
- 3.1.4.2 Screen Descriptions (Production Accountant): thêm 3 dòng "Material Planning (MRP)", "Calculate MRP <<Popup>>", "Projected Stock <<Popup>>".
- 3.1.5.2 (Manager): thêm 1 dòng MRP; đánh lại cột "#".
- UC-51 Business Rules: thêm `BR-MRP-33`.
- 3.1.7: đánh lại số thứ tự sau khi bỏ dòng 1.
- ERD (3.1.8): đánh lại cột "#".
- Mục 2.2.3: xoá 2.2.3.13 (UC-34) và đánh lại số 2.2.3.14 – 2.2.3.34 thành 2.2.3.13 – 2.2.3.33. UC-100 là mục 2.2.3.34.

**Kiểm tra đã làm:**
- XML hợp lệ (System.Xml).
- Không trùng `w14:paraId`, `wp:docPr id`, bookmark id.
- Số hình giữ nguyên 63 / 63.
- Word 2021 mở được: 121 trang, 96 bảng (93 − 1 + 1 + 3).
- Xuất PDF và xem các trang 5, 54, 94, 118.
- Diff chữ trước / sau chỉ gồm các thay đổi trong file này.

**Chưa làm được bằng script (cần người làm trong Word / Google Docs):**
- Vẽ lại hình: sơ đồ UC (Manager, Production Accountant, Warehouse Accountant, Sales Accountant), luồng màn hình 3.1.4 / 3.1.5, quy trình 1.2.2, ERD.
- Chèn ảnh chụp màn hình MRP vào 3.2.2.16 – 3.2.2.18.
- Cập nhật số trang ở mục lục: chuột phải mục lục → Update Field.
- Chép các thay đổi sang Google Doc gốc. File `.docx` chỉ là bản sao.
