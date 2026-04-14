import { useCallback, useMemo, useState, type ReactElement } from "react";
import { Background } from "./components/Background";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Toast } from "./components/Toast";
import { Dashboard } from "./pages/Dashboard";
import { Transactions } from "./pages/Transactions";
import { Upload } from "./pages/Upload";
import { Reports } from "./pages/Reports";
import { Settings } from "./pages/Settings";
import { AuthPage } from "./pages/AuthPage";
import { CompanySetup } from "./pages/CompanySetup";
import { useToast } from "./hooks/useToast";
import { useAuth } from "./hooks/useAuth";
import { useCompany, type Company, type CompanyInput } from "./hooks/useCompany";
import { useTransactions } from "./hooks/useTransactions";
import { makeMonthly } from "./lib/mockData";
import { isSupabaseConfigured } from "./lib/supabase";
import { T } from "./theme";
import type { PageId, Transaction } from "./types";

export default function App() {
  const auth = useAuth();
  const { company, loading: companyLoading, create: createCompany, update: updateCompany } =
    useCompany(auth.session);

  // Supabase not configured → run the whole app in demo mode with mocks.
  const demoMode = !isSupabaseConfigured();

  if (!demoMode && auth.loading) return <Splash label="Loading…" />;
  if (!demoMode && !auth.session)
    return <AuthPage onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  if (!demoMode && companyLoading) return <Splash label="Loading workspace…" />;
  if (!demoMode && !company)
    return (
      <CompanySetup
        onCreate={createCompany}
        onSignOut={auth.signOut}
        email={auth.session?.user.email ?? null}
      />
    );

  return (
    <Workspace
      userEmail={auth.session?.user.email ?? null}
      company={company}
      onUpdateCompany={updateCompany}
      onSignOut={() => void auth.signOut()}
    />
  );
}

function Splash({ label }: { label: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: T.bg,
        color: T.td,
        fontSize: 13,
        fontFamily: "'Outfit', system-ui",
      }}
    >
      <Background />
      <div style={{ zIndex: 5 }}>{label}</div>
    </div>
  );
}

interface WorkspaceProps {
  userEmail: string | null;
  company: Company | null;
  onUpdateCompany: (
    input: Partial<CompanyInput>,
  ) => Promise<{ data: Company | null; error: unknown }>;
  onSignOut: () => void;
}

function Workspace({ userEmail, company, onUpdateCompany, onSignOut }: WorkspaceProps) {
  const [page, setPage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const monthly = useMemo(() => makeMonthly(), []);
  const { message, show } = useToast();
  const companyId = company?.id ?? null;
  const { transactions, add, remove } = useTransactions({ companyId });

  const handleConfirmUpload = useCallback(
    async (tx: Transaction) => {
      await add(tx);
      show("Invoice processed!");
      setPage("transactions");
    },
    [add, show],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await remove(id);
      show("Deleted");
    },
    [remove, show],
  );

  const handleSaveCompany = useCallback(
    async (input: Partial<CompanyInput>) => {
      const { error } = await onUpdateCompany(input);
      if (error) {
        show("Could not save changes");
        return false;
      }
      show("Company updated");
      return true;
    },
    [onUpdateCompany, show],
  );

  const pages: Record<PageId, ReactElement> = {
    dashboard: (
      <Dashboard
        transactions={transactions}
        monthly={monthly}
        onViewAll={() => setPage("transactions")}
      />
    ),
    transactions: <Transactions transactions={transactions} onDelete={handleDelete} />,
    upload: <Upload onConfirm={handleConfirmUpload} />,
    reports: <Reports transactions={transactions} />,
    settings: <Settings company={company} companyId={companyId} onSave={handleSaveCompany} />,
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: T.bg,
        color: T.text,
        fontFamily: "'Outfit', system-ui",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <Background />
      {message && <Toast message={message} />}
      <Sidebar
        page={page}
        onNavigate={setPage}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        userEmail={userEmail}
        onSignOut={onSignOut}
      />
      <div
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          zIndex: 5,
        }}
      >
        <Header page={page} onNewInvoice={() => setPage("upload")} />
        <div
          style={{ flex: 1, padding: 28, overflow: "auto", animation: "fadeUp 0.5s ease" }}
          key={page}
        >
          {pages[page]}
        </div>
      </div>
    </div>
  );
}
