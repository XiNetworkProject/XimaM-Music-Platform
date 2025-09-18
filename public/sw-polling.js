// Service Worker pour le polling en arrière-plan
const CACHE_NAME = 'suno-polling-v1';
const POLLING_INTERVALS = {
  initial: 5000,    // 5 secondes au début
  medium: 15000,    // 15 secondes après 1 minute
  long: 30000,      // 30 secondes après 2 minutes
  max: 60000        // 1 minute après 5 minutes
};

// Stockage des tâches de polling
let pollingTasks = new Map();

// Installer le service worker
self.addEventListener('install', (event) => {
  console.log('🔄 Service Worker installé');
  self.skipWaiting();
});

// Activer le service worker
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(self.clients.claim());
});

// Gérer les messages du client
self.addEventListener('message', (event) => {
  const { type, taskId, data } = event.data;
  
  switch (type) {
    case 'START_POLLING':
      startPolling(taskId, data);
      break;
    case 'STOP_POLLING':
      stopPolling(taskId);
      break;
    case 'GET_STATUS':
      getPollingStatus(event);
      break;
  }
});

// Démarrer le polling pour une tâche
function startPolling(taskId, config) {
  if (pollingTasks.has(taskId)) {
    console.log(`⚠️ Polling déjà en cours pour ${taskId}`);
    return;
  }
  
  console.log(`🎵 Démarrage polling pour ${taskId}`);
  
  const task = {
    taskId,
    startTime: Date.now(),
    config,
    interval: null,
    attempts: 0,
    maxAttempts: 60 // 5 minutes max
  };
  
  pollingTasks.set(taskId, task);
  pollTask(task);
}

// Arrêter le polling pour une tâche
function stopPolling(taskId) {
  const task = pollingTasks.get(taskId);
  if (task && task.interval) {
    clearTimeout(task.interval);
    pollingTasks.delete(taskId);
    console.log(`🛑 Polling arrêté pour ${taskId}`);
  }
}

// Fonction de polling principale
async function pollTask(task) {
  if (task.attempts >= task.maxAttempts) {
    console.log(`⏰ Timeout polling pour ${task.taskId}`);
    notifyClient(task.taskId, { status: 'timeout', error: 'Timeout après 5 minutes' });
    pollingTasks.delete(task.taskId);
    return;
  }
  
  try {
    const response = await fetch(`/api/suno/status?taskId=${encodeURIComponent(task.taskId)}`, {
      cache: 'no-store',
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Erreur API');
    }
    
    const status = data.status;
    const tracks = data.tracks || [];
    
    console.log(`📊 Status ${task.taskId}: ${status}, ${tracks.length} tracks`);
    
    // Notifier le client
    notifyClient(task.taskId, { status, tracks, data });
    
    // Déterminer le prochain délai
    const elapsed = Date.now() - task.startTime;
    let nextDelay = POLLING_INTERVALS.initial;
    
    if (elapsed > 300000) { // 5 minutes
      nextDelay = POLLING_INTERVALS.max;
    } else if (elapsed > 120000) { // 2 minutes
      nextDelay = POLLING_INTERVALS.long;
    } else if (elapsed > 60000) { // 1 minute
      nextDelay = POLLING_INTERVALS.medium;
    }
    
    // Continuer le polling si pas terminé
    if (status !== 'SUCCESS' && status !== 'success' && status !== 'ERROR' && status !== 'error') {
      task.attempts++;
      task.interval = setTimeout(() => pollTask(task), nextDelay);
    } else {
      // Tâche terminée
      console.log(`✅ Polling terminé pour ${task.taskId}: ${status}`);
      pollingTasks.delete(task.taskId);
    }
    
  } catch (error) {
    console.error(`❌ Erreur polling ${task.taskId}:`, error);
    
    // Réessayer avec délai plus long en cas d'erreur
    task.attempts++;
    const retryDelay = Math.min(POLLING_INTERVALS.long * (task.attempts / 10), POLLING_INTERVALS.max);
    task.interval = setTimeout(() => pollTask(task), retryDelay);
  }
}

// Notifier le client
function notifyClient(taskId, data) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'POLLING_UPDATE',
        taskId,
        data
      });
    });
  });
}

// Obtenir le statut du polling
function getPollingStatus(event) {
  const status = Array.from(pollingTasks.keys()).map(taskId => ({
    taskId,
    active: true
  }));
  
  event.ports[0].postMessage({ status });
}

// Nettoyer les tâches anciennes toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  
  for (const [taskId, task] of pollingTasks.entries()) {
    if (now - task.startTime > maxAge) {
      console.log(`🧹 Nettoyage tâche ancienne: ${taskId}`);
      stopPolling(taskId);
    }
  }
}, 5 * 60 * 1000);
