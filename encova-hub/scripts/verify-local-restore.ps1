$ErrorActionPreference = 'Stop'
$workspaceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$toolsRoot = Join-Path $workspaceRoot '.tools/postgresql-17.11/bin'
$credentialsPath = Join-Path $workspaceRoot '.local/postgres/credentials.json'
$pgDump = Join-Path $toolsRoot 'pg_dump.exe'; $pgRestore = Join-Path $toolsRoot 'pg_restore.exe'
$createdb = Join-Path $toolsRoot 'createdb.exe'; $dropdb = Join-Path $toolsRoot 'dropdb.exe'; $psql = Join-Path $toolsRoot 'psql.exe'
foreach ($path in @($pgDump, $pgRestore, $createdb, $dropdb, $psql, $credentialsPath)) { if (-not (Test-Path -LiteralPath $path)) { throw "Missing local restore prerequisite: $path" } }

$credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
foreach ($key in @('admin', 'migration', 'application')) { if ($credentials.$key -notmatch '^[a-f0-9]{64}$') { throw 'Unexpected local credential format; restore was not started.' } }
$suffix = [Guid]::NewGuid().ToString('N').Substring(0, 12)
$target = "encova_restore_$suffix"; $backup = Join-Path $workspaceRoot ".local/restore-$suffix.dump"
if ($target -notmatch '^encova_restore_[a-f0-9]{12}$') { throw 'Unsafe temporary database name.' }
$port = 55432; $previousPassword = $env:PGPASSWORD; $created = $false
function Invoke-Pg([string]$Password, [string[]]$Arguments) { $env:PGPASSWORD = $Password; & $psql @Arguments; if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL verification command failed.' } }
try {
  $env:PGPASSWORD = $credentials.migration
  & $pgDump -Fc -h 127.0.0.1 -p $port -U encova_migrate -d encova_hub -f $backup
  if ($LASTEXITCODE -ne 0) { throw 'Backup command failed.' }
  $env:PGPASSWORD = $credentials.admin
  & $createdb -h 127.0.0.1 -p $port -U encova_admin -O encova_migrate $target
  if ($LASTEXITCODE -ne 0) { throw 'Temporary restore database creation failed.' }; $created = $true
  $env:PGPASSWORD = $credentials.migration
  & $pgRestore -h 127.0.0.1 -p $port -U encova_migrate -d $target --exit-on-error --no-owner $backup
  if ($LASTEXITCODE -ne 0) { throw 'Restore command failed.' }
  $countsSql = "SELECT 'activity_logs',count(*) FROM activity_logs UNION ALL SELECT 'clients',count(*) FROM clients UNION ALL SELECT 'comments',count(*) FROM comments UNION ALL SELECT 'projects',count(*) FROM projects UNION ALL SELECT 'tasks',count(*) FROM tasks UNION ALL SELECT 'users',count(*) FROM users ORDER BY 1;"
  $source = (Invoke-Pg $credentials.migration @('-X','-A','-t','-h','127.0.0.1','-p',$port,'-U','encova_migrate','-d','encova_hub','-c',$countsSql)) -join "`n"
  $restored = (Invoke-Pg $credentials.migration @('-X','-A','-t','-h','127.0.0.1','-p',$port,'-U','encova_migrate','-d',$target,'-c',$countsSql)) -join "`n"
  if ($source -ne $restored) { throw 'Restored row counts differ from the backup source.' }
  Invoke-Pg $credentials.application @('-X','-A','-t','-h','127.0.0.1','-p',$port,'-U','encova_app','-d',$target,'-c','SELECT count(*) FROM projects;') | Out-Null
  Write-Output 'Local backup and separate-database restore passed: row counts matched and the runtime account read projects.'
} finally {
  $env:PGPASSWORD = $credentials.admin
  if ($created) { & $dropdb -h 127.0.0.1 -p $port -U encova_admin --if-exists $target; if ($LASTEXITCODE -ne 0) { throw 'Temporary restore database cleanup failed.' } }
  if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
  $env:PGPASSWORD = $previousPassword
}
