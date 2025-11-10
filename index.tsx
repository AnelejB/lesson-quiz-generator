import React, { useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from "react";
import { createRoot } from "react-dom/client";
// Fix: Removed Modality from import as it's replaced by a string literal to avoid potential type errors.
import { GoogleGenAI, Type, Chat } from "@google/genai";
import "./style.css";

declare const pdfjsLib: any;

/**
 * Custom AbortError class to ensure it's available in all environments.
 * The native AbortError is not always present.
 */
class AbortError extends Error {
    constructor(message?: string) {
        super(message || "The operation was aborted.");
        this.name = 'AbortError';
    }
}

// --- i18n/Translations ---

const translations = {
    en: {
        // Welcome
        welcome_title: "Welcome to Lesson Quiz Generator",
        welcome_subtitle: "Your personal AI study buddy. Create lessons from text or files and generate quizzes to test your knowledge.",
        welcome_placeholder: "Enter your name to begin",
        welcome_cta: "Start Studying",
        // Dashboard
        dashboard_greeting: "Welcome back, {userName}!",
        dashboard_logout: "Log Out",
        dashboard_lessons_title: "Your Lessons",
        dashboard_created_date: "Created: {date}",
        dashboard_no_lessons: "You have no lessons yet. Create one to get started!",
        dashboard_create_new: "+ Create New Lesson",
        // Create Lesson
        create_back_to_dashboard: "Back to Dashboard",
        create_title: "Create a New Lesson",
        create_lesson_name_placeholder: "Enter a name for this lesson",
        create_type_text: "Text",
        create_type_file: "File (Image/PDF)",
        create_text_placeholder: "Paste your lesson text here...",
        create_file_change: "Change File",
        create_file_choose: "Choose a file",
        create_unsupported_file: "Unsupported file: {name}",
        create_progress_creating: "Creating Lesson...",
        create_progress_preparing: "Preparing...",
        create_progress_processing_image: "Processing image...",
        create_progress_reading_pdf: "Reading PDF file...",
        create_progress_extracting_text_pdf: "Extracting text from PDF...",
        create_progress_extracting_text_image: "Extracting text from image...",
        create_cta: "Create Lesson",
        create_cta_creating: "Creating...",
        // Alerts
        alert_enter_lesson_name: "Please enter a name for this lesson.",
        alert_enter_lesson_text: "Please enter some text for the lesson.",
        alert_upload_file: "Please upload a file.",
        alert_unsupported_file_type: "Unsupported file type: {type}. Please upload an image or PDF.",
        alert_could_not_create_payload: "Could not create lesson payload.",
        alert_ocr_failed: "Could not extract text from the image.",
        // View Lesson
        view_mastery: "Mastery",
        view_phase1_title: "Before You Begin",
        view_objectives_title: "Learning Objectives",
        view_objectives_loading: "Loading objectives...",
        view_objectives_none: "No objectives available.",
        view_objectives_error: "Could not generate learning objectives for this lesson.",
        view_pka_title: "Prior Knowledge Activation",
        view_pka_prompt: "<b>Brain Drain:</b> Before you begin, write down everything you already know about this topic.",
        view_pka_placeholder: "Don't worry about being right or wrong—just activate your memory!",
        view_phase2_title: "Lesson Content",
        view_phase3_title: "Study Tools: Check Your Understanding",
        view_tool_summarize: "Generate Key Takeaways",
        view_tool_flashcards: "Practice Recall with Flashcards",
        view_tool_quiz: "Test Your Knowledge",
        view_tool_mindmap: "Visualize Connections",
        view_tool_tutor: "Get Help from Your AI Tutor",
        view_create_flashcard_from_highlight: "Create Flashcard",
        notification_creating_flashcard: "Generating flashcard...",
        notification_flashcard_created: "Flashcard created! **Front:** {front}",
        notification_flashcard_failed: "Failed to create flashcard.",
        // Flashcard Flow
        flashcard_back_to_lesson: "Back to Lesson",
        flashcard_options_title: "Flashcard Options for {lessonName}",
        flashcard_settings_title: "Settings",
        flashcard_number_label: "Number of Flashcards: {num}",
        flashcard_cta_cancel: "Cancel",
        flashcard_cta_generate: "Generate Flashcards",
        flashcard_progress_generating: "Generating...",
        flashcard_progress_part: "Generating flashcards (Part {i} of {count})...",
        flashcard_error_no_cards: "The AI did not return any flashcards. The content might be too short or in an unreadable format. Please try again with different text.",
        flashcard_view_back_to_options: "Back to Options",
        flashcard_view_title: "Flashcards",
        flashcard_view_no_cards_title: "No Flashcards Generated",
        flashcard_view_no_cards_message: "The AI could not generate flashcards from the selected content. Please try again with different options.",
        flashcard_view_progress: "Card {current} of {total}",
        flashcard_view_prev: "Previous",
        flashcard_view_next: "Next",
        // Quiz Flow
        quiz_back_to_lesson: "Back to Lesson",
        quiz_options_title: "Quiz Options for {lessonName}",
        quiz_difficulty: "Difficulty",
        quiz_difficulty_normal: "Normal",
        quiz_difficulty_hard: "Hard",
        quiz_number_label: "Number of Questions: {num}",
        quiz_cta_generate: "Generate Quiz",
        quiz_progress_part: "Generating questions (Part {i} of {count})...",
        quiz_error_no_content: "No content found for the lesson text.",
        quiz_error_generic: "Could not generate quiz. {error}",
        quiz_error_json: "The AI returned an invalid response that was not valid JSON. This can be intermittent. Please try generating the quiz again.",
        quiz_view_back_to_options: "Back to Options",
        quiz_view_title: "Quiz Time!",
        quiz_view_correct_answer: "Correct answer: {answer}",
        quiz_view_submit: "Submit Quiz",
        quiz_view_score: "Your Score: {score} / {total}",
        quiz_view_try_again: "Try Again",
        // Summary Flow
        summary_back_to_lesson: "Back to Lesson",
        summary_title: "Lesson Summary",
        summary_comprehensive_title: "Comprehensive Study Summary",
        summary_takeaways_title: "Top 5 Key Takeaways",
        summary_audio_generating: "Generating...",
        summary_audio_stop: "Stop",
        summary_audio_listen: "Listen",
        summary_flow_cancel: "Cancel",
        summary_flow_generating_title: "Generating Summary...",
        summary_flow_generating_text: "The AI is reading and summarizing your lesson...",
        summary_flow_generating_note: "This may take a moment for longer documents.",
        summary_flow_error_title: "Error Generating Summary",
        // Mind Map Flow
        mindmap_back_to_lesson: "Back to Lesson",
        mindmap_title: "Concept Map for {name}",
        mindmap_error_title: "Could Not Generate Mind Map",
        mindmap_error_message: "The AI could not generate a mind map from the provided content. The text may be too short or the format might be unsupported.",
        mindmap_flow_cancel: "Cancel",
        mindmap_flow_generating_title: "Generating Mind Map...",
        mindmap_flow_generating_text: "The AI is analyzing concepts and relationships...",
        mindmap_flow_error_title: "Error Generating Mind Map",
        // Tutor Chat
        tutor_back_to_lesson: "Back to Lesson",
        tutor_title: "AI Tutor: {lessonName}",
        tutor_placeholder_loading: "Initializing tutor...",
        tutor_placeholder_ready: "Ask a question about your lesson...",
        tutor_cta_send: "Send",
        tutor_error_init: "I'm sorry, I encountered an error while setting up the session for \"{lessonName}\". Please try again.",
        tutor_error_send: "I'm sorry, I encountered an error. Please try asking again.",
        tutor_default_greeting: "Hello! I'm your AI Tutor for the lesson \"{lessonName}\". How can I help you understand the material better today?",
        // General
        loading_lesson: "Loading lesson...",
        confirm_delete_lesson: "Are you sure you want to delete this lesson?",
    },
    sr: {
        // Welcome
        welcome_title: "Dobrodošli u Lesson Quiz Generator",
        welcome_subtitle: "Vaš lični AI pomoćnik za učenje. Kreirajte lekcije od teksta ili datoteka i generišite kvizove da proverite svoje znanje.",
        welcome_placeholder: "Unesite svoje ime da biste započeli",
        welcome_cta: "Počnite sa učenjem",
        // Dashboard
        dashboard_greeting: "Dobrodošli nazad, {userName}!",
        dashboard_logout: "Odjavite se",
        dashboard_lessons_title: "Vaše lekcije",
        dashboard_created_date: "Kreirano: {date}",
        dashboard_no_lessons: "Još uvek nemate lekcija. Kreirajte jednu da biste započeli!",
        dashboard_create_new: "+ Kreiraj novu lekciju",
        // Create Lesson
        create_back_to_dashboard: "Nazad na kontrolnu tablu",
        create_title: "Kreiraj novu lekciju",
        create_lesson_name_placeholder: "Unesite naziv za ovu lekciju",
        create_type_text: "Tekst",
        create_type_file: "Datoteka (Slika/PDF)",
        create_text_placeholder: "Nalepite tekst vaše lekcije ovde...",
        create_file_change: "Promeni datoteku",
        create_file_choose: "Izaberi datoteku",
        create_unsupported_file: "Nepodržana datoteka: {name}",
        create_progress_creating: "Kreiranje lekcije...",
        create_progress_preparing: "Priprema...",
        create_progress_processing_image: "Obrada slike...",
        create_progress_reading_pdf: "Čitanje PDF datoteke...",
        create_progress_extracting_text_pdf: "Izdvajanje teksta iz PDF-a...",
        create_progress_extracting_text_image: "Izdvajanje teksta iz slike...",
        create_cta: "Kreiraj lekciju",
        create_cta_creating: "Kreiranje...",
        // Alerts
        alert_enter_lesson_name: "Molimo unesite naziv za ovu lekciju.",
        alert_enter_lesson_text: "Molimo unesite neki tekst za lekciju.",
        alert_upload_file: "Molimo otpremite datoteku.",
        alert_unsupported_file_type: "Nepodržan tip datoteke: {type}. Molimo otpremite sliku ili PDF.",
        alert_could_not_create_payload: "Nije moguće kreirati podatke za lekciju.",
        alert_ocr_failed: "Nije moguće izdvojiti tekst iz slike.",
        // View Lesson
        view_mastery: "Nivo znanja",
        view_phase1_title: "Pre nego što počnete",
        view_objectives_title: "Ciljevi učenja",
        view_objectives_loading: "Učitavanje ciljeva...",
        view_objectives_none: "Nema dostupnih ciljeva.",
        view_objectives_error: "Nije moguće generisati ciljeve učenja za ovu lekciju.",
        view_pka_title: "Aktivacija prethodnog znanja",
        view_pka_prompt: "<b>Brain Drain:</b> Pre nego što počnete, zapišite sve što već znate o ovoj temi.",
        view_pka_placeholder: "Ne brinite da li je tačno ili ne—samo aktivirajte svoje pamćenje!",
        view_phase2_title: "Sadržaj lekcije",
        view_phase3_title: "Alati za učenje: Proverite svoje razumevanje",
        view_tool_summarize: "Generiši ključne koncepte",
        view_tool_flashcards: "Vežbajte prisećanje sa karticama",
        view_tool_quiz: "Testirajte svoje znanje",
        view_tool_mindmap: "Vizualizujte veze",
        view_tool_tutor: "Potražite pomoć od svog AI tutora",
        view_create_flashcard_from_highlight: "Kreiraj karticu",
        notification_creating_flashcard: "Generisanje kartice...",
        notification_flashcard_created: "Kartica kreirana! **Prednja strana:** {front}",
        notification_flashcard_failed: "Neuspešno kreiranje kartice.",
        // Flashcard Flow
        flashcard_back_to_lesson: "Nazad na lekciju",
        flashcard_options_title: "Opcije kartica za {lessonName}",
        flashcard_settings_title: "Podešavanja",
        flashcard_number_label: "Broj kartica: {num}",
        flashcard_cta_cancel: "Otkaži",
        flashcard_cta_generate: "Generiši kartice",
        flashcard_progress_generating: "Generisanje...",
        flashcard_progress_part: "Generisanje kartica (Deo {i} od {count})...",
        flashcard_error_no_cards: "AI nije vratio nijednu karticu. Sadržaj je možda prekratak ili u nečitljivom formatu. Pokušajte ponovo sa drugačijim tekstom.",
        flashcard_view_back_to_options: "Nazad на opcije",
        flashcard_view_title: "Kartice",
        flashcard_view_no_cards_title: "Nema generisanih kartica",
        flashcard_view_no_cards_message: "AI nije mogao da generiše kartice iz izabranog sadržaja. Pokušajte ponovo sa drugačijim opcijama.",
        flashcard_view_progress: "Kartica {current} od {total}",
        flashcard_view_prev: "Prethodna",
        flashcard_view_next: "Sledeća",
        // Quiz Flow
        quiz_back_to_lesson: "Nazad na lekciju",
        quiz_options_title: "Opcije kviza za {lessonName}",
        quiz_difficulty: "Težina",
        quiz_difficulty_normal: "Normalna",
        quiz_difficulty_hard: "Teška",
        quiz_number_label: "Broj pitanja: {num}",
        quiz_cta_generate: "Generiši kviz",
        quiz_progress_part: "Generisanje pitanja (Deo {i} od {count})...",
        quiz_error_no_content: "Nema sadržaja za tekst lekcije.",
        quiz_error_generic: "Nije moguće generisati kviz. {error}",
        quiz_error_json: "AI je vratio nevažeći odgovor koji nije bio u JSON formatu. Ovo može biti povremeno. Molimo pokušajte ponovo da generišete kviz.",
        quiz_view_back_to_options: "Nazad na opcije",
        quiz_view_title: "Vreme je za kviz!",
        quiz_view_correct_answer: "Tačan odgovor: {answer}",
        quiz_view_submit: "Pošalji kviz",
        quiz_view_score: "Vaš rezultat: {score} / {total}",
        quiz_view_try_again: "Pokušaj ponovo",
        // Summary Flow
        summary_back_to_lesson: "Nazad na lekciju",
        summary_title: "Rezime lekcije",
        summary_comprehensive_title: "Sveobuhvatni rezime za učenje",
        summary_takeaways_title: "Top 5 ključnih koncepata",
        summary_audio_generating: "Generisanje...",
        summary_audio_stop: "Zaustavi",
        summary_audio_listen: "Slušaj",
        summary_flow_cancel: "Otkaži",
        summary_flow_generating_title: "Generisanje rezimea...",
        summary_flow_generating_text: "AI čita i rezimira vašu lekciju...",
        summary_flow_generating_note: "Ovo može potrajati za duže dokumente.",
        summary_flow_error_title: "Greška pri generisanju rezimea",
        // Mind Map Flow
        mindmap_back_to_lesson: "Nazad na lekciju",
        mindmap_title: "Mapa pojmova za {name}",
        mindmap_error_title: "Nije moguće generisati mapu pojmova",
        mindmap_error_message: "AI nije mogao da generiše mapu pojmova iz datog sadržaja. Tekst je možda prekratak ili format nije podržan.",
        mindmap_flow_cancel: "Otkaži",
        mindmap_flow_generating_title: "Generisanje mape pojmova...",
        mindmap_flow_generating_text: "AI analizira koncepte i veze...",
        mindmap_flow_error_title: "Greška pri generisanju mape pojmova",
        // Tutor Chat
        tutor_title: "AI tutor: {lessonName}",
        tutor_placeholder_loading: "Inicijalizacija tutora...",
        tutor_placeholder_ready: "Postavite pitanje o vašoj lekciji...",
        tutor_cta_send: "Pošalji",
        tutor_error_init: "Žao mi je, došlo je do greške prilikom postavljanja sesije za \"{lessonName}\". Molim vas, pokušajte ponovo.",
        tutor_error_send: "Žao mi je, došlo je do greške. Molim vas, pokušajte ponovo da postavite pitanje.",
        tutor_default_greeting: "Zdravo! Ja sam vaš AI tutor za lekciju \"{lessonName}\". Kako vam danas mogu pomoći da bolje razumete gradivo?",
        // General
        loading_lesson: "Učitavanje lekcije...",
        confirm_delete_lesson: "Da li ste sigurni da želite da obrišete ovu lekciju?",
    }
};

type Language = keyof typeof translations;
const defaultLang: Language = 'en';

const getInitialLanguage = (): Language => {
    const browserLang = navigator.language.split('-')[0] as Language;
    return translations[browserLang] ? browserLang : defaultLang;
};

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: keyof typeof translations['en'], replacements?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Fix: Language state is now persisted to localStorage to prevent inconsistencies on page reload.
const LanguageProvider = ({ children }: { children?: React.ReactNode }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        try {
            const storedLang = localStorage.getItem('lessonQuizLanguage');
            if (storedLang && storedLang in translations) {
                return storedLang as Language;
            }
        } catch (e) {
            console.error("Could not read language from localStorage", e);
        }
        return getInitialLanguage();
    });

    const setLanguage = useCallback((lang: Language) => {
        try {
            localStorage.setItem('lessonQuizLanguage', lang);
        } catch (e) {
            console.error("Failed to save language to localStorage", e);
        }
        setLanguageState(lang);
    }, []);

    const t = useCallback((key: keyof typeof translations['en'], replacements: Record<string, string | number> = {}) => {
        let translation = translations[language]?.[key] || translations[defaultLang][key];
        if (!translation) {
            console.warn(`Translation key "${key}" not found.`);
            return key;
        }
        Object.keys(replacements).forEach(placeholder => {
            const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
            translation = translation.replace(regex, String(replacements[placeholder]));
        });
        return translation;
    }, [language]);
    
    return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
};


