/*
  replNodeData.js — Node information database for REPL commands
  
  Contains detailed information about each network node:
  - IP addresses
  - Services and versions
  - Operating systems
  - Vulnerabilities
  - Port mappings
  
  Used by REPL commands like:
  - whois: Show node details
  - traceroute: Show network path
  - nmap: Port scanning results
  - ping: ICMP responses
  
  Data structure matches the Siege network topology from NetworkMap.
*/

export const NODE_DATA = {
  router: {
    id: 'router',
    name: 'Router',
    ip: '192.168.1.1',
    type: 'Network Router',
    os: 'Cisco IOS 15.2',
    services: {
      22: { name: 'ssh', version: 'OpenSSH 7.4', state: 'open' },
      80: { name: 'http', version: 'Apache 2.2.34', state: 'open' },
      443: { name: 'https', version: 'Apache 2.2.34', state: 'open' },
      8080: { name: 'http-proxy', version: 'Squid 3.5', state: 'open' },
    },
    vulnerabilities: [
      'CVE-2023-1234 (Apache 2.2.34 Remote Code Execution)',
      'CVE-2022-9876 (OpenSSH 7.4 Authentication Bypass)',
    ],
    description: 'Primary gateway router handling all external traffic',
  },

  firewall: {
    id: 'firewall',
    name: 'Firewall',
    ip: '192.168.1.2',
    type: 'Network Firewall',
    os: 'pfSense 2.6.0 (FreeBSD 12.3)',
    services: {
      22: { name: 'ssh', version: 'OpenSSH 8.4p1', state: 'open' },
      443: { name: 'https', version: 'nginx 1.20.1', state: 'open' },
      8443: { name: 'https-alt', version: 'nginx 1.20.1', state: 'open' },
    },
    vulnerabilities: [
      'CVE-2023-4567 (pfSense XSS Vulnerability)',
    ],
    description: 'Next-generation firewall with deep packet inspection',
  },

  webserver: {
    id: 'webserver',
    name: 'Web Server',
    ip: '192.168.1.3',
    type: 'Apache Web Server',
    os: 'Ubuntu 20.04 LTS',
    services: {
      22: { name: 'ssh', version: 'OpenSSH 8.2p1', state: 'open' },
      80: { name: 'http', version: 'Apache 2.4.41', state: 'open' },
      443: { name: 'https', version: 'Apache 2.4.41', state: 'open' },
      3000: { name: 'http-alt', version: 'Node.js Express', state: 'open' },
    },
    vulnerabilities: [
      'CVE-2023-7890 (Apache 2.4.41 Path Traversal)',
      'CVE-2024-1111 (Express.js Prototype Pollution)',
    ],
    description: 'Public-facing web application server',
  },

  database: {
    id: 'database',
    name: 'Database',
    ip: '192.168.1.4',
    type: 'MySQL Database Server',
    os: 'Ubuntu 20.04 LTS',
    services: {
      22: { name: 'ssh', version: 'OpenSSH 8.2p1', state: 'open' },
      3306: { name: 'mysql', version: 'MySQL 5.6.51', state: 'open' },
      33060: { name: 'mysqlx', version: 'MySQL 5.6.51', state: 'open' },
    },
    vulnerabilities: [
      'CVE-2023-2222 (MySQL 5.6.51 SQL Injection)',
      'CVE-2021-3333 (MySQL 5.6.51 Privilege Escalation)',
    ],
    description: 'Primary database server containing sensitive user data',
  },

  admin: {
    id: 'admin',
    name: 'Admin Panel',
    ip: '192.168.1.5',
    type: 'Administrative Interface',
    os: 'Ubuntu 22.04 LTS',
    services: {
      22: { name: 'ssh', version: 'OpenSSH 9.0p1', state: 'open' },
      80: { name: 'http', version: 'nginx 1.22.0', state: 'open' },
      443: { name: 'https', version: 'nginx 1.22.0', state: 'open' },
      5000: { name: 'http-alt', version: 'Flask 2.2.0', state: 'open' },
    },
    vulnerabilities: [
      'CVE-2024-4444 (Flask 2.2.0 SSTI Vulnerability)',
      'CVE-2023-5555 (nginx 1.22.0 Buffer Overflow)',
      'WEAK-AUTH (Default admin:admin credentials)',
    ],
    description: 'Internal administration panel with elevated privileges',
  },
};

