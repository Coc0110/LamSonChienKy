$zipPath = 'C:\Users\admin\Downloads\Han Zi VH.zip'
$outDir = 'public\fonts'
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)

foreach ($entry in $zip.Entries) {
    if ($entry.Name -eq 'TP Han Zi.ttf' -or $entry.Name -eq 'TP Han Zi.otf') {
        $destPath = Join-Path $outDir $entry.Name
        Write-Host "Extracting $($entry.Name) to $destPath ..."
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destPath, $true)
    }
}

$zip.Dispose()
Get-ChildItem -Path $outDir
