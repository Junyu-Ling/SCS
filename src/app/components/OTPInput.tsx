import { useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function OTPInput({ length = 8, value, onChange, disabled = false }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // 将value拆分为数组
  const digits = value.split('').slice(0, length);
  while (digits.length < length) {
    digits.push('');
  }

  useEffect(() => {
    // 初始化时聚焦到第一个输入框
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [disabled]);

  const handleChange = (index: number, newValue: string) => {
    // 只允许数字
    const sanitized = newValue.replace(/[^0-9]/g, '');
    
    if (sanitized.length === 0) {
      // 删除当前数字
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    if (sanitized.length === 1) {
      // 输入单个数字
      const newDigits = [...digits];
      newDigits[index] = sanitized;
      onChange(newDigits.join(''));
      
      // 自动跳到下一个输入框
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (sanitized.length > 1) {
      // 处理粘贴多个数字的情况
      const newDigits = [...digits];
      for (let i = 0; i < sanitized.length && index + i < length; i++) {
        newDigits[index + i] = sanitized[i];
      }
      onChange(newDigits.join(''));
      
      // 聚焦到最后一个填充的输入框之后
      const nextIndex = Math.min(index + sanitized.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '') {
        // 当前框为空，删除前一个
        if (index > 0) {
          const newDigits = [...digits];
          newDigits[index - 1] = '';
          onChange(newDigits.join(''));
          inputRefs.current[index - 1]?.focus();
        }
      } else {
        // 当前框有值，删除当前
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const sanitized = pastedData.replace(/[^0-9]/g, '').slice(0, length);
    
    if (sanitized.length > 0) {
      const newDigits = sanitized.split('');
      while (newDigits.length < length) {
        newDigits.push('');
      }
      onChange(newDigits.join(''));
      
      // 聚焦到最后一个填充的输入框
      const lastIndex = Math.min(sanitized.length - 1, length - 1);
      inputRefs.current[lastIndex]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontVariantNumeric: 'tabular-nums'
          }}
        />
      ))}
    </div>
  );
}
