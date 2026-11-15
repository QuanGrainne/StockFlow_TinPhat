param([string]$Base = 'http://localhost:5196')
# Bổ sung: lệnh lập từ kế hoạch đi tiếp quy trình sản xuất đang có (xuất NVL → nhập thành phẩm). Chạy sau pptest.ps1.
$ErrorActionPreference = 'Stop'
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
$admin = (Call 'POST' '/api/auth/login' $null @{ username = 'admin'; password = 'TinPhat@2026' }).Json.token
# Lệnh 1 (LSX00001, FG1 50, thuộc KHSX00001) — admin có quyền mọi kho
$order = (Call 'GET' '/api/production/orders/1?warehouseId=3' $admin).Json
$items = @($order.materials | ForEach-Object { @{ requirementId = $_.requirementId; quantity = [Math]::Min([decimal]$_.requiredQty, [decimal]$_.availableQty) } })
$r = Call 'POST' '/api/production/material-issues' $admin @{ productionOrderId = 1; warehouseId = 3; isSupplementary = $false; reason = $null; items = $items }
Write-Host "Xuất NVL: $($r.Code) $(if ($r.Code -ne 200) { $r.Text })"
$fgItem = $order.summary.items[0].productionOrderItemId
$r = Call 'POST' '/api/production/finished-goods-receipts' $admin @{ productionOrderId = 1; warehouseId = 3; locationId = $null; acceptedQuantity = 10; defectQuantity = 0; defectReason = $null; lotNumber = 'LOT-PP-1'; productionDate = '2026-11-15'; notes = 'test'; reviewNote = 'Kiem thu ke hoach'; productionOrderItemId = $fgItem; confirmExceedPlan = $false }
Write-Host "Nhập thành phẩm: $($r.Code) $(if ($r.Code -ne 200) { $r.Text })"
$plan = (Call 'GET' '/api/production/plans/1' $admin).Json
$line = $plan.items | Where-Object { $_.productCode -eq 'PPFG1' }
$o = $plan.orders | Where-Object { $_.productionOrderId -eq 1 }
$ok = ([decimal]$line.receivedQuantity -eq 10) -and ($o.status -eq 'IN_PROGRESS')
Write-Host "$(if ($ok) { 'PASS' } else { 'FAIL' }) PP-57 Lệnh từ kế hoạch chạy tiếp xuất NVL + nhập thành phẩm; kế hoạch hiện đã nhập 10 -> received=$($line.receivedQuantity) orderStatus=$($o.status)"
