/*
  commandParser.js — Parse raw command strings into structured objects
  
  Takes a raw input string like: nmap -sV -p 80,443 router
  Returns: {
    command: "nmap",
    flags: ["-sV", "-p"],
    args: ["80,443", "router"],
    raw: "nmap -sV -p 80,443 router"
  }
  
  Features:
  - Handles multiple flags and arguments
  - Supports quoted arguments: hydra -l "admin user" -P list.txt
  - Case-insensitive command names
  - Returns null for empty input
  
  Used by SiegeREPL.jsx to parse user input before command execution.
*/

/**
 * Parse a command string into a structured command object
 * @param {string} input - Raw command string from user
 * @returns {object|null} Parsed command object or null if empty
 */
export function parseCommand(input) {
  // Trim and check for empty input
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Store raw input for logging
  const raw = trimmed;

  // Tokenize the input (handle quoted strings)
  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;

  // First token is the command (case-insensitive)
  const command = tokens[0].toLowerCase();

  // Separate flags and arguments
  const flags = [];
  const args = [];

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    
    // Flags start with - or --
    if (token.startsWith('-')) {
      flags.push(token);
    } else {
      args.push(token);
    }
  }

  return {
    command,
    flags,
    args,
    raw,
  };
}

/**
 * Tokenize a command string, respecting quoted strings
 * @param {string} str - Command string to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenize(str) {
  const tokens = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Handle quote start/end
    if ((char === '"' || char === "'") && !inQuote) {
      inQuote = true;
      quoteChar = char;
      continue;
    }

    if (char === quoteChar && inQuote) {
      inQuote = false;
      quoteChar = '';
      // Push the quoted content as a token
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    // Handle spaces outside quotes
    if (char === ' ' && !inQuote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    // Build current token
    current += char;
  }

  // Push final token if any
  if (current) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Check if a command has a specific flag
 * @param {object} parsed - Parsed command object
 * @param {string|string[]} flag - Flag(s) to check for (e.g., "-sV" or ["-sV", "--version"])
 * @returns {boolean} True if flag exists
 */
export function hasFlag(parsed, flag) {
  if (!parsed || !parsed.flags) return false;
  
  const flagsToCheck = Array.isArray(flag) ? flag : [flag];
  return flagsToCheck.some(f => parsed.flags.includes(f));
}

/**
 * Get the value after a specific flag
 * @param {object} parsed - Parsed command object
 * @param {string} flag - Flag to find value for (e.g., "-l")
 * @returns {string|null} Value after the flag, or null if not found
 */
export function getFlagValue(parsed, flag) {
  if (!parsed || !parsed.flags) return null;
  
  const flagIndex = parsed.flags.indexOf(flag);
  if (flagIndex === -1) return null;
  
  // Look for next non-flag token in args
  // This is a simplified approach - assumes flag value comes after flag
  // For more complex parsing, would need to track original order
  return parsed.args[0] || null;
}

/**
 * Get target from arguments (usually the last argument)
 * @param {object} parsed - Parsed command object
 * @returns {string|null} Target node name or null
 */
export function getTarget(parsed) {
  if (!parsed || !parsed.args || parsed.args.length === 0) return null;
  return parsed.args[parsed.args.length - 1];
}

/**
 * Suggest similar commands based on user input
 * @param {string} input - User's command that wasn't found
 * @param {string[]} available - List of available command names
 * @returns {string[]} Array of similar command names
 */
export function suggestCommands(input, available) {
  if (!input || !available) return [];
  
  const lower = input.toLowerCase();
  const suggestions = [];

  // Exact substring match
  for (const cmd of available) {
    if (cmd.includes(lower) || lower.includes(cmd)) {
      suggestions.push(cmd);
    }
  }

  // If no substring matches, try fuzzy matching (Levenshtein distance)
  if (suggestions.length === 0) {
    const scored = available.map(cmd => ({
      cmd,
      distance: levenshteinDistance(lower, cmd),
    }));

    // Sort by distance and take closest matches (distance <= 3)
    scored.sort((a, b) => a.distance - b.distance);
    
    for (const item of scored) {
      if (item.distance <= 3) {
        suggestions.push(item.cmd);
      }
    }
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
