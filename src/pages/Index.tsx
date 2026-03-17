import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

type Tab = "home" | "extensions" | "history" | "security" | "settings" | "profile";

interface VlessKey {
  id: string;
  name: string;
  key: string;
  active: boolean;
  ping?: number;
}

interface ProxyEntry {
  id: string;
  name: string;
  host: string;
  port: string;
  type: "HTTP" | "SOCKS5" | "SOCKS4";
  active: boolean;
}

interface HistoryItem {
  id: string;
  url: string;
  title: string;
  time: string;
  favicon: string;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  icon: string;
}

const QUICK_LINKS: Bookmark[] = [
  { id: "1", title: "GitHub", url: "https://github.com", icon: "Github" },
  { id: "2", title: "YouTube", url: "https://youtube.com", icon: "Youtube" },
  { id: "3", title: "ChatGPT", url: "https://chatgpt.com", icon: "Bot" },
  { id: "4", title: "Figma", url: "https://figma.com", icon: "Figma" },
  { id: "5", title: "Gmail", url: "https://gmail.com", icon: "Mail" },
  { id: "6", title: "Notion", url: "https://notion.so", icon: "FileText" },
];

const MOCK_HISTORY: HistoryItem[] = [
  { id: "1", url: "https://github.com/explore", title: "GitHub Explore", time: "2 мин назад", favicon: "Github" },
  { id: "2", url: "https://youtube.com/watch?v=abc", title: "Lo-Fi Music Stream", time: "14 мин назад", favicon: "Youtube" },
  { id: "3", url: "https://docs.poehali.dev", title: "Poehali Docs", time: "1 ч назад", favicon: "BookOpen" },
  { id: "4", url: "https://t.me/durov", title: "Telegram Web", time: "2 ч назад", favicon: "MessageCircle" },
  { id: "5", url: "https://figma.com/file/xyz", title: "HakWeb UI Kit", time: "вчера", favicon: "Figma" },
  { id: "6", url: "https://stackoverflow.com/questions/123", title: "Stack Overflow — VLESS proxy", time: "вчера", favicon: "Code" },
];

const ONBOARDING_STEPS = [
  {
    icon: "Home",
    color: "var(--neon-cyan)",
    title: "Главная страница",
    desc: "Здесь ты найдёшь быстрые ссылки, поиск и статистику блокировок. Введи запрос или URL и нажми Enter — откроется в новой вкладке.",
  },
  {
    icon: "Puzzle",
    color: "var(--neon-green)",
    title: "Расширения: VLESS и Прокси",
    desc: "Перейди в «Расширения» → «VLESS Ключи». Нажми «Добавить», вставь свой vless:// ключ и нажми ВКЛ. Аналогично для прокси — указываешь хост, порт и тип.",
  },
  {
    icon: "Shield",
    color: "var(--neon-purple)",
    title: "Безопасность",
    desc: "В разделе «Безопасность» включай AdBlock, защиту от слежки и принудительный HTTPS. Индекс защиты покажет уровень приватности.",
  },
  {
    icon: "Settings",
    color: "var(--neon-yellow)",
    title: "Настройки и темы",
    desc: "Переключай тёмную и светлую тему в «Настройках» или кнопкой ☀/☾ в шапке. Также можно выбрать цвет неонового акцента.",
  },
  {
    icon: "User",
    color: "var(--neon-pink)",
    title: "Профиль и синхронизация",
    desc: "В «Профиле» редактируй имя и email. Синхронизация сохраняет закладки, историю и расширения между устройствами.",
  },
];

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "https://www.google.com";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.includes(".") && !trimmed.includes(" ")) return `https://${trimmed}`;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

