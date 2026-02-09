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
  const [activeColumn, setActiveColumn] = useState<string | null>("wallet_usd_value");  // default active column in filter modal
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
        console.log("filtersData", filtersData);
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

// Improved range builder that handles edge cases properly
const buildRanges = (min: any, max: any, columnName: string) => {
  // Handle null/undefined/NaN cases
  const minIsValid = min != null && !isNaN(Number(min));
  const maxIsValid = max != null && !isNaN(Number(max));
  
  // If both are invalid, return empty array (we'll show "No data" message)
  if (!minIsValid && !maxIsValid) {
    return [];
  }
  
  // Convert to numbers
  const minNum = Number(min);
  const maxNum = Number(max);
  
  // If min equals max, return single value
  if (minNum === maxNum) {
    return [{
      min: minNum,
      max: maxNum,
      label: formatValue(minNum, columnName)
    }];
  }
  
  // Check if this is a date column
  const isDateColumn = columnName.includes('_at');
  
  if (isDateColumn) {
    return buildDateRanges(minNum, maxNum);
  }
  // RIGHT: Pass the raw strings directly from the API response
  if (columnName === "wallet_usd_value") {
    return buildNumericRanges(filters.wallet_usd_value_min, filters.wallet_usd_value_max);
  }
  return buildNumericRanges(minNum, maxNum);
};

const buildDateRanges = (min: number, max: number) => {
  const ranges = [];
  const minDate = new Date(min);
  const maxDate = new Date(max);
  
  // Calculate difference in days
  const diffDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  
  let numBuckets = 10;
  if (diffDays < 30) numBuckets = 5;
  else if (diffDays < 365) numBuckets = 12;
  else numBuckets = 20;
  
  const step = (max - min) / numBuckets;
  
  for (let i = 0; i < numBuckets; i++) {
    const rangeMin = min + (step * i);
    const rangeMax = i === numBuckets - 1 ? max : min + (step * (i + 1));
    
    ranges.push({
      min: rangeMin,
      max: rangeMax,
      label: `${formatDate(rangeMin)} — ${formatDate(rangeMax)}`
    });
  }
  
  return ranges;
};

const buildNumericRanges = (min: any, max: any) => {
  // Capture the raw string IMMEDIATELY before any Number() conversion
  const rawMax = String(max); 

  const minNum = Number(min);
  const maxNum = Number(max);
  const range = maxNum - minNum;

  // Use Logarithmic if the scale is massive
  if (maxNum > 1000 && (maxNum / Math.max(minNum, 1)) > 100) {
      // Pass the RAW STRING to the next function
      return buildLogarithmicRanges(minNum, maxNum, rawMax);
  }

  // ... rest of your linear logic ...
  // Ensure the linear logic also uses toFullString for the output
  const ranges = [];
  let numBuckets = 10;
  const step = range / numBuckets;

  for (let i = 0; i < numBuckets; i++) {
    const rMin = minNum + (step * i);
    const rMax = i === numBuckets - 1 ? max : minNum + (step * (i + 1));
    
    ranges.push({
      min: toFullString(rMin),
      max: toFullString(rMax),
      label: `${formatNumber(rMin)} — ${formatNumber(Number(rMax))}`
    });
  }
  return ranges;
};

const toFullString = (val: any) => {
  if (val == null) return "0";
  
  const str = String(val);

  // If the string is already a long string of digits (no 'e'), leave it!
  if (!str.includes('e') && !str.includes('.')) {
    return str;
  }

  // If it is scientific notation or a float, use BigInt carefully
  try {
    const num = Number(val);
    if (Math.abs(num) < 1.0) return num.toFixed(20).replace(/\.?0+$/, "");
    return BigInt(Math.floor(num)).toString();
  } catch {
    return str;
  }
};

const buildLogarithmicRanges = (min: number, max: number, rawMaxStr: string) => {
  const ranges = [];
  let currentMin = min;
  let currentStep = min <= 0 ? 100 : Math.pow(10, Math.floor(Math.log10(min)));

  while (currentMin < max) {
    let nextMax = currentStep * 10;
    
    // If we've reached the end, don't do math. 
    // Use the exact string '866000000000000000000000'
    if (nextMax >= max || ranges.length >= 14) {
      ranges.push({
        min: toFullString(currentMin),
        max: rawMaxStr, // <--- THIS IS THE FIX
        label: `${formatNumber(currentMin)} — ${formatNumber(max)}`
      });
      break;
    }

    ranges.push({
      min: toFullString(currentMin),
      max: toFullString(nextMax),
      label: `${formatNumber(currentMin)} — ${formatNumber(nextMax)}`
    });

    currentMin = nextMax;
    currentStep = nextMax;
  }
  return ranges;
};

