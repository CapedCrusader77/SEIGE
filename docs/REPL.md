# 🎯 Siege Interactive Terminal REPL

## Overview

The Siege REPL (Read-Eval-Print Loop) is a fully interactive command-line interface that brings authentic penetration testing commands to the Siege cybersecurity simulation platform.

## 🚀 Features

### Core Functionality
- **20+ Realistic Commands**: Real penetration testing commands with authentic output
- **Typewriter Animation**: Dramatic character-by-character output rendering
- **Command History**: Navigate through previous commands with up/down arrows
- **Tab Autocomplete**: Smart completion for commands and node targets
- **Persistent Storage**: Command history saved across sessions
- **Keyboard Shortcuts**: Full terminal-like keyboard control

### Command Categories

#### 🔍 RECONNAISSANCE
- `nmap` - Network port scanner with service detection
- `ping` - ICMP connectivity testing
- `whois` - Node information lookup
- `traceroute` - Network path tracing

#### ⚡ ATTACK
- `hydra` - Brute force authentication attacks
- `sqlmap` - SQL injection exploitation
- `hping3` - DDoS flood attacks
- `exploit` - Zero-day exploit deployment

#### 🛡️ DEFENSE
- `ufw` - Firewall management
- `ids` - Intrusion detection control
- `iptables` - Firewall rule inspection

#### 🖥️ SYSTEM
- `help` - Command documentation
- `clear` - Clear terminal output
- `status` - Network status overview
- `history` - Command history
- `exit` - Close REPL
- `whoami` - User identity

#### 🎮 EASTER EGGS
- `cat /etc/passwd` - Display system users
- `sudo rm -rf /` - Protected system attempt

## 🎮 Usage

### Opening the REPL

**Method 1: Backtick Key**
```
Press ` (backtick) anywhere in the application
```

**Method 2: TERMINAL Button**
```
Click the ">_ TERMINAL" button in the dashboard header
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Execute command |
| `↑` / `↓` | Navigate command history |
| `Tab` | Autocomplete command/target |
| `Ctrl+C` | Cancel running command |
| `Ctrl+L` | Clear screen |
| `Escape` | Close REPL |

### Example Commands

**Port Scanning**
```bash
nmap router                  # Basic scan
nmap -sV webserver          # Version detection
nmap -A database            # Aggressive scan
nmap --all                  # Scan all nodes
```

**Brute Force Attack**
```bash
hydra -l admin -P rockyou.txt webserver
hydra -l root -P passwords.txt admin
```

**SQL Injection**
```bash
sqlmap -u "http://database/login" --dump
sqlmap -u "http://database/search" --tables
```

**DDoS Attack**
```bash
hping3 --flood webserver
ping -f database
```

**Network Status**
```bash
status                      # Full network overview
whois database             # Node details
traceroute admin           # Network path
```

**Defense Management**
```bash
ufw enable                 # Enable firewall
ufw status                 # Check firewall status
ids enable                 # Enable IDS
ids alerts                 # View IDS alerts
iptables -L               # Show firewall rules
```

## 🏗️ Architecture

### File Structure
```
frontend/src/
├── components/
│   └── SiegeREPL.jsx           # Main REPL component
├── utils/
│   ├── commandParser.js        # Parse command strings
│   ├── commands.js             # Command registry
│   └── replNodeData.js         # Node information database
└── App.jsx                     # Integration point
```

### Component Flow
```
User Input → Parse Command → Find Handler → Execute → Animate Output
     ↓            ↓              ↓             ↓           ↓
  REPL.jsx   parser.js      commands.js    API/Store   Typewriter
```

### Command Handler Context

Each command receives a context object with:

```javascript
{
  store,           // Zustand store for state management
  apiCall,         // Function to make backend API calls
  outputLine,      // Function to add output lines
  delay,           // Promise-based delay function
  getState,        // Get current simulation state
  getHistory,      // Get command history
  clear,           // Clear terminal output
  onExit,          // Close REPL callback
  args,            // Parsed command arguments
}
```

## 🔗 Integration

### Backend API Endpoints

The REPL integrates with existing attack endpoints:

- `POST /attack/port-scan` - nmap command
- `POST /attack/brute-force` - hydra command
- `POST /attack/sql-injection` - sqlmap command
- `POST /attack/ddos` - hping3 command

### State Synchronization

The REPL reads and writes to the Zustand store:

**Reads:**
- `firewallEnabled` - Firewall status
- `idsEnabled` - IDS status
- `compromisedNodeIds` - Compromised nodes
- `securityScore` - Current security score
- `crackedNodeId`, `injectedNodeId`, `crashedNodeId` - Attack states

**Writes:**
- `addLog()` - Logs appear in both REPL and TerminalPanel
- `setFirewallEnabled()` - ufw command
- `setIdsEnabled()` - ids command
- Attack state updates via API calls

## 🎨 Styling

### Color Scheme
```css
Background:    #050810
Prompt:        #41ff9b (green)
Success:       #41ff9b (green)
Error:         #ff5b5b (red)
Warning:       #ffb141 (amber)
Info:          #55c7ff (blue)
Danger:        #ff5b5b (red, bold)
```

### Animations
- **Cursor Blink**: 0.9s steps animation
- **Output Typewriter**: 12ms per character (30ms for attacks)
- **Slide Animation**: 0.4s cubic-bezier easing
- **Status Pulse**: 2s ease-in-out

## 🔒 Security Features

- Prevents multiple simultaneous attacks
- Validates all command arguments
- Sanitizes user input
- Protected system commands (sudo blocks dangerous operations)
- Attack confirmation in UI before execution

## 📝 Command History

History is stored in localStorage under `siege-repl-history`:
- Maximum 50 commands saved
- Persists across browser sessions
- Duplicates are removed
- Navigate with up/down arrow keys

## 🎯 Autocomplete

Tab completion matches:
- All command names (nmap, hydra, etc.)
- All node targets (router, firewall, webserver, database, admin)
- Common flags and options

**Single Tab**: Complete if unique match
**Double Tab**: Show all matching options

## 🐛 Troubleshooting

### REPL won't open
- Check if backtick key is working
- Click TERMINAL button as alternative
- Check browser console for errors

### Commands don't execute
- Ensure backend server is running
- Check WebSocket connection status
- Verify API_BASE_URL in config.js

### Typewriter animation stuck
- Press Ctrl+C to cancel
- Refresh page if persists

### Command not found
- Type `help` to see all commands
- Check spelling and case (commands are case-insensitive)
- Use tab completion for suggestions

## 🚀 Future Enhancements

Potential additions:
- More penetration testing tools (metasploit, burp, etc.)
- Custom command aliases
- Command macros/scripts
- Export terminal session to file
- Multi-line command support
- Syntax highlighting
- Command suggestions based on context

## 📚 Resources

- **Nmap**: https://nmap.org/book/man.html
- **Hydra**: https://github.com/vanhauser-thc/thc-hydra
- **SQLMap**: https://sqlmap.org/
- **Hping**: http://www.hping.org/

---

**Built with**: React 19, Framer Motion, Zustand
**Author**: Siege Development Team
**Version**: 1.0
