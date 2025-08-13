import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "@/components/PageTransition";
import SmoothScroll from "@/components/SmoothScroll";
import LoadingSpinner from "@/components/LoadingSpinner";
import AnimatedBackground from "@/components/AnimatedBackground";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import StudentDashboard from "./pages/StudentDashboard";
import GateDashboard from "./pages/GateDashboard";
import WardenDashboard from "./pages/WardenDashboard";
import FloorInchargeDashboard from "./pages/FloorInchargeDashboard";
import HostelInchargeDashboard from "./pages/HostelInchargeDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <SmoothScroll>
            <AnimatedBackground>
              <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white/50 to-indigo-50/50 dark:from-gray-900/50 dark:via-gray-800/50 dark:to-gray-900/50 transition-all duration-500">
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/login" element={
                      <PageTransition>
                        <Login />
                      </PageTransition>
                    } />
                    {/* Update security/gate route */}
                    <Route path="/dashboard/security" element={
                      <ProtectedRoute allowedRoles={['security', 'gate']}>
                        <PageTransition>
                          <GateDashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/gate" element={
                      <Navigate to="/dashboard/security" replace />
                    } />
                    <Route path="/dashboard/floor-incharge" element={
                      <ProtectedRoute allowedRoles={['floor-incharge']}>
                        <PageTransition>
                          <FloorInchargeDashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/hostel-incharge" element={
                      <ProtectedRoute allowedRoles={['hostel-incharge']}>
                        <PageTransition>
                          <HostelInchargeDashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/warden" element={
                      <ProtectedRoute allowedRoles={['warden']}>
                        <PageTransition>
                          <WardenDashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard/student" element={
                      <ProtectedRoute allowedRoles={['student']}>
                        <PageTransition>
                          <StudentDashboard />
                        </PageTransition>
                      </ProtectedRoute>
                    } />
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={
                      <PageTransition>
                        <NotFound />
                      </PageTransition>
                    } />
                  </Routes>
                </BrowserRouter>
              </div>
            </AnimatedBackground>
          </SmoothScroll>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
