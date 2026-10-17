# Désinstallation de TournoiBox. Les tournois et sauvegardes sont conservés sauf si l'utilisateur demande à les effacer.
$ErrorActionPreference = "SilentlyContinue"
Add-Type -AssemblyName PresentationFramework
$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = "$env:LOCALAPPDATA\TournoiBox"

$ok = [System.Windows.MessageBox]::Show("Désinstaller TournoiBox ?", "TournoiBox", "YesNo", "Question")
if ($ok -ne "Yes") { exit 0 }

Get-Process node | Where-Object { $_.Path -like "$InstallDir\*" } | Stop-Process -Force
Start-Sleep -Milliseconds 500
Remove-Item "$([Environment]::GetFolderPath('Desktop'))\TournoiBox.lnk" -Force
Remove-Item "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\TournoiBox.lnk" -Force
Remove-Item "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\TournoiBox" -Recurse -Force

$wipe = [System.Windows.MessageBox]::Show("Effacer aussi les tournois et les sauvegardes ?`n`n(Non conseillé si vous comptez réinstaller TournoiBox : choisissez Non pour les garder dans $DataDir)", "TournoiBox", "YesNo", "Warning")
if ($wipe -eq "Yes") { Remove-Item $DataDir -Recurse -Force }

# Le dossier du programme est supprimé une fois ce script terminé
Start-Process cmd -ArgumentList "/c timeout /t 2 >nul & rmdir /s /q `"$InstallDir`"" -WindowStyle Hidden
[System.Windows.MessageBox]::Show("TournoiBox a été désinstallé.", "TournoiBox") | Out-Null
