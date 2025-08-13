import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Moon, Sun, Eye, EyeOff, Shield, Users, ArrowRight, Sparkles, Zap, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeRole, getDashboardPath } from "@/utils/security";
import axiosInstance from "@/lib/axios";

// Admin credentials mapping for fallback
const ADMIN_CREDENTIALS = {
  "floorincharge@kietgroup.com": {
    password: "FloorIncharge@2026",
    role: "floor-incharge"
  },
  "hostelincharge@kietgroup.com": {
    password: "HostelIncharge@2026",
    role: "hostel-incharge"
  },
  "maingate@kietgroup.com": {
    password: "MainGate@2026",
    role: "gate"
  },
  "warden@kietgroup.com": {
    password: "Warden@2026",
    role: "warden"
  }
};

// Backend URL - Remove render URL and replace with localhost
const backendUrl = "http://localhost:5000";

// Interactive Feature Cards Component
const InteractiveFeatureCards = ({ theme }: { theme: string }) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const features = [
    {
      icon: Shield,
      title: "Secure Access",
      description: "Multi-factor authentication and role-based permissions"
    },
    {
      icon: Users,
      title: "Student Portal",
      description: "Easy permission requests and status tracking"
    },
    {
      icon: CheckCircle,
      title: "Real-time Updates",
      description: "Instant notifications and approval status"
    }
  ];

  return (
    <div className="flex items-center space-x-4">
      {features.map((feature, index) => (
        <div
          key={index}
          className={`group relative p-3 rounded-xl transition-all duration-500 cursor-pointer backdrop-blur-sm ${
            theme === 'dark' 
              ? 'bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/50 hover:border-blue-500/70 shadow-lg hover:shadow-blue-500/20' 
              : 'bg-white/70 hover:bg-white/90 border border-slate-200/60 hover:border-blue-500/70 shadow-lg hover:shadow-blue-500/20'
          } ${hoveredCard === index ? 'scale-110 shadow-2xl' : 'hover:scale-105'}`}
          onMouseEnter={() => setHoveredCard(index)}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center space-x-2">
            <feature.icon className={`w-4 h-4 transition-all duration-500 ${
              hoveredCard === index 
                ? 'text-blue-500 scale-125 animate-pulse' 
                : theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
            }`} />
            <span className={`text-xs font-medium transition-colors duration-500 ${
              hoveredCard === index 
                ? 'text-blue-500' 
                : theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              {feature.title}
            </span>
          </div>
          <div className={`absolute top-full left-0 mt-2 p-3 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none backdrop-blur-md ${
            theme === 'dark' ? 'bg-slate-800/90 text-slate-300 border border-slate-700/50' : 'bg-white/95 text-slate-700 border border-slate-200/50'
          } shadow-xl`}>
            {feature.description}
          </div>
        </div>
      ))}
    </div>
  );
};

// Enhanced Background Component
const EnhancedBackground = ({ theme }: { theme: string }) => {
  return (
    <>
      {/* Enhanced Gradient Background */}
      <div className="absolute inset-0">
        <div className={`absolute inset-0 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 via-purple-900/20 to-slate-900' 
            : 'bg-gradient-to-br from-slate-50 via-blue-50/30 via-indigo-50/20 to-purple-50/10'
        }`}></div>
      </div>

      {/* Animated Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200/10 rounded-full animate-float blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-300/10 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-purple-200/10 rounded-full animate-float blur-xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-pink-200/10 rounded-full animate-float-slow blur-xl" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Enhanced Grid Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.1)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      </div>

      {/* Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 w-48 h-48 bg-gradient-to-br from-blue-100/20 to-indigo-100/20 animate-morph blur-2xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gradient-to-br from-purple-100/15 to-pink-100/15 animate-morph blur-2xl" style={{ animationDelay: '4s' }}></div>
    </>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login, isAuthenticated, userRole, userDetails } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);


  // Check if user is already logged in
  useEffect(() => {
    const currentPath = window.location.pathname;
    console.log('[Login] Auth check:', {
      isAuthenticated,
      userRole,
      currentPath,
      hasToken: !!localStorage.getItem('token'),
      userDetails // Log userDetails to verify it's available
    });

    // Only redirect if on login page and authenticated
    if (isAuthenticated && userRole && currentPath === '/login') {
      const dashboardPath = `/dashboard/${userRole.replace('security', 'gate')}`; // Handle security/gate role mapping
      console.log('[Login] Redirecting to:', dashboardPath);
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, userRole, userDetails]); // Add userDetails to dependencies

  const authenticateWithBackend = async (email: string, password: string) => {
    try {
      setConnectionError(false);
      const response = await axiosInstance.post('/auth/login', {
        email,
        password
      });
      
      if (response.data.success) {
        return {
          success: true,
          userData: response.data.user,
          token: response.data.token
        };
      }
      return { success: false, message: response.data.message || 'Authentication failed' };
    } catch (error: any) {
      if (error.message === 'Network Error') {
        setConnectionError(true);
        return { success: false, message: 'Backend connection failed', fallback: true };
      }
      return { success: false, message: error.response?.data?.message || 'Authentication failed' };
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const backendAuth = await authenticateWithBackend(email, password);
      
      if (backendAuth.success && backendAuth.userData) {
        if (backendAuth.token) {
          localStorage.setItem('token', backendAuth.token);
        }
        
        const normalizedRole = normalizeRole(backendAuth.userData.role);
        await login(email, normalizedRole, backendAuth.userData);
        toast.success(`Welcome back, ${backendAuth.userData.name || email}`);
        
        const dashboardPath = getDashboardPath(normalizedRole);
        console.log('[Login] Navigating to:', dashboardPath);
        navigate(dashboardPath, { replace: true });
        return;
      }
      
      // Fallback authentication for admin users
      if (backendAuth.fallback || connectionError) {
        if (email in ADMIN_CREDENTIALS) {
          const adminInfo = ADMIN_CREDENTIALS[email as keyof typeof ADMIN_CREDENTIALS];
          
          if (password === adminInfo.password) {
            const mockToken = btoa(`admin:${email}`);
            localStorage.setItem('token', mockToken);
            const normalizedRole = normalizeRole(adminInfo.role);
            await login(email, normalizedRole);
            toast.success(`Welcome, ${normalizedRole.replace('-', ' ')}`);
            navigate(getDashboardPath(normalizedRole), { replace: true });
            return;
          }
        }
      }
      
      toast.error(backendAuth.message || "Invalid login credentials");
    } catch (error) {
      console.error('[Login] Error:', error);
      toast.error("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`h-screen relative overflow-hidden ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-slate-900 via-slate-800 via-purple-900/20 to-slate-900' 
        : 'bg-gradient-to-br from-slate-50 via-blue-50/30 via-indigo-50/20 to-purple-50/10'
    }`}>
      
      {/* Enhanced Background */}
      <EnhancedBackground theme={theme} />

      <div className="relative z-10 h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          
          {/* Left Side - Branding */}
          <div className="hidden lg:flex flex-col items-center justify-center space-y-6 text-center">
            <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm group hover:scale-110 transition-all duration-500 cursor-pointer shadow-2xl hover:shadow-blue-500/20 border border-white/20">
              <img 
                src="/kietlogo.png" 
                alt="KIET Logo" 
                className="w-20 h-20 object-contain filter drop-shadow-lg group-hover:drop-shadow-xl transition-all duration-500 group-hover:scale-110"
              />
            </div>
            <div className="space-y-3">
              <h1 className={`text-5xl font-bold bg-gradient-to-r ${
                theme === 'dark' 
                  ? 'from-blue-400 via-indigo-400 to-purple-400' 
                  : 'from-blue-600 via-indigo-600 to-purple-600'
              } bg-clip-text text-transparent tracking-tight hover:scale-105 transition-transform duration-500 cursor-pointer animate-pulse-slow`}>
                Outing and Home Permission Portal
              </h1>
              <p className={`text-lg ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              } font-medium`}>
                Secure Student Management Platform
              </p>
            </div>
            
            {/* Interactive Feature Cards */}
            <InteractiveFeatureCards theme={theme} />
            
            <div className={`flex items-center space-x-4 text-sm ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <div className="flex items-center space-x-2 group cursor-pointer hover:text-blue-500 transition-colors duration-500">
                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform duration-500" />
                <span>Secure Access</span>
              </div>
              <div className="flex items-center space-x-2 group cursor-pointer hover:text-blue-500 transition-colors duration-500">
                <Users className="w-4 h-4 group-hover:scale-110 transition-transform duration-500" />
                <span>Student Portal</span>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <Card className={`${
            theme === 'dark' 
              ? 'bg-slate-800/80 backdrop-blur-2xl border-slate-700/30 text-white shadow-2xl hover:shadow-blue-500/20' 
              : 'bg-white/90 backdrop-blur-2xl border-slate-200/30 shadow-2xl hover:shadow-blue-500/20'
          } p-8 space-y-6 rounded-2xl hover:scale-[1.02] transition-all duration-500 border border-white/20`}>
            
            {/* Mobile Logo and Header */}
            <div className="lg:hidden text-center space-y-4">
              <div className="p-4 rounded-xl mx-auto w-fit bg-white/90 backdrop-blur-sm group hover:scale-110 transition-all duration-500 cursor-pointer shadow-xl">
                <img 
                  src="/kietlogo.png" 
                  alt="KIET Logo" 
                  className="w-12 h-12 object-contain group-hover:drop-shadow-lg transition-all duration-500 group-hover:scale-110"
                />
              </div>
              <div className="space-y-2">
                <h1 className={`text-2xl font-bold bg-gradient-to-r ${
                  theme === 'dark' 
                    ? 'from-blue-400 via-indigo-400 to-purple-400' 
                    : 'from-blue-600 via-indigo-600 to-purple-600'
                } bg-clip-text text-transparent hover:scale-105 transition-transform duration-500 cursor-pointer`}>
                  Outing and Home Permission Portal
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Secure access to your dashboard
                </p>
              </div>
            </div>

            {/* Theme Toggle */}
            <div className="flex justify-end">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-500 hover:scale-110 ${
                  theme === 'dark' 
                    ? 'bg-slate-700/50 hover:bg-slate-600/50 text-white hover:shadow-blue-500/20' 
                    : 'bg-slate-100/50 hover:bg-slate-200/50 text-slate-600 hover:shadow-blue-500/20'
                } shadow-lg`}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {connectionError && (
              <div className={`p-3 rounded-lg text-sm backdrop-blur-sm ${
                theme === 'dark' 
                  ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/20' 
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                ⚠️ Backend connection failed. Using fallback authentication.
              </div>
            )}



            {/* Enhanced Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="email" className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Email Address / Roll Number
                </Label>
                <div className="relative group">
                  <Mail className={`absolute left-3 top-3 h-4 w-4 transition-all duration-500 ${
                    focusedField === 'email' 
                      ? 'text-blue-500 scale-125 animate-pulse' 
                      : theme === 'dark' ? 'text-slate-400 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'
                  }`} />
                  <Input
                    id="email"
                    type="text"
                    placeholder="Enter your email or roll number (e.g., 226Q1A4548)"
                    className={`pl-10 pr-4 py-3 text-sm transition-all duration-500 rounded-lg backdrop-blur-sm ${
                      theme === 'dark' 
                        ? 'bg-slate-700/50 border-slate-600/50 focus:border-blue-400/50 focus:ring-blue-400/20 hover:border-blue-400/30' 
                        : 'bg-slate-50/80 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-blue-400'
                    } focus:ring-2 focus:ring-opacity-20 hover:scale-[1.02] shadow-lg`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className={`text-sm font-semibold ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Password
                </Label>
                <div className="relative group">
                  <Lock className={`absolute left-3 top-3 h-4 w-4 transition-all duration-500 ${
                    focusedField === 'password' 
                      ? 'text-blue-500 scale-125 animate-pulse' 
                      : theme === 'dark' ? 'text-slate-400 group-hover:text-blue-400' : 'text-slate-400 group-hover:text-blue-500'
                  }`} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`pl-10 pr-10 py-3 text-sm transition-all duration-500 rounded-lg backdrop-blur-sm ${
                      theme === 'dark' 
                        ? 'bg-slate-700/50 border-slate-600/50 focus:border-blue-400/50 focus:ring-blue-400/20 hover:border-blue-400/30' 
                        : 'bg-slate-50/80 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 hover:border-blue-400'
                    } focus:ring-2 focus:ring-opacity-20 hover:scale-[1.02] shadow-lg`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-3 p-1 rounded transition-all duration-500 ${
                      theme === 'dark' 
                        ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-600/50 hover:scale-110' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 hover:scale-110'
                    }`}
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Login Help */}
              <div className={`p-3 rounded-lg text-sm backdrop-blur-sm ${
                theme === 'dark' 
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' 
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                💡 <strong>Students:</strong> Use your roll number (e.g., 226Q1A4548) as both username and password<br/>
                👨‍💼 <strong>Staff:</strong> Use your email address and assigned password
              </div>

              <Button 
                className={`w-full py-3 text-sm font-semibold transition-all duration-500 transform rounded-lg ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/20' 
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:shadow-blue-500/20'
                } hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group`}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-500" />
                  </div>
                )}
              </Button>
            </form>

            {/* Enhanced Footer */}
            <div className={`text-center text-xs ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <p>© Venkatnarayan Karanam</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;