'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// ===== MEDICINE DATA =====
const MEDICINES = [
  { id: 'sompraz', name: 'Sompraz 40mg', short: 'SMP', icon: '🔴', color: 'from-red-600 to-rose-500', badge: 'red',
    schedule: [
      { time: '🌅 Before Breakfast', condition: (dayIdx) => dayIdx % 2 === 0, daily: false, desc: 'Alternate days' }
    ]
  },
  { id: 'actopro', name: 'Actopro 100mg', short: 'ACT', icon: '🟠', color: 'from-orange-600 to-amber-500', badge: 'orange',
    schedule: [
      { time: '🌅 Before Breakfast', condition: () => true, daily: true, desc: 'Morning' },
      { time: '🌆 Before Dinner', condition: () => true, daily: true, desc: 'Evening' }
    ]
  },
  { id: 'neurobion', name: 'Neurobion', short: 'NBR', icon: '🟢', color: 'from-emerald-600 to-green-500', badge: 'green',
    schedule: [
      { time: '☀️ After Breakfast', condition: () => true, daily: true, desc: 'Daily' }
    ]
  },
  { id: 'sharanga', name: 'Sharanga', short: 'SHR', icon: '🔵', color: 'from-blue-600 to-cyan-500', badge: 'blue',
    schedule: [
      { time: '☀️ After Breakfast', condition: () => true, daily: true, desc: 'Daily' }
    ]
  },
  { id: 'probiotic', name: 'Probiotic / Prebiotic', short: 'PRO', icon: '🟣', color: 'from-purple-600 to-violet-500', badge: 'purple',
    schedule: [
      { time: '🌙 Night After Dinner', condition: () => true, daily: true, desc: 'Daily' }
    ]
  }
];

const START_DATE = new Date(2026, 5, 25);
const TOTAL_DAYS = 30;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDate(d) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDate(dayIdx) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + dayIdx);
  return d;
}

function getDayName(dayIdx) {
  return DAY_NAMES[getDate(dayIdx).getDay()];
}

function isWeekend(dayIdx) {
  const d = getDate(dayIdx).getDay();
  return d === 0 || d === 6;
}

function getMedicineKey(medId, slotIdx, dayIdx) {
  return `${medId}-${slotIdx}-${dayIdx}`;
}

