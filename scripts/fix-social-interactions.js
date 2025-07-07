const mongoose = require('mongoose');
require('dotenv').config();

// Modèles
const User = require('../models/User').default;
const Track = require('../models/Track').default;
const Comment = require('../models/Comment').default;

async function fixSocialInteractions() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // 1. Vérifier et corriger les utilisateurs
    console.log('\n🔍 Vérification des utilisateurs...');
    const users = await User.find({});
    console.log(`📊 ${users.length} utilisateurs trouvés`);

    for (const user of users) {
      // S'assurer que les propriétés existent
      if (!user.followers) user.followers = [];
      if (!user.following) user.following = [];
      if (!user.tracks) user.tracks = [];
      if (!user.playlists) user.playlists = [];
      if (!user.likes) user.likes = [];
      if (typeof user.isVerified === 'undefined') user.isVerified = false;
      if (typeof user.isArtist === 'undefined') user.isArtist = false;
      if (!user.totalPlays) user.totalPlays = 0;
      if (!user.totalLikes) user.totalLikes = 0;

      await user.save();
    }
    console.log('✅ Utilisateurs corrigés');

    // 2. Vérifier et corriger les pistes
    console.log('\n🔍 Vérification des pistes...');
    const tracks = await Track.find({});
    console.log(`📊 ${tracks.length} pistes trouvées`);

    for (const track of tracks) {
      // S'assurer que les propriétés existent
      if (!track.likes) track.likes = [];
      if (!track.comments) track.comments = [];
      if (!track.plays) track.plays = 0;
      if (!track.genre) track.genre = [];

      await track.save();
    }
    console.log('✅ Pistes corrigées');

    // 3. Vérifier et corriger les commentaires
    console.log('\n🔍 Vérification des commentaires...');
    const comments = await Comment.find({});
    console.log(`📊 ${comments.length} commentaires trouvés`);

    for (const comment of comments) {
      // S'assurer que les propriétés existent
      if (!comment.likes) comment.likes = [];
      if (!comment.replies) comment.replies = [];

      await comment.save();
    }
    console.log('✅ Commentaires corrigés');

    // 4. Mettre à jour les statistiques des utilisateurs
    console.log('\n📈 Mise à jour des statistiques...');
    for (const user of users) {
      // Calculer les statistiques réelles
      const userTracks = await Track.find({ artist: user._id });
      const totalPlays = userTracks.reduce((sum, track) => sum + (track.plays || 0), 0);
      const totalLikes = userTracks.reduce((sum, track) => sum + (track.likes?.length || 0), 0);

      user.totalPlays = totalPlays;
      user.totalLikes = totalLikes;
      user.tracks = userTracks.map(track => track._id);

      await user.save();
    }
    console.log('✅ Statistiques mises à jour');

    // 5. Créer quelques utilisateurs de test avec badges
    console.log('\n🧪 Création d\'utilisateurs de test...');
    
    const testUsers = [
      {
        name: 'DJ Verified',
        email: 'dj.verified@test.com',
        username: 'djverified',
        password: 'password123',
        isVerified: true,
        isArtist: true,
        artistName: 'DJ Verified',
        bio: 'Artiste vérifié avec badge officiel',
        totalPlays: 15000,
        totalLikes: 2500
      },
      {
        name: 'Artist Pro',
        email: 'artist.pro@test.com',
        username: 'artistpro',
        password: 'password123',
        isVerified: true,
        isArtist: true,
        artistName: 'Artist Pro',
        bio: 'Artiste professionnel vérifié',
        totalPlays: 25000,
        totalLikes: 5000
      },
      {
        name: 'Music Lover',
        email: 'music.lover@test.com',
        username: 'musiclover',
        password: 'password123',
        isVerified: false,
        isArtist: false,
        bio: 'Passionné de musique',
        totalPlays: 5000,
        totalLikes: 800
      }
    ];

    for (const testUser of testUsers) {
      const existingUser = await User.findOne({ email: testUser.email });
      if (!existingUser) {
        const newUser = new User(testUser);
        await newUser.save();
        console.log(`✅ Utilisateur de test créé: ${testUser.username}`);
      } else {
        console.log(`⚠️ Utilisateur de test existe déjà: ${testUser.username}`);
      }
    }

    // 6. Créer quelques pistes de test avec likes
    console.log('\n🎵 Création de pistes de test...');
    
    const testTracks = [
      {
        title: 'Test Track 1',
        artist: users[0]?._id || testUsers[0]._id,
        audioUrl: 'https://example.com/audio1.mp3',
        coverUrl: '/default-cover.jpg',
        duration: 180,
        genre: ['Electronic', 'House'],
        likes: [],
        comments: [],
        plays: 150
      },
      {
        title: 'Test Track 2',
        artist: users[0]?._id || testUsers[0]._id,
        audioUrl: 'https://example.com/audio2.mp3',
        coverUrl: '/default-cover.jpg',
        duration: 240,
        genre: ['Pop', 'Dance'],
        likes: [],
        comments: [],
        plays: 300
      }
    ];

    for (const testTrack of testTracks) {
      const existingTrack = await Track.findOne({ title: testTrack.title });
      if (!existingTrack) {
        const newTrack = new Track(testTrack);
        await newTrack.save();
        console.log(`✅ Piste de test créée: ${testTrack.title}`);
      } else {
        console.log(`⚠️ Piste de test existe déjà: ${testTrack.title}`);
      }
    }

    console.log('\n🎉 Script terminé avec succès !');
    console.log('\n📋 Résumé des corrections :');
    console.log('- ✅ Utilisateurs corrigés');
    console.log('- ✅ Pistes corrigées');
    console.log('- ✅ Commentaires corrigés');
    console.log('- ✅ Statistiques mises à jour');
    console.log('- ✅ Utilisateurs de test créés');
    console.log('- ✅ Pistes de test créées');

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Déconnecté de MongoDB');
  }
}

// Exécuter le script
fixSocialInteractions(); 