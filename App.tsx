

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { marked } from 'marked';
import { chunkerAgent, retrievalAgent, synthesisAgent } from './services/geminiService';
import { Source, ResearchOutput, ResearchSession } from './types';
import { AcademicCapIcon, CheckCircleIcon, ClipboardTextIcon, DownloadIcon, FilePdfIcon, FilePptIcon, FileTextIcon, FileWordIcon, GoogleIcon, HistoryIcon, LightBulbIcon, Loader2Icon, Logo, MenuIcon, PlusIcon, SearchIcon, UploadCloudIcon, XIcon, XCircleIcon } from './components/Icons';

// Required setup for the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';

type ActiveTab = "summary" | "insights" | "quiz" | "sources";

const IntroAnimation = ({ onAnimationEnd }: { onAnimationEnd: () => void }) => {
    // ... (This component remains the same as before)
    const [isFadingOut, setIsFadingOut] = useState(false);
    const title = "ResearchMind";

    useEffect(() => {
        const fadeOutTimer = setTimeout(() => setIsFadingOut(true), 3200);
        const endTimer = setTimeout(onAnimationEnd, 3700);
        return () => {
            clearTimeout(fadeOutTimer);
            clearTimeout(endTimer);
        };
    }, [onAnimationEnd]);

    return (
        <div className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="flare-container">
                    <Logo className="w-20 h-20 sm:w-24 sm:h-24 text-blue-400 intro-logo"/>
                </div>
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-serif font-bold text-white tracking-wide">
                         {title.split('').map((char, index) => (
                            <span key={index} className="stagger-char" style={{ '--i': `${1.5 + index * 0.05}s` } as React.CSSProperties}>
                                {char === ' ' ? '\u00A0' : char}
                            </span>
                        ))}
                    </h1>
                    <p className="mt-3 text-lg text-slate-400 intro-subtitle">Your AI partner for deep, evidence-based research.</p>
                </div>
            </div>
        </div>
    );
};

