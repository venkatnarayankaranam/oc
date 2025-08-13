import React from 'react';
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { PlusCircle, Home, ToggleLeft, ToggleRight } from "lucide-react";

interface MobileDashboardHeaderProps {
  title: string;
  subtitle: string;
  requestType: 'outing' | 'home';
  onRequestTypeChange: (type: 'outing' | 'home') => void;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
    className?: string;
  }>;
}

export const MobileDashboardHeader: React.FC<MobileDashboardHeaderProps> = ({
  title,
  subtitle,
  requestType,
  onRequestTypeChange,
  actions = []
}) => {
  const { theme } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl md:text-3xl font-semibold truncate">{title}</h2>
        <p className={`mt-1 text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          {subtitle}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        {/* Request Type Toggle */}
        <div className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl border ${
          theme === 'dark' 
            ? 'bg-gray-800/50 border-gray-600/50' 
            : 'bg-white/50 border-gray-200/50'
        } shadow-lg self-start sm:self-auto`}>
          <div className="flex items-center gap-1 md:gap-2">
            <PlusCircle className={`w-3 h-3 md:w-4 md:h-4 ${requestType === 'outing' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-xs md:text-sm font-medium ${requestType === 'outing' ? 'text-blue-600' : 'text-gray-500'}`}>
              Outing
            </span>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRequestTypeChange(requestType === 'outing' ? 'home' : 'outing')}
            className="p-1 h-auto min-w-0"
          >
            {requestType === 'outing' ? 
              <ToggleLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-400" /> : 
              <ToggleRight className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
            }
          </Button>
          
          <div className="flex items-center gap-1 md:gap-2">
            <Home className={`w-3 h-3 md:w-4 md:h-4 ${requestType === 'home' ? 'text-blue-600' : 'text-gray-400'}`} />
            <span className={`text-xs md:text-sm font-medium ${requestType === 'home' ? 'text-blue-600' : 'text-gray-500'}`}>
              Home
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            onClick={action.onClick}
            className={`flex items-center gap-2 w-full sm:w-auto justify-center ${action.className || ''}`}
            size="sm"
          >
            {action.icon && <span className="w-3 h-3 sm:w-4 sm:h-4">{action.icon}</span>}
            <span className="text-xs sm:text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default MobileDashboardHeader;