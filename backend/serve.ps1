param(
    [int]$Port = 8080,
    [string]$RootDir = ""
)

if ([string]::IsNullOrWhiteSpace($RootDir)) {
    $RootDir = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($PSScriptRoot, ".."))
}

$frontendDir = [System.IO.Path]::Combine($RootDir, "frontend")
$modelsDir = [System.IO.Path]::Combine($RootDir, "models", "3d")

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Error "Failed to start listener on $prefix : $_"
    exit 1
}

Write-Output "=================================================="
Write-Output "  AERO-TWIN Platform HTTP Server"
Write-Output "  Listening on: $prefix"
Write-Output "  Serving from: $RootDir"
Write-Output "  Dashboard:    http://localhost:$Port/overview.html"
Write-Output "=================================================="

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".glb"  = "model/gltf-binary"
    ".gltf" = "model/gltf+json"
    ".bin"  = "application/octet-stream"
    ".wasm" = "application/wasm"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }

        # Normalize relative path
        $relPath = $urlPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
        $fileName = [System.IO.Path]::GetFileName($relPath)

        # Resolve path across structured folders
        $fullPath = ""

        if ($urlPath.StartsWith("/models/")) {
            $candidate = [System.IO.Path]::Combine($modelsDir, $fileName)
            if (Test-Path -Path $candidate -PathType Leaf) { $fullPath = $candidate }
        } elseif ($urlPath.StartsWith("/assets/")) {
            $c1 = [System.IO.Path]::Combine($frontendDir, "assets", $fileName)
            $c2 = [System.IO.Path]::Combine($frontendDir, "nine-systems", "assets", $fileName)
            $c3 = [System.IO.Path]::Combine($frontendDir, "piston", "dist", "assets", $fileName)
            if (Test-Path -Path $c1 -PathType Leaf) { $fullPath = $c1 }
            elseif (Test-Path -Path $c2 -PathType Leaf) { $fullPath = $c2 }
            elseif (Test-Path -Path $c3 -PathType Leaf) { $fullPath = $c3 }
        } elseif ($urlPath.StartsWith("/draco/")) {
            $candidate = [System.IO.Path]::Combine($frontendDir, "draco", $fileName)
            if (Test-Path -Path $candidate -PathType Leaf) { $fullPath = $candidate }
        } elseif ($urlPath.StartsWith("/js/")) {
            $candidate = [System.IO.Path]::Combine($frontendDir, "js", $fileName)
            if (Test-Path -Path $candidate -PathType Leaf) { $fullPath = $candidate }
        } elseif ($urlPath.StartsWith("/css/")) {
            $candidate = [System.IO.Path]::Combine($frontendDir, "css", $fileName)
            if (Test-Path -Path $candidate -PathType Leaf) { $fullPath = $candidate }
        }

        # Fallback check in frontend directory or root directory
        if ([string]::IsNullOrEmpty($fullPath) -or -not (Test-Path -Path $fullPath -PathType Leaf)) {
            $candFrontend = [System.IO.Path]::Combine($frontendDir, $relPath)
            $candRoot = [System.IO.Path]::Combine($RootDir, $relPath)
            if (Test-Path -Path $candFrontend -PathType Leaf) {
                $fullPath = $candFrontend
            } elseif (Test-Path -Path $candRoot -PathType Leaf) {
                $fullPath = $candRoot
            }
        }

        # Add CORS
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "*")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        if ((-not [string]::IsNullOrEmpty($fullPath)) -and (Test-Path -Path $fullPath -PathType Leaf)) {
            $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }
            $response.ContentType = $mime

            $fileStream = [System.IO.File]::OpenRead($fullPath)
            $response.ContentLength64 = $fileStream.Length

            if ($request.HttpMethod -ne "HEAD") {
                $fileStream.CopyTo($response.OutputStream)
            }
            $fileStream.Dispose()
            $response.StatusCode = 200
        } else {
            $response.StatusCode = 404
            if ($request.HttpMethod -ne "HEAD") {
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.ContentLength64 = $errBytes.Length
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
        }
        $response.Close()
    } catch {
        # continue loop on client abort
    }
}
