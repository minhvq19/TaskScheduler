import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import PublicDisplay from "@/pages/public-display";
import PublicDisplay4K from "@/pages/public-display-4k";
import DisplaySelection from "@/pages/display-selection";
import SystemConfig from "@/pages/system-config";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Display Selection - choose between standard and 4K */}
      <Route path="/select-display" component={DisplaySelection} />
      
      {/* Public display routes - always accessible */}
      <Route path="/display" component={PublicDisplay} />
      <Route path="/public-display" component={PublicDisplay} />
      <Route path="/public" component={PublicDisplay} />
      
      {/* 4K Public display routes for 65" TV (3840x2160) */}
      <Route path="/display-4k" component={PublicDisplay4K} />
      <Route path="/public-display-4k" component={PublicDisplay4K} />
      <Route path="/public-4k" component={PublicDisplay4K} />
      
      {/* Protected routes */}
      {isLoading ? (
        <Route path="/">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-bidv-teal"></div>
          </div>
        </Route>
      ) : isAuthenticated ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/system-config" component={SystemConfig} />
        </>
      ) : (
        <>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
        </>
      )}
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