// Format numbers properly without excessive decimals
const formatNumber = (num: number) => {
  if (num == null || isNaN(num)) return 'N/A';
  if (num === 0) return '0';

  const absNum = Math.abs(num);

  // Added handling for Quadrillion (e15), Quintillion (e18), Sextillion (e21)
  if (absNum >= 1e21) return (num / 1e21).toFixed(1) + 'S'; // Sextillion
  if (absNum >= 1e18) return (num / 1e18).toFixed(1) + 'Qn'; // Quintillion
  if (absNum >= 1e15) return (num / 1e15).toFixed(1) + 'Q';  // Quadrillion
  if (absNum >= 1e12) return (num / 1e12).toFixed(1) + 'T';  // Trillion
  if (absNum >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (absNum >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';

  if (absNum < 1 && absNum > 0) return num.toFixed(4); // More precision for tiny decimals
  
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
};

// Format dates to readable format
const formatDate = (timestamp: number) => {
  if (!timestamp || isNaN(timestamp)) return 'N/A';
  
  const date = new Date(timestamp);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format value based on column type
const formatValue = (val: any, columnName: string) => {
  if (val == null) return 'N/A';
  
  const num = Number(val);
  if (isNaN(num)) return 'N/A';
  
  if (columnName.includes('_at')) {
    return formatDate(num);
  }
  
  return formatNumber(num);
};

const normalizeFilters = (filters: any) => {
  const out: any = {};

  Object.entries(filters).forEach(([k, v]: any) => {
    // If it's a range and it's an array with at least one selection
    if (k.endsWith("_range") && Array.isArray(v) && v.length > 0) {
      out[k] = v; 
    } 
    // If it's a standard categorical filter (array of strings)
    else if (Array.isArray(v) && v.length > 0) {
      out[k] = v;
    }
  });

  return out;
};

const exportCSV = () => {
  if (!users.length) return;

  const headers = Object.keys(users[0]);

  const csvRows = [
    headers.join(","), // header row
    ...users.map(row =>
      headers.map(h => `"${row[h] ?? ""}"`).join(",")
    )
  ];

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "filtered_users.csv";
  a.click();

  window.URL.revokeObjectURL(url);
};

const filterColumns = Object.keys(filters).reduce((acc: string[], key) => {
  if (key.endsWith("_min")) {
    acc.push(key.replace("_min", ""));
  } else if (!key.endsWith("_max")) {
    acc.push(key);
  }
  return acc;
}, []);


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
          onClick={exportCSV}
          style={{
            padding: "8px 20px",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#22c55e",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            marginLeft: 10
          }}
        >
          Export
        </button>
      <button 
        style={styles.pageBtn} 
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
                    <th style={styles.th}>Web3 ID</th>
                    <th style={styles.th}>Wallet USD Value</th>
                    <th style={styles.th}>TVF</th>
                    <th style={styles.th}>Replied Rate</th>
                    <th style={styles.th}>Follower Count</th>
                    <th style={styles.th}>Following Count</th>
                    <th style={styles.th}>Twitter ID</th>
                    <th style={styles.th}>Twitter Verified</th>
                    <th style={styles.th}>Telegram ID</th>
                    <th style={styles.th}>Discord ID</th>
                    <th style={styles.th}>Is VIP</th>
                    <th style={styles.th}>Rank At</th>
                    <th style={styles.th}>Rank Score</th>
                    <th style={styles.th}>Offer Price</th>
                    <th style={styles.th}>Initial Price</th>
                    <th style={styles.th}>Trust Count</th>
                    <th style={styles.th}>Reward</th>
                    <th style={styles.th}>Active VIP Days</th>
                    <th style={styles.th}>Uncharged Offer Count</th>
                    <th style={styles.th}>Uncharged Offer Value</th>
                    <th style={styles.th}>Unread Message Count</th>
                    <th style={styles.th}>Source</th>
                    <th style={styles.th}>Contacted</th>
                    <th style={styles.th}>Contacted At</th>
                    <th style={styles.th}>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRows.map((u, i) => (
                    <tr key={i} style={i % 2 === 0 ? styles.trEven : styles.trOdd}>
                      <td style={styles.tdAddress}>{u.address}</td>
                      <td style={styles.td}>{u.web3_id}</td>
                      <td style={styles.td}>${parseFloat(u.wallet_usd_value).toLocaleString()}</td>
                      <td style={styles.td}>{u.tvf}</td>
                      <td style={styles.td}>{u.replied_rate}%</td>
                      <td style={styles.td}>{u.follower_count}</td>
                      <td style={styles.td}>{u.following_count}</td>
                      <td style={styles.td}>{u.twitter_id}</td>
                      <td style={styles.td}>{u.twitter_verified ? "Yes" : "No"}</td>
                      <td style={styles.td}>{u.telegram_id}</td>
                      <td style={styles.td}>{u.discord_id}</td>
                      <td style={styles.td}>{u.is_vip ? "Yes" : "No"}</td>
                      <td style={styles.td}>{new Date(u.rank_at).toLocaleDateString()}</td>
                      <td style={styles.td}>{u.rank_score}</td>
                      <td style={styles.td}>${parseFloat(u.offer_price).toLocaleString()}</td>
                      <td style={styles.td}>${parseFloat(u.initial_price).toLocaleString()}</td>
                      <td style={styles.td}>{u.trust_count}</td>
                      <td style={styles.td}>${parseFloat(u.reward).toLocaleString()}</td>
                      <td style={styles.td}>{u.active_vip_days}</td>
                      <td style={styles.td}>{u.uncharged_offer_count}</td>
                      <td style={styles.td}>${parseFloat(u.uncharged_offer_value).toLocaleString()}</td>
                      <td style={styles.td}>{u.unread_message_count}</td>
                      <td style={styles.td}>{u.source}</td>
                      <td style={styles.td}>
                        <span style={u.contacted ? styles.tagYes : styles.tagNo}>
                          {u.contacted ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={styles.td}>{u.contacted_at ? new Date(u.contacted_at).toLocaleDateString() : "N/A"}</td>
                      <td style={styles.td}>{new Date(u.created_at).toLocaleDateString()}</td>
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
                <button style={styles.pageBtn3} onClick={() => setShowFilterModal(false)}><img src={x.src} alt="Close" width="12" height="12" /></button>
              </div>
              <div style={styles.columns}>
                {/* LEFT: columns */}
                <div style={styles.modalLeft}>
                  {filterColumns.map((col) => (
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

                  {activeColumn && (() => {
                    const minKey = `${activeColumn}_min`;
                    const maxKey = `${activeColumn}_max`;

                    /* RANGE COLUMN */
                    if (filters[minKey] !== undefined && filters[maxKey] !== undefined) {
                      const minVal = Array.isArray(filters[minKey]) ? filters[minKey][0] : filters[minKey];
                      const maxVal = Array.isArray(filters[maxKey]) ? filters[maxKey][0] : filters[maxKey];
                      
                      const ranges = buildRanges(minVal, maxVal, activeColumn);
                      
                      // If no valid ranges, show message
                      if (ranges.length === 0) {
                        return (
                          <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
                            No data available
                          </div>
                        );
                      }

                      return (
                        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                          {ranges.map((r, i) => {
                            const selected = selectedFilters?.[`${activeColumn}_range`] || [];

                            return (
                              <label 
                                key={i} 
                                style={{ 
                                  display: "flex",
                                  alignItems: "center",
                                  padding: "10px 16px",
                                  cursor: "pointer",
                                  borderBottom: "1px solid #f0f0f0"
                                }}
                              >
                                <input
                                  type="checkbox"
                                  style={{ marginRight: 10, cursor: "pointer" }}
                                  checked={selected.some((x: any) => x.min === r.min && x.max === r.max)}
                                  onChange={(e) => {
                                    const prev = selectedFilters?.[`${activeColumn}_range`] || [];

                                    const updated = e.target.checked
                                      ? [...prev, { min: r.min, max: r.max }]
                                      : prev.filter((x: any) => !(x.min === r.min && x.max === r.max));

                                    setSelectedFilters({
                                      ...selectedFilters,
                                      [`${activeColumn}_range`]: updated,
                                    });
                                  }}
                                />
                                <span>{r.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    }

                    /* NORMAL DISTINCT VALUES */
                    const values = filters[activeColumn];
                    
                    // Filter out null/undefined/NaN and get unique values
                    const uniqueValues = values 
                      ? Array.from(new Set(values.filter((val: any) => {
                          if (val == null) return false;
                          if (typeof val === 'number' && isNaN(val)) return false;
                          return true;
                        })))
                      : [];
                    
                    if (uniqueValues.length === 0) {
                      return (
                        <div style={{ padding: 20, color: '#666', textAlign: 'center' }}>
                          No data available
                        </div>
                      );
                    }
                    
                    return (
                      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {uniqueValues.map((val: any) => (
                          <label 
                            key={String(val)} 
                            style={{ 
                              display: "flex",
                              alignItems: "center",
                              padding: "10px 16px",
                              cursor: "pointer",
                              borderBottom: "1px solid #f0f0f0"
                            }}
                          >
                            <input
                              type="checkbox"
                              style={{ marginRight: 10, cursor: "pointer" }}
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
                            <span>{String(val)}</span>
                          </label>
                        ))}
                      </div>
                    );
                  })()}
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
                    loadUsersWithFilters(normalizeFilters(selectedFilters));
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
  justifyContent: "flex-end",
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