import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import ClassList from "./pages/ClassList";
import ClassDetails from "./pages/ClassDetails";
import RecordsList from "./pages/RecordsList";
import TeacherRecords from "./pages/TeacherRecords";
import Wizard from "./pages/Wizard";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import AdminHome from "@/pages/AdminHome";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { useEffect } from "react";

// Componente para redirecionamento baseado no papel do usuário
const UserRoleRedirect = () => {
  const { teacher, isLoading } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (teacher) {
        if (teacher.isAdmin) {
          navigate('/admin');
        } else {
          navigate('/classes');
        }
      } else {
        // Redireciona para a página de autenticação se não houver usuário logado
        navigate('/auth');
      }
    }
  }, [teacher, isLoading, navigate]);

  // Exibir um loader enquanto verifica a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return null;
};

// Componente para proteger rotas de administrador
const AdminProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType, path: string }) => {
  const { teacher } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    if (teacher && !teacher.isAdmin) {
      navigate('/classes');
    }
  }, [teacher, navigate]);

  return <ProtectedRoute {...rest} component={Component} />;
};

// Componente para proteger rotas de professores (não-admin)
const TeacherProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType, path: string }) => {
  const { teacher } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    if (teacher && teacher.isAdmin) {
      navigate('/admin');
    }
  }, [teacher, navigate]);

  return <ProtectedRoute {...rest} component={Component} />;
};

function Router() {
  const [location] = useLocation();
  const showHeaderFooter = !location.includes('/auth') && !location.includes('/admin');
  
  return (
    <>
      {showHeaderFooter && <Header />}
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={UserRoleRedirect} />
          <TeacherProtectedRoute path="/classes" component={ClassList} />
          <TeacherProtectedRoute path="/classes/:id" component={ClassDetails} />
          <TeacherProtectedRoute path="/teacher-records" component={TeacherRecords} />
          <AdminProtectedRoute path="/records" component={RecordsList} />
          <TeacherProtectedRoute path="/wizard" component={Wizard} />
          <AdminProtectedRoute path="/admin" component={AdminHome} />
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