const useTranslations = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useTranslations must be used within a LanguageProvider');
    }
    return context;
};

// --- Interfaces ---
interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

interface Flashcard {
    front: string;
    back: string;
}

interface Lesson {
  id: string;
  name: string;
  type: 'text';
  content: string; 
  createdAt: number;
  lang: Language;
}

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
}

interface MindMapConcept {
  mainConcept: string;
  relationship: string;
  details: string[];
}


type GenerationStatus = 'idle' | 'generating' | 'playing' | 'paused' | 'error';

// --- Helper Functions ---
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function sanitizeTextForAI(text: string): string {
    if (!text) return '';
    let sanitized = text.replace(/[•·◦]/g, ' - ');
    sanitized = sanitized.replace(/[\uFFFD]/g, '');
    sanitized = sanitized.replace(/[^\p{L}\p{N}\p{P}\s]/gu, '');
    return sanitized;
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


function splitTextIntoChunks(text: string, chunkSize = 1000): string[] {
    if (!text) return [];
    if (text.length <= chunkSize) {
        return [text];
    }

    const finalChunks: string[] = [];

    // 1. Split text into paragraphs based on two or more newlines.
    const paragraphs = text.split(/(\r?\n){2,}/).filter(p => p && p.trim() !== '');

    for (const paragraph of paragraphs) {
        // 2. Process each paragraph individually.
        let currentChunk = "";
        // Split paragraph into sentences, or treat the whole paragraph as one "sentence" if no punctuation is found.
        const sentences = paragraph.match(/[^.!?]+[.!?]*/g) || [paragraph];

        for (const sentence of sentences) {
            // 3. Group sentences into chunks, respecting the chunkSize.
            if (currentChunk.length + sentence.length > chunkSize) {
                if (currentChunk.trim().length > 0) finalChunks.push(currentChunk.trim());
                currentChunk = "";
            }
            currentChunk += sentence;
        }

        if (currentChunk.trim().length > 0) {
            finalChunks.push(currentChunk.trim());
        }
    }
    
    // 4. As a final safety measure, hard-split any chunks that are still too large
    // (e.g., from a single, very long sentence).
    return finalChunks.flatMap(chunk => 
        chunk.length > chunkSize 
        ? (chunk.match(new RegExp(`[\\s\\S]{1,${chunkSize}}`, 'g')) || [])
        : chunk
    );
}

async function detectLanguage(text: string): Promise<Language | null> {
    if (!text || text.trim().length < 20) {
        return null;
    }
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const snippet = text.trim().slice(0, 500);
        const prompt = `What language is the following text written in? Respond with only the two-letter ISO 639-1 code (e.g., "en", "es", "fr").

Text: "${snippet}"`;

        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const detectedLang = response.text.trim().toLowerCase().slice(0, 2);

        if (detectedLang in translations) {
            return detectedLang as Language;
        }
        return null;
    } catch (error) {
        console.error("Language detection failed:", error);
        return null;
    }
}


