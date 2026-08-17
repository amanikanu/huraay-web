import { AnimatePresence } from "motion/react";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { Skeleton } from "./components/ui";
import { supabase } from "./lib/supabase";

const HomePage = lazy(() =>
  import("./pages/HomePage").then((m) => ({ default: m.HomePage })),
);
const PublicBoardPage = lazy(() =>
  import("./pages/PublicBoardPage").then((m) => ({
    default: m.PublicBoardPage,
  })),
);
const AuthPage = lazy(() =>
  import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })),
);
const WorkspacePage = lazy(() =>
  import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })),
);
const BoardEditorPage = lazy(() =>
  import("./pages/BoardEditorPage").then((m) => ({
    default: m.BoardEditorPage,
  })),
);
const UpgradePage = lazy(() =>
  import("./pages/UpgradePage").then((m) => ({ default: m.UpgradePage })),
);
const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading, configured } = useAuth();
  if (loading)
    return (
      <main className="route-loading">
        <Skeleton rows={4} />
      </main>
    );
  if (configured && !session) return <Navigate to="/auth" replace />;
  return children;
}

function AdminProtected({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    void supabase
      ?.from("user_roles")
      .select("role")
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setAllowed(data?.role === "admin"));
  }, []);
  if (allowed === null)
    return (
      <main className="route-loading">
        <Skeleton rows={4} />
      </main>
    );
  return allowed ? children : <Navigate to="/app" replace />;
}

function RoutedApp() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/b/:slug" element={<PublicBoardPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/app"
          element={
            <Protected>
              <WorkspacePage />
            </Protected>
          }
        />
        <Route
          path="/app/boards/new"
          element={
            <Protected>
              <BoardEditorPage />
            </Protected>
          }
        />
        <Route
          path="/app/boards/:id/edit"
          element={
            <Protected>
              <BoardEditorPage />
            </Protected>
          }
        />
        <Route
          path="/app/upgrade"
          element={
            <Protected>
              <UpgradePage />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <Protected>
              <AdminProtected>
                <AdminPage />
              </AdminProtected>
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <main className="route-loading">
              <Skeleton rows={4} />
            </main>
          }
        >
          <RoutedApp />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
