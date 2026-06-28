import { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight, UserCircle, LogOut } from 'lucide-react';

interface PinLockProps {
  user: any;
  onSuccess: () => void;
  onLogout: () => void;
}

export default function PinLock({ user, onSuccess, onLogout }: PinLockProps) {
  const [mode, setMode] = useState<'verify' | 'set' | 'confirm'>('verify');
  const [pin, setPin] = useState<string>('');
  const [tempPin, setTempPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const savedPin = localStorage.getItem(`pin_${user.uid}`);

  useEffect(() => {
    if (!savedPin) {
      setMode('set');
    } else {
      setMode('verify');
    }
  }, [savedPin, user.uid]);

  const handleKeyPress = (num: string) => {
    setError(null);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        // Automatically submit when 4 digits are entered
        setTimeout(() => {
          handleSubmit(nextPin);
        }, 150);
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = (finalPin: string) => {
    if (mode === 'verify') {
      if (finalPin === savedPin) {
        onSuccess();
      } else {
        triggerShake('Incorrect PIN. Please try again.');
        setPin('');
      }
    } else if (mode === 'set') {
      setTempPin(finalPin);
      setPin('');
      setMode('confirm');
    } else if (mode === 'confirm') {
      if (finalPin === tempPin) {
        localStorage.setItem(`pin_${user.uid}`, finalPin);
        onSuccess();
      } else {
        triggerShake('PINs do not match. Start again.');
        setPin('');
        setTempPin('');
        setMode('set');
      }
    }
  };

  const triggerShake = (msg: string) => {
    setError(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, mode, tempPin]);

  const renderHeader = () => {
    if (mode === 'verify') {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-full mx-auto border border-slate-200 text-black">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Enter App PIN</h2>
          <p className="text-xs text-black uppercase tracking-widest">Verify identity on this device</p>
        </div>
      );
    } else if (mode === 'set') {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 flex items-center justify-center rounded-full mx-auto border border-blue-200 text-blue-600">
            <Unlock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Create Device PIN</h2>
          <p className="text-xs text-black uppercase tracking-widest font-mono">Step 1 of 2: Set 4-digit PIN</p>
        </div>
      );
    } else {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 flex items-center justify-center rounded-full mx-auto border border-blue-300 text-blue-600">
            <Unlock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Confirm PIN</h2>
          <p className="text-xs text-black uppercase tracking-widest font-mono">Step 2 of 2: Re-enter PIN to confirm</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className={`max-w-sm w-full bg-white p-6 md:p-8 border border-slate-200 flex flex-col items-center gap-6 md:gap-8 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        {/* User Badge */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 px-4 rounded-none border border-slate-100 w-full shrink-0">
          <UserCircle className="w-5 h-5 text-black" />
          <div className="text-left flex-1 min-w-0">
            <p className="text-[10px] text-black uppercase tracking-widest">LOGGED IN AS</p>
            <p className="text-xs text-black truncate">{user.displayName || user.email}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-black hover:text-red-500 hover:bg-red-50"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center justify-center w-full">
          {renderHeader()}
        </div>

        {/* Dots Representation */}
        <div className="flex gap-4 justify-center">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div 
              key={idx} 
              className={`w-4 h-4 rounded-full border-2 transition-colors duration-200 ${
                pin.length > idx 
                  ? 'bg-slate-900 border-slate-900' 
                  : 'border-slate-300 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        <div className="h-6 text-center shrink-0 w-full">
          {error && <p className="text-xs text-red-500 font-semibold uppercase tracking-widest">{error}</p>}
        </div>

        {/* Numeric Numpad */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 w-full max-w-[260px] mx-auto pb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button 
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 w-full border border-slate-100 bg-slate-50 text-2xl font-medium text-black hover:bg-slate-100 active:bg-slate-200 transition-colors flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => setPin('')}
            className="h-14 w-full text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-black hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center"
          >
            Clear
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="h-14 w-full border border-slate-100 bg-slate-50 text-2xl font-medium text-black hover:bg-slate-100 active:bg-slate-200 transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button 
            onClick={handleBackspace}
            className="h-14 w-full text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-black hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center"
          >
            Del
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="text-[10px] uppercase tracking-widest text-black hover:text-black hover:underline pt-2"
        >
          Switch Account / Logout
        </button>
      </div>
    </div>
  );
}

