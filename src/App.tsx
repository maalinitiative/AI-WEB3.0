/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Cpu, 
  Globe, 
  Zap, 
  Award, 
  Trophy, 
  Users, 
  Wallet, 
  ChevronRight, 
  Play,
  Github,
  Twitter,
  Facebook,
  Linkedin,
  Share2,
  FileText,
  Download,
  ExternalLink,
  Database,
  Plus,
  RefreshCw,
  Check,
  CheckCircle2,
  Lock,
  AlertCircle,
  Table2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';

// Import Google auth & sheets services
import { initAuth, googleSignIn, logout, getAccessToken } from './lib/firebaseAuth';
import { createSpreadsheet, initializeSheetHeaders, appendAttendeeRow, fetchAttendeeRows } from './lib/sheetsService';
import type { Attendee } from './lib/sheetsService';
import type { User } from 'firebase/auth';


// --- Constants & Types ---

const COLORS = {
  orange: '#f97316',
  blue: '#2563eb',
  navy: '#1e3a8a',
  light: '#f8fafc'
};

const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "Which transformational force unlocks faster and highly scalable operations?",
    options: ["Manual Labor", "Automation", "Traditional Printing", "Central Banking"],
    answer: 1
  },
  {
    id: 2,
    question: "What is the key objective mentioned for the workshop?",
    options: ["Sell hardware", "Inspire building in the digital economy", "Repair computers", "Mining only"],
    answer: 1
  },
  {
    id: 3,
    question: "One Laptop + Internet equals what in the new digital era?",
    options: ["Entertainment only", "Local business only", "Global Opportunity", "Offline storage"],
    answer: 2
  },
  {
    id: 4,
    question: "What are the core components of Web3.0?",
    options: ["Social feeds and ads", "Centralized servers", "Ownership, decentralization, blockchain", "Static read-only pages"],
    answer: 2
  }
];

// --- Components ---

const GlowingButton = ({ 
  children, 
  className, 
  variant = 'primary', 
  onClick,
  icon: Icon
}: { 
  children: React.ReactNode; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'outline';
  onClick?: () => void;
  icon?: any;
}) => {
  const baseClasses = "relative px-8 py-3 rounded-full font-bold transition-all duration-300 flex items-center gap-2 overflow-hidden group";
  const variants = {
    primary: "bg-[#F58220] text-white hover:bg-[#e67610] shadow-[0_0_20px_rgba(245,130,32,0.4)]",
    secondary: "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_0_20px_rgba(37,99,235,0.4)]",
    outline: "border-2 border-[#F58220] text-[#F58220] hover:bg-[#F58220]/10",
  };

  return (
    <motion.button 
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(baseClasses, variants[variant], className)}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </motion.button>
  );
};

