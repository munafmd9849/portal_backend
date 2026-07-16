import React from 'react';
import { Briefcase, ListChecks, MessagesSquare, Trophy } from 'lucide-react';

const DashboardStatsSection = ({ studentData }) => {
  const stats = studentData?.stats;

  // Soft semantic tints — status color without heavy saturated blocks
  const statsData = [
    {
      label: 'Applied',
      count: stats?.applied || 0,
      surface: 'bg-rose-50/70 border-rose-100',
      labelColor: 'text-rose-700/80',
      iconWrap: 'bg-rose-100/80 text-rose-600',
      icon: Briefcase,
    },
    {
      label: 'Shortlisted',
      count: stats?.shortlisted || 0,
      surface: 'bg-sky-50/70 border-sky-100',
      labelColor: 'text-sky-700/80',
      iconWrap: 'bg-sky-100/80 text-sky-600',
      icon: ListChecks,
    },
    {
      label: 'Interviewed',
      count: stats?.interviewed || 0,
      surface: 'bg-emerald-50/70 border-emerald-100',
      labelColor: 'text-emerald-700/80',
      iconWrap: 'bg-emerald-100/80 text-emerald-600',
      icon: MessagesSquare,
    },
    {
      label: 'Offers',
      count: stats?.offers || 0,
      surface: 'bg-violet-50/70 border-violet-100',
      labelColor: 'text-violet-700/80',
      iconWrap: 'bg-violet-100/80 text-violet-600',
      icon: Trophy,
    },
  ];

  return (
    <div className="w-full">
      <fieldset className="bg-white rounded-xl border-2 border-[#8ec5ff] py-3 px-3 sm:px-4 transition-all duration-200 shadow-lg hover:shadow-xl">
        <legend className="text-base sm:text-lg font-bold px-2 bg-gradient-to-r from-[#211868] to-[#b5369d] rounded-full text-transparent bg-clip-text">
          Career Insights
        </legend>

        <div className="mb-1 mt-1">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {statsData.map((stat) => {
              const Icon = stat.icon;
              const displayValue = stat.count;

              return (
                <div
                  key={stat.label}
                  className={`rounded-xl border p-3 sm:p-3.5 min-h-[64px] sm:min-h-[72px] flex items-center gap-2.5 sm:gap-3 ${stat.surface}`}
                >
                  <div
                    className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 ${stat.iconWrap}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium ${stat.labelColor} truncate`}>
                      {stat.label}
                    </p>
                    <p
                      className="text-xl sm:text-2xl font-semibold text-slate-900 tabular-nums leading-tight truncate"
                      title={String(displayValue)}
                    >
                      {displayValue}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </fieldset>
    </div>
  );
};

export default DashboardStatsSection;
