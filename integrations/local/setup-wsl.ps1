# Installs the verified WSL package and VirtualMachinePlatform. Never reboots Windows.
[CmdletBinding()]
param([switch]$Elevated)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$outputDir = Join-Path $repoRoot 'artifacts/local-services'
$installer = Join-Path $outputDir 'wsl.3.0.1.0.x64.msi'
$resultPath = Join-Path $outputDir 'wsl-install-result.json'
$expectedHash = '28b1a0d013640a2ac95898ea705fa186e5b4ff767a1c1b49257161bc106599c6'
if (-not (Test-Path -LiteralPath $installer)) { throw 'Falta el instalador oficial verificado; consultar README de servicios locales.' }
if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'SHA256 incorrecto: instalación cancelada' }
$signature = Get-AuthenticodeSignature -LiteralPath $installer
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') { throw 'Firma Microsoft inválida: instalación cancelada' }
$principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    if ($Elevated) { throw 'Windows no concedió elevación; no se ha instalado nada' }
    $shell = Join-Path $env:SystemRoot 'System32/WindowsPowerShell/v1.0/powershell.exe'
    $process = Start-Process -FilePath $shell -Verb RunAs -WindowStyle Hidden -PassThru -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $PSCommandPath + '"'), '-Elevated'
    )
    Write-Output ('Instalador solicitado a Windows; PID=' + $process.Id + '. Resultado: ' + $resultPath)
    exit 0
}
$result = [ordered]@{ package = 'WSL 3.0.1 x64'; status = 'running'; startedAt = [DateTimeOffset]::UtcNow.ToString('o'); rebootRequested = $false }
function Save-Result { $result | ConvertTo-Json | Set-Content -LiteralPath $resultPath -Encoding UTF8 }
Save-Result
try {
    $logPath = Join-Path $outputDir 'wsl-msi.log'
    $msi = Start-Process -FilePath 'msiexec.exe' -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
        '/i', ('"' + $installer + '"'), '/qn', '/norestart', '/l*v', ('"' + $logPath + '"')
    )
    $result.installerExitCode = $msi.ExitCode
    if ($msi.ExitCode -notin @(0, 3010)) { throw ('MSI terminó con código ' + $msi.ExitCode + '; consultar el log local') }
    Import-Module Dism
    $feature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
    $restartNeeded = $msi.ExitCode -eq 3010 -or $feature.State -eq 'EnablePending'
    if ($feature.State -eq 'Disabled') {
        $enabled = Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
        $restartNeeded = $restartNeeded -or $enabled.RestartNeeded
    }
    $feature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
    $result.featureState = [string]$feature.State
    if ($feature.State -notin @('Enabled', 'EnablePending')) { throw ('Estado de VirtualMachinePlatform inesperado: ' + $feature.State) }
    $restartNeeded = $restartNeeded -or $feature.State -eq 'EnablePending'
    $result.status = if ($restartNeeded) { 'restart_required' } else { 'installed' }
} catch {
    $result.status = 'failed'
    $result.error = $_.Exception.Message
    throw
} finally {
    $result.finishedAt = [DateTimeOffset]::UtcNow.ToString('o')
    Save-Result
}
