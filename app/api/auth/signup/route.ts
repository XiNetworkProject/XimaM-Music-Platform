import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { name, username, email, password } = await request.json();

    // Validation des données
    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Le nom doit contenir au moins 2 caractères' },
        { status: 400 }
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur doit contenir au moins 3 caractères' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      return NextResponse.json(
        { error: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores' },
        { status: 400 }
      );
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe déjà' },
        { status: 409 }
      );
    }

    // Vérifier si le nom d'utilisateur existe déjà
    const existingUsername = await User.findOne({ username: username.trim().toLowerCase() });
    if (existingUsername) {
      return NextResponse.json(
        { error: 'Ce nom d\'utilisateur est déjà pris' },
        { status: 409 }
      );
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(password, 12);

    // Créer le nouvel utilisateur
    const newUser = new User({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      provider: 'local',
      isVerified: true, // Pour l'instant, on considère tous les utilisateurs comme vérifiés
      role: 'user',
    });

    await newUser.save();

    console.log('✅ Nouvel utilisateur créé:', newUser.username);

    return NextResponse.json(
      { 
        message: 'Compte créé avec succès',
        user: {
          id: newUser._id,
          name: newUser.name,
          username: newUser.username,
          email: newUser.email
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('❌ Erreur lors de l\'inscription:', error);
    
    // Gestion des erreurs MongoDB
    if (error instanceof Error && error.message.includes('duplicate key')) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 409 }
        );
      }
      if (error.message.includes('username')) {
        return NextResponse.json(
          { error: 'Ce nom d\'utilisateur est déjà pris' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 