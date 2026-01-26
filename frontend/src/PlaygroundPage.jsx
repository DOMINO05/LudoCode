import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, CheckCircle2, CloudUpload, CloudCheck, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from './ThemeContext';
import { debounce } from 'lodash';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { supabase } from './supabaseClient';
import { PISTON_API_URL } from './config';

const LANGUAGES = [
  { id: 'python', name: 'Python' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'sql', name: 'SQL' },
];

const DEFAULT_CODE = {
  python: 'print("Üdvözöllek a LudoCode Playground-on!")\n\n# Írd ide a kódodat\nnev = input("Hogy hívnak? ")\nprint(f"Szia {nev}!")',
  javascript: 'console.log("Üdvözöllek a LudoCode Playground-on!");\n\n// Írd ide a kódodat\nlet szam = 5;\nconsole.log("A szám: " + szam);',
  typescript: 'interface User {\n  name: string;\n  id: number;\n}\n\nconst user: User = {\n  name: "LudoCode",\n  id: 1,\n};\n\nconsole.log(`Üdv, ${user.name}!`);',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Üdvözöllek a LudoCode Playground-on!");\n        \n        // Írd ide a kódodat\n    }\n}',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Üdvözöllek a LudoCode Playground-on!" << std::endl;\n    return 0;\n}',
  sql: '-- Üdvözöllek a LudoCode Playground-on!\n-- Itt kipróbálhatod az SQL lekérdezéseket\n\nCREATE TABLE felhasznalok (id INTEGER PRIMARY KEY, nev TEXT);\nINSERT INTO felhasznalok (nev) VALUES ("Admin"), ("Vendég");\n\nSELECT * FROM felhasznalok;',
};

