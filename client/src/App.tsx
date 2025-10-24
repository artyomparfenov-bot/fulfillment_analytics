import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Overview from "./pages/Overview";
import Partners from "./pages/Partners";
import SKUAnalysis from "./pages/SKUAnalysis";
import ChurnAnalysis from "./pages/ChurnAnalysis";
import ChurnAnalysisEnhanced from "./pages/ChurnAnalysisEnhanced";
import Alerts from "./pages/Alerts";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Overview} />
      <Route path="/partners" component={Partners} />
      <Route path="/sku" component={SKUAnalysis} />
      <Route path="/churn" component={ChurnAnalysisEnhanced} />
      <Route path="/alerts" component={Alerts} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
