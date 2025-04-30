import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ClassList from "./pages/ClassList";
import RecordsList from "./pages/RecordsList";
import Wizard from "./pages/Wizard";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  const [location] = useLocation();
  const showHeaderFooter = !location.includes('/auth');
  
  return (
    <>
      {showHeaderFooter && <Header />}
      <main className="flex-grow">
        <Switch>
          <ProtectedRoute path="/" component={Home} />
          <ProtectedRoute path="/classes" component={ClassList} />
          <ProtectedRoute path="/records" component={RecordsList} />
          <ProtectedRoute path="/wizard" component={Wizard} />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      {showHeaderFooter && <Footer />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <Router />
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
