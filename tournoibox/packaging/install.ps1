# Installation de TournoiBox pour l'utilisateur courant (aucun droit administrateur nécessaire).
# Les données (tournois, sauvegardes) sont rangées à part, dans %LOCALAPPDATA%\TournoiBox : une mise à jour ne les touche pas.
param(
  [Parameter(Mandatory = $true)][string]$Zip,
  [string]$InstallDir = "$env:LOCALAPPDATA\Programs\TournoiBox",
  [switch]$NoShortcuts,
  [switch]$Quiet
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName PresentationFramework

try {
  # Une version déjà lancée depuis ce dossier est arrêtée avant la mise à jour
  Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$InstallDir\*" } | Stop-Process -Force
  Start-Sleep -Milliseconds 500

  if (Test-Path $InstallDir) { Remove-Item $InstallDir -Recurse -Force }
  New-Item -ItemType Directory -Force $InstallDir | Out-Null
  & "$env:WINDIR\System32\tar.exe" -xf $Zip -C $InstallDir
  if ($LASTEXITCODE -ne 0) { throw "Décompression impossible ($LASTEXITCODE)" }

  $version = (Get-Content "$InstallDir\version.txt" -ErrorAction SilentlyContinue) -join ""
  $vbs = "$InstallDir\TournoiBox.vbs"
  $icon = "$InstallDir\tournoibox.ico"

  if (-not $NoShortcuts) {
    $shell = New-Object -ComObject WScript.Shell
    $targets = @([Environment]::GetFolderPath("Desktop"), "$env:APPDATA\Microsoft\Windows\Start Menu\Programs")
    foreach ($folder in $targets) {
      $lnk = $shell.CreateShortcut("$folder\TournoiBox.lnk")
      $lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
      $lnk.Arguments = "`"$vbs`""
      $lnk.WorkingDirectory = $InstallDir
      $lnk.IconLocation = $icon
      $lnk.Description = "Organiser un tournoi sur place, sans internet"
      $lnk.Save()
    }
    # Entrée « Applications installées » de Windows, pour désinstaller proprement
    $key = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\TournoiBox"
    New-Item -Path $key -Force | Out-Null
    Set-ItemProperty $key DisplayName "TournoiBox"
    Set-ItemProperty $key DisplayVersion $version
    Set-ItemProperty $key Publisher "TournoiBox"
    Set-ItemProperty $key DisplayIcon $icon
    Set-ItemProperty $key InstallLocation $InstallDir
    Set-ItemProperty $key UninstallString "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
    Set-ItemProperty $key NoModify 1 -Type DWord
    Set-ItemProperty $key NoRepair 1 -Type DWord
  }

  if (-not $Quiet) {
    [System.Windows.MessageBox]::Show("TournoiBox $version est installé.`n`nUne icône a été ajoutée sur le bureau. TournoiBox va s'ouvrir dans votre navigateur.", "TournoiBox") | Out-Null
    Start-Process "$env:WINDIR\System32\wscript.exe" "`"$vbs`""
  }
} catch {
  if ($Quiet) { throw }
  [System.Windows.MessageBox]::Show("L'installation a échoué : $($_.Exception.Message)", "TournoiBox") | Out-Null
  exit 1
}
