import { useEffect, useState } from "react";
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
    <div className={`brand-lockup ${dark ? "dark" : ""}`} aria-label="ChakraSetu">
      <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 5a19 19 0 1 0 18.2 24.5" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        <path d="m36 18 7 11-13 1" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 27c4-9 14-10 19-5-1 9-9 14-19 11 4-2 8-5 11-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span><b>CHAKRA</b>SETU<small>scrap to value</small></span>
    </div>
  );
}
function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [identifier, setId] = useState("collector@kabadi.local"),
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
        <h1>Scrap collection.<br/>Now simple and smart.</h1>
        <p>Take a photo, check the fair price, and sell to a verified recycler.</p>
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
            ["Collector", "collector@kabadi.local"],
            ["Recycler", "recycler@kabadi.local"],
            ["Admin", "admin@kabadi.local"],
          ].map(([r, e]) => (
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
        </div>
      </section>
    </div>
  );
}
const menus: any = {
  COLLECTOR: [
    [Home, "Home", "/collector/dashboard"],
    [Box, "Lots", "/collector/lots"],
    [IndianRupee, "Prices", "/collector/prices"],
    [Recycle, "Recyclers", "/collector/recyclers"],
    [ShieldCheck, "Safety", "/collector/safety"],
    [ReceiptIndianRupee, "Earnings", "/collector/earnings"],
  ],
  RECYCLER: [
    [LayoutDashboard, "Dashboard", "/recycler/dashboard"],
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
  ],
};
function NotificationCenter({user}:{user:User}){
  const [open,setOpen]=useState(false);
  const client=useQueryClient();
  const q=useQuery({queryKey:["notifications",user.id],queryFn:()=>api<any[]>("/notifications"),refetchInterval:10000});
  const unread=q.data?.filter(n=>!n.read).length||0;
  const enable=async()=>{
    if(!("Notification" in window))return;
    const permission=await Notification.requestPermission();
    if(permission==="granted")new Notification("CHAKRASETU alerts enabled",{body:"Quotes, pickup, handover and payment updates will appear here."});
  };
  const mark=async(n:any)=>{if(!n.read)await api(`/notifications/${n.id}/read`,{method:"PATCH"});client.invalidateQueries({queryKey:["notifications",user.id]});if(n.link)location.href=n.link;};
  return <div className="notification-wrap">
    <button className="iconbtn" onClick={()=>setOpen(!open)} aria-label={`${unread} unread notifications`}><Bell size={17}/>{unread>0&&<span className="notification-count">{unread}</span>}</button>
    {open&&<div className="notification-panel">
      <div className="row"><b>Live updates</b><button className="btn secondary compact" onClick={enable}>Enable device alerts</button></div>
      {!q.data?.length?<p className="muted">No updates yet. New quotes and payments will appear automatically.</p>:q.data.map(n=><button key={n.id} className={`notification-item ${n.read?"":"unread"}`} onClick={()=>mark(n)}><b>{n.title}</b><span>{n.message}</span><small>{date(n.createdAt)}</small></button>)}
    </div>}
  </div>;
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
    <div className="app">
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
          <NotificationCenter user={user}/>
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
            <b>One simple promise</b><br />
            Fair price · Accurate weight<br />
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
      <Route
        path="/collector/dashboard"
        element={<CollectorDashboard user={user} />}
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
              <span className="live-pill"><i /> Pune rates live</span>
              <h2>Want to sell scrap?</h2>
              <p>Take a photo. We will identify the material, estimate its value, and find a nearby verified buyer.</p>
              <div className="hero-actions">
                <NavLink className="btn primary-big" to="/collector/scan"><Camera size={22}/> Start with a photo</NavLink>
                <NavLink className="btn soft" to="/collector/lots/create"><Box size={20}/> Add without a photo</NavLink>
              </div>
            </div>
            <div className="three-taps" aria-label="Three simple steps">
              <div><b>1</b><span>Photo</span><small>Scrap pehchanein</small></div>
              <div><b>2</b><span>Price</span><small>Live fair price</small></div>
              <div><b>3</b><span>Pickup</span><small>Verified partner</small></div>
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
          <div className="section-title"><div><span className="eyebrow">Quick actions</span><h3>What would you like to do?</h3></div><span className="muted">Large buttons · fewer steps</span></div>
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
            <div><Weight/><span><b>Verified Weight</b><small>Lock the digital weight after OTP verification</small></span></div>
            <div><MapPinned/><span><b>Smart Pickup Routes</b><small>Combine nearby pickups to save time and fuel</small></span></div>
            <div><Zap/><span><b>Price Alerts</b><small>Get an alert when your local scrap rate increases</small></span></div>
          </section>
        </>
      )}
    </>
  );
}
function Scan({ toast }: { toast: (s: string) => void }) {
  const [file, setFile] = useState<File | null>(null),
    [result, setResult] = useState<any>(null),[analyzing,setAnalyzing]=useState(false),[vision,setVision]=useState<any>(null);
  const nav = useNavigate();
  const analyze = async () => {
    setAnalyzing(true);
    try{
      const ml=file?await classifyImage(file).catch(()=>null):null;
      setVision(ml);
      const r = await api<any>("/ai/classify", {method:"POST",body:JSON.stringify({fileName:file?.name||"pcb-demo.jpg",visionLabel:ml?.labels?.[0]?.label,suggestedMaterial:ml?.suggestedMaterial})});
      setResult({...r,model:ml?"TensorFlow.js MobileNet + CHAKRASETU material rules":"CHAKRASETU deterministic fallback"});
      toast(ml?"On-device ML analysis completed":"AI fallback analysis completed");
    }finally{setAnalyzing(false);}
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
            {analyzing?"Loading on-device ML model…":"Analyze material"}
          </button>
        </section>
        <section className="card panel6">
          {!result ? (
            <div style={{ textAlign: "center", padding: 60 }}>
              <Activity size={42} color="#82948a" />
              <h3>AI result will appear here</h3>
              <p className="muted">
                A real MobileNet model runs privately on this device; CHAKRASETU maps its visual labels to e-waste classes.
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
                {result.model}. Experimental advisory classification; verify before commercial decisions.
              </p>
              {vision?.labels?.length>0&&<details><summary>Model evidence</summary><p className="muted">{vision.labels.slice(0,3).map((x:any)=>`${x.label} (${x.confidence}%)`).join(" · ")}</p></details>}
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
                style={{ color: "inherit", textDecoration: "none", cursor: l.status === "OFFLINE_PENDING" ? "default" : "pointer" }}
                key={l.id}
                role={l.status === "OFFLINE_PENDING" ? undefined : "link"}
                tabIndex={l.status === "OFFLINE_PENDING" ? undefined : 0}
                onClick={() => l.status !== "OFFLINE_PENDING" && navigate(`/collector/lots/${l.lotId}`)}
                onKeyDown={(e) => e.key === "Enter" && l.status !== "OFFLINE_PENDING" && navigate(`/collector/lots/${l.lotId}`)}
              >
                <div className="row">
                  <b>{l.lotId}</b>
                  <Status s={l.status} />
                </div>
                <h3>
                  {l.materialCategory} · {l.approxWeight} kg
                </h3>
                <p>{l.status === "OFFLINE_PENDING" ? "Saved safely on this device" : `${money(l.priceRange.low)} – ${money(l.priceRange.high)}`}</p>
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
              No quote yet. Sign in as recycler and submit an offer for this lot.
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
                    {quote.pickupAvailable ? "Pickup available" : "Drop-off only"}
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
  const [position,setPosition]=useState<{latitude:number;longitude:number;accuracy:number}|null>(null);
  const [gpsError,setGpsError]=useState("");
  const locate=()=>navigator.geolocation?navigator.geolocation.getCurrentPosition(
    p=>{setPosition({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy});setGpsError("");},
    e=>setGpsError(e.message),{enableHighAccuracy:true,timeout:12000,maximumAge:60000}
  ):setGpsError("GPS is not supported on this device");
  const lat=position?.latitude||18.5204,lon=position?.longitude||73.8567;
  const bbox=`${lon-.08}%2C${lat-.055}%2C${lon+.08}%2C${lat+.055}`;
  return (
    <section className="map-card" aria-label="Nearby recycler map">
      <iframe
        title="Nearby verified recyclers in Pune"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`}
        loading="lazy"
      />
      <div className="map-overlay">
        <span className="live-pill"><i /> 6 partners online</span>
        <b>Nearby pickup network</b>
        <small>{position?`GPS active · accuracy ±${Math.round(position.accuracy)} m`:"Approximate area only · exact address stays private"}</small>
        <button className="btn compact" onClick={locate}><Navigation size={15}/> Use my live GPS</button>
        {gpsError&&<small>{gpsError}</small>}
      </div>
      <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
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
      <Head eyebrow="Distance · price · trust" title="Find the right recycler nearby" />
      <NetworkMap />
      <div className="trust-note">
        <ShieldCheck size={20}/><span><b>Trust score samajhna easy hai</b><small>License check, on-time pickup, payment record aur weight disputes se score banta hai. Demo verification is not government certification.</small></span>
      </div>
      {q.isLoading ? (
        <Spinner />
      ) : (
        <div className="grid">
          {q.data?.map((r, i) => (
            <div className={`card panel4 recycler-card ${i === 0 ? "best" : ""}`} key={r.id}>
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
                <Truck size={17}/> Request pickup quote
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
  const q = useQuery({
    queryKey: ["dash", "recycler"],
    queryFn: () => api<any>("/dashboard/recycler"),
  });
  return (
    <>
      <Head eyebrow="Recycler operations" title="Supply command centre" />
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
  const [capacity,setCapacity]=useState(250);
  const [plan,setPlan]=useState<any>(null);
  const optimize=()=>{
    const run=(latitude=18.5204,longitude=73.8567)=>api<any>("/pickups/optimize",{method:"POST",body:JSON.stringify({latitude,longitude,capacityKg:capacity,radiusKm:15})}).then(setPlan).catch(e=>toast(e.message));
    if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>run(p.coords.latitude,p.coords.longitude),()=>run());else run();
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
      <div className="card" style={{marginBottom:16}}>
        <div className="row"><div><h2 style={{margin:"0 0 5px"}}>Smart pickup pooling</h2><span className="muted">Nearest-neighbour routing · vehicle capacity · 15 km service radius</span></div><div className="row"><label>Capacity <input style={{width:90,padding:10}} type="number" value={capacity} onChange={e=>setCapacity(+e.target.value)}/> kg</label><button className="btn" onClick={optimize}><Navigation size={17}/> Optimize route</button></div></div>
        {plan?.routes?.map((r:any)=><div className="pickup-route" key={r.routeId}><div className="row"><b>{r.routeId} · {r.stops.length} stops</b><span className="badge">{r.estimatedSavingPercent}% estimated saving</span></div><p>{r.totalWeightKg} kg · {r.distanceKm} km round trip · {r.capacityUtilizationPercent}% capacity</p><div className="flow">{r.stops.map((s:any,i:number)=><span key={s.lotId}>{i+1}. {s.lotId}<small>{s.weight} kg · +{s.distanceFromPreviousKm} km</small></span>)}</div></div>)}
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
  if (!user) return <Login onLogin={setUser} />;
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
