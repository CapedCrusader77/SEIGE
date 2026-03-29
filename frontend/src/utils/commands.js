/*
  commands.js — Complete command registry for Siege REPL
  
  Every penetration testing command with realistic output and integration
  with the Siege simulation backend. Commands are organized into categories:
  
  - RECONNAISSANCE: nmap, ping, whois, traceroute
  - ATTACK: hydra, sqlmap, hping3, exploit
  - DEFENSE: ufw, ids, iptables
  - SYSTEM: help, clear, status, history, exit, whoami
  - EASTER EGGS: cat, sudo
  
  Each command has:
  - name: Command identifier
  - aliases: Alternative names
  - description: What the command does
  - usage: How to use it
  - examples: Usage examples
  - handler: Async function that executes the command
  
  Handler context provides:
  - store: Zustand store for reading/writing state
  - apiCall: Function to make API requests
  - outputLine: Function to add output lines
  - getState: Function to read current simulation state
*/

import { API_BASE_URL } from '../config';
import {
  getNodeById,
  getAllNodeIds,
  getNodeIp,
  getOpenPorts,
  getServiceInfo,
  getNetworkPath,
  getPingLatency,
  getNodeStatus,
  getNodeName,
} from './replNodeData';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND REGISTRY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const COMMANDS = {};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RECONNAISSANCE COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMANDS.nmap = {
  name: 'nmap',
  category: 'reconnaissance',
  description: 'Network port scanner and service detection',
  usage: 'nmap [flags] [target]',
  examples: [
    'nmap router',
    'nmap -sV webserver',
    'nmap -p 80,443 database',
    'nmap -A firewall',
    'nmap --all',
  ],
  handler: async (parsed, context) => {
    const { outputLine, apiCall, getState, delay } = context;
    const { flags, args } = parsed;

    // Check if --all flag is present
    const scanAll = flags.includes('--all');
    
    // Get target
    let targets = [];
    if (scanAll) {
      targets = getAllNodeIds();
    } else {
      const target = args[args.length - 1];
      if (!target) {
        outputLine('nmap: missing target', 'error');
        outputLine('Usage: nmap [flags] [target]', 'info');
        outputLine('Targets: router, firewall, webserver, database, admin', 'info');
        return;
      }
      
      const node = getNodeById(target);
      if (!node) {
        outputLine(`nmap: unknown target "${target}"`, 'error');
        outputLine('Valid targets: router, firewall, webserver, database, admin', 'info');
        return;
      }
      
      targets = [target];
    }

    // Check for existing attack
    const state = getState();
    if (state.isScanning) {
      outputLine('Error: Another attack is in progress. Wait for completion.', 'error');
      return;
    }

    // Scan each target
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const node = getNodeById(target);
      const ip = getNodeIp(target);
      const ports = getOpenPorts(target);
      const hasVersionDetection = flags.includes('-sV') || flags.includes('-A');
      const isAggressive = flags.includes('-A');

      // Starting message
      outputLine(`Starting Nmap 7.94 scan on ${node.name} (${ip})...`, 'info');
      await delay(800);

      // Trigger backend port-scan attack
      try {
        await apiCall('POST', '/attack/port-scan', { target });
      } catch (err) {
        outputLine(`Error: ${err.message}`, 'error');
        continue;
      }

      await delay(400);
      outputLine('', 'info');
      outputLine('PORT     STATE  SERVICE   VERSION', 'success');
      outputLine('────────────────────────────────────────────────', 'separator');

      // Show each port with delay for realism
      for (const port of ports) {
        const service = getServiceInfo(target, port);
        let line = `${String(port).padEnd(8)} open   ${service.name.padEnd(9)}`;
        
        if (hasVersionDetection) {
          line += ` ${service.version}`;
        }
        
        outputLine(line, 'info');
        await delay(200); // Realistic port discovery delay
      }

      await delay(300);
      outputLine('', 'info');

      // Aggressive scan shows additional info
      if (isAggressive) {
        outputLine(`OS: ${node.os}`, 'info');
        outputLine(`Type: ${node.type}`, 'info');
        await delay(200);
        
        if (node.vulnerabilities && node.vulnerabilities.length > 0) {
          outputLine('', 'info');
          outputLine('VULNERABILITIES DETECTED:', 'warning');
          for (const vuln of node.vulnerabilities) {
            outputLine(`  ⚠ ${vuln}`, 'warning');
            await delay(150);
          }
        }
        await delay(300);
      }

      const scanTime = (Math.random() * 2 + 1).toFixed(2);
      outputLine(`Nmap done: 1 IP address scanned in ${scanTime}s`, 'success');

      // Add spacing between multiple scans
      if (i < targets.length - 1) {
        outputLine('', 'info');
        outputLine('═══════════════════════════════════════════════════', 'separator');
        outputLine('', 'info');
        await delay(500);
      }
    }
  },
};

