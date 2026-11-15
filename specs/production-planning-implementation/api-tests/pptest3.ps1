param([string]$Base = 'http://localhost:5196')
# Phase 4 — kiểm thử tích hợp / hệ thống bổ sung cho Kế hoạch sản xuất. Chạy độc lập (tự tạo dữ liệu mã P4*),
# trên database thử (không dùng database dev). Cần biến môi trường PG* (env.ps1) để đối chiếu DB bằng psql.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if ($env:PGDATABASE -eq 'stockflow_dev' -or -not $env:PGDATABASE) { throw 'Cần chạy env.ps1 với database thử trước.' }
$results = New-Object System.Collections.ArrayList
Add-Type -AssemblyName System.Net.Http

function Call([string]$method, [string]$path, $token, $body = $null) {
  $req = [System.Net.HttpWebRequest]::Create("$Base$path")
  $req.Method = $method; $req.ContentType = 'application/json; charset=utf-8'
  if ($token) { $req.Headers.Add('Authorization', "Bearer $token") }
  if ($null -ne $body) { $bytes = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress)); $s = $req.GetRequestStream(); $s.Write($bytes, 0, $bytes.Length); $s.Close() }
  elseif ($method -ne 'GET') { $req.ContentLength = 0 }
  try { $resp = $req.GetResponse() } catch [System.Net.WebException] { $resp = $_.Exception.Response }
  $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8); $text = $sr.ReadToEnd(); $sr.Close()
  $code = [int]$resp.StatusCode; $resp.Close(); $json = $null; try { $json = $text | ConvertFrom-Json } catch {}
  [pscustomobject]@{ Code = $code; Json = $json; Text = $text }
}
function ErrText($r) {
  $parts = @(); if ($r.Json -and $r.Json.message) { $parts += $r.Json.message }
  if ($r.Json -and $r.Json.errors) { foreach ($p in $r.Json.errors.PSObject.Properties) { $parts += ($p.Value -join ' ') } }
  ($parts -join ' | ')
}
function Msg($r) { $e = ErrText $r; if ($e) { "$($r.Code) $e" } else { "$($r.Code)" } }
function Login([string]$u) { $r = Call 'POST' '/api/auth/login' $null @{ username = $u; password = 'TinPhat@2026' }; if ($r.Code -ne 200) { throw "Đăng nhập $u lỗi: $($r.Text)" }; $r.Json.token }
function Check([string]$id, [string]$name, [bool]$ok, [string]$actual) {
  [void]$results.Add([pscustomobject]@{ Id = $id; Name = $name; Pass = $ok; Actual = $actual })
  Write-Host "$(if ($ok) { 'PASS' } else { 'FAIL' }) $id $name -> $actual"
}
function Sql([string]$q) { (& $psql -w -tAc $q) -join "`n" }
function NewProduct($token, [string]$code, [string]$type, [decimal]$stock) {
  $r = Call 'POST' '/api/products' $token @{ code = $code; name = "SP $code"; type = $type; categoryName = 'Test'; uom = 'Cai'; standardPrice = 100000; costPrice = 50000; initialStock = $stock; initialWarehouseId = 3 }
  if ($r.Code -ge 300) { throw "Tạo hàng $code lỗi: $($r.Text)" }; [int]($r.Json.productId, $r.Json.id | Where-Object { $_ } | Select-Object -First 1)
}
function NewBom($token, [int]$productId, $items) {
  $r = Call 'POST' '/api/production/boms' $token @{ productId = $productId; bomCode = "BOM-P4-$productId"; version = 'v1'; description = 'p4'; items = $items; activate = $true }
  if ($r.Code -ge 300) { throw "Tạo BOM lỗi: $($r.Text)" }; [int]$r.Json.summary.bomId
}
function Item([int]$pid_, [decimal]$qty, $wh = $null) { @{ productId = $pid_; plannedQuantity = $qty; plannedStartDate = '2026-11-20'; plannedEndDate = '2026-12-20'; warehouseId = $wh; notes = $null } }
function Plan([string]$name, $items) { @{ planName = $name; periodStart = '2026-11-15'; periodEnd = '2026-12-31'; notes = $null; items = @($items) } }
function OrderBody($pairs, $deadline = $null) { @{ productId = 0; plannedQuantity = 0; deadline = $deadline; workshop = 'X'; notes = 'P4'; items = @($pairs | ForEach-Object { @{ productId = $_[0]; plannedQuantity = $_[1] } }) } }
function ApprovedPlan($token, [string]$name, $items) {
  $p = Call 'POST' '/api/production/plans' $token (Plan $name $items); if ($p.Code -ne 200) { throw "Lập KH lỗi: $($p.Text)" }
  $id = $p.Json.summary.productionPlanId
  $null = Call 'POST' "/api/production/plans/$id/submit" $token; $a = Call 'POST' "/api/production/plans/$id/approve" $token
  if ($a.Json.summary.status -ne 'APPROVED') { throw "Duyệt KH lỗi: $($a.Text)" }; $id
}
function Send-Concurrent([object[]]$requests) {
  # Gửi đồng thời: mỗi phần tử @{ token; path; body }
  $tasks = foreach ($rq in $requests) {
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $rq.token)
    $json = if ($null -ne $rq.body) { $rq.body | ConvertTo-Json -Depth 8 -Compress } else { '{}' }
    $client.PostAsync("$Base$($rq.path)", (New-Object System.Net.Http.StringContent($json, [Text.Encoding]::UTF8, 'application/json')))
  }
  [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tasks)
  @($tasks | ForEach-Object { [int]$_.Result.StatusCode })
}

