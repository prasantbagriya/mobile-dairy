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

  // Keyboard support removed as native input handles it now

  const renderHeader = () => {
    if (mode === 'verify') {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-slate-100 flex items-center justify-center rounded-full mx-auto border border-slate-200 text-black">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Enter App PIN</h2>
          <p className="text-xs text-black tracking-widest">Verify identity on this device</p>
        </div>
      );
    } else if (mode === 'set') {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-50 flex items-center justify-center rounded-full mx-auto border border-blue-200 text-blue-600">
            <Unlock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Create Device PIN</h2>
          <p className="text-xs text-black tracking-widest font-mono">Step 1 of 2: Set 4-digit PIN</p>
        </div>
      );
    } else {
      return (
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 flex items-center justify-center rounded-full mx-auto border border-blue-300 text-blue-600">
            <Unlock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl text-slate-900 tracking-tight">Confirm PIN</h2>
          <p className="text-xs text-black tracking-widest font-mono">Step 2 of 2: Re-enter PIN to confirm</p>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6">
      <div className={`max-w-sm w-full bg-white p-6 md:p-8 border border-slate-200 flex flex-col items-center gap-6 md:gap-8 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        {/* User Badge */}
        <div className="flex items-center justify-center gap-2 bg-slate-50 py-2 px-4 border border-slate-200 rounded-full w-fit mx-auto mb-2">
          <UserCircle className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-700 font-medium truncate max-w-[200px]">{user.displayName || user.email}</span>
        </div>

        <div className="flex flex-col items-center justify-center w-full">
          {renderHeader()}
        </div>

        {/* Error Message */}
        <div className="h-6 text-center shrink-0 w-full mb-4">
          {error && <p className="text-xs text-red-500 font-semibold tracking-widest">{error}</p>}
        </div>

        {/* OTP Input UI */}
        <div className="relative w-full max-w-[280px] mx-auto pb-4">
          <div className="flex gap-3 justify-center">
            {[0, 1, 2, 3].map((index) => (
              <div 
                key={index} 
                className={`w-14 h-16 sm:w-16 sm:h-20 border-2 flex items-center justify-center text-4xl rounded-none transition-all duration-200 ${
                  pin.length === index ? 'border-blue-600 bg-blue-50/30' : 
                  pin.length > index ? 'border-slate-800 text-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                {pin[index] ? '•' : ''}
              </div>
            ))}
          </div>
          
          <input 
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4} 
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              if (val.length <= 4) {
                setPin(val);
                setError(null);
                if (val.length === 4) {
                  setTimeout(() => handleSubmit(val), 150);
                }
              }
            }}
            autoFocus
            autoComplete="off"
            className="absolute inset-0 w-full h-full opacity-0 text-transparent bg-transparent cursor-text"
          />
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors text-xs tracking-widest font-bold mt-2"
        >
          <LogOut className="w-4 h-4" />
          SWITCH ACCOUNT
        </button>
      </div>
    </div>
  );
}

