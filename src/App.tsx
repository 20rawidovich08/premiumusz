import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import Index from "./pages/Index.tsx";
import Pricing from "./pages/Pricing.tsx";
import Stars from "./pages/Stars.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import TopUp from "./pages/TopUp.tsx";
import BuyPremium from "./pages/BuyPremium.tsx";
import BuyStars from "./pages/BuyStars.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import { AdminLayout } from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminOrders from "./pages/admin/AdminOrders.tsx";
import AdminTopups from "./pages/admin/AdminTopups.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminPlans from "./pages/admin/AdminPlans.tsx";
import AdminStars from "./pages/admin/AdminStars.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminBroadcast from "./pages/admin/AdminBroadcast.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/stars" element={<Stars />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/topup" element={<TopUp />} />
            <Route path="/buy/premium" element={<BuyPremium />} />
            <Route path="/buy/stars" element={<BuyStars />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="topups" element={<AdminTopups />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="stars" element={<AdminStars />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