const LoginPage = ({ onLogin }: { onLogin: (email: string) => void }) => {
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            // In a real app, you'd perform actual validation and API calls here
            onLogin(email.trim());
        }
    };

    const handleGoogleSignIn = () => {
        // In a real app, this would trigger the Google OAuth flow
        // For this demo, we'll just log in with a placeholder email
        onLogin("user@google.com");
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Logo className="w-16 h-16 text-blue-400 mx-auto"/>
                    <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-wide mt-4">Welcome to ResearchMind</h1>
                    <p className="mt-2 text-slate-400">
                        {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
                    </p>
                </div>

                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">Email address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition text-white"
                            />
                        </div>
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-slate-300">Password</label>
                             <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="mt-1 w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition text-white"
                            />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 transition text-lg">
                            {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                        </button>
                    </form>
                    
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-gray-900/50 px-2 text-gray-500">OR</span>
                        </div>
                    </div>

                    <button onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-700 transition">
                        <GoogleIcon className="w-5 h-5"/>
                        Sign in with Google
                    </button>
                </div>

                <p className="mt-6 text-center text-sm text-gray-400">
                    {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} className="font-medium text-blue-400 hover:text-blue-500">
                        {mode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                </p>
            </div>
        </div>
    );
}

const HistorySidebar = ({ sessions, onSelect, onNew, onDelete, activeSessionId, isOpen, onClose }: { sessions: ResearchSession[], onSelect: (id: string) => void, onNew: () => void, onDelete: (id: string) => void, activeSessionId: string | null, isOpen: boolean, onClose: () => void }) => {
    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col p-4 z-40 transform transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <HistoryIcon className="w-6 h-6 text-blue-400"/>
                        <h2 className="text-xl font-bold font-serif">History</h2>
                    </div>
                     <button onClick={onClose} className="lg:hidden p-1">
                        <XIcon className="w-6 h-6"/>
                    </button>
                </div>
                <button onClick={onNew} className="flex items-center justify-center gap-2 w-full bg-blue-600 font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition mb-4">
                    <PlusIcon className="w-5 h-5"/>
                    New Research
                </button>
                <div className="flex-grow overflow-y-auto space-y-2">
                    {sessions.map(session => (
                        <div key={session.id} className={`group relative p-3 rounded-lg cursor-pointer ${activeSessionId === session.id ? 'bg-blue-900/70' : 'hover:bg-gray-800'}`} onClick={() => onSelect(session.id)}>
                            <p className="truncate font-medium text-sm">{session.topic || "New Research"}</p>
                            <p className="text-xs text-gray-400">{new Date(session.createdAt).toLocaleDateString()}</p>
                             <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); }} className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-full bg-gray-800 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-900/50 transition">
                                <XIcon className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </aside>
        </>
    );
};

const App: React.FC = () => {
    const [userName, setUserName] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const [pastedText, setPastedText] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [progressMessage, setProgressMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    
    const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
    const [showIntro, setShowIntro] = useState(true);
    const [isAppVisible, setAppVisible] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeSession = useMemo(() => sessions.find(s => s.id === activeSessionId), [sessions, activeSessionId]);

    // Load user and sessions from localStorage on initial mount
    useEffect(() => {
        try {
            const savedName = localStorage.getItem('researchMindUser');
            if (savedName) setUserName(savedName);

            const savedSessions = localStorage.getItem('researchMindSessions');
            if (savedSessions) {
                const parsedSessions: ResearchSession[] = JSON.parse(savedSessions);
                setSessions(parsedSessions);
                if (parsedSessions.length > 0) {
                    setActiveSessionId(parsedSessions[0].id);
                }
            }
        } catch (e) {
            console.error("Failed to load from local storage", e);
        }
    }, []);
    
    // Create initial session if none exist after loading
    useEffect(() => {
      if (!userName) return; // Only run after login
      if (sessions.length === 0) {
        handleNewResearch(true);
      }
    }, [userName, sessions.length]);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('researchMindSessions', JSON.stringify(sessions));
        } else {
            // If all sessions are deleted, remove the item
            localStorage.removeItem('researchMindSessions');
        }
    }, [sessions]);
    
    useEffect(() => {
        if (!showIntro && userName) {
            const timer = setTimeout(() => setAppVisible(true), 50);
            return () => clearTimeout(timer);
        }
    }, [showIntro, userName]);

    const updateActiveSession = (updater: (session: ResearchSession) => ResearchSession) => {
        if (!activeSessionId) return;
        setSessions(prev => prev.map(s => s.id === activeSessionId ? updater(s) : s));
    };

    const handleLogin = (name: string) => {
        localStorage.setItem('researchMindUser', name);
        setUserName(name);
    };
    
    const handleLogout = () => {
        localStorage.removeItem('researchMindUser');
        setUserName(null);
        // Optional: clear sessions on logout for privacy, or keep them.
        // setSessions([]);
        // setActiveSessionId(null);
    };

    const handleNewResearch = (setActive = true) => {
        const newSession: ResearchSession = {
            id: crypto.randomUUID(),
            topic: '',
            sources: [],
            results: null,
            createdAt: new Date().toISOString(),
        };
        setSessions(prev => [newSession, ...prev]);
        if (setActive) {
            setActiveSessionId(newSession.id);
            setSidebarOpen(false);
        }
    };
    
    const handleSelectSession = (id: string) => {
        setActiveSessionId(id);
        setSidebarOpen(false);
    };

    const handleDeleteSession = (id: string) => {
        const remainingSessions = sessions.filter(s => s.id !== id);
        setSessions(remainingSessions);
        if (activeSessionId === id) {
             if (remainingSessions.length > 0) {
                setActiveSessionId(remainingSessions[0].id);
             } else {
                setActiveSessionId(null);
                handleNewResearch(true); // Create a new empty session
             }
        }
    };


    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || !activeSession) return;

        const newSources: Source[] = [];
        // FIX: Iterate directly over the FileList to preserve type information for 'file'.
        for (const file of files) {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            let type: Source['type'] | null = null;
            if (fileExtension === 'pdf') type = 'pdf';
            else if (fileExtension === 'docx') type = 'docx';
            else if (fileExtension === 'pptx') type = 'ppt';
            else if (['txt', 'md'].includes(fileExtension || '')) type = 'text';

            if (!type) {
                setError(`File type for "${file.name}" is not supported.`);
                continue;
            }

            newSources.push({
                id: crypto.randomUUID(),
                type: type,
                title: file.name,
                content: '',
                status: 'pending',
                file: file,
            });
        }
        if(newSources.length > 0) {
            updateActiveSession(s => ({ ...s, sources: [...s.sources, ...newSources]}));
        }
    };
    
    const handleAddPastedText = () => {
        if (!pastedText.trim() || !activeSession) return;
        const newSource: Source = {
            id: crypto.randomUUID(),
            type: 'pasted',
            title: `Pasted Text (${new Date().toLocaleTimeString()})`,
            content: pastedText,
            status: 'complete'
        };
        updateActiveSession(s => ({ ...s, sources: [...s.sources, newSource] }));
        setPastedText('');
    };

    const removeSource = (id: string) => {
        if (!activeSession) return;
        updateActiveSession(s => ({ ...s, sources: s.sources.filter(src => src.id !== id) }));
    };

    const handleStartResearch = async () => {
        if (!activeSession || !activeSession.topic.trim()) {
            setError("Please enter a research topic.");
            return;
        }
        if (activeSession.sources.length === 0) {
            setError("Please add at least one source.");
            return;
        }

        setIsLoading(true);
        setError(null);
        updateActiveSession(s => ({ ...s, results: null }));
        
        try {
            setProgressMessage("Ingesting sources...");
            const parsedSources: Source[] = await Promise.all(
                activeSession.sources.map(async (source) => {
                    if (source.status === 'complete' || !source.file) return source;
                    let text = '';
                    try {
                        switch(source.type) {
                            case 'pdf': text = await parsePdf(source.file); break;
                            case 'docx': text = await parseDocx(source.file); break;
                            case 'ppt': text = await parsePptx(source.file); break;
                            case 'text': text = await parseText(source.file); break;
                        }
                         return { ...source, content: text, status: 'complete' };
                    } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : "An unknown parsing error occurred.";
                        setError(`Failed to process ${source.title}: ${errorMessage}`);
                        return { ...source, status: 'error' };
                    }
                })
            );
            
            const successfullyParsed = parsedSources.filter(s => s.status === 'complete');
            if (successfullyParsed.length === 0) {
                throw new Error("No sources could be processed. Please check the files and try again.");
            }
            updateActiveSession(s => ({ ...s, sources: parsedSources }));

            setProgressMessage("Splitting documents...");
            const chunks = chunkerAgent(successfullyParsed);
            if (chunks.length === 0) throw new Error("Could not extract any text from the sources.");

            setProgressMessage("Finding relevant info...");
            const relevantChunks = await retrievalAgent(activeSession.topic, chunks);
            
            setProgressMessage("Synthesizing research...");
            const finalResults = await synthesisAgent(activeSession.topic, relevantChunks);
            updateActiveSession(s => ({ ...s, results: finalResults }));
            setActiveTab('summary');

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Research failed: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }
    };
    
    // All parsing functions (parsePdf, parseDocx, etc.) remain the same
    const parsePdf = async (file: File): Promise<string> => {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onload = async (e) => {
                try {
                    const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    let fullText = "";
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ') + '\n\n';
                    }
                    resolve(fullText);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Failed to parse ${file.name}: ${message}`));
                }
            };
            fileReader.onerror = () => reject(new Error('Error reading the file.'));
            fileReader.readAsArrayBuffer(file);
        });
    };
    
    const parseDocx = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    resolve(result.value);
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Failed to parse ${file.name}: ${message}`));
                }
            };
            reader.onerror = () => reject(new Error('Error reading the file.'));
            reader.readAsArrayBuffer(file);
        });
    };

    const parsePptx = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const zip = await JSZip.loadAsync(arrayBuffer);
                    const slidePromises: Promise<string>[] = [];
                    
                    zip.folder("ppt/slides")?.forEach((relativePath, file) => {
                        if (relativePath.startsWith("slide") && relativePath.endsWith(".xml")) {
                            slidePromises.push(file.async("string"));
                        }
                    });

                    const slideXmls = await Promise.all(slidePromises);
                    let fullText = "";

                    slideXmls.forEach(xml => {
                        const textNodes = xml.match(/<a:t>.*?<\/a:t>/g) || [];
                        const slideText = textNodes.map(node => node.replace(/<a:t>|<\/a:t>/g, '')).join(' ');
                        fullText += slideText + '\n\n';
                    });

                    resolve(fullText);
                } catch (error) {
                     const message = error instanceof Error ? error.message : String(error);
                     reject(new Error(`Failed to parse ${file.name}: ${message}`));
                }
            };
            reader.onerror = () => reject(new Error('Error reading the file.'));
            reader.readAsArrayBuffer(file);
        });
    };
    
    const parseText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Error reading file'));
            reader.readAsText(file);
        });
    };

    const exportToMarkdown = () => {
        if (!activeSession?.results) return;
        let mdContent = `# Research Report: ${activeSession.topic}\n\n`;
        mdContent += `## Short Summary\n${activeSession.results.shortSummary.content}\n\n`;
        mdContent += `## Extended Summary\n${activeSession.results.extendedSummary}\n\n`;
        mdContent += `## Key Insights\n${activeSession.results.insights.map(i => `- ${i.content} (Source: ${i.citation.sourceTitle})`).join('\n')}\n\n`;
        mdContent += `## Key Quotes\n${activeSession.results.quotes.map(q => `> ${q.content}\n> — *${q.citation.sourceTitle}*\n`).join('\n')}\n\n`;
        mdContent += `## Suggested Next Steps\n${activeSession.results.nextSteps.map(s => `### ${s.content}\n${s.explanation}`).join('\n\n')}\n\n`;
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research_report_${activeSession.topic.replace(/\s+/g, '_')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderSourceIcon = (type: Source['type']) => {
        switch (type) {
            case 'pdf': return <FilePdfIcon className="w-5 h-5 flex-shrink-0 text-red-400" />;
            case 'docx': return <FileWordIcon className="w-5 h-5 flex-shrink-0 text-blue-400" />;
            case 'ppt': return <FilePptIcon className="w-5 h-5 flex-shrink-0 text-orange-400" />;
            case 'text': return <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-400" />;
            case 'pasted': return <ClipboardTextIcon className="w-5 h-5 flex-shrink-0 text-green-400" />;
            default: return <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-400" />;
        }
    };
    
    if (showIntro) return <IntroAnimation onAnimationEnd={() => setShowIntro(false)} />;
    if (!userName) return <LoginPage onLogin={handleLogin} />;
    
    return (
        <div className={`min-h-screen bg-black text-slate-200 font-sans transition-opacity duration-700 ${isAppVisible ? 'opacity-100' : 'opacity-0'} w-full flex overflow-x-hidden`}>
            <HistorySidebar sessions={sessions} onSelect={handleSelectSession} onNew={handleNewResearch} onDelete={handleDeleteSession} activeSessionId={activeSessionId} isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 flex flex-col">
                <header className="flex items-center justify-between mb-6 md:mb-10 w-full max-w-7xl mx-auto">
                    <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-white">
                        <MenuIcon className="w-6 h-6"/>
                    </button>
                    <div className="flex items-center justify-center gap-3 sm:gap-4 flex-grow lg:flex-grow-0">
                        <Logo className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400"/>
                        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white tracking-wide break-words">ResearchMind</h1>
                    </div>
                     <div className="flex items-center gap-4">
                        <span className="hidden sm:inline text-sm text-gray-400">{userName}</span>
                        <button onClick={handleLogout} className="text-sm font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-md transition">Logout</button>
                    </div>
                </header>

                {!activeSession ? (
                    <div className="flex-grow flex items-center justify-center text-center">
                        <div>
                             <h2 className="text-2xl font-bold">Welcome to ResearchMind!</h2>
                            <p className="text-gray-400">Create a new research project to get started.</p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
                        <aside className="lg:col-span-4 space-y-6">
                            <div className="p-4 sm:p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                                <h2 className="text-xl sm:text-2xl font-serif font-bold mb-4 text-white">1. Research Topic</h2>
                                <input type="text" value={activeSession.topic} onChange={(e) => updateActiveSession(s => ({ ...s, topic: e.target.value }))} placeholder="e.g., 'The Future of Quantum Computing'" className="w-full px-4 py-2 text-md bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500/50 outline-none transition" disabled={isLoading} />
                            </div>
                            <div className="p-4 sm:p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                                <h2 className="text-xl sm:text-2xl font-serif font-bold mb-4 text-white">2. Add Sources</h2>
                                <div className="relative border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-800/50" onClick={() => fileInputRef.current?.click()} >
                                    <UploadCloudIcon className="w-10 h-10 mx-auto text-gray-500"/>
                                    <p className="mt-2 text-sm text-slate-400">Click to upload files</p>
                                    <p className="text-xs text-gray-500">PDF, DOCX, PPTX, TXT</p>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.pptx,.txt,.md" multiple className="hidden" />
                                </div>
                                <div className="mt-4">
                                    <textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Or paste your text here..." className="w-full h-24 px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500/50 outline-none resize-none" disabled={isLoading} />
                                    <button onClick={handleAddPastedText} disabled={!pastedText.trim() || isLoading} className="w-full mt-2 bg-gray-700 text-white font-semibold px-4 py-2 text-sm rounded-md hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed">Add Text as Source</button>
                                </div>
                                <div className="mt-4 space-y-2">
                                    {activeSession.sources.map(source => (
                                        <div key={source.id} className="flex items-center justify-between p-2 bg-gray-800 rounded-md">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {renderSourceIcon(source.type)}
                                                <span className="truncate text-sm font-medium">{source.title}</span>
                                            </div>
                                            <button onClick={() => removeSource(source.id)} disabled={isLoading} className="p-1 hover:bg-red-900/50 rounded-full">
                                                <XIcon className="w-4 h-4 text-red-500"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                             <div className="p-4 sm:p-6 bg-gray-900/50 border border-gray-800 rounded-xl">
                                <h2 className="text-xl sm:text-2xl font-serif font-bold mb-4 text-white">3. Start Research</h2>
                                <button onClick={handleStartResearch} disabled={isLoading || activeSession.sources.length === 0} className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-600 flex items-center justify-center text-lg">
                                    {isLoading ? (<><Loader2Icon className="animate-spin -ml-1 mr-3 h-5 w-5"/>{progressMessage || 'Working...'}</>) : (<div className="flex items-center gap-2"><SearchIcon className="w-5 h-5"/><span>Analyze Sources</span></div>)}
                                </button>
                                {error && (<div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm" role="alert"><p>{error}</p></div>)}
                            </div>
                        </aside>
                        <main className="lg:col-span-8 h-full">
                            <div className="p-4 sm:p-6 bg-gray-900/50 border border-gray-800 rounded-xl h-full flex flex-col w-full">
                                {!activeSession.results && !isLoading && (<div className="text-center flex flex-col items-center justify-center h-full"><AcademicCapIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-700"/><h3 className="mt-4 text-xl md:text-2xl font-serif font-bold text-gray-500">Research Workspace</h3><p className="mt-1 text-gray-500">Your generated insights will appear here.</p></div>)}
                                {isLoading && (<div className="text-center flex flex-col items-center justify-center h-full"><Loader2Icon className="w-12 h-12 md:w-16 md:h-16 text-blue-500 animate-spin"/><h3 className="mt-4 text-xl md:text-2xl font-serif font-bold text-gray-400">{progressMessage || 'Initializing...'}</h3></div>)}
                                {activeSession.results && (
                                    <div className="w-full">
                                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 mb-6 pb-4">
                                            <button onClick={() => setActiveTab('summary')} className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base rounded-md ${activeTab === 'summary' ? 'bg-blue-900/70 text-blue-300' : 'text-gray-400 hover:bg-gray-800'}`}>Summary</button>
                                            <button onClick={() => setActiveTab('insights')} className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base rounded-md ${activeTab === 'insights' ? 'bg-blue-900/70 text-blue-300' : 'text-gray-400 hover:bg-gray-800'}`}>Insights</button>
                                            <button onClick={() => setActiveTab('quiz')} className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base rounded-md ${activeTab === 'quiz' ? 'bg-blue-900/70 text-blue-300' : 'text-gray-400 hover:bg-gray-800'}`}>Quiz</button>
                                            <button onClick={() => setActiveTab('sources')} className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base rounded-md ${activeTab === 'sources' ? 'bg-blue-900/70 text-blue-300' : 'text-gray-400 hover:bg-gray-800'}`}>Sources</button>
                                            <button onClick={exportToMarkdown} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-300 bg-blue-900/50 rounded-md hover:bg-blue-900 ml-auto"><DownloadIcon className="w-4 h-4"/>Export</button>
                                        </div>
                                        <div className="prose prose-sm sm:prose-base prose-slate dark:prose-invert max-w-none prose-h2:font-serif break-words">
                                            {activeTab === 'summary' && (<div dangerouslySetInnerHTML={{ __html: marked.parse(activeSession.results.extendedSummary) }}/>)}
                                            {activeTab === 'insights' && (<div><h2 className='font-serif'>Key Insights</h2><ul className="space-y-4">{activeSession.results.insights.map((insight, index) => (<li key={index} className="flex items-start gap-3"><LightBulbIcon className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-1"/><div><p>{insight.content}</p><details className="text-xs text-gray-500 mt-1 cursor-pointer"><summary>Show Evidence</summary><p className="mt-1 p-2 bg-gray-800/50 rounded">{`"${insight.citation.text}"`} - <em>{insight.citation.sourceTitle}</em></p></details></div></li>))}</ul></div>)}
                                            {activeTab === 'quiz' && <QuizComponent quiz={activeSession.results.quiz}/>}
                                            {activeTab === 'sources' && (<div><h2 className='font-serif'>Evidence Sources</h2><div className="space-y-4">{activeSession.results.evidenceChunks.map((chunk) => (<div key={chunk.id} className="p-4 bg-gray-800/50 rounded-md"><p className="font-semibold text-sm mb-1">{chunk.metadata.sourceTitle}</p><p className="text-sm text-gray-400">{chunk.content}</p></div>))}</div></div>)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </main>
                    </div>
                )}
            </div>
        </div>
    );
};

const QuizComponent = ({ quiz }: { quiz: ResearchOutput['quiz']}) => {
    // ... (This component remains the same as before)
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [showQuizResult, setShowQuizResult] = useState(false);

    const quizScore = useMemo(() => {
        return quiz.reduce((score, question, index) => {
            return selectedAnswers[index] === question.correctAnswer ? score + 1 : score;
        }, 0);
    }, [selectedAnswers, quiz]);

    return (
        <div>
            <h2 className='font-serif'>Test Your Knowledge</h2>
            <div className="space-y-6 not-prose">
                {quiz.map((q, qIndex) => (
                    <div key={qIndex}>
                        <p className="font-semibold mb-2">{qIndex + 1}. {q.question}</p>
                        <div className="space-y-2">
                            {q.options.map((option, oIndex) => {
                                const isSelected = selectedAnswers[qIndex] === option;
                                const isCorrect = q.correctAnswer === option;
                                let optionClass = "border-gray-700 hover:bg-gray-800";
                                if (showQuizResult) {
                                    if (isCorrect) optionClass = "bg-green-900/50 border-green-500 text-white";
                                    else if (isSelected && !isCorrect) optionClass = "bg-red-900/50 border-red-500 text-white";
                                }
                                
                                return (
                                <label key={oIndex} className={`block w-full text-left p-3 border rounded-lg cursor-pointer transition-colors ${optionClass}`}>
                                    <input type="radio" name={`question-${qIndex}`} value={option} checked={isSelected} onChange={() => setSelectedAnswers(prev => ({ ...prev, [qIndex]: option }))} disabled={showQuizResult} className="mr-3 accent-blue-400" />
                                    {option}
                                    {/* FIX: Corrected typo from 'showQuiz-result' to 'showQuizResult'. */}
                                    {showQuizResult && isCorrect && <CheckCircleIcon className="inline w-5 h-5 ml-2 text-green-400"/>}
                                    {showQuizResult && isSelected && !isCorrect && <XCircleIcon className="inline w-5 h-5 ml-2 text-red-400"/>}
                                </label>
                            )}
                            )}
                        </div>
                        {showQuizResult && (
                             <div className="mt-2 text-sm p-2 bg-gray-800/50 rounded">
                                <p><strong>Explanation:</strong> {q.explanation}</p>
                                <p className="mt-1 italic text-gray-400"><strong>Source:</strong> "{q.citation.text}" ({q.citation.sourceTitle})</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {!showQuizResult ? (
                <button onClick={() => setShowQuizResult(true)} className="w-full mt-6 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition">Check Answers</button>
            ) : (
                <div className="mt-6 text-center p-4 bg-blue-900/50 rounded-lg">
                    <p className="font-bold text-lg">Your Score: {quizScore} / {quiz.length}</p>
                </div>
            )}
        </div>
    );
};

export default App;
