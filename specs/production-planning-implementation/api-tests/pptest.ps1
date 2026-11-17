param([string]$Base = 'http://localhost:5196')
# Kiểm thử API Kế hoạch sản xuất (UC-PP-01..06) trên database thử stockflow_verify_pp. Không dùng database dev.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pwdDefault = 'TinPhat@2026'
$results = New-Object System.Collections.ArrayList

function Call([string]$method, [string]$path, $token, $body = $null) {
  $req = [System.Net.HttpWebRequest]::Create("$Base$path")
  $req.Method = $method
  $req.ContentType = 'application/json; charset=utf-8'
  if ($token) { $req.Headers.Add('Authorization', "Bearer $token") }
  if ($null -ne $body) {
    $bytes = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress))
    $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close()
  } elseif ($method -ne 'GET') { $req.ContentLength = 0 }
  try { $resp = $req.GetResponse() } catch [System.Net.WebException] { $resp = $_.Exception.Response }
  $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8)
  $text = $sr.ReadToEnd(); $sr.Close()
  $code = [int]$resp.StatusCode; $resp.Close()
  $json = $null; try { $json = $text | ConvertFrom-Json } catch {}
  [pscustomobject]@{ Code = $code; Json = $json; Text = $text }
}
function Login([string]$u) {
  $r = Call 'POST' '/api/auth/login' $null @{ username = $u; password = $pwdDefault }
  if ($r.Code -ne 200) { throw "Đăng nhập $u lỗi $($r.Code): $($r.Text)" }
  $r.Json.token
}
function Check([string]$id, [string]$name, [bool]$ok, [string]$actual) {
  [void]$results.Add([pscustomobject]@{ Id = $id; Name = $name; Pass = $ok; Actual = $actual })
  $mark = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host "$mark $id $name -> $actual"
}
function ErrText($r) {
  $parts = @()
  if ($r.Json -and $r.Json.message) { $parts += $r.Json.message }
  if ($r.Json -and $r.Json.errors) { foreach ($p in $r.Json.errors.PSObject.Properties) { $parts += ($p.Value -join ' ') } }
  ($parts -join ' | ')
}
function Msg($r) { $e = ErrText $r; if ($e) { "$($r.Code) $e" } else { "$($r.Code) $($r.Text.Substring(0, [Math]::Min(160, $r.Text.Length)))" } }
function NewProduct($token, [string]$code, [string]$type, [decimal]$stock) {
  $body = @{ code = $code; name = "SP thu $code"; type = $type; categoryName = 'Test'; uom = 'Cai'; standardPrice = 100000; costPrice = 50000; initialStock = $stock; initialWarehouseId = 3 }
  $r = Call 'POST' '/api/products' $token $body
  if ($r.Code -ge 300) { throw "Tạo hàng $code lỗi: $($r.Text)" }
  [int]($r.Json.productId, $r.Json.id | Where-Object { $_ } | Select-Object -First 1)
}
function NewBom($token, [int]$productId, $items) {
  $r = Call 'POST' '/api/production/boms' $token @{ productId = $productId; bomCode = "BOM-$productId"; version = 'v1'; description = 'test'; items = $items; activate = $true }
  if ($r.Code -ge 300) { throw "Tạo BOM lỗi: $($r.Text)" }
}
function Item([int]$pid_, [decimal]$qty, [string]$start = '2026-11-20', [string]$end = '2026-12-20', $wh = $null) {
  @{ productId = $pid_; plannedQuantity = $qty; plannedStartDate = $start; plannedEndDate = $end; warehouseId = $wh; notes = $null }
}
function Plan([string]$name, $items, [string]$pStart = '2026-11-15', [string]$pEnd = '2026-12-31') {
  @{ planName = $name; periodStart = $pStart; periodEnd = $pEnd; notes = 'Ghi chu ban dau'; items = @($items) }
}
function Line($detail, [int]$productId) { $detail.items | Where-Object { $_.productId -eq $productId } }
function OrderBody($items, $deadline = $null) {
  @{ productId = 0; plannedQuantity = 0; deadline = $deadline; workshop = 'Xuong A'; notes = 'Lap tu ke hoach'; items = @($items | ForEach-Object { @{ productId = $_[0]; plannedQuantity = $_[1] } }) }
}

