import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subscription from '@/models/Subscription';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    console.log('🔧 Initialisation des abonnements sur Vercel...');
    
    // Supprimer les abonnements existants
    await Subscription.deleteMany({});
    console.log('✅ Abonnements existants supprimés');
    
    // Créer les abonnements par défaut
    const subscriptions = [
      {
        name: 'free',
        price: 0,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 3,
          comments: 10,
          plays: 50,
          playlists: 2,
          quality: '128kbps',
          ads: true,
          analytics: 'none',
          collaborations: false,
          apiAccess: false,
          support: 'community'
        },
        features: [
          '3 uploads par mois',
          '10 commentaires par mois',
          '50 écoutes par mois',
          '2 playlists max',
          'Qualité audio 128kbps',
          'Publicités incluses',
          'Support communautaire'
        ],
        isActive: true
      },
      {
        name: 'starter',
        price: 4.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 15,
          comments: 200,
          plays: 500,
          playlists: 10,
          quality: '256kbps',
          ads: false,
          analytics: 'basic',
          collaborations: false,
          apiAccess: false,
          support: 'email'
        },
        features: [
          '15 uploads par mois',
          '200 commentaires par mois',
          '500 écoutes par mois',
          '10 playlists max',
          'Qualité audio 256kbps',
          'Sans publicités',
          'Analytics basiques',
          'Support par email'
        ],
        isActive: true
      },
      {
        name: 'creator',
        price: 12.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 50,
          comments: 1000,
          plays: 2000,
          playlists: -1, // Illimité
          quality: '320kbps',
          ads: false,
          analytics: 'advanced',
          collaborations: true,
          apiAccess: false,
          support: 'priority'
        },
        features: [
          '50 uploads par mois',
          '1000 commentaires par mois',
          '2000 écoutes par mois',
          'Playlists illimitées',
          'Qualité audio 320kbps',
          'Sans publicités',
          'Analytics avancés',
          'Collaborations',
          'Support prioritaire'
        ],
        isActive: true
      },
      {
        name: 'pro',
        price: 19.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: 150,
          comments: -1, // Illimité
          plays: 5000,
          playlists: -1, // Illimité
          quality: 'lossless',
          ads: false,
          analytics: 'complete',
          collaborations: true,
          apiAccess: false,
          support: 'dedicated'
        },
        features: [
          '150 uploads par mois',
          'Commentaires illimités',
          '5000 écoutes par mois',
          'Playlists illimitées',
          'Qualité audio Lossless',
          'Sans publicités',
          'Analytics complets',
          'Collaborations avancées',
          'Support dédié'
        ],
        isActive: true
      },
      {
        name: 'enterprise',
        price: 29.99,
        currency: 'EUR',
        interval: 'month',
        limits: {
          uploads: -1, // Illimité
          comments: -1, // Illimité
          plays: -1, // Illimité
          playlists: -1, // Illimité
          quality: 'master',
          ads: false,
          analytics: 'complete',
          collaborations: true,
          apiAccess: true,
          support: 'dedicated'
        },
        features: [
          'Uploads illimités',
          'Commentaires illimités',
          'Écoutes illimitées',
          'Playlists illimitées',
          'Qualité audio Master',
          'Sans publicités',
          'Analytics complets',
          'Collaborations avancées',
          'Accès API',
          'Support dédié 24/7'
        ],
        isActive: true
      }
    ];

    console.log('📝 Création des abonnements...');
    const createdSubscriptions = [];
    
    for (const subData of subscriptions) {
      const subscription = new Subscription(subData);
      await subscription.save();
      createdSubscriptions.push(subscription);
      console.log(`✅ Abonnement ${subData.name} créé`);
    }

    console.log('🎉 Initialisation terminée !');
    
    // Vérifier que les abonnements sont bien sauvegardés
    const savedSubscriptions = await Subscription.find({ isActive: true });
    console.log('🔍 Vérification - Abonnements sauvegardés:', savedSubscriptions.map(s => ({ name: s.name, isActive: s.isActive })));
    
    return NextResponse.json({
      success: true,
      message: 'Abonnements initialisés avec succès',
      count: createdSubscriptions.length,
      subscriptions: createdSubscriptions.map(sub => ({
        name: sub.name,
        price: sub.price,
        features: sub.features.length,
        isActive: sub.isActive
      })),
      savedCount: savedSubscriptions.length
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de l\'initialisation des abonnements',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
} 