export default function PlaygroundPage() {
  const { session, showBadgeNotification, showNotification } = useOutletContext();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [language, setLanguage] = useState('python');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  
  // Sharing states
  const [shareCode, setShareCode] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  
  const [shareEditableOption, setShareEditableOption] = useState(false); // Checkbox for sharing
  const [canEdit, setCanEdit] = useState(true); // Permission for current editor
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [showDesktopWarning, setShowDesktopWarning] = useState(false);

  const ignoreNextSave = useRef(false);
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);
  const socketRef = useRef(null);

  // Desktop experience warning
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    const hasSeenWarning = sessionStorage.getItem('playground_desktop_warning_seen');
    
    if (isMobile && !hasSeenWarning) {
      setShowDesktopWarning(true);
    }
  }, []);

  // Init Terminal
  useEffect(() => {
      if (xtermRef.current) {
          xtermRef.current.dispose();
      }

      const term = new Terminal({
          cursorBlink: true,
          fontFamily: 'monospace',
          fontSize: 14,
          theme: {
              background: isDark ? '#0f172a' : '#ffffff',
              foreground: isDark ? '#e2e8f0' : '#334155',
              cursor: isDark ? '#ffffff' : '#000000',
              selectionBackground: isDark ? '#334155' : '#cbd5e1'
          }
      });
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      if (terminalRef.current) {
          term.open(terminalRef.current);
          fitAddon.fit();
      }

      xtermRef.current = term;

      const handleResize = () => {
          if (fitAddonRef.current) {
              try { fitAddonRef.current.fit(); } catch (e) {}
          }
      };
      window.addEventListener('resize', handleResize);

      return () => {
          window.removeEventListener('resize', handleResize);
          term.dispose();
      };
  }, []);

  // Sync terminal theme with isDark
  useEffect(() => {
      if (xtermRef.current) {
          xtermRef.current.options.theme = {
              background: isDark ? '#0f172a' : '#ffffff',
              foreground: isDark ? '#e2e8f0' : '#334155',
              cursor: isDark ? '#ffffff' : '#000000',
              selectionBackground: isDark ? '#334155' : '#cbd5e1'
          };
      }
  }, [isDark]);

  // Load code logic
  useEffect(() => {
    if (token) {
      loadSharedSnippet(token);
    } else {
      // Load from local storage
      const savedCode = localStorage.getItem('playground_code');
      const savedLang = localStorage.getItem('playground_language');
      
      if (savedLang) {
          setLanguage(savedLang);
          if (savedCode) {
              ignoreNextSave.current = true;
              setCode(savedCode);
          } else {
              setCode(DEFAULT_CODE[savedLang] || '');
          }
      }
    }
  }, [token]);

  const loadSharedSnippet = async (shareCode) => {
    try {
      const { data, error } = await supabase
        .from('shared_snippets')
        .select('*')
        .eq('share_code', shareCode)
        .single();

      if (error || !data) {
        showNotification('Snippet nem található!', 'error');
        navigate('/playground');
        return;
      }

      ignoreNextSave.current = true;
      setCode(data.code);
      setLanguage(data.language);
      setCanEdit(data.is_editable || data.creator_id === session?.user?.id);
    } catch (err) {
      console.error(err);
      showNotification('Hiba a snippet betöltésekor', 'error');
    }
  };

  // Realtime updates using Supabase
  useEffect(() => {
    if (!token) return;

    const channel = supabase
      .channel(`snippet-${token}`)
      .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'shared_snippets',
          filter: `share_code=eq.${token}`
      }, (payload) => {
          if (payload.new && payload.new.code !== code && !isSaving) {
              ignoreNextSave.current = true;
              setCode(payload.new.code);
              setLanguage(payload.new.language);
          }
      })
      .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [token, code, isSaving]);

  // Auto-save logic
  const debouncedSave = useCallback(
    debounce(async (newCode, newLang) => {
      if (!token) { 
         localStorage.setItem('playground_code', newCode);
         localStorage.setItem('playground_language', newLang);
         setLastSaved(new Date());
         setIsSaving(false);
      } else if (canEdit) {
         try {
             const { error } = await supabase
                .from('shared_snippets')
                .update({ code: newCode, language: newLang })
                .eq('share_code', token);

             if (!error) {
                 setLastSaved(new Date());
             }
         } catch (err) {
             console.error("Save error:", err);
         } finally {
             setIsSaving(false);
         }
      } else {
          setIsSaving(false);
      }
    }, 2000),
    [token, canEdit]
  );

  useEffect(() => {
    if (ignoreNextSave.current) {
        ignoreNextSave.current = false;
        return;
    }
    // Trigger save when code/language changes
    setIsSaving(true);
    debouncedSave(code, language);
    return () => debouncedSave.cancel();
  }, [code, language, debouncedSave]);


  const handleFormat = async () => {
    // Formatting disabled in serverless for now or use a client-side library
    showNotification('Formázás jelenleg nem elérhető szerver nélkül.', 'info');
  };

  const handleRun = async () => {
    setIsRunning(true);
    const term = xtermRef.current;
    if (!term) return;
    
    term.reset();
    term.write('\x1b[32m▶ Futás (Piston API)...\x1b[0m\r\n');

    try {
        const payload = {
            language: language === 'javascript' ? 'js' : language,
            version: '*',
            files: [{ name: 'main', content: code }]
        };
        
        const response = await fetch(PISTON_API_URL + "/execute", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        
        if (data.run) {
            if (data.run.stdout) term.write(data.run.stdout.replace(/\n/g, '\r\n'));
            if (data.run.stderr) term.write('\x1b[31m' + data.run.stderr.replace(/\n/g, '\r\n') + '\x1b[0m');
            term.write(`\r\n\x1b[90m--------------------------------\x1b[0m\r\n`);
            term.write(`\x1b[33mProgram befejeződött (kód: ${data.run.code})\x1b[0m\r\n`);
        } else {
            term.write('\x1b[31mHiba a futtatás során.\x1b[0m\r\n');
        }
    } catch (err) {
        term.write('\x1b[31mHálózati hiba a Piston API-hoz.\x1b[0m\r\n');
    } finally {
        setIsRunning(false);
    }
  };

  const handleStop = () => {
      // Piston is not interactive in this simple impl, so stop does nothing
      setIsRunning(false);
  };

  const handleLanguageChange = (newLang) => {
      // If current code is default code for previous language, update to default code for new language
      if (code.trim() === DEFAULT_CODE[language]?.trim() || code === '') {
          setCode(DEFAULT_CODE[newLang]);
      }
      setLanguage(newLang);
  };

  const handleClearTerminal = () => {
      if (xtermRef.current) {
          xtermRef.current.reset();
      }
  };

  const openShareOptions = () => {
    setShowShareOptions(true);
  };

  const createShare = async () => {
    try {
      const shareCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase
        .from('shared_snippets')
        .insert({
            share_code: shareCode,
            language,
            code,
            is_editable: shareEditableOption,
            creator_id: session?.user?.id
        })
        .select()
        .single();
      
      if (!error) {
          setShareCode(shareCode);
          setShowShareOptions(false);
          setShowShareModal(true);
      } else {
          showNotification(`Sikertelen megosztás: ${error.message}`, 'error');
      }
    } catch (err) {
      showNotification('Hiba a megosztás során: ' + err.message, 'error');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f7f7f7] dark:bg-slate-900 text-slate-700 dark:text-slate-100">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
            <h1 className="font-black text-xl tracking-tight hidden sm:block">Playground</h1>
            
            {/* Custom Language Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-all min-w-[140px] border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[2px]"
                >
                    <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                        {LANGUAGES.find(l => l.id === language)?.name}
                    </span>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLangOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-2 space-y-1">
                                {LANGUAGES.map(lang => {
                                    const isSelected = lang.id === language;
                                    const icon = lang.name.toLowerCase().includes('python') ? '🐍' : 
                                                 lang.name.toLowerCase().includes('java') ? '☕' : 
                                                 lang.name.toLowerCase().includes('sql') ? '📊' : 
                                                 lang.name.toLowerCase().includes('cpp') ? '⚙️' : '📜';
                                    return (
                                        <button
                                            key={lang.id}
                                            onClick={() => {
                                                handleLanguageChange(lang.id);
                                                setIsLangOpen(false);
                                            }}
                                            className={`flex items-center gap-3 w-full p-3 rounded-xl font-bold transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            <span className="text-xl">{icon}</span>
                                            <span className="uppercase tracking-wide">{lang.name}</span>
                                            {isSelected && <CheckCircle2 size={16} className="ml-auto" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

        <div className="flex items-center gap-3">
             {/* Auto-save indicator */}
             <div 
                className="mr-2 transition-all duration-300"
                title={lastSaved ? `Utoljára mentve: ${lastSaved.toLocaleTimeString()}` : 'Nincs mentve'}
             >
                 {isSaving ? (
                     <div className="flex items-center text-blue-500">
                        <Loader2 size={20} className="animate-spin" />
                     </div>
                 ) : lastSaved ? (
                     <div className="flex items-center text-green-500 animate-in fade-in zoom-in">
                        <CloudCheck size={22} />
                     </div>
                 ) : (
                    <CloudUpload size={22} className="text-slate-300" />
                 )}
             </div>

             <button 
                onClick={handleFormat} 
                disabled={!canEdit}
                className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`} 
                title="Format Code"
             >
                 ✨ <span className="hidden sm:inline ml-1 font-bold text-sm">Formázás</span>
             </button>
             
             {/* Only show Share button if NOT in shared view mode */}
             {!token && (
                 <button onClick={openShareOptions} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Share">
                     🔗 <span className="hidden sm:inline ml-1 font-bold text-sm">Megosztás</span>
                 </button>
             )}

             {!isRunning ? (
                 <button 
                    onClick={handleRun} 
                    className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white shadow-lg bg-green-500 hover:bg-green-600 hover:scale-105 active:scale-95 transition-all"
                >
                    ▶ Futás
                 </button>
             ) : (
                 <button 
                    onClick={handleStop} 
                    className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white shadow-lg bg-red-500 hover:bg-red-600 hover:scale-105 active:scale-95 transition-all animate-pulse"
                >
                    ■ Leállítás
                 </button>
             )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Editor */}
          <div className="flex-1 md:w-1/2 border-r border-slate-200 dark:border-slate-700 relative">
              <Editor
                  height="100%"
                  defaultLanguage={language}
                  language={language === 'sql' ? 'sql' : language === 'cpp' ? 'cpp' : language} 
                  value={code}
                  onChange={(val) => setCode(val)}
                  theme={isDark ? "vs-dark" : "light"}
                  options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      readOnly: !canEdit,
                      padding: { top: 10 }
                  }}
              />
          </div>

          {/* Output / Terminal */}
          <div className="h-1/3 md:h-full md:w-1/2 bg-white dark:bg-slate-900 p-0 overflow-hidden flex flex-col relative border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between p-2 border-b border-slate-200 dark:border-slate-700 absolute top-0 left-0 right-0 z-10 bg-white/90 dark:bg-slate-900/90">
                  <div className="flex items-center gap-2">
                      <span className="uppercase text-xs font-bold tracking-widest text-slate-500 dark:text-slate-400">Eredmény / Terminál</span>
                      <div className="group relative">
                          <span className="cursor-help text-slate-400 dark:text-slate-500 text-[10px] border border-slate-300 dark:border-slate-600 rounded-full w-4 h-4 flex items-center justify-center">?</span>
                          <div className="pointer-events-none absolute left-0 top-6 w-64 p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 border border-slate-200 dark:border-slate-700">
                              Az interaktív bevitel (pl. neved beírása) akkor érhető el, ha az adott nyelv telepítve van a szerveren. A weboldalon minden támogatott nyelvhez biztosítjuk a teljes interaktív környezetet.
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <div className="hidden lg:block text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded border border-amber-100 dark:border-amber-800/30">
                          ⚠️ Az interaktív bevitel (pl. input()) jelenleg nem támogatott.
                      </div>
                      <button 
                        onClick={handleClearTerminal}
                        className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-1 rounded transition-colors uppercase font-bold border border-slate-200 dark:border-slate-700"
                      >
                        Törlés
                      </button>
                  </div>
              </div>
              <div className="lg:hidden bg-amber-50 dark:bg-amber-900/20 p-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold border-b border-amber-100 dark:border-amber-800/30 text-center">
                  ⚠️ Interaktív bevitel (pl. input()) nem támogatott.
              </div>
              <div 
                ref={terminalRef} 
                className="flex-1 pt-10 pb-2 pl-2 cursor-text" 
                onClick={() => xtermRef.current?.focus()}
              />
          </div>
      </div>

      {/* Share Options Modal */}
      {showShareOptions && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-2xl font-black mb-4">Megosztás Beállításai</h3>
                  
                  <div className="mb-6">
                      <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition">
                          <input 
                            type="checkbox" 
                            checked={shareEditableOption} 
                            onChange={(e) => setShareEditableOption(e.target.checked)}
                            className="w-5 h-5 rounded text-primary focus:ring-primary"
                          />
                          <span className="font-bold">Szerkeszthető kód</span>
                      </label>
                      <p className="text-xs text-slate-500 mt-2 px-1">
                          Ha bejelölöd, mások módosíthatják a megosztott kódot. Ha nem, csak olvasni és futtatni tudják.
                      </p>
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => setShowShareOptions(false)}
                        className="flex-1 bg-slate-200 dark:bg-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                      >
                          Mégse
                      </button>
                      <button 
                        onClick={createShare}
                        className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition shadow-lg"
                      >
                          Kód Generálása
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Share Result Modal */}
      {showShareModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-2xl font-black mb-4">Sikeres Megosztás!</h3>
                  <p className="text-slate-500 mb-4">Használd ezt a 6 jegyű kódot a Community oldalon:</p>
                  
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-4 rounded-xl mb-6 border-2 border-dashed border-slate-300 dark:border-slate-700">
                      <div className="flex-1 font-mono text-3xl font-black tracking-widest text-center select-all">
                          {shareCode}
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => {
                            navigator.clipboard.writeText(shareCode);
                            showNotification('Kód a vágólapra másolva!', 'success');
                        }}
                        className="flex-1 bg-slate-200 dark:bg-slate-700 py-3 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                      >
                          Kód Másolása
                      </button>
                      <button 
                        onClick={() => {
                            setShowShareModal(false);
                            // Switch to the shared view so we can see updates/collaborate
                            navigate(`/share/${shareCode}`); 
                        }}
                        className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-dark transition shadow-lg"
                      >
                          Kész
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Desktop Experience Warning Modal */}
      {showDesktopWarning && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-4 border-blue-500 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl">
                      💻
                  </div>
                  <h3 className="text-2xl font-black mb-2 text-center">Asztali Nézet Ajánlott</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-8 text-center leading-relaxed">
                      A Playground használata asztali gépen javasolt a kódolási élmény és a terminál kezelése miatt.
                  </p>
                  
                  <button 
                    onClick={() => {
                        setShowDesktopWarning(false);
                        sessionStorage.setItem('playground_desktop_warning_seen', 'true');
                    }}
                    className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-500/30 hover:scale-[1.02] active:scale-95 duration-200"
                  >
                      Megértettem
                  </button>
              </div>
          </div>
      )}
    </div>
  );
}
