// Navigation partagée pour les entrées "Utiliser ce son" / "Créer un clip officiel"
// (Scroll morceau, Scroll clip, détail morceau). Si l'utilisateur n'est pas connecté,
// on passe par l'écran Login (racine) avec un returnTo qui rouvre le Composer avec le
// même morceau une fois connecté (voir LoginScreen.returnToApp).
export function openClipComposerForSound(
  navigation: any,
  isLoggedIn: boolean,
  sourceTrackId: string,
  sourceTrackType: 'track' | 'ai_track',
) {
  const params = { sourceTrackId, sourceTrackType };
  if (!isLoggedIn) {
    navigation.getParent()?.navigate('Login', { returnTo: { screen: 'ClipComposer', params } });
    return;
  }
  navigation.navigate('ClipComposer', params);
}
