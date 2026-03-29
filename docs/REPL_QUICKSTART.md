# 🚀 Quick Start Guide - Siege REPL

## Instant Usage

### 1. Open the REPL
Press **`** (backtick key) or click **">_ TERMINAL"** button

### 2. Try These Commands

```bash
# Get help
help

# Scan the router
nmap router

# Check network status
status

# Enable defenses
ufw enable
ids enable

# Launch brute force attack
hydra -l admin -P rockyou.txt webserver

# SQL injection
sqlmap -u "http://database/login" --dump

# View node info
whois database

# Clear screen
clear
```

### 3. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Run command |
| `↑` `↓` | Browse history |
| `Tab` | Autocomplete |
| `Ctrl+C` | Cancel |
| `Ctrl+L` | Clear |
| `Esc` | Close |

## Popular Commands

### Recon Your Network
```bash
nmap --all                    # Scan everything
whois router                  # Node details
traceroute database          # Network path
ping webserver               # Test connectivity
```

### Launch Attacks
```bash
# Brute force
hydra -l admin -P rockyou.txt admin

# SQL inject
sqlmap -u "http://database/login" --dump

# DDoS flood
hping3 --flood webserver
```

### Defend Your Network
```bash
ufw enable                   # Firewall on
ids enable                   # IDS on
status                       # Check everything
iptables -L                 # View rules
```

## Tips & Tricks

💡 **Double-tap Tab** to see all matching options

💡 **Use arrow keys** to recall previous commands

💡 **Type `help [command]`** for detailed usage

💡 **Commands are case-insensitive**

💡 **Press Ctrl+C** to stop long-running output

## Targets

Valid target names:
- `router`
- `firewall`
- `webserver`
- `database`
- `admin`

## Need Help?

- Type `help` for all commands
- Type `help nmap` for command-specific help
- See `docs/REPL.md` for full documentation

---

**Have fun hacking!** 🎯
