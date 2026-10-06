// Pure shared policy: imported by web and native. No credentials, network or chat history.
export type CompanionPreferences = { name: string; hidden: boolean; size: 'small'|'normal'; autonomous: boolean; hints: boolean; reduced: boolean; positioned:boolean; x: number; y: number };
export const DEFAULT_COMPANION: CompanionPreferences = {name:'Fennec',hidden:false,size:'normal',autonomous:true,hints:true,reduced:false,positioned:false,x:1,y:1};
export function companionPreferences(value: unknown): CompanionPreferences {
  const v=value && typeof value==='object'?value as Partial<CompanionPreferences>:{};
  const number=(n:unknown,d:number)=>typeof n==='number'&&Number.isFinite(n)?Math.max(0,Math.min(1,n)):d;
  return {...DEFAULT_COMPANION,name:typeof v.name==='string'?v.name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,24)||'Fennec':'Fennec',
    hidden:v.hidden===true,size:v.size==='small'?'small':'normal',autonomous:v.autonomous!==false,hints:v.hints!==false,reduced:v.reduced===true,positioned:v.positioned===true,x:number(v.x,1),y:number(v.y,1)};
}
export type CompanionAction = {label:string;href?:string;audio?:'pause'|'play'|'next';confirm?:string};
export type CompanionAnswer = {text:string;source:string;actions:CompanionAction[];search?:string};
export type CompanionContext = {path:string;playing:boolean;trackTitle?:string;trackId?:string;unread?:number;calling:boolean;online:boolean};
type Guide={title:string;text:string;href:string;words:string[];steps:string[]};
export const GUIDES:Record<string,Guide>={
  home:{title:'l’accueil',href:'/',words:['synaura','accueil','presentation'],text:'Synaura réunit écoute, création et rencontres. Explore les chapitres de présentation, découvre les morceaux ou ouvre ton compte pour retrouver tes espaces.',steps:['Découvrir Synaura présente les possibilités de la plateforme.','Découvrir donne accès au catalogue.','Entrer permet de te connecter ou de créer ton compte.']},
  live:{title:'Live',href:'/live',words:['live','swipe','fil'],text:'Fais défiler le fil pour découvrir sons, clips et publications. Les icônes donnent accès aux réactions, commentaires et au partage.',steps:['Ouvre un son dans Live.','Utilise la bulle de commentaires pour Conversation ou Moments.','Sélectionne un moment pour rejoindre son passage audio.']},
  discover:{title:'Découvrir',href:'/discover',words:['decouvrir','decouverte','nouveaute','artiste'],text:'Découvrir rassemble le catalogue. La recherche retrouve les sons, profils, clips, playlists et posts publics.',steps:['Ouvre Découvrir.','Choisis le contenu qui t’intéresse.','Ouvre sa fiche pour écouter ou retrouver son créateur.']},
  library:{title:'Bibliothèque',href:'/library',words:['bibliotheque','favori','playlist','collection'],text:'Ta bibliothèque rassemble tes contenus enregistrés et tes playlists. Les options d’un morceau permettent de l’ajouter à une playlist.',steps:['Ouvre la bibliothèque.','Choisis tes favoris ou une playlist.','Depuis les options d’un son, choisis la playlist de destination.']},
  studio:{title:'Studio IA',href:'/studio',words:['studio','ia','generer','generation','suno','credit','v6','parole'],text:'Décris ton idée dans le Studio, puis règle le modèle et les options disponibles pour ton compte. Le solde et le coût affichés dans le Studio font foi : je ne lance aucune génération à ta place.',steps:['Ouvre le Studio IA.','Décris le style et ton idée, ou renseigne tes paroles.','Vérifie modèle, visibilité et coût avant de confirmer la génération.']},
  create:{title:'Publier',href:'/create',words:['publier','upload','importer','creer','clip','video'],text:'Créer permet de choisir ce que tu veux publier : musique, clip ou post. Tu gardes la main sur le contenu et la confirmation finale.',steps:['Ouvre Créer.','Choisis le type de contenu et prépare tes fichiers.','Vérifie les informations et la visibilité avant de publier.']},
  messages:{title:'Messages & appels',href:'/messages',words:['message','appel','ami','contact','groupe','vocal'],text:'La messagerie donne accès aux conversations, contacts et demandes. Dans une conversation, utilise le téléphone pour appeler, ou l’historique pour retrouver les nouveaux appels.',steps:['Ouvre Messages puis Contacts ou Demandes.','Choisis une conversation.','Utilise le composer pour écrire ou le téléphone pour appeler.']},
  notifications:{title:'Notifications',href:'/notifications',words:['notification','alerte'],text:'Les notifications regroupent les événements de ton compte. Je peux t’y emmener, mais je ne lis pas leur contenu ni ne les marque comme lues à ta place.',steps:['Ouvre tes notifications.','Choisis un événement pour en voir la cible.','Les autorisations de notification se règlent sur ton appareil.']},
  stats:{title:'Statistiques',href:'/stats',words:['statistique','stats','audience','ecoute','performance'],text:'Les statistiques montrent les données disponibles de tes contenus. Vérifie la période et les filtres : je ne déduis pas d’audience ou de revenus non mesurés.',steps:['Ouvre Statistiques.','Choisis la période.','Ouvre un contenu pour consulter ses détails disponibles.']},
  boosters:{title:'Boosters',href:'/boosters',words:['booster','visibilite','roue'],text:'Les boosters disponibles et leurs effets sont décrits sur leur fiche. Consulte l’inventaire avant d’activer un effet : je n’en consomme aucun automatiquement.',steps:['Ouvre Boosters.','Consulte tes boosters et leurs conditions.','Choisis explicitement la cible et confirme l’activation.']},
  subscriptions:{title:'Abonnements',href:'/subscriptions',words:['abonnement','prix','payer','acheter','tarif','premium'],text:'Les formules, tarifs et crédits actuels sont affichés sur la page Abonnements. Je ne promets pas de gain et je ne déclenche aucun achat.',steps:['Ouvre Abonnements.','Compare les crédits et avantages affichés.','Vérifie la formule et le prix dans le parcours de paiement.']},
  settings:{title:'Paramètres',href:'/settings',words:['parametre','compte','mot de passe','securite','confidentialite','supprimer','deconnecter'],text:'Les paramètres regroupent les réglages du compte et de confidentialité. Les opérations sensibles restent dans leur parcours sécurisé, avec ta confirmation.',steps:['Ouvre Paramètres.','Choisis la rubrique concernée.','Lis les conséquences avant toute modification sensible.']},
  community:{title:'Communauté',href:'/community',words:['communaute','collab','forum','feedback','remix'],text:'La communauté permet de retrouver les échanges et publications par thème. Je peux t’y guider, sans écrire ni publier à ta place.',steps:['Ouvre Communauté.','Choisis le thème ou la discussion.','Lis le contexte avant de répondre ou de publier.']},
  city:{title:'City',href:'/city',words:['city','ville','vote'],text:'City présente son expérience communautaire et ses actions disponibles. Les votes et actions restent volontaires.',steps:['Ouvre City.','Consulte les propositions disponibles.','Vérifie ton choix avant de participer.']},
  profile:{title:'Profils',href:'/discover',words:['profil','bio'],text:'Une fiche profil rassemble les informations et contenus que son auteur rend accessibles. Utilise ses actions pour suivre ou entrer en contact.',steps:['Recherche le pseudo du créateur.','Ouvre son profil.','Choisis un contenu ou l’action de contact disponible.']},
};
const nativePages:Record<string,string>={Swipe:'live',Home:'live',HomeV2:'live',Discover:'discover',Search:'discover',Library:'library',AIStudio:'studio',AIStudioLibrary:'studio',CreateHub:'create',Upload:'create',ClipComposer:'create',CreatePost:'create',Messages:'messages',Conversation:'messages',Notifications:'notifications',Stats:'stats',Boosters:'boosters',Subscriptions:'subscriptions',Settings:'settings',Community:'community',ClubDetail:'community',City:'city',PublicProfile:'profile',TrackDetail:'live'};
export function pageGuide(path:string):Guide {
  const key=nativePages[path]||path.replace(/^\/v2\//,'/').split(/[/?#]/).filter(Boolean)[0]||'home';
  return GUIDES[key==='ai-generator'?'studio':key==='track'?'live':key==='landing'?'home':key]||{title:'Synaura',href:'/discover',words:[],text:'Écouter, découvrir, créer et partager. Dis-moi ce que tu veux faire ; je te guide vers le bon espace.',steps:['Découvrir pour explorer.','Studio pour créer avec l’IA.','Messages pour retrouver tes contacts.']};
}
const normalized=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
export function answerCompanion(question:string,c:CompanionContext):CompanionAnswer {
  const q=normalized(question).slice(0,400),guide=pageGuide(c.path);
  const reply=(text:string,actions:CompanionAction[]=[],source='Guide Synaura vérifié'):CompanionAnswer=>({text,actions,source});
  if(!q||/^(aide|ici|guide|comment ca marche|que faire ici)[ ?!.]*$/.test(q))return reply(guide.text,[{label:`Ouvrir ${guide.title}`,href:guide.href}]);
  if(/etapes|pas a pas|guide moi/.test(q))return reply(guide.steps.map((step,i)=>`${i+1}. ${step}`).join('\n'),[{label:`Aller à ${guide.title}`,href:guide.href}]);
  if(/(ma|la|ce|cette).*(musique|son|chanson|morceau).*(cours|ecoute|joue)|qu.est.ce qui joue/.test(q))return reply(c.trackTitle?`${c.playing?'En lecture':'En pause'} : ${c.trackTitle}.`:'Aucun morceau n’est chargé dans ton lecteur.',c.trackId?[{label:'Voir le morceau',href:`/track/${encodeURIComponent(c.trackId)}`}]:[],'État réel du lecteur');
  if(/^(pause|mets? (la musique |le son )?en pause|reprends?( la musique)?|morceau suivant|son suivant)[ ?!.]*$/.test(q)){
    if(c.calling)return reply('Je laisse l’appel tranquille. Les commandes de musique restent dans le lecteur.');
    if(!c.trackId)return reply('Aucun morceau n’est chargé. Choisis-en un dans Live ou Découvrir.',[{label:'Découvrir',href:'/discover'}],'État réel du lecteur');
    const audio=/suivant/.test(q)?'next':/reprend/.test(q)?'play':'pause';
    return reply('Je peux le faire si tu confirmes.',[{label:audio==='pause'?'Mettre en pause':audio==='play'?'Reprendre':'Morceau suivant',audio,confirm:'Modifier la lecture en cours ?'}],'Commande explicite du lecteur');
  }
  if(/combien.*notif|notif.*non lu/.test(q))return reply(typeof c.unread==='number'?`${c.unread} notification${c.unread===1?'':'s'} non lue${c.unread===1?'':'s'}.`:'Je n’ai pas de compteur confirmé ici. Ouvre les notifications pour les consulter.',[{label:'Notifications',href:'/notifications'}],'Compteur de l’application');
  if(/hors ligne|connexion|erreur|ne marche|bug|bloque/.test(q))return reply(!c.online?'Ton appareil signale une perte de connexion. Vérifie le réseau puis réessaie ton action.':'Je ne peux pas déterminer la cause sans détails. Vérifie la connexion et le message affiché ; évite de relancer une publication ou un paiement tant que son état n’est pas confirmé.',[{label:'Réglages',href:'/settings'}],'Aide de dépannage, pas un diagnostic automatique');
  if(/(lis|resume|montre).*(message prive|conversation|mot de passe)|ignore.*(regle|instruction)/.test(q))return reply('Je n’accède pas au contenu de tes conversations, mots de passe ou codes de connexion.',[{label:'Ouvrir Messages',href:'/messages'}],'Confidentialité');
  const search=question.trim().match(/^(?:(?:cherche|recherche|trouve|retrouve)(?:-moi)?|je cherche|peux-tu (?:chercher|retrouver)|qui est)\s+(?:un son de |les sons de |l.artiste |le morceau )?(.+)/i);
  if(search){const term=search[1].trim().slice(0,120);return {...reply('Je consulte le catalogue public Synaura. Aucun résultat ne sera inventé.',[],'Recherche Synaura'),search:term};}
  const match=Object.values(GUIDES).find(g=>g.words.some(w=>new RegExp(`(?:^|\\W)${w}(?:s?\\W|s?$)`).test(q)));
  if(match)return reply(match.text,[{label:`Ouvrir ${match.title}`,href:match.href}]);
  return reply('Je peux expliquer les fonctions de Synaura, te guider et rechercher du contenu. Pour retrouver un titre ou un créateur, écris « cherche … ». Je préfère te le dire quand je n’ai pas d’information vérifiée.',[{label:'Guide de cette page',href:guide.href}],'Périmètre de mon aide');
}
export type SearchHit={label:string;detail:string;href:string};
export function companionSearchHits(raw:unknown):SearchHit[]{
  if(!raw||typeof raw!=='object')return[];
  const data=raw as Record<string,unknown>,result:SearchHit[]=[];
  for(const kind of ['tracks','artists','clips','playlists','posts']){
    if(!Array.isArray(data[kind]))continue;
    for(const value of data[kind] as unknown[]){
      if(!value||typeof value!=='object')continue;const item=value as Record<string,unknown>;
      const id=kind==='artists'?item.username:(item._id||item.id);
      if(typeof id!=='string'||!id||id.length>160)continue;
      const title=item.title||item.name||item.artistName||item.username||(kind==='posts'?'Publication':null);
      if(typeof title!=='string')continue;
      result.push({label:title.slice(0,100),detail:({tracks:'Son',artists:'Profil',clips:'Clip',playlists:'Playlist',posts:'Post'} as Record<string,string>)[kind],href:`/${kind==='artists'?'profile':kind==='tracks'?'track':kind}/${encodeURIComponent(id)}`});
    }
  }return result.slice(0,8);
}
export type CompanionHintGate={lastAt:number;seen:Set<string>};
export function allowHint(gate:CompanionHintGate,key:string,now:number,enabled:boolean,quiet:boolean){
  if(!enabled||quiet||gate.seen.has(key)||now-gate.lastAt<180_000||gate.seen.size>=4)return false;
  gate.lastAt=now;gate.seen.add(key);return true;
}
export function companionBounds(width:number,height:number,size:number){
  const margin=size<140?24:8;
  const left=width>=1024?112:margin,right=Math.max(left,width-size-margin),top=76,bottom=Math.max(top,height-size-150);
  return {left:Math.min(left,Math.max(8,width-size-8)),right,top,bottom};
}
export type CompanionRect={left:number;top:number;right:number;bottom:number};
/** Pick the least obstructive resting place without inspecting text or personal data. */
export function companionRestingPlace(bounds:ReturnType<typeof companionBounds>,size:number,controls:CompanionRect[]){
  const candidates=[{x:bounds.right,y:bounds.bottom},{x:bounds.left,y:bounds.bottom},
    {x:bounds.right,y:Math.max(bounds.top,bounds.bottom-size-20)},{x:bounds.left,y:Math.max(bounds.top,bounds.bottom-size-20)},
    {x:bounds.right,y:bounds.top},{x:bounds.left,y:bounds.top}];
  const score=(p:{x:number;y:number})=>controls.reduce((total,r)=>total+Math.max(0,Math.min(p.x+size+8,r.right)-Math.max(p.x-8,r.left))*Math.max(0,Math.min(p.y+size+8,r.bottom)-Math.max(p.y-8,r.top)),0);
  return candidates.reduce((best,p)=>score(p)<score(best)?p:best,candidates[0]);
}
