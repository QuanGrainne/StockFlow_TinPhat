param([string]$Base = 'http://localhost:5196')
# R-05 (07-code-review, Q-R2: chặn): duyệt kế hoạch kiểm lại thành phẩm / BOM như lúc gửi duyệt.
# Chạy độc lập (dữ liệu mã P6*) trên database thử (không dùng database dev). Cần env.ps1 để đối chiếu DB bằng psql.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
if ($env:PGDATABASE -eq 'stockflow_dev' -or -not $env:PGDATABASE) { throw 'Cần chạy env.ps1 với database thử trước.' }
$results = New-Object System.Collections.ArrayList

function Call([string]$method, [string]$path, $token, $body = $null) {
  $req = [System.Net.HttpWebRequest]::Create("$Base$path"); $req.Method = $method; $req.ContentType = 'application/json; charset=utf-8'
  if ($token) { $req.Headers.Add('Authorization', "Bearer $token") }
  if ($null -ne $body) { $b = [Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 8 -Compress)); $s = $req.GetRequestStream(); $s.Write($b, 0, $b.Length); $s.Close() }
  elseif ($method -ne 'GET') { $req.ContentLength = 0 }
  try { $resp = $req.GetResponse() } catch [System.Net.WebException] { $resp = $_.Exception.Response }
  $sr = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8); $t = $sr.ReadToEnd(); $sr.Close(); $c = [int]$resp.StatusCode; $resp.Close()
  $j = $null; try { $j = $t | ConvertFrom-Json } catch {}
  [pscustomobject]@{ Code = $c; Json = $j; Text = $t }
}
function Msg($r) { if ($r.Json -and $r.Json.message) { "$($r.Code) $($r.Json.message)" } else { "$($r.Code)" } }
function Login([string]$u) { $r = Call 'POST' '/api/auth/login' $null @{ username = $u; password = 'TinPhat@2026' }; if ($r.Code -ne 200) { throw "Đăng nhập $u lỗi" }; $r.Json.token }
function Check([string]$id, [string]$name, [bool]$ok, [string]$actual) {
  [void]$results.Add([pscustomobject]@{ Id = $id; Name = $name; Pass = $ok; Actual = $actual })
  Write-Host "$(if ($ok) { 'PASS' } else { 'FAIL' }) $id $name -> $actual"
}
function Status([int]$id) { (& $psql -w -tAc "select status from stockflow.trx_production_plans where production_plan_id = $id;") -join '' }
function NewProduct($token, [string]$code, [string]$type, [decimal]$stock) {
  $r = Call 'POST' '/api/products' $token @{ code = $code; name = "SP $code"; type = $type; categoryName = 'Test'; uom = 'Cai'; standardPrice = 1; costPrice = 1; initialStock = $stock; initialWarehouseId = 3 }
  if ($r.Code -ge 300) { throw "Tạo hàng $code lỗi: $($r.Text)" }; [int]($r.Json.productId, $r.Json.id | Where-Object { $_ } | Select-Object -First 1)
}
function NewBom($token, [int]$productId, [int]$mat, [string]$version) {
  $r = Call 'POST' '/api/production/boms' $token @{ productId = $productId; bomCode = "BOM-P6-$productId-$version"; version = $version; description = 'p6'; items = @(@{ materialId = $mat; quantity = 1; wastageRate = 0 }); activate = $true }
  if ($r.Code -ge 300) { throw "Tạo BOM lỗi: $($r.Text)" }; [int]$r.Json.summary.bomId
}
$today = (Get-Date).ToString('yyyy-MM-dd'); $future = (Get-Date).AddDays(40).ToString('yyyy-MM-dd')
function Submitted($token, [string]$name, [int[]]$productIds) {
  $items = @($productIds | ForEach-Object { @{ productId = $_; plannedQuantity = 10; plannedStartDate = $today; plannedEndDate = $future; warehouseId = $null; notes = $null } })
  $p = Call 'POST' '/api/production/plans' $token @{ planName = $name; periodStart = $today; periodEnd = $future; notes = $null; items = $items }
  if ($p.Code -ne 200) { throw "Lập KH lỗi: $($p.Text)" }
  $id = $p.Json.summary.productionPlanId
  $s = Call 'POST' "/api/production/plans/$id/submit" $token
  if ($s.Json.summary.status -ne 'PENDING_APPROVAL') { throw "Gửi duyệt lỗi: $($s.Text)" }; $id
}