# ─── Chuẩn bị dữ liệu ───────────────────────────────────────────────────
$admin = Login 'admin'; $mgr = Login 'manager01'; $prod = Login 'prodstaff01'; $sales = Login 'sales01'
$mat1 = NewProduct $admin 'PPMAT1' 'RAW_MATERIAL' 500
$mat2 = NewProduct $admin 'PPMAT2' 'RAW_MATERIAL' 10
$fg1 = NewProduct $admin 'PPFG1' 'FINISHED' 0
$fg2 = NewProduct $admin 'PPFG2' 'FINISHED' 0
$fg3 = NewProduct $admin 'PPFG3' 'FINISHED' 0   # không có BOM
$fg5 = NewProduct $admin 'PPFG5' 'FINISHED' 0
NewBom $admin $fg1 @(@{ materialId = $mat1; quantity = 2; wastageRate = 0 }, @{ materialId = $mat2; quantity = 0.5; wastageRate = 10 })
NewBom $admin $fg2 @(@{ materialId = $mat1; quantity = 1; wastageRate = 5 })
NewBom $admin $fg5 @(@{ materialId = $mat1; quantity = 1; wastageRate = 0 })
Write-Host "Dữ liệu: mat1=$mat1 mat2=$mat2 fg1=$fg1 fg2=$fg2 fg3=$fg3 fg5=$fg5"

# ─── A. Phân quyền ──────────────────────────────────────────────────────
$r = Call 'GET' '/api/production/plans' $sales
Check 'PP-01' 'Sales không xem được kế hoạch' ($r.Code -eq 403) (Msg $r)

# ─── B. Validation ─────────────────────────────────────────────────────
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Rong' @())
Check 'PP-02' 'Kế hoạch không có dòng bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'ít nhất một') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'SL 0' @(Item $fg1 0))
Check 'PP-03' 'Số lượng 0 bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'lớn hơn 0') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Ngay nguoc' @(Item $fg1 10 '2026-12-20' '2026-11-20'))
Check 'PP-04' 'Ngày kết thúc dòng trước ngày bắt đầu bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'không được trước ngày bắt đầu') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Ngoai ky' @(Item $fg1 10 '2026-11-20' '2027-01-20'))
Check 'PP-05' 'Dòng nằm ngoài kỳ bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'nằm trong kỳ') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Trung SP' @((Item $fg1 10), (Item $fg1 20)))
Check 'PP-06' 'Trùng thành phẩm trong kế hoạch bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'một dòng') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'SP khong ton tai' @(Item 999999 10))
Check 'PP-07' 'Thành phẩm không tồn tại bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'không tồn tại') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Ky nguoc' @(Item $fg1 10) '2026-12-31' '2026-11-15')
Check 'PP-08' 'Kỳ kế hoạch ngược bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'kỳ kế hoạch') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Kho khong quyen' @(Item $fg1 10 '2026-11-20' '2026-12-20' 3))
Check 'PP-09' 'Kho nhận không thuộc quyền bị chặn (prodstaff chỉ có K002)' ($r.Code -eq 400 -and (ErrText $r) -match 'quyền') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Thap phan' @(Item $fg1 10.123))
Check 'PP-10' 'Số lượng quá 2 chữ số thập phân bị chặn' ($r.Code -eq 400) (Msg $r)

# ─── C. Luồng chính ────────────────────────────────────────────────────
$r = Call 'POST' '/api/production/plans' $prod (Plan 'Ke hoach thang 12' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50), (Item $fg3 10)))
$planA = $r.Json
Check 'PP-11' 'Production Accountant lập kế hoạch → DRAFT, mã KHSX' ($r.Code -eq 200 -and $planA.summary.status -eq 'DRAFT' -and $planA.summary.planCode -match '^KHSX\d{5}$') "$($r.Code) $($planA.summary.planCode) $($planA.summary.status)"
$idA = $planA.summary.productionPlanId
Check 'PP-12' 'Thành phẩm chưa có BOM được cảnh báo (HasActiveBom=false), các dòng khác true' ((-not (Line $planA $fg3).hasActiveBom) -and (Line $planA $fg1).hasActiveBom) "fg3=$((Line $planA $fg3).hasActiveBom) fg1=$((Line $planA $fg1).hasActiveBom)"