$admin = Login 'admin'; $mgr = Login 'manager01'; $prod = Login 'prodstaff01'
$mat = NewProduct $admin 'P4MAT' 'RAW_MATERIAL' 100000

# ─── IT-01 Kế hoạch nhiều thành phẩm (25) → một lệnh 25 thành phẩm ─────────────────
$fgs = 1..25 | ForEach-Object { $id = NewProduct $admin ("P4FG{0:00}" -f $_) 'FINISHED' 0; $null = NewBom $admin $id @(@{ materialId = $mat; quantity = 1; wastageRate = 0 }); $id }
$idMany = ApprovedPlan $mgr 'P4 nhieu thanh pham' @($fgs | ForEach-Object { Item $_ 10 })
$r = Call 'POST' "/api/production/plans/$idMany/orders" $mgr (OrderBody @($fgs | ForEach-Object { ,@($_, 10) }))
$d = (Call 'GET' "/api/production/plans/$idMany" $mgr).Json
$reqCount = Sql "select count(*) from stockflow.trx_production_material_requirements where production_order_id = $($r.Json.summary.productionOrderId);"
Check 'IT-01' 'Kế hoạch 25 thành phẩm → 1 lệnh 25 dòng, 25 dòng nhu cầu NVL, còn lại 0' ($r.Code -eq 200 -and $r.Json.summary.items.Count -eq 25 -and $reqCount -eq '25' -and (($d.items | Where-Object { [decimal]$_.remainingQuantity -ne 0 }).Count -eq 0)) "$($r.Code) items=$($r.Json.summary.items.Count) reqs=$reqCount"
$m = Call 'GET' "/api/production/plans/$idMany/material-requirements?warehouseId=3" $mgr
Check 'IT-02' 'Nhu cầu NVL 25 thành phẩm cộng dồn 1 dòng = 250; theo số còn lại = 0' ($m.Code -eq 200 -and $m.Json.materials.Count -eq 1 -and [decimal]$m.Json.materials[0].requiredQty -eq 250 -and [decimal]$m.Json.materials[0].remainingRequiredQty -eq 0) "$($m.Code) req=$($m.Json.materials[0].requiredQty) remaining=$($m.Json.materials[0].remainingRequiredQty)"

