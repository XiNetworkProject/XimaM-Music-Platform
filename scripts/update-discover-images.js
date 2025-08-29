const fs = require('fs');
const path = require('path');

const discoverFile = path.join(__dirname, '../app/discover/page.tsx');

// Lire le fichier
let content = fs.readFileSync(discoverFile, 'utf8');

// Remplacer toutes les occurrences d'images avec fallback
const imagePattern = /<img\s+src=\{track\.coverUrl \|\| 'https:\/\/images\.unsplash\.com\/photo-1493225457124-a3eb161ffa5f\?w=300&h=300&fit=crop'\}\s+alt=\{track\.title\}\s+className="w-full h-full object-cover"\s+onError=\{\(e\) => \{\s+e\.currentTarget\.src = '\/default-cover\.jpg';\s+\}\s+\}\s+\/>/g;

const newImageCode = `{track.coverUrl ? (
                            <img
                              src={track.coverUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                              {track.title.charAt(0).toUpperCase()}
                            </div>
                          )}`;

// Remplacer les occurrences
content = content.replace(imagePattern, newImageCode);

// Écrire le fichier mis à jour
fs.writeFileSync(discoverFile, content, 'utf8');

console.log('✅ Images discover mises à jour avec fallback !');
