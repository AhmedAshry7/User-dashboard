"use client";

import { useEffect, useState } from "react";
import {
  fetchNoActiveUsers,
  fetchFilters,
  fetchActiveUsers,
  updateActiveUsers,
} from "@/services/statsService";
import x from "../assets/x.png"

const PAGE_SIZE = 20;

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, any[]>>({});
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] =useState<Record<string, any[]>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  //const [isSending, setIsSending] = useState(false);

  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) window.location.href = "/login";
  }, []);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [statsData, filtersData] = await Promise.all([
          fetchNoActiveUsers(),
          fetchFilters(),
        ]);
        setStats(statsData);
        setFilters(filtersData);
        await loadUsers("ALL");
      } catch (err) {
        console.error("Initialization failed", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const loadUsers = async (source: string) => {
    setIsLoading(true);
    try {
      // We must send an object { source: ["VALUE"] } to match your backend Logic
      const filterObj = source === "ALL" ? {} : { source: [source] };
      
      const data = await fetchActiveUsers(filterObj);
      setUsers(data || []);
      setPage(1);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setIsLoading(false);
    }
  };
  const loadUsersWithFilters = async (filters:any) => {
    setIsLoading(true);
    const data = await fetchActiveUsers(filters);
    setUsers(data);
    setPage(1);
    setIsLoading(false);
  };


/*   const handleMessageClick = async (source: string) => {
    setIsSending(true);
    try {
      await updateActiveUsers(source === "ALL" ? undefined : source);
      await loadUsers(source);
    } catch (err) {
      console.error("Failed to update users", err);
    } finally {
      setIsSending(false);
    }
  } */
  const totalPages = Math.ceil(users.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const currentRows = users.slice(start, start + PAGE_SIZE);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Users Dashboard</h1>
        {stats && (
          <div style={styles.kpiContainer}>
            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Active Users</span>
              <span style={styles.kpiValue}>{stats.active_rows.toLocaleString()}</span>
            </div>
            <div style={styles.kpiCard}>
              <span style={styles.kpiLabel}>Total Users</span>
              <span style={styles.kpiValue}>{stats.total_rows.toLocaleString()}</span>
            </div>
          </div>
        )}
      </header>

      <div style={styles.filterSection}>
        {/* <label style={styles.label}>Filter by Source:</label>
        <select
          style={styles.select}
          value={selectedSource}
          onChange={(e) => handleSourceChange(e.target.value)}
        >
          <option value="ALL">All Sources</option>
          {filters.map((s, i) => (
            <option key={i} value={s.source}>{s.source}</option>
          ))}
        </select> */}
      <button 
        style={{ ...styles.pageBtn, marginLeft: "auto" }} 
        onClick={() => setShowFilterModal(true)}
      >
        Filter
      </button>
      </div>

      <main style={styles.main}>
        {isLoading ? (
          <div style={styles.centerContent}>
            <div className="spinner"></div>
            <p style={{ color: "#3b82f6", marginTop: 10 }}>Loading data...</p>
          </div>
        ) : users.length === 0 ? (
          <div style={styles.centerContent}>
            <div style={styles.emptyState}>
              <h3>No users found</h3>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Address</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Wallet USD</th>
                    <th style={styles.th}>Contacted</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((u, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdAddress}>{u.address}</td>
                      <td style={styles.td}>{u.source}</td>
                      <td style={styles.td}>${parseFloat(u.wallet_usd_value).toLocaleString()}</td>
                      <td style={styles.td}>
                        <span style={u.contacted ? styles.tagYes : styles.tagNo}>
                          {u.contacted ? "Yes" : "No"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.pagination}>
              <button 
                style={page === 1 ? styles.pageBtnDisabled : styles.pageBtn} 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span style={styles.pageInfo}>Page {page} of {totalPages || 1}</span>
              <button 
                style={page === totalPages ? styles.pageBtnDisabled : styles.pageBtn} 
                disabled={page === totalPages || totalPages === 0} 
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
        {showFilterModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>
                <h1 style={{ marginLeft: 10, fontSize: 20, fontWeight: 700 }}>Filters</h1>
                <button style={styles.pageBtn3} onClick={() => setShowFilterModal(false)}><img src={x.src} alt="Close" width="16" height="16" /></button>
              </div>
              <div style={styles.columns}>
              {/* LEFT: columns */}
              <div style={styles.modalLeft}>
                {Object.keys(filters).map((col) => (
                  <div
                    key={col}
                    style={{
                      padding: 10,
                      cursor: "pointer",
                      background: activeColumn === col ? "#e0f2fe" : "transparent"
                    }}
                    onClick={() => setActiveColumn(col)}
                  >
                    {col}
                  </div>
                ))}
              </div>

              {/* RIGHT: values */}
              <div style={styles.modalRight}>
                {activeColumn &&
                  filters[activeColumn]?.map((val: any) => (
                    <label key={val} style={{ display: "block" }}>
                      <input
                        type="checkbox"
                        checked={!!selectedFilters[activeColumn]?.includes(val)}
                        onChange={(e) => {
                          const prev = selectedFilters?.[activeColumn] || [];
                          const updated = e.target.checked
                            ? [...prev, val]
                            : prev.filter((v: any) => v !== val);

                          setSelectedFilters({
                            ...selectedFilters,
                            [activeColumn]: updated,
                          });
                        }}
                      />
                      {String(val)}
                    </label>
                  ))}
              </div>
              </div>
              {/* footer */}
              <div style={styles.modalFooter}>
                <button
                  style={styles.pageBtn2}
                  onClick={() => {
                    setSelectedFilters({});
                  }}
                >
                  Clear
                </button>
                <button
                  style={styles.pageBtn}
                  onClick={() => {
                    loadUsersWithFilters(selectedFilters);
                    setShowFilterModal(false);
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Inline Spinner CSS */}
      <style jsx>{`
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "40px 20px",
    fontFamily: "'Inter', system-ui, sans-serif",
    backgroundColor: "#f8fafc",
    minHeight: "100vh",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "20px",
  },
  title: { fontSize: "2rem", fontWeight: 700, color: "#1e3a8a", margin: 0 },
  kpiContainer: { display: "flex", gap: "15px" },
  kpiCard: {
    backgroundColor: "#fff",
    padding: "15px 25px",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    borderLeft: "4px solid #3b82f6",
    display: "flex",
    flexDirection: "column",
  },
  kpiLabel: { fontSize: "0.875rem", color: "#64748b", fontWeight: 500 },
  kpiValue: { fontSize: "1.25rem", fontWeight: 700, color: "#1e40af" },
  filterSection: {
    marginBottom: "25px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  label: { fontWeight: 600, color: "#475569" },
  select: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: "1rem",
  },
  main: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    overflow: "hidden",
    minHeight: "400px",
    display: "flex",
    flexDirection: "column",
  },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  tableHeaderRow: { backgroundColor: "#eff6ff" },
  th: { padding: "16px", color: "#1e40af", fontWeight: 600, borderBottom: "2px solid #dbeafe" },
  td: { padding: "14px 16px", borderBottom: "1px solid #f1f5f9" },
  tdAddress: { 
    padding: "14px 16px", 
    borderBottom: "1px solid #f1f5f9", 
    fontFamily: "monospace", 
    color: "#475569",
    fontSize: "0.9rem" 
    },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50
  },
  modal: {
    background: "#fff",
    width: "800px",
    height: "500px",
    padding: "15px",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden"
  },
   modalHeader: {
    display: "flex",
    justifyContent: "space-between",
  },
  columns: { display: "flex", flex: 1, overflowY: "auto" },
  modalLeft: {
    width: "30%",
    borderRight: "1px solid #eee",
    overflowY: "auto"
  },
  modalRight: {
    flex: 1,
    padding: 20,
    overflowY: "auto"
  },
  modalFooter: {
    padding: 15,
    borderTop: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between"
  },
  trEven: { backgroundColor: "#fff" },
  trOdd: { backgroundColor: "#f8fafc" },
  tagYes: { backgroundColor: "#dcfce7", color: "#166534", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 },
  tagNo: { backgroundColor: "#fee2e2", color: "#991b1b", padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 },
  centerContent: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "50px" },
  emptyState: { textAlign: "center", color: "#94a3b8" },
  pagination: { padding: "20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", borderTop: "1px solid #f1f5f9" },
  pageBtn: { padding: "8px 20px", borderRadius: "8px", border: "none", backgroundColor: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 500 },
  pageBtn2: { padding: "8px 20px", marginLeft: "10px", borderRadius: "8px", border: "none", backgroundColor: "#94a3b8", color: "#fff", cursor: "pointer", fontWeight: 500 },
  pageBtn3: { padding: "8px 8px", cursor: "pointer" },
  pageBtnDisabled: { padding: "8px 20px", borderRadius: "8px", border: "none", backgroundColor: "#e2e8f0", color: "#94a3b8", cursor: "not-allowed" },
  pageInfo: { fontWeight: 500, color: "#64748b" },
};