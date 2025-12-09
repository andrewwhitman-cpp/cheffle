'use client';

import { useState, useEffect } from 'react';

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
  onDateClick: (date: Date) => void;
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

  const getMealsForDate = (date: Date): MealPlan[] => {
    const dateStr = date.toISOString().split('T')[0];
    return mealPlans.filter((mp) => mp.date === dateStr);
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

  const renderCalendarDays = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = date.getTime() === today.getTime();
      const meals = getMealsForDate(date);

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          }`}
          onClick={() => onDateClick(date)}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-16">
            {meals.map((meal) => (
              <div
                key={meal.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMealClick(meal);
                }}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded truncate hover:bg-blue-200 cursor-pointer"
                title={`${meal.meal_type}: ${meal.recipe.name}`}
              >
                <span className="font-medium">{meal.meal_type}:</span> {meal.recipe.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            ←
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {dayNames.map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2 border-b">
            {day}
          </div>
        ))}
        {renderCalendarDays()}
      </div>
    </div>
  );
}
