param([string]$Base = 'http://localhost:5196')
# Kiểm thử API cho validation bổ sung (06-validation-review: V-01..V-15, Q-V1..Q-V8). Chạy độc lập (dữ liệu mã P5*),
# trên database thử (không dùng database dev). Cần biến môi trường PG* (env.ps1) để đối chiếu DB bằng psql.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if ($env:PGDATABASE -eq 'stockflow_dev' -or -not $env:PGDATABASE) { throw 'Cần chạy env.ps1 với database thử trước.' }
$results = New-Object System.Collections.ArrayList
Add-Type -AssemblyName System.Net.Http

function Raw([string]$method, [string]$path, $token, [string]$json) {
  $req = [System.Net.HttpWebRequest]::Create("$Base$path"); $req.Method = $method; $req.ContentType = 'application/json; charset=utf-8'
  if ($token) { $req.Headers.Add('Authorization', "Bearer $token") }
  if ($json) { $b = [Text.Encoding]::UTF8.GetBytes($json); $s = $req.GetRequestStream(); $s.Write($b, 0, $b.Length); $s.Close() } elseif ($method -ne 'GET') { $req.ContentLength = 0 }
  try { $resp = $req.GetResponse() } catch [System.Net.WebException] { $resp = $_.Exception.Response }
  $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8); $t = $sr.ReadToEnd(); $sr.Close(); $c = [int]$resp.StatusCode; $resp.Close()
  $j = $null; try { $j = $t | ConvertFrom-Json } catch {}
  [pscustomobject]@{ Code = $c; Json = $j; Text = $t }
}
function Call([string]$method, [string]$path, $token, $body = $null) {
  $json = if ($null -ne $body) { $body | ConvertTo-Json -Depth 8 -Compress } else { $null }
  Raw $method $path $token $json
}
function ErrText($r) {
  $parts = @(); if ($r.Json -and $r.Json.message) { $parts += $r.Json.message }
  if ($r.Json -and $r.Json.errors) { foreach ($p in $r.Json.errors.PSObject.Properties) { $parts += ($p.Value -join ' ') } }
  ($parts -join ' | ')
}
function Msg($r) { $e = ErrText $r; if ($e) { "$($r.Code) $e" } else { "$($r.Code)" } }
function Login([string]$u) { $r = Call 'POST' '/api/auth/login' $null @{ username = $u; password = 'TinPhat@2026' }; if ($r.Code -ne 200) { throw "Đăng nhập $u lỗi" }; $r.Json.token }
function Check([string]$id, [string]$name, [bool]$ok, [string]$actual) {
  [void]$results.Add([pscustomobject]@{ Id = $id; Name = $name; Pass = $ok; Actual = $actual })
  Write-Host "$(if ($ok) { 'PASS' } else { 'FAIL' }) $id $name -> $actual"
}
function Sql([string]$q) { (& $psql -w -tAc $q) -join "`n" }
function NewProduct($token, [string]$code, [string]$type, [decimal]$stock) {
  $r = Call 'POST' '/api/products' $token @{ code = $code; name = "SP $code"; type = $type; categoryName = 'Test'; uom = 'Cai'; standardPrice = 1; costPrice = 1; initialStock = $stock; initialWarehouseId = 3 }
  if ($r.Code -ge 300) { throw "Tạo hàng $code lỗi: $($r.Text)" }; [int]($r.Json.productId, $r.Json.id | Where-Object { $_ } | Select-Object -First 1)
}
function NewBom($token, [int]$productId, [decimal]$norm, [int]$mat) {
  $r = Call 'POST' '/api/production/boms' $token @{ productId = $productId; bomCode = "BOM-P5-$productId"; version = 'v1'; description = 'p5'; items = @(@{ materialId = $mat; quantity = $norm; wastageRate = 0 }); activate = $true }
  if ($r.Code -ge 300) { throw "Tạo BOM lỗi: $($r.Text)" }
}
$today = (Get-Date).ToString('yyyy-MM-dd')
$future = (Get-Date).AddDays(40).ToString('yyyy-MM-dd')
function Item([int]$pid_, [decimal]$qty, [string]$s = $today, [string]$e = $future) { @{ productId = $pid_; plannedQuantity = $qty; plannedStartDate = $s; plannedEndDate = $e; warehouseId = $null; notes = $null } }
function Plan([string]$name, $items, [string]$ps = $today, [string]$pe = $future, $notes = $null) { @{ planName = $name; periodStart = $ps; periodEnd = $pe; notes = $notes; items = @($items) } }
function OrderBody($pairs, $clientRequestId = $null) { @{ productId = 0; plannedQuantity = 0; deadline = $null; workshop = 'X'; notes = 'P5'; clientRequestId = $clientRequestId; items = @($pairs | ForEach-Object { @{ productId = $_[0]; plannedQuantity = $_[1] } }) } }
function Approved($token, [string]$name, $items) {
  $p = Call 'POST' '/api/production/plans' $token (Plan $name $items); if ($p.Code -ne 200) { throw "Lập KH lỗi: $($p.Text)" }
  $id = $p.Json.summary.productionPlanId; $null = Call 'POST' "/api/production/plans/$id/submit" $token; $null = Call 'POST' "/api/production/plans/$id/approve" $token; $id
}
function Send-Concurrent([object[]]$requests) {
  $tasks = foreach ($rq in $requests) {
    $client = New-Object System.Net.Http.HttpClient
    $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $rq.token)
    $client.PostAsync("$Base$($rq.path)", (New-Object System.Net.Http.StringContent(($rq.body | ConvertTo-Json -Depth 8 -Compress), [Text.Encoding]::UTF8, 'application/json')))
  }
  [System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tasks)
  @($tasks | ForEach-Object { [pscustomobject]@{ Code = [int]$_.Result.StatusCode; Body = $_.Result.Content.ReadAsStringAsync().Result } })
}