$r = Call 'POST' "/api/production/plans/$idA/submit" $prod
Check 'PP-13' 'Gửi duyệt bị chặn khi có thành phẩm chưa có BOM' ($r.Code -eq 400 -and (ErrText $r) -match 'PPFG3') (Msg $r)

$r = Call 'PUT' "/api/production/plans/$idA" $prod (Plan 'Ke hoach thang 12' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50)))
Check 'PP-14' 'Sửa nháp (bỏ dòng FG3) → còn 2 dòng, vẫn DRAFT' ($r.Code -eq 200 -and $r.Json.items.Count -eq 2 -and $r.Json.summary.status -eq 'DRAFT') "$($r.Code) items=$($r.Json.items.Count)"

$r = Call 'POST' "/api/production/plans/$idA/submit" $prod
Check 'PP-15' 'Gửi duyệt → PENDING_APPROVAL' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'PENDING_APPROVAL') (Msg $r)

$r = Call 'PUT' "/api/production/plans/$idA" $prod (Plan 'Doi ten khi cho duyet' @((Item $fg1 100), (Item $fg2 50)))
Check 'PP-16' 'Không sửa được khi đang chờ duyệt' ($r.Code -eq 400) (Msg $r)

$r = Call 'GET' "/api/production/plans/$idA" $prod
Check 'PP-17' 'AllowedActions: prodstaff không được duyệt; ' ($r.Json.actions.canApprove -eq $false -and $r.Json.actions.canEdit -eq $false) "canApprove=$($r.Json.actions.canApprove) canEdit=$($r.Json.actions.canEdit)"
$r = Call 'GET' "/api/production/plans/$idA" $mgr
Check 'PP-18' 'AllowedActions: manager được duyệt / từ chối' ($r.Json.actions.canApprove -and $r.Json.actions.canReject) "canApprove=$($r.Json.actions.canApprove)"

$r = Call 'POST' "/api/production/plans/$idA/approve" $prod
Check 'PP-19' 'Production Accountant gọi API duyệt → 403' ($r.Code -eq 403) (Msg $r)

$r = Call 'POST' "/api/production/plans/$idA/reject" $mgr @{ reason = '' }
Check 'PP-20' 'Từ chối không có lý do bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'lý do') (Msg $r)
$r = Call 'POST' "/api/production/plans/$idA/reject" $mgr @{ reason = 'Can xem lai so luong FG2' }
Check 'PP-21' 'Từ chối có lý do → REJECTED, lý do ghi vào ghi chú' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'REJECTED' -and $r.Json.notes -match '\[Từ chối .*\] Can xem lai') "$($r.Code) $($r.Json.summary.status) | $($r.Json.notes)"

$r = Call 'PUT' "/api/production/plans/$idA" $prod (Plan 'Ke hoach thang 12' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50)))
$r2 = Call 'POST' "/api/production/plans/$idA/submit" $prod
Check 'PP-22' 'Sửa kế hoạch bị từ chối rồi gửi duyệt lại → PENDING_APPROVAL' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'REJECTED' -and $r2.Json.summary.status -eq 'PENDING_APPROVAL') "sửa=$($r.Json.summary.status) gửi=$($r2.Json.summary.status)"

$r = Call 'POST' "/api/production/plans/$idA/approve" $mgr
Check 'PP-23' 'Manager duyệt → APPROVED, ghi người duyệt và thời điểm' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'APPROVED' -and $r.Json.summary.approvedBy -eq 2 -and $r.Json.summary.approvalDate) "$($r.Json.summary.status) by=$($r.Json.summary.approvedBy) at=$($r.Json.summary.approvalDate)"

