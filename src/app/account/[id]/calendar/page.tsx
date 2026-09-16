"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function CalendarPage() {
  const { currentAccount } = useAccount();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {MONTHS[currentMonth]} {currentYear}
            </h1>
            {currentAccount && (
              <p className="text-sm text-slate-500">{currentAccount.name}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm bg-slate-800 text-white rounded-lg">
            Month
          </button>
          <button className="px-3 py-1.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            Week
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-800">
          {DAYS.map((day) => (
            <div
              key={day}
              className="px-4 py-3 text-sm font-medium text-slate-500 text-center"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[120px] p-2 border-b border-r border-slate-800 ${
                day === null ? "bg-slate-900/50" : "hover:bg-slate-800/50 cursor-pointer"
              } ${index % 7 === 6 ? "border-r-0" : ""}`}
            >
              {day !== null && (
                <>
                  <div
                    className={`text-sm font-medium mb-2 ${
                      isToday(day)
                        ? "w-7 h-7 flex items-center justify-center bg-emerald-600 text-white rounded-full"
                        : "text-slate-400"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1">
                    {/* Posts will be loaded here */}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