COMMANDS.ping = {
  name: 'ping',
  category: 'reconnaissance',
  description: 'Send ICMP echo requests to test connectivity',
  usage: 'ping [flags] [target]',
  examples: [
    'ping router',
    'ping -c 10 webserver',
    'ping -f database',
  ],
  handler: async (parsed, context) => {
    const { outputLine, apiCall, getState, delay } = context;
    const { flags, args } = parsed;

    const target = args[args.length - 1];
    if (!target) {
      outputLine('ping: missing target', 'error');
      outputLine('Usage: ping [flags] [target]', 'info');
      return;
    }

    const node = getNodeById(target);
    if (!node) {
      outputLine(`ping: unknown target "${target}"`, 'error');
      return;
    }

    const ip = getNodeIp(target);
    const isFlood = flags.includes('-f') || flags.includes('--flood');
    const countFlag = flags.find(f => f === '-c');
    const countIndex = flags.indexOf(countFlag);
    const count = countIndex !== -1 && args[countIndex] ? parseInt(args[countIndex]) : 4;

    outputLine(`PING ${ip} (${node.name}): 56 data bytes`, 'info');
    await delay(300);

    if (isFlood) {
      // Flood ping triggers DDoS
      outputLine('hping in flood mode, no replies will be shown', 'warning');
      await delay(500);
      
      const state = getState();
      if (state.isScanning) {
        outputLine('Error: Another attack is in progress. Wait for completion.', 'error');
        return;
      }

      try {
        await apiCall('POST', '/attack/ddos', { target });
        outputLine('Sending packets... 10,482 packets transmitted', 'info');
        await delay(800);
        outputLine('Sending packets... 48,291 packets transmitted', 'info');
        await delay(800);
        outputLine(`[TARGET UNRESPONSIVE] ${node.name} is DOWN`, 'danger');
      } catch (err) {
        outputLine(`Error: ${err.message}`, 'error');
      }
    } else {
      // Normal ping
      for (let i = 0; i < count; i++) {
        const latency = getPingLatency(target).toFixed(3);
        outputLine(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${latency} ms`, 'success');
        await delay(1000);
      }

      await delay(300);
      outputLine('', 'info');
      outputLine(`--- ${node.name} ping statistics ---`, 'info');
      outputLine(`${count} packets transmitted, ${count} received, 0% packet loss`, 'success');
    }
  },
};

COMMANDS.whois = {
  name: 'whois',
  category: 'reconnaissance',
  description: 'Lookup node information and details',
  usage: 'whois [target]',
  examples: [
    'whois router',
    'whois database',
  ],
  handler: async (parsed, context) => {
    const { outputLine, getState, delay } = context;
    const { args } = parsed;

    const target = args[0];
    if (!target) {
      outputLine('whois: missing target', 'error');
      outputLine('Usage: whois [target]', 'info');
      return;
    }

    const node = getNodeById(target);
    if (!node) {
      outputLine(`whois: unknown target "${target}"`, 'error');
      return;
    }

    const state = getState();
    const status = getNodeStatus(
      target,
      state.compromisedNodeIds,
      state.crackedNodeId,
      state.injectedNodeId,
      state.crashedNodeId
    );

    outputLine('', 'info');
    outputLine(`Node: ${node.name}`, 'success');
    outputLine(`Type: ${node.type}`, 'info');
    outputLine(`IP: ${node.ip}`, 'info');
    outputLine(`OS: ${node.os}`, 'info');
    await delay(200);

    outputLine('', 'info');
    outputLine('Services:', 'success');
    const ports = getOpenPorts(target);
    for (const port of ports) {
      const service = getServiceInfo(target, port);
      outputLine(`  ${port}/tcp - ${service.name} (${service.version})`, 'info');
      await delay(100);
    }

    if (node.vulnerabilities && node.vulnerabilities.length > 0) {
      await delay(200);
      outputLine('', 'info');
      outputLine('Vulnerabilities:', 'warning');
      for (const vuln of node.vulnerabilities) {
        outputLine(`  ⚠ ${vuln}`, 'warning');
        await delay(100);
      }
    }

    await delay(200);
    outputLine('', 'info');
    outputLine(`Status: ${status}`, status.includes('COMPROMISED') || status.includes('OFFLINE') ? 'danger' : 'success');
  },
};

COMMANDS.traceroute = {
  name: 'traceroute',
  category: 'reconnaissance',
  description: 'Trace network path to target',
  usage: 'traceroute [target]',
  examples: [
    'traceroute database',
    'traceroute webserver',
  ],
  handler: async (parsed, context) => {
    const { outputLine, delay } = context;
    const { args } = parsed;

    const target = args[0];
    if (!target) {
      outputLine('traceroute: missing target', 'error');
      return;
    }

    const node = getNodeById(target);
    if (!node) {
      outputLine(`traceroute: unknown target "${target}"`, 'error');
      return;
    }

    const path = getNetworkPath(target);
    const ip = getNodeIp(target);

    outputLine(`traceroute to ${node.name} (${ip})`, 'info');
    await delay(400);

    let cumulativeLatency = 0;
    for (let i = 0; i < path.length; i++) {
      const hopId = path[i];
      const hopNode = getNodeById(hopId);
      const hopIp = getNodeIp(hopId);
      const hopLatency = getPingLatency(hopId);
      cumulativeLatency += hopLatency;
      
      outputLine(
        `${i + 1}  ${hopNode.name.padEnd(12)} (${hopIp})    ${cumulativeLatency.toFixed(3)}ms`,
        'info'
      );
      await delay(600);
    }

    await delay(300);
    outputLine('Trace complete.', 'success');
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ATTACK COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMANDS.hydra = {
  name: 'hydra',
  category: 'attack',
  description: 'Network authentication brute forcing tool',
  usage: 'hydra -l [user] -P [wordlist] [target]',
  examples: [
    'hydra -l admin -P rockyou.txt webserver',
    'hydra -l root -P passwords.txt admin',
  ],
  handler: async (parsed, context) => {
    const { outputLine, apiCall, getState, delay } = context;
    const { flags, args } = parsed;

    // Validate required flags
    const hasLogin = flags.includes('-l') || flags.includes('-L');
    const hasPasswordList = flags.includes('-P');

    if (!hasLogin || !hasPasswordList) {
      outputLine('hydra: missing required flags', 'error');
      outputLine('Usage: hydra -l [user] -P [wordlist] [target]', 'info');
      outputLine('Example: hydra -l admin -P rockyou.txt webserver', 'info');
      return;
    }

    const target = args[args.length - 1];
    if (!target) {
      outputLine('hydra: missing target', 'error');
      return;
    }

    const node = getNodeById(target);
    if (!node) {
      outputLine(`hydra: unknown target "${target}"`, 'error');
      return;
    }

    const state = getState();
    if (state.isScanning) {
      outputLine('Error: Another attack is in progress. Wait for completion.', 'error');
      return;
    }

    const loginFlag = flags.find(f => f === '-l' || f === '-L');
    const loginIndex = flags.indexOf(loginFlag);
    const username = args[loginIndex] || 'admin';

    const ip = getNodeIp(target);
    outputLine(`Hydra v9.4 starting attack on ${node.name} (${ip})`, 'info');
    outputLine('[DATA] attacking ssh://'+ip+':22/', 'info');
    await delay(800);

    try {
      await apiCall('POST', '/attack/brute-force', { target });

      // Show failed attempts
      const attempts = ['password123', 'admin', 'letmein', 'qwerty', 'root'];
      for (const pass of attempts) {
        outputLine(`[ATTEMPT] ${username}:${pass} → FAILED`, 'warning');
        await delay(300);
      }

      // Successful crack
      await delay(500);
      outputLine(`[ATTEMPT] ${username}:r00t@dmin → SUCCESS`, 'success');
      await delay(400);
      outputLine(`[22][ssh] host: ${ip}  login: ${username}  password: r00t@dmin`, 'success');
      await delay(300);
      outputLine('1 valid password found.', 'success');
    } catch (err) {
      outputLine(`Error: ${err.message}`, 'error');
    }
  },
};

COMMANDS.sqlmap = {
  name: 'sqlmap',
  category: 'attack',
  description: 'Automatic SQL injection and database takeover tool',
  usage: 'sqlmap -u [url] [flags]',
  examples: [
    'sqlmap -u "http://database/login" --dump',
    'sqlmap -u "http://database/search" --tables',
  ],
  handler: async (parsed, context) => {
    const { outputLine, apiCall, getState, delay } = context;
    const { flags, args } = parsed;

    const hasUrl = flags.includes('-u') || flags.includes('--url');
    if (!hasUrl) {
      outputLine('sqlmap: missing URL', 'error');
      outputLine('Usage: sqlmap -u [url] --dump', 'info');
      outputLine('Example: sqlmap -u "http://database/login" --dump', 'info');
      return;
    }

    // Extract target from URL if possible (simplified)
    const urlFlag = flags.find(f => f === '-u' || f === '--url');
    const urlIndex = flags.indexOf(urlFlag);
    const url = args[urlIndex] || args[0] || '';
    
    // Try to extract target from URL
    let target = 'database'; // default
    if (url.includes('webserver')) target = 'webserver';
    if (url.includes('admin')) target = 'admin';

    const node = getNodeById(target);
    if (!node) {
      outputLine('sqlmap: could not determine target from URL', 'error');
      return;
    }

    const state = getState();
    if (state.isScanning) {
      outputLine('Error: Another attack is in progress. Wait for completion.', 'error');
      return;
    }

    outputLine('sqlmap/1.7 — automatic SQL injection tool', 'info');
    outputLine(`[*] Target: ${url}`, 'info');
    await delay(600);
    
    outputLine('[*] Testing connection... OK', 'success');
    await delay(800);
    
    outputLine('[*] Testing GET parameter \'id\'', 'info');
    await delay(700);
    
    try {
      await apiCall('POST', '/attack/sql-injection', { target });
      
      outputLine('[CRITICAL] Parameter vulnerable to SQL injection', 'danger');
      await delay(500);
      outputLine('[*] Payload: \' OR \'1\'=\'1', 'warning');
      await delay(600);
      outputLine('[*] Dumping table: users', 'info');
      await delay(900);
      outputLine('[DATA] 847 records retrieved', 'success');
      await delay(400);
      outputLine('[*] Saved to: /tmp/sqlmap_output.csv', 'success');
    } catch (err) {
      outputLine(`Error: ${err.message}`, 'error');
    }
  },
};

COMMANDS.hping3 = {
  name: 'hping3',
  category: 'attack',
  description: 'Network packet crafting and DDoS tool',
  usage: 'hping3 --flood [target]',
  examples: [
    'hping3 --flood webserver',
    'hping3 -S --flood webserver',
  ],
  handler: async (parsed, context) => {
    const { outputLine, apiCall, getState, delay } = context;
    const { flags, args } = parsed;

    const hasFlood = flags.includes('--flood') || flags.includes('-f');
    if (!hasFlood) {
      outputLine('hping3: --flood flag required for DDoS simulation', 'error');
      outputLine('Usage: hping3 --flood [target]', 'info');
      return;
    }

    const target = args[args.length - 1];
    if (!target) {
      outputLine('hping3: missing target', 'error');
      return;
    }

    const node = getNodeById(target);
    if (!node) {
      outputLine(`hping3: unknown target "${target}"`, 'error');
      return;
    }

    const state = getState();
    if (state.isScanning) {
      outputLine('Error: Another attack is in progress. Wait for completion.', 'error');
      return;
    }

    const ip = getNodeIp(target);
    outputLine(`HPING ${node.name} (eth0 ${ip}): S set, 40 headers + 0 data bytes`, 'info');
    outputLine('hping in flood mode, no replies will be shown', 'warning');
    await delay(800);

    try {
      await apiCall('POST', '/attack/ddos', { target });
      
      outputLine('Sending packets... 10,482 packets transmitted', 'info');
      await delay(1200);
      outputLine('Sending packets... 48,291 packets transmitted', 'info');
      await delay(1200);
      outputLine('Sending packets... 127,849 packets transmitted', 'info');
      await delay(1000);
      outputLine(`[TARGET UNRESPONSIVE] ${node.name} is DOWN`, 'danger');
    } catch (err) {
      outputLine(`Error: ${err.message}`, 'error');
    }
  },
};

COMMANDS.exploit = {
  name: 'exploit',
  category: 'attack',
  description: 'Deploy classified zero-day exploits',
  usage: 'exploit --cve CVE-2024-SIEGE [target]',
  examples: [
    'exploit --cve CVE-2024-SIEGE network',
  ],
  handler: async (parsed, context) => {
    const { outputLine, getState, delay } = context;
    const { flags, args } = parsed;

    const hasCve = flags.includes('--cve');
    if (!hasCve) {
      outputLine('exploit: missing CVE identifier', 'error');
      outputLine('Usage: exploit --cve CVE-2024-SIEGE [target]', 'info');
      return;
    }

    const cveIndex = flags.indexOf('--cve');
    const cve = args[cveIndex] || '';

    if (cve !== 'CVE-2024-SIEGE') {
      outputLine(`exploit: unknown CVE "${cve}"`, 'error');
      outputLine('Available: CVE-2024-SIEGE', 'info');
      return;
    }

    const state = getState();
    if (!state.zeroDayUnlocked) {
      outputLine('exploit: CVE-2024-SIEGE payload not available', 'error');
      outputLine('Hint: Compromise all nodes first to unlock classified exploits', 'warning');
      return;
    }

    if (state.zeroDayActive) {
      outputLine('exploit: Zero Day attack already active', 'warning');
      return;
    }

    outputLine('[CLASSIFIED] Loading CVE-2024-SIEGE payload...', 'danger');
    await delay(1000);
    outputLine('[WARNING] This exploit bypasses all firewall rules', 'warning');
    await delay(800);
    outputLine('Executing...', 'danger');
    await delay(1200);
    outputLine('', 'info');
    outputLine('⚠ Zero Day sequence initiated through UI', 'danger');
    outputLine('All nodes will be systematically compromised', 'danger');
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEFENSE COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMANDS.ufw = {
  name: 'ufw',
  category: 'defense',
  description: 'Uncomplicated Firewall management',
  usage: 'ufw [enable|disable|status]',
  examples: [
    'ufw enable',
    'ufw disable',
    'ufw status',
  ],
  handler: async (parsed, context) => {
    const { outputLine, getState, store, delay } = context;
    const { args } = parsed;

    const action = args[0];
    if (!action) {
      outputLine('ufw: missing action', 'error');
      outputLine('Usage: ufw [enable|disable|status]', 'info');
      return;
    }

    const state = getState();

    switch (action.toLowerCase()) {
      case 'enable':
        if (state.firewallEnabled) {
          outputLine('Firewall is already active', 'warning');
        } else {
          store.setFirewallEnabled(true);
          outputLine('Firewall is active and enabled on system startup', 'success');
          await delay(300);
          store.addLog('FIREWALL', 'Firewall enabled via REPL', 'success');
        }
        break;

      case 'disable':
        if (!state.firewallEnabled) {
          outputLine('Firewall is already inactive', 'warning');
        } else {
          store.setFirewallEnabled(false);
          outputLine('Firewall stopped and disabled on system startup', 'warning');
          await delay(300);
          store.addLog('FIREWALL', 'Firewall disabled via REPL', 'warning');
        }
        break;

      case 'status':
        outputLine(`Status: ${state.firewallEnabled ? 'active' : 'inactive'}`, 
                   state.firewallEnabled ? 'success' : 'warning');
        
        if (state.firewallEnabled) {
          await delay(200);
          outputLine('', 'info');
          outputLine('To                Action  From', 'info');
          outputLine('──                ──────  ────', 'separator');
          outputLine('22/tcp            ALLOW   Anywhere', 'info');
          outputLine('80/tcp            ALLOW   Anywhere', 'info');
          outputLine('443/tcp           ALLOW   Anywhere', 'info');
          outputLine('3306/tcp          DENY    Outside', 'info');
        }
        break;

      default:
        outputLine(`ufw: unknown action "${action}"`, 'error');
        outputLine('Available: enable, disable, status', 'info');
    }
  },
};

COMMANDS.ids = {
  name: 'ids',
  category: 'defense',
  description: 'Intrusion Detection System management',
  usage: 'ids [enable|disable|status|alerts]',
  examples: [
    'ids enable',
    'ids disable',
    'ids status',
    'ids alerts',
  ],
  handler: async (parsed, context) => {
    const { outputLine, getState, store, delay } = context;
    const { args } = parsed;

    const action = args[0];
    if (!action) {
      outputLine('ids: missing action', 'error');
      outputLine('Usage: ids [enable|disable|status|alerts]', 'info');
      return;
    }

    const state = getState();

    switch (action.toLowerCase()) {
      case 'enable':
        if (state.idsEnabled) {
          outputLine('IDS is already active', 'warning');
        } else {
          store.setIdsEnabled(true);
          outputLine('Intrusion Detection System activated', 'success');
          outputLine('Monitoring all network traffic for anomalies', 'info');
          await delay(300);
          store.addLog('IDS', 'IDS enabled via REPL', 'success');
        }
        break;

      case 'disable':
        if (!state.idsEnabled) {
          outputLine('IDS is already inactive', 'warning');
        } else {
          store.setIdsEnabled(false);
          outputLine('Intrusion Detection System deactivated', 'warning');
          await delay(300);
          store.addLog('IDS', 'IDS disabled via REPL', 'warning');
        }
        break;

      case 'status':
        outputLine(`IDS Status: ${state.idsEnabled ? 'ACTIVE' : 'INACTIVE'}`,
                   state.idsEnabled ? 'success' : 'warning');
        
        if (state.idsEnabled) {
          await delay(200);
          outputLine('', 'info');
          outputLine('Detection Engines: ENABLED', 'success');
          outputLine('Signature Database: UP TO DATE', 'success');
          outputLine('Alert Threshold: MEDIUM', 'info');
          outputLine(`Active Alerts: ${state.idsAlerts?.length || 0}`, 'info');
        }
        break;

      case 'alerts': {
        const alerts = state.idsAlerts || [];
        if (alerts.length === 0) {
          outputLine('No active IDS alerts', 'info');
        } else {
          outputLine(`Active IDS Alerts (${alerts.length}):`, 'warning');
          outputLine('', 'info');
          alerts.forEach((alert, i) => {
            outputLine(`[${i + 1}] ${alert.message}`, 'warning');
            if (alert.detail) {
              outputLine(`    ${alert.detail}`, 'info');
            }
          });
        }
        break;
      }

      default:
        outputLine(`ids: unknown action "${action}"`, 'error');
        outputLine('Available: enable, disable, status, alerts', 'info');
    }
  },
};

COMMANDS.iptables = {
  name: 'iptables',
  category: 'defense',
  description: 'Display firewall rules',
  usage: 'iptables -L',
  examples: [
    'iptables -L',
  ],
  handler: async (parsed, context) => {
    const { outputLine, getState, delay } = context;
    
    const state = getState();
    
    outputLine('Chain INPUT (policy ACCEPT)', 'info');
    outputLine('target   prot  source         destination', 'info');
    outputLine('──────────────────────────────────────────', 'separator');
    await delay(200);
    
    if (state.firewallEnabled) {
      outputLine('ACCEPT   tcp   anywhere       anywhere       tcp dpt:ssh', 'success');
      outputLine('ACCEPT   tcp   anywhere       anywhere       tcp dpt:http', 'success');
      outputLine('ACCEPT   tcp   anywhere       anywhere       tcp dpt:https', 'success');
      outputLine('DROP     tcp   0.0.0.0/0      anywhere       tcp dpt:3306', 'warning');
      outputLine('DROP     all   anywhere       anywhere', 'warning');
    } else {
      outputLine('ACCEPT   all   anywhere       anywhere', 'info');
    }

    await delay(200);
    outputLine('', 'info');
    outputLine('Chain FORWARD (policy ACCEPT)', 'info');
    outputLine('Chain OUTPUT (policy ACCEPT)', 'info');
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SYSTEM COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMANDS.help = {
  name: 'help',
  category: 'system',
  description: 'Display available commands and usage',
  usage: 'help [command]',
  examples: [
    'help',
    'help nmap',
  ],
  handler: async (parsed, context) => {
    const { outputLine, delay } = context;
    const { args } = parsed;

    const commandName = args[0];

    if (commandName) {
      // Show help for specific command
      const cmd = COMMANDS[commandName.toLowerCase()];
      if (!cmd) {
        outputLine(`help: unknown command "${commandName}"`, 'error');
        outputLine('Type "help" to see all available commands', 'info');
        return;
      }

      outputLine('', 'info');
      outputLine(`${cmd.name.toUpperCase()} — ${cmd.description}`, 'success');
      outputLine('', 'info');
      outputLine('Usage:', 'info');
      outputLine(`  ${cmd.usage}`, 'info');
      outputLine('', 'info');
      
      if (cmd.examples && cmd.examples.length > 0) {
        outputLine('Examples:', 'info');
        for (const example of cmd.examples) {
          outputLine(`  ${example}`, 'info');
          await delay(100);
        }
      }
    } else {
      // Show all commands grouped by category
      outputLine('', 'info');
      outputLine('SIEGE TERMINAL v1.0 — Available Commands', 'success');
      outputLine('═══════════════════════════════════════════════════', 'separator');
      await delay(200);

      // Group commands by category
      const categories = {
        reconnaissance: [],
        attack: [],
        defense: [],
        system: [],
        other: [],
      };

      Object.values(COMMANDS).forEach(cmd => {
        const cat = cmd.category || 'other';
        if (categories[cat]) {
          categories[cat].push(cmd);
        }
      });

      outputLine('', 'info');
      outputLine('RECONNAISSANCE:', 'success');
      categories.reconnaissance.forEach(cmd => {
        outputLine(`  ${cmd.name.padEnd(15)} ${cmd.description}`, 'info');
      });

      await delay(200);
      outputLine('', 'info');
      outputLine('ATTACK:', 'danger');
      categories.attack.forEach(cmd => {
        outputLine(`  ${cmd.name.padEnd(15)} ${cmd.description}`, 'info');
      });

      await delay(200);
      outputLine('', 'info');
      outputLine('DEFENSE:', 'warning');
      categories.defense.forEach(cmd => {
        outputLine(`  ${cmd.name.padEnd(15)} ${cmd.description}`, 'info');
      });

      await delay(200);
      outputLine('', 'info');
      outputLine('SYSTEM:', 'info');
      categories.system.forEach(cmd => {
        outputLine(`  ${cmd.name.padEnd(15)} ${cmd.description}`, 'info');
      });

      await delay(300);
      outputLine('', 'info');
      outputLine('Type "help [command]" for detailed usage information', 'info');
    }
  },
};

COMMANDS.clear = {
  name: 'clear',
  category: 'system',
  description: 'Clear terminal output',
  usage: 'clear',
  examples: ['clear'],
  handler: async (parsed, context) => {
    // This will be handled specially in the REPL component
    context.clear();
  },
};

COMMANDS.status = {
  name: 'status',
  category: 'system',
  description: 'Display current network status',
  usage: 'status',
  examples: ['status'],
  handler: async (parsed, context) => {
    const { outputLine, getState, delay } = context;
    const state = getState();

    outputLine('', 'info');
    outputLine('┌─ NETWORK STATUS ──────────────────────────────────┐', 'info');
    await delay(200);
    
    outputLine(`│ Security Score: ${state.securityScore}%`.padEnd(53) + '│', 
               state.securityScore > 70 ? 'success' : state.securityScore > 40 ? 'warning' : 'danger');
    outputLine(`│ Firewall: ${state.firewallEnabled ? 'ENABLED' : 'DISABLED'}`.padEnd(53) + '│',
               state.firewallEnabled ? 'success' : 'warning');
    outputLine(`│ IDS: ${state.idsEnabled ? 'ENABLED' : 'DISABLED'}`.padEnd(53) + '│',
               state.idsEnabled ? 'success' : 'warning');
    
    await delay(200);
    outputLine('│'.padEnd(53) + '│', 'info');
    outputLine('│ NODE STATUS:'.padEnd(53) + '│', 'success');

    const allNodes = getAllNodeIds();
    for (const nodeId of allNodes) {
      const nodeName = getNodeName(nodeId);
      const status = getNodeStatus(
        nodeId,
        state.compromisedNodeIds,
        state.crackedNodeId,
        state.injectedNodeId,
        state.crashedNodeId
      );
      
      const icon = status === 'ONLINE' ? '●' : '✖';
      const color = status === 'ONLINE' ? 'success' : 'danger';
      
      outputLine(`│   ${nodeName.padEnd(12)} ${icon} ${status}`.padEnd(53) + '│', color);
      await delay(150);
    }

    outputLine('└───────────────────────────────────────────────────┘', 'info');
  },
};

COMMANDS.history = {
  name: 'history',
  category: 'system',
  description: 'Show command history',
  usage: 'history',
  examples: ['history'],
  handler: async (parsed, context) => {
    const { outputLine, getHistory, delay } = context;
    const history = getHistory();

    if (history.length === 0) {
      outputLine('No command history', 'info');
      return;
    }

    outputLine('', 'info');
    outputLine('Command History:', 'success');
    outputLine('', 'info');

    history.forEach((cmd, i) => {
      outputLine(`${String(i + 1).padStart(3)}  ${cmd}`, 'info');
    });

    await delay(200);
    outputLine('', 'info');
    outputLine(`Total: ${history.length} commands`, 'info');
  },
};

COMMANDS.exit = {
  name: 'exit',
  category: 'system',
  description: 'Close the REPL terminal',
  usage: 'exit',
  examples: ['exit'],
  handler: async (parsed, context) => {
    const { outputLine, onExit } = context;
    outputLine('Closing SIEGE REPL...', 'info');
    setTimeout(() => onExit(), 500);
  },
};

COMMANDS.whoami = {
  name: 'whoami',
  category: 'system',
  description: 'Display current user identity',
  usage: 'whoami',
  examples: ['whoami'],
  handler: async (parsed, context) => {
    const { outputLine, delay } = context;
    
    outputLine('', 'info');
    outputLine('siege-operator', 'success');
    await delay(200);
    outputLine('Role: Penetration Tester', 'info');
    outputLine('Clearance: CLASSIFIED', 'warning');
    
    const sessionTime = Math.floor((Date.now() - context.getState().sessionStartTime) / 1000);
    const minutes = Math.floor(sessionTime / 60);
    const seconds = sessionTime % 60;
    outputLine(`Session: ${minutes}m ${seconds}s`, 'info');
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EASTER EGG COMMANDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

COMMANDS.cat = {
  name: 'cat',
  category: 'other',
  description: 'Display file contents',
  usage: 'cat [file]',
  examples: ['cat /etc/passwd'],
  handler: async (parsed, context) => {
    const { args } = parsed;

    const file = args[0];
    if (!file) {
      context.outputLine('cat: missing file argument', 'error');
      return;
    }

    if (file === '/etc/passwd' || file === 'passwd') {
      context.outputLine('root:x:0:0:root:/root:/bin/bash', 'info');
      await context.delay(100);
      context.outputLine('siege:x:1000:1000:Siege Operator:/home/siege:/bin/bash', 'info');
      await context.delay(100);
      context.outputLine('defender:x:1001:1001:Blue Team:/home/defender:/bin/bash', 'info');
      await context.delay(100);
      context.outputLine('www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin', 'info');
      await context.delay(100);
      context.outputLine('mysql:x:111:116:MySQL Server:/nonexistent:/bin/false', 'info');
    } else {
      context.outputLine(`cat: ${file}: No such file or directory`, 'error');
    }
  },
};

COMMANDS.sudo = {
  name: 'sudo',
  category: 'other',
  description: 'Execute command with elevated privileges',
  usage: 'sudo [command]',
  examples: ['sudo rm -rf /'],
  handler: async (parsed, context) => {
    const { args } = parsed;

    const command = args.join(' ');

    if (command.includes('rm') && (command.includes('-rf') || command.includes('-fr'))) {
      if (command.includes('/') || command.includes('*')) {
        await context.delay(800);
        context.outputLine('Nice try. The simulation environment is protected.', 'warning');
        await context.delay(600);
        context.outputLine('Your attempt has been logged. 👀', 'info');
        
        // Log to the main terminal too for fun
        context.store.addLog('SUDO', 'Attempted rm -rf / — BLOCKED', 'warning');
        return;
      }
    }

    context.outputLine(`[sudo] password for siege-operator:`, 'warning');
    await context.delay(1000);
    context.outputLine('sudo: elevated privileges not available in simulation', 'error');
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMMAND LOOKUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Get command by name or alias
 */
export function getCommand(name) {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  return COMMANDS[normalized] || null;
}

/**
 * Get all command names
 */
export function getAllCommandNames() {
  return Object.keys(COMMANDS);
}

/**
 * Get all node names for autocomplete
 */
export function getAllTargetNames() {
  return getAllNodeIds();
}