# Nhu cầu NVL: FG1 100 → MAT1 200, MAT2 100*0.5*1.1=55; FG2 50 → MAT1 52.5. Tồn kho 3: MAT1 500, MAT2 10
$r = Call 'GET' "/api/production/plans/$idA/material-requirements?warehouseId=3" $mgr
$m1 = $r.Json.materials | Where-Object { $_.materialId -eq $mat1 }; $m2 = $r.Json.materials | Where-Object { $_.materialId -eq $mat2 }
Check 'PP-24' 'Nhu cầu NVL cộng dồn đúng, cảnh báo thiếu MAT2' ($r.Code -eq 200 -and [decimal]$m1.requiredQty -eq 252.5 -and [decimal]$m2.requiredQty -eq 55 -and [decimal]$m2.shortageQty -eq 45 -and $r.Json.shortageCount -eq 1) "MAT1=$($m1.requiredQty) MAT2=$($m2.requiredQty) thiếu=$($m2.shortageQty) shortageCount=$($r.Json.shortageCount)"
$r = Call 'GET' "/api/production/plans/$idA/material-requirements?warehouseId=3" $prod
Check 'PP-25' 'Xem tồn ở kho không có quyền bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'quyền') (Msg $r)
$r = Call 'POST' '/api/production/plans/material-requirements/preview' $prod @{ warehouseId = 4; items = @(@{ productId = $fg1; plannedQuantity = 10 }, @{ productId = $fg3; plannedQuantity = 5 }) }
Check 'PP-26' 'Xem trước nhu cầu khi đang soạn; thành phẩm thiếu BOM liệt kê riêng' ($r.Code -eq 200 -and $r.Json.productsWithoutBom.Count -eq 1 -and [decimal](($r.Json.materials | Where-Object { $_.materialId -eq $mat1 }).requiredQty) -eq 20) "$($r.Code) withoutBom=$($r.Json.productsWithoutBom.Count)"

# ─── D. Lập lệnh từ kế hoạch ───────────────────────────────────────────
$r = Call 'POST' "/api/production/plans/$idA/orders" $prod (OrderBody @(,@($fg1, 60)))
Check 'PP-27' 'Production Accountant không lập lệnh được (403)' ($r.Code -eq 403) (Msg $r)

$r = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(,@($fg1, 60)))
$order1 = $r.Json
Check 'PP-28' 'Lập lệnh một phần (FG1 60) → NOT_STARTED, gắn mã kế hoạch, có nhu cầu NVL' ($r.Code -eq 200 -and $order1.summary.status -eq 'NOT_STARTED' -and $order1.summary.productionPlanId -eq $idA -and $order1.materials.Count -eq 2) "$(Msg $r) plan=$($order1.summary.productionPlanCode) mats=$($order1.materials.Count)"
$d = (Call 'GET' "/api/production/plans/$idA" $mgr).Json
Check 'PP-29' 'Chi tiết kế hoạch: FG1 đã lập 60, còn 40' ([decimal](Line $d $fg1).orderedQuantity -eq 60 -and [decimal](Line $d $fg1).remainingQuantity -eq 40 -and $d.orders.Count -eq 1) "ordered=$((Line $d $fg1).orderedQuantity) remaining=$((Line $d $fg1).remainingQuantity)"

$r = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(,@($fg1, 50)))
Check 'PP-30' 'Lập vượt số còn lại (50 > 40) bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'vượt số còn lại') (Msg $r)
$r = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(,@($fg5, 5)))
Check 'PP-31' 'Lập lệnh cho thành phẩm ngoài kế hoạch bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'không thuộc kế hoạch') (Msg $r)

$r = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(@($fg1, 40), @($fg2, 50)))
$order2 = $r.Json
$d = (Call 'GET' "/api/production/plans/$idA" $mgr).Json
Check 'PP-32' 'Lập lần 2 từ cùng dòng + nhiều thành phẩm trong một lệnh → còn lại 0' ($r.Code -eq 200 -and [decimal](Line $d $fg1).remainingQuantity -eq 0 -and [decimal](Line $d $fg2).remainingQuantity -eq 0 -and $d.actions.canCreateOrder -eq $false) "$(Msg $r) fg1Còn=$((Line $d $fg1).remainingQuantity) canCreateOrder=$($d.actions.canCreateOrder)"
$r = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(,@($fg1, 1)))
Check 'PP-33' 'Hết số còn lại thì lập thêm bị chặn' ($r.Code -eq 400) (Msg $r)

