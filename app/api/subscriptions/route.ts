import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Subscription from '@/models/Subscription';

export async function GET() {
  try {
    await dbConnect();
    
    const subscriptions = await Subscription.find({ isActive: true })
      .select('-stripePriceId')
      .sort({ price: 1 });
    
    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Erreur lors de la récupération des abonnements:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des abonnements' },
      { status: 500 }
    );
  }
} 