// --- Reusable UI Components ---

const ProgressBar = ({ progress, text }: { progress: number; text: string }) => (
    <div className="progress-bar-container">
        <div className="progress-bar-text">{text}</div>
        <div className="progress-bar-background">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
    </div>
);

const SimpleMarkdown = ({ text }: { text: string }) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|<b>.*?<\/b>)/g);
    return (
        <>
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
                // FIX: Corrected slice index from -3 to -4 for closing <b> tag.
                if (part.startsWith('<b>') && part.endsWith('</b>')) return <strong key={index}>{part.slice(3, -4)}</strong>;
                if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
                return part;
            })}
        </>
    );
};

const Confetti = () => (
    <div className="confetti-container">
        {[...Array(100)].map((_, i) => (
            <div key={i} className="confetti" style={{
                left: `${Math.random() * 100}vw`,
                animationDuration: `${Math.random() * 3 + 2}s`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 100%, 50%)`
            }}></div>
        ))}
    </div>
);

const ErrorMessage = ({ message, onDismiss }: { message: string | null, onDismiss: () => void }) => {
    if (!message) return null;
    return (
        <div className="error-message">
            <p><SimpleMarkdown text={message} /></p>
            <button onClick={onDismiss} className="close-btn">&times;</button>
        </div>
    );
};

// --- View Components ---

const WelcomeScreen = ({ tempUserName, setTempUserName, handleLogin }: { tempUserName: string, setTempUserName: (val: string) => void, handleLogin: () => void}) => {
    const { t } = useTranslations();
    return (
        <div className="card welcome-card">
          <h1>{t('welcome_title')}</h1>
          <p>{t('welcome_subtitle')}</p>
          <div className="input-group">
            <input
              type="text"
              value={tempUserName}
              onChange={(e) => setTempUserName(e.target.value)}
              placeholder={t('welcome_placeholder')}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={handleLogin}>{t('welcome_cta')}</button>
          </div>
        </div>
    );
};

const Dashboard = ({ userName, lessons, handleLogout, handleSelectLesson, handleDeleteLesson, handleCreateNew }: {
    userName: string | null,
    lessons: Lesson[],
    handleLogout: () => void,
    handleSelectLesson: (id: string) => void,
    handleDeleteLesson: (id: string) => void,
    handleCreateNew: () => void,
}) => {
    const { t } = useTranslations();
    return (
        <div className="dashboard">
          <header className="dashboard-header">
            <h2>{t('dashboard_greeting', { userName: userName || '' })}</h2>
            <div className="header-actions">
              <button onClick={handleLogout} className="logout-btn">{t('dashboard_logout')}</button>
            </div>
          </header>
          <h3>{t('dashboard_lessons_title')}</h3>
          <div className="lesson-list">
            {lessons.length > 0 ? (
              lessons.slice().sort((a,b) => b.createdAt - a.createdAt).map(lesson => (
                <div key={lesson.id} className="lesson-item" onClick={() => handleSelectLesson(lesson.id)}>
                  <div className="lesson-preview">
                    <span className="lesson-icon">📝</span>
                  </div>
                  <div className="lesson-info">
                    <h4>{lesson.name}</h4>
                    <p>{t('dashboard_created_date', { date: new Date(lesson.createdAt).toLocaleDateString() })}</p>
                  </div>
                  <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}>&times;</button>
                </div>
              ))
            ) : (
              <p>{t('dashboard_no_lessons')}</p>
            )}
          </div>
          <button className="create-new-btn" onClick={handleCreateNew}>{t('dashboard_create_new')}</button>
        </div>
    );
};

const CreateLesson = ({ handleBack, handleCreateLesson }: { handleBack: () => void, handleCreateLesson: (lesson: Omit<Lesson, 'id' | 'createdAt'>) => void}) => {
    const { t, language, setLanguage } = useTranslations();
    const [lessonName, setLessonName] = useState('');
    const [inputType, setInputType] = useState('text');
    const [lessonText, setLessonText] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<{url: string | null; name: string; type: string} | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressText, setProgressText] = useState(t('create_progress_creating'));
    const objectUrlRef = useRef<string | null>(null);

    useEffect(() => {
        return () => {
            if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        };
    }, []);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        
        if (!file) {
          setUploadedFile(null);
          setPreview(null);
          return;
        }
        setUploadedFile(file);
        const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'other';
        const url = fileType === 'image' ? URL.createObjectURL(file) : null;
        if (url) objectUrlRef.current = url;
        setPreview({ url, name: file.name, type: fileType });
    }, []);

    const extractTextFromImage = async (base64Content: string, mimeType: string): Promise<string> => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const imagePart = { inlineData: { data: base64Content.split(',')[1], mimeType } };
        
        const prompt = `You are a world-class OCR engine. Your only task is to transcribe the text from the provided image with absolute precision.

Follow these rules meticulously:

1.  **Preserve Layout:** Replicate the original structure, including all line breaks and paragraph spacing, exactly as it appears in the image. The final text layout must match the image layout.
2.  **Transcribe Verbatim:** Copy all text, numbers, and symbols exactly as they are.
3.  **Special Formatting - Ion Notation:** After transcribing, find all instances of chemical ion notation. You MUST convert them to their correct Unicode superscript form.
    -   "2+" MUST become "²⁺"
    -   "3+" MUST become "³⁺"
    -   "2-" MUST become "²⁻"
    -   "Fe 2+" MUST become "Fe²⁺"
    -   If you see "2+ 2+", it MUST become "²⁺ ²⁺"
4.  **Special Formatting - Bullet Points:** Identify any list items. Convert non-standard bullet characters (like vertical bars '❚', squares '■', or circles '●') into a standard hyphen followed by a space ('- ').

**Final Output:**
- You must return ONLY the transcribed and formatted text.
- Do NOT include any additional commentary, markdown formatting (like \`\`\`), or explanations.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, imagePart] },
        });

        return response.text;
    }

    const submitLesson = async () => {
        if (!lessonName.trim()) {
            alert(t('alert_enter_lesson_name'));
            return;
        }
        setIsCreating(true);
        setProgress(0);
        setProgressText(t('create_progress_preparing'));

        try {
            let finalLessonText: string | null = null;
            
            if (inputType === 'text') {
                if (!lessonText.trim()) throw new Error(t('alert_enter_lesson_text'));
                finalLessonText = lessonText;
            } else {
                if (!uploadedFile) throw new Error(t('alert_upload_file'));
                
                const base64Content = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(uploadedFile);
                });

                if (uploadedFile.type.startsWith('image/')) {
                    setProgressText(t('create_progress_extracting_text_image'));
                    setProgress(50);
                    const extractedText = await extractTextFromImage(base64Content, uploadedFile.type);
                    if (!extractedText || extractedText.trim().length === 0) {
                        throw new Error(t('alert_ocr_failed'));
                    }
                    finalLessonText = extractedText;
                    setProgress(100);

                } else if (uploadedFile.type === 'application/pdf') {
                    setProgressText(t('create_progress_reading_pdf'));
                    const arrayBuffer = await uploadedFile.arrayBuffer();
                    
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    const pageCount = pdf.numPages as number;
                    
                    const extractedPageTexts: string[] = [];
                    for (let i = 1; i <= pageCount; i++) {
                        setProgressText(t('create_progress_extracting_text_pdf'));
                        setProgress(Math.round((i / pageCount) * 100));
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const items: any[] = textContent.items;
                        
                        if (!items.length) {
                            continue;
                        }
                
                        // Group text items into lines based on their vertical position.
                        const lines = new Map<number, { text: string; x: number }[]>();
                        const Y_THRESHOLD = 5; // Tolerance for items on the same line.

                        for (const item of items) {
                            const itemY = item.transform[5];
                            let foundLineY: number | null = null;
                            
                            // Find an existing line 'y' that is close to the item's 'y'.
                            for (const y of lines.keys()) {
                                if (Math.abs(y - itemY) <= Y_THRESHOLD) {
                                    foundLineY = y;
                                    break;
                                }
                            }

                            const lineY = foundLineY ?? itemY;
                            if (!lines.has(lineY)) {
                                lines.set(lineY, []);
                            }
                            lines.get(lineY)!.push({ text: item.str, x: item.transform[4] });
                        }

                        // Sort lines from top to bottom (descending Y in PDF coordinates).
                        const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);
                        
                        // Within each line, sort text from left to right and join.
                        const pageText = sortedLines.map(([, lineItems]) =>
                            lineItems
                                .sort((a, b) => a.x - b.x)
                                .map(item => item.text)
                                .join(' ')
                        ).join('\n');

                        extractedPageTexts.push(pageText);
                    }
                    
                    finalLessonText = extractedPageTexts.join('\n\n');
                } else {
                    throw new Error(t('alert_unsupported_file_type', { type: uploadedFile.type }));
                }
            }

            if (!finalLessonText) {
                throw new Error(t('alert_could_not_create_payload'));
            }

            const detectedLang = await detectLanguage(finalLessonText);
            const lessonLang = detectedLang || language; // Fallback to current UI language

            if (detectedLang) {
                setLanguage(detectedLang); // Switch UI immediately to the detected language
            }

            const newLessonPayload: Omit<Lesson, 'id' | 'createdAt'> = {
                name: lessonName.trim(),
                type: 'text',
                content: finalLessonText,
                lang: lessonLang,
            };

            handleCreateLesson(newLessonPayload);
            
        } catch (error) {
            console.error("Error creating lesson:", error);
            alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsCreating(false);
            setProgress(0);
        }
    };

    return (
        <div className="card create-lesson-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('create_back_to_dashboard')}</button>
            <h2>{t('create_title')}</h2>
            <input 
                type="text"
                value={lessonName}
                onChange={e => setLessonName(e.target.value)}
                placeholder={t('create_lesson_name_placeholder')}
                className="lesson-name-input"
            />
            <div className="input-type-selector">
                <button className={inputType === 'text' ? 'active' : ''} onClick={() => setInputType('text')}>{t('create_type_text')}</button>
                <button className={inputType === 'file' ? 'active' : ''} onClick={() => setInputType('file')}>{t('create_type_file')}</button>
            </div>
            {inputType === 'text' ? (
                <textarea
                    value={lessonText}
                    onChange={e => setLessonText(e.target.value)}
                    placeholder={t('create_text_placeholder')}
                ></textarea>
            ) : (
                <div className="file-upload-area">
                    <input type="file" id="file-upload" accept="image/*,application/pdf" onChange={handleFileChange} />
                    <label htmlFor="file-upload" className="file-upload-label">
                        {preview ? t('create_file_change') : t('create_file_choose')}
                    </label>
                    {preview && (
                        <div className="file-preview">
                            {preview.type === 'image' && preview.url && <img src={preview.url} alt={preview.name} />}
                            {preview.type === 'pdf' && (
                                <div className="pdf-preview">
                                    <span className="pdf-icon">📄</span>
                                    <p>{preview.name}</p>
                                </div>
                            )}
                            {preview.type === 'other' && <p>{t('create_unsupported_file', { name: preview.name })}</p>}
                        </div>
                    )}
                </div>
            )}
            {isCreating && <ProgressBar progress={progress} text={progressText} />}
            <button onClick={submitLesson} disabled={isCreating}>
                {isCreating ? t('create_cta_creating') : t('create_cta')}
            </button>
        </div>
    );
};

const ViewLesson = ({ lesson, handleBack, handleTakeQuiz, handleCreateFlashcards, handleSummarizeLesson, handleCreateMindMap }: { lesson: Lesson, handleBack: () => void, handleTakeQuiz: () => void, handleCreateFlashcards: () => void, handleSummarizeLesson: () => void, handleCreateMindMap: () => void }) => {
    const { t, language, setLanguage } = useTranslations();
    const [highlightPopup, setHighlightPopup] = useState<{ top: number, left: number, text: string } | null>(null);
    const [isTutorOpen, setIsTutorOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Redesign State
    const [learningObjectives, setLearningObjectives] = useState<string[] | null>(null);
    const [isLoadingObjectives, setIsLoadingObjectives] = useState(true);
    const [masteryLevel, setMasteryLevel] = useState(25); // Dummy value
    const [dailyStreak, setDailyStreak] = useState(3); // Dummy value
    const [pkaText, setPkaText] = useState('');

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const handleMouseUp = () => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();

        if (selectedText && selectedText.length > 10) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const containerRect = contentRef.current?.getBoundingClientRect();

            if (containerRect) {
                setHighlightPopup({
                    top: rect.top - containerRect.top + contentRef.current.scrollTop,
                    left: rect.left - containerRect.left + contentRef.current.scrollLeft + rect.width / 2,
                    text: selectedText,
                });
            }
        } else {
            setHighlightPopup(null);
        }
    };
    
    const handleCreateFlashcardFromHighlight = async () => {
        if (!highlightPopup) return;
        const textToProcess = highlightPopup.text;
        setHighlightPopup(null);
        setNotification(t('notification_creating_flashcard'));
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const flashcardSchema = {
                type: Type.OBJECT,
                properties: {
                    front: { type: Type.STRING, description: "The front of the flashcard (a question or term)." },
                    back: { type: Type.STRING, description: "The back of the flashcard (the answer or definition)." },
                },
                required: ['front', 'back'],
            };
            const prompt = `Based on the following text, create a single, concise flashcard. The front should be a question or key term, and the back should be the answer or definition. The flashcard MUST be in the following language: ${language}.
    
    Text: "${textToProcess}"`;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: flashcardSchema,
                },
            });
            
            let textResponse = response.text.trim();
            if (textResponse.startsWith("```json")) {
                textResponse = textResponse.substring(7, textResponse.length - 3).trim();
            }
            const newCard: Flashcard = JSON.parse(textResponse);
            setNotification(t('notification_flashcard_created', { front: newCard.front }));
    
        } catch (error) {
            console.error("Error creating flashcard from highlight:", error);
            setNotification(t('notification_flashcard_failed'));
        }
    };


    // Generate Learning Objectives on mount
    useEffect(() => {
        const generateObjectives = async () => {
            setIsLoadingObjectives(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const sanitizedText = sanitizeTextForAI(lesson.content).slice(0, 8000);

                if (sanitizedText.trim().length < 50) {
                    throw new Error("Content too short.");
                }

                const prompt = `Based on the following lesson content, generate a concise list of 3-5 learning objectives. Each objective should start with an action verb (e.g., "Define," "Explain," "Analyze"). Your response must be only the bulleted list of objectives, with each on a new line. Do not add any introductory text or headers.
- Language: Your response MUST be in the following language: ${language}

Lesson Content:
---
${sanitizedText}`;

                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                const objectives = response.text.trim().split('\n').map(obj => obj.replace(/^[\s*-]+/, '').trim()).filter(Boolean);
                setLearningObjectives(objectives);

            } catch (err) {
                console.error("Error generating learning objectives", err);
                setLearningObjectives([t('view_objectives_error')]);
            } finally {
                setIsLoadingObjectives(false);
            }
        };
        generateObjectives();
    }, [lesson, t, language]);


    return (
        <div className={`card view-lesson-card-redesigned ${isTutorOpen ? 'with-tutor-open' : ''}`}>
             {notification && (
                <div className="notification-toast">
                    <SimpleMarkdown text={notification} />
                    <button onClick={() => setNotification(null)}>&times;</button>
                </div>
            )}
            <div className="lesson-main-content">
                {/* Header & Gamification */}
                <header className="lesson-header">
                    <button className="back-button" onClick={handleBack}>&larr; {t('create_back_to_dashboard')}</button>
                    <div className="lesson-title-container">
                        <h2>{lesson.name}</h2>
                    </div>
                    <div className="gamification-widgets">
                        <div className="mastery-widget">
                            <span className="widget-icon">🏆</span>
                            <div className="widget-text">
                                <span>{t('view_mastery')}</span>
                                <div className="mastery-meter-background">
                                    <div className="mastery-meter-fill" style={{ width: `${masteryLevel}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="streak-widget">
                            <span className="widget-icon">🔥</span>
                            <span className="streak-count">{dailyStreak}</span>
                        </div>
                    </div>
                </header>

                {/* Phase 1: Before You Begin */}
                <section className="preparation-section">
                    <h3>{t('view_phase1_title')}</h3>
                    <div className="preparation-grid">
                        <div className="learning-objectives-widget">
                            <h4>{t('view_objectives_title')}</h4>
                            {isLoadingObjectives ? (
                                <div className="objectives-loader">{t('view_objectives_loading')}</div>
                            ) : (
                                <ul>
                                    {learningObjectives?.map((obj, i) => <li key={i}>{obj}</li>) || <li>{t('view_objectives_none')}</li>}
                                </ul>
                            )}
                        </div>
                        <div className="pka-widget">
                            <h4>{t('view_pka_title')}</h4>
                            <label htmlFor="pka-textarea"><SimpleMarkdown text={t('view_pka_prompt')} /></label>
                            <textarea
                                id="pka-textarea"
                                value={pkaText}
                                onChange={(e) => setPkaText(e.target.value)}
                                placeholder={t('view_pka_placeholder')}
                                rows={4}
                            ></textarea>
                        </div>
                    </div>
                </section>
                
                {/* Phase 2: Lesson Content */}
                <section className="lesson-content-display">
                    <h3>{t('view_phase2_title')}</h3>
                    <div ref={contentRef} onMouseUp={handleMouseUp} className="lesson-text-content">
                        <SimpleMarkdown text={lesson.content} />
                        {highlightPopup && (
                            <div className="highlight-popup" style={{ top: highlightPopup.top, left: highlightPopup.left }}>
                                <button onClick={handleCreateFlashcardFromHighlight}>{t('view_create_flashcard_from_highlight')}</button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Phase 3: Study Tools */}
                <section className="study-tools-section">
                    <h3>{t('view_phase3_title')}</h3>
                    <div className="study-tools-grid">
                        <button className="tool-button" onClick={handleSummarizeLesson}><span className="tool-icon">📝</span> {t('view_tool_summarize')}</button>
                        <button className="tool-button" onClick={handleCreateFlashcards}><span className="tool-icon">🗂️</span> {t('view_tool_flashcards')}</button>
                        <button className="tool-button tool-button-cta" onClick={handleTakeQuiz}><span className="tool-icon">✅</span> {t('view_tool_quiz')}</button>
                        <button className="tool-button" onClick={handleCreateMindMap}><span className="tool-icon">🧠</span> {t('view_tool_mindmap')}</button>
                        <button className="tool-button tool-button-focus" onClick={() => setIsTutorOpen(true)}><span className="tool-icon">🧑‍🏫</span> {t('view_tool_tutor')}</button>
                    </div>
                </section>
            </div>
            
            {isTutorOpen && (
                <div className="tutor-side-panel">
                    <TutorChat
                        lesson={lesson}
                        handleBack={() => setIsTutorOpen(false)}
                    />
                </div>
            )}
        </div>
    );
};


const FlashcardFlow = ({ lesson, handleBack }: { lesson: Lesson, handleBack: () => void }) => {
    const { language, setLanguage } = useTranslations();
    const [flashcards, setFlashcards] = useState<Flashcard[] | null>(null);

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);
    
    if (flashcards) {
        return <FlashcardView flashcards={flashcards} handleBack={() => setFlashcards(null)} />;
    }
    
    return <FlashcardOptions lesson={lesson} handleBack={handleBack} setFlashcards={setFlashcards} />;
};

const FlashcardOptions = ({ lesson, handleBack, setFlashcards }: { lesson: Lesson, handleBack: () => void, setFlashcards: (cards: Flashcard[]) => void }) => {
    const { t, language } = useTranslations();
    const [numberOfFlashcards, setNumberOfFlashcards] = useState<number>(15);
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationText, setGenerationText] = useState(t('flashcard_progress_generating'));
    const [error, setError] = useState<string | null>(null);
    const generationControllerRef = useRef<AbortController | null>(null);
    
    const parseFlashcardMarkdown = (markdown: string): Flashcard[] => {
        if (!markdown || !markdown.trim()) return [];
        
        const flashcards: Flashcard[] = [];
        const lines = markdown.trim().split('\n');
        
        const contentLines = lines.slice(2);
        
        for (const line of contentLines) {
            const parts = line.split('|').map(part => part.trim().replace(/`/g, ''));
            if (parts.length >= 4) { // e.g. | Concept | Answer |
                const front = parts[1];
                const back = parts[2];
                if (front && back && !front.toLowerCase().includes('concept') && !front.toLowerCase().includes('front')) {
                    flashcards.push({ front, back });
                }
            }
        }
        return flashcards;
    }

    const startFlashcardGeneration = useCallback(async () => {
        const controller = new AbortController();
        generationControllerRef.current = controller;
        setGenerationStatus('generating');
        setError(null);
        setGenerationProgress(0);
        setGenerationText('');

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const numFlashcards = Number(numberOfFlashcards);

        try {
            let finalFlashcards: Flashcard[] = [];
            const sanitizedFullText = sanitizeTextForAI(lesson.content);
            const textChunks = splitTextIntoChunks(sanitizedFullText, 2000);
            
            for (let i = 0; i < textChunks.length; i++) {
                const chunkText = textChunks[i];
                if (controller.signal.aborted) throw new AbortError("Operation cancelled by user.");
                if (finalFlashcards.length >= numFlashcards) break;

                const cardsNeeded = numFlashcards - finalFlashcards.length;
                const cardsToRequest = Math.min(cardsNeeded, Math.ceil(numFlashcards / textChunks.length));

                setGenerationText(t('flashcard_progress_part', { i: i + 1, count: textChunks.length }));
                setGenerationProgress(Math.round(((i + 1) / textChunks.length) * 100));

                const prompt = `System Role: You are an expert academic assistant specializing in creating pedagogically rigorous digital flashcards. Your goal is to convert complex concepts from the provided source materials into concise, accurate, and citable question-and-answer pairs suitable for rote memorization and review.
Instructions:
Analyze the provided text to identify the ${cardsToRequest} most critical Key Concepts, Terms, or Definitions.
Generate a set of digital flashcards based on these key items.
Format the output as a Markdown table.
Constraints:
- Source Constraint: You MUST generate content (the Definition/Answer) only from the text provided in the "Input Content" section.
- Citation Mandate: You can omit citations as this is from a single text block.
- Language: The flashcards (both front and back) MUST be generated in the following language: ${language}. Do not translate.
- Audience: The vocabulary and complexity should be appropriate for a high-school or early college student.
- Output Format: The response MUST be ONLY a Markdown table with two columns: 'Concept (Front of Card)' and 'Answer/Explanation (Back of Card)'. Do not include any other text, headers, or explanations outside of the table itself.

Input Content:
---
${chunkText}
`;
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
                const newCards = parseFlashcardMarkdown(response.text);
                finalFlashcards.push(...newCards);
            }
            
            setGenerationStatus('idle');
            generationControllerRef.current = null;
            if (finalFlashcards.length === 0) {
                 throw new Error(t('flashcard_error_no_cards'));
            }
            setFlashcards(finalFlashcards.slice(0, numFlashcards));

        } catch (error) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes("cancelled"))) {
                console.log('Flashcard generation was cancelled.');
            } else {
                console.error('Error in flashcard generation:', error);
                let detailedMessage = `Could not generate flashcards. ${error instanceof Error ? error.message : 'An unknown server error occurred.'}`;
                setError(detailedMessage);
            }
            setGenerationStatus('idle');
        }
    }, [lesson, numberOfFlashcards, setFlashcards, t, language]);

    const cancelGeneration = useCallback(() => {
        generationControllerRef.current?.abort();
    }, []);

    const handleGenerateClick = useCallback(() => {
        if (generationStatus === 'generating') {
            cancelGeneration();
        } else {
            startFlashcardGeneration();
        }
    }, [generationStatus, cancelGeneration, startFlashcardGeneration]);
    
    useEffect(() => {
        return () => {
            generationControllerRef.current?.abort();
        };
    }, []);

    const isGenerating = generationStatus === 'generating';

    return (
        <div className="card flashcard-options-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('flashcard_back_to_lesson')}</button>
            <h2>{t('flashcard_options_title', { lessonName: lesson.name })}</h2>

            <div className="quiz-settings">
                <h3>{t('flashcard_settings_title')}</h3>
                <div className="setting-item">
                    <label htmlFor="num-flashcards">{t('flashcard_number_label', { num: numberOfFlashcards })}</label>
                    <input type="range" id="num-flashcards" min="5" max="25" value={numberOfFlashcards} onChange={e => setNumberOfFlashcards(Number(e.target.value))} />
                </div>
            </div>
            
            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
            <button onClick={handleGenerateClick} className="generate-quiz-btn">
                {isGenerating ? t('flashcard_cta_cancel') : t('flashcard_cta_generate')}
            </button>
            {isGenerating && <ProgressBar progress={generationProgress} text={generationText} />}
        </div>
    );
};