# Sửa lệnh thuộc kế hoạch (API lệnh sản xuất đang có)
$o1 = $order1.summary.productionOrderId
$upd = @{ productId = $fg1; plannedQuantity = 70; deadline = '2026-12-20'; workshop = 'Xuong A'; notes = 'sua' }
$r = Call 'PUT' "/api/production/orders/$o1" $mgr $upd
Check 'PP-34' 'Sửa lệnh thuộc kế hoạch làm vượt kế hoạch (60→70) bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'vượt số còn lại') (Msg $r)
$upd.plannedQuantity = 50
$r = Call 'PUT' "/api/production/orders/$o1" $mgr $upd
$d = (Call 'GET' "/api/production/plans/$idA" $mgr).Json
Check 'PP-35' 'Giảm số lượng lệnh (60→50) được, số còn lại của kế hoạch tăng lên 10' ($r.Code -eq 200 -and [decimal](Line $d $fg1).remainingQuantity -eq 10) "$(Msg $r) còn=$((Line $d $fg1).remainingQuantity)"

# Sửa hạn chế kế hoạch đã duyệt
$r = Call 'PUT' "/api/production/plans/$idA" $prod (Plan 'Ke hoach thang 12' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50)))
Check 'PP-36' 'Production Accountant không sửa được kế hoạch đã duyệt' ($r.Code -eq 400 -and (ErrText $r) -match 'quyền duyệt') (Msg $r)
$r = Call 'PUT' "/api/production/plans/$idA" $mgr (Plan 'Ke hoach thang 12' @((Item $fg1 80 '2026-11-20' '2026-12-20' 4), (Item $fg2 50)))
Check 'PP-37' 'Giảm số kế hoạch thấp hơn số đã lập lệnh (80 < 90) bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'thấp hơn số đã lập') (Msg $r)
$r = Call 'PUT' "/api/production/plans/$idA" $mgr (Plan 'Ten moi' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50)))
Check 'PP-38' 'Đổi tên kế hoạch đã duyệt bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'đổi tên') (Msg $r)
$r = Call 'PUT' "/api/production/plans/$idA" $mgr (Plan 'Ke hoach thang 12' @(,(Item $fg1 100 '2026-11-20' '2026-12-20' 4)))
Check 'PP-39' 'Xóa dòng đã có lệnh (FG2) bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'xóa dòng') (Msg $r)
$r = Call 'PUT' "/api/production/plans/$idA" $mgr (Plan 'Ke hoach thang 12' @((Item $fg1 100 '2026-11-20' '2026-12-20' 4), (Item $fg2 50), (Item $fg3 5)))
Check 'PP-40' 'Thêm dòng thiếu BOM vào kế hoạch đã duyệt bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'PPFG3') (Msg $r)
$r = Call 'PUT' "/api/production/plans/$idA" $mgr (Plan 'Ke hoach thang 12' @((Item $fg1 120 '2026-11-20' '2026-12-20' 4), (Item $fg2 50), (Item $fg5 30)))
$d = $r.Json
Check 'PP-41' 'Manager tăng FG1 lên 120 và thêm FG5 → vẫn APPROVED, FG1 còn 30' ($r.Code -eq 200 -and $d.summary.status -eq 'APPROVED' -and [decimal](Line $d $fg1).remainingQuantity -eq 30 -and (Line $d $fg5)) "$(Msg $r) còn=$((Line $d $fg1).remainingQuantity)"

$r = Call 'POST' "/api/production/plans/$idA/cancel" $mgr @{ reason = 'Thu huy' }
Check 'PP-42' 'Hủy kế hoạch đã duyệt còn lệnh chưa hủy bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'chưa hủy') (Msg $r)

