
import { useState, useEffect } from "react";
import { Bell, User, Settings, LogOut, Moon, Sun, Home, Shield, Activity } from "lucide-react";
import ProfileDialog from "./ProfileDialog";
import NotificationsDialog from "./NotificationsDialog";
import SettingsDialog from "./SettingsDialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: React.ReactNode;
  showScannerButton?: boolean;
  showProfileButton?: boolean;
  showOutingRequestButton?: boolean;
}

const DashboardLayout = ({ 
  children,
  showScannerButton = false,
  showProfileButton = false,
  showOutingRequestButton = false
}: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { userEmail, userRole, logout, isAuthenticated } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated || !userRole) {
      // Redirect to login if not authenticated
      toast.error("Please login to continue");
      navigate("/login");
    }
  }, [isAuthenticated, userRole, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`min-h-screen ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/20'
    }`}>
      {/* Enhanced Navigation Bar */}
      <nav className={`${
        theme === 'dark' 
          ? 'bg-gray-800/90 backdrop-blur-xl border-gray-700/50 shadow-2xl' 
          : 'bg-white/90 backdrop-blur-xl border-gray-200/50 shadow-2xl'
      } fixed top-0 w-full z-50 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 flex items-center border-b`}>
        <div className="flex w-full items-center justify-between gap-2 sm:gap-3">
          {/* Left: Logo + Role */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`p-1.5 sm:p-2 rounded-lg ${
              theme === 'dark' 
                ? 'bg-blue-500/20 border border-blue-500/30' 
                : 'bg-blue-100 border border-blue-200'
            }`}>
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-sm sm:text-lg md:text-xl font-bold truncate bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Outing System
              </h1>
              {userRole && (
                <span className={`inline-block mt-0.5 sm:mt-0 sm:ml-1 text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-medium whitespace-nowrap ${
                  theme === 'dark' 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                } shadow-lg`}>
                  {userRole.replace('-', ' ')}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions - optimized for mobile */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
            {/* Notifications */}
            <button 
              className={`relative p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700/50 hover:shadow-blue-500/20' 
                  : 'hover:bg-gray-100/50 hover:shadow-blue-500/20'
              } shadow-lg`}
              onClick={() => setIsNotificationsOpen(true)}
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white text-[8px] sm:text-[10px] flex items-center justify-center shadow-lg animate-pulse">
                2
              </span>
            </button>

            {/* Settings */}
            <button 
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700/50 hover:shadow-blue-500/20' 
                  : 'hover:bg-gray-100/50 hover:shadow-blue-500/20'
              } shadow-lg`}
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                theme === 'dark' 
                  ? 'hover:bg-gray-700/50 hover:shadow-blue-500/20' 
                  : 'hover:bg-gray-100/50 hover:shadow-blue-500/20'
              } shadow-lg`}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`p-1.5 sm:p-2 rounded-lg transition-all duration-300 ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700/50 hover:shadow-blue-500/20' 
                    : 'hover:bg-gray-100/50 hover:shadow-blue-500/20'
                } shadow-lg`} aria-label="User menu">
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={`w-48 ${
                theme === 'dark' 
                  ? 'bg-gray-800/95 border-gray-700/50 backdrop-blur-xl shadow-2xl' 
                  : 'bg-white/95 border-gray-200/50 backdrop-blur-xl shadow-2xl'
              }`}>
                <DropdownMenuItem 
                  onClick={() => setIsProfileOpen(true)}
                  className={`transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'hover:bg-gray-700/50 focus:bg-gray-700/50' 
                      : 'hover:bg-gray-100/50 focus:bg-gray-100/50'
                  }`}
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className={`transition-all duration-300 ${
                    theme === 'dark' 
                      ? 'hover:bg-red-500/20 focus:bg-red-500/20 text-red-400' 
                      : 'hover:bg-red-50 focus:bg-red-50 text-red-600'
                  }`}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>
      
      {/* Enhanced Main Content with mobile-safe paddings */}
      <main className={`pt-16 sm:pt-20 md:pt-24 px-2 sm:px-3 md:px-6 pb-16 sm:pb-20 md:pb-6 max-w-7xl mx-auto ${
        theme === 'dark' ? 'text-gray-200' : ''
      }`}>
        <div className="fade-in">{children}</div>
      </main>

      {/* Enhanced Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/5 rounded-full animate-float blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-300/5 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-purple-200/5 rounded-full animate-float blur-xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-pink-200/5 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '3s' }}></div>
      </div>

      <ProfileDialog 
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userEmail={userEmail || ''}
      />
      <NotificationsDialog 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <SettingsDialog 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout;
