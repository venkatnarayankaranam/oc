import { Check, Clock, X, User, Shield, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { type ApprovalLevel, type ApprovalStatus } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';

interface ApprovalStagesProps {
  currentLevel: ApprovalLevel;
  floorInchargeApproval: ApprovalStatus;
  hostelInchargeApproval: ApprovalStatus;
  wardenApproval: ApprovalStatus;
}

export const ApprovalStages = ({
  floorInchargeApproval,
  hostelInchargeApproval,
  wardenApproval,
  currentLevel
}: ApprovalStagesProps) => {
  const { theme } = useTheme();

  const getStageStatus = (
    approval: 'pending' | 'approved' | 'denied',
    level: string
  ) => {
    const isPending = currentLevel === level && approval === 'pending';
    const isApproved = approval === 'approved';

    return {
      icon: isApproved ? Check : isPending ? Clock : X,
      variant: isApproved ? 'success' : isPending ? 'warning' : 'default',
      text: isApproved ? 'Approved' : isPending ? 'Pending' : 'Waiting',
      color: isApproved ? 'green' : isPending ? 'yellow' : 'gray'
    };
  };

  const getRoleIcon = (level: string) => {
    switch (level) {
      case 'floor-incharge':
        return User;
      case 'hostel-incharge':
        return Shield;
      case 'warden':
        return Crown;
      default:
        return User;
    }
  };

  const getRoleColor = (level: string) => {
    switch (level) {
      case 'floor-incharge':
        return 'blue';
      case 'hostel-incharge':
        return 'purple';
      case 'warden':
        return 'gold';
      default:
        return 'gray';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${
          theme === 'dark' 
            ? 'bg-indigo-500/20 border border-indigo-500/30' 
            : 'bg-indigo-100 border border-indigo-200'
        }`}>
          <Shield className="w-4 h-4 text-indigo-600" />
        </div>
        <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Approval Stages
        </span>
      </div>
      
      <div className="space-y-3">
        {[
          { name: 'Floor Incharge', status: floorInchargeApproval, level: 'floor-incharge' },
          { name: 'Hostel Incharge', status: hostelInchargeApproval, level: 'hostel-incharge' },
          { name: 'Warden', status: wardenApproval, level: 'warden' }
        ].map(({ name, status, level }) => {
          const { icon: Icon, variant, text, color } = getStageStatus(status, level);
          const RoleIcon = getRoleIcon(level);
          const roleColor = getRoleColor(level);
          
          const getStatusBadgeClass = () => {
            if (color === 'green') {
              return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg';
            } else if (color === 'yellow') {
              return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg animate-pulse';
            } else {
              return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white shadow-lg';
            }
          };

          const getRoleIconClass = () => {
            switch (roleColor) {
              case 'blue':
                return theme === 'dark' 
                  ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400' 
                  : 'bg-blue-100 border border-blue-200 text-blue-600';
              case 'purple':
                return theme === 'dark' 
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-400' 
                  : 'bg-purple-100 border border-purple-200 text-purple-600';
              case 'gold':
                return theme === 'dark' 
                  ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400' 
                  : 'bg-yellow-100 border border-yellow-200 text-yellow-600';
              default:
                return theme === 'dark' 
                  ? 'bg-gray-500/20 border border-gray-500/30 text-gray-400' 
                  : 'bg-gray-100 border border-gray-200 text-gray-600';
            }
          };
          
          return (
            <div key={level} className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
              theme === 'dark' 
                ? 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50' 
                : 'bg-gray-50/80 border border-gray-200/50 hover:border-gray-300/50'
            }`}>
              <div className={`p-2 rounded-lg ${getRoleIconClass()}`}>
                <RoleIcon className="w-4 h-4" />
              </div>
              
              <div className="flex-1">
                <span className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {name}
                </span>
              </div>
              
              <Badge 
                className={cn(
                  "px-3 py-1 rounded-full font-semibold flex items-center gap-2 transition-all duration-300",
                  getStatusBadgeClass(),
                  currentLevel === level && "animate-pulse shadow-xl"
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{text}</span>
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};
