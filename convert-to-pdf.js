const puppeteer = require('puppeteer');
const path = require('path');

async function convertHTMLToPDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Charger le fichier HTML
  const htmlPath = path.join(__dirname, 'STRATEGIE_MONETISATION_IA_SYNAURA.html');
  await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
  
  // Attendre que le contenu soit chargé
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Générer le PDF
  await page.pdf({
    path: 'STRATEGIE_MONETISATION_IA_SYNAURA.pdf',
    format: 'A4',
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    printBackground: true,
    preferCSSPageSize: true
  });
  
  console.log('PDF généré avec succès !');
  await browser.close();
}

convertHTMLToPDF().catch(console.error);
