# Script pour ajouter les prix de lancement Stripe au fichier .env.local
# Usage : .\scripts\add-stripe-prices-to-env.ps1

$envFile = ".env.local"

# Prix créés par le script précédent
$prices = @"

# Prix de lancement Stripe (Offre de lancement avec réductions)
NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH=price_1SG5oCB0X2H9DCANz6qFZpeX
NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH=price_1SG5oDB0X2H9DCANC5VVDS1g
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH=price_1SG5oDB0X2H9DCANYWG9jZDR
NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH=price_1SG5oEB0X2H9DCANNOFoHjqb
"@

if (Test-Path $envFile) {
    # Vérifier si les prix existent déjà
    $content = Get-Content $envFile -Raw
    if ($content -match "NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH") {
        Write-Host "Les prix de lancement existent deja dans .env.local" -ForegroundColor Yellow
        Write-Host "Voulez-vous les remplacer ? (O/N)" -ForegroundColor Yellow
        $response = Read-Host
        if ($response -ne "O" -and $response -ne "o") {
            Write-Host "Operation annulee" -ForegroundColor Red
            exit 0
        }
        # Supprimer les anciennes lignes
        $content = $content -replace "(?m)^NEXT_PUBLIC_STRIPE_PRICE_.*_LAUNCH=.*\r?\n", ""
    }
    
    # Ajouter les nouvelles variables
    Add-Content -Path $envFile -Value $prices
    Write-Host "Prix de lancement ajoutes a .env.local !" -ForegroundColor Green
} else {
    Write-Host "Fichier .env.local non trouve" -ForegroundColor Red
    Write-Host "Cree-le d'abord en copiant env.example" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Configuration terminee !" -ForegroundColor Green
Write-Host "Prix ajoutes :" -ForegroundColor Cyan
Write-Host "   - Starter Mensuel : 1,99 EUR/mois (price_1SG5oCB0X2H9DCANz6qFZpeX)" -ForegroundColor White
Write-Host "   - Starter Annuel : 19,16 EUR/an (price_1SG5oDB0X2H9DCANC5VVDS1g)" -ForegroundColor White
Write-Host "   - Pro Mensuel : 7,49 EUR/mois (price_1SG5oDB0X2H9DCANYWG9jZDR)" -ForegroundColor White
Write-Host "   - Pro Annuel : 71,95 EUR/an (price_1SG5oEB0X2H9DCANNOFoHjqb)" -ForegroundColor White
Write-Host ""
Write-Host "Redemarre ton serveur pour appliquer les changements !" -ForegroundColor Yellow
