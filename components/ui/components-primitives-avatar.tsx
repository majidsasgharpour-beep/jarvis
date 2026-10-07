"use client";
import { useId } from "react";
import { motion } from "motion/react";

export type AvatarColor="blue"|"orange"|"red"|"green"|"purple"|"yellow"|"cyan"|"pink"|"indigo"|"lime"|"turquoise"|"violet";
export type AvatarSize="sm"|"md"|"lg";
export type AvatarShape="circle"|"square"|"squircle";
export interface AvatarProps{blinking?:boolean;color?:AvatarColor;size?:AvatarSize;shape?:AvatarShape;className?:string}

const colors:Record<AvatarColor,[string,string,string]>={blue:["#0d4d9a","#6fb3ff","#d4ecff"],orange:["#a63e10","#ffb46a","#ffd9b8"],red:["#a60033","#ff8aaa","#ffcde4"],green:["#0d6632","#6dd187","#c5f5d8"],purple:["#4a0080","#c896ff","#e0c9ff"],yellow:["#8a5500","#ffc93a","#fff0a8"],cyan:["#003d66","#5dd4ff","#d0f0ff"],pink:["#7a0055","#ff6bb3","#ffd6ed"],indigo:["#2d157a","#8b7eff","#e0d9ff"],lime:["#4a5910","#bef264","#f7fee8"],turquoise:["#1a5555","#2dd4bf","#c0fdf5"],violet:["#4a2a7a","#d8b4fe","#ede9fe"]};
const sizes:Record<AvatarSize,[string,string,string]>={sm:["size-8","w-1 h-1.5","gap-1.5"],md:["size-12","w-1.5 h-2.5","gap-2.5"],lg:["size-16","w-2 h-3","gap-3.5"]};
const radius:Record<AvatarShape,string>={circle:"rounded-full",square:"rounded-[0%]",squircle:"rounded-[40%]"};

function Eye({blink,delay,iris,size}:{blink:boolean;delay:number;iris:string;size:string}){
 return <div className={`rounded-full ${size}`} style={{background:iris,animation:blink?`av-blink 3.6s ease-in-out ${delay}ms infinite`:undefined}}/>;
}
export default function Avatar({blinking=true,color="blue",size="md",shape="circle",className=""}:AvatarProps){
 const id=useId().replace(/\W/g,""), [dark,light,iris]=colors[color], [orb,eye,gap]=sizes[size];
 return <><style>{`@keyframes av-blink{0%,88%,100%{transform:scaleY(1)}93%,97%{transform:scaleY(.07)}}`}</style>
 <motion.div aria-label="AI Avatar" role="img" whileTap={{scaleX:1.15,scaleY:1.3}} transition={{type:"tween",duration:.8,ease:[.34,1.56,.64,1]}}
 className={`relative flex cursor-pointer items-center justify-center overflow-hidden ${orb} ${radius[shape]} ${className}`}
 style={{background:`radial-gradient(circle at 50% 45%,${dark} 0%,${light} 68%,#fff 100%)`,boxShadow:`0 0 4px ${light},0 0 16px 6px ${light}55,inset 0 0 0 1px #ffffff0d`}}>
 <svg aria-hidden className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay" width="100%" height="100%"><defs><filter id={`n${id}`}><feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="4" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter></defs><rect width="100%" height="100%" filter={`url(#n${id})`}/></svg>
 <div className="pointer-events-none absolute inset-0" style={{background:"radial-gradient(ellipse at 30% 24%,rgba(255,255,255,.75),rgba(255,255,255,.1) 50%,transparent 70%)"}}/>
 <div className={`relative z-10 flex items-center ${gap} -translate-y-0.5`}><Eye blink={blinking} delay={0} iris={`linear-gradient(135deg,#fff,${iris})`} size={eye}/><Eye blink={blinking} delay={60} iris={`linear-gradient(135deg,#fff,${iris})`} size={eye}/></div>
 </motion.div></>;
}