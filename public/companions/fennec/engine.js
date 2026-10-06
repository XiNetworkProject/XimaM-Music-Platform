/*
 * Synaura Companion — moteur Canvas autonome, sans dépendance.
 * Utilisation : new SynauraCompanion(canvas, { atlas, atlasURL });
 * Les poses viennent des planches fournies. Les déplacements, sauts,
 * respirations et particules sont calculés, pas présentés comme des dessins HD.
 * requestAnimationFrame : https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
 * Reduced motion : https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
 */
(function (global) {
  'use strict';
  const seq = (prefix, count) => Array.from({length: count}, (_, i) => `${prefix}_${String(i).padStart(2, '0')}`);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const STATES = Object.freeze({
    idle:      {label: 'Tranquille',       frames: ['blink_00'], fps: 1, loop: true},
    stand:     {label: 'À l’affût',        frames: ['stand_00'], fps: 1, loop: true},
    blink:     {label: 'Petit clin d’œil', frames: ['blink_00','blink_01','blink_02','blink_01','blink_03'], fps: 9, duration: .62},
    sit:       {label: 'Bien installé',    frames: ['blink_03'], fps: 1, loop: true},
    tail:      {label: 'Queue étoilée',    frames: ['tail_00','tail_01','tail_02','tail_03','tail_04','tail_05','tail_04','tail_03','tail_02','tail_01'], fps: 5, duration: 4, loop: true},
    curious:   {label: 'Hmm… c’est quoi ?', frames: ['emotion_01'], fps: 1, duration: 3},
    look:      {label: 'La tête dans les étoiles', frames: ['emotion_02'], fps: 1, duration: 3},
    happy:     {label: 'Un petit bonheur', frames: ['emotion_00'], fps: 1, duration: 2.7},
    pet:       {label: 'Encore une caresse ?', frames: ['emotion_00'], fps: 1, duration: 2.8},
    walk:      {label: 'En promenade',     frames: seq('walk', 7), fps: 8, loop: true},
    run:       {label: 'À toute allure !', frames: seq('walk', 7), fps: 14, loop: true},
    jump:      {label: 'Vers les étoiles !', frames: ['portrait_05'], fps: 1, duration: 1.05},
    play:      {label: 'Attrape l’étoile !', frames: ['portrait_05'], fps: 1, duration: 3.2},
    sniff:     {label: 'Une piste à explorer', frames: ['stand_00'], fps: 1, duration: 2.8},
    sleep:     {label: 'Dans les bras de la lune', frames: seq('sleep', 6), fps: 2.2, loop: true},
    wake:      {label: 'Un réveil tout doux', frames: seq('wake', 4), fps: 2.2, duration: 1.85},
    music:     {label: 'Dans son univers', frames: seq('music', 6), fps: 4, loop: true},
    disappear: {label: 'Poussière d’étoiles', frames: seq('vanish', 8), fps: 7, duration: 1.3},
    hidden:    {label: 'Pas loin… juste invisible', frames: ['empty'], fps: 1, loop: true},
    appear:    {label: 'Me revoilà !', frames: seq('appear', 8), fps: 7, duration: 1.3}
  });
  const SCENES = Object.freeze({
    night: {top:'#0c1229',bottom:'#111d3e',light:'#457dff',ring:'#6497ff',star:'#bad9ff'},
    dusk:  {top:'#211c2d',bottom:'#392b3c',light:'#b692c9',ring:'#c7b0e1',star:'#eedac4'},
    mist:  {top:'#182d3b',bottom:'#24444e',light:'#6fb7c4',ring:'#9bd6e0',star:'#d6ebed'},
    transparent: null
  });

  /** @typedef {{x:number,y:number,w:number,h:number}} FrameRect */
  /** @typedef {{frames:Record<string,FrameRect>,frameSize:number}} Atlas */
  class SynauraCompanion extends EventTarget {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{atlas:Atlas,atlasURL:string,auto?:boolean,scale?:number,speed?:number,
     * scene?:string,pixelated?:boolean,glow?:boolean,reducedMotion?:boolean}} options
     */
    constructor(canvas, options = {}) {
      super();
      if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('Un canvas est nécessaire.');
      if (!options.atlas || !options.atlas.frames) throw new TypeError('Le manifeste atlas est manquant.');
      if (!options.atlasURL) throw new TypeError('Le chemin atlasURL est manquant.');
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', {alpha: true});
      if (!this.ctx) throw new Error('Canvas 2D indisponible dans ce navigateur.');
      this.atlas = options.atlas;
      this.image = new Image();
      this.state = 'idle'; this.previousState = null; this.stateTime = 0; this.time = 0;
      this.direction = 1; this.x = 0; this.ground = 0; this.target = null;
      this.scale = clamp(Number(options.scale) || 1, .5, 1.5);
      this.speed = clamp(Number(options.speed) || 1, .35, 2.5);
      this.scene = SCENES[options.scene] !== undefined ? options.scene : 'night';
      this.auto = options.auto !== false; this.pixelated = options.pixelated !== false;
      this.glow = options.glow !== false; this.paused = false; this.destroyed = false;
      this.width = 0; this.height = 0; this.loaded = false; this.raf = null; this.last = null;
      this.particles = []; this.pointer = null; this.dragging = false; this.lift = 0;
      this.marker = null; this.lastInteraction = 0; this.nextAuto = 6; this.nextBlink = 3.8;
      this.musicActive = false; this.level = 0; this._cleanups = []; this._mediaCleanup = null;
      this.motionQuery = global.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = options.reducedMotion ?? this.motionQuery.matches;
      this.motionOverride = options.reducedMotion !== undefined;
      this.stars = Array.from({length: 65}, (_, i) => ({
        x: ((i * 73.13 + 11.7) % 100) / 100,
        y: ((i * 37.37 + 8.5) % 71) / 100,
        r: .45 + ((i * 1.731) % 1.35), phase: i * 1.77
      }));
      this._tick = this._tick.bind(this);
      this._listen(this.motionQuery, 'change', e => {
        if (!this.motionOverride) { this.reducedMotion = e.matches; this.render(); }
      });
      this._listen(document, 'visibilitychange', () => {
        this.last = null;
        if (document.hidden) { if (this.raf !== null) cancelAnimationFrame(this.raf); this.raf = null; }
        else this._schedule();
      });
      this._installPointer();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas);
      this.resize();
      this.ready = new Promise((resolve, reject) => {
        this.image.onload = () => {
          if (this.destroyed) { reject(new Error('Compagnon détruit avant chargement.')); return; }
          for (const [name, def] of Object.entries(STATES)) {
            if (!def.frames.every(key => this.atlas.frames[key])) {
              reject(new Error(`Images manquantes pour l’animation « ${name} ».`)); return;
            }
          }
          this.loaded = true; this.render(); this._schedule(); this._emit('ready', this.status()); resolve(this);
        };
        this.image.onerror = () => reject(new Error('Impossible de charger l’atlas. Vérifie le chemin du fichier.'));
        this.image.src = options.atlasURL;
      });
    }
    _listen(target, event, handler, opts) {
      target.addEventListener(event, handler, opts);
      this._cleanups.push(() => target.removeEventListener(event, handler, opts));
    }
    _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, {detail})); }
    status() { return {state:this.state,label:STATES[this.state].label,auto:this.auto,paused:this.paused,
      reducedMotion:this.reducedMotion,frame:this.getFrame(),direction:this.direction}; }
    get size() { return Math.min(300, this.width * .66, this.height * .76) * this.scale; }
    _limits() {
      const m = Math.min(this.size * .44 + 10, this.width / 2);
      return {min: m, max: this.width - m};
    }
    resize() {
      if (this.destroyed) return;
      const rect = this.canvas.getBoundingClientRect();
      const old = this.width;
      this.width = Math.max(1, rect.width); this.height = Math.max(1, rect.height);
      this.dpr = Math.min(global.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.x = old ? this.x / old * this.width : this.width * .51;
      this.ground = this.height * .80;
      const bounds = this._limits(); this.x = clamp(this.x, bounds.min, bounds.max);
      if (this.target !== null) this.target = clamp(this.target / (old || this.width) * this.width, bounds.min, bounds.max);
      this.render();
    }
    /** Exécute une animation. Les actions ponctuelles reviennent ensuite au repos (ou à la musique). */
    play(state, options = {}) {
      if (this.destroyed) return;
      if (!(state in STATES)) throw new RangeError(`Animation inconnue : ${state}`);
      if (options.user !== false) this.lastInteraction = this.time;
      if (!['walk','run'].includes(state)) this.target = null;
      if (this.reducedMotion && state === 'disappear') state = 'hidden';
      if (this.reducedMotion && state === 'appear') state = this._rest();
      this.previousState = this.state; this.state = state; this.stateTime = 0;
      if (options.user !== false) this.nextAuto = this.time + 6 + Math.random() * 4;
      if (['pet','happy'].includes(state)) this.burst(state === 'pet' ? 'heart' : 'star', 12);
      if (['appear','disappear','jump'].includes(state)) this.burst('star', 20);
      this._emit('statechange', this.status()); this.render();
    }
    _rest() { return this.musicActive ? 'music' : 'idle'; }
    /** @param {number} x Destination horizontale en pixels CSS du canvas. */
    moveTo(x, running = false) {
      if (!Number.isFinite(x)) throw new TypeError('La destination doit être un nombre.');
      const b = this._limits(); const next = clamp(x, b.min, b.max);
      this.direction = next >= this.x ? 1 : -1;
      this.play(running ? 'run' : 'walk');
      this.target = next; this.marker = {x:next,age:0};
      if (this.reducedMotion || Math.abs(this.x - next) < 2) {
        this.x = next; this.target = null; this.play(this._rest(), {user:false});
      }
    }
    /** Marche vers le côté opposé de la scène. */
    stroll(running = false) {
      const b = this._limits();
      this.moveTo(this.x >= this.width * .5 ? b.min + 4 : b.max - 4, running);
    }
    pet() {
      if (this.state === 'hidden') { this.play('appear'); return; }
      if (this.state === 'sleep') { this.play('wake'); return; }
      this.play('pet'); this._emit('pet', {time:this.time});
    }
    sleep() { this.musicActive = false; this.play('sleep'); }
    wake() { this.play('wake'); }
    setAuto(enabled) { if(this.auto===Boolean(enabled))return; this.auto = Boolean(enabled); this.lastInteraction = this.time; this.nextAuto = this.time + 4; this._emit('settingschange', this.status()); }
    setPaused(enabled) { this.paused = Boolean(enabled); this.last = null; if(this.paused && this.raf !== null){cancelAnimationFrame(this.raf);this.raf=null;} this._emit('settingschange', this.status()); this.render(); this._schedule(); }
    setScale(value) { if (!Number.isFinite(value)) return; this.scale = clamp(value,.5,1.5); this.resize(); }
    setSpeed(value) { if (Number.isFinite(value)) this.speed = clamp(value,.35,2.5); }
    setScene(scene) { if (!(scene in SCENES)) throw new RangeError('Ambiance inconnue.'); this.scene = scene; this.render(); }
    setPixelated(enabled) { this.pixelated = Boolean(enabled); this.render(); }
    setGlow(enabled) { this.glow = Boolean(enabled); this.render(); }
    setReducedMotion(enabled) { this.motionOverride = true; this.reducedMotion = Boolean(enabled); this.particles = []; this.render(); this._emit('settingschange',this.status()); this._schedule(); }
    setMusicPlaying(enabled) {
      this.musicActive = Boolean(enabled);
      if (enabled) this.play('music', {user:false});
      else if (this.state === 'music') this.play('idle', {user:false});
    }
    /** Valeur 0..1 fournie par le lecteur Synaura. Aucune analyse audio n’est imposée. */
    setAudioLevel(value) { this.level = Number.isFinite(value) ? clamp(value,0,1) : 0; }
    /** Se connecte à un élément audio/vidéo existant, sans modifier sa source ni démarrer la lecture. */
    bindMedia(media) {
      if (!(media instanceof HTMLMediaElement)) throw new TypeError('Un élément audio ou vidéo est attendu.');
      if (this._mediaCleanup) this._mediaCleanup();
      const onPlay = () => this.setMusicPlaying(true);
      const onPause = () => this.setMusicPlaying(false);
      media.addEventListener('play',onPlay); media.addEventListener('pause',onPause); media.addEventListener('ended',onPause);
      this._mediaCleanup = () => { media.removeEventListener('play',onPlay); media.removeEventListener('pause',onPause); media.removeEventListener('ended',onPause); };
      this.setMusicPlaying(!media.paused && !media.ended);
      return this._mediaCleanup;
    }
    reset() {
      this.direction = 1; this.x = this.width * .51; this.lift = 0; this.target = null;
      this.dragging = false; this.particles = []; this.marker = null; this.setPaused(false);
      this.lastInteraction = this.time; this.nextBlink = this.time + 3.8; this.play(this._rest());
    }
    burst(kind = 'star', count = 12) {
      if (this.reducedMotion || !this.glow) return;
      for (let i=0; i<Math.min(count,35); i++) {
        this.particles.push({kind,x:this.x+(Math.random()-.5)*this.size*.35,
          y:this.ground-this.size*(.5+Math.random()*.2), vx:(Math.random()-.5)*55,
          vy:-22-Math.random()*50, age:0, life:1+Math.random()*1.5, size:3+Math.random()*5});
      }
      if (this.particles.length > 120) this.particles.splice(0,this.particles.length-120);
    }
    _point(e) { const r=this.canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
    _hit(p) { return this.state !== 'hidden' && Math.abs(p.x-this.x)<this.size*.4 && p.y<this.ground+12 && p.y>this.ground-this.size*.9-this.lift; }
    _installPointer() {
      this._listen(this.canvas,'pointerdown',e => {
        if (e.button !== 0) return;
        const p=this._point(e);
        this.pointer={id:e.pointerId,start:p,last:p,onPet:this._hit(p),offsetX:this.x-p.x,offsetY:this.ground-p.y};
        this.canvas.setPointerCapture(e.pointerId); this.lastInteraction=this.time;
      });
      this._listen(this.canvas,'pointermove',e => {
        const p=this._point(e);
        this.canvas.style.cursor=this._hit(p)?'grab':'crosshair';
        if (!this.pointer || this.pointer.id!==e.pointerId) return;
        this.pointer.last=p;
        if (this.pointer.onPet && Math.hypot(p.x-this.pointer.start.x,p.y-this.pointer.start.y)>7 && !this.reducedMotion) {
          if (!this.dragging) { this.dragging=true; this.play('curious'); }
          const b=this._limits(); this.x=clamp(p.x+this.pointer.offsetX,b.min,b.max);
          this.lift=clamp(this.ground-(p.y+this.pointer.offsetY),0,this.height*.45);
          this.canvas.style.cursor='grabbing'; this.render();
        }
      });
      const release=(e,cancelled=false) => {
        if (!this.pointer || this.pointer.id!==e.pointerId) return;
        const down=this.pointer; const dragged=this.dragging; this.pointer=null; this.dragging=false;
        if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
        if (cancelled) {this.lift=0;return;}
        if (dragged) { this.play('happy'); this._emit('drop',{x:this.x}); }
        else if (down.onPet) this.pet();
        else this.moveTo(this._point(e).x,e.shiftKey);
        this.canvas.focus({preventScroll:true});
      };
      this._listen(this.canvas,'pointerup',e=>release(e));
      this._listen(this.canvas,'pointercancel',e=>release(e,true));
      this._listen(this.canvas,'dblclick',e=>{ e.preventDefault(); this.play('jump'); });
      this._listen(this.canvas,'keydown',e=>{
        const keys=['ArrowLeft','ArrowRight',' ','j','m','d','r'];
        if (!keys.includes(e.key)) return; e.preventDefault();
        if(e.key==='ArrowLeft') this.moveTo(this.x-130,e.shiftKey);
        if(e.key==='ArrowRight') this.moveTo(this.x+130,e.shiftKey);
        if(e.key===' ') this.pet();
        if(e.key==='j') this.play('jump');
        if(e.key==='m') this.play(this.state==='music'?'idle':'music');
        if(e.key==='d') this.state==='sleep'?this.wake():this.sleep();
        if(e.key==='r') this.reset();
      });
    }
    _schedule() {
      if (!this.destroyed && !this.paused && !this.reducedMotion && this.loaded && !document.hidden && this.raf === null) this.raf=requestAnimationFrame(this._tick);
    }
    _tick(timestamp) {
      this.raf=null;
      if (this.destroyed) return;
      const dt=this.last === null ? 0 : Math.min((timestamp-this.last)/1000,.08);
      this.last=timestamp;
      if (!this.paused) { this._step(dt * this.speed); this.render(); }
      this._schedule();
    }
    _step(dt) {
      this.time+=dt; this.stateTime+=dt;
      if (!this.dragging) this.lift=Math.max(0,this.lift-dt*380);
      if (this.marker) {this.marker.age+=dt;if(this.marker.age>1.1)this.marker=null;}
      if ((this.state==='walk'||this.state==='run') && this.target!==null) {
        const delta=this.target-this.x, distance=(this.state==='run'?155:64)*dt;
        this.direction=delta>=0?1:-1;
        if (Math.abs(delta)<=distance+1) {this.x=this.target;this.target=null;this.play(this._rest(),{user:false});}
        else this.x+=Math.sign(delta)*distance;
      }
      const def=STATES[this.state];
      if (!this.dragging && def.duration && this.stateTime>=def.duration) {
        const next=this.state==='disappear'?'hidden':this._rest();
        this.play(next,{user:false});
      }
      if (this.auto && !this.reducedMotion && !this.dragging && !this.musicActive) {
        const calm=['idle','sit','stand'];
        if(calm.includes(this.state)&&this.time-this.lastInteraction>45) this.play('sleep',{user:false});
        else if(calm.includes(this.state)&&this.time>=this.nextBlink) {
          this.nextBlink=this.time+3.5+Math.random()*4; this.play('blink',{user:false});
        } else if(calm.includes(this.state)&&this.time>=this.nextAuto) {
          const pool=['tail','curious','look','stand','sit','walk'];
          const choice=pool[Math.floor(Math.random()*pool.length)];
          if(choice==='walk') {const last=this.lastInteraction;this.stroll();this.lastInteraction=last;}
          else this.play(choice,{user:false});
          this.nextAuto=this.time+6+Math.random()*7;
        }
      }
      for(const p of this.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
      this.particles=this.particles.filter(p=>p.age<p.life);
    }
    getFrame() {
      const def=STATES[this.state];
      let i=this.reducedMotion ? 0 : Math.floor(this.stateTime*def.fps);
      if(def.loop) i%=def.frames.length; else i=Math.min(i,def.frames.length-1);
      return def.frames[i];
    }
    _star(x,y,r,color,alpha=1) {
      const c=this.ctx;c.save();c.globalAlpha*=alpha;c.fillStyle=color;c.beginPath();
      c.moveTo(x,y-r);c.lineTo(x+r*.23,y-r*.23);c.lineTo(x+r,y);c.lineTo(x+r*.23,y+r*.23);
      c.lineTo(x,y+r);c.lineTo(x-r*.23,y+r*.23);c.lineTo(x-r,y);c.lineTo(x-r*.23,y-r*.23);c.closePath();c.fill();c.restore();
    }
    _background() {
      const c=this.ctx,w=this.width,h=this.height,p=SCENES[this.scene];
      if(!p)return;
      const gradient=c.createLinearGradient(0,0,w*.4,h);gradient.addColorStop(0,p.top);gradient.addColorStop(1,p.bottom);
      c.fillStyle=gradient;c.fillRect(0,0,w,h);
      const glow=c.createRadialGradient(w*.52,h*.63,5,w*.52,h*.63,w*.58);
      glow.addColorStop(0,p.light+'24');glow.addColorStop(1,p.light+'00');c.fillStyle=glow;c.fillRect(0,0,w,h);
      for (let i=0;i<this.stars.length;i++) {
        const s=this.stars[i],alpha=this.reducedMotion?.45:.25+(Math.sin(this.time*.55+s.phase)+1)*.20;
        c.globalAlpha=alpha;c.fillStyle=p.star;c.beginPath();c.arc(s.x*w,s.y*h,s.r,0,TAU);c.fill();
        if(i%19===0)this._star(s.x*w,s.y*h,4,p.star,.8);
      }c.globalAlpha=1;
      // Subtle orbit lines and a quiet stage, all at CSS-pixel scale.
      c.strokeStyle=p.ring+'10';c.lineWidth=1;
      for(let i=0;i<3;i++){c.beginPath();c.ellipse(w*.51,h*.82,w*(.27+i*.13),h*(.055+i*.018),0,0,TAU);c.stroke();}
      const ringY=this.ground+3;
      c.save();c.translate(this.x,ringY);c.scale(1,.16);
      const rad=c.createRadialGradient(0,0,0,0,0,this.size*.65);rad.addColorStop(0,p.light+'35');rad.addColorStop(.6,p.light+'10');rad.addColorStop(1,p.light+'00');
      c.fillStyle=rad;c.beginPath();c.arc(0,0,this.size*.65,0,TAU);c.fill();c.restore();
      c.strokeStyle=p.ring+'4d';c.lineWidth=1;c.beginPath();c.ellipse(this.x,ringY,this.size*.40,this.size*.062,0,0,TAU);c.stroke();
      if(this.marker&&!this.reducedMotion){
        c.globalAlpha=1-this.marker.age/1.1;c.strokeStyle=p.ring;c.beginPath();c.ellipse(this.marker.x,this.ground,8+this.marker.age*24,3+this.marker.age*5,0,0,TAU);c.stroke();c.globalAlpha=1;
      }
    }
    _pose() {
      const t=this.stateTime,s=this.state,reduce=this.reducedMotion;
      let y=0,rot=0,sx=1,sy=1,dx=0,opacity=1;
      if(!reduce){
        const breath=Math.sin(this.time*2.1)*.006;
        if(!['walk','run','jump','play','hidden'].includes(s)){sx=1-breath*.4;sy=1+breath;}
        if(s==='music'){const b=Math.sin(t*TAU*1.15);rot=b*.035;sy=1+Math.max(0,b)*(.023+this.level*.045);y=Math.abs(b)*2;}
        if(s==='sleep'){sy=1+Math.sin(t*2)*.014;}
        if(s==='happy'||s==='pet'){rot=Math.sin(t*7)*.018;y=Math.max(0,Math.sin(t*4))*4;}
        if(s==='curious')rot=Math.sin(t*2)*.035;
        if(s==='look')y=Math.sin(t*1.4)*2;
        if(s==='walk'||s==='run'){y=Math.abs(Math.sin(t*(s==='run'?18:10)))*(s==='run'?5:2);}
        if(s==='jump'){
          const p=clamp(t/1.05,0,1);
          if(p<.16){sy=1-Math.sin(p/.16*Math.PI)*.13;sx=1+(1-sy)*.4;}
          else if(p<.86){y=Math.sin((p-.16)/.70*Math.PI)*this.size*.38;rot=Math.sin((p-.16)/.70*Math.PI)*-.07;}
          else{sy=1-Math.sin((p-.86)/.14*Math.PI)*.12;sx=1+(1-sy)*.35;}
        }
        if(s==='play'){y=Math.abs(Math.sin(t*4))*this.size*.18;dx=Math.sin(t*2.5)*22;rot=Math.sin(t*4)*.07;}
        if(s==='sniff'){rot=.045+Math.sin(t*7)*.012;sy=.93;dx=Math.sin(t*3)*5;}
      }
      if(s==='disappear'&&t>1.05)opacity=1-clamp((t-1.05)/.25,0,1);
      if(s==='appear'&&t<.15)opacity=clamp(t/.15,0,1);
      return {y:y+this.lift,rot,sx,sy,dx,opacity};
    }
    _decorations(pose) {
      if(this.reducedMotion||!this.glow)return;
      const c=this.ctx,t=this.stateTime,x=this.x+this.size*.3*this.direction,y=this.ground-this.size*.65-pose.y;
      if(this.state==='curious'){
        c.fillStyle='#b6d6ff';c.font='24px Georgia, serif';c.fillText('?',x,y-12+Math.sin(t*2)*3);
      }
      if(this.state==='music'){
        for(let i=0;i<3;i++){
          const phase=(t*.35+i*.33)%1;
          c.globalAlpha=Math.sin(phase*Math.PI)*.8;c.fillStyle='#83c7ff';c.font=`${16+i*2}px Georgia, serif`;
          c.fillText(i%2?'♫':'♪',this.x+(i-1)*this.size*.34+Math.sin(t+i)*8,y-phase*55);
        }c.globalAlpha=1;
      }
      if(this.state==='sleep'){
        for(let i=0;i<3;i++){
          const phase=(t*.22+i*.32)%1;c.globalAlpha=Math.sin(phase*Math.PI)*.75;c.fillStyle='#b1c9ef';c.font=`${12+phase*8}px Georgia, serif`;
          c.fillText('z',this.x+this.size*.28+phase*30,this.ground-this.size*.40-phase*65);
        }c.globalAlpha=1;
      }
      if(this.state==='play'){
        this._star(this.x+Math.sin(t*2)*this.size*.36,this.ground-this.size*.72-Math.cos(t*3)*16,8,'#9ed8ff');
      }
      if(['idle','sit','tail','stand','look'].includes(this.state)){
        const shimmer=(Math.sin(this.time*2)+1)*.5;
        this._star(this.x-this.direction*this.size*.28,this.ground-this.size*.32-pose.y,3+shimmer*2,'#9bcaff',shimmer*.65);
      }
      for(const p of this.particles){
        const a=Math.sin(Math.PI*(p.age/p.life));c.globalAlpha=a;
        if(p.kind==='heart'){c.fillStyle='#edc5ca';c.font=`${p.size+9}px Arial, sans-serif`;c.fillText('♥',p.x,p.y);}
        else this._star(p.x,p.y,p.size,'#a8d7ff');
      }c.globalAlpha=1;
    }
    render() {
      if(this.destroyed||!this.width)return;
      const c=this.ctx;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);
      this._background();
      if(!this.loaded)return;
      const frame=this.atlas.frames[this.getFrame()],pose=this._pose(),size=this.size;
      // Grounded, lighter shadow when the companion jumps or is carried.
      if(this.state!=='hidden'){
        c.save();c.globalAlpha=.20*pose.opacity*(1-clamp(pose.y/Math.max(size,1),0,.75));c.fillStyle='#030915';
        c.beginPath();c.ellipse(this.x,this.ground+1,size*.27*(1-pose.y/(size*3)),size*.028,0,0,TAU);c.fill();c.restore();
      }
      c.save();c.translate(this.x+pose.dx,this.ground-pose.y);c.scale(this.direction*pose.sx,pose.sy);c.rotate(pose.rot);
      c.globalAlpha=pose.opacity;c.imageSmoothingEnabled=!this.pixelated;
      if(!this.pixelated)c.imageSmoothingQuality='high';
      c.drawImage(this.image,frame.x,frame.y,frame.w,frame.h,-size*.5,-size*.925,size,size);c.restore();
      this._decorations(pose);
      if(this.dragging){c.font='11px system-ui';c.textAlign='center';c.fillStyle='#d6e4ff';c.fillText('Tout doucement…',this.x,this.ground-this.size*.9-pose.y-12);c.textAlign='start';}
    }
    /** Dessine une vignette sans créer un second moteur. */
    drawThumbnail(canvas, key, size=72) {
      const frame=this.atlas.frames[key];if(!frame||!this.loaded)return;
      canvas.width=size*2;canvas.height=size*2;
      const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
      c.drawImage(this.image,frame.x,frame.y,frame.w,frame.h,0,0,canvas.width,canvas.height);
    }
    destroy() {
      if(this.destroyed)return;this.destroyed=true;
      if(this.raf!==null)cancelAnimationFrame(this.raf);this.raf=null;
      this.resizeObserver.disconnect();for(const off of this._cleanups)off();this._cleanups=[];
      if(this._mediaCleanup)this._mediaCleanup();this.particles=[];
      this.image.onload=null;this.image.onerror=null;
    }
  }
  SynauraCompanion.states=STATES;
  global.SynauraCompanion=SynauraCompanion;
})(window);