# Hủy lệnh (API đang có) → trả số về kế hoạch
$r = Call 'POST' "/api/production/orders/$($order2.summary.productionOrderId)/cancel" $mgr
$d = (Call 'GET' "/api/production/plans/$idA" $mgr).Json
Check 'PP-43' 'Hủy lệnh thuộc kế hoạch → số lượng trở lại số còn lại (FG1 70, FG2 50)' ($r.Code -eq 200 -and [decimal](Line $d $fg1).remainingQuantity -eq 70 -and [decimal](Line $d $fg2).remainingQuantity -eq 50) "$(Msg $r) fg1=$((Line $d $fg1).remainingQuantity) fg2=$((Line $d $fg2).remainingQuantity)"

# ─── E. Đồng thời: 5 request cùng lúc, mỗi request 30 FG1, còn lại 70 → tối đa 2 thành công ─────
Add-Type -AssemblyName System.Net.Http
$client = New-Object System.Net.Http.HttpClient
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $mgr)
$json = (OrderBody @(,@($fg1, 30))) | ConvertTo-Json -Depth 8 -Compress
$tasks = 1..5 | ForEach-Object { $client.PostAsync("$Base/api/production/plans/$idA/orders", (New-Object System.Net.Http.StringContent($json, [Text.Encoding]::UTF8, 'application/json'))) }
[System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tasks)
$codes = $tasks | ForEach-Object { [int]$_.Result.StatusCode }
$okCount = ($codes | Where-Object { $_ -eq 200 }).Count
$d = (Call 'GET' "/api/production/plans/$idA" $mgr).Json
Check 'PP-44' 'Hai người lập lệnh đồng thời: chỉ 2/5 thành công, không vượt kế hoạch' ($okCount -eq 2 -and [decimal](Line $d $fg1).orderedQuantity -eq 110 -and [decimal](Line $d $fg1).remainingQuantity -eq 10) "codes=$($codes -join ',') ordered=$((Line $d $fg1).orderedQuantity)"

# ─── F. Đóng, hủy ─────────────────────────────────────────────────────
$r = Call 'POST' "/api/production/plans/$idA/close" $prod
Check 'PP-45' 'Production Accountant không đóng được kế hoạch (403)' ($r.Code -eq 403) (Msg $r)
$r = Call 'POST' "/api/production/plans/$idA/close" $mgr
$r2 = Call 'POST' "/api/production/plans/$idA/orders" $mgr (OrderBody @(,@($fg1, 5)))
$o = Call 'GET' "/api/production/orders/$o1" $mgr
Check 'PP-46' 'Đóng kế hoạch → CLOSED; không lập thêm lệnh; lệnh cũ giữ nguyên' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'CLOSED' -and $r2.Code -eq 400 -and $o.Json.summary.status -eq 'NOT_STARTED') "$($r.Json.summary.status) | lập thêm=$(Msg $r2) | lệnh cũ=$($o.Json.summary.status)"

$r = Call 'POST' '/api/production/plans' $mgr (Plan 'KH cua manager' @(,(Item $fg1 10)))
$idB = $r.Json.summary.productionPlanId
$r = Call 'POST' "/api/production/plans/$idB/cancel" $prod @{ reason = 'khong phai cua toi' }
Check 'PP-47' 'Production Accountant không hủy được kế hoạch nháp của người khác' ($r.Code -eq 400 -and (ErrText $r) -match 'người lập') (Msg $r)
$r = Call 'POST' '/api/production/plans' $prod (Plan 'KH cua prodstaff' @(,(Item $fg1 10)))
$idC = $r.Json.summary.productionPlanId
$r = Call 'POST' "/api/production/plans/$idC/cancel" $prod @{ reason = 'Khong can nua' }
Check 'PP-48' 'Người lập hủy kế hoạch nháp của mình → CANCELLED, lý do vào ghi chú' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'CANCELLED' -and $r.Json.notes -match '\[Hủy ') (Msg $r)

# Kế hoạch đã duyệt, mọi lệnh đã hủy → hủy được
$r = Call 'POST' "/api/production/plans/$idB/submit" $mgr; $r = Call 'POST' "/api/production/plans/$idB/approve" $mgr
$ob = (Call 'POST' "/api/production/plans/$idB/orders" $mgr (OrderBody @(,@($fg1, 10)))).Json
$null = Call 'POST' "/api/production/orders/$($ob.summary.productionOrderId)/cancel" $mgr
$r = Call 'POST' "/api/production/plans/$idB/cancel" $mgr @{ reason = 'Huy sau khi huy lenh' }
Check 'PP-49' 'Hủy kế hoạch đã duyệt khi mọi lệnh đã hủy → CANCELLED' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'CANCELLED') (Msg $r)

