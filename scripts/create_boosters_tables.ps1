# Script PowerShell pour créer les tables de boosters
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"

# Lire le fichier SQL
$sqlContent = Get-Content -Path "scripts/create_boosters_tables.sql" -Raw

# Exécuter le SQL via l'API Supabase
$headers = @{
    "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sqlContent
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$env:SUPABASE_URL/rest/v1/rpc/exec_sql" -Method Post -Headers $headers -Body $body
    Write-Host "Tables de boosters créées avec succès !"
    Write-Host $response
} catch {
    Write-Host "Erreur lors de la création des tables :"
    Write-Host $_.Exception.Message
}
