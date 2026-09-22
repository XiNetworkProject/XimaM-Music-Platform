/** A tap on the playing media stream, never a reroute of AudioCore's audible output. */
export type LiveAnalysisStatus = 'idle' | 'waiting' | 'listening' | 'unavailable';
export type LiveAudioFrame = { energy:number; bass:number; rms:number };
type CapturableAudio = HTMLAudioElement & { captureStream?:()=>MediaStream; mozCaptureStream?:()=>MediaStream };
type Runtime = { context:()=>AudioContext; request:(fn:FrameRequestCallback)=>number; cancel:(id:number)=>void };
const zero = ():LiveAudioFrame=>({energy:0,bass:0,rms:0});
const clamp=(n:number)=>Math.max(0,Math.min(1,n));

/** Real PCM RMS + 40–190 Hz energy. Digital silence cannot generate a pulse. */
export function measureLiveAudio(pcm:Float32Array,frequencies:Float32Array,sampleRate:number):LiveAudioFrame {
  let sum=0;for(let i=0;i<pcm.length;i++){const value=pcm[i];sum+=Number.isFinite(value)?value*value:0;}
  const rms=Math.sqrt(sum/Math.max(1,pcm.length));
  if(rms<.0005)return zero();
  const binHz=sampleRate/(frequencies.length*2);
  const lo=Math.max(1,Math.ceil(40/binHz)),hi=Math.min(frequencies.length-1,Math.floor(190/binHz));
  let bass=0;for(let i=lo;i<=hi;i++)bass+=Number.isFinite(frequencies[i])?10**(frequencies[i]/20):0;
  bass=clamp(bass/Math.max(1,hi-lo+1)*5);
  return {rms:clamp(rms),bass,energy:clamp(rms*1.7+bass*.8)};
}

export class LiveAudioAnalyser {
  private context:AudioContext|null=null;
  private analyser:AnalyserNode|null=null;
  private stream:MediaStream|null=null;
  private source:MediaStreamAudioSourceNode|null=null;
  private media:CapturableAudio|null=null;
  private active=false;
  private disposed=false;
  private frame:number|null=null;
  private lastTime=0;
  private envelope=0;
  private pcm=new Float32Array(1024);
  private frequencies=new Float32Array(512);
  private currentStatus:LiveAnalysisStatus='idle';
  constructor(private onFrame:(value:LiveAudioFrame)=>void,private onStatus:(status:LiveAnalysisStatus)=>void,private runtime:Runtime={context:()=>new AudioContext(),request:fn=>requestAnimationFrame(fn),cancel:id=>cancelAnimationFrame(id)}){}
  private status(value:LiveAnalysisStatus){if(this.currentStatus!==value){this.currentStatus=value;this.onStatus(value);}}
  private reset=()=>{this.releaseCapture();this.stopFrames();this.onFrame(zero());};
  private ready=()=>{if(this.active)this.connect();};
  setMedia(media:HTMLAudioElement|null){
    if(this.media===media)return;
    this.media?.removeEventListener('emptied',this.reset);
    this.media?.removeEventListener('loadeddata',this.ready);
    this.media?.removeEventListener('playing',this.ready);
    this.reset();this.media=media;
    media?.addEventListener('emptied',this.reset);
    media?.addEventListener('loadeddata',this.ready);
    media?.addEventListener('playing',this.ready);
  }
  setActive(active:boolean){
    this.active=active;
    if(!active){this.stopFrames();this.releaseCapture();this.onFrame(zero());this.status('idle');return;}
    if(!this.media?.captureStream&&!this.media?.mozCaptureStream){this.status('unavailable');return;}
    if(this.context?.state==='running')this.connect();else this.status('waiting');
  }
  /** Called from a real gesture; never starts or resumes the musical player. */
  activate=()=>{
    if(this.disposed||(!this.media?.captureStream&&!this.media?.mozCaptureStream)){if(this.active)this.status('unavailable');return;}
    try{
      if(!this.context){
        this.context=this.runtime.context();this.analyser=this.context.createAnalyser();
        this.analyser.fftSize=1024;this.analyser.smoothingTimeConstant=.15;
        this.context.addEventListener('statechange',this.contextChanged);
      }
      void this.context.resume().then(()=>{if(!this.disposed&&this.active)this.connect();}).catch(()=>this.status('waiting'));
    }catch{this.status('unavailable');}
  };
  private contextChanged=()=>{if(this.context?.state==='running'&&this.active)this.connect();else{this.stopFrames();this.onFrame(zero());if(this.active)this.status('waiting');}};
  private connect(){
    if(this.disposed||!this.active||this.context?.state!=='running'||!this.analyser||!this.media||this.media.readyState<2)return;
    try{
      if(!this.stream){
        const capture=this.media.captureStream||this.media.mozCaptureStream;if(!capture){this.status('unavailable');return;}
        this.stream=capture.call(this.media);this.stream.addEventListener('addtrack',this.tracksChanged);this.stream.addEventListener('removetrack',this.tracksChanged);
      }
      if(!this.stream.getAudioTracks().some(track=>track.readyState==='live')){this.status('waiting');return;}
      if(!this.source){this.source=this.context.createMediaStreamSource(this.stream);this.source.connect(this.analyser);}
      // Deliberately not connected to context.destination: no duplicate sound, no gain/volume changes.
      this.status('listening');if(this.frame===null)this.frame=this.runtime.request(this.sample);
    }catch{this.releaseCapture();this.stopFrames();this.onFrame(zero());this.status('unavailable');}
  }
  private tracksChanged=()=>{this.source?.disconnect();this.source=null;this.stopFrames();this.onFrame(zero());this.connect();};
  private sample=(time:number)=>{
    this.frame=null;
    if(this.disposed||!this.active||!this.analyser||this.context?.state!=='running')return;
    try{
      this.analyser.getFloatTimeDomainData(this.pcm);this.analyser.getFloatFrequencyData(this.frequencies);
      const signal=measureLiveAudio(this.pcm,this.frequencies,this.context.sampleRate);
      const delta=Math.min(80,Math.max(1,time-(this.lastTime||time-16)));this.lastTime=time;
      const speed=signal.energy>this.envelope?28:130;
      this.envelope+=(signal.energy-this.envelope)*(1-Math.exp(-delta/speed));
      this.onFrame({...signal,energy:signal.rms===0?0:this.envelope});
      this.frame=this.runtime.request(this.sample);
    }catch{this.stopFrames();this.onFrame(zero());this.status('unavailable');}
  };
  private stopFrames(){if(this.frame!==null)this.runtime.cancel(this.frame);this.frame=null;this.lastTime=0;this.envelope=0;}
  private releaseCapture(){
    this.source?.disconnect();this.source=null;
    if(this.stream){this.stream.removeEventListener('addtrack',this.tracksChanged);this.stream.removeEventListener('removetrack',this.tracksChanged);this.stream.getTracks().forEach(track=>track.stop());this.stream=null;}
  }
  dispose(){
    this.disposed=true;this.active=false;this.setMedia(null);this.stopFrames();this.releaseCapture();
    this.analyser?.disconnect();this.analyser=null;
    if(this.context){this.context.removeEventListener('statechange',this.contextChanged);void this.context.close().catch(()=>{});this.context=null;}
  }
}