$admin = Login 'admin'; $mgr = Login 'manager01'; $prod = Login 'prodstaff01'
$mat = NewProduct $admin 'P6MAT' 'RAW_MATERIAL' 100
$fgA = NewProduct $admin 'P6FGA' 'FINISHED' 0; $bomA = NewBom $admin $fgA $mat 'v1'
$fgB = NewProduct $admin 'P6FGB' 'FINISHED' 0; $null = NewBom $admin $fgB $mat 'v1'
$fgC = NewProduct $admin 'P6FGC' 'FINISHED' 0; $null = NewBom $admin $fgC $mat 'v1'

# RT-01 / RT-02: BOM bị ngừng trong lúc chờ duyệt
$id1 = Submitted $prod 'P6 BOM ngung' @($fgA, $fgB)
$null = Call 'POST' "/api/production/boms/$bomA/deactivate" $admin
$r = Call 'POST' "/api/production/plans/$id1/approve" $mgr
Check 'RT-01' 'BOM bị ngừng sau khi gửi duyệt → chặn duyệt, nêu mã, vẫn Chờ duyệt' ($r.Code -eq 400 -and $r.Json.message -match 'Không duyệt được' -and $r.Json.message -match 'P6FGA' -and $r.Json.message -notmatch 'P6FGB' -and (Status $id1) -eq 'PENDING_APPROVAL') "$(Msg $r) | DB=$(Status $id1)"
$null = Call 'POST' "/api/production/boms/$bomA/activate" $admin
$r = Call 'POST' "/api/production/plans/$id1/approve" $mgr
Check 'RT-02' 'Kích hoạt lại BOM → duyệt được' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'APPROVED') "$(Msg $r)"

# RT-03 / RT-04: thành phẩm bị ngừng hoạt động trong lúc chờ duyệt; vẫn từ chối được để người lập sửa
$fgOff = NewProduct $admin 'P6FGOFF' 'FINISHED' 0; $null = NewBom $admin $fgOff $mat 'v1'
$id2 = Submitted $prod 'P6 hang ngung' @($fgOff, $fgC)
$t = Call 'PATCH' "/api/products/$fgOff/toggle-status" $admin
$r = Call 'POST' "/api/production/plans/$id2/approve" $mgr
Check 'RT-03' 'Thành phẩm bị ngừng hoạt động sau khi gửi duyệt → chặn duyệt, nêu mã' ($t.Code -eq 200 -and $r.Code -eq 400 -and $r.Json.message -match 'P6FGOFF' -and (Status $id2) -eq 'PENDING_APPROVAL') "khóa hàng=$($t.Code) | $(Msg $r)"
$r = Call 'POST' "/api/production/plans/$id2/reject" $mgr @{ reason = 'Thanh pham P6FGOFF da ngung, sua lai ke hoach' }
Check 'RT-04' 'Kế hoạch bị chặn duyệt vẫn từ chối được để người lập sửa' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'REJECTED') "$(Msg $r)"

# RT-05: BOM được thay bằng phiên bản mới (bản cũ tự ngừng) → vẫn có BOM đang áp dụng → duyệt được
$id3 = Submitted $prod 'P6 doi phien ban BOM' @(,$fgC)
$null = NewBom $admin $fgC $mat 'v2'
$r = Call 'POST' "/api/production/plans/$id3/approve" $mgr
Check 'RT-05' 'Đổi sang BOM phiên bản mới trong lúc chờ duyệt → vẫn duyệt được' ($r.Code -eq 200 -and $r.Json.summary.status -eq 'APPROVED') "$(Msg $r)"

# RT-06: kế hoạch đã duyệt lập lệnh được ngay (mục đích của R-05)
$r = Call 'POST' "/api/production/plans/$id1/orders" $mgr @{ productId = 0; plannedQuantity = 0; deadline = $null; workshop = 'X'; notes = 'P6'; items = @(@{ productId = $fgA; plannedQuantity = 10 }, @{ productId = $fgB; plannedQuantity = 10 }) }
Check 'RT-06' 'Kế hoạch vừa duyệt lập lệnh được cho mọi thành phẩm' ($r.Code -eq 200) "$(Msg $r)"

$pass = ($results | Where-Object Pass).Count; $fail = ($results | Where-Object { -not $_.Pass }).Count
Write-Host "TỔNG: $($results.Count) | PASS: $pass | FAIL: $fail"
$results | ConvertTo-Json -Depth 3 | Out-File (Join-Path $dir 'results-approve.json') -Encoding utf8
