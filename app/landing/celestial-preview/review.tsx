'use client';
import { useSearchParams } from 'next/navigation';
import { SessionContext } from 'next-auth/react';
import SignIn from '@/app/auth/signin/page';
import SignUp from '@/app/auth/signup/page';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import CelestialHome from '@/components/celestial/CelestialHome';

/** Public UI review only. Canonical routes/API guards are untouched; no fake authenticated session. */
export default function CelestialReview() {
  const surface = useSearchParams().get('surface');
  return <><aside style={{position:'fixed',bottom:2,left:8,zIndex:1000,fontSize:9,color:'#c3cddd',background:'#080e1cee',padding:'3px 7px',pointerEvents:'none'}}>Revue locale · UI seule · connexion et données NON VALIDÉES</aside><SessionContext.Provider value={{data:null,status:'unauthenticated',update:async()=>null}}>
    {surface==='signin'?<SignIn/>:surface==='signup'?<SignUp/>:surface==='onboarding'?<OnboardingFlow/>:<CelestialHome/>}
  </SessionContext.Provider></>;
}
