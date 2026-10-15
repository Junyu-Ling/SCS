import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  ariaLabel = 'Verification code',
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusAt = (index: number) => {
    const next = Math.max(0, Math.min(index, length - 1));
    inputRefs.current[next]?.focus();
    inputRefs.current[next]?.select();
  };

  const emit = (nextDigits: string[]) => {
    onChange(nextDigits.join('').replace(/\D/g, '').slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const sanitized = raw.replace(/\D/g, '');
    if (sanitized.length === 0) {
      const next = [...digits];
      next[index] = '';
      emit(next);
      return;
    }

    if (sanitized.length === 1) {
      const next = [...digits];
      next[index] = sanitized;
      emit(next);
      if (index < length - 1) focusAt(index + 1);
      return;
    }

    const next = [...digits];
    for (let i = 0; i < sanitized.length && index + i < length; i += 1) {
      next[index + i] = sanitized[i];
    }
    emit(next);
    focusAt(Math.min(index + sanitized.length, length - 1));
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        emit(next);
        return;
      }
      if (index > 0) {
        const next = [...digits];
        next[index - 1] = '';
        emit(next);
        focusAt(index - 1);
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      focusAt(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const sanitized = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!sanitized) return;
    const next = Array.from({ length }, (_, i) => sanitized[i] ?? '');
    emit(next);
    focusAt(Math.min(sanitized.length, length) - 1);
  };

  return (
    <div className="flex justify-center gap-1.5 sm:gap-2" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          aria-label={`${ariaLabel} ${index + 1}`}
          className="h-10 w-10 shrink-0 rounded-md border border-[#D6E2DC] bg-white text-center text-lg font-semibold tabular-nums text-[#174D3D] outline-none transition-all focus:border-[#174D3D] focus:ring-2 focus:ring-[#174D3D]/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:w-11"
        />
      ))}
    </div>
  );
}