$admin = Login 'admin'; $mgr = Login 'manager01'; $prod = Login 'prodstaff01'
$mat = NewProduct $admin 'P5MAT' 'RAW_MATERIAL' 1000
$fg = NewProduct $admin 'P5FG' 'FINISHED' 0; NewBom $admin $fg 1 $mat
$fgBig = NewProduct $admin 'P5FGBIG' 'FINISHED' 0; NewBom $admin $fgBig 100000000 $mat
$semi = NewProduct $admin 'P5SEMI' 'SEMI_FINISHED' 0; NewBom $admin $semi 1 $mat

# ─── V-01 Thiếu ngày ────────────────────────────────────────────────────────
$before = Sql 'select count(*) from stockflow.trx_production_plans;'
$r = Raw 'POST' '/api/production/plans' $mgr "{`"planName`":`"P5 thieu ngay`",`"notes`":null,`"items`":[{`"productId`":$fg,`"plannedQuantity`":5,`"warehouseId`":null,`"notes`":null}]}"
$after = Sql 'select count(*) from stockflow.trx_production_plans;'
Check 'VT-01' 'Thiếu ngày kỳ và ngày dòng → 400, không lưu (V-01)' ($r.Code -eq 400 -and (ErrText $r) -match 'ngày bắt đầu kỳ' -and (ErrText $r) -match 'ngày bắt đầu của dòng' -and $before -eq $after) "$(Msg $r) | KH $before→$after"
$r = Raw 'POST' '/api/production/plans' $mgr "{`"planName`":`"P5 ngay sai`",`"periodStart`":`"2026-02-31`",`"periodEnd`":`"2026-03-31`",`"notes`":null,`"items`":[]}"
Check 'VT-02' 'Ngày không tồn tại 31/02 → 400 (frontend dịch thông báo, V-11)' ($r.Code -eq 400) "$($r.Code)"
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 nam la' @(,(Item $fg 5 '0001-01-01' '9999-12-31')) '0001-01-01' '9999-12-31')
Check 'VT-03' 'Năm 0001 / 9999 → 400 (Q-V8)' ($r.Code -eq 400 -and (ErrText $r) -match '2000 – 2100') (Msg $r)

