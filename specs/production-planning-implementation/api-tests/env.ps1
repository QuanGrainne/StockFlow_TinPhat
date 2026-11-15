param([Parameter(Mandatory)] [string]$DbName)
$Db = $DbName
# Đặt biến môi trường trỏ API / dotnet ef / psql vào database thử $Db (không phải stockflow_dev).
# Không in chuỗi kết nối ra màn hình.
if ($Db -eq 'stockflow_dev') { throw 'Không dùng database dev cho kiểm thử.' }
$apiDir = 'D:\DO_AN_26-10\StockFlow_TinPhat\StockFlow_Backend\StockFlow.API'
$cfgFile = if (Test-Path "$apiDir\appsettings.Development.json") { "$apiDir\appsettings.Development.json" } else { "$apiDir\appsettings.json" }
$cfg = Get-Content $cfgFile -Raw -Encoding UTF8 | ConvertFrom-Json
$cs = $cfg.ConnectionStrings.StockFlowDb
$parts = @{}
foreach ($p in $cs.Split(';')) { if ($p -match '^\s*([^=]+?)\s*=\s*(.*)$') { $parts[$Matches[1].ToLower()] = $Matches[2] } }
$newCs = ($cs -replace '(?i)(Database\s*=\s*)[^;]+', "`${1}$Db")
$env:ConnectionStrings__StockFlowDb = $newCs
$env:PGHOST = if ($parts['host']) { $parts['host'] } elseif ($parts['server']) { $parts['server'] } else { 'localhost' }
$env:PGPORT = if ($parts['port']) { $parts['port'] } else { '5432' }
$env:PGUSER = if ($parts['username']) { $parts['username'] } elseif ($parts['user id']) { $parts['user id'] } else { $parts['user'] }
$env:PGPASSWORD = $parts['password']
$env:PGDATABASE = $Db
$env:PGCLIENTENCODING = 'UTF8'
