import React, {useEffect, useState} from 'react';
import {Image, View} from 'react-native';
import atlas from './assets/atlas.json';
import animations from './assets/animations.json';

export type PetState = keyof typeof animations;
type Sequence = {frames:string[];fps:number;duration?:number;loop?:boolean};

/** Original transparent artwork and original frame order/FPS; no replacement drawing. */
export function FennecSprite({state,size,paused,reduced,onComplete}:{state:PetState;size:number;paused:boolean;reduced:boolean;onComplete:()=>void}) {
  const [tick,setTick]=useState(0);
  const sequence:Sequence=animations[state]||animations.idle;
  useEffect(()=>{
    setTick(0);
    if(paused||reduced)return;
    const procedural=['jump','play','walk','run','music'].includes(state);
    if(sequence.frames.length===1&&!sequence.duration&&!procedural)return;
    const started=Date.now();
    const timer=setInterval(()=>{
      const elapsed=(Date.now()-started)/1000;
      if(sequence.duration&&elapsed>=sequence.duration){clearInterval(timer);onComplete();return;}
      setTick(elapsed);
    },1000/(procedural?Math.max(sequence.fps,24):sequence.fps));
    return()=>clearInterval(timer);
  },[state,paused,reduced,sequence,onComplete]);
  const index=reduced?0:Math.floor(tick*sequence.fps)%sequence.frames.length;
  const frame=atlas.frames[sequence.frames[index] as keyof typeof atlas.frames]||atlas.frames.blink_00;
  const scale=size/320;
  const jump=!reduced&&(state==='jump'||state==='play')?-Math.abs(Math.sin(tick*Math.PI*2))*size*.09:0;
  const dance=!reduced&&state==='music'?Math.sin(tick*5)*3:0;
  const walk=!reduced&&(state==='walk'||state==='run')?Math.sin(tick*1.7)*size*.10:0;
  return <View pointerEvents="none" style={{width:size,height:size,overflow:'hidden',transform:[{translateY:jump},{translateX:walk},{rotate:`${dance}deg`}]}}>
    <Image accessibilityIgnoresInvertColors source={require('./assets/atlas.png')} resizeMode="stretch" style={{position:'absolute',width:atlas.size.w*scale,height:atlas.size.h*scale,left:-frame.x*scale,top:-frame.y*scale}} />
  </View>;
}
