import { useState, useEffect, useCallback } from "react";

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
// Fill these in after setting up your Telegram bot (see instructions below)
const CONFIG = {
  users: [
    {
      id: "madalina",
      name: "Madalina",
      emoji: "❤️",
      color: "#C084FC",
      lightColor: "#F3E8FF",
      telegram_chat_id: "1544444861",
    },
    {
      id: "gabriela",
      name: "Gabriela",
      emoji: "🤍",
      color: "#FB923C",
      lightColor: "#FFF7ED",
      telegram_chat_id: "5484205376",
    },
  ],
  telegram_bot_token: "8864998845:AAHxHXLpm0VRXaM6gCNLoN21LGe8zmPAcIc",
};
// ──────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "fitness-buddies-v1";
const TODAY = new Date().toISOString().slice(0, 10);

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayNum = now.getDate();
  const total = getDaysInMonth(year, month);
  const days = [];
  for (let d = 1; d <= total; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    days.push({ day: d, dateStr, isFuture: d > todayNum, isToday: d === todayNum });
  }
  return days;
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function sendTelegramNotification(botToken, chatId, message) {
  if (!botToken || botToken === "BOT_TOKEN_HERE" || !chatId || chatId.startsWith("CHAT_ID")) {
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function MonthLabel() {
  const now = new Date();
  return now.toLocaleString("ro-RO", { month: "long", year: "numeric" });
}

function StreakCount(data, userId) {
  const now = new Date();
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (data[dateStr]?.[userId]) streak++;
    else break;
  }
  return streak;
}

function TotalCount(data, userId) {
  return Object.values(data).filter((v) => v[userId]).length;
}

export default function FitnessBuddies() {
  const [activeUser, setActiveUser] = useState(null);
  const [checkData, setCheckData] = useState(loadData);
  const [toast, setToast] = useState(null);
  const [sending, setSending] = useState(false);
  const [configured, setConfigured] = useState(
    CONFIG.telegram_bot_token !== "BOT_TOKEN_HERE"
  );

  const days = getMonthDays();
  const monthLabel = MonthLabel();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCheck = useCallback(async () => {
    if (!activeUser) return;
    const user = CONFIG.users.find((u) => u.id === activeUser);
    const already = checkData[TODAY]?.[activeUser];

    const updated = {
      ...checkData,
      [TODAY]: { ...(checkData[TODAY] || {}), [activeUser]: !already },
    };
    setCheckData(updated);
    saveData(updated);

    if (!already) {
      // notify the OTHER user
      const other = CONFIG.users.find((u) => u.id !== activeUser);
      const msg = `${user.emoji} <b>${user.name}</b> a bifat sportul azi! 💪\nHai că poți și tu! 🔥`;
      setSending(true);
      const ok = await sendTelegramNotification(
        CONFIG.telegram_bot_token,
        other.telegram_chat_id,
        msg
      );
      setSending(false);
      if (ok) {
        showToast(`✅ Sport bifat! ${other.name} a primit notificare pe Telegram.`);
      } else if (!configured) {
        showToast("✅ Sport bifat! (Telegram neconfigurat încă)", "warning");
      } else {
        showToast("✅ Sport bifat! (Notificarea nu a ajuns — verifică token-ul)", "warning");
      }
    } else {
      showToast("↩️ Zi debifată.");
    }
  }, [activeUser, checkData, configured]);

  const user = CONFIG.users.find((u) => u.id === activeUser);
  const todayChecked = activeUser ? !!checkData[TODAY]?.[activeUser] : false;

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🏃‍♀️</span>
            <span style={styles.logoText}>Fit Buddies</span>
          </div>
          <div style={styles.monthPill}>{monthLabel}</div>
        </div>
      </header>

      {/* Config warning */}
      {!configured && (
        <div style={styles.warningBanner}>
          ⚙️ Telegram nesetat — bifele se salvează, dar notificările nu se trimit. Vezi instrucțiunile de mai jos.
        </div>
      )}

      {/* User selector */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>Cine ești azi?</p>
        <div style={styles.userRow}>
          {CONFIG.users.map((u) => (
            <button
              key={u.id}
              onClick={() => setActiveUser(u.id)}
              style={{
                ...styles.userBtn,
                background: activeUser === u.id ? u.color : "#fff",
                color: activeUser === u.id ? "#fff" : "#374151",
                border: `2px solid ${u.color}`,
                boxShadow: activeUser === u.id ? `0 4px 20px ${u.color}55` : "none",
              }}
            >
              <span style={styles.userEmoji}>{u.emoji}</span>
              <span style={styles.userName}>{u.name}</span>
              {checkData[TODAY]?.[u.id] && (
                <span style={styles.doneTag}>✓ azi</span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Check-in button */}
      {activeUser && (
        <section style={styles.checkSection}>
          <div style={{ ...styles.checkCard, background: user.lightColor, borderColor: user.color }}>
            <div style={styles.checkCardTop}>
              <span style={styles.checkEmoji}>{user.emoji}</span>
              <div>
                <div style={styles.checkName}>{user.name}</div>
                <div style={styles.checkStats}>
                  🔥 {StreakCount(checkData, activeUser)} zile la rând &nbsp;·&nbsp;
                  📅 {TotalCount(checkData, activeUser)} total
                </div>
              </div>
            </div>
            <button
              onClick={handleCheck}
              disabled={sending}
              style={{
                ...styles.checkBtn,
                background: todayChecked ? "#6B7280" : user.color,
                opacity: sending ? 0.7 : 1,
              }}
            >
              {sending ? "Se trimite..." : todayChecked ? "✓ Bifat azi — anulează" : "✅ Am făcut sport azi!"}
            </button>
          </div>
        </section>
      )}

      {/* Calendar grid */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>Calendarul lunii</p>
        <div style={styles.calGrid}>
          {days.map(({ day, dateStr, isFuture, isToday }) => {
            const m = checkData[dateStr] || {};
            const bothDone = CONFIG.users.every((u) => m[u.id]);
            const oneDone = CONFIG.users.some((u) => m[u.id]);
            const whoColor = oneDone
              ? bothDone
                ? "linear-gradient(135deg, #C084FC, #FB923C)"
                : m["madalina"]
                ? CONFIG.users[0].color
                : CONFIG.users[1].color
              : null;

            return (
              <div
                key={dateStr}
                style={{
                  ...styles.dayCell,
                  background: isFuture
                    ? "#F9FAFB"
                    : whoColor || "#F3F4F6",
                  border: isToday ? "2px solid #1F2937" : "2px solid transparent",
                  color: oneDone && !isFuture ? "#fff" : isFuture ? "#D1D5DB" : "#374151",
                  cursor: "default",
                }}
              >
                <span style={styles.dayNum}>{day}</span>
                {bothDone && <span style={styles.dayBadge}>🤝</span>}
                {oneDone && !bothDone && (
                  <span style={styles.dayBadge}>
                    {m["madalina"] ? CONFIG.users[0].emoji : CONFIG.users[1].emoji}
                  </span>
                )}
                {isToday && !oneDone && <span style={styles.todayDot} />}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {CONFIG.users.map((u) => (
            <div key={u.id} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background: u.color }} />
              <span>{u.name}</span>
            </div>
          ))}
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: "linear-gradient(135deg, #C084FC, #FB923C)" }} />
            <span>Amândouă 🤝</span>
          </div>
        </div>
      </section>

      {/* Setup instructions */}
      <section style={styles.setupSection}>
        <details>
          <summary style={styles.setupSummary}>⚙️ Cum configurezi Telegram (5 min)</summary>
          <div style={styles.setupBody}>
            <ol style={styles.setupList}>
              <li>
                Deschide Telegram și caută <b>@BotFather</b>. Trimite <code>/newbot</code>, alege un nume (ex: <i>FitBuddiesBot</i>) și copiază <b>token-ul</b> primit.
              </li>
              <li>
                Pune token-ul în cod la <code>telegram_bot_token: "..."</code>
              </li>
              <li>
                <b>Fiecare</b> dintre voi două deschide un chat cu bot-ul vostru și trimite un mesaj. Apoi accesați:<br />
                <code>https://api.telegram.org/bot{"TOKEN"}/getUpdates</code><br />
                Găsiți <code>"chat":{"{"}"id": 123456789{"}"}</code> — ăla e Chat ID-ul vostru.
              </li>
              <li>
                Puneți Chat ID-urile în <code>telegram_chat_id</code> pentru fiecare user.
              </li>
              <li>Gata! 🎉 La fiecare bifare, cealaltă primește mesaj instant pe Telegram.</li>
            </ol>
          </div>
        </details>
      </section>

      {/* Toast */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === "warning" ? "#F59E0B" : "#1F2937",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#F9FAFB",
    fontFamily: "'Inter', system-ui, sans-serif",
    paddingBottom: 60,
  },
  header: {
    background: "#fff",
    borderBottom: "1px solid #E5E7EB",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoIcon: { fontSize: 22 },
  logoText: { fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px", color: "#111827" },
  monthPill: {
    background: "#F3F4F6",
    borderRadius: 20,
    padding: "4px 12px",
    fontSize: 13,
    color: "#6B7280",
    fontWeight: 500,
    textTransform: "capitalize",
  },
  warningBanner: {
    background: "#FEF3C7",
    color: "#92400E",
    textAlign: "center",
    padding: "10px 20px",
    fontSize: 13,
  },
  section: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "24px 20px 0",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#9CA3AF",
    marginBottom: 12,
  },
  userRow: {
    display: "flex",
    gap: 12,
  },
  userBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    padding: "16px 12px",
    borderRadius: 16,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  userEmoji: { fontSize: 28 },
  userName: { fontWeight: 600, fontSize: 15 },
  doneTag: {
    background: "rgba(255,255,255,0.25)",
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 600,
  },
  checkSection: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "20px 20px 0",
  },
  checkCard: {
    borderRadius: 20,
    padding: 20,
    border: "2px solid",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  checkCardTop: { display: "flex", alignItems: "center", gap: 14 },
  checkEmoji: { fontSize: 36 },
  checkName: { fontWeight: 700, fontSize: 18, color: "#111827" },
  checkStats: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  checkBtn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    border: "none",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.2s",
    letterSpacing: "-0.2px",
  },
  calGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 6,
  },
  dayCell: {
    aspectRatio: "1",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    transition: "transform 0.15s",
  },
  dayNum: { fontSize: 12, fontWeight: 600 },
  dayBadge: { fontSize: 9, marginTop: 1 },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: "50%",
    background: "#1F2937",
    marginTop: 2,
  },
  legend: {
    display: "flex",
    gap: 16,
    marginTop: 14,
    flexWrap: "wrap",
  },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6B7280" },
  legendDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  setupSection: {
    maxWidth: 480,
    margin: "28px auto 0",
    padding: "0 20px",
  },
  setupSummary: {
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    color: "#374151",
    padding: "12px 16px",
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    listStyle: "none",
  },
  setupBody: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderTop: "none",
    borderRadius: "0 0 12px 12px",
    padding: "16px 20px",
  },
  setupList: {
    margin: 0,
    paddingLeft: 18,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.6,
  },
  toast: {
    position: "fixed",
    bottom: 24,
    left: "50%",
    transform: "translateX(-50%)",
    color: "#fff",
    padding: "12px 24px",
    borderRadius: 40,
    fontSize: 14,
    fontWeight: 600,
    zIndex: 100,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
};
