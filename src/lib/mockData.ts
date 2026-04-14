import type { MonthStat, Transaction } from "../types";
import type { Category } from "../theme";

const VENDORS = [
  "Amazon AWS",
  "Google Cloud",
  "Uber",
  "WeWork",
  "Slack",
  "Adobe",
  "Dropbox",
  "FedEx",
  "Starbucks",
  "Microsoft",
];
const VENDOR_CATEGORIES: Category[] = [
  "Software",
  "Software",
  "Transport",
  "Rent",
  "Software",
  "Software",
  "Software",
  "Transport",
  "Food & Dining",
  "Software",
];
const CLIENTS = ["Client Corp", "Acme Inc", "TechStart", "LuxFinance SA"];

export function makeTransactions(n = 28): Transaction[] {
  const out: Transaction[] = [];
  for (let i = 0; i < n; i++) {
    const isRevenue = Math.random() > 0.7;
    const amount = isRevenue
      ? Math.round(Math.random() * 5000 + 1000)
      : Math.round(Math.random() * 500 + 20);
    const vat = Math.round(amount * 0.17 * 100) / 100;
    const month = Math.floor(Math.random() * 6);
    const day = Math.floor(Math.random() * 28) + 1;
    const category: Category = isRevenue
      ? "Revenue"
      : VENDOR_CATEGORIES[i % VENDOR_CATEGORIES.length];
    out.push({
      id: "t" + i,
      company: isRevenue ? CLIENTS[i % CLIENTS.length] : VENDORS[i % VENDORS.length],
      date:
        "2026-" +
        String(month + 1).padStart(2, "0") +
        "-" +
        String(day).padStart(2, "0"),
      total: isRevenue ? amount : -amount,
      vat,
      category,
      type: isRevenue ? "revenue" : "expense",
      status: Math.random() > 0.2 ? "verified" : "pending",
      debit: isRevenue
        ? "1200 - Receivables"
        : "6" + String(Math.floor(Math.random() * 9)).padStart(3, "0") + "0 - " + category,
      credit: isRevenue ? "7000 - Sales" : "5120 - Bank",
    });
  }
  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function makeMonthly(): MonthStat[] {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month) => {
    const revenue = Math.round(Math.random() * 8000 + 4000);
    const expenses = Math.round(Math.random() * 5000 + 2000);
    return { month, revenue, expenses, profit: revenue - expenses };
  });
}