# ─── IT-03 Rollback: BOM bị ngừng sau khi duyệt → lập lệnh lỗi, không để lại dữ liệu dở ───
$fgR = NewProduct $admin 'P4FGR' 'FINISHED' 0
$bomR = NewBom $admin $fgR @(@{ materialId = $mat; quantity = 2; wastageRate = 0 })
$idR = ApprovedPlan $mgr 'P4 rollback' @(,(Item $fgR 20))
$ordersBefore = Sql 'select count(*) from stockflow.trx_production_orders;'
$reqsBefore = Sql 'select count(*) from stockflow.trx_production_material_requirements;'
$null = Call 'POST' "/api/production/boms/$bomR/deactivate" $admin
$r = Call 'POST' "/api/production/plans/$idR/orders" $mgr (OrderBody @(,@($fgR, 20)))
$ordersAfter = Sql 'select count(*) from stockflow.trx_production_orders;'
$reqsAfter = Sql 'select count(*) from stockflow.trx_production_material_requirements;'
Check 'IT-03' 'BOM ngừng sau khi duyệt: lập lệnh bị chặn, không có lệnh / nhu cầu NVL dở dang (rollback)' ($r.Code -eq 400 -and (ErrText $r) -match 'BOM' -and $ordersBefore -eq $ordersAfter -and $reqsBefore -eq $reqsAfter) "$(Msg $r) | lệnh $ordersBefore→$ordersAfter, nhu cầu $reqsBefore→$reqsAfter"
$null = Call 'POST' "/api/production/boms/$bomR/activate" $admin

# ─── IT-04 Gửi trùng: 2 request giống hệt, mỗi request bằng đúng số còn lại ──────────
$fgD = NewProduct $admin 'P4FGD' 'FINISHED' 0; $null = NewBom $admin $fgD @(@{ materialId = $mat; quantity = 1; wastageRate = 0 })
$idD = ApprovedPlan $mgr 'P4 gui trung' @(,(Item $fgD 10))
$codes = Send-Concurrent @(@{ token = $mgr; path = "/api/production/plans/$idD/orders"; body = (OrderBody @(,@($fgD, 10))) }, @{ token = $mgr; path = "/api/production/plans/$idD/orders"; body = (OrderBody @(,@($fgD, 10))) })
$cnt = Sql "select count(*) from stockflow.trx_production_orders where production_plan_id = $idD;"
Check 'IT-04' 'Bấm lập lệnh 2 lần cùng lúc: chỉ 1 lệnh được tạo' ((($codes | Where-Object { $_ -eq 200 }).Count -eq 1) -and $cnt -eq '1') "codes=$($codes -join ',') lệnh=$cnt"

# ─── IT-05 Hai người khác nhau cùng lập lệnh (admin + manager), mỗi người 6 / còn 10 ───
$fgT = NewProduct $admin 'P4FGT' 'FINISHED' 0; $null = NewBom $admin $fgT @(@{ materialId = $mat; quantity = 1; wastageRate = 0 })
$idT = ApprovedPlan $mgr 'P4 hai nguoi' @(,(Item $fgT 10))
$codes = Send-Concurrent @(@{ token = $mgr; path = "/api/production/plans/$idT/orders"; body = (OrderBody @(,@($fgT, 6))) }, @{ token = $admin; path = "/api/production/plans/$idT/orders"; body = (OrderBody @(,@($fgT, 6))) })
$sum = Sql "select coalesce(sum(oi.planned_quantity),0) from stockflow.dtl_production_order_items oi join stockflow.trx_production_orders o on o.production_order_id = oi.production_order_id where o.production_plan_id = $idT and o.status <> 'CANCELLED';"
Check 'IT-05' 'Hai người đồng thời lập 6 + 6 trên kế hoạch 10: 1 thành công, tổng đã lập 6' ((($codes | Where-Object { $_ -eq 200 }).Count -eq 1) -and [decimal]$sum -eq 6) "codes=$($codes -join ',') tổng=$sum"

# ─── IT-06 Hai người cùng duyệt một kế hoạch ─────────────────────────────────
$p = Call 'POST' '/api/production/plans' $prod (Plan 'P4 duyet dong thoi' @(,(Item $fgT 5))); $idA2 = $p.Json.summary.productionPlanId
$null = Call 'POST' "/api/production/plans/$idA2/submit" $prod
$codes = Send-Concurrent @(@{ token = $mgr; path = "/api/production/plans/$idA2/approve"; body = $null }, @{ token = $admin; path = "/api/production/plans/$idA2/approve"; body = $null })
$st = Sql "select status || '|' || approved_by from stockflow.trx_production_plans where production_plan_id = $idA2;"
Check 'IT-06' 'Hai người duyệt cùng lúc: 1 thành công, 1 bị báo sai trạng thái' ((($codes | Where-Object { $_ -eq 200 }).Count -eq 1) -and $st -match '^APPROVED\|') "codes=$($codes -join ',') db=$st"