# ─── G. Số lượng lớn, danh sách, hồi quy ─────────────────────────────
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'SL lon' @(,(Item $fg2 1000000)))
$idD = $r.Json.summary.productionPlanId
$null = Call 'POST' "/api/production/plans/$idD/submit" $mgr; $null = Call 'POST' "/api/production/plans/$idD/approve" $mgr
$r = Call 'POST' "/api/production/plans/$idD/orders" $mgr (OrderBody @(,@($fg2, 999999.99)))
$d = (Call 'GET' "/api/production/plans/$idD" $mgr).Json
Check 'PP-50' 'Kế hoạch số lượng lớn (1.000.000), lập 999.999,99 → còn 0,01' ($r.Code -eq 200 -and [decimal](Line $d $fg2).remainingQuantity -eq 0.01) "$(Msg $r) còn=$((Line $d $fg2).remainingQuantity)"

$r = Call 'GET' '/api/production/plans?statuses=APPROVED,CLOSED' $mgr
Check 'PP-51' 'Danh sách lọc trạng thái APPROVED,CLOSED' ($r.Code -eq 200 -and ($r.Json | Where-Object { $_.status -notin 'APPROVED','CLOSED' }).Count -eq 0 -and $r.Json.Count -eq 2) "$($r.Code) count=$($r.Json.Count)"
$r = Call 'GET' "/api/production/plans?search=$($planA.summary.planCode)" $prod
Check 'PP-52' 'Tìm theo mã kế hoạch; tổng đã lập / tỷ lệ tính đúng' ($r.Code -eq 200 -and $r.Json.Count -eq 1 -and [decimal]$r.Json[0].totalOrderedQuantity -eq 110) "$($r.Code) count=$($r.Json.Count) ordered=$($r.Json[0].totalOrderedQuantity) pct=$($r.Json[0].orderedPercent)"

$r = Call 'POST' '/api/production/orders' $mgr @{ productId = $fg1; plannedQuantity = 5; deadline = '2026-12-20'; workshop = 'X'; notes = 'truc tiep' }
Check 'PP-53' 'Hồi quy: lập lệnh trực tiếp (không kế hoạch) vẫn chạy, productionPlanId null' ($r.Code -eq 200 -and $null -eq $r.Json.summary.productionPlanId) (Msg $r)
$od = $r.Json.summary.productionOrderId
$r = Call 'PUT' "/api/production/orders/$od" $mgr @{ productId = $fg1; plannedQuantity = 500; deadline = '2026-12-20'; workshop = 'X'; notes = 'sua' }
Check 'PP-54' 'Hồi quy: sửa lệnh không thuộc kế hoạch không bị giới hạn bởi kế hoạch' ($r.Code -eq 200) (Msg $r)
$r = Call 'GET' '/api/production/orders' $mgr
$withPlan = ($r.Json | Where-Object { $_.productionPlanCode }).Count
Check 'PP-55' 'Danh sách lệnh trả mã kế hoạch cho lệnh lập từ kế hoạch' ($r.Code -eq 200 -and $withPlan -ge 4) "$($r.Code) lệnh có mã KH=$withPlan"
$r = Call 'GET' '/api/production/lookups/products?search=PPFG' $prod
Check 'PP-56' 'Production Accountant tra cứu thành phẩm cho form kế hoạch' ($r.Code -eq 200 -and $r.Json.Count -ge 4) "$($r.Code) count=$($r.Json.Count)"

$pass = ($results | Where-Object Pass).Count; $fail = ($results | Where-Object { -not $_.Pass }).Count
Write-Host "TỔNG: $($results.Count) | PASS: $pass | FAIL: $fail"
$results | ConvertTo-Json -Depth 3 | Out-File (Join-Path $dir 'results.json') -Encoding utf8