const GlassCard = ({ children, className, glowColor = 'cyan', ...props }: { children: React.ReactNode; className?: string; glowColor?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    {...props}
    className={cn(
      "relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-hidden",
      glowColor === 'cyan' ? "hover:border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.1)]" : "hover:border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]",
      className
    )}
  >
    <div className={cn(
      "absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-20 pointer-events-none rounded-full",
      glowColor === 'cyan' ? "bg-cyan-500" : "bg-purple-500"
    )} />
    {children}
  </div>
);

// --- Sections ---

export default function App() {
  const [quizActive, setQuizActive] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [quizPassed, setQuizPassed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('maal_quiz_passed') === 'true';
    }
    return false;
  });

  // --- Google Sheets Integration States ---
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('maal_spreadsheet_id') || '';
    }
    return '';
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingRows, setIsLoadingRows] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [regForm, setRegForm] = useState({ name: '', email: '', phone: '' });
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Initialize Auth and Listeners
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setSheetsError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync rows from Google Sheets
  const refreshAttendees = async (currentToken = token, currentSheetId = spreadsheetId) => {
    if (!currentToken || !currentSheetId) return;
    setIsLoadingRows(true);
    try {
      const rows = await fetchAttendeeRows(currentToken, currentSheetId);
      setAttendees(rows);
      setSheetsError(null);
    } catch (err: any) {
      console.error('Failed to sync google sheets data:', err);
      setSheetsError('Sheet unreachable. Please make sure spreadsheet ID is correct and you have permission.');
    } finally {
      setIsLoadingRows(false);
    }
  };

  useEffect(() => {
    if (token && spreadsheetId) {
      refreshAttendees(token, spreadsheetId);
    }
  }, [token, spreadsheetId]);

  // Auth Actions
  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setSheetsError(null);
        if (spreadsheetId) {
          refreshAttendees(result.accessToken, spreadsheetId);
        }
      }
    } catch (err: any) {
      console.error('Login action failed:', err);
      setSheetsError('Failed login with Google.');
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setAttendees([]);
  };

  const handleCreateAutoSheet = async () => {
    if (!token) {
      setSheetsError('Saxeex: Fadlan horta koontadaada Google ku xir.');
      return;
    }
    setIsCreatingSheet(true);
    setSheetsError(null);
    try {
      const newSheetId = await createSpreadsheet(token, 'Maal Initiative - Workshop Attendee List');
      await initializeSheetHeaders(token, newSheetId);
      setSpreadsheetId(newSheetId);
      localStorage.setItem('maal_spreadsheet_id', newSheetId);
      // Wait for 1 second and sync
      setTimeout(() => {
        refreshAttendees(token, newSheetId);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      setSheetsError('Ma suurtagelin in la abuuro Google Sheet cusub.');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleManualSheetSave = (newVal: string) => {
    setSpreadsheetId(newVal);
    localStorage.setItem('maal_spreadsheet_id', newVal);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.email || !regForm.phone) {
      alert('Fadlan wada geli dhammaan macluumaadka la rabo.');
      return;
    }

    setIsSubmittingReg(true);
    try {
      const timestamp = new Date().toLocaleString();
      const newAttendee: Attendee = {
        name: regForm.name,
        email: regForm.email,
        phone: regForm.phone,
        quizCompleted: quizPassed ? 'Yes' : 'No',
        score: quizPassed ? `${score}/${QUIZ_QUESTIONS.length}` : 'N/A',
        timestamp: timestamp
      };

      // If spreadsheet connected, save to Google Sheets!
      if (token && spreadsheetId) {
        await appendAttendeeRow(token, spreadsheetId, newAttendee);
        // Refresh list
        await refreshAttendees(token, spreadsheetId);
      } else {
        // Fallback local persistence list
        setAttendees(prev => [newAttendee, ...prev]);
      }

      setRegSuccess(true);
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.8 },
        colors: [COLORS.orange, '#ffffff']
      });

      // Clear form
      setRegForm({ name: '', email: '', phone: '' });
    } catch (err: any) {
      console.error('Registration failed:', err);
      alert('Diiwaangelintu wey fashilantay: ' + err.message);
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 200]);

  const handleClaimLink = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (quizPassed) {
      window.open("https://www.maalinitiative.com/claim-badge", "_blank", "noopener,noreferrer");
    } else {
      const el = document.getElementById('quiz');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const shareOnSocial = (platform: 'twitter' | 'facebook' | 'linkedin') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Join me at the AI + WEB3.0 Workshop by Maal Initiative! The future of digital business in Somalia. 🚀");
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`
    };
    
    window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
  };

  const SocialShareBar = ({ className, label = "Share event:" }: { className?: string; label?: string }) => (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</span>
      <div className="flex gap-2">
        <button onClick={() => shareOnSocial('twitter')} className="p-2 bg-white/5 rounded-lg hover:bg-[#1DA1F2] hover:text-white transition-all border border-white/10"><Twitter className="w-4 h-4" /></button>
        <button onClick={() => shareOnSocial('facebook')} className="p-2 bg-white/5 rounded-lg hover:bg-[#4267B2] hover:text-white transition-all border border-white/10"><Facebook className="w-4 h-4" /></button>
        <button onClick={() => shareOnSocial('linkedin')} className="p-2 bg-white/5 rounded-lg hover:bg-[#0077B5] hover:text-white transition-all border border-white/10"><Linkedin className="w-4 h-4" /></button>
      </div>
    </div>
  );

  // Quiz Timer
  useEffect(() => {
    let timer: any;
    if (quizActive && !quizComplete && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !quizComplete) {
      handleNextQuestion();
    }
    return () => clearInterval(timer);
  }, [quizActive, quizComplete, timeLeft]);

  const playBeep = (freq: number, duration: number) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  };

  const handleNextQuestion = (selectedOption?: number) => {
    if (selectedOption === QUIZ_QUESTIONS[currentQuestion].answer) {
      setScore(prev => prev + 1);
      playBeep(880, 0.1); // Success beep
    } else if (selectedOption !== undefined) {
      playBeep(440, 0.2); // Error beep
    }

    if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setTimeLeft(15);
    } else {
      setQuizComplete(true);
      if (score === QUIZ_QUESTIONS.length || (selectedOption === QUIZ_QUESTIONS[currentQuestion].answer && score === QUIZ_QUESTIONS.length - 1)) {
        setQuizPassed(true);
        localStorage.setItem('maal_quiz_passed', 'true');
      }
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [COLORS.orange, COLORS.blue, '#ffffff']
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-sans overflow-x-hidden selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-cyan-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100" />
        <div className="grid-background absolute inset-0 opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 py-4 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto max-w-6xl px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex items-center gap-2 sm:gap-3">
               <div className="text-xl sm:text-2xl font-black tracking-tighter text-[#F58220]">MAAL</div>
               <div className="h-6 w-px bg-white/20" />
               <div className="text-[8px] sm:text-[10px] leading-tight font-medium opacity-70 max-w-[80px] sm:max-w-[120px]">
                 Center for Creativity, Entrepreneurship & Innovation
               </div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <a href="#hero" className="hover:text-[#F58220] transition-colors">Portal</a>
            <a href="#resources" className="hover:text-[#F58220] transition-colors">Resources</a>
            <button onClick={handleClaimLink} className="hover:text-[#F58220] transition-colors text-orange-500 font-bold">Claim NFT</button>
          </div>

          <button 
            onClick={handleClaimLink}
            className="px-3 sm:px-5 py-2 rounded-full border-0 sm:border border-orange-500/50 text-orange-400 text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all hover:bg-orange-500/10 shadow-none sm:shadow-[0_0_15px_rgba(245,130,32,0.2)] whitespace-nowrap"
          >
            <Award className="w-3.5 h-3.5 sm:w-4 h-4" /> Claim NFT
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Animated Particles (Simplified) */}
        <div className="absolute inset-0 z-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              animate={{
                y: [Math.random() * 800, Math.random() * 800],
                x: [Math.random() * 1200, Math.random() * 1200],
                opacity: [0.2, 0.8, 0.2],
              }}
              transition={{
                duration: 5 + Math.random() * 10,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#F58220] text-xs font-black tracking-widest uppercase mb-4">
                  <Zap className="w-3 h-3 fill-orange-500" />
                  Free Workshop 2026
                </div>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1]">
                  AI + <span className="text-[#F58220]">WEB3.0</span>
                  <br />
                  <span className="text-white/90 italic">The Future of Digital Businesses</span>
                </h1>
              </motion.div>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="text-white/60 text-lg md:text-xl max-w-2xl"
              >
                Learn directly from <strong>Osman A. Mohamed</strong>, Founder of Maal Initiative & Web3 Mentor. We inspire the Somali generation to start building in the digital economy.
              </motion.p>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                  <button 
                    onClick={handleClaimLink}
                    className="px-8 py-3 bg-[#F58220] text-white rounded-full font-black text-sm shadow-[0_0_20px_rgba(245,130,32,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <Award className="w-5 h-5" /> Claim NFT
                  </button>
                  <div className="flex items-center gap-6 px-6">
                  <div className="text-center">
                    <div className="text-2xl font-black">21 MAY</div>
                    <div className="text-[10px] uppercase opacity-50 tracking-wider">Date 2026</div>
                  </div>
                  <div className="w-px h-10 bg-white/10" />
                  <div className="text-center">
                    <div className="text-2xl font-black">4:00 PM</div>
                    <div className="text-[10px] uppercase opacity-50 tracking-wider">Start Time</div>
                  </div>
                </div>
              </div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-8"
              >
                <SocialShareBar />
              </motion.div>
            </div>

            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               className="flex-1 relative"
            >
               <div className="relative w-full aspect-square max-w-sm mx-auto group">
                 <div className="absolute inset-0 bg-gradient-to-br from-[#F58220]/20 to-blue-600/20 rounded-3xl blur-2xl group-hover:scale-110 transition-transform" />
                 <div className="relative h-full w-full bg-[#111] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                    <img 
                      src="/osman.jpeg" 
                      className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" 
                      alt="Osman A. Mohamed" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
                       <h3 className="text-2xl font-black">Osman A. Mohamed</h3>
                       <p className="text-[#F58220] font-bold text-sm">Founder of Maal Initiative & Web3 Mentor</p>
                    </div>
                 </div>
               </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Resource & Knowledge Hub Section */}
      <section id="resources" className="py-24 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-black tracking-widest uppercase mb-6">
            Workshop Knowledge Hub
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-6">GRAB THE <span className="text-orange-500">KNOWLEDGE</span></h2>
          <p className="text-white/40 mb-12 max-w-2xl mx-auto">Access all workshop artifacts, test your learning, and claim your verifiable Proof of Knowledge NFT.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {/* PDF Slide Card */}
             <GlassCard className="flex flex-col items-center p-8 group hover:border-orange-500/50 transition-colors h-full">
                <FileText className="w-12 h-12 text-orange-500 mb-4" />
                <h3 className="font-bold mb-2">Workshop Slides</h3>
                <p className="text-xs text-white/40 mb-6 flex-grow">Download the full 17-page presentation on AI, Web3, and future digital business models.</p>
                <a 
                  href="/Workshop_Slides.pdf" 
                  download 
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-orange-500 hover:text-black transition-all flex items-center justify-center gap-2 mb-4"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </a>
                <div className="flex gap-2 pt-2 border-t border-white/5 w-full justify-center">
                   <button onClick={() => shareOnSocial('twitter')} className="text-white/20 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('facebook')} className="text-white/20 hover:text-[#4267B2] transition-colors"><Facebook className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('linkedin')} className="text-white/20 hover:text-[#0077B5] transition-colors"><Linkedin className="w-3 h-3" /></button>
                </div>
             </GlassCard>

             {/* Quiz Card */}
             <GlassCard className="flex flex-col items-center p-8 group hover:border-cyan-500/50 transition-colors h-full">
                <Trophy className="w-12 h-12 text-cyan-500 mb-4" />
                <h3 className="font-bold mb-2">Knowledge Quiz</h3>
                <p className="text-xs text-white/40 mb-6 flex-grow">Test what you've learned from Osman and qualify for advanced workshop certificates.</p>
                <button 
                  onClick={() => {
                    document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-cyan-600 transition-all flex items-center justify-center gap-2 mb-4"
                >
                  <Play className="w-4 h-4" /> Take Quiz
                </button>
                <div className="flex gap-2 pt-2 border-t border-white/5 w-full justify-center">
                   <button onClick={() => shareOnSocial('twitter')} className="text-white/20 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('facebook')} className="text-white/20 hover:text-[#4267B2] transition-colors"><Facebook className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('linkedin')} className="text-white/20 hover:text-[#0077B5] transition-colors"><Linkedin className="w-3 h-3" /></button>
                </div>
             </GlassCard>

             {/* Resource Hub Card */}
             <GlassCard className="flex flex-col items-center p-8 group hover:border-blue-500/50 transition-colors h-full">
                <Cpu className="w-12 h-12 text-blue-500 mb-4" />
                <h3 className="font-bold mb-2">AI & Web3 Tools</h3>
                <p className="text-xs text-white/40 mb-6 flex-grow">Explore the recommended tools used during the practical sessions of the workshop.</p>
                <button className="w-full py-3 bg-white/5 border border-white/10 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all flex items-center justify-center gap-2 mb-4">
                  <Globe className="w-4 h-4" /> View Tools
                </button>
                <div className="flex gap-2 pt-2 border-t border-white/5 w-full justify-center">
                   <button onClick={() => shareOnSocial('twitter')} className="text-white/20 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('facebook')} className="text-white/20 hover:text-[#4267B2] transition-colors"><Facebook className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('linkedin')} className="text-white/20 hover:text-[#0077B5] transition-colors"><Linkedin className="w-3 h-3" /></button>
                </div>
             </GlassCard>

             {/* Claim NFT Card */}
             <GlassCard className="flex flex-col items-center p-8 group hover:border-green-500/50 transition-colors h-full border-green-500/20">
                <Award className="w-12 h-12 text-green-500 mb-4" />
                <h3 className="font-bold mb-2">Claim Your NFT</h3>
                <p className="text-xs text-white/40 mb-6 flex-grow">Get your verifiable 'Proof of Knowledge' badge on-chain for attending the Maal Event.</p>
                <button 
                  onClick={handleClaimLink}
                  className="w-full py-3 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl font-bold text-sm hover:bg-green-500 hover:text-black transition-all flex items-center justify-center gap-2 mb-4"
                >
                  <Award className="w-4 h-4" /> Claim Badges
                </button>
                <div className="flex gap-2 pt-2 border-t border-white/5 w-full justify-center">
                   <button onClick={() => shareOnSocial('twitter')} className="text-white/20 hover:text-[#1DA1F2] transition-colors"><Twitter className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('facebook')} className="text-white/20 hover:text-[#4267B2] transition-colors"><Facebook className="w-3 h-3" /></button>
                   <button onClick={() => shareOnSocial('linkedin')} className="text-white/20 hover:text-[#0077B5] transition-colors"><Linkedin className="w-3 h-3" /></button>
                </div>
             </GlassCard>
          </div>
        </div>
      </section>

      {/* Google Sheets Integration & Registration Hub */}
      <section id="registration" className="py-24 px-6 relative border-b border-white/5 bg-gradient-to-b from-black to-[#050505]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black tracking-widest uppercase mb-4">
              <Database className="w-3.5 h-3.5" />
              Google Sheets Synced Portal
            </div>
            <h2 className="text-3xl md:text-5xl font-black mb-4">
              DIIWAANGELINTA & <span className="text-[#F58220]">INTEGRATION-KA</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              Saxeex si aad u xaqiijiso gelitaankaaga workshop-ka, dhaliso dhibcahaaga quiz-ka, oo si toos ah magacaaga ugu qorto shaxda Google Sheets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Registration Form Card */}
            <div className="lg:col-span-7">
              <GlassCard glowColor="purple" className="relative p-8 md:p-10 border-white/10 bg-black/60">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {spreadsheetId ? 'Google Sheets: Synced' : 'Ready / Active'}
                </div>

                <h3 className="text-2xl font-black mb-1">Cadalad isku qor</h3>
                <p className="text-white/40 text-sm mb-6">Wada geli xogtaada saxda ah si aad shahaadada dambe u hesho.</p>

                {regSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-4"
                  >
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                    <h4 className="text-xl font-bold">Guul! Aad baad u mahadsantahay</h4>
                    <p className="text-sm text-white/70">
                      Diiwaangelintaada si toos ah ayaa loo hagaajiyay. Magacaaga hadda waxaad ku arki kartaa liiska hoose!
                    </p>
                    <button 
                      onClick={() => setRegSuccess(false)}
                      className="px-5 py-2 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors"
                    >
                      Diiwaangeli qof kale
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-white/50 mb-2">Magacaaga Oo Buuxa (Full Name)</label>
                      <input 
                        type="text"
                        required
                        value={regForm.name}
                        onChange={e => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Tusaale: Maxamed Cali"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#F58220] focus:ring-0 text-white text-sm outline-none transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-white/50 mb-2">Email-kaaga (Email Address)</label>
                      <input 
                        type="email"
                        required
                        value={regForm.email}
                        onChange={e => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="tusaale@gmail.com"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#F58220] focus:ring-0 text-white text-sm outline-none transition-all placeholder:text-white/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-white/50 mb-2">Lambarka Taleefanka / WhatsApp</label>
                      <input 
                        type="tel"
                        required
                        value={regForm.phone}
                        onChange={e => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+252 61xxxxxxx"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-[#F58220] focus:ring-0 text-white text-sm outline-none transition-all placeholder:text-white/20"
                      />
                    </div>

                    {quizPassed && (
                      <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-xl flex items-center gap-3 text-xs text-cyan-400">
                        <Award className="w-5 h-5 flex-shrink-0 text-cyan-400" />
                        <div>
                          <strong>Quiz complete sifiican ayaad u baastay!</strong> Dhibcahaaga oo ah <span className="font-bold">{score}/{QUIZ_QUESTIONS.length}</span> waxaa lagu kaydin doonaa shaxda dhexdeeda.
                        </div>
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={isSubmittingReg}
                      className="w-full py-4 bg-gradient-to-r from-[#F58220] to-orange-600 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl font-bold text-sm tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,130,32,0.2)] mt-2"
                    >
                      {isSubmittingReg ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Gelinaya xogta...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Diiwaangeli Hadda
                        </>
                      )}
                    </button>
                  </form>
                )}
              </GlassCard>
            </div>

            {/* Google Sheets Live Configuration panel */}
            <div className="lg:col-span-5 space-y-6">
              <GlassCard glowColor="cyan" className="p-6 md:p-8 border-white/15 bg-black/60 space-y-6">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2">
                    <Table2 className="text-[#F58220] w-5 h-5" />
                    Admin Google Sheets
                  </h3>
                  <p className="text-xs text-white/40 mt-1">
                    Maal Initiative Workshop settings: Ku xir oo ku dhal liiska is-diiwaangeliyayaasha 1-Click!
                  </p>
                </div>

                {sheetsError && (
                  <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/20 text-xs text-rose-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{sheetsError}</span>
                  </div>
                )}

                {/* Google Sign-in state block */}
                {!user ? (
                  <div className="space-y-4">
                    <p className="text-xs text-white/50 leading-relaxed">
                      Ku xir koontadaada Gmail-ka / Google-ka si nidaamka uu kuu abuuro Google Sheet gabi ahaanba isku xiran oo toos ah.
                    </p>
                    
                    <button 
                      onClick={handleGoogleLogin}
                      className="w-full py-3 bg-white hover:bg-neutral-100 flex items-center justify-center gap-3 rounded-xl transition-all cursor-pointer border border-[#c4c7c5] shadow-sm select-none"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      <span className="text-black text-sm font-semibold select-none">Ku xir Google Sheets</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Logged in profile */}
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs">
                      {user.photoURL ? (
                        <img src={user.photoURL} className="w-8 h-8 rounded-full border border-white/10" alt="google avatar" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-cyan-400">
                          {user.displayName?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-white truncate">{user.displayName || 'Google Connected'}</div>
                        <div className="opacity-40 truncate">{user.email}</div>
                      </div>
                      <button 
                        onClick={handleGoogleLogout}
                        className="text-[10px] text-red-400 hover:underline hover:text-red-300 flex-shrink-0"
                      >
                        Ka saar
                      </button>
                    </div>

                    {/* Spreadsheet generator / linker */}
                    <div className="space-y-3">
                      {!spreadsheetId ? (
                        <div className="space-y-3 bg-[#F58220]/5 border border-[#F58220]/15 p-4 rounded-xl">
                          <p className="text-[11px] text-[#F58220] leading-relaxed">
                            Nidaamka wuxuu halkan ku diyaarinayaa template dhan oo isku booriyey dhibcaha, emailada iyo taleefoonada dadka diiwaangeliyey.
                          </p>
                          <button 
                            onClick={handleCreateAutoSheet}
                            disabled={isCreatingSheet}
                            className="w-full py-2.5 bg-[#F58220] hover:bg-[#e67610] disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                          >
                            {isCreatingSheet ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Abuuraya Spreadsheet-ka...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4" /> 1-Click: Create Auto Sheet
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Auto Sync Shidan
                            </span>
                            <a 
                              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                            >
                              Fure Google Sheet <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>

                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={spreadsheetId}
                              onChange={e => handleManualSheetSave(e.target.value)}
                              placeholder="Spreadsheet ID"
                              className="flex-grow px-3 py-2 text-xs bg-white/5 border border-white/5 rounded-lg outline-none font-mono text-white/60 focus:border-cyan-500/40"
                            />
                            <button 
                              onClick={() => refreshAttendees()}
                              title="Sync Rows"
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-colors"
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5", isLoadingRows && "animate-spin")} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Secure Info Shield */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-white/5 flex gap-3 text-[11px] text-white/40">
                <Lock className="w-5 h-5 flex-shrink-0 text-[#F58220] mt-0.5" />
                <p className="leading-relaxed">
                  We collect your info locally and sync on your side safely. The authentication is direct with Google Identity System: credentials never touch servers.
                </p>
              </div>
            </div>
          </div>

          {/* Live Synced List of Workshop Attendees */}
          <GlassCard glowColor="cyan" className="mt-12 bg-black/40 border-white/10 p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h4 className="text-xl font-black uppercase text-white tracking-wide">
                  Dadka Is-Diiwaangeliyey (Attendee Roster)
                </h4>
                <p className="text-xs text-white/40 mt-1">
                  {spreadsheetId ? 'Wuxuu si toos ah ula jaanqaadaa Google Spreadsheet-ka ku xiran.' : 'Currently showing session subscribers locally.'}
                </p>
              </div>

              {spreadsheetId && token && (
                <button 
                  onClick={() => refreshAttendees()}
                  disabled={isLoadingRows}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-cyan-400 hover:bg-white/10 transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", isLoadingRows && "animate-spin")} />
                  Refresh List
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5 bg-black/20">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-white/5 text-white/60 font-bold border-b border-white/5 uppercase tracking-widest text-[9px]">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Phone / WhatsApp</th>
                    <th className="p-4 text-center">Quiz Passed</th>
                    <th className="p-4 text-center">Quiz Score</th>
                    <th className="p-4 text-right">Time Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {isLoadingRows ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/30">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[#F58220]" />
                          Downloading data from Google Sheets...
                        </div>
                      </td>
                    </tr>
                  ) : attendees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-white/30">
                        In ka yar 1 qof ayaa hadda ku qoran liiska. Noqo qofka u horreeya oo is-diiwaangeli!
                      </td>
                    </tr>
                  ) : (
                    attendees.map((att, index) => (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-bold text-white">{att.name}</td>
                        <td className="p-4 font-mono text-white/50">{att.email}</td>
                        <td className="p-4 text-white/50">{att.phone}</td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-bold",
                            att.quizCompleted === 'Yes' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-neutral-500/10 text-neutral-400 border border-neutral-500/20"
                          )}>
                            {att.quizCompleted}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-cyan-400">{att.score}</td>
                        <td className="p-4 text-right text-white/30 font-mono text-[10px]">{att.timestamp}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Global Speakers Section */}
      <section id="speakers" className="py-24 px-6 bg-black">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-4 uppercase">
              Global <span className="text-orange-500">Speakers</span>
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">Mentors and visionaries leading the digital transformation in the Somali ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {[
              { 
                name: "Osman A. Mohamed", 
                role: "Founder of Maal Initiative & Web3 Mentor", 
                desc: "Visionary leader inspiring the next generation of Somali digital builders through AI education and Web3 advocacy.",
                img: "/osman.jpeg"
              },
              { 
                name: "Abdisatar Arabow", 
                role: "Director of Center for Creativity", 
                desc: "Leading entrepreneurial innovation and technical excellence at the MU Campus.",
                img: "/arabow.png"
              }
            ].map((speaker, i) => (
              <GlassCard key={i} className="flex flex-col md:flex-row gap-8 items-center text-center md:text-left hover:border-orange-500/30 transition-all p-10">
                <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-white/10 group flex-shrink-0">
                  <img src={speaker.img} alt={speaker.name} className="w-full h-full object-cover transition-all duration-500" />
                </div>
                <div>
                  <h4 className="text-2xl font-black mb-1">{speaker.name}</h4>
                  <p className="text-[#F58220] font-bold text-sm mb-4 uppercase tracking-wider">{speaker.role}</p>
                  <p className="text-white/50 text-sm leading-relaxed">{speaker.desc}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>


      {/* Quiz Section */}
      <section id="quiz" className="py-24 px-6 relative">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3">
              <Trophy className="text-yellow-500 w-10 h-10" />
              THE AI-WEB3 TRIVIA
            </h2>
            <p className="text-white/50 mt-2">Test your knowledge to win premium NFT badges</p>
          </div>

          <GlassCard className="min-h-[400px] flex flex-col items-center justify-center">
            {!quizActive ? (
              <div className="text-center space-y-6 flex flex-col items-center justify-center">
                <div className="p-4 bg-cyan-500/10 rounded-full inline-block">
                  <Play className="w-12 h-12 text-cyan-500" />
                </div>
                <h3 className="text-2xl font-bold">Ready to start?</h3>
                <p className="text-white/60 max-w-md mx-auto">You'll have 15 seconds per question. Top scorers get access to VIP networking channels.</p>
                <div className="flex justify-center w-full">
                  <GlowingButton variant="primary" onClick={() => setQuizActive(true)}>Start Challenge</GlowingButton>
                </div>
              </div>
            ) : quizComplete ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-20 animate-pulse" />
                  <Trophy className="w-24 h-24 text-yellow-500 relative z-10" />
                </div>
                <h3 className="text-4xl font-black">CHAMPION!</h3>
                <p className="text-xl">You scored <span className="text-cyan-400 font-bold">{score}/{QUIZ_QUESTIONS.length}</span></p>
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  <GlowingButton variant="secondary" icon={Award} onClick={handleClaimLink}>Claim NFT Certificate</GlowingButton>
                  <button 
                    onClick={() => {
                      setQuizActive(false);
                      setQuizComplete(false);
                      setCurrentQuestion(0);
                      setScore(0);
                      setTimeLeft(15);
                    }}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="w-full space-y-8">
                {/* Progress Bar */}
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentQuestion / QUIZ_QUESTIONS.length) * 100}%` }}
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600"
                  />
                </div>

                <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest text-white/50">
                  <span>Question {currentQuestion + 1}/{QUIZ_QUESTIONS.length}</span>
                  <div className={cn(
                    "px-3 py-1 rounded-md border",
                    timeLeft < 5 ? "border-red-500/50 text-red-500 bg-red-500/10 animate-pulse" : "border-cyan-500/50 text-cyan-400"
                  )}>
                    00:{timeLeft.toString().padStart(2, '0')}
                  </div>
                </div>

                <h3 className="text-2xl md:text-3xl font-bold">{QUIZ_QUESTIONS[currentQuestion].question}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {QUIZ_QUESTIONS[currentQuestion].options.map((option, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02, backgroundColor: 'rgba(6, 182, 212, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNextQuestion(idx)}
                      className="p-5 text-left rounded-xl border border-white/10 bg-white/5 hover:border-cyan-500/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-black group-hover:bg-cyan-500 group-hover:text-black">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        {option}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </section>


      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 bg-black">
        <div className="container mx-auto max-w-4xl text-center">
           <div className="text-2xl font-black text-orange-500 mb-4">MAAL INITIATIVE</div>
           <p className="text-white/40 text-sm mb-8">Together we build the future of the Somali digital generation.</p>
           <div className="flex justify-center gap-6 mb-12">
             <a href="https://x.com/MaalInitiative" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-orange-500 hover:text-black transition-all"><Twitter className="w-5 h-5" /></a>
             <a href="https://github.com/maalinitiative" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-orange-500 hover:text-black transition-all"><Github className="w-5 h-5" /></a>
             <a href="https://www.maalinitiative.com/" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-orange-500 hover:text-black transition-all"><Globe className="w-5 h-5" /></a>
           </div>
           <div className="text-[10px] font-black tracking-[0.3em] opacity-20 uppercase">
             © 2026 MAAL INITIATIVE • SOMALIA
           </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .grid-background {
          background-image: linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
