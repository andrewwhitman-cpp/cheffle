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

  const mealTypeConfig: Record<string, { icon: string; bg: string; text: string; hover: string; border: string }> = {
    breakfast: {
      icon: '🍳',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      hover: 'hover:bg-yellow-100',
      border: 'border-yellow-200',
    },
    lunch: {
      bg: 'bg-green-50',
      text: 'text-green-800',
      hover: 'hover:bg-green-100',
      border: 'border-green-200',
      icon: '🥗',
    },
    dinner: {
      bg: 'bg-orange-50',
      text: 'text-orange-800',
      hover: 'hover:bg-orange-100',
      border: 'border-orange-200',
      icon: '🍽️',
    },
  };

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-32 border border-gray-200 bg-gray-50"></div>
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
          className={`h-32 border border-gray-200 p-1 ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
          }`}
        >
          <div className={`text-xs font-semibold mb-0.5 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
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
                    meal ? 'font-medium' : 'opacity-60'
                  }`}
                  title={meal ? `${mealType}: ${meal.recipe.name}` : `Click to add ${mealType}`}
                >
                  {meal ? (
                    <span className="truncate block w-full">
                      <span className="mr-0.5">{config.icon}</span>
                      <span className="truncate">{meal.recipe.name}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400 text-[9px]">{config.icon}</span>
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
    <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
        {dayNames.map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2 border-b border-r border-gray-200 bg-gray-50 text-xs">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>

      <div className="mt-3 flex gap-3 text-xs text-gray-600 justify-center">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200"></div>
          <span>Breakfast</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-50 border border-green-200"></div>
          <span>Lunch</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-50 border border-orange-200"></div>
          <span>Dinner</span>
        </div>
      </div>
    </div>
  );
}
