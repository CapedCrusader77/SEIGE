/*
  SiegeREPL.jsx — Interactive Terminal REPL Component
  
  A fully functional command-line interface overlay that allows users to type
  real penetration testing commands and trigger attack simulations.
  
  Features:
  - Full-screen overlay with slide-down animation
  - Command parsing and execution
  - Typewriter output effect with cancellation (Ctrl+C)
  - Command history navigation (up/down arrows)
  - Tab autocomplete for commands and targets
  - Persistent command history in localStorage
  - Keyboard shortcuts (Enter, Ctrl+C, Ctrl+L, Escape)
  - Integration with Zustand store and attack APIs
  
  Usage:
  - Press backtick (`) to open/close
  - Press Escape to close
  - Press Ctrl+C to cancel running output
  - Press Ctrl+L to clear screen
  - Up/Down arrows for command history
  - Tab for autocomplete
*/

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useSiegeStore from '../store/siegeStore';
import { parseCommand, suggestCommands } from '../utils/commandParser';
import { getCommand, getAllCommandNames, getAllTargetNames } from '../utils/commands';
import { API_BASE_URL } from '../config';

const HISTORY_KEY = 'siege-repl-history';
const MAX_HISTORY = 50;

export default function SiegeREPL({ isOpen, onClose }) {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const [inputValue, setInputValue] = useState('');
  const [outputLines, setOutputLines] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [tabPressCount, setTabPressCount] = useState(0);
  const [lastTabTime, setLastTabTime] = useState(0);

  const inputRef = useRef(null);
  const outputRef = useRef(null);
  const animationTimers = useRef([]);
  const abortController = useRef(null);

  const store = useSiegeStore();

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // LOAD HISTORY FROM LOCALSTORAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCommandHistory(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load command history:', err);
    }
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SAVE HISTORY TO LOCALSTORAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const saveHistory = useCallback((history) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
    } catch (err) {
      console.warn('Failed to save command history:', err);
    }
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTO-FOCUS INPUT WHEN OPEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AUTO-SCROLL TO BOTTOM
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLEAR ALL ANIMATION TIMERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const clearAllTimers = useCallback(() => {
    animationTimers.current.forEach(timer => clearTimeout(timer));
    animationTimers.current = [];
    
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // OUTPUT HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const addOutputLine = useCallback((text, type = 'info') => {
    setOutputLines(prev => [...prev, { text, type, id: Date.now() + Math.random() }]);
  }, []);

  const clearOutput = useCallback(() => {
    setOutputLines([]);
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // API CALL HELPER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const apiCall = useCallback(async (method, endpoint, data) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TYPEWRITER DELAY HELPER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const delay = useCallback((ms) => {
    return new Promise((resolve, reject) => {
      if (abortController.current?.signal.aborted) {
        reject(new Error('Cancelled'));
        return;
      }

      const timer = setTimeout(resolve, ms);
      animationTimers.current.push(timer);

      abortController.current?.signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Cancelled'));
      });
    });
  }, []);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // EXECUTE COMMAND
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const executeCommand = useCallback(async (input) => {
    // Show command in output
    addOutputLine(`siege@terminal:~$ ${input}`, 'command');

    // Parse command
    const parsed = parseCommand(input);
    if (!parsed) return;

    // Find command
    const cmd = getCommand(parsed.command);
    if (!cmd) {
      // Command not found - suggest alternatives
      const suggestions = suggestCommands(parsed.command, getAllCommandNames());
      addOutputLine(`Command not found: ${parsed.command}`, 'error');
      
      if (suggestions.length > 0) {
        addOutputLine(`Did you mean: ${suggestions.join(', ')}?`, 'info');
      }
      
      addOutputLine('Type "help" to see all available commands', 'info');
      return;
    }

    // Create abort controller for cancellation
    abortController.current = new AbortController();
    setIsExecuting(true);

    // Create command context
    const context = {
      store,
      apiCall,
      outputLine: addOutputLine,
      delay,
      getState: () => useSiegeStore.getState(),
      getHistory: () => commandHistory,
      clear: clearOutput,
      onExit: onClose,
      args: parsed.args,
    };

    // Execute command
    try {
      await cmd.handler(parsed, context);
    } catch (err) {
      if (err.message !== 'Cancelled') {
        addOutputLine(`Error: ${err.message}`, 'error');
      } else {
        addOutputLine('^C', 'warning');
      }
    } finally {
      setIsExecuting(false);
      abortController.current = null;
    }
  }, [addOutputLine, apiCall, delay, store, commandHistory, clearOutput, onClose]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HANDLE ENTER KEY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isExecuting) return;

    // Add to history
    const newHistory = [...commandHistory.filter(h => h !== trimmed), trimmed];
    setCommandHistory(newHistory);
    saveHistory(newHistory);
    setHistoryIndex(-1);

    // Clear input
    setInputValue('');

    // Execute
    await executeCommand(trimmed);
  }, [inputValue, isExecuting, commandHistory, saveHistory, executeCommand]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TAB AUTOCOMPLETE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleTabComplete = useCallback(() => {
    if (!inputValue.trim()) return;

    const now = Date.now();
    const isDoubleTap = now - lastTabTime < 500;
    setLastTabTime(now);

    const parts = inputValue.trim().split(/\s+/);
    const lastPart = parts[parts.length - 1].toLowerCase();

    // Get all possible completions
    const allCommands = getAllCommandNames();
    const allTargets = getAllTargetNames();
    const allOptions = [...allCommands, ...allTargets];

    const matches = allOptions.filter(opt => opt.startsWith(lastPart));

    if (matches.length === 0) {
      // No matches
      return;
    }

    if (matches.length === 1) {
      // Single match - complete it
      parts[parts.length - 1] = matches[0];
      setInputValue(parts.join(' ') + ' ');
    } else {
      // Multiple matches
      if (isDoubleTap) {
        // Double tab - show all matches
        addOutputLine(`siege@terminal:~$ ${inputValue}`, 'command');
        addOutputLine(matches.join('  '), 'info');
      } else {
        // Single tab - complete common prefix
        const commonPrefix = matches.reduce((acc, curr) => {
          let i = 0;
          while (i < acc.length && i < curr.length && acc[i] === curr[i]) {
            i++;
          }
          return acc.slice(0, i);
        });

        if (commonPrefix.length > lastPart.length) {
          parts[parts.length - 1] = commonPrefix;
          setInputValue(parts.join(' '));
        }
      }
    }
  }, [inputValue, lastTabTime, addOutputLine]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // COMMAND HISTORY NAVIGATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const navigateHistory = useCallback((direction) => {
    if (commandHistory.length === 0) return;

    let newIndex = historyIndex;

    if (direction === 'up') {
      newIndex = historyIndex === -1 
        ? commandHistory.length - 1 
        : Math.max(0, historyIndex - 1);
    } else {
      newIndex = historyIndex === -1 
        ? -1 
        : Math.min(commandHistory.length - 1, historyIndex + 1);
    }

    setHistoryIndex(newIndex);

    if (newIndex === -1) {
      setInputValue('');
    } else {
      setInputValue(commandHistory[newIndex]);
    }
  }, [commandHistory, historyIndex]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // KEYBOARD HANDLER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleKeyDown = useCallback((e) => {
    // Enter - execute command
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
      return;
    }

    // Tab - autocomplete
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabComplete();
      return;
    }

    // Up arrow - previous command
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory('up');
      return;
    }

    // Down arrow - next command
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
      return;
    }

    // Ctrl+C - cancel execution
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      if (isExecuting) {
        clearAllTimers();
        setIsExecuting(false);
      }
      return;
    }

    // Ctrl+L - clear screen
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      clearOutput();
      return;
    }

    // Escape - close REPL
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    // Reset history navigation on any other key
    if (historyIndex !== -1 && !['ArrowUp', 'ArrowDown'].includes(e.key)) {
      setHistoryIndex(-1);
    }
  }, [handleSubmit, handleTabComplete, navigateHistory, isExecuting, clearAllTimers, clearOutput, onClose, historyIndex]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CLEANUP ON UNMOUNT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="siege-repl-overlay"
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }}
        >
          {/* Header */}
          <div className="siege-repl-header">
            <div className="siege-repl-header-left">
              <div className="siege-repl-dots">
                <div className="siege-repl-dot red" />
                <div className="siege-repl-dot amber" />
                <div className="siege-repl-dot green" />
              </div>
              <div className="siege-repl-title">SIEGE REPL v1.0</div>
              <div className="siege-repl-status">CONNECTED</div>
            </div>
            <button className="siege-repl-close" onClick={onClose}>
              ✕ CLOSE
            </button>
          </div>

          {/* Output */}
          <div className="siege-repl-output" ref={outputRef}>
            {outputLines.length === 0 ? (
              <div className="siege-repl-empty">
                Type "help" to see available commands
              </div>
            ) : (
              outputLines.map((line) => (
                <div key={line.id} className="siege-repl-line">
                  {line.type === 'command' ? (
                    <span className="siege-repl-command">{line.text}</span>
                  ) : (
                    <pre className={`siege-repl-output-text ${line.type}`}>
                      {line.text}
                    </pre>
                  )}
                </div>
              ))
            )}
            {isExecuting && (
              <div className="siege-repl-line">
                <span className="siege-repl-output-text info">
                  [Press Ctrl+C to cancel]
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="siege-repl-input-row">
            <span className="siege-repl-prompt">siege@terminal:~$</span>
            <input
              ref={inputRef}
              type="text"
              className="siege-repl-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command..."
              disabled={isExecuting}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