const FlashcardView = ({ flashcards, handleBack }: { flashcards: Flashcard[], handleBack: () => void }) => {
    const { t } = useTranslations();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        setIsFlipped(false); // Reset flip state when card changes
    }, [currentIndex]);

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
// FIX: Corrected a logical error where the "Previous" button was incrementing the index instead of decrementing it.
            setCurrentIndex(currentIndex - 1);
        }
    };
    
    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="card flashcard-view-card">
                 <button className="back-button" onClick={handleBack}>&larr; {t('flashcard_view_back_to_options')}</button>
                 <h2>{t('flashcard_view_no_cards_title')}</h2>
                 <p>{t('flashcard_view_no_cards_message')}</p>
            </div>
        )
    }

    const currentCard = flashcards[currentIndex];

    return (
        <div className="card flashcard-view-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('flashcard_view_back_to_options')}</button>
            <h2>{t('flashcard_view_title')}</h2>
            
            <div className={`flashcard-container ${isFlipped ? 'flipped' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                <div className="flashcard-flipper">
                    <div className="flashcard-front">
                        <SimpleMarkdown text={currentCard.front} />
                    </div>
                    <div className="flashcard-back">
                        <SimpleMarkdown text={currentCard.back} />
                    </div>
                </div>
            </div>

            <p className="flashcard-progress">{t('flashcard_view_progress', { current: currentIndex + 1, total: flashcards.length })}</p>

            <div className="flashcard-navigation">
                <button onClick={handlePrev} disabled={currentIndex === 0}>{t('flashcard_view_prev')}</button>
                <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1}>{t('flashcard_view_next')}</button>
            </div>
        </div>
    );
};

const QuizFlow = ({ lesson, handleBack }: { lesson: Lesson, handleBack: () => void }) => {
    const { language, setLanguage } = useTranslations();
    const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null);

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);
    
    if (quiz) {
        return <QuizView quiz={quiz} handleBack={() => setQuiz(null)} />;
    }
    
    return <QuizOptions lesson={lesson} handleBack={handleBack} setQuiz={setQuiz} />;
};

const QuizOptions = ({ lesson, handleBack, setQuiz }: { lesson: Lesson, handleBack: () => void, setQuiz: (quiz: QuizQuestion[]) => void }) => {
    const { t, language } = useTranslations();
    const [difficulty, setDifficulty] = useState('normal');
    const [numberOfQuestions, setNumberOfQuestions] = useState<number>(4);
    const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generationText, setGenerationText] = useState("Generating...");
    const [error, setError] = useState<string | null>(null);
    const generationControllerRef = useRef<AbortController | null>(null);
    
    const startQuizGeneration = useCallback(async () => {
        const controller = new AbortController();
        generationControllerRef.current = controller;
        setGenerationStatus('generating');
        setError(null);
        setGenerationProgress(0);
        setGenerationText('');

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const numQuestions = Number(numberOfQuestions);

        const quizSchema = {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING, description: "The quiz question." },
                options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 4 multiple-choice options." },
                answer: { type: Type.STRING, description: "The correct answer, which must be one of the provided options." },
              },
              required: ['question', 'options', 'answer'],
            },
        };

        const difficultyPrompt = difficulty === 'hard'
            ? "Make the questions very challenging, requiring deep analysis and critical thinking."
            : "The questions should be straightforward and test basic understanding.";

        try {
            let finalQuiz: QuizQuestion[] = [];
            const sanitizedFullText = sanitizeTextForAI(lesson.content);

            if (sanitizedFullText.trim().length === 0) {
                throw new Error(t('quiz_error_no_content'));
            }

            const textChunks = splitTextIntoChunks(sanitizedFullText, 1500);
            const totalQuestions = numQuestions;
            const questionsPerChunk = Math.max(1, Math.ceil(totalQuestions / textChunks.length));
            
            for (let i = 0; i < textChunks.length; i++) {
                const chunkText = textChunks[i];
                if (controller.signal.aborted) throw new AbortError("Operation cancelled by user.");
                if (finalQuiz.length >= totalQuestions) break;

                const remainingQs = totalQuestions - finalQuiz.length;
                const numQsForThisChunk = Math.min(remainingQs, questionsPerChunk);
                
                if(numQsForThisChunk <= 0) continue;

                setGenerationText(t('quiz_progress_part', { i: i + 1, count: textChunks.length }));
                setGenerationProgress(Math.round(((i + 1) / textChunks.length) * 100));
                
                const prompt = `Based on the provided lesson material, generate a ${numQsForThisChunk}-question multiple-choice quiz.
Difficulty: ${difficulty}. ${difficultyPrompt}
Each question must have 4 options, and one must be the correct answer.
IMPORTANT: The entire quiz (questions, options, answers) MUST be in the following language: ${language}.

Lesson Material:
---
${chunkText}
`;
                console.log(`Requesting ${numQsForThisChunk} questions for Part ${i + 1}`);

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: quizSchema,
                    },
                });

                let textResponse = response.text.trim();
                if (textResponse.startsWith("```json")) {
                    textResponse = textResponse.substring(7, textResponse.length - 3).trim();
                }
                const pageQuizData = JSON.parse(textResponse);
                finalQuiz.push(...pageQuizData);
            }
            
            setGenerationStatus('idle');
            generationControllerRef.current = null;
            setQuiz(finalQuiz.slice(0, numQuestions));

        } catch (error) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes("cancelled"))) {
                console.log('Quiz generation was cancelled.');
            } else {
                console.error('Error in quiz generation:', error);
                let detailedMessage = t('quiz_error_generic', { error: error instanceof Error ? error.message : 'An unknown server error occurred.' });
                if (error instanceof SyntaxError) {
                    detailedMessage = t('quiz_error_json');
                }
                setError(detailedMessage);
            }
            setGenerationStatus('idle');
        }
    }, [lesson, difficulty, numberOfQuestions, setQuiz, t, language]);

    const cancelQuizGeneration = useCallback(() => {
        generationControllerRef.current?.abort();
    }, []);

    const handleGenerateClick = useCallback(() => {
        if (generationStatus === 'generating') {
// FIX: Corrected a typo from `cancelGeneration` to the defined function `cancelQuizGeneration` and updated the dependency array.
            cancelQuizGeneration();
        } else {
            startQuizGeneration();
        }
    }, [generationStatus, cancelQuizGeneration, startQuizGeneration]);
    
    useEffect(() => {
        return () => {
            generationControllerRef.current?.abort();
        };
    }, []);

    const isGenerating = generationStatus === 'generating';

    return (
        <div className="card quiz-options-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('quiz_back_to_lesson')}</button>
            <h2>{t('quiz_options_title', { lessonName: lesson.name })}</h2>
            
            <div className="quiz-settings">
                <h3>{t('flashcard_settings_title')}</h3>
                <div className="setting-item">
                    <label>{t('quiz_difficulty')}</label>
                    <div className="difficulty-toggle">
                        <button className={difficulty === 'normal' ? 'active' : ''} onClick={() => setDifficulty('normal')}>{t('quiz_difficulty_normal')}</button>
                        <button className={difficulty === 'hard' ? 'active' : ''} onClick={() => setDifficulty('hard')}>{t('quiz_difficulty_hard')}</button>
                    </div>
                </div>
                <div className="setting-item">
                    <label htmlFor="num-questions">{t('quiz_number_label', { num: numberOfQuestions })}</label>
                    <input type="range" id="num-questions" min="1" max="20" value={numberOfQuestions} onChange={e => setNumberOfQuestions(Number(e.target.value))} />
                </div>
            </div>
            
            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
            <button onClick={handleGenerateClick} className="generate-quiz-btn">
                {isGenerating ? t('flashcard_cta_cancel') : t('quiz_cta_generate')}
            </button>
            {isGenerating && <ProgressBar progress={generationProgress} text={generationText} />}
        </div>
    );
};

