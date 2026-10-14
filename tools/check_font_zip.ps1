$zipPath = 'C:\Users\admin\Downloads\Han Zi VH.zip'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
foreach ($entry in $zip.Entries) {
    Write-Host "Entry: $($entry.FullName), Size: $($entry.Length)"
}
$zip.Dispose()
