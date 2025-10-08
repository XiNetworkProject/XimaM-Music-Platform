# Script PowerShell pour créer les prix de lancement Stripe via API REST
# 
# Prérequis : Avoir STRIPE_SECRET_KEY configuré
# 
# Usage : .\scripts\create-stripe-launch-prices.ps1

Write-Host "🚀 Création des prix de lancement Synaura..." -ForegroundColor Cyan
Write-Host ""

# Charger la clé Stripe depuis .env.local
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Fichier .env.local non trouvé. Crée-le d'abord avec STRIPE_SECRET_KEY" -ForegroundColor Red
    exit 1
}

$stripeKey = (Get-Content $envFile | Where-Object { $_ -match "^STRIPE_SECRET_KEY=" }) -replace "STRIPE_SECRET_KEY=", ""

if (-not $stripeKey) {
    Write-Host "❌ STRIPE_SECRET_KEY non trouvée dans .env.local" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $stripeKey"
    "Content-Type" = "application/x-www-form-urlencoded"
}

try {
    # ========== PRODUIT STARTER ==========
    Write-Host "📦 Création du produit Starter..." -ForegroundColor Yellow
    
    $starterBody = "name=Synaura Starter (Offre de Lancement)&description=Plan Starter avec 60% de réduction - Offre de lancement limitée&metadata[plan]=starter&metadata[launch_offer]=true&metadata[discount]=60%"
    $starterProduct = Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" -Method Post -Headers $headers -Body $starterBody
    Write-Host "✅ Produit Starter créé: $($starterProduct.id)" -ForegroundColor Green
    
    # Prix mensuel Starter (1,99€)
    $starterMonthlyBody = "product=$($starterProduct.id)&unit_amount=199&currency=eur&recurring[interval]=month&nickname=Starter Mensuel (Lancement -60%)&metadata[plan]=starter&metadata[period]=month&metadata[launch_offer]=true&metadata[original_price]=4.99&metadata[discount]=60%"
    $starterMonthly = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Method Post -Headers $headers -Body $starterMonthlyBody
    Write-Host "✅ Prix Starter Mensuel: $($starterMonthly.id)" -ForegroundColor Green
    
    # Prix annuel Starter (19,16€)
    $starterYearlyBody = "product=$($starterProduct.id)&unit_amount=1916&currency=eur&recurring[interval]=year&nickname=Starter Annuel (Lancement -60%)&metadata[plan]=starter&metadata[period]=year&metadata[launch_offer]=true&metadata[original_price]=47.90&metadata[discount]=60%"
    $starterYearly = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Method Post -Headers $headers -Body $starterYearlyBody
    Write-Host "✅ Prix Starter Annuel: $($starterYearly.id)" -ForegroundColor Green

    # ========== PRODUIT PRO ==========
    Write-Host ""
    Write-Host "📦 Création du produit Pro..." -ForegroundColor Yellow
    
    $proBody = "name=Synaura Pro (Offre de Lancement)&description=Plan Pro avec 50% de réduction - Offre de lancement limitée&metadata[plan]=pro&metadata[launch_offer]=true&metadata[discount]=50%"
    $proProduct = Invoke-RestMethod -Uri "https://api.stripe.com/v1/products" -Method Post -Headers $headers -Body $proBody
    Write-Host "✅ Produit Pro créé: $($proProduct.id)" -ForegroundColor Green
    
    # Prix mensuel Pro (7,49€)
    $proMonthlyBody = "product=$($proProduct.id)&unit_amount=749&currency=eur&recurring[interval]=month&nickname=Pro Mensuel (Lancement -50%)&metadata[plan]=pro&metadata[period]=month&metadata[launch_offer]=true&metadata[original_price]=14.99&metadata[discount]=50%"
    $proMonthly = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Method Post -Headers $headers -Body $proMonthlyBody
    Write-Host "✅ Prix Pro Mensuel: $($proMonthly.id)" -ForegroundColor Green
    
    # Prix annuel Pro (71,95€)
    $proYearlyBody = "product=$($proProduct.id)&unit_amount=7195&currency=eur&recurring[interval]=year&nickname=Pro Annuel (Lancement -50%)&metadata[plan]=pro&metadata[period]=year&metadata[launch_offer]=true&metadata[original_price]=143.90&metadata[discount]=50%"
    $proYearly = Invoke-RestMethod -Uri "https://api.stripe.com/v1/prices" -Method Post -Headers $headers -Body $proYearlyBody
    Write-Host "✅ Prix Pro Annuel: $($proYearly.id)" -ForegroundColor Green

    # ========== RÉSUMÉ ==========
    Write-Host ""
    Write-Host "🎉 ========== PRIX DE LANCEMENT CRÉÉS AVEC SUCCÈS ! ==========" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Ajoute ces variables dans ton fichier .env.local :" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "# Prix de lancement Stripe" -ForegroundColor Gray
    Write-Host "NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTH_LAUNCH=$($starterMonthly.id)" -ForegroundColor White
    Write-Host "NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEAR_LAUNCH=$($starterYearly.id)" -ForegroundColor White
    Write-Host "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTH_LAUNCH=$($proMonthly.id)" -ForegroundColor White
    Write-Host "NEXT_PUBLIC_STRIPE_PRICE_PRO_YEAR_LAUNCH=$($proYearly.id)" -ForegroundColor White
    Write-Host ""
    Write-Host "✅ Tous les prix de lancement ont été créés !" -ForegroundColor Green
    Write-Host "📊 Prix créés :" -ForegroundColor Cyan
    Write-Host "   - Starter Mensuel : 1,99€/mois (-60%)" -ForegroundColor White
    Write-Host "   - Starter Annuel : 19,16€/an (-60%)" -ForegroundColor White
    Write-Host "   - Pro Mensuel : 7,49€/mois (-50%)" -ForegroundColor White
    Write-Host "   - Pro Annuel : 71,95€/an (-50%)" -ForegroundColor White
    Write-Host ""
    Write-Host "🎁 Les premiers abonnés conserveront ces prix à vie !" -ForegroundColor Yellow

} catch {
    Write-Host "❌ Erreur lors de la création des prix:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
}

createLaunchPrices

