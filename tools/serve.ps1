# Dependency-free local static server for the Pure Taste site.
# Usage: powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\public")).Path
$mime = @{
  ".html" = "text/html; charset=utf-8"; ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"; ".mjs" = "text/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"; ".svg" = "image/svg+xml"
  ".png" = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg"; ".webp" = "image/webp"
  ".ico" = "image/x-icon"; ".woff2" = "font/woff2"; ".glb" = "model/gltf-binary"
  ".txt" = "text/plain; charset=utf-8"; ".xml" = "application/xml"; ".webmanifest" = "application/manifest+json"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/ (Ctrl+C to stop)"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request; $res = $ctx.Response
    try {
      $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart("/")
      $path = [IO.Path]::GetFullPath((Join-Path $root $rel))
      # Never serve anything outside public/
      if (-not $path.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) { $path = $null }
      elseif (Test-Path $path -PathType Container) { $path = Join-Path $path "index.html" }
      elseif (-not (Test-Path $path) -and -not [IO.Path]::HasExtension($path)) { $path = "$path.html" }

      $status = 200
      if (-not $path -or -not (Test-Path $path -PathType Leaf)) { $status = 404; $path = Join-Path $root "404.html" }
      $bytes = [IO.File]::ReadAllBytes($path)
      $ext = [IO.Path]::GetExtension($path).ToLower()
      $res.StatusCode = $status
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $res.Headers.Add("Cache-Control", "no-cache")
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Host "$status $($req.HttpMethod) $($req.Url.AbsolutePath)"
    } catch {
      Write-Host "500 $($req.Url.AbsolutePath): $_"
      try { $res.StatusCode = 500 } catch {}
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
