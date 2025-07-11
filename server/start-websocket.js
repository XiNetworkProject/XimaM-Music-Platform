const WebSocketServer = require('./websocket');

console.log('🚀 Démarrage du serveur WebSocket...');

const wss = new WebSocketServer(3001);
wss.start();

console.log('✅ Serveur WebSocket démarré sur le port 3001');
console.log('📡 Prêt à recevoir les connexions WebSocket');

// Gestion de l'arrêt propre
process.on('SIGINT', () => {
  console.log('\n🛑 Arrêt du serveur WebSocket...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Arrêt du serveur WebSocket...');
  process.exit(0);
}); 