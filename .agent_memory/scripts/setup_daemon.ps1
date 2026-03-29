Write-Host "Setting up Kage Background Daemon for Windows Startup..."

# Get the absolute path to the Windows User's Startup Folder
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = "$startupFolder\kage_daemon.vbs"

# $PSScriptRoot is dynamically the folder this script is running from
# This ensures it works no matter where the developer cloned the repo!
$repoDir = $PSScriptRoot

# Create the invisible VBScript wrapper that uses pythonw.exe
$scriptContent = "Set WshShell = CreateObject(""WScript.Shell"")`r`n"
$scriptContent += "WshShell.Run ""pythonw.exe """"$repoDir\session_watcher.py"""""", 0, False"

# Write the VBScript into the Startup Folder
Set-Content -Path $vbsPath -Value $scriptContent

Write-Host "✅ Daemon successfully injected into Windows Startup ($vbsPath)!"
Write-Host "✅ Starting Kage daemon right now in the background..."

# Execute it immediately so they don't have to reboot
wscript.exe $vbsPath

Write-Host "Done! The silent daemon is now monitoring your AI sessions."
