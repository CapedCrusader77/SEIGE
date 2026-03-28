export const NODE_LABELS = {
  router: "Router",
  firewall: "Firewall",
  webserver: "Web Server",
  database: "Database",
  admin: "Admin Panel",
};

export const ATTACK_STYLES = {
  "port-scan": {
    label: "Port Reconnaissance",
    tone: "green",
    icon: "scan",
    flash: "rgba(60, 255, 163, 0.4)",
    summary: "Enumerate exposed ports and map the perimeter.",
  },
  "brute-force": {
    label: "Brute Force Auth",
    tone: "amber",
    icon: "key",
    flash: "rgba(255, 166, 43, 0.42)",
    summary: "Hammer credential surfaces with a rotating key cycle.",
  },
  "sql-injection": {
    label: "SQL Micro Injection",
    tone: "violet",
    icon: "database",
    flash: "rgba(185, 96, 255, 0.42)",
    summary: "Inject payload chains and probe data exfil routes.",
  },
  ddos: {
    label: "DDoS Flood Wave",
    tone: "red",
    icon: "burst",
    flash: "rgba(255, 87, 87, 0.4)",
    summary: "Overwhelm the edge with sustained traffic surges.",
  },
};

export const PANEL_TRANSITION = { ease: [0.22, 1, 0.36, 1], duration: 0.9 };

export const ZERO_DAY_LOGS = [
  { tag: "ZERO", text: "EXPLOITING ROUTER...", result: "COMPROMISED", type: "danger" },
  { tag: "ZERO", text: "EXPLOITING FIREWALL...", result: "BYPASSED", type: "danger" },
  { tag: "ZERO", text: "EXPLOITING WEB SERVER...", result: "COMPROMISED", type: "danger" },
  { tag: "ZERO", text: "EXPLOITING DATABASE...", result: "COMPROMISED", type: "danger" },
  { tag: "ZERO", text: "EXPLOITING ADMIN PANEL...", result: "COMPROMISED", type: "danger" },
  { tag: "ZERO", text: "EXFILTRATING DATA...", result: "847 RECORDS STOLEN", type: "warning" },
  { tag: "ZERO", text: "DEPLOYING BACKDOOR...", result: "INSTALLED", type: "danger" },
  { tag: "ZERO", text: "COVERING TRACKS...", result: "LOGS CLEARED", type: "warning" },
  { tag: "ZERO", text: "ESTABLISHING PERSISTENCE...", result: "COMPLETE", type: "danger" },
  { tag: "ZERO", text: "ALL SYSTEMS COMPROMISED...", result: "SIEGE COMPLETE", type: "danger" },
];

export const ZERO_DAY_DEFAULT_STATS = {
  nodes_compromised: 5,
  credentials_stolen: 847,
  firewall_rules_bypassed: 12,
  detection_evasions: 9,
};
