import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Wells from "@/pages/Wells";
import WellDetails from "@/pages/WellDetails";
import Visualization from "@/pages/Visualization";
import WellMap from "@/pages/WellMap";
import Analysis from "@/pages/Analysis";
import UserManagement from "@/pages/UserManagement";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/wells" element={<Wells />} />
              <Route path="/wells/:id" element={<WellDetails />} />
              <Route path="/visualization" element={<Visualization />} />
              <Route path="/map" element={<WellMap />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/users" element={<UserManagement />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
