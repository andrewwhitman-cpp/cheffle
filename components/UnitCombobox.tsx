'use client';

import { useState, useRef, useEffect } from 'react';
import { INVENTORY_UNITS } from '@/lib/units';

interface UnitComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function UnitCombobox({
  value,
  onChange,
  placeholder = 'Unit',
  className = '',
  disabled = false,
  size = 'md',
}: UnitComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = value || '';
  const filterLower = inputValue.trim().toLowerCase();
  const filteredUnits = filterLower
    ? INVENTORY_UNITS.filter((u) => u.toLowerCase().includes(filterLower))
    : [...INVENTORY_UNITS];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputValue('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    setInputValue(displayValue);
  };

  const handleBlur = () => {
    setIsOpen(false);
    setInputValue('');
  };

  const handleSelect = (unit: string) => {
    onChange(unit);
    setIsOpen(false);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      setInputValue('');
      (e.target as HTMLInputElement).blur();
    }
  };

  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';
  const inputSizeClasses = size === 'sm' ? 'w-32' : 'w-36 min-w-[140px]';
  const roundedClass = size === 'sm' ? 'rounded' : 'rounded-lg';
  const ringClass = size === 'sm' ? 'focus:ring-1' : 'focus:ring-2';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={isOpen ? inputValue : displayValue || ''}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputSizeClasses} ${sizeClasses} ${roundedClass} ${ringClass} border border-sage-300 focus:outline-none focus:ring-terracotta-500 focus:border-terracotta-500 bg-white text-sage-900 placeholder:text-sage-400`}
        autoComplete="off"
      />
      {isOpen && (
        <ul
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-sage-200 bg-white py-1 shadow-lg"
          style={{ minWidth: '140px' }}
        >
          {filteredUnits.length === 0 ? (
            <li className="px-4 py-2 text-sm text-sage-500">No matching units</li>
          ) : (
            filteredUnits.map((u) => (
              <li key={u || 'none'}>
                <button
                  type="button"
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-sage-100 focus:bg-sage-100 focus:outline-none ${
                    u === value ? 'bg-terracotta-50 text-terracotta-800' : 'text-sage-800'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(u);
                  }}
                >
                  {u || '—'}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