# ─── V-04 / Q-V7 Số lượng quá lớn, tràn nhu cầu ─────────────────────────────
$r = Raw 'POST' '/api/production/plans' $mgr "{`"planName`":`"P5 so lon`",`"periodStart`":`"$today`",`"periodEnd`":`"$future`",`"notes`":null,`"items`":[{`"productId`":$fg,`"plannedQuantity`":100000000000000000,`"plannedStartDate`":`"$today`",`"plannedEndDate`":`"$future`",`"warehouseId`":null,`"notes`":null}]}"
Check 'VT-04' 'Số lượng 1e17 → 400 thay vì 500 (Q-V7)' ($r.Code -eq 400 -and (ErrText $r) -match '999.999.999,99') (Msg $r)
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 vuot toi da' @(,(Item $fg 1000000000)))
Check 'VT-05' 'Số lượng 1.000.000.000 → 400 (Q-V7)' ($r.Code -eq 400) (Msg $r)
$idBig = Approved $mgr 'P5 tran nhu cau' @(,(Item $fgBig 999999999.99))
$r = Call 'POST' "/api/production/plans/$idBig/orders" $mgr (OrderBody @(,@($fgBig, 999999999.99)))
Check 'VT-06' 'Lập lệnh từ KH: nhu cầu tràn numeric(18,2) → 400 thay vì 500 (V-04)' ($r.Code -eq 400 -and (ErrText $r) -match 'giới hạn lưu trữ') (Msg $r)
$r = Call 'POST' '/api/production/orders' $mgr @{ productId = $fgBig; plannedQuantity = 1000000000000; deadline = $future; workshop = 'X'; notes = 'truc tiep' }
Check 'VT-07' 'Lập lệnh trực tiếp (UC-59): nhu cầu tràn → 400 thay vì 500 (V-04)' ($r.Code -eq 400 -and (ErrText $r) -match 'giới hạn lưu trữ') (Msg $r)

# ─── V-10 Tên trim ──────────────────────────────────────────────────────────
$r = Call 'POST' '/api/production/plans' $mgr (Plan (' ' + ('a' * 150) + ' ') @(,(Item $fg 5)))
Check 'VT-08' 'Tên 150 ký tự + dấu cách hai đầu → lưu được, tên đã trim (V-10)' ($r.Code -eq 200 -and $r.Json.summary.planName.Length -eq 150) "$($r.Code) len=$($r.Json.summary.planName.Length)"

# ─── Q-V2 Loại hàng ─────────────────────────────────────────────────────────
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 NVL' @(,(Item $mat 5)))
Check 'VT-09' 'Nguyên vật liệu không đưa vào kế hoạch được, báo mã hàng (Q-V2)' ($r.Code -eq 400 -and (ErrText $r) -match 'P5MAT') (Msg $r)
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 ban thanh pham' @(,(Item $semi 5)))
Check 'VT-10' 'Bán thành phẩm đưa vào kế hoạch được (Q-V2)' ($r.Code -eq 200) (Msg $r)
$r = Call 'GET' '/api/production/lookups/products?search=P5&productTypes=FINISHED,SEMI_FINISHED' $mgr
$codes = @($r.Json | ForEach-Object { $_.productCode })
Check 'VT-11' 'Tra cứu productTypes=FINISHED,SEMI_FINISHED không trả NVL, có bán thành phẩm' ($r.Code -eq 200 -and ($codes -contains 'P5SEMI') -and -not ($codes -contains 'P5MAT')) "$($r.Code) $($codes -join ',')"

# ─── Q-V1 Kỳ đã qua ─────────────────────────────────────────────────────────
$ps = (Get-Date).AddDays(-60).ToString('yyyy-MM-dd'); $pe = (Get-Date).AddDays(-30).ToString('yyyy-MM-dd')
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 ky qua' @(,(Item $fg 5 $ps $pe)) $ps $pe)
Check 'VT-12' 'Kỳ đã qua, không ghi chú → 400 (Q-V1)' ($r.Code -eq 400 -and (ErrText $r) -match 'đã kết thúc trước hôm nay') (Msg $r)
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 ky qua co ly do' @(,(Item $fg 5 $ps $pe)) $ps $pe 'Nhap bu ke hoach da san xuat')
$idPast = $r.Json.summary.productionPlanId
Check 'VT-13' 'Kỳ đã qua có lý do → lưu được (Q-V1)' ($r.Code -eq 200) (Msg $r)
$null = Sql "update stockflow.trx_production_plans set notes = null where production_plan_id = $idPast;"
$r = Call 'POST' "/api/production/plans/$idPast/submit" $mgr
Check 'VT-14' 'Gửi duyệt kế hoạch kỳ đã qua mà mất ghi chú → 400 (Q-V1)' ($r.Code -eq 400 -and (ErrText $r) -match 'đã kết thúc trước hôm nay') (Msg $r)

# ─── Q-V4 Chỉ người lập / người duyệt sửa, gửi duyệt ────────────────────────
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 cua manager' @(,(Item $fg 5)))
$idM = $r.Json.summary.productionPlanId
$r = Call 'PUT' "/api/production/plans/$idM" $prod (Plan 'P5 cua manager' @(,(Item $fg 6)))
$r2 = Call 'POST' "/api/production/plans/$idM/submit" $prod
$d = (Call 'GET' "/api/production/plans/$idM" $prod).Json
Check 'VT-15' 'Kế toán SX không sửa / gửi duyệt kế hoạch nháp của người khác; actions khớp (Q-V4)' ($r.Code -eq 400 -and $r2.Code -eq 400 -and (ErrText $r) -match 'người lập' -and $d.actions.canEdit -eq $false -and $d.actions.canSubmit -eq $false) "sửa=$(Msg $r) | gửi=$($r2.Code) | canEdit=$($d.actions.canEdit)"

# ─── Q-V5 Hai người cùng sửa ────────────────────────────────────────────────
$r = Call 'POST' '/api/production/plans' $prod (Plan 'P5 sua dong thoi' @(,(Item $fg 5)))
$idC = $r.Json.summary.productionPlanId; $v0 = $r.Json.summary.updatedAt
$a = Plan 'P5 sua dong thoi' @(,(Item $fg 10)); $a.expectedUpdatedAt = $v0
$b = Plan 'P5 sua dong thoi' @(,(Item $fg 5)) $today $future 'B sua ghi chu'; $b.expectedUpdatedAt = $v0
$ra = Call 'PUT' "/api/production/plans/$idC" $prod $a
$rb = Call 'PUT' "/api/production/plans/$idC" $mgr $b
$qty = Sql "select planned_quantity from stockflow.dtl_production_plan_items where production_plan_id = $idC;"
Check 'VT-16' 'Người lưu sau với bản cũ bị từ chối, không ghi đè (Q-V5)' ($ra.Code -eq 200 -and $rb.Code -eq 400 -and (ErrText $rb) -match 'tải lại' -and [decimal]$qty -eq 10) "A=$($ra.Code) B=$(Msg $rb) | DB SL=$qty"
$c = Plan 'P5 sua dong thoi' @(,(Item $fg 12)); $c.expectedUpdatedAt = $ra.Json.summary.updatedAt
$rc = Call 'PUT' "/api/production/plans/$idC" $prod $c
Check 'VT-17' 'Sửa với phiên bản mới nhất → lưu được; chi tiết có người / thời điểm cập nhật' ($rc.Code -eq 200 -and $rc.Json.summary.updatedByName -and $rc.Json.summary.updatedAt -ne $ra.Json.summary.updatedAt) "$($rc.Code) by=$($rc.Json.summary.updatedByName) at=$($rc.Json.summary.updatedAt)"

# ─── V-08 Hàng ngừng hoạt động sau khi lưu nháp ─────────────────────────────
$fgOff = NewProduct $admin 'P5FGOFF' 'FINISHED' 0; NewBom $admin $fgOff 1 $mat
$r = Call 'POST' '/api/production/plans' $mgr (Plan 'P5 hang ngung' @(,(Item $fgOff 5)))
$idOff = $r.Json.summary.productionPlanId
$t = Call 'PATCH' "/api/products/$fgOff/toggle-status" $admin
$r = Call 'POST' "/api/production/plans/$idOff/submit" $mgr
Check 'VT-18' 'Hàng ngừng hoạt động sau khi lưu nháp → gửi duyệt báo lỗi nêu mã (V-08)' ($t.Code -eq 200 -and $r.Code -eq 400 -and (ErrText $r) -match 'P5FGOFF') "khóa hàng=$($t.Code) | $(Msg $r)"

# ─── Q-V6 Lập lệnh từ kế hoạch chống trùng bằng clientRequestId ─────────────
$idR = Approved $mgr 'P5 chong trung' @(,(Item $fg 100))
$req = [guid]::NewGuid().ToString()
$res = Send-Concurrent @(@{ token = $mgr; path = "/api/production/plans/$idR/orders"; body = (OrderBody @(,@($fg, 30)) $req) }, @{ token = $mgr; path = "/api/production/plans/$idR/orders"; body = (OrderBody @(,@($fg, 30)) $req) })
$ids = @($res | ForEach-Object { ($_.Body | ConvertFrom-Json).summary.productionOrderId })
$cnt = Sql "select count(*) from stockflow.trx_production_orders where production_plan_id = $idR;"
Check 'VT-19' 'Bấm lập lệnh 2 lần (30 / còn 100) cùng mã yêu cầu → 1 lệnh, cả hai nhận cùng lệnh (Q-V6)' (($res | Where-Object { $_.Code -eq 200 }).Count -eq 2 -and $ids[0] -eq $ids[1] -and $cnt -eq '1') "codes=$(($res | ForEach-Object { $_.Code }) -join ',') ids=$($ids -join ',') lệnh=$cnt"
$r = Call 'POST' "/api/production/plans/$idR/orders" $mgr (OrderBody @(,@($fg, 30)) $req)
$cnt2 = Sql "select count(*) from stockflow.trx_production_orders where production_plan_id = $idR;"
Check 'VT-20' 'Gửi lại sau đó với cùng mã → trả lệnh cũ, không tạo thêm' ($r.Code -eq 200 -and $r.Json.summary.productionOrderId -eq $ids[0] -and $cnt2 -eq '1') "$($r.Code) id=$($r.Json.summary.productionOrderId) lệnh=$cnt2"
$idR2 = Approved $mgr 'P5 chong trung 2' @(,(Item $fg 10))
$r = Call 'POST' "/api/production/plans/$idR2/orders" $mgr (OrderBody @(,@($fg, 5)) $req)
Check 'VT-21' 'Dùng lại mã yêu cầu cho kế hoạch khác → 400' ($r.Code -eq 400 -and (ErrText $r) -match 'Mã yêu cầu') (Msg $r)
$r = Call 'POST' "/api/production/plans/$idR/orders" $mgr (OrderBody @(,@($fg, 30)) ([guid]::NewGuid().ToString()))
$cnt3 = Sql "select count(*) from stockflow.trx_production_orders where production_plan_id = $idR;"
Check 'VT-22' 'Mã yêu cầu mới → tạo lệnh mới bình thường' ($r.Code -eq 200 -and $cnt3 -eq '2') "$($r.Code) lệnh=$cnt3"

$pass = ($results | Where-Object Pass).Count; $fail = ($results | Where-Object { -not $_.Pass }).Count
Write-Host "TỔNG: $($results.Count) | PASS: $pass | FAIL: $fail"
$results | ConvertTo-Json -Depth 3 | Out-File (Join-Path $dir 'results-validation.json') -Encoding utf8
