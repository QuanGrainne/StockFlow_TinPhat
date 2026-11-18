param([string]$Base = 'http://localhost:5196')
# Kiểm thử API MRP (specs/mrp/review/08_MRP_TEST_PLAN.md) trên database THỬ (không dùng stockflow_dev).
# Cần chạy specs/production-planning-implementation/api-tests/env.ps1 -DbName <db thử> trước, API chạy ở $Base.
# Ngày tương đối: T = hôm nay (giờ máy, Việt Nam). Mỗi nhóm dùng NVL mã riêng (M8*) nên không ảnh hưởng nhau / dữ liệu seed.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
if ($env:PGDATABASE -eq 'stockflow_dev' -or -not $env:PGDATABASE) { throw 'Cần chạy env.ps1 với database thử trước.' }
$results = New-Object System.Collections.ArrayList
$WH = 3

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
function Must($r, [string]$what) { if ($r.Code -ge 300) { throw "$what lỗi: $($r.Text)" }; $r.Json }
function Login([string]$u) { $r = Call 'POST' '/api/auth/login' $null @{ username = $u; password = 'TinPhat@2026' }; if ($r.Code -ne 200) { throw "Đăng nhập $u lỗi" }; $r.Json.token }
function Check([string]$id, [string]$name, [bool]$ok, [string]$actual) {
  [void]$results.Add([pscustomobject]@{ Id = $id; Name = $name; Pass = $ok; Actual = $actual })
  Write-Host "$(if ($ok) { 'PASS' } else { 'FAIL' }) $id $name -> $actual"
}
function D([int]$n) { (Get-Date).Date.AddDays($n).ToString('yyyy-MM-dd') }

$admin = Login 'admin'; $mgr = Login 'manager01'; $prod = Login 'prodstaff01'; $sales = Login 'sales01'
$tag = (Get-Date).ToString('HHmmss')

