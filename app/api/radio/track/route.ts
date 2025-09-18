// app/api/radio/track/route.ts
import { NextRequest, NextResponse } from "next/server";

// Stockage en mémoire (en production, utiliser une base de données)
let radioStats = {
  totalConnections: 0,
  currentListeners: 0,
  peakListeners: 0,
  lastUpdate: new Date().toISOString(),
  hourlyStats: new Map<string, number>()
};

export async function POST(req: NextRequest) {
  try {
    const { action, userId } = await req.json();
    
    const now = new Date();
    const hour = now.getHours();
    const hourKey = `${now.getDate()}-${hour}`;
    
    switch (action) {
      case 'connect':
        radioStats.totalConnections++;
        radioStats.currentListeners++;
        radioStats.peakListeners = Math.max(radioStats.peakListeners, radioStats.currentListeners);
        
        // Mettre à jour les stats horaires
        const currentHourly = radioStats.hourlyStats.get(hourKey) || 0;
        radioStats.hourlyStats.set(hourKey, currentHourly + 1);
        
        console.log(`📻 Utilisateur connecté: ${userId}, Auditeurs: ${radioStats.currentListeners}`);
        break;
        
      case 'disconnect':
        radioStats.currentListeners = Math.max(0, radioStats.currentListeners - 1);
        console.log(`📻 Utilisateur déconnecté: ${userId}, Auditeurs: ${radioStats.currentListeners}`);
        break;
        
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }
    
    radioStats.lastUpdate = now.toISOString();
    
    return NextResponse.json({
      success: true,
      stats: {
        currentListeners: radioStats.currentListeners,
        totalConnections: radioStats.totalConnections,
        peakListeners: radioStats.peakListeners,
        lastUpdate: radioStats.lastUpdate
      }
    });
    
  } catch (error: any) {
    console.error('❌ Erreur tracking radio:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      stats: {
        currentListeners: radioStats.currentListeners,
        totalConnections: radioStats.totalConnections,
        peakListeners: radioStats.peakListeners,
        lastUpdate: radioStats.lastUpdate,
        hourlyStats: Object.fromEntries(radioStats.hourlyStats)
      }
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération stats:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
