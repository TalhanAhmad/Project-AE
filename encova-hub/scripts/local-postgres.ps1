param([ValidateSet('setup','start','stop','status')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$toolsRoot = Join-Path $workspaceRoot '.tools/postgresql-17.11'
$localRoot = Join-Path $workspaceRoot '.local/postgres'
$dataRoot = Join-Path $localRoot 'data'
$credentialsPath = Join-Path $localRoot 'credentials.json'
$pgCtl = Join-Path $toolsRoot 'bin/pg_ctl.exe'
$psql = Join-Path $toolsRoot 'bin/psql.exe'
$port = 55432

function New-LocalPassword {
  $bytes = New-Object byte[] 32
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
  return ([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()
}

function Invoke-LocalSql([string]$Database, [string]$Sql) {
  $sqlPath = Join-Path $localRoot 'bootstrap.sql'
  [IO.File]::WriteAllText($sqlPath, $Sql, [Text.UTF8Encoding]::new($false))
  $previousPassword = $env:PGPASSWORD
  try {
    $env:PGPASSWORD = $credentials.admin
    & $psql -X -h 127.0.0.1 -p $port -U encova_admin -d $Database -v ON_ERROR_STOP=1 -q -f $sqlPath
    if ($LASTEXITCODE -ne 0) { throw 'Local database setup SQL failed.' }
  } finally {
    $env:PGPASSWORD = $previousPassword
    if (Test-Path -LiteralPath $sqlPath) { Remove-Item -LiteralPath $sqlPath }
  }
}

if (-not (Test-Path -LiteralPath $pgCtl)) {
  if ($Action -ne 'setup') { throw 'Database binaries missing. Run db:setup first.' }
  $archivePath = Join-Path $workspaceRoot '.tools/postgresql-17.11.zip'
  New-Item -ItemType Directory -Path (Split-Path -Parent $archivePath) -Force | Out-Null
  if (-not (Test-Path -LiteralPath $archivePath)) {
    & curl.exe --fail --location --silent --show-error --output $archivePath 'https://get.enterprisedb.com/postgresql/postgresql-17.11-5-windows-x64-binaries.zip'
    if ($LASTEXITCODE -ne 0) { throw 'Official EDB binary download failed.' }
  }
  $expectedArchiveHash = '80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F'
  if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash -ne $expectedArchiveHash) {
    throw 'Database archive bytes differ from the pinned download. Extraction was not started.'
  }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
  try {
    foreach ($entry in $archive.Entries) {
      if ($entry.FullName -notmatch '^pgsql/(bin|lib|share)/' -or $entry.FullName.EndsWith('/')) { continue }
      $target = [IO.Path]::GetFullPath((Join-Path $toolsRoot $entry.FullName.Substring(6)))
      if (-not $target.StartsWith($toolsRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid archive path.' }
      New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
      if (-not (Test-Path -LiteralPath $target)) { [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$false) }
    }
  } finally { $archive.Dispose() }
}

if ($Action -eq 'stop') {
  & $pgCtl -D $dataRoot stop -m fast -w
  exit $LASTEXITCODE
}
if ($Action -eq 'status') {
  & $pgCtl -D $dataRoot status
  exit $LASTEXITCODE
}

if ($Action -eq 'start' -and -not (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
  throw 'Database is not initialized. Run db:setup first.'
}
New-Item -ItemType Directory -Path $localRoot -Force | Out-Null
if (-not (Test-Path -LiteralPath $credentialsPath)) {
  if (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION')) { throw 'Existing cluster has no matching credentials file; refusing to replace it.' }
  $credentials = @{ admin=New-LocalPassword; migration=New-LocalPassword; application=New-LocalPassword; test=New-LocalPassword }
  [IO.File]::WriteAllText($credentialsPath,($credentials | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
} else { $credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json }
foreach ($key in @('admin','migration','application','test')) {
  if ($credentials.$key -notmatch '^[a-f0-9]{64}$') { throw 'Unexpected local credential format; no database SQL was executed.' }
}

if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'PG_VERSION'))) {
  $passwordPath = Join-Path $localRoot 'init-password.txt'
  [IO.File]::WriteAllText($passwordPath,$credentials.admin,[Text.UTF8Encoding]::new($false))
  try {
    & (Join-Path $toolsRoot 'bin/initdb.exe') -D $dataRoot -U encova_admin --pwfile=$passwordPath --auth=scram-sha-256 --encoding=UTF8 --locale=C
    if ($LASTEXITCODE -ne 0) { throw 'Database initialization failed.' }
  } finally { if (Test-Path -LiteralPath $passwordPath) { Remove-Item -LiteralPath $passwordPath } }
}

& $pgCtl -D $dataRoot status *> $null
if ($LASTEXITCODE -ne 0) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { throw 'Database port is already in use; existing listener was not changed.' }
  & $pgCtl -D $dataRoot -l (Join-Path $localRoot 'postgres.log') -o "-h 127.0.0.1 -p $port" start -w
  if ($LASTEXITCODE -ne 0) { throw 'Local PostgreSQL did not start.' }
}
if ($Action -eq 'start') { Write-Output 'Local PostgreSQL is running on 127.0.0.1:55432.'; exit 0 }

# Passwords are generated as hex, so these literals cannot contain SQL syntax.
# Application credentials cannot own/create/drop tables. Test DB is separate.
Invoke-LocalSql 'postgres' @"
SELECT 'CREATE ROLE encova_migrate LOGIN PASSWORD ''$($credentials.migration)'' NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='encova_migrate')\gexec
SELECT 'CREATE ROLE encova_app LOGIN PASSWORD ''$($credentials.application)'' NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='encova_app')\gexec
SELECT 'CREATE ROLE encova_test LOGIN PASSWORD ''$($credentials.test)'' NOSUPERUSER NOCREATEDB NOCREATEROLE' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname='encova_test')\gexec
SELECT 'CREATE DATABASE encova_hub OWNER encova_migrate' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='encova_hub')\gexec
SELECT 'CREATE DATABASE encova_hub_test OWNER encova_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='encova_hub_test')\gexec
REVOKE CONNECT ON DATABASE encova_hub FROM PUBLIC;
GRANT CONNECT ON DATABASE encova_hub TO encova_migrate, encova_app;
REVOKE CONNECT ON DATABASE encova_hub_test FROM PUBLIC;
GRANT CONNECT ON DATABASE encova_hub_test TO encova_test;
"@
Invoke-LocalSql 'encova_hub' @'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO encova_app;
ALTER DEFAULT PRIVILEGES FOR ROLE encova_migrate IN SCHEMA public REVOKE ALL ON TABLES FROM encova_app;
DO $$ BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON TABLE public._prisma_migrations FROM encova_app;
  END IF;
END $$;
'@

$envPath = Join-Path $workspaceRoot 'encova-hub/.env'
if (-not (Test-Path -LiteralPath $envPath)) {
  $envText = "DATABASE_URL=postgresql://encova_app:$($credentials.application)@127.0.0.1:$port/encova_hub`nMIGRATION_DATABASE_URL=postgresql://encova_migrate:$($credentials.migration)@127.0.0.1:$port/encova_hub`nTEST_DATABASE_URL=postgresql://encova_test:$($credentials.test)@127.0.0.1:$port/encova_hub_test`n"
  [IO.File]::WriteAllText($envPath,$envText,[Text.UTF8Encoding]::new($false))
} else { Write-Output 'Existing .env preserved; verify its connection configuration separately.' }
Write-Output 'Local PostgreSQL setup complete. Credentials and data are ignored local files.'