// ===== SUB-COMPONENTS =====

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="card glass-hover group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-medium text-dark-400 uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-2xl font-bold gradient-text">{value}</div>
        {sub && <div className="text-xs text-dark-400 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function MedicineDot({ med, taken }) {
  const colors = { red: '#ef4444', orange: '#f97316', green: '#22c55e', blue: '#3b82f6', purple: '#a855f7' };
  return (
    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
      taken ? 'shadow-lg shadow-emerald-500/30 scale-110' : 'opacity-25'
    }`} style={{ backgroundColor: colors[med.badge] || '#64748b' }} 
    title={med.name} />
  );
}

function DayCell({ dayIdx, todayData, isToday, onClick, isPast }) {
  const date = getDate(dayIdx);
  const weekend = isWeekend(dayIdx);
  const takenCount = todayData.filter(t => t).length;
  const totalCount = todayData.length;
  const allTaken = takenCount === totalCount;
  const noneTaken = takenCount === 0;
  
  let statusColor = 'bg-dark-700';
  if (isPast && allTaken) statusColor = 'bg-emerald-500/20 border-emerald-500/30';
  else if (isPast && !noneTaken) statusColor = 'bg-amber-500/15 border-amber-500/20';
  else if (isPast) statusColor = 'bg-red-500/10 border-red-500/15';
  
  return (
    <button onClick={onClick}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-200
        ${statusColor} ${isToday ? 'ring-2 ring-blue-500/50 scale-105 shadow-lg shadow-blue-500/10' : 'border-transparent'}
        ${weekend ? 'bg-opacity-80' : ''}
        hover:scale-105 hover:shadow-lg active:scale-95`}
    >
      <span className={`text-xs font-semibold ${weekend ? 'text-blue-400' : 'text-dark-300'}`}>
        {date.getDate()}
      </span>
      <div className="flex gap-0.5 flex-wrap justify-center">
        {todayData.map((taken, i) => (
          <MedicineDot key={i} med={MEDICINES[i]} taken={taken} />
        ))}
      </div>
      {isPast && allTaken && (
        <span className="absolute -top-1 -right-1 text-[8px]">✅</span>
      )}
      {isToday && (
        <span className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 rounded-full animate-ping opacity-50" />
      )}
    </button>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  const [tracker, setTracker] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [view, setView] = useState('calendar');
  const [stats, setStats] = useState({ daily: [], streaks: [], overall: 0 });
  const [mounted, setMounted] = useState(false);
  const detailRef = useRef(null);
  
  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem('medicineTracker');
      if (saved) setTracker(JSON.parse(saved));
    } catch {}
  }, []);
  
  // Save to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('medicineTracker', JSON.stringify(tracker));
    }
  }, [tracker, mounted]);
  
  // Compute stats
  useEffect(() => {
    const daily = [];
    let totalSlots = 0;
    let totalTaken = 0;
    
    for (let i = 0; i < TOTAL_DAYS; i++) {
      let daySlots = 0;
      let dayTaken = 0;
      
      MEDICINES.forEach(med => {
        med.schedule.forEach((slot, si) => {
          if (slot.condition(i)) {
            daySlots++;
            const key = getMedicineKey(med.id, si, i);
            if (tracker[key]) dayTaken++;
          }
        });
      });
      
      daily.push({ day: i, taken: dayTaken, total: daySlots });
      totalSlots += daySlots;
      totalTaken += dayTaken;
    }
    
    let currentStreak = 0;
    let longestStreak = 0;
    const now = new Date();
    const todayIdx = Math.min(Math.floor((now - START_DATE) / (1000*60*60*24)), TOTAL_DAYS - 1);
    
    for (let i = 0; i <= todayIdx; i++) {
      const day = daily[i];
      if (day && day.taken === day.total) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    let backwardsStreak = 0;
    for (let i = todayIdx; i >= 0; i--) {
      const day = daily[i];
      if (day && day.taken === day.total) backwardsStreak++;
      else break;
    }
    
    setStats({
      daily,
      overall: totalSlots > 0 ? Math.round((totalTaken / totalSlots) * 100) : 0,
      totalTaken,
      totalSlots,
      currentStreak: backwardsStreak,
      longestStreak,
    });
  }, [tracker]);
  
  const currentDayIdx = useMemo(() => {
    const now = new Date();
    const diff = Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
    return Math.max(0, Math.min(diff, TOTAL_DAYS - 1));
  }, []);
  
  const toggleMedicine = useCallback((medId, slotIdx, dayIdx) => {
    const key = getMedicineKey(medId, slotIdx, dayIdx);
    setTracker(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);
  
  const isFuture = useCallback((dayIdx) => {
    return dayIdx > currentDayIdx;
  }, [currentDayIdx]);
  
  const getDayData = useCallback((dayIdx) => {
    const data = [];
    MEDICINES.forEach(med => {
      med.schedule.forEach((slot, si) => {
        if (slot.condition(dayIdx)) {
          const key = getMedicineKey(med.id, si, dayIdx);
          data.push(!!tracker[key]);
        }
      });
    });
    return data;
  }, [tracker]);
  
  const selectedDayData = selectedDay !== null ? getDayData(selectedDay) : [];
  
  const weekDays = useMemo(() => {
    const weeks = [];
    let week = [];
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const d = getDate(i);
      if (d.getDay() === 0 && week.length > 0) {
        weeks.push(week);
        week = [];
      }
      week.push(i);
    }
    if (week.length > 0) weeks.push(week);
    return weeks;
  }, []);
  
  if (!mounted) return null;
  
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-600/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-xl shadow-lg shadow-purple-500/20">
              💊
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">MedTracker</h1>
              <p className="text-[10px] text-dark-400 font-medium">June 25 – July 24, 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-dark-800 rounded-lg p-1 border border-dark-600">
            <button onClick={() => setView('calendar')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'calendar' ? 'bg-dark-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
              }`}>
              📅 Calendar
            </button>
            <button onClick={() => setView('stats')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'stats' ? 'bg-dark-600 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'
              }`}>
              📊 Stats
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Legend */}
        <div className="card flex flex-wrap gap-3 items-center">
          <span className="text-xs font-semibold text-dark-400 uppercase tracking-wider mr-2">Legend</span>
          {MEDICINES.map(med => {
            const bgColor = {red:'bg-red-500',orange:'bg-orange-500',green:'bg-emerald-500',blue:'bg-blue-500',purple:'bg-purple-500'}[med.badge];
            return (
              <div key={med.id} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${bgColor}`} />
                <span className="text-xs text-dark-300">{med.short}</span>
              </div>
            );
          })}
          <span className="text-dark-600 mx-1">|</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg" />
            <span className="text-xs text-dark-400">Taken</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-dark-500 opacity-25" />
            <span className="text-xs text-dark-400">Pending</span>
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="📅" label="Progress" value={`${stats.overall}%`} sub={`${stats.totalTaken}/${stats.totalSlots} doses`} color="from-blue-500 to-purple-500" />
              <StatCard icon="🔥" label="Current Streak" value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`} sub={stats.currentStreak > 0 ? 'Keep it up!' : 'Start tracking!'} color="from-orange-500 to-red-500" />
              <StatCard icon="🏆" label="Best Streak" value={`${stats.longestStreak} day${stats.longestStreak !== 1 ? 's' : ''}`} sub="Perfect adherence days" color="from-amber-500 to-yellow-500" />
              <StatCard icon="✅" label="Today" value={selectedDayData.filter(Boolean).length + '/' + selectedDayData.length} sub={selectedDay !== null ? formatDate(getDate(selectedDay)) : 'Select a day'} color="from-emerald-500 to-teal-500" />
            </div>

            {/* Calendar Grid */}
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm font-bold text-dark-200">📅 June — July 2026</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-dark-500">Tap a day to see details</span>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold text-dark-500 uppercase tracking-wider py-1">
                    {d}
                  </div>
                ))}
              </div>
              
              <div className="space-y-1.5">
                {weekDays.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1.5">
                    {week.map(dayIdx => {
                      const data = getDayData(dayIdx);
                      return (
                        <DayCell key={dayIdx}
                          dayIdx={dayIdx}
                          todayData={data}
                          isToday={dayIdx === currentDayIdx}
                          isPast={dayIdx <= currentDayIdx}
                          onClick={() => !isFuture(dayIdx) && setSelectedDay(dayIdx)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Day Detail */}
            {selectedDay !== null && (
              <div ref={detailRef} className="card animate-slide-up border-l-4 border-l-blue-500/50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-dark-100">{formatDate(getDate(selectedDay))}</h3>
                    <p className="text-xs text-dark-400">{getDayName(selectedDay)}{isWeekend(selectedDay) ? ' 🎉 Weekend' : ''} {selectedDay === currentDayIdx ? ' • Today' : selectedDay < currentDayIdx ? ' • Past' : ' • Future'}</p>
                  </div>
                  <button onClick={() => setSelectedDay(null)} className="btn-secondary text-xs px-2 py-1">✕</button>
                </div>
                
                <div className="space-y-2">
                  {MEDICINES.map(med => 
                    med.schedule.map((slot, si) => {
                      if (!slot.condition(selectedDay)) return null;
                      const key = getMedicineKey(med.id, si, selectedDay);
                      const taken = !!tracker[key];
                      const fut = isFuture(selectedDay);
                      
                      return (
                        <div key={key}
                          className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                            taken ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-dark-800/50 border border-dark-600/30'
                          } ${fut ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{med.icon}</span>
                            <div>
                              <p className={`text-sm font-medium ${taken ? 'text-emerald-300' : 'text-dark-200'}`}>
                                {med.name}
                              </p>
                              <p className="text-[11px] text-dark-400">{slot.time}</p>
                            </div>
                          </div>
                          {!fut && (
                            <button onClick={() => toggleMedicine(med.id, si, selectedDay)}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                taken 
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' 
                                  : 'bg-dark-700 text-dark-400 border border-dark-500 hover:bg-dark-600'
                              } active:scale-90`}
                            >
                              {taken ? '✓' : '○'}
                            </button>
                          )}
                          {fut && (
                            <span className="text-[10px] text-dark-500 font-medium px-2 py-1 rounded bg-dark-700">Upcoming</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                
                {selectedDay <= currentDayIdx && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-dark-600/50">
                    <button onClick={() => {
                      MEDICINES.forEach(med => {
                        med.schedule.forEach((slot, si) => {
                          if (slot.condition(selectedDay)) {
                            const key = getMedicineKey(med.id, si, selectedDay);
                            setTracker(prev => ({ ...prev, [key]: true }));
                          }
                        });
                      });
                    }}
                    className="btn-primary text-xs px-3 py-1.5">
                      Mark All Taken
                    </button>
                    <button onClick={() => {
                      MEDICINES.forEach(med => {
                        med.schedule.forEach((slot, si) => {
                          if (slot.condition(selectedDay)) {
                            const key = getMedicineKey(med.id, si, selectedDay);
                            setTracker(prev => ({ ...prev, [key]: false }));
                          }
                        });
                      });
                    }}
                    className="btn-secondary text-xs px-3 py-1.5">
                      Reset All
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="card">
              <h3 className="text-sm font-bold text-dark-200 mb-3">📋 Your Schedule</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {MEDICINES.map(med => (
                  <div key={med.id} className="flex items-start gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-600/30">
                    <span className="text-xl mt-0.5">{med.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-dark-200">{med.name}</p>
                      {med.schedule.map((slot, i) => (
                        <p key={i} className="text-[11px] text-dark-400">
                          {slot.time} — {slot.desc || 'Daily'}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STATS VIEW */}
        {view === 'stats' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold gradient-text">📊 Progress & Statistics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon="📊" label="Overall Adherence" value={`${stats.overall}%`} sub={`${stats.totalTaken} of ${stats.totalSlots} doses`} color="from-blue-500 to-cyan-500" />
              <StatCard icon="🔥" label="Streak" value={`${stats.currentStreak} day${stats.currentStreak !== 1 ? 's' : ''}`} sub={`Best: ${stats.longestStreak} days`} color="from-orange-500 to-red-500" />
              <StatCard icon="✅" label="Completed" value={`${stats.totalTaken}`} sub={`Out of ${stats.totalSlots} total`} color="from-emerald-500 to-teal-500" />
              <StatCard icon="📈" label="Remaining" value={`${stats.totalSlots - stats.totalTaken}`} sub="Doses to go" color="from-purple-500 to-violet-500" />
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-dark-200">Daily Adherence</h3>
                <span className="text-xs text-dark-400">Day by day</span>
              </div>
              <div className="space-y-1.5">
                {stats.daily.map((day, i) => {
                  if (i > currentDayIdx) return null;
                  const pct = day.total > 0 ? (day.taken / day.total) * 100 : 0;
                  const isWknd = isWeekend(i);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-[10px] font-medium w-16 text-right ${isWknd ? 'text-blue-400' : 'text-dark-400'}`}>
                        {getDate(i).getDate()} {getDate(i).toLocaleDateString('en-GB', { month: 'short' })}
                      </span>
                      <div className="flex-1 h-5 bg-dark-800 rounded-full overflow-hidden border border-dark-600/30 relative group">
                        <div className={`h-full rounded-full transition-all duration-500 ${
                          pct === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 
                          pct >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-400' : 
                          'bg-gradient-to-r from-red-500 to-rose-400'
                        }`} style={{ width: `${pct}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white/70">
                          {day.taken}/{day.total}
                        </span>
                      </div>
                      {pct === 100 && <span className="text-[11px]">✅</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-bold text-dark-200 mb-3">💊 Per Medicine Breakdown</h3>
              <div className="space-y-3">
                {MEDICINES.map(med => {
                  const total = Math.min(currentDayIdx + 1, TOTAL_DAYS) * med.schedule.length;
                  let taken = 0;
                  for (let i = 0; i <= currentDayIdx && i < TOTAL_DAYS; i++) {
                    med.schedule.forEach((slot, si) => {
                      if (slot.condition(i)) {
                        const key = getMedicineKey(med.id, si, i);
                        if (tracker[key]) taken++;
                      }
                    });
                  }
                  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;
                  
                  return (
                    <div key={med.id} className="flex items-center gap-3 p-3 rounded-lg bg-dark-800/50 border border-dark-600/30">
                      <span className="text-xl">{med.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-dark-200">{med.name}</span>
                          <span className="text-xs font-semibold">{taken}/{total} ({pct}%)</span>
                        </div>
                        <div className="h-2.5 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card text-center py-6">
              <span className="text-4xl mb-3 block">
                {stats.overall >= 90 ? '🌟' : stats.overall >= 75 ? '💪' : stats.overall >= 50 ? '📈' : '🎯'}
              </span>
              <p className="text-sm font-medium text-dark-200">
                {stats.overall >= 90 ? "Outstanding! You're crushing it! 🎉" :
                 stats.overall >= 75 ? "Great consistency! Keep pushing! 💪" :
                 stats.overall >= 50 ? "Good progress, stay on track! 📈" :
                 "Start small, stay consistent! You got this! 🎯"}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                {stats.currentStreak > 0 
                  ? `🔥 ${stats.currentStreak} day streak — don't break it!`
                  : "Start your streak today! Every dose counts."}
              </p>
            </div>
          </div>
        )}
      </main>
      
      <footer className="text-center py-6">
        <p className="text-xs text-dark-500">
          MedTracker 💊 · Built with care · remii 🦊
        </p>
      </footer>
    </div>
  );
}
