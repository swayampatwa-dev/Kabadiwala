import { useEffect, useState } from "react";
import "./dashboard.css";
import "./workflow.css";
import "./recycler-alert.css";
import "./route-card.css";
import "./login-tabs.css";
import "./live-tracking.css";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  Bell,
  BookOpen,
  Box,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Database,
  FileCheck2,
  Home,
  IndianRupee,
  Languages,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  MapPinned,
  Navigation,
  Menu,
  Mic2,
  PackageCheck,
  ReceiptIndianRupee,
  Recycle,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Truck,
  UploadCloud,
  UserRound,
  Users,
  Volume2,
  Wifi,
  WifiOff,
  Weight,
  Zap,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { api, session, type User } from "./api";
import { isDemoOffline, offlineDB, queue, syncNow } from "./offline";
import { classifyImage } from "./vision";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
function Spinner() {
  return <div className="card">Loading CHAKRASETU data…</div>;
}
function ErrorBox({ error }: { error: any }) {
  return <div className="notice">Unable to load data. {error?.message}</div>;
}
function Status({ s }: { s: string }) {
  return (
    <span
      className={`badge ${s === "PENDING" || s === "QUOTED" ? "amber" : ""}`}
    >
      {s.replaceAll("_", " ")}
    </span>
  );
}
function BrandMark({ dark = false }: { dark?: boolean }) {
  return (
    <div
      className={`brand-lockup ${dark ? "dark" : ""}`}
      aria-label="ChakraSetu"
    >
      <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M24 5a19 19 0 1 0 18.2 24.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="m36 18 7 11-13 1"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 27c4-9 14-10 19-5-1 9-9 14-19 11 4-2 8-5 11-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <b>CHAKRA</b>SETU<small>scrap to value</small>
      </span>
    </div>
  );
}
function OtpLogin({
  role,
  onLogin,
  onSignup,
}: {
  role: "CUSTOMER" | "COLLECTOR" | "RECYCLER";
  onLogin: (u: User) => void;
  onSignup: () => void;
}) {
  const defaults: any = {
    CUSTOMER: "5555555555",
    COLLECTOR: "6666666666",
    RECYCLER: "9876543211",
  };
  const otps: any = {
    CUSTOMER: "123456",
    COLLECTOR: "654321",
    RECYCLER: "123456",
  };
  const [phone, setPhone] = useState(defaults[role]);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const partner = role !== "CUSTOMER";
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (!sent) {
        await api("/auth/request-otp", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        setSent(true);
      } else {
        const x = await api<any>("/auth/verify-otp", {
          method: "POST",
          body: JSON.stringify({ phone, otp }),
        });
        session.save(x);
        onLogin(x.user);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`otp-page ${partner ? "partner-login" : ""}`}>
      <div className="otp-orb one" />
      <div className="otp-orb two" />
      <div className="portal-switch">
        <a className={role === "CUSTOMER" ? "active" : ""} href="/user-login">
          USER
        </a>
        <a
          className={role === "COLLECTOR" ? "active" : ""}
          href="/partner-login"
        >
          COLLECTOR
        </a>
        <a
          className={role === "RECYCLER" ? "active" : ""}
          href="/recycler-login"
        >
          RECYCLER
        </a>
      </div>
      <main className="otp-card">
        <BrandMark dark />
        <span className="portal-kicker">
          {role === "RECYCLER"
            ? "RECYCLER PARTNER"
            : partner
              ? "COLLECTION PARTNER"
              : "HOUSEHOLD USER"}
        </span>
        <h1>
          {sent
            ? "Verify your OTP"
            : partner
              ? role === "RECYCLER"
                ? "Recycler access"
                : "Partner access"
              : "Sell scrap from home"}
        </h1>
        <p>
          {sent
            ? `Enter the code for +91 ${phone}`
            : partner
              ? role === "RECYCLER"
                ? "Accept household material orders and receive verified deliveries."
                : "View assigned pickup requests and grow your collection business."
              : "Add items, see an AI price range and book a verified collector."}
        </p>
        <div className="phone-field">
          <span>{sent ? "OTP" : "+91"}</span>
          <input
            inputMode="numeric"
            maxLength={sent ? 6 : 10}
            value={sent ? otp : phone}
            onChange={(e) =>
              sent
                ? setOtp(e.target.value.replace(/\D/g, ""))
                : setPhone(e.target.value.replace(/\D/g, ""))
            }
            placeholder={sent ? "6-digit code" : "Mobile number"}
          />
        </div>
        <small className="demo-code">
          Demo: {phone} · OTP {otps[role]}
        </small>
        {error && <div className="notice">{error}</div>}
        <button
          className="otp-primary"
          disabled={busy || (sent ? otp.length !== 6 : phone.length !== 10)}
          onClick={submit}
        >
          {busy ? "Please wait…" : sent ? "Verify & continue" : "Continue"}
        </button>
        {sent && (
          <button
            className="otp-link"
            onClick={() => {
              setSent(false);
              setOtp("");
            }}
          >
            Change mobile number
          </button>
        )}
        <div className="otp-divider">
          <span>NEW TO CHAKRASETU?</span>
        </div>
        <button className="otp-secondary" onClick={onSignup}>
          Create account
        </button>
        <p className="secure-note">
          <ShieldCheck size={15} /> Recycler details stay private. Secure demo
          OTP access.
        </p>
      </main>
    </div>
  );
}
function Login({
  onLogin,
  onSignup,
  portal,
}: {
  onLogin: (u: User) => void;
  onSignup: () => void;
  portal?: "CUSTOMER" | "COLLECTOR" | "RECYCLER" | "ADMIN";
}) {
  if (portal !== "ADMIN")
    return (
      <OtpLogin
        role={portal || "CUSTOMER"}
        onLogin={onLogin}
        onSignup={onSignup}
      />
    );
  const accounts: any = {
    CUSTOMER: "user@kabadi.local",
    COLLECTOR: "collector@kabadi.local",
    RECYCLER: "recycler@kabadi.local",
    ADMIN: "admin@kabadi.local",
  };
  const [identifier, setId] = useState(
      portal ? accounts[portal] : "user@kabadi.local",
    ),
    [password, setPw] = useState("Demo123!"),
    [error, setError] = useState("");
  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const x = await api<any>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      session.save(x);
      onLogin(x.user);
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="login">
      <section className="login-hero">
        <BrandMark />
        <div className="eyebrow" style={{ color: "#5ed49a" }}>
          India&apos;s trusted circular network
        </div>
        <h1>
          Scrap collection.
          <br />
          Now simple and smart.
        </h1>
        <p>
          Take a photo, check the fair price, and sell to a verified recycler.
        </p>
        <div className="flow">
          <span>Collect</span>→<span>Identify</span>→<span>Price</span>→
          <span>Match</span>→<span>Trace</span>
        </div>
      </section>
      <section className="login-box">
        <div>
          <div className="eyebrow">Demo mode · Local authentication</div>
          <h2>Welcome back</h2>
          <p className="muted">Choose a workspace or enter the demo account.</p>
          {[
            ["CUSTOMER", "Household user", "user@kabadi.local"],
            ["COLLECTOR", "Collector", "collector@kabadi.local"],
            ["RECYCLER", "Recycler", "recycler@kabadi.local"],
            ["ADMIN", "Admin", "admin@kabadi.local"],
          ]
            .filter(([role]) => !portal || role === portal)
            .map(([, r, e]) => (
              <button className="demo-account" key={r} onClick={() => setId(e)}>
                <b>{r} portal</b>
                <br />
                <small className="muted">{e}</small>
              </button>
            ))}
          <form className="form" onSubmit={submit} style={{ marginTop: 20 }}>
            <div className="field">
              <label>Email or phone</label>
              <input
                value={identifier}
                onChange={(e) => setId(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPw(e.target.value)}
              />
            </div>
            {error && <div className="notice">{error}</div>}
            <button className="btn">Sign in securely</button>
          </form>
          <p className="muted" style={{ fontSize: 12 }}>
            Password: Demo123! · OTP: 123456. Prototype authentication only.
          </p>
          {portal !== "ADMIN" && (
            <button className="btn outline full" onClick={onSignup}>
              Create a new account
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
function Signup({ back }: { back: () => void }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "CUSTOMER",
  });
  const [message, setMessage] = useState("");
  const submit = async (e: any) => {
    e.preventDefault();
    try {
      const x = await api<any>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(x.message + ". You can now return to sign in.");
    } catch (e: any) {
      setMessage(e.message);
    }
  };
  return (
    <div className="login">
      <section className="login-hero">
        <BrandMark />
        <div className="eyebrow" style={{ color: "#5ed49a" }}>
          Join the circular network
        </div>
        <h1>
          Sell safely.
          <br />
          Earn fairly.
        </h1>
        <p>
          Household users can list personal scrap. Collectors and recyclers are
          activated only after admin verification.
        </p>
      </section>
      <section className="login-box">
        <div>
          <div className="eyebrow">New account</div>
          <h2>Sign up</h2>
          <form className="form" onSubmit={submit}>
            {[
              ["Full name", "name", "text"],
              ["Email", "email", "email"],
              ["Phone", "phone", "tel"],
              ["Password", "password", "password"],
            ].map(([label, key, type]) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  required
                />
              </div>
            ))}
            <div className="field">
              <label>I am a</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="CUSTOMER">
                  Household user selling personal items
                </option>
                <option value="COLLECTOR">Scrap collector</option>
                <option value="RECYCLER">Recycler</option>
              </select>
            </div>
            {message && (
              <div
                className={message.includes("return") ? "success" : "notice"}
              >
                {message}
              </div>
            )}
            <button className="btn full">Create account</button>
            <button type="button" className="btn outline full" onClick={back}>
              Back to login
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
const menus: any = {
  CUSTOMER: [
    [Home, "Home", "/customer/dashboard"],
    [Camera, "Sell", "/customer/sell"],
    [Box, "My orders", "/customer/orders"],
  ],
  COLLECTOR: [
    [Home, "Home", "/collector/dashboard"],
    [Box, "Lots", "/collector/lots"],
    [IndianRupee, "Prices", "/collector/prices"],
    [Recycle, "Recyclers", "/collector/recyclers"],
    [ShieldCheck, "Safety", "/collector/safety"],
    [ReceiptIndianRupee, "Earnings", "/collector/earnings"],
    [Truck, "Household pickups", "/collector/orders"],
  ],
  RECYCLER: [
    [LayoutDashboard, "Dashboard", "/recycler/dashboard"],
    [Truck, "User orders", "/recycler/orders"],
    [Box, "Incoming lots", "/recycler/lots"],
    [PackageCheck, "Operations", "/recycler/operations"],
    [BarChart3, "Analytics", "/recycler/analytics"],
  ],
  ADMIN: [
    [LayoutDashboard, "Intelligence", "/admin/dashboard"],
    [Users, "Recyclers", "/admin/recyclers"],
    [AlertTriangle, "Anomalies", "/admin/anomalies"],
    [Database, "Datasets", "/admin/datasets"],
    [CircleDollarSign, "Business", "/admin/business"],
    [FileCheck2, "Audit log", "/admin/audit"],
    [Users, "Approvals", "/admin/approvals"],
    [Box, "User orders", "/admin/orders"],
  ],
};
function NotificationCenter({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: () => api<any[]>("/notifications"),
    refetchInterval: 10000,
  });
  const unread = q.data?.filter((n) => !n.read).length || 0;
  useEffect(() => {
    if (
      !q.data?.length ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const key = `kbd-seen-notifications-${user.id}`;
    const seen = new Set<string>(JSON.parse(localStorage.getItem(key) || "[]"));
    const fresh = q.data.filter((n) => !n.read && !seen.has(n.id));
    fresh.forEach(async (n) => {
      const reg = await navigator.serviceWorker?.ready;
      if (reg)
        reg.showNotification(n.title, {
          body: n.message,
          tag: n.id,
          icon: "/icon.svg",
        });
      else new Notification(n.title, { body: n.message, tag: n.id });
      seen.add(n.id);
    });
    if (fresh.length)
      localStorage.setItem(key, JSON.stringify([...seen].slice(-100)));
  }, [q.data, user.id]);
  const enable = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission === "granted")
      new Notification("CHAKRASETU alerts enabled", {
        body: "Quotes, pickup, handover and payment updates will appear here.",
      });
  };
  const mark = async (n: any) => {
    if (!n.read) await api(`/notifications/${n.id}/read`, { method: "PATCH" });
    client.invalidateQueries({ queryKey: ["notifications", user.id] });
    if (n.link) location.href = n.link;
  };
  return (
    <div className="notification-wrap">
      <button
        className="iconbtn"
        onClick={() => setOpen(!open)}
        aria-label={`${unread} unread notifications`}
      >
        <Bell size={17} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="row">
            <b>Live updates</b>
            <button className="btn secondary compact" onClick={enable}>
              Enable device alerts
            </button>
          </div>
          {!q.data?.length ? (
            <p className="muted">
              No updates yet. New quotes and payments will appear automatically.
            </p>
          ) : (
            q.data.map((n) => (
              <button
                key={n.id}
                className={`notification-item ${n.read ? "" : "unread"}`}
                onClick={() => mark(n)}
              >
                <b>{n.title}</b>
                <span>{n.message}</span>
                <small>{date(n.createdAt)}</small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
function Layout({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { i18n } = useTranslation();
  const [offline, setOffline] = useState(isDemoOffline());
  const [toast, setToast] = useState("");
  const toggle = () => {
    const n = !offline;
    localStorage.setItem("kbd-offline", String(n));
    setOffline(n);
    setToast(n ? "Offline demo mode enabled" : "Back online — ready to sync");
  };
  const sync = async () => {
    try {
      const n = await syncNow();
      setToast(`${n} offline record${n === 1 ? "" : "s"} synced`);
    } catch (e: any) {
      setToast(e.message);
    }
  };
  useEffect(() => {
    if (toast) {
      const x = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(x);
    }
  }, [toast]);
  return (
    <div className={`app role-${user.role.toLowerCase()}`}>
      <header className="topbar">
        <BrandMark />
        <div className="top-actions">
          <button
            className="iconbtn hide-mobile"
            onClick={() => {
              const text = "Fair price. Trusted recycler. Safe recycling.";
              speechSynthesis.speak(new SpeechSynthesisUtterance(text));
            }}
            aria-label="Speak page"
          >
            <Volume2 size={17} />
          </button>
          <select
            className="iconbtn"
            value={i18n.language}
            onChange={(e) => {
              i18n.changeLanguage(e.target.value);
              localStorage.setItem("kbd-lang", e.target.value);
            }}
            aria-label="Language"
          >
            <option value="en">EN</option>
            <option value="hi">हिंदी</option>
            <option value="mr">मराठी</option>
          </select>
          <button className="iconbtn" onClick={toggle}>
            {offline ? <WifiOff size={17} /> : <Wifi size={17} />}
          </button>
          {!offline && (
            <button className="iconbtn hide-mobile" onClick={sync}>
              <UploadCloud size={17} />
            </button>
          )}
          <NotificationCenter user={user} />
          <button className="iconbtn" onClick={onLogout}>
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <div className="shell">
        <aside className="sidebar">
          <p className="eyebrow" style={{ color: "#83d6af" }}>
            {user.role} workspace
          </p>
          <p>
            <b>{user.name}</b>
            <br />
            <small style={{ opacity: 0.65 }}>DEMO MODE</small>
          </p>
          <nav>
            {menus[user.role].map(([I, l, p]: any) => (
              <NavLink key={p} to={p}>
                <I size={18} />
                {l}
              </NavLink>
            ))}
          </nav>
          <div style={{ marginTop: 30, fontSize: 12, opacity: 0.65 }}>
            <b>One simple promise</b>
            <br />
            Fair price · Accurate weight
            <br />
            Secure payment
          </div>
        </aside>
        <main className="main">
          {offline && (
            <div className="offline" style={{ marginBottom: 15 }}>
              OFFLINE DEMO MODE — actions are saved on this device
            </div>
          )}
          <RoutesContent user={user} toast={setToast} />
        </main>
      </div>
      <nav className="bottomnav">
        {menus[user.role].slice(0, 5).map(([I, l, p]: any) => (
          <NavLink key={p} to={p}>
            <I size={20} />
            {l}
          </NavLink>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
function RoutesContent({
  user,
  toast,
}: {
  user: User;
  toast: (s: string) => void;
}) {
  return (
    <Routes>
      <Route path="/customer/dashboard" element={<CustomerHome />} />
      <Route path="/customer/sell" element={<CustomerSell toast={toast} />} />
      <Route
        path="/customer/orders"
        element={<CustomerOrders toast={toast} />}
      />
      <Route
        path="/collector/orders"
        element={<CollectorOrders toast={toast} />}
      />
      <Route
        path="/admin/approvals"
        element={<AdminApprovals toast={toast} />}
      />
      <Route path="/admin/orders" element={<AdminOrders />} />
      <Route
        path="/collector/dashboard"
        element={<PartnerHome user={user} />}
      />
      <Route path="/collector/scan" element={<Scan toast={toast} />} />
      <Route path="/collector/prices" element={<Prices />} />
      <Route path="/collector/lots" element={<Lots />} />
      <Route
        path="/collector/lots/create"
        element={<CreateLot toast={toast} />}
      />
      <Route path="/collector/lots/:id" element={<LotDetail toast={toast} />} />
      <Route path="/collector/recyclers" element={<Recyclers />} />
      <Route path="/collector/earnings" element={<Earnings />} />
      <Route path="/collector/safety" element={<Safety />} />
      <Route path="/recycler/dashboard" element={<RecyclerDashboard />} />
      <Route
        path="/recycler/orders"
        element={<RecyclerOrders toast={toast} />}
      />
      <Route path="/recycler/lots" element={<RecyclerLots toast={toast} />} />
      <Route
        path="/recycler/operations"
        element={<Operations toast={toast} />}
      />
      <Route
        path="/recycler/analytics"
        element={<Analytics title="Recycler performance" />}
      />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route
        path="/admin/recyclers"
        element={<AdminRecyclers toast={toast} />}
      />
      <Route path="/admin/anomalies" element={<Anomalies />} />
      <Route path="/admin/datasets" element={<Datasets />} />
      <Route path="/admin/business" element={<Business />} />
      <Route path="/admin/audit" element={<Audit />} />
      <Route path="/traceability/:id" element={<Traceability />} />
      <Route
        path="*"
        element={<Navigate to={`/${user.role.toLowerCase()}/dashboard`} />}
      />
    </Routes>
  );
}
function Head({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: any;
}) {
  return (
    <div className="pagehead">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
function CollectorDashboard({ user }: { user: User }) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["dash", "collector"],
    queryFn: () => api<any>("/dashboard/collector"),
  });
  return (
    <>
      <Head
        eyebrow="Collector home"
        title={`${t("hello")}, ${user.name.split(" ")[0]} 👋`}
      >
        <span className="badge">● Network active</span>
      </Head>
      {q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <>
          <section className="action-hero">
            <div>
              <span className="live-pill">
                <i /> Pune rates live
              </span>
              <h2>Want to sell scrap?</h2>
              <p>
                Take a photo. We will identify the material, estimate its value,
                and find a nearby verified buyer.
              </p>
              <div className="hero-actions">
                <NavLink className="btn primary-big" to="/collector/scan">
                  <Camera size={22} /> Start with a photo
                </NavLink>
                <NavLink className="btn soft" to="/collector/lots/create">
                  <Box size={20} /> Add without a photo
                </NavLink>
              </div>
            </div>
            <div className="three-taps" aria-label="Three simple steps">
              <div>
                <b>1</b>
                <span>Photo</span>
                <small>Scrap pehchanein</small>
              </div>
              <div>
                <b>2</b>
                <span>Price</span>
                <small>Live fair price</small>
              </div>
              <div>
                <b>3</b>
                <span>Pickup</span>
                <small>Verified partner</small>
              </div>
            </div>
          </section>
          <div className="grid">
            <div className="card metric">
              <span className="muted">This month</span>
              <strong>{money(q.data.monthlyEarnings)}</strong>
              <small style={{ color: "var(--emerald)" }}>
                ↑ {q.data.previousMonthChange}% vs last month
              </small>
            </div>
            <div className="card metric">
              <span className="muted">Formal e-waste</span>
              <strong>{q.data.materialKg} kg</strong>
              <small>Safely routed</small>
            </div>
            <div className="card metric">
              <span className="muted">Active lots</span>
              <strong>{q.data.active}</strong>
              <small>Across the network</small>
            </div>
            <div className="card metric">
              <span className="muted">Trusted recyclers</span>
              <strong>{q.data.verifiedRecyclers}</strong>
              <small>Demo-verified</small>
            </div>
          </div>
          <div className="section-title">
            <div>
              <span className="eyebrow">Quick actions</span>
              <h3>What would you like to do?</h3>
            </div>
            <span className="muted">Large buttons · fewer steps</span>
          </div>
          <div className="quick">
            <NavLink to="/collector/scan">
              <Camera />
              {t("scan")}
            </NavLink>
            <NavLink to="/collector/prices">
              <IndianRupee />
              {t("prices")}
            </NavLink>
            <NavLink to="/collector/recyclers">
              <Recycle />
              {t("find")}
            </NavLink>
            <NavLink to="/collector/lots">
              <Box />
              {t("lots")}
            </NavLink>
            <NavLink to="/collector/earnings">
              <ReceiptIndianRupee />
              {t("earnings")}
            </NavLink>
          </div>
          <div className="grid" style={{ marginTop: 20 }}>
            <div className="card panel8">
              <h3>The CHAKRASETU trust cycle</h3>
              <div className="flow">
                <span>{t("fair")}</span>→<span>{t("recycler")}</span>→
                <span>{t("handover")}</span>→<span>{t("payment")}</span>→
                <span>{t("trace")}</span>
              </div>
            </div>
            <div className="card panel4">
              <div className="eyebrow">Safety reminder</div>
              <h3>Do not burn batteries</h3>
              <p className="muted">
                Never puncture, burn or open a lithium battery.
              </p>
              <NavLink className="btn secondary" to="/collector/safety">
                Open safety centre
              </NavLink>
            </div>
          </div>
          <section className="idea-strip">
            <div>
              <Weight />
              <span>
                <b>Verified Weight</b>
                <small>Lock the digital weight after OTP verification</small>
              </span>
            </div>
            <div>
              <MapPinned />
              <span>
                <b>Smart Pickup Routes</b>
                <small>Combine nearby pickups to save time and fuel</small>
              </span>
            </div>
            <div>
              <Zap />
              <span>
                <b>Price Alerts</b>
                <small>Get an alert when your local scrap rate increases</small>
              </span>
            </div>
          </section>
        </>
      )}
    </>
  );
}
function Scan({ toast }: { toast: (s: string) => void }) {
  const [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<any>(null),
    [analyzing, setAnalyzing] = useState(false),
    [vision, setVision] = useState<any>(null);
  const nav = useNavigate();
  const analyze = async () => {
    setAnalyzing(true);
    try {
      const ml = file ? await classifyImage(file).catch(() => null) : null;
      setVision(ml);
      const r = await api<any>("/ai/classify", {
        method: "POST",
        body: JSON.stringify({
          fileName: file?.name || "pcb-demo.jpg",
          visionLabel: ml?.labels?.[0]?.label,
          suggestedMaterial: ml?.suggestedMaterial,
        }),
      });
      setResult({
        ...r,
        model: ml
          ? "TensorFlow.js MobileNet + CHAKRASETU material rules"
          : "CHAKRASETU deterministic fallback",
      });
      toast(
        ml
          ? "On-device ML analysis completed"
          : "AI fallback analysis completed",
      );
    } finally {
      setAnalyzing(false);
    }
  };
  return (
    <>
      <Head eyebrow="AI-assisted identification" title="Scan scrap">
        <span className="badge amber">AI DEMO MODEL</span>
      </Head>
      <div className="grid">
        <section className="card panel6">
          <div className="scanbox">
            <div className="circle">
              <Camera size={34} />
            </div>
            <h3>{file ? file.name : "Take or choose a scrap photo"}</h3>
            <p className="muted">Image stays local in this prototype.</p>
            <label className="btn">
              <input
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Camera size={18} /> Open camera
            </label>
          </div>
          <button
            className="btn"
            style={{ width: "100%", marginTop: 14 }}
            onClick={analyze}
          >
            {analyzing ? "Loading on-device ML model…" : "Analyze material"}
          </button>
        </section>
        <section className="card panel6">
          {!result ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <Activity size={42} color="#82948a" />
              <h3>AI result will appear here</h3>
              <p className="muted">
                A real MobileNet model runs privately on this device; CHAKRASETU
                maps its visual labels to e-waste classes.
              </p>
            </div>
          ) : (
            <>
              <div className="eyebrow">AI result</div>
              <h2 style={{ fontSize: 34, marginBottom: 5 }}>
                {result.material}
              </h2>
              <div className="grid">
                <div className="card panel6">
                  <small>Confidence</small>
                  <strong style={{ display: "block", fontSize: 24 }}>
                    {result.confidence}%
                  </strong>
                </div>
                <div className="card panel6">
                  <small>Condition</small>
                  <strong style={{ display: "block", fontSize: 24 }}>
                    {result.condition}
                  </strong>
                </div>
              </div>
              <p>
                Estimated weight <b>{result.estimatedWeight} kg</b>
              </p>
              <div className="success">
                <b>Estimated fair value</b>
                <br />
                <span style={{ fontSize: 25 }}>
                  {money(result.pricing.totalLow)} –{" "}
                  {money(result.pricing.totalHigh)}
                </span>
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                {result.model}. Experimental advisory classification; verify
                before commercial decisions.
              </p>
              {vision?.labels?.length > 0 && (
                <details>
                  <summary>Model evidence</summary>
                  <p className="muted">
                    {vision.labels
                      .slice(0, 3)
                      .map((x: any) => `${x.label} (${x.confidence}%)`)
                      .join(" · ")}
                  </p>
                </details>
              )}
              <div className="row">
                <button
                  className="btn"
                  onClick={() =>
                    nav("/collector/lots/create", { state: result })
                  }
                >
                  Use this result
                </button>
                <button className="btn outline" onClick={() => setResult(null)}>
                  Retake
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
function Prices() {
  const q = useQuery({
    queryKey: ["prices"],
    queryFn: () => api<any[]>("/prices"),
  });
  const [search, setSearch] = useState("");
  return (
    <>
      <Head
        eyebrow="Transparent market intelligence"
        title="Fair price board"
      />
      <div className="field" style={{ maxWidth: 460, marginBottom: 18 }}>
        <input
          placeholder="Search PCB, cable, battery…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <div className="grid">
          {q.data
            .filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
            .map((x) => (
              <div className="card metric" key={x.id}>
                <div className="row">
                  <b>{x.name}</b>
                  <span className="badge">↑ {x.pricing.trend}%</span>
                </div>
                <h2>
                  {money(x.pricing.average)}
                  <small className="muted" style={{ fontSize: 12 }}>
                    /kg
                  </small>
                </h2>
                <div className="price-scale" />
                <div className="row">
                  <small>{money(x.pricing.low)} LOW</small>
                  <small>{money(x.pricing.high)} HIGH</small>
                </div>
                <details style={{ marginTop: 14 }}>
                  <summary>Why this price?</summary>
                  <ul>
                    {x.pricing.reasons.map((r: string) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </details>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
function Lots() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["lots"],
    queryFn: () => api<any[]>("/lots"),
  });
  const [filter, setFilter] = useState("ALL");
  const [localDrafts, setLocalDrafts] = useState<any[]>([]);
  useEffect(() => {
    offlineDB.drafts.toArray().then(setLocalDrafts);
  }, []);
  const localLots = localDrafts.map((draft) => ({
    ...draft,
    id: draft.id,
    lotId: `OFFLINE-${draft.id.slice(0, 8).toUpperCase()}`,
    materialCategory: draft.materialCategory,
    approxWeight: draft.approxWeight,
    priceRange: { low: 0, high: 0 },
    status: "OFFLINE_PENDING",
  }));
  const visibleLots = [...localLots, ...(q.data || [])];
  return (
    <>
      <Head eyebrow="Material inventory" title="My lots">
        <NavLink className="btn" to="/collector/lots/create">
          + Create lot
        </NavLink>
      </Head>
      <div
        className="row"
        style={{ justifyContent: "start", marginBottom: 16 }}
      >
        {["ALL", "ACTIVE", "PAID", "RECYCLED"].map((x) => (
          <button
            className={`btn ${filter === x ? "" : "secondary"}`}
            key={x}
            onClick={() => setFilter(x)}
          >
            {x}
          </button>
        ))}
      </div>
      {q.isLoading ? (
        <Spinner />
      ) : q.error ? (
        <ErrorBox error={q.error} />
      ) : (
        <div className="grid">
          {visibleLots
            .filter(
              (x) =>
                filter === "ALL" ||
                (filter === "ACTIVE"
                  ? !["PAID", "RECYCLED"].includes(x.status)
                  : x.status === filter),
            )
            .slice(0, 20)
            .map((l) => (
              <div
                className="card panel4"
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  cursor:
                    l.status === "OFFLINE_PENDING" ? "default" : "pointer",
                }}
                key={l.id}
                role={l.status === "OFFLINE_PENDING" ? undefined : "link"}
                tabIndex={l.status === "OFFLINE_PENDING" ? undefined : 0}
                onClick={() =>
                  l.status !== "OFFLINE_PENDING" &&
                  navigate(`/collector/lots/${l.lotId}`)
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  l.status !== "OFFLINE_PENDING" &&
                  navigate(`/collector/lots/${l.lotId}`)
                }
              >
                <div className="row">
                  <b>{l.lotId}</b>
                  <Status s={l.status} />
                </div>
                <h3>
                  {l.materialCategory} · {l.approxWeight} kg
                </h3>
                <p>
                  {l.status === "OFFLINE_PENDING"
                    ? "Saved safely on this device"
                    : `${money(l.priceRange.low)} – ${money(l.priceRange.high)}`}
                </p>
                <small className="muted">Created {date(l.createdAt)}</small>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
function CreateLot({ toast }: { toast: (s: string) => void }) {
  const [material, setMaterial] = useState("PCB"),
    [weight, setWeight] = useState(2.4),
    [condition, setCondition] = useState("USED"),
    [location, setLocation] = useState("Pune, Maharashtra"),
    [result, setResult] = useState<any>(null);
  const nav = useNavigate();
  const mats = useQuery({
    queryKey: ["materials"],
    queryFn: () => api<any[]>("/materials"),
  });
  useEffect(() => {
    api("/prices/estimate", {
      method: "POST",
      body: JSON.stringify({ material, weight, condition }),
    }).then(setResult);
  }, [material, weight, condition]);
  const submit = async () => {
    const payload = {
      materialCategory: material,
      approxWeight: weight,
      condition,
      location,
    };
    if (isDemoOffline()) {
      const op = await queue("CREATE_LOT", payload);
      await offlineDB.drafts.put({
        id: op.clientOperationId,
        ...payload,
        status: "OFFLINE_PENDING",
        createdAt: new Date().toISOString(),
      });
      toast("Lot saved offline — sync when online");
      nav("/collector/lots");
    } else {
      const lot = await api<any>("/lots", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast("Lot created successfully");
      nav(`/collector/lots/${lot.lotId}`);
    }
  };
  return (
    <>
      <Head eyebrow="7-step guided workflow" title="Create a lot" />
      <div className="steps">
        {Array.from({ length: 7 }, (_, i) => (
          <i className="step done" key={i} />
        ))}
      </div>
      <div className="grid">
        <section className="card panel8">
          <div className="form">
            <div className="field">
              <label>1 · Material</label>
              <div className="material-grid">
                {mats.data?.map((m) => (
                  <button
                    className={`material ${material === m.name ? "selected" : ""}`}
                    onClick={() => setMaterial(m.name)}
                    key={m.id}
                  >
                    <b>{m.name}</b>
                    <br />
                    <small>{m.hi}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label>2 · Photo (optional offline-safe)</label>
              <input type="file" accept="image/*" />
            </div>
            <div className="field">
              <label>3 · Approximate weight (kg)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={weight}
                onChange={(e) => setWeight(+e.target.value)}
              />
            </div>
            <div className="field">
              <label>4 · Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option>POOR</option>
                <option>USED</option>
                <option>GOOD</option>
              </select>
            </div>
            <div className="field">
              <label>5 · Collection location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button className="btn" onClick={submit}>
              7 · Create lot
            </button>
          </div>
        </section>
        <aside className="card panel4">
          <div className="eyebrow">6 · Fair price estimate</div>
          <h2>
            {result
              ? `${money(result.totalLow)} – ${money(result.totalHigh)}`
              : "Calculating…"}
          </h2>
          <p className="muted">
            Recommended {money(result?.recommendedFairPrice)}/kg
          </p>
          <div className="price-scale" />
          <p>
            <CheckCircle2 size={16} /> Local market & current offers
          </p>
          <p>
            <CheckCircle2 size={16} /> Condition and location
          </p>
          <p>
            <CheckCircle2 size={16} /> Historical trend
          </p>
          {isDemoOffline() && (
            <div className="notice">
              This lot will be stored in IndexedDB and synced later with a
              unique operation ID.
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
function LotDetail({ toast }: { toast: (s: string) => void }) {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["lot", id],
    queryFn: () => api<any>(`/lots/${id}`),
  });
  const quoteQuery = useQuery({
    queryKey: ["quotes", id],
    queryFn: () => api<any[]>(`/lots/${id}/quotes`),
  });
  const acceptQuote = async (quoteId: string) => {
    await api(`/quotes/${quoteId}/accept`, { method: "POST" });
    toast("Best recycler offer accepted");
    await queryClient.invalidateQueries({ queryKey: ["lot", id] });
    await queryClient.invalidateQueries({ queryKey: ["quotes", id] });
  };
  const nav = useNavigate();
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox error={q.error} />;
  const l = q.data;
  return (
    <>
      <Head eyebrow="Digital material record" title={l.lotId}>
        <Status s={l.status} />
      </Head>
      <div className="grid">
        <div className="card panel8">
          <h2>
            {l.materialCategory} · {l.approxWeight} kg
          </h2>
          <p>
            Fair range:{" "}
            <b>
              {money(l.priceRange.low)} – {money(l.priceRange.high)}
            </b>
          </p>
          <h3>E-waste passport</h3>
          {[
            "CREATED",
            "QUOTED",
            "ACCEPTED",
            "PICKUP SCHEDULED",
            "HANDED OVER",
            "PAID",
            "RECYCLED",
          ].map((s, i) => (
            <div
              className="row"
              style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}
              key={s}
            >
              <span>{s}</span>
              {i <
              [
                "DRAFT",
                "CREATED",
                "QUOTED",
                "ACCEPTED",
                "PICKUP_SCHEDULED",
                "HANDED_OVER",
                "RECEIVED",
                "PAID",
                "RECYCLED",
              ].indexOf(l.status) ? (
                <CheckCircle2 color="#16865f" />
              ) : (
                <span className="muted">○</span>
              )}
            </div>
          ))}
          <h3 style={{ marginTop: 24 }}>Recycler offers</h3>
          {quoteQuery.isLoading && <p className="muted">Loading offers…</p>}
          {!quoteQuery.isLoading && !quoteQuery.data?.length && (
            <div className="notice">
              No quote yet. Sign in as recycler and submit an offer for this
              lot.
            </div>
          )}
          {quoteQuery.data?.map((quote, index) => (
            <div className="card" key={quote.id} style={{ marginTop: 10 }}>
              <div className="row">
                <div>
                  <span className="badge">
                    {index === 0 ? "BEST VALUE" : "OFFER"}
                  </span>
                  <h3>{money(quote.offerPrice)}/kg</h3>
                  <small>
                    {quote.pickupAvailable
                      ? "Pickup available"
                      : "Drop-off only"}
                  </small>
                </div>
                {quote.status === "PENDING" ? (
                  <button className="btn" onClick={() => acceptQuote(quote.id)}>
                    Accept offer
                  </button>
                ) : (
                  <Status s={quote.status} />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="card panel4" style={{ textAlign: "center" }}>
          <QRCodeSVG
            value={`${location.origin}/traceability/${l.lotId}`}
            size={190}
          />
          <h3>Public-safe passport</h3>
          <p className="muted">
            No collector identity or exact address is exposed.
          </p>
          <button
            className="btn"
            onClick={() => nav(`/traceability/${l.lotId}`)}
          >
            View traceability
          </button>
          <NavLink
            className="btn secondary"
            style={{ marginTop: 10 }}
            to="/collector/recyclers"
          >
            Compare recyclers
          </NavLink>
        </div>
      </div>
    </>
  );
}
function NetworkMap() {
  const [position, setPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [gpsError, setGpsError] = useState("");
  const locate = () =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => {
            setPosition({
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy,
            });
            setGpsError("");
          },
          (e) => setGpsError(e.message),
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
        )
      : setGpsError("GPS is not supported on this device");
  const lat = position?.latitude || 18.5204,
    lon = position?.longitude || 73.8567;
  const bbox = `${lon - 0.08}%2C${lat - 0.055}%2C${lon + 0.08}%2C${lat + 0.055}`;
  return (
    <section className="map-card" aria-label="Nearby recycler map">
      <iframe
        title="Nearby verified recyclers in Pune"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`}
        loading="lazy"
      />
      <div className="map-overlay">
        <span className="live-pill">
          <i /> 6 partners online
        </span>
        <b>Nearby pickup network</b>
        <small>
          {position
            ? `GPS active · accuracy ±${Math.round(position.accuracy)} m`
            : "Approximate area only · exact address stays private"}
        </small>
        <button className="btn compact" onClick={locate}>
          <Navigation size={15} /> Use my live GPS
        </button>
        {gpsError && <small>{gpsError}</small>}
      </div>
      <a
        className="map-credit"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
      >
        © OpenStreetMap contributors
      </a>
    </section>
  );
}
function Recyclers() {
  const q = useQuery({
    queryKey: ["recyclers"],
    queryFn: () => api<any[]>("/recyclers"),
  });
  return (
    <>
      <Head
        eyebrow="Distance · price · trust"
        title="Find the right recycler nearby"
      />
      <NetworkMap />
      <div className="trust-note">
        <ShieldCheck size={20} />
        <span>
          <b>Trust score samajhna easy hai</b>
          <small>
            License check, on-time pickup, payment record aur weight disputes se
            score banta hai. Demo verification is not government certification.
          </small>
        </span>
      </div>
      {q.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid">
          {q.data?.map((r, i) => (
            <div
              className={`card panel4 recycler-card ${i === 0 ? "best" : ""}`}
              key={r.id}
            >
              {i === 0 && (
                <span className="badge">BEST MATCH · {r.matchScore}</span>
              )}
              <h2>{r.name}</h2>
              <div className="row">
                <span>
                  <MapPin size={15} /> {r.distance.toFixed(1)} km
                </span>
                <Status s={r.status} />
              </div>
              <p>{r.materials.join(" · ")}</p>
              <h3>{money(r.offer)}/kg</h3>
              <p className="muted">
                Trust {r.reliability} ·{" "}
                {r.pickup ? "Pickup available" : "Drop-off only"}
              </p>
              {i === 0 && (
                <div className="success">
                  <b>Recommended because</b>
                  <br />✓ Authorization demo-verified
                  <br />✓ High compatible offer
                  <br />✓ Nearby with pickup
                  <br />✓ Strong reliability
                </div>
              )}
              <button className="btn full" style={{ marginTop: 12 }}>
                <Truck size={17} /> Request pickup quote
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function Earnings() {
  const q = useQuery({
    queryKey: ["payments"],
    queryFn: () => api<any[]>("/payments"),
  });
  const total = q.data?.reduce((s, p) => s + p.amount, 0) || 0;
  return (
    <>
      <Head eyebrow="Collector financial passport" title="My earnings">
        <button className="btn outline" onClick={() => window.print()}>
          Print statement
        </button>
      </Head>
      <div className="grid">
        <div className="card metric">
          <span>Total paid</span>
          <strong>{money(total)}</strong>
        </div>
        <div className="card metric">
          <span>Transactions</span>
          <strong>{q.data?.length || 0}</strong>
        </div>
        <div className="card metric">
          <span>Pending</span>
          <strong>{money(2400)}</strong>
        </div>
        <div className="card metric">
          <span>Average lot</span>
          <strong>{money(total / (q.data?.length || 1))}</strong>
        </div>
        <div className="card panel8">
          <h3>Payment ledger</h3>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Lot</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {q.data?.map((p) => (
                  <tr key={p.id}>
                    <td>{p.lotId}</td>
                    <td>{p.method}</td>
                    <td>{date(p.paidAt)}</td>
                    <td>{money(p.amount)}</td>
                    <td>
                      <Status s={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card panel4">
          <h3>Earnings trend</h3>
          <Chart />
        </div>
      </div>
    </>
  );
}
function Safety() {
  const guides = [
    [
      BatteryCharging,
      "Lithium battery",
      "Do not open batteries",
      "Do not puncture, burn or open. Keep away from heat.",
    ],
    [
      Smartphone,
      "Displays & CRT",
      "Handle the screen carefully",
      "Do not break glass. Avoid powder and damaged edges.",
    ],
    [
      AlertTriangle,
      "Burning & chemicals",
      "Do not burn waste",
      "Never burn wires or electronics. Toxic fumes can cause harm.",
    ],
    [
      ShieldCheck,
      "Personal protection",
      "Wear gloves",
      "Use gloves, closed shoes and eye protection.",
    ],
    [
      Activity,
      "Electrical hazards",
      "Switch off electricity",
      "Disconnect power before handling equipment.",
    ],
    [
      Recycle,
      "Safe routing",
      "Choose the right recycler",
      "Send hazardous e-waste to an authorized recycler.",
    ],
  ];
  return (
    <>
      <Head eyebrow="Short · Visual · Voice-ready" title="Safety centre" />
      <div className="grid">
        {guides.map(([I, title, hi, text]: any) => (
          <article className="card panel4" key={title}>
            <I size={30} color="#16865f" />
            <h2>{title}</h2>
            <h3>{hi}</h3>
            <p className="muted">{text}</p>
            <button
              className="btn secondary"
              onClick={() =>
                speechSynthesis.speak(
                  new SpeechSynthesisUtterance(`${title}. ${text}`),
                )
              }
            >
              <Volume2 size={17} /> Listen
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
function RecyclerDashboard() {
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["dash", "recycler"],
    queryFn: () => api<any>("/dashboard/recycler"),
  });
  const orders = useQuery({
    queryKey: ["recycler-dashboard-orders"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 8000,
  });
  const available =
    orders.data?.filter((o) => o.status === "AWAITING_RECYCLER") || [];
  return (
    <>
      <Head eyebrow="Recycler operations" title="Supply command centre" />
      <section
        className={`recycler-order-alert ${available.length ? "live" : ""}`}
      >
        <div className="recycler-alert-icon">
          <Bell size={27} />
          {available.length > 0 && <b>{available.length}</b>}
        </div>
        <div>
          <span>
            {available.length ? "NEW HOUSEHOLD ORDER" : "HOUSEHOLD ORDER DESK"}
          </span>
          <h2>
            {available.length
              ? `${available.length} order${available.length === 1 ? " is" : "s are"} ready to buy`
              : "No new buying orders right now"}
          </h2>
          <p>
            {available.length
              ? `${available[0].items.map((x: any) => x.name).join(", ")} · ${available[0].address} · AI value ${money(available[0].priceRange.low)}–${money(available[0].priceRange.high)}`
              : "New user orders will appear here automatically with a notification."}
          </p>
        </div>
        <button className="btn" onClick={() => nav("/recycler/orders")}>
          {available.length ? "Review & buy order" : "View order history"} →
        </button>
      </section>
      <div className="grid">
        {[
          ["Incoming lots", q.data?.lots],
          ["Pending action", q.data?.active],
          ["Completed payments", q.data?.paid],
          ["Transaction volume", money(q.data?.gmv)],
        ].map(([x, v]) => (
          <div className="card metric" key={x}>
            <span>{x}</span>
            <strong>{v ?? "—"}</strong>
          </div>
        ))}
        <div className="card panel8">
          <h3>Incoming material</h3>
          <Chart />
        </div>
        <div className="card panel4">
          <h3>Pickup pooling</h3>
          <p>3 nearby PCB lots in Pune East can be combined.</p>
          <div className="success">Estimated 22% logistics saving</div>
          <NavLink
            className="btn"
            style={{ marginTop: 12 }}
            to="/recycler/operations"
          >
            Plan combined pickup
          </NavLink>
        </div>
      </div>
    </>
  );
}
function RecyclerLots({ toast }: { toast: (s: string) => void }) {
  const q = useQuery({
    queryKey: ["lots"],
    queryFn: () => api<any[]>("/lots"),
  });
  const [offer, setOffer] = useState(440);
  const submit = async (lot: any) => {
    await api(`/lots/${lot.lotId}/quotes`, {
      method: "POST",
      body: JSON.stringify({
        offerPrice: offer,
        pickupAvailable: true,
        pickupDate: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
    toast("Quote submitted");
  };
  return (
    <>
      <Head eyebrow="Compatible supply" title="Incoming lots" />
      <div className="grid">
        {q.data
          ?.filter((x) => x.status === "CREATED")
          .slice(0, 9)
          .map((l) => (
            <div className="card panel4" key={l.id}>
              <Status s={l.status} />
              <h3>{l.lotId}</h3>
              <h2>
                {l.materialCategory} · {l.approxWeight} kg
              </h2>
              <p>
                AI estimate {money(l.priceRange.low)}–{money(l.priceRange.high)}
              </p>
              <div className="field">
                <label>Your offer / kg</label>
                <input
                  type="number"
                  value={offer}
                  onChange={(e) => setOffer(+e.target.value)}
                />
              </div>
              <button className="btn" onClick={() => submit(l)}>
                Submit quote
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
function Operations({ toast }: { toast: (s: string) => void }) {
  const q = useQuery({
    queryKey: ["lots-ops"],
    queryFn: () => api<any[]>("/lots"),
  });
  const [weight, setWeight] = useState(9.8);
  const [otp, setOtp] = useState("123456");
  const [capacity, setCapacity] = useState(250);
  const [plan, setPlan] = useState<any>(null);
  const optimize = () => {
    const run = (latitude = 18.5204, longitude = 73.8567) =>
      api<any>("/pickups/optimize", {
        method: "POST",
        body: JSON.stringify({
          latitude,
          longitude,
          capacityKg: capacity,
          radiusKm: 15,
        }),
      })
        .then(setPlan)
        .catch((e) => toast(e.message));
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        (p) => run(p.coords.latitude, p.coords.longitude),
        () => run(),
      );
    else run();
  };
  const handover = async (l: any) => {
    try {
      await api("/handover", {
        method: "POST",
        body: JSON.stringify({ lotId: l.lotId, weightAtHandover: weight, otp }),
      });
      toast("Handover verified; discrepancy evaluated");
    } catch (e: any) {
      toast(e.message);
    }
  };
  const pay = async (l: any) => {
    try {
      await api("/payments", {
        method: "POST",
        body: JSON.stringify({
          lotId: l.lotId,
          amount: Math.min(1000, Math.round(l.estimatedValue)),
          method: "UPI",
          transactionReference: `DEMO-${l.lotId}`,
        }),
      });
      toast("Payment recorded");
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <>
      <Head eyebrow="Pickup · Handover · Payment" title="Operations desk" />
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <div>
            <h2 style={{ margin: "0 0 5px" }}>Smart pickup pooling</h2>
            <span className="muted">
              Nearest-neighbour routing · vehicle capacity · 15 km service
              radius
            </span>
          </div>
          <div className="row">
            <label>
              Capacity{" "}
              <input
                style={{ width: 90, padding: 10 }}
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(+e.target.value)}
              />{" "}
              kg
            </label>
            <button className="btn" onClick={optimize}>
              <Navigation size={17} /> Optimize route
            </button>
          </div>
        </div>
        {plan?.routes?.map((r: any) => (
          <div className="pickup-route" key={r.routeId}>
            <div className="row">
              <b>
                {r.routeId} · {r.stops.length} stops
              </b>
              <span className="badge">
                {r.estimatedSavingPercent}% estimated saving
              </span>
            </div>
            <p>
              {r.totalWeightKg} kg · {r.distanceKm} km round trip ·{" "}
              {r.capacityUtilizationPercent}% capacity
            </p>
            <div className="flow">
              {r.stops.map((s: any, i: number) => (
                <span key={s.lotId}>
                  {i + 1}. {s.lotId}
                  <small>
                    {s.weight} kg · +{s.distanceFromPreviousKm} km
                  </small>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="grid">
        {q.data
          ?.filter((x) =>
            [
              "ACCEPTED",
              "PICKUP_SCHEDULED",
              "HANDED_OVER",
              "RECEIVED",
            ].includes(x.status),
          )
          .slice(0, 8)
          .map((l) => (
            <div className="card panel6" key={l.id}>
              <div className="row">
                <b>{l.lotId}</b>
                <Status s={l.status} />
              </div>
              <h2>
                {l.materialCategory} · reported {l.approxWeight} kg
              </h2>
              {["ACCEPTED", "PICKUP_SCHEDULED"].includes(l.status) ? (
                <>
                  <div className="field">
                    <label>Final weight</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(+e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Handover OTP</label>
                    <input
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                  {(Math.abs(l.approxWeight - weight) / l.approxWeight) * 100 >
                    15 && (
                    <div className="notice">
                      Weight discrepancy:{" "}
                      {(
                        (Math.abs(l.approxWeight - weight) / l.approxWeight) *
                        100
                      ).toFixed(1)}
                      %. Admin review will be created.
                    </div>
                  )}
                  <button className="btn" onClick={() => handover(l)}>
                    Confirm handover
                  </button>
                </>
              ) : (
                <button className="btn" onClick={() => pay(l)}>
                  Record simulated payment
                </button>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
function AdminDashboard() {
  const q = useQuery({
    queryKey: ["dash", "admin"],
    queryFn: () => api<any>("/dashboard/admin"),
  });
  return (
    <>
      <Head
        eyebrow="Formalization intelligence · Demo analytics"
        title="Network intelligence"
      />
      <div className="grid">
        {[
          ["Informal → formal lots", q.data?.lots],
          ["Material routed", `${q.data?.materialKg || 0} kg`],
          ["Network GMV", money(q.data?.gmv)],
          ["Risk flags", q.data?.anomalies],
        ].map(([x, v]) => (
          <div className="card metric" key={x}>
            <span>{x}</span>
            <strong>{v ?? "—"}</strong>
          </div>
        ))}
        <div className="card panel8">
          <h3>Material flow</h3>
          <div className="flow">
            <span>Collectors</span>→<span>Aggregators</span>→
            <span>Authorized recyclers</span>→<span>Processing</span>→
            <span>Recovered materials</span>
          </div>
          <h3>Collection density · Coarse geography</h3>
          <NetworkMap />
        </div>
        <div className="card panel4">
          <h3>Formalization trend</h3>
          <Chart />
        </div>
      </div>
    </>
  );
}
function AdminRecyclers({ toast }: { toast: (s: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["recyclers"],
    queryFn: () => api<any[]>("/recyclers"),
  });
  const verify = async (id: string) => {
    await api(`/recyclers/${id}/verify`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["recyclers"] });
    toast("Recycler verification updated");
  };
  return (
    <>
      <Head eyebrow="Due diligence workflow" title="Recycler network" />
      <div className="tablewrap card">
        <table>
          <thead>
            <tr>
              <th>Recycler</th>
              <th>Location</th>
              <th>Materials</th>
              <th>Trust</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.name}</b>
                  <br />
                  <small>Prototype record</small>
                </td>
                <td>{r.location}</td>
                <td>{r.materials.join(", ")}</td>
                <td>{r.reliability}</td>
                <td>
                  <Status s={r.status} />
                </td>
                <td>
                  {r.status !== "VERIFIED" && (
                    <button className="btn" onClick={() => verify(r.id)}>
                      Demo verify
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Anomalies() {
  const q = useQuery({
    queryKey: ["anomalies"],
    queryFn: () => api<any[]>("/anomalies"),
  });
  return (
    <>
      <Head eyebrow="Fairness & integrity controls" title="Anomaly review" />
      <div className="grid">
        {q.data?.map((a) => (
          <div className="card panel4" key={a.id}>
            <div className="row">
              <AlertTriangle color="#b96d06" />
              <Status s={a.severity} />
            </div>
            <h3>{a.type.replaceAll("_", " ")}</h3>
            <p>Lot {a.lotId}</p>
            <span className="badge amber">REVIEW RECOMMENDED</span>
          </div>
        ))}
      </div>
    </>
  );
}
function Datasets() {
  const q = useQuery({
    queryKey: ["dash", "data"],
    queryFn: () => api<any>("/dashboard/admin"),
  });
  const rows = [
    ["Materials", 13, "Validated"],
    ["Prices", 130, "Validated"],
    ["Recyclers", q.data?.verifiedRecyclers, "Review"],
    ["Transactions", q.data?.paid, "Validated"],
    ["Lots", q.data?.lots, "Validated"],
    ["Anomalies", q.data?.anomalies, "Review"],
    ["AI image labels", 48, "Demo only"],
  ];
  return (
    <>
      <Head eyebrow="Structured network data" title="Dataset health" />
      <div className="card tablewrap">
        <table>
          <thead>
            <tr>
              <th>Dataset</th>
              <th>Records</th>
              <th>Updated</th>
              <th>Validation</th>
              <th>Missing</th>
              <th>Duplicates</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>
                  <b>{r[0]}</b>
                </td>
                <td>{r[1]}</td>
                <td>Today</td>
                <td>
                  <Status s={String(r[2]).toUpperCase()} />
                </td>
                <td>0</td>
                <td>0</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 18 }}>
        AI dataset figures describe demo samples only. No measured production
        accuracy is claimed.
      </div>
    </>
  );
}
function Business() {
  const q = useQuery({
    queryKey: ["business"],
    queryFn: () => api<any>("/business/metrics"),
  });
  return (
    <>
      <Head
        eyebrow="Investor view · Demo economics"
        title="The circular network flywheel"
      />
      <div className="grid">
        {[
          ["GMV", money(q.data?.gmv)],
          ["Platform revenue", money(q.data?.revenue)],
          ["Subscriptions", money(q.data?.subscription)],
          ["Contribution margin", money(q.data?.contributionMargin)],
        ].map(([x, v]) => (
          <div className="card metric" key={x}>
            <span>{x}</span>
            <strong>{v}</strong>
          </div>
        ))}
        <div className="card panel6">
          <h2>Network effect</h2>
          <div className="network">
            Collectors → <b>More material</b> → Recycler competition →{" "}
            <b>Better prices</b> → More adoption → <b>More data</b> → Better
            intelligence
          </div>
        </div>
        <div className="card panel6">
          <h2>Platform moat</h2>
          <div className="network">
            NETWORK + TRANSACTION DATA + PRICE HISTORY + RECYCLER PERFORMANCE +
            MATERIAL INTELLIGENCE + TRACEABILITY
          </div>
        </div>
        <div className="card panel8">
          <h2>Revenue architecture</h2>
          <p>
            Recycler SaaS · Transaction fees · Enterprise · Logistics ·
            Intelligence/API
          </p>
          <Chart />
        </div>
        <div className="card panel4">
          <h2>Roadmap</h2>
          <p>
            <b>Now:</b> E-waste, fair pricing, matching, traceability, offline
          </p>
          <p>
            <b>Next:</b> Battery intelligence, pickup optimization, enterprise
            integration
          </p>
          <p>
            <b>Future:</b> Circular materials marketplace and urban mining
            intelligence
          </p>
        </div>
      </div>
    </>
  );
}
function Audit() {
  const q = useQuery({
    queryKey: ["audit"],
    queryFn: () => api<any[]>("/audit"),
  });
  return (
    <>
      <Head eyebrow="Immutable operational history" title="Audit log" />
      <div className="card tablewrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.timestamp).toLocaleString()}</td>
                <td>{a.role}</td>
                <td>
                  <b>{a.action}</b>
                </td>
                <td>
                  {a.entityType} · {a.entityId}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!q.data?.length && (
          <p className="muted">
            Actions performed in this session will appear here.
          </p>
        )}
      </div>
    </>
  );
}
function Traceability() {
  const { id } = useParams();
  const q = useQuery({
    queryKey: ["trace", id],
    queryFn: () => api<any>(`/traceability/${id}`),
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBox error={q.error} />;
  const x = q.data;
  return (
    <div style={{ maxWidth: 720, margin: "20px auto" }}>
      <Head eyebrow="Public-safe e-waste passport" title={x.lotId} />
      <div className="card">
        <div style={{ textAlign: "center" }}>
          <QRCodeSVG value={location.href} size={150} />
          <h2>
            {x.material} · {x.weight} kg
          </h2>
        </div>
        {[
          ["Collection date", date(x.collectionDate)],
          ["Recycler", x.recycler],
          ["Handover", x.handover ? "Verified ✓" : "Pending"],
          ["Payment", x.payment ? "Completed ✓" : "Pending"],
          ["Recycling", x.recycling ? "Recycled ✓" : "In progress"],
        ].map(([a, b]) => (
          <div
            className="row"
            style={{ padding: 14, borderBottom: "1px solid #eee" }}
            key={a}
          >
            <span className="muted">{a}</span>
            <b>{b}</b>
          </div>
        ))}
        <p className="muted" style={{ fontSize: 12 }}>
          Collector identity and precise location are intentionally withheld.
        </p>
      </div>
    </div>
  );
}
function CustomerHome() {
  const nav = useNavigate();
  const user = session.user;
  const [search, setSearch] = useState("");
  const orders = useQuery({
    queryKey: ["market-orders-home"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 10000,
  });
  const active = orders.data?.find(
    (o) =>
      !["COMPLETED", "CANCELLED", "DELIVERED_TO_RECYCLER"].includes(o.status),
  );
  const categories = [
    {
      name: "Phones",
      icon: Smartphone,
      material: "Mobile Phone",
      hint: "Mobile & tablets",
    },
    {
      name: "Computers",
      icon: LayoutDashboard,
      material: "Computer",
      hint: "Laptop & desktop",
    },
    {
      name: "Batteries",
      icon: BatteryCharging,
      material: "Battery",
      hint: "Safe pickup",
    },
    { name: "Cables", icon: Zap, material: "Cable", hint: "Wire & chargers" },
    {
      name: "Appliances",
      icon: Settings,
      material: "Motor",
      hint: "Home electronics",
    },
    {
      name: "More",
      icon: Recycle,
      material: "Other E-Waste",
      hint: "All scrap",
    },
  ];
  return (
    <div className="dlux-home">
      <section className="dlux-welcome">
        <div>
          <span>GOOD DAY</span>
          <h1>{user?.name?.split(" ")[0] || "Welcome"} 👋</h1>
          <button onClick={() => nav("/customer/sell")}>
            <MapPin size={14} /> Pune, Maharashtra <Navigation size={13} />
          </button>
        </div>
        <div className="profile-chip">
          {user?.name
            ?.split(" ")
            .map((x) => x[0])
            .join("")
            .slice(0, 2) || "U"}
        </div>
      </section>
      <div className="dlux-search">
        <Search size={20} />
        <input
          placeholder="Search phone, laptop, battery…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && nav("/customer/sell")}
        />
      </div>
      {active && (
        <section
          className="active-order"
          onClick={() => nav("/customer/orders")}
        >
          <div className="active-icon">
            <Activity size={27} />
          </div>
          <div>
            <span>ACTIVE PICKUP</span>
            <h3>{active.orderId}</h3>
            <p>
              {active.status.replaceAll("_", " ")} · {active.items.length}{" "}
              item(s)
            </p>
          </div>
          <div className="active-arrow">→</div>
        </section>
      )}
      <section className="dlux-hero">
        <div>
          <span>SMART E-WASTE PICKUP</span>
          <h2>
            Snap a photo.
            <br />
            Get the right value.
          </h2>
          <p>
            AI price guidance and an admin-approved collector at your doorstep.
          </p>
          <button onClick={() => nav("/customer/sell")}>
            <Camera size={18} /> Start selling
          </button>
        </div>
        <div className="hero-visual">
          <div>
            <Recycle size={58} />
          </div>
          <small>
            SAFE
            <br />
            CIRCULAR
            <br />
            VALUE
          </small>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span>CHOOSE CATEGORY</span>
          <h2>What are you selling?</h2>
        </div>
        <button onClick={() => nav("/customer/sell")}>View all →</button>
      </div>
      <section className="category-tiles">
        {categories
          .filter(
            (x) =>
              !search || x.name.toLowerCase().includes(search.toLowerCase()),
          )
          .map(({ name, icon: I, hint }) => (
            <button key={name} onClick={() => nav("/customer/sell")}>
              <span>
                <I size={25} />
              </span>
              <b>{name}</b>
              <small>{hint}</small>
            </button>
          ))}
      </section>
      <section className="trust-banner">
        <ShieldCheck size={30} />
        <div>
          <b>Your privacy comes first</b>
          <p>
            Only verified collectors see an approximate area. Exact address
            unlocks after you accept an offer.
          </p>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span>THREE EASY STEPS</span>
          <h2>Doorstep pickup, simplified</h2>
        </div>
      </div>
      <section className="easy-steps">
        <div>
          <span>1</span>
          <Camera />
          <b>Add photos</b>
          <small>AI checks category and fair value</small>
        </div>
        <div>
          <span>2</span>
          <IndianRupee />
          <b>Recycler accepts</b>
          <small>A recycler confirms value and pickup</small>
        </div>
        <div>
          <span>3</span>
          <Truck />
          <b>Pickup & delivery</b>
          <small>Track the collector up to the recycler</small>
        </div>
      </section>
      <button className="floating-sell" onClick={() => nav("/customer/sell")}>
        <Camera size={20} />
        <span>
          <b>Sell an item</b>
          <small>Free AI value check</small>
        </span>
        <b>→</b>
      </button>
    </div>
  );
}
function PartnerHome({ user }: { user: User }) {
  const [online, setOnline] = useState(true);
  const dash = useQuery({
    queryKey: ["partner-dash"],
    queryFn: () => api<any>("/dashboard/collector"),
  });
  const orders = useQuery({
    queryKey: ["partner-orders-home"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 10000,
  });
  const nav = useNavigate();
  return (
    <div className="partner-home">
      <section className="partner-head">
        <div className="partner-avatar">
          <Recycle />
        </div>
        <div>
          <span>APPROVED COLLECTION PARTNER</span>
          <h1>{user.name}</h1>
          <p className={online ? "online" : ""}>
            {online
              ? "● Online · Receiving requests"
              : "● Offline · Requests paused"}
          </p>
        </div>
        <label className="availability">
          <input
            type="checkbox"
            checked={online}
            onChange={(e) => setOnline(e.target.checked)}
          />
          <i />
        </label>
      </section>
      <section className="partner-stats">
        <div>
          <span>
            <Box />
          </span>
          <small>OPEN REQUESTS</small>
          <b>{orders.data?.filter((o) => o.status === "OPEN").length || 0}</b>
        </div>
        <div>
          <span>
            <IndianRupee />
          </span>
          <small>MONTHLY EARNINGS</small>
          <b>{money(dash.data?.monthlyEarnings)}</b>
        </div>
        <div>
          <span>
            <CheckCircle2 />
          </span>
          <small>COMPLETED</small>
          <b>{dash.data?.paid || 0}</b>
        </div>
      </section>
      <section className="partner-action">
        <div>
          <span>HOUSEHOLD PICKUPS</span>
          <h2>
            {online ? "New requests are waiting" : "Go online to receive work"}
          </h2>
          <p>
            AI price bands, approximate distance and item photos help you quote
            confidently.
          </p>
          <button disabled={!online} onClick={() => nav("/collector/orders")}>
            <Truck size={18} /> Browse pickup requests
          </button>
        </div>
        <MapPinned size={90} />
      </section>
      <div className="section-heading">
        <div>
          <span>RECENT REQUESTS</span>
          <h2>Near your service area</h2>
        </div>
        <button onClick={() => nav("/collector/orders")}>See all →</button>
      </div>
      <section className="partner-tasks">
        {orders.data
          ?.filter((o) => o.status === "OPEN")
          .slice(0, 3)
          .map((o) => (
            <button key={o.id} onClick={() => nav("/collector/orders")}>
              <div className="task-icon">
                <Box />
              </div>
              <div>
                <b>{o.items.map((x: any) => x.name).join(", ")}</b>
                <small>
                  <MapPin size={12} /> {o.address}
                </small>
                <span>
                  {o.items
                    .reduce((s: number, x: any) => s + x.estimatedWeight, 0)
                    .toFixed(1)}{" "}
                  kg estimated
                </span>
              </div>
              <strong>
                {money(o.priceRange.high)}
                <small>AI high</small>
              </strong>
            </button>
          ))}
        {!orders.data?.some((o) => o.status === "OPEN") && (
          <div className="empty-task">
            <CheckCircle2 />
            <b>You’re all caught up</b>
            <small>New approved-area requests appear automatically.</small>
          </div>
        )}
      </section>
      <section className="partner-tools">
        <button onClick={() => nav("/collector/orders")}>
          <Box />
          <b>Orders</b>
          <small>Quote & collect</small>
        </button>
        <button onClick={() => nav("/collector/recyclers")}>
          <MapPinned />
          <b>Route map</b>
          <small>Plan pickups</small>
        </button>
        <button onClick={() => nav("/collector/earnings")}>
          <IndianRupee />
          <b>Earnings</b>
          <small>Payout ledger</small>
        </button>
        <button onClick={() => nav("/collector/safety")}>
          <ShieldCheck />
          <b>Safety</b>
          <small>Handling guide</small>
        </button>
      </section>
    </div>
  );
}
async function imageData(file: File) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  try {
    img.src = url;
    await img.decode();
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}
function CustomerSell({ toast }: { toast: (s: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [item, setItem] = useState({
    name: "Old mobile phone",
    category: "Mobile Phone",
    quantity: 1,
    estimatedWeight: 0.4,
    condition: "USED",
    photo: "",
  });
  const [address, setAddress] = useState("Pune, Maharashtra");
  const [couponCode, setCoupon] = useState("");
  const [estimate, setEstimate] = useState<any>(null);
  const nav = useNavigate();
  const photo = async (f?: File) => {
    if (!f) return;
    const data = await imageData(f);
    setItem({ ...item, photo: data });
    try {
      const ml = await classifyImage(f);
      if (ml.suggestedMaterial)
        setItem((x) => ({ ...x, category: ml.suggestedMaterial! }));
      toast("AI inspected the photo on this device");
    } catch {
      toast("Photo added; price AI will use selected category");
    }
  };
  const add = async () => {
    const p = await api<any>("/prices/estimate", {
      method: "POST",
      body: JSON.stringify({
        material: item.category,
        weight: item.estimatedWeight,
        condition: item.condition,
      }),
    });
    setEstimate(p);
    setItems([
      ...items,
      {
        ...item,
        aiFairValue: Math.round(p.recommendedFairPrice * item.estimatedWeight),
      },
    ]);
    toast("Item added to pickup cart");
  };
  const place = () => {
    const send = (coords: any = {}) =>
      api<any>("/marketplace/orders", {
        method: "POST",
        body: JSON.stringify({ items, address, couponCode, ...coords }),
      })
        .then((o) => {
          toast(`Order ${o.orderId} placed — waiting for a recycler`);
          nav("/customer/orders");
        })
        .catch((e) => toast(e.message));
    send();
  };
  return (
    <>
      <Head
        eyebrow="Personal scrap pickup"
        title="What would you like to sell?"
      >
        <button
          className="btn outline"
          onClick={() => nav("/customer/dashboard")}
        >
          ← Back
        </button>
      </Head>
      <div className="grid">
        <section className="card panel7 panel8">
          <div className="form">
            <div className="field">
              <label>Item name</label>
              <input
                value={item.name}
                onChange={(e) => setItem({ ...item, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Material</label>
              <select
                value={item.category}
                onChange={(e) => setItem({ ...item, category: e.target.value })}
              >
                {[
                  "Mobile Phone",
                  "Laptop",
                  "Computer",
                  "Battery",
                  "Cable",
                  "Copper",
                  "Aluminium",
                  "PCB",
                  "Other E-Waste",
                ].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="row">
              <div className="field">
                <label>Approx. weight kg</label>
                <input
                  type="number"
                  step=".1"
                  value={item.estimatedWeight}
                  onChange={(e) =>
                    setItem({ ...item, estimatedWeight: +e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Condition</label>
                <select
                  value={item.condition}
                  onChange={(e) =>
                    setItem({ ...item, condition: e.target.value })
                  }
                >
                  <option>GOOD</option>
                  <option>USED</option>
                  <option>POOR</option>
                </select>
              </div>
            </div>
            <label className="btn secondary">
              <Camera size={17} />
              <input
                hidden
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => photo(e.target.files?.[0])}
              />{" "}
              Add item photo
            </label>
            {item.photo && (
              <img
                src={item.photo}
                alt="Item preview"
                style={{ height: 120, objectFit: "cover", borderRadius: 12 }}
              />
            )}
            <button className="btn" onClick={add}>
              Add to pickup cart
            </button>
            {estimate && (
              <div className="success">
                AI fair rate: {money(estimate.low)}–{money(estimate.high)}/kg
              </div>
            )}
          </div>
        </section>
        <aside className="card panel4">
          <h2>Pickup cart ({items.length})</h2>
          {items.map((x, i) => (
            <div className="cart-item" key={i}>
              {x.photo && <img src={x.photo} alt="" />}
              <span>
                <b>{x.name}</b>
                <small>
                  {x.category} · {x.estimatedWeight} kg · AI value{" "}
                  {money(x.aiFairValue)}
                </small>
              </span>
              <button onClick={() => setItems(items.filter((_, n) => n !== i))}>
                ×
              </button>
            </div>
          ))}
          <div className="field">
            <label>Pickup address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Coupon code</label>
            <input
              value={couponCode}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            />
          </div>
          <button className="btn full" disabled={!items.length} onClick={place}>
            Place pickup order
          </button>
          <p className="muted">
            Your order is placed instantly. A recycler accepts the material,
            then one verified collector is assigned for pickup.
          </p>
        </aside>
      </div>
    </>
  );
}
function CustomerOrders({ toast }: { toast: (s: string) => void }) {
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["market-orders"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 8000,
  });
  const steps = [
    "RECYCLER_ACCEPTED",
    "COLLECTOR_ASSIGNED",
    "PICKED_UP",
    "DELIVERED_TO_RECYCLER",
  ];
  const progress: Record<string, number> = {
    AWAITING_RECYCLER: -1,
    COLLECTOR_ASSIGNED: 1,
    COLLECTOR_EN_ROUTE: 1,
    PICKED_UP: 2,
    DELIVERED_TO_RECYCLER: 3,
  };
  return (
    <>
      <Head eyebrow="Live pickup tracking" title="My pickup orders">
        <button
          className="btn outline"
          onClick={() => nav("/customer/dashboard")}
        >
          ← Back
        </button>
      </Head>
      <div className="grid">
        {q.data?.map((o) => (
          <article className="card panel6" key={o.id}>
            <Status s={o.status} />
            <h2>{o.orderId}</h2>
            <p>{o.items.map((x: any) => x.name).join(" · ")}</p>
            <div className="success">
              <b>AI fair value</b>
              <br />
              {money(o.priceRange.low)}–{money(o.priceRange.high)}
            </div>
            {o.recyclerName && (
              <div className="accepted-banner">
                <CheckCircle2 size={28} />
                <span>
                  <b>
                    {o.status === "COLLECTOR_EN_ROUTE"
                      ? `${o.collectorName} is on the way`
                      : `Order accepted by ${o.recyclerName}`}
                  </b>
                  <small>
                    {o.status === "COLLECTOR_EN_ROUTE"
                      ? "Live trip started · ETA about 17 minutes"
                      : `${money(o.recyclerOffer)} confirmed · ${o.collectorName ? `${o.collectorName} assigned for pickup` : "Collector assignment in progress"}`}
                  </small>
                </span>
              </div>
            )}
            {["COLLECTOR_ASSIGNED", "COLLECTOR_EN_ROUTE"].includes(
              o.status,
            ) && (
              <div className="customer-live-map">
                <iframe
                  title="Collector route"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(Number(o.longitude) || 73.8077) - 0.025}%2C${(Number(o.latitude) || 18.5074) - 0.018}%2C${(Number(o.longitude) || 73.8077) + 0.025}%2C${(Number(o.latitude) || 18.5074) + 0.018}&layer=mapnik&marker=${Number(o.latitude) || 18.5074}%2C${Number(o.longitude) || 73.8077}`}
                />
                <div>
                  <span className="live-dot" />
                  <b>
                    {o.status === "COLLECTOR_EN_ROUTE"
                      ? "Collector is coming to you"
                      : "Collector assigned"}
                  </b>
                  <small>
                    {o.collectorName} ·{" "}
                    {o.status === "COLLECTOR_EN_ROUTE"
                      ? "ETA about 17 min"
                      : "Trip will start soon"}
                  </small>
                </div>
              </div>
            )}
            <div className="order-timeline">
              {steps.map((s, i) => (
                <div
                  className={(progress[o.status] ?? -1) >= i ? "done" : ""}
                  key={s}
                >
                  <i>{(progress[o.status] ?? -1) >= i ? "✓" : i + 1}</i>
                  <span>
                    <b>
                      {
                        [
                          "Recycler confirmation",
                          "Collector assigned",
                          "Picked up",
                          "Delivered to recycler",
                        ][i]
                      }
                    </b>
                    <small>
                      {i === 0 && o.recyclerName
                        ? `${o.recyclerName} accepted · ${money(o.recyclerOffer)}`
                        : i === 1 && o.collectorName
                          ? `${o.collectorName} will collect`
                          : i === 2 && o.pickedUpAt
                            ? "Collected from your address"
                            : i === 3 && o.deliveredAt
                              ? `Safely delivered · ${money(o.finalAmount)}`
                              : "Waiting for update"}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
function CollectorOrders({ toast }: { toast: (s: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["market-orders"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 8000,
  });
  const [routeOrder, setRouteOrder] = useState<string | null>(null);
  const routeInfo = (o: any) => {
    const latitude = Number(o.latitude) || 18.5074,
      longitude = Number(o.longitude) || 73.8077,
      depot = { latitude: 18.5204, longitude: 73.8567 };
    const rad = (x: number) => (x * Math.PI) / 180,
      dLat = rad(latitude - depot.latitude),
      dLon = rad(longitude - depot.longitude),
      a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(rad(depot.latitude)) *
          Math.cos(rad(latitude)) *
          Math.sin(dLon / 2) ** 2;
    return {
      distance: 6371 * 2 * Math.asin(Math.sqrt(a)),
      map: `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.025}%2C${latitude - 0.018}%2C${longitude + 0.025}%2C${latitude + 0.018}&layer=mapnik&marker=${latitude}%2C${longitude}`,
      directions: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${depot.latitude}%2C${depot.longitude}%3B${latitude}%2C${longitude}`,
    };
  };
  const start = async (id: string) => {
    await api(`/marketplace/orders/${id}/start-trip`, { method: "POST" });
    toast("Journey started — user can see you are coming");
    qc.invalidateQueries({ queryKey: ["market-orders"] });
  };
  const move = async (id: string, action: "pickup" | "deliver") => {
    await api(`/marketplace/orders/${id}/${action}`, { method: "POST" });
    toast(
      action === "pickup"
        ? "Pickup confirmed — now deliver to recycler"
        : "Delivered to recycler successfully",
    );
    qc.invalidateQueries({ queryKey: ["market-orders"] });
  };
  return (
    <>
      <Head eyebrow="Your assigned work only" title="Pickup & delivery" />
      <div className="grid">
        {q.data?.map((o) => {
          const route = routeInfo(o);
          return (
            <article
              className={`card panel6 route-order-card ${routeOrder === o.id ? "expanded" : ""}`}
              key={o.id}
            >
              <Status s={o.status} />
              <h2>{o.orderId}</h2>
              <p>
                {o.items
                  .map((x: any) => `${x.name} · ${x.estimatedWeight} kg`)
                  .join(" | ")}
              </p>
              <p>
                <MapPin size={15} /> {o.address}
              </p>
              <button
                className="route-summary"
                onClick={() => setRouteOrder(routeOrder === o.id ? null : o.id)}
              >
                <Navigation size={19} />
                <span>
                  <b>{route.distance.toFixed(1)} km to customer</b>
                  <small>
                    About {Math.max(8, Math.round(route.distance * 3.2))} min ·
                    Click to {routeOrder === o.id ? "hide" : "view"} route
                  </small>
                </span>
                <strong>{routeOrder === o.id ? "↑" : "↓"}</strong>
              </button>
              {routeOrder === o.id && (
                <div className="order-route-map">
                  <iframe
                    title={`Customer route ${o.orderId}`}
                    src={route.map}
                  />
                  <div>
                    <b>
                      <MapPin size={15} /> Customer: {o.address}
                    </b>
                    <small>Navigate from your service point</small>
                    <a
                      className="btn"
                      href={route.directions}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation size={17} /> Open directions
                    </a>
                  </div>
                </div>
              )}
              <div className="success">
                AI guidance {money(o.priceRange.low)}–{money(o.priceRange.high)}
              </div>
              <p>
                <Recycle size={15} /> Deliver to: <b>{o.recyclerName}</b>
              </p>
              {o.status === "COLLECTOR_ASSIGNED" && (
                <button
                  className="btn secondary full"
                  onClick={() => start(o.orderId)}
                >
                  <Navigation size={18} /> Start journey to customer
                </button>
              )}
              {o.status === "COLLECTOR_EN_ROUTE" && (
                <button
                  className="btn full"
                  onClick={() => move(o.orderId, "pickup")}
                >
                  <PackageCheck size={18} /> Confirm picked up
                </button>
              )}
              {o.status === "PICKED_UP" && (
                <button
                  className="btn full"
                  onClick={() => move(o.orderId, "deliver")}
                >
                  <Truck size={18} /> Confirm delivered to recycler
                </button>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
function RecyclerOrders({ toast }: { toast: (s: string) => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["recycler-user-orders"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 8000,
  });
  const [amount, setAmount] = useState(700);
  const [routeOrder, setRouteOrder] = useState<string | null>(null);
  const depot = { latitude: 18.5204, longitude: 73.8567 };
  const routeInfo = (o: any) => {
    const latitude = Number(o.latitude) || 18.5074,
      longitude = Number(o.longitude) || 73.8077;
    const rad = (x: number) => (x * Math.PI) / 180,
      dLat = rad(latitude - depot.latitude),
      dLon = rad(longitude - depot.longitude);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(depot.latitude)) *
        Math.cos(rad(latitude)) *
        Math.sin(dLon / 2) ** 2;
    const distance = 6371 * 2 * Math.asin(Math.sqrt(a));
    return {
      latitude,
      longitude,
      distance,
      map: `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.025}%2C${latitude - 0.018}%2C${longitude + 0.025}%2C${latitude + 0.018}&layer=mapnik&marker=${latitude}%2C${longitude}`,
      directions: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${depot.latitude}%2C${depot.longitude}%3B${latitude}%2C${longitude}`,
    };
  };
  const accept = async (id: string) => {
    try {
      await api(`/marketplace/orders/${id}/recycler-accept`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      toast("Order accepted and one collector assigned");
      qc.invalidateQueries({ queryKey: ["recycler-user-orders"] });
    } catch (e: any) {
      toast(e.message);
    }
  };
  return (
    <>
      <Head
        eyebrow="First verified recycler wins"
        title="Household material orders"
      />
      <div className="grid">
        {q.data?.map((o) => {
          const route = routeInfo(o);
          return (
            <article
              className={`card panel6 route-order-card ${routeOrder === o.id ? "expanded" : ""}`}
              key={o.id}
            >
              <Status s={o.status} />
              <h2>{o.orderId}</h2>
              <p>
                {o.items
                  .map((x: any) => `${x.name} · ${x.estimatedWeight} kg`)
                  .join(" | ")}
              </p>
              <p>
                <MapPin size={15} /> {o.address}
              </p>
              <button
                className="route-summary"
                onClick={() => setRouteOrder(routeOrder === o.id ? null : o.id)}
              >
                <Navigation size={19} />
                <span>
                  <b>{route.distance.toFixed(1)} km from your facility</b>
                  <small>
                    About {Math.max(8, Math.round(route.distance * 3.2))} min by
                    road · Click to {routeOrder === o.id ? "hide" : "view"}{" "}
                    route
                  </small>
                </span>
                <strong>{routeOrder === o.id ? "↑" : "↓"}</strong>
              </button>
              {routeOrder === o.id && (
                <div className="order-route-map">
                  <iframe title={`Route for ${o.orderId}`} src={route.map} />
                  <div>
                    <b>
                      <MapPin size={15} /> Pickup: {o.address}
                    </b>
                    <small>Route starts from GreenCycle Pune facility</small>
                    <a
                      className="btn"
                      href={route.directions}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation size={17} /> Open turn-by-turn directions
                    </a>
                  </div>
                </div>
              )}
              <div className="success">
                AI fair range {money(o.priceRange.low)}–
                {money(o.priceRange.high)}
              </div>
              {o.status === "AWAITING_RECYCLER" && (
                <div className="form">
                  <div className="field">
                    <label>Your total buying value</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(+e.target.value)}
                    />
                  </div>
                  <button
                    className="btn full"
                    onClick={() => accept(o.orderId)}
                  >
                    Accept order & request pickup
                  </button>
                </div>
              )}
              {o.recyclerId && (
                <div className="notice">
                  <b>You accepted this order</b>
                  <br />
                  Collector workflow: {o.status.replaceAll("_", " ")}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
function AdminApprovals({ toast }: { toast: (s: string) => void }) {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<any[]>("/admin/users"),
  });
  const config = useQuery({
    queryKey: ["market-config"],
    queryFn: () => api<any>("/admin/marketplace-config"),
  });
  const [values, setValues] = useState({
    commissionPercent: 5,
    deliveryCharge: 40,
    freeDeliveryAbove: 1000,
  });
  const [coupon, setCoupon] = useState({
    code: "WELCOME100",
    type: "FLAT",
    value: 100,
    minOrderValue: 500,
  });
  useEffect(() => {
    if (config.data)
      setValues({
        commissionPercent: config.data.commissionPercent,
        deliveryCharge: config.data.deliveryCharge,
        freeDeliveryAbove: config.data.freeDeliveryAbove,
      });
  }, [config.data]);
  const approve = async (id: string, status: string) => {
    await api(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    toast(`Account ${status.toLowerCase()}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  const save = async () => {
    await api("/admin/marketplace-config", {
      method: "PATCH",
      body: JSON.stringify(values),
    });
    toast("Marketplace charges updated");
  };
  const addCoupon = async () => {
    await api("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(coupon),
    });
    toast("Coupon added");
    qc.invalidateQueries({ queryKey: ["market-config"] });
  };
  return (
    <>
      <Head
        eyebrow="Trust and commercial controls"
        title="Approvals & marketplace settings"
      />
      <div className="grid">
        <section className="card panel8">
          <h2>Collector and recycler approvals</h2>
          {users.data
            ?.filter((u) => ["COLLECTOR", "RECYCLER"].includes(u.role))
            .map((u) => (
              <div className="approval-row" key={u.id}>
                <span>
                  <b>{u.name}</b>
                  <small>
                    {u.role} · {u.email}
                  </small>
                </span>
                <Status s={u.status} />
                {u.status === "PENDING" && (
                  <>
                    <button
                      className="btn"
                      onClick={() => approve(u.id, "APPROVED")}
                    >
                      Approve
                    </button>
                    <button
                      className="btn outline"
                      onClick={() => approve(u.id, "REJECTED")}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            ))}
        </section>
        <aside className="card panel4">
          <h2>Charges</h2>
          {Object.entries(values).map(([k, v]) => (
            <div className="field" key={k}>
              <label>{k}</label>
              <input
                type="number"
                value={v}
                onChange={(e) => setValues({ ...values, [k]: +e.target.value })}
              />
            </div>
          ))}
          <button className="btn full" onClick={save}>
            Save charges
          </button>
          <h3>Add coupon</h3>
          <div className="field">
            <input
              placeholder="Code"
              value={coupon.code}
              onChange={(e) => setCoupon({ ...coupon, code: e.target.value })}
            />
          </div>
          <div className="row">
            <select
              value={coupon.type}
              onChange={(e) => setCoupon({ ...coupon, type: e.target.value })}
            >
              <option>FLAT</option>
              <option>PERCENT</option>
            </select>
            <input
              type="number"
              value={coupon.value}
              onChange={(e) => setCoupon({ ...coupon, value: +e.target.value })}
            />
          </div>
          <button className="btn secondary full" onClick={addCoupon}>
            Add coupon
          </button>
          <p>{config.data?.coupons?.map((c: any) => c.code).join(" · ")}</p>
        </aside>
      </div>
    </>
  );
}
function AdminOrders() {
  const q = useQuery({
    queryKey: ["admin-market-orders"],
    queryFn: () => api<any[]>("/marketplace/orders"),
    refetchInterval: 10000,
  });
  return (
    <>
      <Head
        eyebrow="End-to-end oversight"
        title="Household marketplace orders"
      />
      <div className="tablewrap card">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>User</th>
              <th>Items</th>
              <th>AI value</th>
              <th>Final</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((o) => (
              <tr key={o.id}>
                <td>{o.orderId}</td>
                <td>{o.customerId}</td>
                <td>{o.items.length}</td>
                <td>{money(o.aiEstimatedValue)}</td>
                <td>{money(o.finalAmount)}</td>
                <td>
                  <Status s={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Chart() {
  const d = [
    { m: "Apr", v: 20 },
    { m: "May", v: 31 },
    { m: "Jun", v: 28 },
    { m: "Jul", v: 44 },
    { m: "Aug", v: 52 },
    { m: "Sep", v: 61 },
  ];
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={d}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16865f" stopOpacity={0.4} />
              <stop offset="1" stopColor="#16865f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="m" />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="v"
            stroke="#16865f"
            fill="url(#g)"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function Analytics({ title }: { title: string }) {
  return (
    <>
      <Head eyebrow="Operational analytics" title={title} />
      <div className="grid">
        <div className="card panel8">
          <Chart />
        </div>
        <div className="card panel4">
          <h3>Pickup performance</h3>
          <strong style={{ fontSize: 36 }}>92%</strong>
          <p className="muted">On-time completion</p>
          <div className="success">↑ 6% this month</div>
        </div>
      </div>
    </>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(session.user);
  const [signup, setSignup] = useState(false);
  const path = location.pathname;
  const portal = path.startsWith("/admin")
    ? "ADMIN"
    : path.startsWith("/collector-login") || path.startsWith("/partner-login")
      ? "COLLECTOR"
      : path.startsWith("/recycler-login")
        ? "RECYCLER"
        : path.startsWith("/user-login")
          ? "CUSTOMER"
          : undefined;
  if (!user)
    return signup ? (
      <Signup back={() => setSignup(false)} />
    ) : (
      <Login
        portal={portal}
        onLogin={setUser}
        onSignup={() => setSignup(true)}
      />
    );
  return (
    <Layout
      user={user}
      onLogout={() => {
        session.clear();
        setUser(null);
      }}
    />
  );
}