# ─── IT-07 Luồng hệ thống đầu-cuối tới khi lệnh hoàn thành ─────────────────────
$fgE = NewProduct $admin 'P4FGE' 'FINISHED' 0; $null = NewBom $admin $fgE @(@{ materialId = $mat; quantity = 3; wastageRate = 0 })
$pE = Call 'POST' '/api/production/plans' $prod (Plan 'P4 dau cuoi' @(,(Item $fgE 10 4)))
$idE = $pE.Json.summary.productionPlanId
$sE = Call 'POST' "/api/production/plans/$idE/submit" $prod
$aE = Call 'POST' "/api/production/plans/$idE/approve" $mgr
$oE = Call 'POST' "/api/production/plans/$idE/orders" $mgr (OrderBody @(,@($fgE, 10)))
$oid = $oE.Json.summary.productionOrderId
$od = (Call 'GET' "/api/production/orders/$oid`?warehouseId=3" $admin).Json
$iss = Call 'POST' '/api/production/material-issues' $admin @{ productionOrderId = $oid; warehouseId = 3; isSupplementary = $false; reason = $null; items = @($od.materials | ForEach-Object { @{ requirementId = $_.requirementId; quantity = [decimal]$_.requiredQty } }) }
$rcp = Call 'POST' '/api/production/finished-goods-receipts' $admin @{ productionOrderId = $oid; warehouseId = 4; locationId = $null; acceptedQuantity = 10; defectQuantity = 0; defectReason = $null; lotNumber = 'LOT-P4E'; productionDate = '2026-11-15'; notes = 'p4'; reviewNote = 'p4'; productionOrderItemId = $od.summary.items[0].productionOrderItemId; confirmExceedPlan = $false }
$dE = (Call 'GET' "/api/production/plans/$idE" $mgr).Json
$cE = Call 'POST' "/api/production/plans/$idE/close" $mgr
$stock = Sql "select coalesce(sum(quantity),0) from stockflow.trx_inventory_balances where product_id = $fgE and warehouse_id = 4;"
$ok = $sE.Json.summary.status -eq 'PENDING_APPROVAL' -and $aE.Json.summary.status -eq 'APPROVED' -and $oE.Code -eq 200 -and $iss.Code -eq 200 -and $rcp.Code -eq 200 -and `
      $dE.orders[0].status -eq 'COMPLETED' -and [decimal]$dE.items[0].receivedQuantity -eq 10 -and [decimal]$dE.items[0].remainingQuantity -eq 0 -and `
      $dE.summary.orderedPercent -eq 100 -and $cE.Json.summary.status -eq 'CLOSED' -and [decimal]$stock -eq 10
Check 'IT-07' 'Đầu-cuối: lập → gửi duyệt → duyệt → lập lệnh → xuất NVL → nhập TP → lệnh COMPLETED → đóng KH; tồn TP kho K002 +10' $ok "submit=$($sE.Json.summary.status) approve=$($aE.Json.summary.status) order=$($oE.Code) issue=$($iss.Code) receipt=$($rcp.Code) orderStatus=$($dE.orders[0].status) received=$($dE.items[0].receivedQuantity) pct=$($dE.summary.orderedPercent) close=$($cE.Json.summary.status) tồn=$stock"

