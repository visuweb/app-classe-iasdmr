import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({
  path,
  component: Component,
}: ProtectedRouteProps) {
  const { teacher, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => 
        isLoading ? (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        ) : teacher ? (
          <Component />
        ) : (
          <Redirect to="/auth" />
        )
      }
    </Route>
  );
}