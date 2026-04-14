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
import { useToast } from "./hooks/useToast";
import { makeMonthly, makeTransactions } from "./lib/mockData";
import { T } from "./theme";
import type { PageId, Transaction } from "./types";

export default function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>(() => makeTransactions());
  const monthly = useMemo(() => makeMonthly(), []);
  const { message, show } = useToast();

  const handleConfirmUpload = useCallback(
    (tx: Transaction) => {
      setTransactions((prev) => [tx, ...prev]);
      show("Invoice processed!");
      setPage("transactions");
    },
    [show],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      show("Deleted");
    },
    [show],
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
    settings: <Settings />,
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
