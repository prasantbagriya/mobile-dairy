import { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setShow(!show);
      }}
    >
      <Info className="w-3.5 h-3.5 text-black hover:text-blue-400 cursor-help" />
      {show && (
        <div className="absolute top-full mt-2 -left-2 sm:left-1/2 sm:-translate-x-1/2 md:left-6 md:-translate-y-1/2 md:top-1/2 md:translate-x-0 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-none z-[9999] leading-snug border border-slate-700 shadow-xl pointer-events-none">
          {text}
        </div>
      )}
    </div>
  );
}