function Product([string]$code, [string]$type, [decimal]$stock, $lead = $null) {
  $body = @{ code = "M8$code$tag"; name = "MRP $code"; type = $type; categoryName = 'Test MRP'; uom = 'Cai'; standardPrice = 1; costPrice = 1; initialStock = $stock; initialWarehouseId = $WH }
  if ($null -ne $lead) { $body.leadTimeDays = $lead }
  $j = Must (Call 'POST' '/api/products' $admin $body) "Tạo hàng $code"
  [pscustomobject]@{ Id = [int]$j.productId; Code = $j.code }
}
function Bom([int]$fg, [object[]]$lines) {
  $items = @($lines | ForEach-Object { @{ materialId = $_[0]; quantity = $_[1]; wastageRate = 0 } })
  (Must (Call 'POST' '/api/production/boms' $admin @{ productId = $fg; bomCode = "BOM-M8-$fg"; version = 'v1'; description = 'mrp'; items = $items; activate = $true }) 'Tạo BOM').summary.bomId
}
function ApprovedPlan([string]$name, [object[]]$lines) {
  $items = @($lines | ForEach-Object { @{ productId = $_[0]; plannedQuantity = $_[1]; plannedStartDate = (D $_[2]); plannedEndDate = (D $_[2]); warehouseId = $null; notes = $null } })
  $p = Must (Call 'POST' '/api/production/plans' $prod @{ planName = $name; periodStart = (D 0); periodEnd = (D 30); notes = $null; items = $items }) "Lập KH $name"
  $id = $p.summary.productionPlanId
  $null = Must (Call 'POST' "/api/production/plans/$id/submit" $prod) "Gửi duyệt $name"
  $a = Must (Call 'POST' "/api/production/plans/$id/approve" $mgr) "Duyệt $name"
  [pscustomobject]@{ Id = $id; Code = $a.summary.planCode }
}
function RunMrp([int]$days = 30) { Must (Call 'POST' '/api/production/mrp/runs' $mgr @{ periodEnd = (D $days); warehouseIds = @($WH); includePendingPlans = $false }) 'Chạy MRP' }
function Shortage($run, [int]$mat) { @((Must (Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)/shortages" $mgr) 'NVL thiếu') | Where-Object { $_.materialId -eq $mat }) | Select-Object -First 1 }
function Sugg($run, [int]$mat) { @((Must (Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)/purchase-suggestions" $mgr) 'Đề xuất') | Where-Object { $_.materialId -eq $mat }) }
function Proj($run, [int]$mat) { Must (Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)/materials/$mat/projection" $mgr) 'Tồn dự phóng' }
function Row($proj, [int]$n) { @($proj.rows | Where-Object { $_.date -eq (D $n) }) | Select-Object -First 1 }
function PorText($proj) { ($proj.rows | Where-Object { $_.plannedReceipt -gt 0 } | ForEach-Object { "$($_.date): $($_.plannedReceipt) đặt $($_.plannedReleaseDate)" }) -join '; ' }
$supplier = @((Must (Call 'GET' '/api/Suppliers' $admin) 'NCC'))[0].partnerId
function NewPo([int]$mat, [decimal]$qty, $expected, [int]$orderDays = 0) {
  $body = @{ warehouseId = $WH; partnerId = $supplier; orderDate = (Get-Date).Date.AddDays($orderDays).AddHours(8).ToString('s'); status = 'ORDERED'; notes = 'MRP test'
             items = @(@{ productId = $mat; quantity = $qty; unitPrice = 1; discountPercent = 0 }); discountAmount = 0; expectedDate = $expected }
  Call 'POST' '/api/purchase-orders' $admin $body
}

# ═══ Nhóm A: ví dụ Bàn / Ghế (file 03 mục 6, TH1) ═══════════════════════════════
$aWood = Product 'AWOOD' 'RAW_MATERIAL' 300 3; $aPaint = Product 'APAINT' 'RAW_MATERIAL' 150 2
$aScrew = Product 'ASCREW' 'RAW_MATERIAL' 800 1; $aGlue = Product 'AGLUE' 'RAW_MATERIAL' 1000 1
$aTable = Product 'ATABLE' 'FINISHED' 50; $aChair = Product 'ACHAIR' 'FINISHED' 0
$null = Bom $aTable.Id @(@($aWood.Id, 5), @($aPaint.Id, 1), @($aScrew.Id, 10), @($aGlue.Id, 1))
$null = Bom $aChair.Id @(@($aWood.Id, 2), @($aPaint.Id, 0.5), @($aScrew.Id, 8))
$planA = ApprovedPlan 'MRP A ban ghe' @(@($aTable.Id, 100, 4), @($aChair.Id, 200, 6))
$runA = RunMrp
Check 'MT-01' 'Chạy MRP: có mã lần chạy, người chạy, kỳ từ hôm nay' ($runA.runCode -match '^MRP' -and $runA.periodStart -eq (D 0) -and $runA.runByName) "$($runA.runCode) $($runA.periodStart)..$($runA.periodEnd) $($runA.runByName)"
$p = Proj $runA $aWood.Id
Check 'MT-02' 'Gỗ: tồn đầu 300; thiếu 200 ngày T+4 (đặt T+1), 400 ngày T+6 (đặt T+3)' ($p.openingBalance -eq 300 -and (Row $p 4).netRequirement -eq 200 -and (Row $p 4).plannedReleaseDate -eq (D 1) -and (Row $p 6).netRequirement -eq 400 -and (Row $p 6).plannedReleaseDate -eq (D 3) -and (Row $p 6).projectedBalance -eq -600) (PorText $p)
$p = Proj $runA $aPaint.Id
Check 'MT-03' 'Sơn: đủ ngày T+4, thiếu 50 ngày T+6 (đặt T+4)' ((Row $p 4).netRequirement -eq 0 -and (Row $p 6).netRequirement -eq 50 -and (Row $p 6).plannedReleaseDate -eq (D 4)) (PorText $p)
$p = Proj $runA $aScrew.Id
Check 'MT-04' 'Ốc vít: thiếu 200 (đặt T+3) và 1.600 (đặt T+5)' ((Row $p 4).netRequirement -eq 200 -and (Row $p 4).plannedReleaseDate -eq (D 3) -and (Row $p 6).netRequirement -eq 1600 -and (Row $p 6).plannedReleaseDate -eq (D 5)) (PorText $p)
$s = Shortage $runA $aWood.Id
$aff = ($s.affected | ForEach-Object { "$($_.type) $($_.code) $($_.productCode) $($_.shortageQty)" }) -join '; '
Check 'MT-05' 'NVL thiếu gỗ: tổng 600, thiếu từ T+4, chỉ ra kế hoạch / thành phẩm bị thiếu (Bàn 200, Ghế 400)' ($s.totalNetRequirement -eq 600 -and $s.firstShortageDate -eq (D 4) -and @($s.affected | Where-Object { $_.code -eq $planA.Code -and $_.productCode -eq $aTable.Code -and $_.shortageQty -eq 200 }).Count -eq 1 -and @($s.affected | Where-Object { $_.productCode -eq $aChair.Code -and $_.shortageQty -eq 400 }).Count -eq 1 -and $s.onHand -eq 300) $aff
Check 'MT-06' 'Keo (đủ tồn) không nằm trong danh sách thiếu' ($null -eq (Shortage $runA $aGlue.Id)) 'keo đủ'
$daily = @((Must (Call 'GET' "/api/production/mrp/runs/$($runA.mrpRunId)/daily-requirements?materialId=$($aWood.Id)" $mgr) 'Theo ngày'))
$d4 = @($daily | Where-Object { $_.date -eq (D 4) })[0]
Check 'MT-07' 'Nhu cầu theo ngày: gỗ T+4 = 500, nguồn KH + Bàn' ($daily.Count -eq 2 -and $d4.grossRequirement -eq 500 -and $d4.sources[0].type -eq 'PLAN' -and $d4.sources[0].code -eq $planA.Code -and $d4.sources[0].productCode -eq $aTable.Code) "$($daily.Count) dòng; T+4 $($d4.grossRequirement) từ $($d4.sources[0].type) $($d4.sources[0].code)"
$m = Must (Call 'GET' "/api/production/mrp/runs/$($runA.mrpRunId)/monthly-demand?bucket=month" $mgr) 'Theo tháng'
$w = Must (Call 'GET' "/api/production/mrp/runs/$($runA.mrpRunId)/monthly-demand?bucket=week" $mgr) 'Theo tuần'
$mw = @($m.materials | Where-Object { $_.materialId -eq $aWood.Id })[0]; $ww = @($w.materials | Where-Object { $_.materialId -eq $aWood.Id })[0]
Check 'MT-08' 'Gom tháng và tuần: tổng gỗ đều 900, số cột tuần ≥ 5' ($mw.total -eq 900 -and $ww.total -eq 900 -and $w.buckets.Count -ge 5 -and ($ww.quantities | Measure-Object -Sum).Sum -eq 900) "tháng $($mw.total) [$($m.buckets -join ',')]; tuần $($ww.total) ($($w.buckets.Count) cột)"
$sg = @(Sugg $runA $aWood.Id)
Check 'MT-09' 'Đề xuất mua gỗ: 2 dòng 200 / 400, kịp đặt' ($sg.Count -eq 2 -and ($sg | Measure-Object suggestedQty -Sum).Sum -eq 600 -and @($sg | Where-Object { $_.status -ne 'ON_TIME' }).Count -eq 0) (($sg | ForEach-Object { "$($_.suggestedQty)/$($_.releaseDate)/$($_.status)" }) -join '; ')
$r = Call 'GET' "/api/production/mrp/runs/$($runA.mrpRunId)/materials/$($aTable.Id)/projection" $mgr
Check 'MT-10' 'Thành phẩm có tồn (Bàn) không bị kéo vào MRP như NVL' ($r.Code -eq 400) (Msg $r)
Check 'MT-11' 'Số NVL của lần chạy chỉ gồm NVL có nhu cầu (không gồm mọi hàng có tồn)' ($runA.materialCount -lt 40) "materialCount=$($runA.materialCount)"

# ═══ Nhóm B: đơn đặt hàng nhập (BR-MRP-11..14) ════════════════════════════════
$bWood = Product 'BWOOD' 'RAW_MATERIAL' 300 3; $bDesk = Product 'BDESK' 'FINISHED' 0; $bBench = Product 'BBENCH' 'FINISHED' 0
$null = Bom $bDesk.Id @(, @($bWood.Id, 5)); $null = Bom $bBench.Id @(, @($bWood.Id, 2))
$null = ApprovedPlan 'MRP B don dat' @(@($bDesk.Id, 100, 4), @($bBench.Id, 200, 6))
$po1 = NewPo $bWood.Id 250 (D 3)
Check 'MT-12' 'Lập đơn đặt có ngày giao dự kiến; xem lại trả đúng ngày' ($po1.Code -eq 200 -and (Must (Call 'GET' "/api/purchase-orders/$($po1.Json.poId)" $admin) 'Đơn').expectedDate -eq (D 3)) (Msg $po1)
$run = RunMrp; $p = Proj $run $bWood.Id
Check 'MT-13' 'Đơn 250 về T+3 (trước ngày cần): T+4 đủ (còn 50), T+6 thiếu 350' ((Row $p 3).scheduledReceipt -eq 250 -and (Row $p 4).netRequirement -eq 0 -and (Row $p 4).projectedBalance -eq 50 -and (Row $p 6).netRequirement -eq 350) (PorText $p)
$detail = Must (Call 'GET' "/api/purchase-orders/$($po1.Json.poId)" $admin) 'Đơn'
$upd = Call 'PUT' "/api/purchase-orders/$($po1.Json.poId)" $admin @{ partnerId = $supplier; orderDate = $detail.orderDate; status = 'ORDERED'; notes = 'MRP test'; items = @(@{ productId = $bWood.Id; quantity = 250; unitPrice = 1; discountPercent = 0 }); discountAmount = 0; expectedDate = (D 5) }
$stale = Must (Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)" $mgr) 'Tổng quan'
Check 'MT-14' 'Sửa đơn đặt sau khi chạy → lần chạy cũ báo lỗi thời' ($upd.Code -eq 200 -and $stale.isStale -and ($stale.staleReasons -join ' ') -match 'Đơn đặt') (($stale.staleReasons) -join ' | ')
$run = RunMrp; $p = Proj $run $bWood.Id
Check 'MT-15' 'Đơn dời về T+5 (sau ngày cần đầu): thiếu 200 ngày T+4, 150 ngày T+6' ((Row $p 4).netRequirement -eq 200 -and (Row $p 5).scheduledReceipt -eq 250 -and (Row $p 6).netRequirement -eq 150) (PorText $p)
$rc = Call 'POST' "/api/purchase-orders/$($po1.Json.poId)/receive" $admin @{ receivedDate = $null; paidAmount = 0; paymentMethod = 'CASH'; notes = 'MRP test'; lines = @(@{ productId = $bWood.Id; quantity = 100; defectQuantity = 0 }) }
$run = RunMrp; $p = Proj $run $bWood.Id
Check 'MT-16' 'Nhận 100 của đơn 250: tồn 400, còn chờ 150 (không tính hai lần); thiếu 100 + 250 = 350' ($rc.Code -eq 200 -and $p.openingBalance -eq 400 -and (Row $p 5).scheduledReceipt -eq 150 -and (Row $p 4).netRequirement -eq 100 -and (Row $p 6).netRequirement -eq 250) "$(Msg $rc) | $(PorText $p)"
$po2 = NewPo $bWood.Id 500 (D 2)
$run = RunMrp
Check 'MT-17' 'Thêm đơn 500 về T+2: gỗ B hết thiếu' ($null -eq (Shortage $run $bWood.Id)) 'không thiếu'
$cx = Call 'POST' "/api/purchase-orders/$($po2.Json.poId)/cancel" $admin
$run = RunMrp; $s = Shortage $run $bWood.Id
Check 'MT-18' 'Hủy đơn 500 → thiếu lại 350' ($cx.Code -eq 200 -and $s.totalNetRequirement -eq 350) "$(Msg $cx) | thiếu $($s.totalNetRequirement)"
$po3 = NewPo $bWood.Id 77 $null
$run = RunMrp; $s = Shortage $run $bWood.Id
Check 'MT-19' 'Đơn không có ngày giao: hiện "đặt chưa rõ ngày" 77, không trừ vào thiếu' ($po3.Code -eq 200 -and $s.onOrderWithoutDate -eq 77 -and $s.totalNetRequirement -eq 350) "chưa rõ ngày $($s.onOrderWithoutDate), thiếu $($s.totalNetRequirement)"
$bad = NewPo $bWood.Id 10 (D -1) 0
Check 'MT-20' 'Ngày giao dự kiến trước ngày đặt → 400' ($bad.Code -eq 400 -and $bad.Json.message -match 'Ngày giao dự kiến') (Msg $bad)

# ═══ Nhóm C: thời gian giao, trễ, thiếu BOM, hủy kế hoạch ══════════════════════
$cMat = Product 'CMAT' 'RAW_MATERIAL' 0; $cMat2 = Product 'CMAT2' 'RAW_MATERIAL' 0 3
$cFg1 = Product 'CFG1' 'FINISHED' 0; $cFg2 = Product 'CFG2' 'FINISHED' 0; $cFg3 = Product 'CFG3' 'FINISHED' 0
$null = Bom $cFg1.Id @(, @($cMat.Id, 1)); $null = Bom $cFg2.Id @(, @($cMat2.Id, 1)); $cBom3 = Bom $cFg3.Id @(, @($cMat2.Id, 1))
$planC = ApprovedPlan 'MRP C' @(@($cFg1.Id, 10, 5), @($cFg2.Id, 10, 2), @($cFg3.Id, 5, 8))
$null = Must (Call 'POST' "/api/production/boms/$cBom3/deactivate" $admin) 'Ngừng BOM'
$run = RunMrp
$sg = @(Sugg $run $cMat.Id)
Check 'MT-21' 'NVL chưa có thời gian giao: thiếu 10, không có hạn đặt, trạng thái NO_LEAD_TIME' ($sg.Count -eq 1 -and $sg[0].suggestedQty -eq 10 -and $null -eq $sg[0].releaseDate -and $sg[0].status -eq 'NO_LEAD_TIME' -and -not (Shortage $run $cMat.Id).hasLeadTime) "$($sg[0].suggestedQty)/$($sg[0].releaseDate)/$($sg[0].status)"
$sg = @(Sugg $run $cMat2.Id)
Check 'MT-22' 'Cần T+2, thời gian giao 3 ngày → hạn đặt T−1, Trễ' ($sg.Count -eq 1 -and $sg[0].releaseDate -eq (D -1) -and $sg[0].status -eq 'LATE' -and (Shortage $run $cMat2.Id).isLate -and $run.lateCount -ge 1) "$($sg[0].releaseDate)/$($sg[0].status) lateCount=$($run.lateCount)"
Check 'MT-23' 'Thành phẩm mất BOM sau khi duyệt: liệt kê riêng, không tính nhu cầu' (@($run.productsWithoutBom | Where-Object { $_.productCode -eq $cFg3.Code }).Count -eq 1 -and (Must (Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)" $mgr) 'Tổng quan').productsWithoutBom.productCode -contains $cFg3.Code) (($run.productsWithoutBom | ForEach-Object productCode) -join ',')
$lt = Call 'PUT' "/api/products/$($cMat.Id)" $admin @{ leadTimeDays = 1 }
$run = RunMrp; $sg = @(Sugg $run $cMat.Id)
Check 'MT-24' 'Khai báo thời gian giao 1 ngày → hạn đặt T+4, kịp đặt' ($lt.Code -eq 200 -and $lt.Json.leadTimeDays -eq 1 -and $sg[0].releaseDate -eq (D 4) -and $sg[0].status -eq 'ON_TIME') "$(Msg $lt) | $($sg[0].releaseDate)/$($sg[0].status)"
$clr = Call 'PUT' "/api/products/$($cMat.Id)" $admin @{ clearLeadTime = $true }
$big = Call 'PUT' "/api/products/$($cMat.Id)" $admin @{ leadTimeDays = 400 }
Check 'MT-25' 'Xóa thời gian giao về rỗng; 400 ngày bị chặn' ($clr.Code -eq 200 -and $null -eq $clr.Json.leadTimeDays -and $big.Code -eq 400) "xóa: $($clr.Code) lead=$($clr.Json.leadTimeDays); 400 ngày: $(Msg $big)"
$cc = Call 'POST' "/api/production/plans/$($planC.Id)/cancel" $mgr @{ reason = 'MRP test huy' }
$run = RunMrp
Check 'MT-26' 'Hủy kế hoạch → nhu cầu của kế hoạch biến mất' ($cc.Code -eq 200 -and @(Sugg $run $cMat.Id).Count -eq 0 -and @(Sugg $run $cMat2.Id).Count -eq 0) (Msg $cc)

# ═══ Nhóm D: lập lệnh từ kế hoạch, sửa kế hoạch, lỗi thời ══════════════════════
$dMat = Product 'DMAT' 'RAW_MATERIAL' 0 2; $dFg = Product 'DFG' 'FINISHED' 0
$null = Bom $dFg.Id @(, @($dMat.Id, 2))
$planD = ApprovedPlan 'MRP D' @(, @($dFg.Id, 100, 5))
$run1 = RunMrp; $p1 = Proj $run1 $dMat.Id
$o = Call 'POST' "/api/production/plans/$($planD.Id)/orders" $mgr @{ productId = 0; plannedQuantity = 0; deadline = $null; workshop = 'X'; notes = 'MRP'; items = @(@{ productId = $dFg.Id; plannedQuantity = 40 }) }
$run2 = RunMrp; $p2 = Proj $run2 $dMat.Id
$src = @((Must (Call 'GET' "/api/production/mrp/runs/$($run2.mrpRunId)/daily-requirements?materialId=$($dMat.Id)" $mgr) 'Theo ngày'))[0].sources
Check 'MT-27' 'Lập lệnh 40 từ kế hoạch 100: tổng nhu cầu không đổi (200), chia KH 120 + lệnh 80 cùng ngày T+5' ($o.Code -eq 200 -and (Row $p1 5).grossRequirement -eq 200 -and (Row $p2 5).grossRequirement -eq 200 -and @($src | Where-Object { $_.type -eq 'ORDER' -and $_.quantity -eq 80 }).Count -eq 1 -and @($src | Where-Object { $_.type -eq 'PLAN' -and $_.quantity -eq 120 }).Count -eq 1) "$(Msg $o) | $(($src | ForEach-Object { "$($_.type) $($_.code) $($_.quantity)" }) -join '; ')"
$pd = Must (Call 'GET' "/api/production/plans/$($planD.Id)" $mgr) 'Chi tiết KH'
$it = $pd.items[0]
$eu = Call 'PUT' "/api/production/plans/$($planD.Id)" $mgr @{ planName = $pd.summary.planName; periodStart = $pd.summary.periodStart; periodEnd = $pd.summary.periodEnd; notes = $pd.notes; expectedUpdatedAt = $pd.summary.updatedAt
  items = @(@{ productId = $it.productId; plannedQuantity = 150; plannedStartDate = $it.plannedStartDate; plannedEndDate = $it.plannedEndDate; warehouseId = $null; notes = $null }) }
$st = Must (Call 'GET' "/api/production/mrp/runs/$($run2.mrpRunId)" $mgr) 'Tổng quan'
Check 'MT-28' 'Sửa kế hoạch sau khi chạy → lần chạy cũ báo lỗi thời, nêu mã kế hoạch' ($eu.Code -eq 200 -and $st.isStale -and ($st.staleReasons -join ' ') -match [regex]::Escape($planD.Code)) (($st.staleReasons) -join ' | ')
$run3 = RunMrp; $p3 = Proj $run3 $dMat.Id
Check 'MT-29' 'Tính lại sau khi tăng kế hoạch lên 150: nhu cầu T+5 = 110×2 + 80 = 300' ((Row $p3 5).grossRequirement -eq 300) "T+5 = $((Row $p3 5).grossRequirement)"

# ═══ Nhóm F: đơn đặt quá ngày giao chưa về (BR-MRP-14) ════════════════════════
$fMat = Product 'FMAT' 'RAW_MATERIAL' 0 1; $fFg = Product 'FFG' 'FINISHED' 0
$null = Bom $fFg.Id @(, @($fMat.Id, 1))
$null = ApprovedPlan 'MRP F' @(, @($fFg.Id, 10, 3))
$poF = NewPo $fMat.Id 10 (D -2) -5
$run = RunMrp; $p = Proj $run $fMat.Id
Check 'MT-30' 'Đơn quá ngày giao (T−2) chưa về: tính là về hôm nay, không thiếu' ($poF.Code -eq 200 -and (Row $p 0).scheduledReceipt -eq 10 -and $null -eq (Shortage $run $fMat.Id)) "$(Msg $poF) | hôm nay nhận $((Row $p 0).scheduledReceipt)"

# ═══ Nhóm E: quyền, validation ════════════════════════════════════════════════
$r = Call 'GET' '/api/production/mrp/runs' $sales
Check 'MT-31' 'Nhân viên bán hàng không xem được MRP (403)' ($r.Code -eq 403) (Msg $r)
$r = Call 'POST' '/api/production/mrp/runs' $sales @{ periodEnd = (D 30); warehouseIds = @($WH) }
Check 'MT-32' 'Nhân viên bán hàng không chạy được MRP (403)' ($r.Code -eq 403) (Msg $r)
$prodWh = @((Must (Call 'GET' '/api/warehouses/my-warehouses' $prod) 'Kho của kế toán SX'))[0].warehouseId
$r = Call 'POST' '/api/production/mrp/runs' $prod @{ periodEnd = (D 30); warehouseIds = @($prodWh) }
$r2 = Call 'POST' '/api/production/mrp/runs' $prod @{ periodEnd = (D 30); warehouseIds = @($WH) }
Check 'MT-33' 'Kế toán sản xuất chạy được MRP trên kho được phân quyền; kho không được phân quyền bị chặn' ($r.Code -eq 200 -and ($prodWh -eq $WH -or $r2.Code -eq 400)) "kho $prodWh`: $(Msg $r) | kho $WH`: $(Msg $r2)"
$view = Call 'GET' "/api/production/mrp/runs/$($run.mrpRunId)/shortages" $prod
Check 'MT-37' 'Không xem được kết quả lần chạy của kho không được phân quyền' ($prodWh -eq $WH -or $view.Code -eq 400) (Msg $view)
$r1 = Call 'POST' '/api/production/mrp/runs' $mgr @{ periodEnd = (D -1); warehouseIds = @($WH) }
$r2 = Call 'POST' '/api/production/mrp/runs' $mgr @{ periodEnd = (D 400); warehouseIds = @($WH) }
$r3 = Call 'POST' '/api/production/mrp/runs' $mgr @{ periodEnd = (D 30); warehouseIds = @() }
$r4 = Call 'POST' '/api/production/mrp/runs' $mgr @{ periodEnd = (D 30); warehouseIds = @(99999) }
Check 'MT-34' 'Validation: cuối kỳ trước hôm nay / quá 366 ngày / không chọn kho / kho không tồn tại → 400' ($r1.Code -eq 400 -and $r2.Code -eq 400 -and $r3.Code -eq 400 -and $r4.Code -eq 400) "$($r1.Code) $($r2.Code) $($r3.Code) $(Msg $r4)"
$r = Call 'GET' '/api/production/mrp/runs/999999/shortages' $mgr
Check 'MT-35' 'Lần chạy không tồn tại → 400 thông báo rõ' ($r.Code -eq 400 -and $r.Json.message -match 'Không tìm thấy') (Msg $r)
$list = @((Must (Call 'GET' '/api/production/mrp/runs' $mgr) 'Lịch sử'))
Check 'MT-36' 'Lịch sử: lần chạy mới nhất đứng đầu' ($list.Count -ge 10 -and $list[0].mrpRunId -ge $run.mrpRunId) "$($list.Count) lần chạy; đầu $($list[0].runCode)"

$pass = ($results | Where-Object Pass).Count; $fail = ($results | Where-Object { -not $_.Pass }).Count
Write-Host "TỔNG: $($results.Count) | PASS: $pass | FAIL: $fail"
$results | ConvertTo-Json -Depth 3 | Out-File (Join-Path $dir 'results-mrp.json') -Encoding utf8