const QuizView = ({ quiz, handleBack }: { quiz: QuizQuestion[], handleBack: () => void }) => {
    const { t } = useTranslations();
    const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
    const [submitted, setSubmitted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    
    const calculateScore = useCallback(() => {
        return quiz.filter((q, i) => userAnswers[i] === q.answer).length;
    }, [userAnswers, quiz]);
    
    const score = useMemo(() => {
        if (!submitted) return 0;
        return calculateScore();
    }, [submitted, calculateScore]);
    
    const handleSubmitQuiz = () => {
        setSubmitted(true);
        const finalScore = calculateScore();
        if (finalScore === quiz.length) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
        }
    };

    return (
        <div className="card quiz-card">
            {showConfetti && <Confetti />}
            <button className="back-button" onClick={handleBack}>&larr; {t('quiz_view_back_to_options')}</button>
            <h2>{t('quiz_view_title')}</h2>
            {quiz.map((q, i) => (
                <div key={i} className={`question-card ${submitted ? (userAnswers[i] === q.answer ? 'correct' : 'incorrect') : ''}`}>
                    <p><strong>{i + 1}. <SimpleMarkdown text={q.question} /></strong></p>
                    <div className="options">
                        {q.options.map((option, j) => (
                            <label key={j} className={`option-label ${submitted && option === q.answer ? 'correct-answer' : ''}`}>
                                <input
                                    type="radio"
                                    name={`question-${i}`}
                                    value={option}
                                    checked={userAnswers[i] === option}
                                    onChange={() => setUserAnswers(prev => ({ ...prev, [i]: option }))}
                                    disabled={submitted}
                                />
                                <SimpleMarkdown text={option} />
                            </label>
                        ))}
                    </div>
                    {submitted && userAnswers[i] !== q.answer && <p className="correct-answer-text"><SimpleMarkdown text={t('quiz_view_correct_answer', { answer: q.answer })}/></p>}
                </div>
            ))}
            {!submitted ? (
                <button onClick={handleSubmitQuiz}>{t('quiz_view_submit')}</button>
            ) : (
                <div className="quiz-result">
                    <h3>{t('quiz_view_score', { score, total: quiz.length })}</h3>
                    <button onClick={handleBack}>{t('quiz_view_try_again')}</button>
                </div>
            )}
        </div>
    );
};


