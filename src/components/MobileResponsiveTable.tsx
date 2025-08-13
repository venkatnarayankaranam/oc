import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { Eye, CheckCircle, XCircle } from "lucide-react";

interface TableColumn {
  key: string;
  title: string;
  render?: (value: any, row: any) => React.ReactNode;
  mobileLabel?: string;
}

interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (row: any) => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  className?: string;
  condition?: (row: any) => boolean;
}

interface MobileResponsiveTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableAction[];
  emptyMessage?: string;
  keyField?: string;
  isEmergency?: (row: any) => boolean;
}

export const MobileResponsiveTable: React.FC<MobileResponsiveTableProps> = ({
  data,
  columns,
  actions = [],
  emptyMessage = "No data found",
  keyField = "id",
  isEmergency
}) => {
  const { theme } = useTheme();

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-3">
        {data.map((row, index) => {
          const emergency = isEmergency ? isEmergency(row) : false;
          return (
            <Card key={row[keyField] || index} className={`p-4 ${
              emergency ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-900/20' : ''
            } ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-white/50'}`}>
              <div className="space-y-3">
                {/* Main content */}
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {columns.map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;
                    
                    return (
                      <div key={column.key} className="flex justify-between items-start">
                        <span className="text-gray-500 font-medium min-w-0 flex-shrink-0 mr-2">
                          {column.mobileLabel || column.title}:
                        </span>
                        <span className="text-right flex-1 min-w-0 break-words">
                          {displayValue || 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Emergency indicator */}
                {emergency && (
                  <div className="flex justify-center">
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                      🚨 EMERGENCY
                    </span>
                  </div>
                )}
                
                {/* Action Buttons */}
                {actions.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {actions.map((action, actionIndex) => {
                      if (action.condition && !action.condition(row)) return null;
                      
                      return (
                        <Button
                          key={actionIndex}
                          variant={action.variant || "outline"}
                          size="sm"
                          onClick={() => action.onClick(row)}
                          className={`w-full justify-center ${action.className || ''}`}
                        >
                          {action.icon && <span className="mr-2">{action.icon}</span>}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              {columns.map((column) => (
                <th key={column.key} className="text-left py-3 text-sm font-medium">
                  {column.title}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="text-right py-3 text-sm font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const emergency = isEmergency ? isEmergency(row) : false;
              return (
                <tr key={row[keyField] || index} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} ${
                  emergency ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : ''
                }`}>
                  {columns.map((column) => {
                    const value = row[column.key];
                    const displayValue = column.render ? column.render(value, row) : value;
                    
                    return (
                      <td key={column.key} className="py-3 text-sm">
                        <div className="flex items-center gap-2">
                          {displayValue || 'N/A'}
                          {emergency && column.key === columns[0].key && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded animate-pulse">
                              🚨 EMERGENCY
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td className="py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {actions.map((action, actionIndex) => {
                          if (action.condition && !action.condition(row)) return null;
                          
                          return (
                            <Button
                              key={actionIndex}
                              variant={action.variant || "outline"}
                              size="sm"
                              onClick={() => action.onClick(row)}
                              className={`px-2 ${action.className || ''}`}
                            >
                              {action.icon || action.label}
                            </Button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default MobileResponsiveTable;