/**
 * Get node data by ID
 * @param {string} nodeId - Node identifier (router, firewall, etc.)
 * @returns {object|null} Node data or null if not found
 */
export function getNodeById(nodeId) {
  if (!nodeId) return null;
  const normalized = nodeId.toLowerCase().trim();
  return NODE_DATA[normalized] || null;
}

/**
 * Get all node IDs
 * @returns {string[]} Array of all node identifiers
 */
export function getAllNodeIds() {
  return Object.keys(NODE_DATA);
}

/**
 * Get node IP address
 * @param {string} nodeId - Node identifier
 * @returns {string|null} IP address or null
 */
export function getNodeIp(nodeId) {
  const node = getNodeById(nodeId);
  return node ? node.ip : null;
}

/**
 * Get all open ports for a node
 * @param {string} nodeId - Node identifier
 * @returns {number[]} Array of open port numbers
 */
export function getOpenPorts(nodeId) {
  const node = getNodeById(nodeId);
  if (!node || !node.services) return [];
  return Object.keys(node.services).map(Number);
}

/**
 * Get service information for a specific port
 * @param {string} nodeId - Node identifier
 * @param {number} port - Port number
 * @returns {object|null} Service info or null
 */
export function getServiceInfo(nodeId, port) {
  const node = getNodeById(nodeId);
  if (!node || !node.services) return null;
  return node.services[port] || null;
}

/**
 * Check if a node has a specific vulnerability
 * @param {string} nodeId - Node identifier
 * @param {string} cveId - CVE identifier
 * @returns {boolean} True if vulnerable
 */
export function hasVulnerability(nodeId, cveId) {
  const node = getNodeById(nodeId);
  if (!node || !node.vulnerabilities) return false;
  return node.vulnerabilities.some(v => v.includes(cveId));
}

/**
 * Get network path from router to target node
 * Used by traceroute command
 * @param {string} targetId - Target node identifier
 * @returns {string[]} Array of node IDs in path order
 */
export function getNetworkPath(targetId) {
  // Simple topology: router -> firewall -> target
  // (In real networks this would be more complex)
  
  const target = targetId.toLowerCase().trim();
  
  // Router is always first
  const path = ['router'];
  
  // All traffic goes through firewall
  if (target !== 'router') {
    path.push('firewall');
  }
  
  // Add target if not router or firewall
  if (target !== 'router' && target !== 'firewall') {
    if (NODE_DATA[target]) {
      path.push(target);
    }
  }
  
  return path;
}

/**
 * Get realistic ping latency for a node (in milliseconds)
 * @param {string} nodeId - Node identifier
 * @returns {number} Latency in ms
 */
export function getPingLatency(nodeId) {
  const baseLatencies = {
    router: 0.4,
    firewall: 0.9,
    webserver: 1.2,
    database: 1.5,
    admin: 1.8,
  };
  
  const base = baseLatencies[nodeId] || 2.0;
  // Add small random variation
  return base + (Math.random() * 0.3);
}

/**
 * Format node status based on compromise state
 * @param {string} nodeId - Node identifier
 * @param {Set} compromisedIds - Set of compromised node IDs
 * @param {string} crackedId - Cracked node ID
 * @param {string} injectedId - Injected node ID
 * @param {string} crashedId - Crashed node ID
 * @returns {string} Status string (ONLINE, COMPROMISED, CRACKED, etc.)
 */
export function getNodeStatus(nodeId, compromisedIds, crackedId, injectedId, crashedId) {
  if (crashedId === nodeId) return 'OFFLINE (DDoS)';
  if (crackedId === nodeId) return 'COMPROMISED (Brute Forced)';
  if (injectedId === nodeId) return 'COMPROMISED (SQL Injected)';
  if (compromisedIds && compromisedIds.has(nodeId)) return 'COMPROMISED';
  return 'ONLINE';
}

/**
 * Get friendly node name for display
 * @param {string} nodeId - Node identifier
 * @returns {string} Display name
 */
export function getNodeName(nodeId) {
  const node = getNodeById(nodeId);
  return node ? node.name : nodeId;
}
