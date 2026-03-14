import { useState } from 'react';

export interface DiscoverOption {
  id: string;
  label: string;
}

export interface DiscoverQuestion {
  id: string;
  prompt: string;
  options: DiscoverOption[];
  allow_multiple?: boolean;
}

interface DiscoverQuestionStepProps {
  question: DiscoverQuestion;
  onSubmit: (answerId: string | string[]) => void;
}

export default function DiscoverQuestionStep({ question, onSubmit }: DiscoverQuestionStepProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOption = (id: string) => {
    if (question.allow_multiple) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelected(next);
    } else {
      setSelected(new Set([id]));
      // Auto-submit for single choice
      onSubmit(id);
    }
  };

  const handleSubmit = () => {
    if (selected.size === 0) return;
    if (question.allow_multiple) {
      onSubmit(Array.from(selected));
    } else {
      onSubmit(Array.from(selected)[0]);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto w-full py-12">
      <h2 className="text-3xl md:text-4xl font-serif text-sage-900 mb-10 text-center leading-tight">
        {question.prompt}
      </h2>
      
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {question.options.map((opt) => {
          const isSelected = selected.has(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`px-6 py-3 rounded-full text-base font-medium transition-all duration-300 border ${
                isSelected 
                  ? 'bg-terracotta-600 text-white border-terracotta-600 shadow-[0_4px_14px_-4px_rgba(200,75,49,0.4)]' 
                  : 'bg-white text-sage-700 border-sage-200 hover:border-sage-300 hover:bg-sage-50 shadow-sm'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {question.allow_multiple && (
        <div className="flex justify-center">
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0}
            className="btn-primary px-8 py-3 text-base shadow-[0_4px_14px_-6px_rgba(200,75,49,0.4)]"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
