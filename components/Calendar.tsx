'use client';

import { useState } from 'react';

interface MealPlan {
  id: number;
  date: string;
  meal_type: string;
  recipe: {
    id: number;
    name: string;
  };
}

interface CalendarProps {
  mealPlans: MealPlan[];
  onDateClick: (date: Date, mealType: string) => void;
  onMealClick: (mealPlan: MealPlan) => void;
}

export default function Calendar({ mealPlans, onDateClick, onMealClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mealTypes = ['breakfast', 'lunch', 'dinner'];

  const getMealForDate = (date: Date, mealType: string): MealPlan | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.find((mp) => mp.date === dateStr && mp.meal_type === mealType);
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const mealTypeConfig: Record<string, { label: string; bg: string; text: string; hover: string; border: string }> = {
    breakfast: {
      label: 'B',
      bg: 'bg-cream-100',
      text: 'text-cream-800',
      hover: 'hover:bg-cream-200',
      border: 'border-cream-300',
    },
    lunch: {
      bg: 'bg-sage-100',
      text: 'text-sage-800',
      hover: 'hover:bg-sage-200',
      border: 'border-sage-300',
      label: 'L',
    },
    dinner: {
      bg: 'bg-terracotta-100',
      text: 'text-terracotta-800',
      hover: 'hover:bg-terracotta-200',
      border: 'border-terracotta-300',
      label: 'D',
    },
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-32 border border-sage-200 bg-cream-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();

      days.push(
        <div
          key={day}
          className={`h-32 border border-sage-200 p-1 ${
            isToday ? 'bg-terracotta-50 border-terracotta-300' : 'bg-white'
          }`}
        >
          <div className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-terracotta-700' : 'text-sage-800'}`}>
            {day}
          </div>
          <div className="space-y-0.5">
            {mealTypes.map((mealType) => {
              const meal = getMealForDate(date, mealType);
              const config = mealTypeConfig[mealType] || mealTypeConfig.breakfast;
              
              return (
                <div
                  key={mealType}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (meal) {
                      onMealClick(meal);
                    } else {
                      onDateClick(date, mealType);
                    }
                  }}
                  className={`text-[10px] px-1 py-0.5 rounded border ${config.bg} ${config.border} ${config.text} ${config.hover} cursor-pointer min-h-[20px] flex items-center ${
                    meal ? 'font-medium' : 'opacity-50'
                  }`}
                  title={meal ? `${mealType}: ${meal.recipe.name}` : `Click to add ${mealType}`}
                >
                  {meal ? (
                    <span className="truncate block w-full text-[10px]">
                      <span className="truncate">{meal.recipe.name}</span>
                    </span>
                  ) : (
                    <span className="text-sage-400 text-[9px] font-medium">{config.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-sage-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-sage-900 tracking-tight">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="px-3 py-1.5 text-sm border border-sage-300 rounded-md hover:bg-sage-50 transition-colors text-sage-700"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs border border-sage-300 rounded-md hover:bg-sage-50 transition-colors text-sage-700"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1.5 text-sm border border-sage-300 rounded-md hover:bg-sage-50 transition-colors text-sage-700"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 border border-sage-200 rounded-lg overflow-hidden">
        {dayNames.map((day) => (
          <div key={day} className="text-center font-medium text-sage-700 py-2 border-b border-r border-sage-200 bg-cream-50 text-xs">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-sage-600 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cream-200 border border-cream-300"></div>
          <span className="font-medium">Breakfast</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-sage-200 border border-sage-300"></div>
          <span className="font-medium">Lunch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-terracotta-200 border border-terracotta-300"></div>
          <span className="font-medium">Dinner</span>
        </div>
      </div>
    </div>
  );
}
