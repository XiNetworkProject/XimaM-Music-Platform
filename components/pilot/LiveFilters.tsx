'use client';

import { useEffect, useRef, type PointerEvent } from 'react';

type Filter = { id:string; name:string };
type Drag = { id:number; x:number; y:number; left:number; moved:boolean };

/** Horizontal browsing is local to this rail; only an explicit click changes the feed. */
export default function LiveFilters<T extends string>({items,active,onSelect,animated}:{items:readonly (Filter & {id:T})[];active:T;onSelect:(id:T)=>void;animated:boolean}) {
  const rail=useRef<HTMLElement>(null);
  const drag=useRef<Drag|null>(null);
  const suppressClick=useRef(false);
  const reveal=(button:HTMLElement,behavior:ScrollBehavior)=>{
    const node=rail.current;if(!node)return;
    const left=button.offsetLeft-(node.clientWidth-button.offsetWidth)/2;
    node.scrollTo({left:Math.max(0,Math.min(node.scrollWidth-node.clientWidth,left)),behavior});
  };
  useEffect(()=>{
    const button=rail.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if(button)reveal(button,animated?'smooth':'auto');
  },[active,animated]);
  const finish=(event:PointerEvent<HTMLElement>)=>{
    if(drag.current?.id!==event.pointerId)return;
    drag.current=null;event.currentTarget.removeAttribute('data-dragging');
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <nav ref={rail} className="live-filters" aria-label="Choisir le fil Live"
    onPointerDown={event=>{
      suppressClick.current=false;
      if(event.pointerType!=='mouse'||event.button!==0)return;
      drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:event.currentTarget.scrollLeft,moved:false};
    }}
    onPointerMove={event=>{
      const gesture=drag.current;if(!gesture||gesture.id!==event.pointerId)return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.moved){
        if(Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)){drag.current=null;return;}
        if(Math.abs(dx)<6)return;
        gesture.moved=true;suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.dataset.dragging='true';
      }
      event.preventDefault();event.currentTarget.scrollLeft=gesture.left-dx;
    }}
    onPointerUp={finish}
    onPointerCancel={event=>{finish(event);suppressClick.current=false;}}
    onLostPointerCapture={()=>{drag.current=null;rail.current?.removeAttribute('data-dragging');}}
    onClickCapture={event=>{if(suppressClick.current&&event.detail>0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}}}
    onKeyDown={event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const buttons=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button'));
      const index=buttons.indexOf(event.target as HTMLButtonElement);if(index<0)return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowRight'?1:-1)));
      buttons[next]?.focus({preventScroll:true});if(buttons[next])reveal(buttons[next],animated?'smooth':'auto');
    }}>
    {items.map(item=><button type="button" key={item.id} aria-pressed={active===item.id} onFocus={event=>{if(!drag.current)reveal(event.currentTarget,'auto');}} onClick={()=>onSelect(item.id)}>{item.name}</button>)}
  </nav>;
}