const SummaryView = ({ summaryData, handleBack }: { summaryData: { summary: string, takeaways: string[] }, handleBack: () => void }) => {
    const { t } = useTranslations();
    const [audioStatus, setAudioStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const [audioError, setAudioError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        // FIX: Added sampleRate to AudioContext initialization as required by some browsers.
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        return () => {
            audioSourceRef.current?.stop();
            audioContextRef.current?.close();
        }
    }, []);

    const handlePlayAudio = async () => {
        if (audioStatus === 'playing') {
            audioSourceRef.current?.stop();
            setAudioStatus('idle');
            return;
        }

        setAudioStatus('loading');
        setAudioError(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const cleanedTakeawaysText = summaryData.takeaways
                .map(takeaway =>
                    takeaway
                        .replace(/^[\s*-\d.]+\s*/, '') 
                        .replace(/\[Concept \d+\]:\s*/, '')
                        .replace(/\s*\((Source:|Citation:)[^)]+\)$/, '')
                        .trim()
                )
                .filter(Boolean)
                .join('\n\n');

            const textToSpeak = `Here are your key takeaways: \n\n ${cleanedTakeawaysText}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    // FIX: Changed Modality.AUDIO to 'AUDIO' string literal to avoid potential enum-related type issues.
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (!base64Audio) {
                throw new Error('No audio content received from the API.');
            }

            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current!, 24000, 1);

            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }

            const source = audioContextRef.current!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current!.destination);
            source.onended = () => setAudioStatus('idle');
            source.start();
            audioSourceRef.current = source;
            setAudioStatus('playing');

        } catch (err) {
            setAudioStatus('error');
            setAudioError(err instanceof Error ? err.message : 'An unknown audio error occurred.');
        }
    };

    return (
        <div className="card summary-view-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('summary_back_to_lesson')}</button>
            <h2>{t('summary_title')}</h2>

            <div className="summary-section">
                <h3>{t('summary_comprehensive_title')}</h3>
                <p>{summaryData.summary}</p>
            </div>

            <div className="summary-section">
                <div className="summary-takeaways-header">
                    <h3>{t('summary_takeaways_title')}</h3>
                    <button onClick={handlePlayAudio} disabled={audioStatus === 'loading'}>
                        {audioStatus === 'loading' ? t('summary_audio_generating') : (audioStatus === 'playing' ? t('summary_audio_stop') : t('summary_audio_listen'))}
                    </button>
                </div>
                 {audioError && <ErrorMessage message={audioError} onDismiss={() => setAudioError(null)} />}
                <ul className="takeaways-list">
                    {summaryData.takeaways.map((item, index) => <li key={index}><SimpleMarkdown text={item.replace(/\[Concept \d+\]:\s*/, '')} /></li>)}
                </ul>
            </div>
        </div>
    );
};


const SummarizationFlow = ({ lesson, handleBack }: { lesson: Lesson, handleBack: () => void }) => {
    const { t, language, setLanguage } = useTranslations();
    const [summaryData, setSummaryData] = useState<{ summary: string, takeaways: string[] } | null>(null);
    const [status, setStatus] = useState<'generating' | 'error' | 'done'>('generating');
    const [error, setError] = useState<string | null>(null);
    const generationControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);

    const parseSummaryResponse = (text: string): { summary: string, takeaways: string[] } => {
        const summaryMatch = text.match(/Comprehensive Study Summary\s*([\s\S]*?)(?=Top 5 Key Takeaways|$)/i);
        const summary = summaryMatch ? summaryMatch[1].trim() : "Summary could not be extracted.";
    
        const takeawaysMatch = text.match(/Top 5 Key Takeaways[\s\S]*/i);
        let takeaways: string[] = [];
        if (takeawaysMatch) {
            const takeawaysBlock = takeawaysMatch[0];
            
            takeaways = takeawaysBlock.split('\n')
                .slice(1)
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.toLowerCase().includes("for quick review/audio script"));
        }
        
        if (takeaways.length === 0 && summary === "Summary could not be extracted.") {
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.some(line => /^\s*(\*|\[|\d+\.)/.test(line))) {
                 return { summary: "Could not find a summary, but here are some key points from the text:", takeaways: lines };
            }
            throw new Error("Could not parse the summary from the AI's response. The format was unexpected.");
        }

        return { summary, takeaways };
    };
    
    const generateSummary = useCallback(async () => {
        const controller = new AbortController();
        generationControllerRef.current = controller;
        setStatus('generating');
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const sanitizedFullText = sanitizeTextForAI(lesson.content);
            if (sanitizedFullText.trim().length < 100) {
                 throw new Error("The lesson content is too short to generate a meaningful summary.");
            }

            const promptContent = sanitizedFullText.slice(0, 15000); 

            const prompt = `System Role: You are a professional academic editor and expert summarizer. Your task is to analyze the provided study material and generate a concise, highly accurate, and pedagogically useful summary that focuses exclusively on core concepts and arguments.
Input Content:
---
${promptContent}
---
Instructions (The "Ask"):
1.  **Generate a Concise Summary:** Produce a summary of the provided text that is approximately 250–350 words long. This summary should capture the main thesis, key arguments, and major conclusions of the material.
2.  **Extract Key Takeaways:** Identify the Top 5 most critical concepts or facts from the text that a student must memorize for an exam.
Constraints (The "Rules"):
-   **Source Constraint:** All generated content (the Summary and the Key Takeaways) MUST be derived only from the text provided in the "Input Content" section.
-   **Citation Mandate:** For the Top 5 Key Takeaways, provide a brief, explicit citation or context note next to each point (e.g., "(Source: Page 4, Section II)", "(Source: Chapter 5 Conclusion)").
-   **Language:** The summary and takeaways MUST be generated in the following language: ${language}.
-   **Audience:** The language should be clear, professional, and targeted toward a high-school or early college student.
-   **Output Format:** Your response MUST strictly follow this structure, with these exact headings:

Comprehensive Study Summary
(The 250–350 word summary text goes here.)

Top 5 Key Takeaways (For Quick Review/Audio Script)
[Concept 1]: [Critical fact or definition]. (Citation)
[Concept 2]: [Critical fact or definition]. (Citation)
[Concept 3]: [Critical fact or definition]. (Citation)
[Concept 4]: [Critical fact or definition]. (Citation)
[Concept 5]: [Critical fact or definition]. (Citation)
`;
            
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            
            const parsedData = parseSummaryResponse(response.text);
            setSummaryData(parsedData);
            setStatus('done');
            
        } catch (error) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes("cancelled"))) {
                console.log('Summary generation was cancelled.');
                handleBack();
            } else {
                console.error('Error in summary generation:', error);
                setError(error instanceof Error ? error.message : "An unknown error occurred.");
                setStatus('error');
            }
        }
    }, [lesson, handleBack, language]);

    useEffect(() => {
        generateSummary();
        return () => {
            generationControllerRef.current?.abort();
        };
    }, [generateSummary]);

    if (status === 'generating') {
        return (
            <div className="card">
                <button className="back-button" onClick={() => {
                    generationControllerRef.current?.abort();
                    handleBack();
                }}>&larr; {t('summary_flow_cancel')}</button>
                <h2>{t('summary_flow_generating_title')}</h2>
                <ProgressBar progress={50} text={t('summary_flow_generating_text')} />
                <p>{t('summary_flow_generating_note')}</p>
            </div>
        );
    }
    
    if (status === 'error' || !summaryData) {
        return (
            <div className="card">
                <button className="back-button" onClick={handleBack}>&larr; {t('summary_back_to_lesson')}</button>
                <h2>{t('summary_flow_error_title')}</h2>
                <ErrorMessage message={error || "An unknown error occurred."} onDismiss={handleBack} />
            </div>
        );
    }

    return <SummaryView summaryData={summaryData} handleBack={handleBack} />;
};

const MindMapView = ({ data, handleBack, lessonName }: { data: string, handleBack: () => void, lessonName: string }) => {
    const { t } = useTranslations();
    const parsedData = useMemo(() => {
        const concepts: MindMapConcept[] = [];
        if (!data) return concepts;
    
        const mapStartIndex = data.toLowerCase().indexOf('main concept 1:');
        if (mapStartIndex === -1) return concepts;
        const mapText = data.substring(mapStartIndex);

        const blocks = mapText.split(/Main Concept \d+:/).slice(1);
    
        for (const block of blocks) {
            const lines = block.trim().split('\n');
            const mainConcept = lines.shift()?.trim() || 'Untitled Concept';
            
            const newConcept: MindMapConcept = { mainConcept, relationship: '', details: [] };
    
            for (const line of lines) {
                if (line.match(/^Relationship to Concept \d+:/i)) {
                    newConcept.relationship = line.split(/:\s*/, 2)[1]?.trim() || '';
                } else if (line.match(/^\s*(?:-|\*)?\s*Detail \d+:/i)) {
                    newConcept.details.push(line.split(/:\s*/, 2)[1]?.trim() || '');
                }
            }
            if (newConcept.mainConcept !== 'Untitled Concept' && (newConcept.relationship || newConcept.details.length > 0)) {
               concepts.push(newConcept);
            }
        }
        return concepts;
    }, [data]);

    if (parsedData.length === 0) {
        return (
             <div className="card">
                <button className="back-button" onClick={handleBack}>&larr; {t('mindmap_back_to_lesson')}</button>
                <h2>{t('mindmap_error_title')}</h2>
                <ErrorMessage message={t('mindmap_error_message')} onDismiss={handleBack} />
            </div>
        )
    }

    return (
        <div className="card mind-map-view-card">
            <button className="back-button" onClick={handleBack}>&larr; {t('mindmap_back_to_lesson')}</button>
            <h2>{t('mindmap_title', { name: lessonName })}</h2>
            <div className="mind-map-container">
                {parsedData.map((concept, index) => (
                    <div key={index} className="mind-map-branch">
                        <div className="mind-map-node main-concept">
                            <SimpleMarkdown text={concept.mainConcept} />
                        </div>

                        {concept.relationship && (
                           <div className="mind-map-relationship">
                                &#8627; <SimpleMarkdown text={concept.relationship} />
                           </div>
                        )}
                        
                        {concept.details.length > 0 && (
                             <ul className="mind-map-details-list">
                                {concept.details.map((detail, detailIndex) => (
                                    <li key={detailIndex}>
                                        <div className="mind-map-node detail">
                                           <SimpleMarkdown text={detail} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};


const MindMapFlow = ({ lesson, handleBack }: { lesson: Lesson, handleBack: () => void }) => {
    const { t, language, setLanguage } = useTranslations();
    const [mindMapData, setMindMapData] = useState<string | null>(null);
    const [status, setStatus] = useState<'generating' | 'error' | 'done'>('generating');
    const [error, setError] = useState<string | null>(null);
    const generationControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);

    const generateMindMap = useCallback(async () => {
        const controller = new AbortController();
        generationControllerRef.current = controller;
        setStatus('generating');
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const sanitizedFullText = sanitizeTextForAI(lesson.content);
            if (sanitizedFullText.trim().length < 100) {
                 throw new Error("The lesson content is too short to generate a meaningful mind map.");
            }

            const promptContent = sanitizedFullText.slice(0, 15000); 

            const prompt = `System Role: You are an expert knowledge graph synthesizer and academic visualizer. Your function is to analyze the provided source material and convert its structure into a hierarchical concept map that clearly shows the definitions, dependencies, and relationships between all major topics.
Input Content:
---
${promptContent}
---
Instructions (The "Ask"):
1.  **Identify Core Concepts:** Determine the 8 to 12 most important Main Concepts (primary nodes) in the text.
2.  **Map Sub-Concepts:** For each Main Concept, identify the 3 to 5 most critical Supporting Details, Definitions, or Examples (secondary nodes).
3.  **Define Relationships:** For the Main Concepts, describe the explicit relationship connecting them (e.g., "causes," "is a component of," "is defined by," "is prerequisite for").
4.  **Format Output:** Present the final structure using a nested Markdown list that clearly outlines the hierarchy of the map.
Constraints (The "Rules"):
-   **Source Constraint:** All concepts, definitions, and relationships MUST be derived exclusively from the text provided in the "Input Content" section.
-   **Language:** The mind map MUST be generated in the following language: ${language}.
-   **Audience:** The complexity and depth of the concepts must be appropriate for a high-school or early college student.
-   **Output Format:** Your response MUST strictly follow this structure, starting with "Conceptual Map:":

Conceptual Map:
Main Concept 1: [Concept Name]
Relationship to Concept 2: [Description of relationship]
Detail 1: [Key detail/definition]
Detail 2: [Key detail/definition]
Detail 3: [Key detail/definition]

Main Concept 2: [Concept Name]
Relationship to Concept 3: [Description of relationship]
Detail 1: [Key detail/definition]
Detail 2: [Key detail/definition]
`;
            
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            
            setMindMapData(response.text);
            setStatus('done');
            
        } catch (error) {
            if (error instanceof Error && (error.name === 'AbortError' || error.message.includes("cancelled"))) {
                console.log('Mind map generation was cancelled.');
                handleBack();
            } else {
                console.error('Error in mind map generation:', error);
                setError(error instanceof Error ? error.message : "An unknown error occurred.");
                setStatus('error');
            }
        }
    }, [lesson, handleBack, language]);

    useEffect(() => {
        generateMindMap();
        return () => {
            generationControllerRef.current?.abort();
        };
    }, [generateMindMap]);

    if (status === 'generating') {
        return (
            <div className="card">
                <button className="back-button" onClick={() => {
                    generationControllerRef.current?.abort();
                    handleBack();
                }}>&larr; {t('mindmap_flow_cancel')}</button>
                <h2>{t('mindmap_flow_generating_title')}</h2>
                <ProgressBar progress={50} text={t('mindmap_flow_generating_text')} />
                <p>{t('summary_flow_generating_note')}</p>
            </div>
        );
    }
    
    if (status === 'error' || !mindMapData) {
        return (
            <div className="card">
                <button className="back-button" onClick={handleBack}>&larr; {t('mindmap_back_to_lesson')}</button>
                <h2>{t('mindmap_flow_error_title')}</h2>
                <ErrorMessage message={error || "An unknown error occurred."} onDismiss={handleBack} />
            </div>
        );
    }

    return <MindMapView data={mindMapData} handleBack={handleBack} lessonName={lesson.name} />;
};


const TutorChat = ({ lesson, handleBack }: { lesson: Lesson, handleBack: () => void }) => {
    const { t, language, setLanguage } = useTranslations();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const chatRef = useRef<Chat | null>(null);
    const messageListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lesson.lang && lesson.lang !== language) {
            setLanguage(lesson.lang);
        }
    }, [lesson.lang, language, setLanguage]);

    useEffect(() => {
        if (messageListRef.current) {
            messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }
    }, [messages, isLoading, isInitializing]);
    
    useEffect(() => {
        const initializeChat = async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                
                const sanitizedLessonContent = sanitizeTextForAI(lesson.content).slice(0, 15000);

                const systemInstruction = `System Role: You are a 24/7 Intelligent Tutoring System (ITS) and academic coach. Your primary goal is to guide the student to the correct solution using hints and step-by-step logic, not simply provide the final answer. You must maintain an encouraging, supportive, and formal tone.
Student Context:
Source Material: The student has provided the following lesson content. This is your primary knowledge base.
---
${sanitizedLessonContent}
---
Constraints (The "Rules" for Tutoring Behavior):
- Rule 1: Socratic Method (Prioritize Learning): Never provide the direct, final answer immediately. Always start by asking a clarifying question or giving a hint that encourages the student to apply critical thinking and problem-solving skills.
- Rule 2: Source Constraint (Accuracy Mandate): All definitions, formulas, or facts provided in your hints or explanations MUST be derived only from the "Source Material" provided above. If you use external knowledge, you must label it clearly as "General Knowledge."
- Rule 3: Multi-Modal Guidance: If the problem is mathematical or scientific, structure your response as a numbered, step-by-step procedure to simulate a live, visual demonstration (like a virtual whiteboard).
- IMPORTANT LANGUAGE RULE: Your entire response, and all subsequent responses, MUST be in the following language: ${language}.
`;

                chatRef.current = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                });
                
                const greetingPrompt = `Your task is to craft a single, friendly greeting sentence. The greeting is for an AI Tutor starting a session about a lesson named "${lesson.name}".
The tone should be encouraging and welcoming.
The meaning should be equivalent to: "Hello! I'm your AI Tutor for the lesson '${lesson.name}'. How can I help you understand the material better today?"
Constraint: Your entire response must be ONLY the single greeting sentence in the language: ${language}. Do not add any extra explanations, labels, or text.`;

                let greetingMessage: string;
                try {
                    const initialResponse = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: greetingPrompt
                    });
                    greetingMessage = initialResponse.text.trim();
                    if (!greetingMessage) throw new Error("Empty greeting response.");
                } catch (greetingError) {
                    console.error("Could not generate localized greeting, falling back to English.", greetingError);
                    greetingMessage = t('tutor_default_greeting', { lessonName: lesson.name });
                }
                
                setMessages([{ role: 'model', content: greetingMessage }]);

            } catch (err) {
                console.error('Error initializing tutor chat:', err);
                const initErrorMsg = t('tutor_error_init', { lessonName: lesson.name });
                setError(err instanceof Error ? err.message : 'Could not start the tutor session.');
                setMessages([{ role: 'model', content: initErrorMsg }]);
            } finally {
                setIsInitializing(false);
            }
        };
        initializeChat();
    }, [lesson, t, language]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMessage.trim() || isLoading || !chatRef.current) return;
        
        const userMessage: ChatMessage = { role: 'user', content: currentMessage.trim() };
        setMessages(prev => [...prev, userMessage]);
        setCurrentMessage('');
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await chatRef.current.sendMessage({ message: userMessage.content });
            const modelMessage: ChatMessage = { role: 'model', content: response.text };
            setMessages(prev => [...prev, modelMessage]);
        } catch (err) {
            console.error('Error sending message to tutor:', err);
            const errorMessage = t('tutor_error_send');
            setMessages(prev => [...prev, { role: 'model', content: errorMessage }]);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="card tutor-chat-container">
            <div className="tutor-chat-header">
                <button className="back-button close-tutor-btn" onClick={handleBack}>&times;</button>
                <h2>{t('tutor_title', { lessonName: lesson.name })}</h2>
            </div>
            <div className="message-list" ref={messageListRef}>
                 {isInitializing && (
                    <div className="message-bubble ai-message typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`message-bubble ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}>
                        <SimpleMarkdown text={msg.content} />
                    </div>
                ))}
                {isLoading && (
                    <div className="message-bubble ai-message typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                )}
            </div>
            {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
            <form className="chat-form" onSubmit={handleSendMessage}>
                <textarea
                    className="chat-input"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder={isInitializing ? t('tutor_placeholder_loading') : t('tutor_placeholder_ready')}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e);
                        }
                    }}
                    rows={1}
                    disabled={isInitializing}
                />
                <button type="submit" disabled={isLoading || isInitializing || !currentMessage.trim()}>{t('tutor_cta_send')}</button>
            </form>
        </div>
    );
};