# ─── IT-08..11 Dữ liệu không hợp lệ ở API ──────────────────────────────────
$r = Call 'POST' "/api/production/plans/$idT/reject" $mgr @{ reason = ('x' * 201) }
Check 'IT-08' 'Lý do quá 200 ký tự bị chặn' ($r.Code -eq 400) (Msg $r)
$r = Call 'POST' "/api/production/plans/$idT/orders" $mgr (OrderBody @(,@($fgT, 1)) '2020-01-01')
Check 'IT-09' 'Lập lệnh với hạn hoàn thành trong quá khứ bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'Hạn hoàn thành') (Msg $r)
$r = Call 'POST' "/api/production/plans/$idT/orders" $mgr (OrderBody @(,@($fgT, 0)))
Check 'IT-10' 'Lập lệnh số lượng 0 bị chặn' ($r.Code -eq 400) (Msg $r)
$r = Call 'GET' '/api/production/plans/999999' $mgr
$r2 = Call 'POST' '/api/production/plans/999999/approve' $mgr
Check 'IT-11' 'Kế hoạch không tồn tại: xem / duyệt báo không tìm thấy' ($r.Code -eq 400 -and $r2.Code -eq 400 -and (ErrText $r) -match 'Không tìm thấy') "$(Msg $r) | $(Msg $r2)"
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P4 kho ngoai quyen' @(,(Item $fgT 5 6)))
Check 'IT-12' 'Manager chọn kho nhận không được phân quyền (K004) bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'quyền') (Msg $r)

# Sửa lệnh thuộc kế hoạch sang thành phẩm ngoài kế hoạch
$oT = (Call 'GET' "/api/production/plans/$idT" $mgr).Json.orders[0].productionOrderId
$r = Call 'PUT' "/api/production/orders/$oT" $mgr @{ productId = $fgD; plannedQuantity = 1; deadline = '2026-12-20'; workshop = 'X'; notes = 'doi TP' }
Check 'IT-13' 'Sửa lệnh thuộc kế hoạch sang thành phẩm ngoài kế hoạch bị chặn' ($r.Code -eq 400 -and (ErrText $r) -match 'không thuộc kế hoạch') (Msg $r)

# ─── IT-14..16 Phân quyền nâng cao ─────────────────────────────────────────
$r = Call 'GET' '/api/production/plans' $null
Check 'IT-14' 'Chưa đăng nhập → 401' ($r.Code -eq 401) "$($r.Code)"

$save = Call 'PUT' '/api/Roles/feature-matrix' $admin @{ ROLE_PRODUCTION = @('feat-goods', 'feat-prod', 'feat-prod-issue', 'feat-prod-receipt') }
$r = Call 'GET' '/api/production/plans' $prod
$r2 = Call 'POST' '/api/production/plans' $prod (Plan 'P4 khong co quyen' @(,(Item $fgT 1)))
Check 'IT-15' 'Ma trận đã cấu hình bỏ tick Kế hoạch SX: Kế toán SX bị chặn xem / lập (403)' ($save.Code -eq 200 -and $r.Code -eq 403 -and $r2.Code -eq 403) "lưu=$($save.Code) xem=$($r.Code) lập=$($r2.Code)"
$save = Call 'PUT' '/api/Roles/feature-matrix' $admin @{ ROLE_PRODUCTION = @('feat-goods', 'feat-prod', 'feat-prod-issue', 'feat-prod-receipt', 'feat-production-plans') }
$r = Call 'POST' '/api/production/plans' $prod (Plan 'P4 tick lai' @(,(Item $fgT 1)))
$r2 = Call 'POST' "/api/production/plans/$($r.Json.summary.productionPlanId)/approve" $prod
Check 'IT-16' 'Tick lại Kế hoạch SX: lập được; vẫn không duyệt được (403)' ($save.Code -eq 200 -and $r.Code -eq 200 -and $r2.Code -eq 403) "lưu=$($save.Code) lập=$($r.Code) duyệt=$($r2.Code)"

$staff = Call 'GET' '/api/staff' $admin
$lock = Call 'PATCH' '/api/staff/5/toggle-status' $admin
$r = Call 'GET' '/api/production/plans' $prod
$unlock = Call 'PATCH' '/api/staff/5/toggle-status' $admin
Check 'IT-17' 'Tài khoản bị khóa (token cũ) không xem được kế hoạch' ($lock.Code -eq 200 -and $r.Code -in 401, 403 -and $unlock.Code -eq 200) "khóa=$($lock.Code) xem=$($r.Code) mở=$($unlock.Code)"

$pass = ($results | Where-Object Pass).Count; $fail = ($results | Where-Object { -not $_.Pass }).Count
Write-Host "TỔNG: $($results.Count) | PASS: $pass | FAIL: $fail"
$results | ConvertTo-Json -Depth 3 | Out-File (Join-Path $dir 'results-p4.json') -Encoding utf8
