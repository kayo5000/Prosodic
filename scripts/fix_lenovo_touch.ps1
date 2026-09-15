# Requires Administrator
$ErrorActionPreference = "Continue"

$logFile = "$PSScriptRoot\fix_touch_result.log"
"Starting Lenovo Yoga Book 9i Touch & Digitizer Reset at $(Get-Date)" | Out-File $logFile

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    "Relaunching elevated..." | Out-File $logFile -Append
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs -Wait
    exit
}

"Running with Administrator privileges." | Out-File $logFile -Append

try {
    # 1. Reset Touch Gate in Registry
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Wisp\Touch" -Name "TouchGate" -Value 1 -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Wisp\Touch" -Name "TouchGate" -Value 1 -Force -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Wisp\MultiTouch" -Name "MultiTouchEnabled" -Value 1 -Force -ErrorAction SilentlyContinue
    "TouchGate and MultiTouchEnabled set to 1" | Out-File $logFile -Append

    # 2. Re-map Digimon registry for both &0& and &1& enumerations
    $digimonKey = "HKLM:\SOFTWARE\Microsoft\Wisp\Pen\Digimon"
    if (-not (Test-Path $digimonKey)) {
        New-Item -Path $digimonKey -Force | Out-Null
    }

    # Map current active &1& instance IDs
    Set-ItemProperty -Path $digimonKey -Name "20-\\?\HID#VID_17EF&PID_6161&MI_03&Col01#7&181cd4dd&1&0000#{4d1e55b2-f16f-11cf-88cb-001111000030}" -Value "\\?\DISPLAY#LEN8390#4&1a7d60b0&1&UID8388688#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}" -Force
    Set-ItemProperty -Path $digimonKey -Name "20-\\?\HID#VID_17EF&PID_6161&MI_03&Col02#7&181cd4dd&1&0001#{4d1e55b2-f16f-11cf-88cb-001111000030}" -Value "\\?\DISPLAY#LEN8391#4&1a7d60b0&1&UID8392785#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}" -Force
    Set-ItemProperty -Path $digimonKey -Name "20-\\?\HID#VID_17EF&PID_6161&MI_03&Col03#7&181cd4dd&1&0002#{4d1e55b2-f16f-11cf-88cb-001111000030}" -Value "\\?\DISPLAY#LEN8390#4&1a7d60b0&1&UID8388688#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}" -Force
    Set-ItemProperty -Path $digimonKey -Name "20-\\?\HID#VID_17EF&PID_6161&MI_03&Col04#7&181cd4dd&1&0003#{4d1e55b2-f16f-11cf-88cb-001111000030}" -Value "\\?\DISPLAY#LEN8391#4&1a7d60b0&1&UID8392785#{e6f07b5f-ee97-4a90-b076-33f57bf4eaa7}" -Force
    "Digimon mappings refreshed" | Out-File $logFile -Append

    # 3. Power-cycle the Ingenic USB Touch & Digitizer device node
    "Cycling Ingenic touch hardware..." | Out-File $logFile -Append
    pnputil.exe /restart-device "HID\VID_17EF&PID_6161&MI_03&Col01\7&181cd4dd&1&0000"
    pnputil.exe /restart-device "HID\VID_17EF&PID_6161&MI_03&Col02\7&181cd4dd&1&0001"
    pnputil.exe /restart-device "USB\VID_17EF&PID_6161&MI_03\6&3A317D94&1&0003"
    pnputil.exe /scan-devices
    "Device restart commands completed" | Out-File $logFile -Append

    # 4. Clear old calibration
    tabcal.exe ClearCal DisplayID=\\.\DISPLAY1
    tabcal.exe ClearCal DisplayID=\\.\DISPLAY2
    "Calibration cleared" | Out-File $logFile -Append

    # 5. Restart Services
    Restart-Service WTabletServiceISD -Force -ErrorAction SilentlyContinue
    Restart-Service WTabletServicePro -Force -ErrorAction SilentlyContinue
    Restart-Service YB9.Service -Force -ErrorAction SilentlyContinue
    "Services restarted" | Out-File $logFile -Append

    # 6. Refresh display stack
    if (Test-Path "C:\Program Files\Lenovo\YB9App\Refresh.exe") {
        & "C:\Program Files\Lenovo\YB9App\Refresh.exe"
    }

    "Finished successfully at $(Get-Date)" | Out-File $logFile -Append
} catch {
    "Error: $_" | Out-File $logFile -Append
}
