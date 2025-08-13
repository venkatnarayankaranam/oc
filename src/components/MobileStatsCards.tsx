import React from 'react';
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

interface StatCard {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'yellow' | 'green' | 'red' | 'indigo' | 'purple';
  onClick?: () => void;
  isClickable?: boolean;
  isEmergency?: boolean;
}

interface MobileStatsCardsProps {
  stats: StatCard[];
  columns?: 2 | 3 | 4;
}

export const MobileStatsCards: React.FC<MobileStatsCardsProps> = ({
  stats,
  columns = 4
}) => {
  const { theme } = useTheme();

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: {
        bg: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
        text: theme === 'dark' ? 'text-blue-500' : 'text-blue-600'
      },
      yellow: {
        bg: theme === 'dark' ? 'bg-yellow-900/30' : 'bg-yellow-100',
        text: theme === 'dark' ? 'text-yellow-500' : 'text-yellow-600'
      },
      green: {
        bg: theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100',
        text: theme === 'dark' ? 'text-green-500' : 'text-green-600'
      },
      red: {
        bg: theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100',
        text: theme === 'dark' ? 'text-red-500' : 'text-red-600'
      },
      indigo: {
        bg: theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100',
        text: theme === 'dark' ? 'text-indigo-500' : 'text-indigo-600'
      },
      purple: {
        bg: theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100',
        text: theme === 'dark' ? 'text-purple-500' : 'text-purple-600'
      }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const getGridCols = () => {
    switch (columns) {
      case 2: return 'grid-cols-2';
      case 3: return 'grid-cols-2 lg:grid-cols-3';
      case 4: return 'grid-cols-2 md:grid-cols-4';
      default: return 'grid-cols-2 md:grid-cols-4';
    }
  };

  return (
    <div className={`grid ${getGridCols()} gap-3 md:gap-6`}>
      {stats.map((stat, index) => {
        const colors = getColorClasses(stat.color);
        
        return (
          <Card 
            key={index}
            className={`p-3 md:p-6 ${theme === 'dark' ? 'bg-gray-800/90 border-gray-700' : 'glass-card'} ${
              stat.isClickable ? 'cursor-pointer transition-all hover:scale-105' : ''
            } ${
              stat.isEmergency ? 'ring-2 ring-red-500 animate-pulse' : ''
            }`}
            onClick={stat.onClick}
          >
            <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-2 sm:space-y-0">
              <div className={`p-2 md:p-3 ${colors.bg} rounded-full`}>
                <div className={`w-4 h-4 md:w-6 md:h-6 ${colors.text}`}>
                  {stat.icon}
                </div>
              </div>
              <div className="text-center sm:text-left">
                <p className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} ${
                  stat.isEmergency ? 'font-bold' : ''
                }`}>
                  {stat.title}
                </p>
                <p className={`text-lg md:text-2xl font-semibold ${
                  stat.isEmergency ? 'text-red-600' : ''
                }`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MobileStatsCards;