// --- Main App Component ---
const App = () => {
    const { t } = useTranslations();
    const [userName, setUserName] = useState<string | null>(null);
    const [tempUserName, setTempUserName] = useState('');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [currentView, setCurrentView] = useState<{ name: string; props?: any }>({ name: 'welcome' });

    useEffect(() => {
        const savedUserName = localStorage.getItem('lessonQuizUserName');
        
        if (savedUserName) {
            setUserName(savedUserName);
            const savedLessons = localStorage.getItem(`lessons_${savedUserName}`);
            setLessons(savedLessons ? JSON.parse(savedLessons) : []);
            setCurrentView({ name: 'dashboard' });
        }
    }, []);

    useEffect(() => {
        if (userName) {
            localStorage.setItem(`lessons_${userName}`, JSON.stringify(lessons));
        }
    }, [lessons, userName]);

    const handleLogin = () => {
        if (tempUserName.trim()) {
            const normalizedName = tempUserName.trim();
            setUserName(normalizedName);
            localStorage.setItem('lessonQuizUserName', normalizedName);
            const savedLessons = localStorage.getItem(`lessons_${normalizedName}`);
            setLessons(savedLessons ? JSON.parse(savedLessons) : []);
            setCurrentView({ name: 'dashboard' });
        }
    };

    const handleLogout = () => {
        setUserName(null);
        setLessons([]);
        localStorage.removeItem('lessonQuizUserName');
        setCurrentView({ name: 'welcome' });
    };

    const handleCreateLesson = (lessonPayload: Omit<Lesson, 'id' | 'createdAt'>) => {
        const newLesson: Lesson = { ...lessonPayload, id: `lesson_${Date.now()}`, createdAt: Date.now() };
        setLessons(prev => [...prev, newLesson]);
        setCurrentView({ name: 'dashboard' });
    };

    const handleDeleteLesson = (lessonId: string) => {
        if (confirm(t('confirm_delete_lesson'))) {
            setLessons(prev => prev.filter(l => l.id !== lessonId));
        }
    };

    const selectedLesson = useMemo(() => {
        if (currentView.props?.lessonId && ['view_lesson', 'take_quiz', 'create_flashcards', 'summarize_lesson', 'create_mind_map'].includes(currentView.name)) {
            return lessons.find(lesson => lesson.id === currentView.props.lessonId);
        }
        return null;
    }, [lessons, currentView]);

    const renderContent = () => {
        switch (currentView.name) {
            case 'welcome':
                return <WelcomeScreen tempUserName={tempUserName} setTempUserName={setTempUserName} handleLogin={handleLogin} />;
            case 'dashboard':
                return <Dashboard
                    userName={userName}
                    lessons={lessons}
                    handleLogout={handleLogout}
                    handleSelectLesson={(lessonId) => setCurrentView({ name: 'view_lesson', props: { lessonId } })}
                    handleDeleteLesson={handleDeleteLesson}
                    handleCreateNew={() => setCurrentView({ name: 'create' })}
                />;
            case 'create':
                return <CreateLesson
                    handleBack={() => setCurrentView({ name: 'dashboard' })}
                    handleCreateLesson={handleCreateLesson}
                />;
            case 'view_lesson':
                if (!selectedLesson) return <p>{t('loading_lesson')}</p>;
                return <ViewLesson
                    lesson={selectedLesson}
                    handleBack={() => setCurrentView({ name: 'dashboard' })}
                    handleTakeQuiz={() => setCurrentView({ name: 'take_quiz', props: { lessonId: selectedLesson.id } })}
                    handleCreateFlashcards={() => setCurrentView({ name: 'create_flashcards', props: { lessonId: selectedLesson.id }})}
                    handleSummarizeLesson={() => setCurrentView({ name: 'summarize_lesson', props: { lessonId: selectedLesson.id }})}
                    handleCreateMindMap={() => setCurrentView({ name: 'create_mind_map', props: { lessonId: selectedLesson.id }})}
                />;
            case 'take_quiz':
                if (!selectedLesson) return <p>{t('loading_lesson')}</p>;
                return <QuizFlow
                    lesson={selectedLesson}
                    handleBack={() => setCurrentView({ name: 'view_lesson', props: { lessonId: selectedLesson.id } })}
                />;
            case 'create_flashcards':
                if (!selectedLesson) return <p>{t('loading_lesson')}</p>;
                return <FlashcardFlow
                    lesson={selectedLesson}
                    handleBack={() => setCurrentView({ name: 'view_lesson', props: { lessonId: selectedLesson.id } })}
                />;
            case 'summarize_lesson':
                if (!selectedLesson) return <p>{t('loading_lesson')}</p>;
                return <SummarizationFlow
                    lesson={selectedLesson}
                    handleBack={() => setCurrentView({ name: 'view_lesson', props: { lessonId: selectedLesson.id } })}
                />;
             case 'create_mind_map':
                if (!selectedLesson) return <p>{t('loading_lesson')}</p>;
                return <MindMapFlow
                    lesson={selectedLesson}
                    handleBack={() => setCurrentView({ name: 'view_lesson', props: { lessonId: selectedLesson.id } })}
                />;
            default:
                return <WelcomeScreen tempUserName={tempUserName} setTempUserName={setTempUserName} handleLogin={handleLogin} />;
        }
    };

    return (
        <div className="container">
            {renderContent()}
        </div>
    );
};

const AppWithProviders = () => (
    <LanguageProvider>
        <App />
    </LanguageProvider>
);


const root = createRoot(document.getElementById('root')!);
root.render(<AppWithProviders />);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then(registration => {
        console.log('SW registered: ', registration);
      }).catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
    });
  }