export default function Index() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [urlValue, setUrlValue] = useState("hakweb://newtab");
  const [searchInput, setSearchInput] = useState("");
  const [animKey, setAnimKey] = useState(0);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("hakweb_onboarded");
  });
  const [onboardStep, setOnboardStep] = useState(0);

  // VLESS / Proxy state
  const [vlessKeys, setVlessKeys] = useState<VlessKey[]>([
    { id: "1", name: "Server RU-01", key: "vless://uuid@host:443?encryption=none&security=tls&type=ws#RU-01", active: true, ping: 42 },
    { id: "2", name: "Server DE-02", key: "vless://uuid@host2:443?encryption=none&security=reality&type=tcp#DE-02", active: false, ping: 88 },
  ]);
  const [proxies, setProxies] = useState<ProxyEntry[]>([
    { id: "1", name: "Tokyo SOCKS5", host: "proxy.example.com", port: "1080", type: "SOCKS5", active: true },
    { id: "2", name: "Frankfurt HTTP", host: "proxy2.example.com", port: "8080", type: "HTTP", active: false },
  ]);
  const [newVless, setNewVless] = useState({ name: "", key: "" });
  const [newProxy, setNewProxy] = useState({ name: "", host: "", port: "", type: "SOCKS5" as ProxyEntry["type"] });
  const [addingVless, setAddingVless] = useState(false);
  const [addingProxy, setAddingProxy] = useState(false);

  // Security
  const [adBlock, setAdBlock] = useState(true);
  const [tracking, setTracking] = useState(true);
  const [httpsForce, setHttpsForce] = useState(true);
  const [dns, setDns] = useState("1.1.1.1");

  // Settings
  const [optimization, setOptimization] = useState(true);
  const [acceleration, setAcceleration] = useState(false);

  // Profile
  const [profileName, setProfileName] = useState("Hacker_0x1");
  const [profileEmail, setProfileEmail] = useState("hacker@hakweb.io");

  // History search
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setAnimKey(k => k + 1);
  };

  // Search / navigate
  const doSearch = useCallback(() => {
    const query = searchInput.trim();
    if (!query) return;
    const url = normalizeUrl(query);
    window.open(url, "_blank", "noopener,noreferrer");
    setSearchInput("");
  }, [searchInput]);

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") doSearch();
  };

  // URL bar navigate
  const handleUrlKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const url = normalizeUrl(urlValue);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const finishOnboarding = () => {
    localStorage.setItem("hakweb_onboarded", "1");
    setShowOnboarding(false);
  };

  const toggleVless = (id: string) =>
    setVlessKeys(prev => prev.map(v => ({ ...v, active: v.id === id ? !v.active : false })));
  const deleteVless = (id: string) => setVlessKeys(prev => prev.filter(v => v.id !== id));
  const toggleProxy = (id: string) =>
    setProxies(prev => prev.map(p => ({ ...p, active: p.id === id ? !p.active : false })));
  const deleteProxy = (id: string) => setProxies(prev => prev.filter(p => p.id !== id));

  const addVless = () => {
    if (!newVless.key.trim()) return;
    setVlessKeys(prev => [...prev, {
      id: Date.now().toString(), name: newVless.name || "Новый сервер",
      key: newVless.key, active: false, ping: Math.floor(Math.random() * 100 + 20),
    }]);
    setNewVless({ name: "", key: "" });
    setAddingVless(false);
  };

  const addProxy = () => {
    if (!newProxy.host.trim()) return;
    setProxies(prev => [...prev, {
      id: Date.now().toString(), name: newProxy.name || "Новый прокси",
      host: newProxy.host, port: newProxy.port, type: newProxy.type, active: false,
    }]);
    setNewProxy({ name: "", host: "", port: "", type: "SOCKS5" });
    setAddingProxy(false);
  };

  const filteredHistory = MOCK_HISTORY.filter(h =>
    h.title.toLowerCase().includes(historySearch.toLowerCase()) ||
    h.url.toLowerCase().includes(historySearch.toLowerCase())
  );

  const activeVless = vlessKeys.find(v => v.active);
  const activeProxy = proxies.find(p => p.active);

  const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
    { id: "home", label: "Главная", icon: "Home" },
    { id: "extensions", label: "Расширения", icon: "Puzzle" },
    { id: "history", label: "История", icon: "History" },
    { id: "security", label: "Безопасность", icon: "Shield" },
    { id: "settings", label: "Настройки", icon: "Settings" },
    { id: "profile", label: "Профиль", icon: "User" },
  ];

  return (
    <div className={`min-h-screen flex flex-col cyber-grid ${theme === "dark" ? "dark" : ""}`}
      style={{ background: theme === "dark" ? "hsl(230,25%,5%)" : "hsl(220,20%,96%)" }}>

      {/* Scan line */}
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        <div className="absolute left-0 right-0 h-px animate-scanline opacity-20"
          style={{ background: "linear-gradient(90deg, transparent, var(--neon-cyan), transparent)" }} />
      </div>

      {/* ========== ONBOARDING MODAL ========== */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
          <div className="glass-card w-full max-w-md p-6 animate-scale-in"
            style={{ border: "1px solid var(--neon-cyan)", boxShadow: "0 0 40px rgba(0,212,255,0.2)" }}>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(0,212,255,0.15)", border: "1px solid var(--neon-cyan)" }}>
                  <Icon name="BookOpen" size={14} style={{ color: "var(--neon-cyan)" }} />
                </div>
                <span className="font-orbitron text-sm font-bold tracking-widest" style={{ color: "var(--neon-cyan)" }}>
                  ОБУЧЕНИЕ
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {onboardStep + 1} / {ONBOARDING_STEPS.length}
              </span>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1.5 mb-5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ background: i <= onboardStep ? "var(--neon-cyan)" : "rgba(100,120,140,0.3)", boxShadow: i === onboardStep ? "0 0 8px var(--neon-cyan)" : "none" }} />
              ))}
            </div>

            {/* Step content */}
            <div className="animate-fade-in" key={onboardStep}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${ONBOARDING_STEPS[onboardStep].color}14`, border: `1px solid ${ONBOARDING_STEPS[onboardStep].color}50` }}>
                <Icon name={ONBOARDING_STEPS[onboardStep].icon} size={26} style={{ color: ONBOARDING_STEPS[onboardStep].color }} />
              </div>
              <h3 className="font-orbitron font-bold text-lg mb-2" style={{ color: ONBOARDING_STEPS[onboardStep].color }}>
                {ONBOARDING_STEPS[onboardStep].title}
              </h3>
              <p className="font-rajdhani text-base leading-relaxed text-muted-foreground">
                {ONBOARDING_STEPS[onboardStep].desc}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              {onboardStep > 0 && (
                <button onClick={() => setOnboardStep(s => s - 1)}
                  className="flex-1 py-2.5 rounded-lg font-orbitron text-xs tracking-wider transition-all"
                  style={{ border: "1px solid var(--glass-border)", color: "hsl(var(--muted-foreground))", background: "var(--glass-bg)" }}>
                  НАЗАД
                </button>
              )}
              {onboardStep < ONBOARDING_STEPS.length - 1 ? (
                <button onClick={() => setOnboardStep(s => s + 1)}
                  className="flex-1 py-2.5 rounded-lg font-orbitron text-xs tracking-wider transition-all"
                  style={{ background: "var(--neon-cyan)", color: "#000", boxShadow: "0 0 15px rgba(0,212,255,0.4)" }}>
                  ДАЛЕЕ
                </button>
              ) : (
                <button onClick={finishOnboarding}
                  className="flex-1 py-2.5 rounded-lg font-orbitron text-xs tracking-wider transition-all"
                  style={{ background: "var(--neon-green)", color: "#000", boxShadow: "0 0 15px rgba(0,255,136,0.4)" }}>
                  НАЧАТЬ РАБОТУ
                </button>
              )}
            </div>

            <button onClick={finishOnboarding}
              className="w-full mt-3 font-mono text-xs text-center text-muted-foreground hover:text-foreground transition-colors">
              пропустить обучение
            </button>
          </div>
        </div>
      )}

      {/* ===== TOP BAR ===== */}
      <header className="glass sticky top-0 z-40 px-4 py-2 flex items-center gap-3"
        style={{ borderBottom: "1px solid var(--glass-border)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border-2 animate-spin-slow opacity-40"
              style={{ borderColor: "var(--neon-cyan)", borderTopColor: "transparent" }} />
            <div className="absolute inset-1 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,212,255,0.15)" }}>
              <span className="font-orbitron font-black text-xs" style={{ color: "var(--neon-cyan)" }}>H</span>
            </div>
          </div>
          <span className="font-orbitron font-bold text-sm tracking-widest hidden sm:block"
            style={{ color: "var(--neon-cyan)", textShadow: "0 0 12px var(--neon-cyan)" }}>
            HAK<span style={{ color: "var(--neon-purple)" }}>WEB</span>
          </span>
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {["ChevronLeft", "ChevronRight", "RotateCcw"].map((ic, i) => (
            <button key={i} className="w-7 h-7 rounded-md flex items-center justify-center transition-all hover:scale-110"
              style={{ border: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
              <Icon name={ic} size={13} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* URL Bar */}
        <div className="flex-1 relative">
          <Icon name="Lock" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="url-bar w-full pl-8 pr-24 py-1.5 rounded-lg text-sm"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={handleUrlKey}
            placeholder="Введите URL или запрос..."
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {activeVless && (
              <span className="cyber-badge text-black" style={{ background: "var(--neon-green)" }}>VPN</span>
            )}
            {activeProxy && (
              <span className="cyber-badge text-white" style={{ background: "var(--neon-purple)" }}>PROXY</span>
            )}
            <button
              onClick={() => { const url = normalizeUrl(urlValue); window.open(url, "_blank", "noopener,noreferrer"); }}
              className="w-6 h-6 rounded flex items-center justify-center transition-all hover:scale-110"
              style={{ background: "var(--neon-cyan)", color: "#000" }}>
              <Icon name="ArrowRight" size={11} />
            </button>
          </div>
        </div>

        {/* Help button */}
        <button onClick={() => { setShowOnboarding(true); setOnboardStep(0); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 shrink-0"
          style={{ border: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}
          title="Обучение">
          <Icon name="HelpCircle" size={14} className="text-muted-foreground" />
        </button>

        {/* Theme toggle */}
        <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 shrink-0"
          style={{ border: "1px solid var(--glass-border)", background: "var(--glass-bg)" }}>
          <Icon name={theme === "dark" ? "Sun" : "Moon"} size={14}
            style={{ color: theme === "dark" ? "var(--neon-yellow)" : "var(--neon-purple)" }} />
        </button>
      </header>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <aside className="w-14 lg:w-52 flex flex-col py-4 gap-1 px-2 shrink-0 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto"
          style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--glass-border)" }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => switchTab(item.id)}
              className={`nav-item flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left transition-all group w-full ${activeTab === item.id ? "active" : ""}`}
              style={{
                background: activeTab === item.id ? "rgba(0,212,255,0.08)" : "transparent",
                border: activeTab === item.id ? "1px solid rgba(0,212,255,0.2)" : "1px solid transparent",
              }}>
              <Icon name={item.icon} size={16}
                style={{ color: activeTab === item.id ? "var(--neon-cyan)" : undefined, flexShrink: 0 }}
                className={activeTab === item.id ? "" : "text-muted-foreground group-hover:text-foreground transition-colors"} />
              <span className="hidden lg:block font-rajdhani font-semibold text-sm tracking-wide truncate"
                style={{ color: activeTab === item.id ? "var(--neon-cyan)" : undefined }}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full animate-pulse-neon"
                  style={{ background: "var(--neon-cyan)", boxShadow: "0 0 8px var(--neon-cyan)" }} />
              )}
            </button>
          ))}

          <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--glass-border)" }}>
            <div className="hidden lg:block px-2.5 py-2">
              <p className="font-mono text-xs text-muted-foreground mb-1">СТАТУС</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon"
                  style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }} />
                <span className="font-mono text-xs" style={{ color: "var(--neon-green)" }}>ONLINE</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6" key={animKey}>
          <div className="animate-fade-in max-w-4xl mx-auto">

            {/* ========== HOME ========== */}
            {activeTab === "home" && (
              <div className="space-y-6">
                <div className="text-center py-6 space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 font-mono text-xs"
                    style={{ border: "1px solid var(--glass-border)", background: "var(--glass-bg)", color: "var(--neon-cyan)" }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: "var(--neon-green)" }} />
                    HAKWEB v2.6.1 — SECURE CONNECTION
                  </div>
                  <h1 className="font-orbitron font-black text-3xl lg:text-4xl tracking-wider"
                    style={{ color: "var(--neon-cyan)", textShadow: "0 0 30px rgba(0,212,255,0.4)" }}>
                    ДОБРО ПОЖАЛО<span style={{ color: "var(--neon-purple)" }}>ВАТЬ</span>
                  </h1>
                  <p className="font-rajdhani text-muted-foreground text-lg tracking-wide">
                    Браузер нового поколения. Быстрый. Безопасный. Ваш.
                  </p>
                </div>

                {/* Search */}
                <div className="relative max-w-xl mx-auto">
                  <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    placeholder="Поиск или введите URL... (Enter для открытия)"
                    className="cyber-input pl-10 pr-28 py-3 text-base rounded-xl"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={handleSearchKey}
                  />
                  <button
                    onClick={doSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg font-orbitron text-xs font-bold transition-all hover:scale-105"
                    style={{ background: "var(--neon-cyan)", color: "#000", boxShadow: "0 0 12px rgba(0,212,255,0.4)" }}>
                    НАЙТИ
                  </button>
                </div>

                {/* Quick links */}
                <div>
                  <h2 className="font-orbitron text-xs tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Icon name="Zap" size={12} style={{ color: "var(--neon-yellow)" }} />
                    БЫСТРЫЙ ДОСТУП
                  </h2>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {QUICK_LINKS.map((link, i) => (
                      <button key={link.id}
                        onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                        className="glass-card p-3 flex flex-col items-center gap-2 group"
                        style={{ animationDelay: `${i * 0.05}s` }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all group-hover:scale-110"
                          style={{ background: "rgba(0,212,255,0.08)", border: "1px solid var(--glass-border)" }}>
                          <Icon name={link.icon} size={16} style={{ color: "var(--neon-cyan)" }} />
                        </div>
                        <span className="font-rajdhani text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                          {link.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Заблокировано", value: "1 247", icon: "ShieldOff", color: "var(--neon-green)" },
                    { label: "Скорость", value: "2.1x", icon: "Zap", color: "var(--neon-yellow)" },
                    { label: "Трафик сохранён", value: "34%", icon: "TrendingDown", color: "var(--neon-cyan)" },
                    { label: "VPN статус", value: activeVless ? "ВКЛ" : "ВЫКЛ", icon: "Wifi", color: activeVless ? "var(--neon-green)" : "var(--neon-purple)" },
                  ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon name={stat.icon} size={13} style={{ color: stat.color }} />
                        <span className="font-mono text-xs text-muted-foreground truncate">{stat.label}</span>
                      </div>
                      <p className="font-orbitron font-bold text-xl" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Recent history */}
                <div>
                  <h2 className="font-orbitron text-xs tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Icon name="Clock" size={12} style={{ color: "var(--neon-purple)" }} />
                    НЕДАВНИЕ САЙТЫ
                  </h2>
                  <div className="space-y-1.5">
                    {MOCK_HISTORY.slice(0, 4).map((item, i) => (
                      <button key={item.id}
                        onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                        className="glass-card px-4 py-2.5 flex items-center gap-3 w-full text-left animate-fade-in"
                        style={{ animationDelay: `${i * 0.06}s` }}>
                        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                          style={{ background: "rgba(0,212,255,0.06)", border: "1px solid var(--glass-border)" }}>
                          <Icon name={item.favicon} size={12} style={{ color: "var(--neon-cyan)" }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-rajdhani font-semibold text-sm truncate">{item.title}</p>
                          <p className="font-mono text-xs text-muted-foreground truncate">{item.url}</p>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">{item.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== EXTENSIONS ========== */}
            {activeTab === "extensions" && (
              <div className="space-y-6">
                <div>
                  <h1 className="font-orbitron font-bold text-xl tracking-wider" style={{ color: "var(--neon-cyan)" }}>РАСШИРЕНИЯ</h1>
                  <p className="font-rajdhani text-muted-foreground text-sm mt-0.5">VLESS ключи и прокси-серверы</p>
                </div>

                {/* VLESS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-green)" }}>
                      <Icon name="Key" size={13} />
                      VLESS КЛЮЧИ
                      <span className="cyber-badge" style={{ background: "rgba(0,255,136,0.15)", color: "var(--neon-green)", border: "1px solid var(--neon-green)" }}>
                        {vlessKeys.length}
                      </span>
                    </h2>
                    <button onClick={() => setAddingVless(!addingVless)}
                      className="btn-neon text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5">
                      <span><Icon name={addingVless ? "X" : "Plus"} size={12} /></span>
                      <span>{addingVless ? "Отмена" : "Добавить"}</span>
                    </button>
                  </div>

                  {addingVless && (
                    <div className="glass-card p-4 space-y-3 animate-scale-in neon-border-cyan">
                      <p className="font-orbitron text-xs tracking-wider" style={{ color: "var(--neon-cyan)" }}>НОВЫЙ VLESS КЛЮЧ</p>
                      <input placeholder="Название (например: Server RU-01)" value={newVless.name}
                        onChange={e => setNewVless(p => ({ ...p, name: e.target.value }))}
                        className="cyber-input" />
                      <textarea placeholder="vless://uuid@host:443?encryption=none&security=tls&type=ws#name"
                        value={newVless.key}
                        onChange={e => setNewVless(p => ({ ...p, key: e.target.value }))}
                        className="cyber-input resize-none h-20 font-mono text-xs leading-relaxed" />
                      <button onClick={addVless} className="btn-neon w-full py-2 rounded-md text-xs"><span>ДОБАВИТЬ КЛЮЧ</span></button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {vlessKeys.map((vless, i) => (
                      <div key={vless.id} className="glass-card p-4 animate-fade-in"
                        style={{ animationDelay: `${i * 0.07}s`, borderColor: vless.active ? "var(--neon-green)" : undefined, boxShadow: vless.active ? "0 0 15px rgba(0,255,136,0.15)" : undefined }}>
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: vless.active ? "rgba(0,255,136,0.12)" : "rgba(0,212,255,0.06)", border: `1px solid ${vless.active ? "var(--neon-green)" : "var(--glass-border)"}` }}>
                            <Icon name="Wifi" size={15} style={{ color: vless.active ? "var(--neon-green)" : "var(--neon-cyan)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-rajdhani font-bold text-sm">{vless.name}</span>
                              {vless.active && <span className="cyber-badge text-black" style={{ background: "var(--neon-green)" }}>АКТИВЕН</span>}
                              {vless.ping && (
                                <span className="font-mono text-xs" style={{ color: vless.ping < 60 ? "var(--neon-green)" : "var(--neon-yellow)" }}>
                                  {vless.ping}ms
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground truncate">{vless.key.slice(0, 55)}...</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => toggleVless(vless.id)}
                              className={`btn-neon text-xs py-1 px-2.5 rounded ${vless.active ? "btn-neon-purple" : ""}`}>
                              <span>{vless.active ? "ОТКЛ" : "ВКЛ"}</span>
                            </button>
                            <button onClick={() => deleteVless(vless.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                              style={{ border: "1px solid var(--glass-border)", color: "hsl(var(--muted-foreground))" }}>
                              <Icon name="Trash2" size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: "1px", background: "var(--glass-border)" }} />

                {/* PROXY */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-purple)" }}>
                      <Icon name="Globe" size={13} />
                      ПРОКСИ-СЕРВЕРЫ
                      <span className="cyber-badge" style={{ background: "rgba(168,85,247,0.15)", color: "var(--neon-purple)", border: "1px solid var(--neon-purple)" }}>
                        {proxies.length}
                      </span>
                    </h2>
                    <button onClick={() => setAddingProxy(!addingProxy)}
                      className="btn-neon btn-neon-purple text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5">
                      <span><Icon name={addingProxy ? "X" : "Plus"} size={12} /></span>
                      <span>{addingProxy ? "Отмена" : "Добавить"}</span>
                    </button>
                  </div>

                  {addingProxy && (
                    <div className="glass-card p-4 space-y-3 animate-scale-in neon-border-purple">
                      <p className="font-orbitron text-xs tracking-wider" style={{ color: "var(--neon-purple)" }}>НОВЫЙ ПРОКСИ</p>
                      <input placeholder="Название" value={newProxy.name}
                        onChange={e => setNewProxy(p => ({ ...p, name: e.target.value }))} className="cyber-input" />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Хост / IP" value={newProxy.host}
                          onChange={e => setNewProxy(p => ({ ...p, host: e.target.value }))} className="cyber-input" />
                        <input placeholder="Порт" value={newProxy.port}
                          onChange={e => setNewProxy(p => ({ ...p, port: e.target.value }))} className="cyber-input" />
                      </div>
                      <select value={newProxy.type}
                        onChange={e => setNewProxy(p => ({ ...p, type: e.target.value as ProxyEntry["type"] }))}
                        className="cyber-input"
                        style={{ background: "var(--glass-bg)", color: "hsl(var(--foreground))" }}>
                        <option value="SOCKS5">SOCKS5</option>
                        <option value="SOCKS4">SOCKS4</option>
                        <option value="HTTP">HTTP</option>
                      </select>
                      <button onClick={addProxy} className="btn-neon btn-neon-purple w-full py-2 rounded-md text-xs"><span>ДОБАВИТЬ ПРОКСИ</span></button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {proxies.map((proxy, i) => (
                      <div key={proxy.id} className="glass-card p-4 animate-fade-in"
                        style={{ animationDelay: `${i * 0.07}s`, borderColor: proxy.active ? "var(--neon-purple)" : undefined, boxShadow: proxy.active ? "0 0 15px rgba(168,85,247,0.15)" : undefined }}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: proxy.active ? "rgba(168,85,247,0.12)" : "rgba(168,85,247,0.06)", border: `1px solid ${proxy.active ? "var(--neon-purple)" : "var(--glass-border)"}` }}>
                            <Icon name="Server" size={15} style={{ color: "var(--neon-purple)" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="font-rajdhani font-bold text-sm">{proxy.name}</span>
                              <span className="cyber-badge" style={{ background: "rgba(168,85,247,0.15)", color: "var(--neon-purple)", border: "1px solid rgba(168,85,247,0.3)" }}>{proxy.type}</span>
                              {proxy.active && <span className="cyber-badge" style={{ background: "rgba(0,255,136,0.15)", color: "var(--neon-green)", border: "1px solid var(--neon-green)" }}>ВКЛ</span>}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground">{proxy.host}:{proxy.port}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => toggleProxy(proxy.id)} className="btn-neon btn-neon-purple text-xs py-1 px-2.5 rounded">
                              <span>{proxy.active ? "ОТКЛ" : "ВКЛ"}</span>
                            </button>
                            <button onClick={() => deleteProxy(proxy.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center hover:opacity-70 transition-opacity"
                              style={{ border: "1px solid var(--glass-border)", color: "hsl(var(--muted-foreground))" }}>
                              <Icon name="Trash2" size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== HISTORY ========== */}
            {activeTab === "history" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h1 className="font-orbitron font-bold text-xl tracking-wider" style={{ color: "var(--neon-purple)" }}>ИСТОРИЯ</h1>
                  <button className="btn-neon text-xs py-1.5 px-3 rounded-md flex items-center gap-1.5">
                    <span><Icon name="Trash2" size={12} /></span>
                    <span>ОЧИСТИТЬ</span>
                  </button>
                </div>

                <div className="relative">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input placeholder="Поиск в истории..." value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)} className="cyber-input pl-9" />
                </div>

                <div className="space-y-1.5">
                  {filteredHistory.map((item, i) => (
                    <button key={item.id}
                      onClick={() => window.open(item.url, "_blank", "noopener,noreferrer")}
                      className="glass-card px-4 py-3 flex items-center gap-3 w-full text-left animate-fade-in group cursor-pointer"
                      style={{ animationDelay: `${i * 0.05}s` }}>
                      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,212,255,0.06)", border: "1px solid var(--glass-border)" }}>
                        <Icon name={item.favicon} size={13} style={{ color: "var(--neon-cyan)" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani font-semibold text-sm truncate">{item.title}</p>
                        <p className="font-mono text-xs text-muted-foreground truncate">{item.url}</p>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{item.time}</span>
                    </button>
                  ))}
                  {filteredHistory.length === 0 && (
                    <div className="text-center py-8">
                      <Icon name="SearchX" size={32} className="mx-auto mb-2 text-muted-foreground" />
                      <p className="font-rajdhani text-muted-foreground">Ничего не найдено</p>
                    </div>
                  )}
                </div>

                <div>
                  <h2 className="font-orbitron text-xs tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                    <Icon name="Bookmark" size={12} style={{ color: "var(--neon-yellow)" }} />
                    ЗАКЛАДКИ
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {QUICK_LINKS.map((link, i) => (
                      <button key={link.id}
                        onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                        className="glass-card px-3 py-2.5 flex items-center gap-2.5 cursor-pointer animate-fade-in w-full text-left"
                        style={{ animationDelay: `${i * 0.05}s` }}>
                        <Icon name={link.icon} size={13} style={{ color: "var(--neon-cyan)" }} />
                        <span className="font-rajdhani font-semibold text-sm truncate">{link.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== SECURITY ========== */}
            {activeTab === "security" && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-orbitron font-bold text-xl tracking-wider" style={{ color: "var(--neon-green)" }}>БЕЗОПАСНОСТЬ</h1>
                  <p className="font-rajdhani text-muted-foreground text-sm mt-0.5">Защита и приватность</p>
                </div>

                <div className="glass-card p-5 neon-border-cyan">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 animate-float shrink-0">
                      <div className="absolute inset-0 rounded-full animate-spin-slow"
                        style={{ border: "2px solid var(--neon-cyan)", borderTopColor: "transparent", opacity: 0.4 }} />
                      <div className="absolute inset-2 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,212,255,0.08)" }}>
                        <Icon name="ShieldCheck" size={22} style={{ color: "var(--neon-green)" }} />
                      </div>
                    </div>
                    <div>
                      <p className="font-orbitron font-black text-3xl" style={{ color: "var(--neon-green)" }}>
                        {[adBlock, tracking, httpsForce].filter(Boolean).length * 29}
                      </p>
                      <p className="font-rajdhani text-muted-foreground text-sm">Индекс защиты / 87</p>
                      <div className="mt-1.5 h-1.5 rounded-full w-40 overflow-hidden" style={{ background: "rgba(0,255,136,0.1)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${([adBlock, tracking, httpsForce].filter(Boolean).length / 3) * 100}%`, background: "var(--neon-green)", boxShadow: "0 0 8px var(--neon-green)" }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Блокировка рекламы", desc: "Блокировка трекеров и баннеров", state: adBlock, set: setAdBlock, color: "var(--neon-green)", icon: "ShieldOff" },
                    { label: "Защита от слежки", desc: "Запрет сторонних cookie и fingerprint", state: tracking, set: setTracking, color: "var(--neon-cyan)", icon: "Eye" },
                    { label: "Принудительный HTTPS", desc: "Перенаправление на защищённые сайты", state: httpsForce, set: setHttpsForce, color: "var(--neon-purple)", icon: "Lock" },
                  ].map((item, i) => (
                    <div key={i} className="glass-card px-4 py-3 flex items-center gap-3 animate-fade-in"
                      style={{ animationDelay: `${i * 0.07}s` }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${item.color}14`, border: `1px solid ${item.color}40` }}>
                        <Icon name={item.icon} size={14} style={{ color: item.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani font-semibold text-sm">{item.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <button onClick={() => item.set(!item.state)}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: item.state ? item.color : "rgba(100,100,120,0.3)", boxShadow: item.state ? `0 0 10px ${item.color}60` : "none" }}>
                        <div className="absolute w-4 h-4 rounded-full top-1 transition-all"
                          style={{ background: "#fff", left: item.state ? "calc(100% - 20px)" : "4px" }} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-cyan)" }}>
                    <Icon name="Globe" size={12} />
                    DNS-СЕРВЕР
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {["1.1.1.1", "8.8.8.8", "9.9.9.9"].map(d => (
                      <button key={d} onClick={() => setDns(d)}
                        className="py-2 rounded-lg font-mono text-xs transition-all"
                        style={{
                          border: `1px solid ${dns === d ? "var(--neon-cyan)" : "var(--glass-border)"}`,
                          background: dns === d ? "rgba(0,212,255,0.1)" : "var(--glass-bg)",
                          color: dns === d ? "var(--neon-cyan)" : "hsl(var(--foreground))",
                          boxShadow: dns === d ? "0 0 10px rgba(0,212,255,0.2)" : "none"
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ========== SETTINGS ========== */}
            {activeTab === "settings" && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-orbitron font-bold text-xl tracking-wider" style={{ color: "var(--neon-yellow)" }}>НАСТРОЙКИ</h1>
                  <p className="font-rajdhani text-muted-foreground text-sm mt-0.5">Браузер и оптимизация</p>
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-yellow)" }}>
                    <Icon name="Palette" size={12} />
                    ТЕМА ИНТЕРФЕЙСА
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(["dark", "light"] as const).map(t => (
                      <button key={t} onClick={() => setTheme(t)}
                        className="p-4 rounded-xl flex flex-col items-center gap-2 transition-all"
                        style={{
                          border: `1px solid ${theme === t ? "var(--neon-yellow)" : "var(--glass-border)"}`,
                          background: theme === t ? "rgba(255,204,0,0.08)" : "var(--glass-bg)",
                          boxShadow: theme === t ? "0 0 15px rgba(255,204,0,0.2)" : "none"
                        }}>
                        <Icon name={t === "dark" ? "Moon" : "Sun"} size={20}
                          style={{ color: t === "dark" ? "var(--neon-purple)" : "var(--neon-yellow)" }} />
                        <span className="font-rajdhani font-semibold text-sm">{t === "dark" ? "Тёмная" : "Светлая"}</span>
                        {theme === t && (
                          <span className="cyber-badge" style={{ background: "rgba(255,204,0,0.2)", color: "var(--neon-yellow)", border: "1px solid var(--neon-yellow)" }}>АКТИВНА</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-cyan)" }}>
                    <Icon name="Zap" size={12} />
                    ПРОИЗВОДИТЕЛЬНОСТЬ
                  </h2>
                  {[
                    { label: "Оптимизация памяти", desc: "Авто-очистка неактивных вкладок", state: optimization, set: setOptimization, color: "var(--neon-cyan)" },
                    { label: "GPU-ускорение", desc: "Аппаратная графика для анимаций", state: acceleration, set: setAcceleration, color: "var(--neon-yellow)" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-1">
                      <div className="flex-1">
                        <p className="font-rajdhani font-semibold text-sm">{item.label}</p>
                        <p className="font-mono text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                      <button onClick={() => item.set(!item.state)}
                        className="w-11 h-6 rounded-full relative transition-all shrink-0"
                        style={{ background: item.state ? item.color : "rgba(100,100,120,0.3)", boxShadow: item.state ? `0 0 10px ${item.color}60` : "none" }}>
                        <div className="absolute w-4 h-4 rounded-full top-1 transition-all"
                          style={{ background: "#fff", left: item.state ? "calc(100% - 20px)" : "4px" }} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-purple)" }}>
                    <Icon name="Sparkles" size={12} />
                    НЕОНОВЫЙ АКЦЕНТ
                  </h2>
                  <div className="flex gap-3 flex-wrap">
                    {[
                      { name: "Cyan", color: "#00d4ff" },
                      { name: "Purple", color: "#a855f7" },
                      { name: "Green", color: "#00ff88" },
                      { name: "Pink", color: "#ff0080" },
                      { name: "Yellow", color: "#ffcc00" },
                    ].map(c => (
                      <button key={c.name} title={c.name}
                        className="w-9 h-9 rounded-full transition-all hover:scale-110 border-2 border-transparent hover:border-white"
                        style={{ background: c.color, boxShadow: `0 0 12px ${c.color}80` }} />
                    ))}
                  </div>
                </div>

                <div className="glass-card p-4 space-y-2">
                  <h2 className="font-orbitron text-xs tracking-widest text-muted-foreground flex items-center gap-2">
                    <Icon name="Info" size={12} />
                    О БРАУЗЕРЕ
                  </h2>
                  {[["Версия", "HakWeb 2.6.1"], ["Движок", "Chromium 124"], ["Сборка", "2026-03-18"], ["Платформа", "Web SPA"]].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: "1px solid var(--glass-border)" }}>
                      <span className="font-mono text-xs text-muted-foreground">{k}</span>
                      <span className="font-mono text-xs" style={{ color: "var(--neon-cyan)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========== PROFILE ========== */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                <div>
                  <h1 className="font-orbitron font-bold text-xl tracking-wider" style={{ color: "var(--neon-pink)" }}>ПРОФИЛЬ</h1>
                  <p className="font-rajdhani text-muted-foreground text-sm mt-0.5">Аккаунт и синхронизация</p>
                </div>

                <div className="glass-card p-5 flex items-center gap-5 neon-border-cyan">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "rgba(0,212,255,0.1)", border: "2px solid var(--neon-cyan)", boxShadow: "0 0 20px rgba(0,212,255,0.3)" }}>
                      <span className="font-orbitron font-black text-2xl" style={{ color: "var(--neon-cyan)" }}>
                        {profileName[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background"
                      style={{ background: "var(--neon-green)", boxShadow: "0 0 6px var(--neon-green)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-orbitron font-bold text-lg truncate" style={{ color: "var(--neon-cyan)" }}>{profileName}</p>
                    <p className="font-mono text-sm text-muted-foreground truncate">{profileEmail}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="cyber-badge" style={{ background: "rgba(0,255,136,0.15)", color: "var(--neon-green)", border: "1px solid var(--neon-green)" }}>PRO</span>
                      <span className="cyber-badge" style={{ background: "rgba(168,85,247,0.15)", color: "var(--neon-purple)", border: "1px solid var(--neon-purple)" }}>VERIFIED</span>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-pink)" }}>
                    <Icon name="Edit3" size={12} />
                    РЕДАКТИРОВАТЬ
                  </h2>
                  <div>
                    <label className="font-mono text-xs text-muted-foreground mb-1 block">ИМЯ ПОЛЬЗОВАТЕЛЯ</label>
                    <input value={profileName} onChange={e => setProfileName(e.target.value)} className="cyber-input" />
                  </div>
                  <div>
                    <label className="font-mono text-xs text-muted-foreground mb-1 block">EMAIL</label>
                    <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="cyber-input" />
                  </div>
                  <button className="btn-neon w-full py-2 rounded-md text-xs mt-1"><span>СОХРАНИТЬ</span></button>
                </div>

                <div className="glass-card p-4 space-y-3">
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-cyan)" }}>
                    <Icon name="RefreshCw" size={12} />
                    СИНХРОНИЗАЦИЯ
                  </h2>
                  {["Закладки", "История", "Расширения (VLESS / Proxy)", "Настройки"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5"
                      style={{ borderBottom: i < 3 ? "1px solid var(--glass-border)" : "none" }}>
                      <span className="font-rajdhani font-semibold text-sm">{item}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--neon-green)", boxShadow: "0 0 5px var(--neon-green)" }} />
                        <span className="font-mono text-xs" style={{ color: "var(--neon-green)" }}>SYNC</span>
                      </div>
                    </div>
                  ))}
                  <button className="btn-neon w-full py-2 rounded-md text-xs"><span>СИНХРОНИЗИРОВАТЬ СЕЙЧАС</span></button>
                </div>

                <div className="glass-card p-4 space-y-2" style={{ borderColor: "rgba(255,0,128,0.2)" }}>
                  <h2 className="font-orbitron text-xs tracking-widest flex items-center gap-2" style={{ color: "var(--neon-pink)" }}>
                    <Icon name="AlertTriangle" size={12} />
                    ОПАСНАЯ ЗОНА
                  </h2>
                  <button className="btn-neon w-full py-2 rounded-md text-xs"
                    style={{ borderColor: "var(--neon-pink)", color: "var(--neon-pink)" }}>
                    <span>ВЫЙТИ ИЗ АККАУНТА</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>

      {/* ===== BOTTOM STATUS BAR ===== */}
      <footer className="glass px-4 py-1.5 flex items-center gap-4 text-xs flex-wrap"
        style={{ borderTop: "1px solid var(--glass-border)" }}>
        <span className="font-mono flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: "var(--neon-green)" }} />
          <span style={{ color: "var(--neon-green)" }}>ЗАЩИЩЕНО</span>
        </span>
        {activeVless && (
          <span className="font-mono" style={{ color: "var(--neon-green)" }}>VPN: {activeVless.name} · {activeVless.ping}ms</span>
        )}
        {activeProxy && (
          <span className="font-mono" style={{ color: "var(--neon-purple)" }}>PROXY: {activeProxy.name}</span>
        )}
        <span className="ml-auto font-mono text-muted-foreground flex items-center gap-3">
          <a href="https://t.me/internetcomunity" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 transition-opacity hover:opacity-80"
            style={{ color: "var(--neon-cyan)" }}>
            <Icon name="MessageCircle" size={11} />
            @internetcomunity
          </a>
          <span>HakWeb v2.6.1 · <span style={{ color: "var(--neon-cyan)" }}>{new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span></span>
        </span>
      </footer>
    </div>
  );
}
