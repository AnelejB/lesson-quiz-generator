import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

declare const pdfjsLib: any;

// Helper function to decode base64 string to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to decode raw PCM audio data into an AudioBuffer
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


const ProgressBar = ({ progress, text }: { progress: number; text: string }) => (
    <div className="progress-bar-container">
        <div className="progress-bar-text">{text}</div>
        <div className="progress-bar-background">
            <div 
                className="progress-bar-fill" 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const App = () => {
  const [inputType, setInputType] = useState('text');
  const [lessonText, setLessonText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{url: string | null; name: string; type: string} | null>(null);
  const [difficulty, setDifficulty] = useState('normal'); // 'normal' or 'hard'
  const [loading,setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize AudioContext on mount
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
        audioContextRef.current?.close();
    }
  }, []);

  useEffect(() => {
    if (!uploadedFile) {
        setPreview(null);
        return;
    }
    const newPreview = {
        url: uploadedFile.type.startsWith('image/') ? URL.createObjectURL(uploadedFile) : null,
        name: uploadedFile.name,
        type: uploadedFile.type,
    };
    setPreview(newPreview);

    return () => {
        if (newPreview.url) {
            URL.revokeObjectURL(newPreview.url);
        }
    };
  }, [uploadedFile]);

  useEffect(() => {
    let content = '';
    if (uploadedFile && pdfPages.length > 0) {
        content = Array.from(selectedPages).map(i => pdfPages[i]).join(' ');
    } else if (lessonText) {
        content = lessonText;
    }
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    if (wordCount > 0) {
      const suggestedQuestions = Math.min(20, Math.max(3, Math.floor(wordCount / 150)));
      setNumberOfQuestions(suggestedQuestions);
    } else {
      setNumberOfQuestions(5);
    }
  }, [lessonText, selectedPages, pdfPages, uploadedFile]);
  
  useEffect(() => {
    let interval: number | undefined;
    if (loading) {
        interval = window.setInterval(() => {
            setGenerationProgress(prev => {
                if (prev >= 95) {
                    if(interval) clearInterval(interval);
                    return 95;
                }
                // Simulate slower progress as it nears completion
                const increment = prev > 80 ? Math.random() * 1.5 : Math.random() * 5;
                return Math.min(prev + increment, 95);
            });
        }, 400);
    }

    return () => {
        if (interval) clearInterval(interval);
    };
  }, [loading]);


  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const parsePdf = async (file: File) => {
    setIsParsing(true);
    setError('');
    setParsingProgress(0);
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        
        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
            setParsingProgress(Math.round((progressData.loaded / progressData.total) * 100));
        };
        
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        const pagesText: string[] = [];
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            pagesText.push(pageText);
        }
        setPdfPages(pagesText);
        setSelectedPages(new Set(Array.from({ length: pagesText.length }, (_, i) => i)));
    } catch (e) {
        console.error("Error parsing PDF:", e);
        setError("Could not read the PDF file. It might be corrupted or protected.");
        setUploadedFile(null);
    } finally {
        setIsParsing(false);
        setTimeout(() => setParsingProgress(0), 500);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setLessonText(''); 
      setError('');
      setAudioError('');
      setPdfPages([]);
      setSelectedPages(new Set());
      if (file.type === 'application/pdf') {
        parsePdf(file);
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPdfPages([]);
    setSelectedPages(new Set());
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setLessonText(e.target.value);
      if (uploadedFile) {
        handleRemoveFile();
      }
      setError('');
      setAudioError('');
  }

  const handlePageSelect = (pageIndex: number) => {
    setSelectedPages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(pageIndex)) {
            newSet.delete(pageIndex);
        } else {
            newSet.add(pageIndex);
        }
        return newSet;
    });
  };

  const toggleSelectAllPages = () => {
    if (selectedPages.size === pdfPages.length) {
        setSelectedPages(new Set());
    } else {
        setSelectedPages(new Set(Array.from({ length: pdfPages.length }, (_, i) => i)));
    }
  }
  
  const handleListen = async () => {
    setIsGeneratingAudio(true);
    setAudioError('');
    setError('');

    try {
        let textToSynthesize = lessonText;
        if (uploadedFile?.type === 'application/pdf') {
            if (selectedPages.size === 0) {
                setAudioError("Please select at least one page to listen to.");
                setIsGeneratingAudio(false);
                return;
            }
            textToSynthesize = Array.from(selectedPages).sort((a, b) => a - b).map(i => pdfPages[i]).join('\n\n');
        }

        const response = await fetch('/.netlify/functions/generate-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textToSynthesize }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const { audioContent } = await response.json();
        
        if (!audioContent) {
             throw new Error("No audio content received.");
        }

        if (!audioContextRef.current) {
            throw new Error("Audio context not available.");
        }
        
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        const audioContext = audioContextRef.current;
        const audioBuffer = await decodeAudioData(
            decode(audioContent),
            audioContext,
            24000,
            1,
        );
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();

    } catch (e) {
        console.error(e);
        setAudioError(e.message || "An error occurred while generating audio.");
    } finally {
        setIsGeneratingAudio(false);
    }
  };


  const generateQuiz = async () => {
    setLoading(true);
    setGenerationProgress(0);
    setQuiz(null);
    setSubmitted(false);
    setUserAnswers({});
    setError('');
    setAudioError('');

    try {
      let payload: any;
      let finalLessonText = lessonText;

      if (uploadedFile) {
        if (uploadedFile.type === 'application/pdf') {
          if (selectedPages.size === 0) {
            setError("Please select at least one page for the quiz.");
            setLoading(false);
            return;
          }
          finalLessonText = Array.from(selectedPages).sort((a,b) => a - b).map(i => pdfPages[i]).join('\n\n');
          payload = { lessonText: finalLessonText, difficulty, numberOfQuestions };
        } else { // It's an image
          const fileData = {
            data: await fileToBase64(uploadedFile),
            mimeType: uploadedFile.type,
          };
          payload = { uploadedFiles: [fileData], difficulty, numberOfQuestions };
        }
      } else {
        payload = { lessonText: finalLessonText, difficulty, numberOfQuestions };
      }


      const response = await fetch('/.netlify/functions/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const quizData = await response.json();

      if (quizData && quizData.length > 0) {
        setQuiz(quizData);
      } else {
        setError("Could not generate a quiz from the provided material. Please try again with different content.");
      }
    } catch (e) {
      console.error(e);
      let errorMessage = e.message || "An error occurred while generating the quiz. Please check your connection and try again.";
      if (errorMessage.includes("504") || errorMessage.toLowerCase().includes('timeout')) {
        errorMessage = "Quiz generation timed out, which can happen with large or complex files. Please try again, perhaps with a smaller image or less content.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setGenerationProgress(100);
      setTimeout(() => setGenerationProgress(0), 500);
    }
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const correctAnswers = quiz.filter((_, index) => isCorrect(index)).length;
    if (correctAnswers === quiz.length) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  const isCorrect = (questionIndex) => {
    return userAnswers[questionIndex] === quiz[questionIndex].answer;
  };
  
  const handleReset = () => {
    setInputType('text');
    setLessonText('');
    setUploadedFile(null);
    setLoading(false);
    setQuiz(null);
    setUserAnswers({});
    setSubmitted(false);
    setShowConfetti(false);
    setError('');
    setAudioError('');
    setDifficulty('normal');
    setPdfPages([]);
    setSelectedPages(new Set());
    setNumberOfQuestions(5);
  };

  const isContentProvided = !!lessonText || !!uploadedFile;
  const isGenerateDisabled = !isContentProvided || (uploadedFile?.type === 'application/pdf' && selectedPages.size === 0);
  const isListenDisabled = isGenerateDisabled || (uploadedFile && uploadedFile.type.startsWith('image/'));
  const isSubmitDisabled = Object.keys(userAnswers).length !== (quiz?.length || 0);
  const anyActionInProgress = isParsing || loading || isGeneratingAudio;

  return (
    <>
      <style>{`
        :root {
          --primary-color: #8E2DE2;
          --secondary-color: #4A00E0;
          --text-color: #f0f0f0;
          --background-start: #1a1a2e;
          --background-mid: #16213e;
          --background-end: #0f3460;
          --surface-color-alpha: rgba(255, 255, 255, 0.08);
          --border-color-alpha: rgba(255, 255, 255, 0.15);
          --error-color: #ff6b6b;
          --correct-color: #50fa7b;
          --incorrect-color: #ff5555;
          --listen-color-start: #1D976C;
          --listen-color-end: #93F9B9;
          --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        *, *::before, *::after {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: var(--font-family);
          background: linear-gradient(135deg, var(--background-start), var(--background-mid), var(--background-end));
          background-attachment: fixed;
          color: var(--text-color);
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          padding: 20px;
        }
        #root {
          width: 100%;
          max-width: 800px;
        }
        .container {
          background: var(--surface-color-alpha);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-color-alpha);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          width: 100%;
          animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        
        .header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .header h1 {
          font-size: 2.5rem;
          background: -webkit-linear-gradient(45deg, var(--primary-color), var(--secondary-color));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }
        .header p {
          font-size: 1.1rem;
          opacity: 0.8;
        }

        .tabs {
          display: flex;
          margin-bottom: 1.5rem;
          background: rgba(0,0,0,0.2);
          border-radius: 25px;
          padding: 5px;
        }
        .tab {
          flex: 1;
          padding: 0.8rem;
          cursor: pointer;
          border: none;
          background: none;
          color: var(--text-color);
          opacity: 0.7;
          font-size: 1rem;
          font-weight: 500;
          border-radius: 20px;
          transition: all 0.3s ease;
        }
        .tab.active {
          opacity: 1;
          background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        textarea, .file-input-wrapper {
          width: 100%;
          min-height: 200px;
          background-color: rgba(0,0,0,0.2);
          border: 1px solid var(--border-color-alpha);
          border-radius: 12px;
          padding: 1rem;
          color: var(--text-color);
          font-size: 1rem;
          resize: vertical;
        }
        .file-input-wrapper {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            cursor: pointer;
            text-align: center;
        }
        input[type="file"] { display: none; }
        .file-preview-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid var(--border-color-alpha);
          border-radius: 12px;
          background-color: rgba(0,0,0,0.2);
        }
        .file-preview {
          position: relative;
          max-width: 150px;
        }
        .file-preview img {
          width: 100%;
          height: auto;
          object-fit: cover;
          border-radius: 8px;
        }
        .pdf-preview {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 120px;
          height: 120px;
          background-color: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          word-break: break-word;
        }
        .pdf-preview svg {
          width: 50px; height: 50px; margin-bottom: 8px; fill: var(--text-color); opacity: 0.8;
        }
        .pdf-preview span { font-size: 13px; opacity: 0.8; }
        .remove-file-btn {
          background: var(--secondary-color);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .remove-file-btn:hover { background: var(--primary-color); }
        
        .quiz-options {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background-color: rgba(0,0,0,0.2);
          border-radius: 12px;
        }
        .options-title {
          text-align: center;
          font-size: 1.2rem;
          font-weight: 600;
          margin-top: 0;
          margin-bottom: 1.5rem;
          opacity: 0.9;
        }

        .option-group { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .option-group:last-child { margin-bottom: 0; }
        .option-label { font-weight: 500; opacity: 0.8; }

        .difficulty-toggle {
            display: flex;
            background-color: rgba(0,0,0,0.2);
            border-radius: 20px;
            padding: 4px;
            border: 1px solid var(--border-color-alpha);
        }
        .difficulty-toggle span {
            padding: 0.5rem 1.5rem; cursor: pointer; border-radius: 16px; transition: all 0.3s ease; color: var(--text-color); opacity: 0.7; display: block;
        }
        .difficulty-toggle input { display: none; }
        .difficulty-toggle input:checked + span {
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); color: white; opacity: 1; box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .num-questions-container { display: flex; align-items: center; gap: 1rem; justify-content: flex-end; }
        .num-questions-container input[type="range"] {
          width: 120px;
          accent-color: var(--primary-color);
        }
        .num-questions-value { font-weight: bold; min-width: 20px; text-align: right;}
        
        .page-selection-container {
            margin-top: 1.5rem;
            padding: 1.5rem;
            background-color: rgba(0,0,0,0.2);
            border-radius: 12px;
        }
        .page-selection-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .page-selection-header h4 { margin: 0; font-size: 1.1rem; }
        .page-selection-header button { background: none; border: 1px solid var(--border-color-alpha); color: var(--text-color); padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
        .page-selection-header button:hover { background-color: var(--surface-color-alpha); }
        .page-selection-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; max-height: 200px; overflow-y: auto; padding-right: 10px; }
        .page-selection-grid label { display: flex; align-items: center; background: var(--surface-color-alpha); padding: 0.5rem 0.8rem; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; }
        .page-selection-grid label:hover { background-color: rgba(255,255,255,0.15); }
        .page-selection-grid input { margin-right: 0.5rem; accent-color: var(--primary-color); }

        .btn {
          display: block; width: 100%; padding: 1rem; font-size: 1.2rem; font-weight: bold; border: none; border-radius: 12px; cursor: pointer; background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); color: white; background-size: 200% 100%; transition: background-position 0.4s ease;
        }
        .btn:hover:not(:disabled) { background-position: 100% 0; }
        .btn:disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); cursor: not-allowed; }

        .action-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }
        .action-buttons .btn {
          margin-top: 0;
          flex: 1;
        }
        .listen-btn {
          background: linear-gradient(90deg, var(--listen-color-start), var(--listen-color-end));
          color: var(--background-start);
        }
        .listen-btn:hover:not(:disabled) {
          background-position: 100% 0;
        }

        .loader { display: flex; justify-content: center; align-items: center; padding: 2rem; flex-direction: column; gap: 1rem; }
        .spinner { border: 4px solid rgba(255,255,255,0.2); border-left-color: var(--secondary-color); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .progress-bar-container { width: 100%; }
        .progress-bar-text { text-align: center; margin-bottom: 0.5rem; opacity: 0.9; }
        .progress-bar-background { width: 100%; height: 10px; background-color: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: linear-gradient(90deg, var(--primary-color), var(--secondary-color)); border-radius: 5px; transition: width 0.3s ease-out; }

        .quiz-container { margin-top: 2rem; animation: fadeIn 0.5s ease-out; }
        .question-card { margin-bottom: 1.5rem; background-color: rgba(0,0,0,0.15); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-color-alpha); }
        .question-card h3 { margin-top: 0; }
        .options-list { list-style: none; padding: 0; }
        .option-item { margin-bottom: 0.75rem; }
        .option-item label { display: block; border: 1px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s; background-color: rgba(255,255,255,0.05); }
        .option-item input[type="radio"] { display: none; }
        .option-item span { display: flex; align-items: center; padding: 0.8rem 1rem; }
        .option-item span::before { content: ''; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--border-color-alpha); margin-right: 1rem; transition: all 0.2s ease; }
        .option-item input:checked + span::before { background-color: var(--primary-color); border-color: var(--primary-color); box-shadow: 0 0 5px var(--primary-color); }
        .option-item label:hover { background-color: rgba(255,255,255,0.1); }
        .submitted .option-item label { cursor: default; }
        .submitted .option-item label.correct { background-color: rgba(80, 250, 123, 0.15); border-color: var(--correct-color); }
        .submitted .option-item label.incorrect { background-color: rgba(255, 85, 85, 0.15); border-color: var(--incorrect-color); }
        .submitted .option-item input.correct + span::before { background-color: var(--correct-color); border-color: var(--correct-color); content: '✔'; color: black; text-align: center; font-size: 12px; line-height: 18px; }
        .submitted .option-item input.incorrect + span::before { background-color: var(--incorrect-color); border-color: var(--incorrect-color); content: '✖'; color: black; text-align: center; font-size: 12px; line-height: 18px; }

        .results-container { margin-top: 2rem; }
        .results-header { text-align: center; font-size: 1.5rem; margin-bottom: 1rem; }
        .error-message { color: var(--error-color); background-color: rgba(255, 85, 85, 0.15); border: 1px solid var(--error-color); text-align: center; margin-top: 1rem; padding: 1rem; border-radius: 8px; }
        
        .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 999; }
        .confetti { position: absolute; width: 10px; height: 10px; background-color: var(--primary-color); opacity: 0.7; animation: confetti-fall 5s linear forwards; }
        .confetti.c2 { background-color: var(--secondary-color); }
        .confetti.c3 { background-color: #f44336; }
        .confetti.c4 { background-color: #ffeb3b; }
        @keyframes confetti-fall { 0% { transform: translateY(-10vh) rotate(0deg); } 100% { transform: translateY(110vh) rotate(720deg); } }
      `}</style>
      <div className="container">
        <div className="header">
          <h1>🧠 Lesson Quiz Generator</h1>
          <p>Paste text or upload a file to test your knowledge!</p>
        </div>
        
        {!quiz && !loading && (
          <div className="input-container">
            <div className="tabs">
              <button className={`tab ${inputType === 'text' ? 'active' : ''}`} onClick={() => setInputType('text')}>Enter Text</button>
              <button className={`tab ${inputType === 'file' ? 'active' : ''}`} onClick={() => setInputType('file')}>Upload File</button>
            </div>
            {inputType === 'text' && (
              <textarea
                placeholder="Paste your lesson notes here..."
                value={lessonText}
                onChange={handleTextChange}
              />
            )}
            {inputType === 'file' && (
                <>
                {!uploadedFile ? (
                    <label className="file-input-wrapper">
                        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
                        <span>Click to upload an image or PDF of your notes</span>
                    </label>
                ) : (
                    <div className="file-preview-container">
                        <div className="file-preview">
                        {preview?.url ? (
                            <img src={preview.url} alt={`Preview of ${preview.name}`} />
                        ) : (
                            <div className="pdf-preview">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm-2.5-2H15V8.5h-1.5v3zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z"/></svg>
                                <span>{pdfPages.length} Pages</span>
                            </div>
                        )}
                        </div>
                        <button onClick={handleRemoveFile} className="remove-file-btn">Change File</button>
                    </div>
                )}
                </>
            )}

            {isParsing && (
                <div className="loader">
                    <div className="spinner"></div>
                    <ProgressBar progress={parsingProgress} text={`Parsing PDF... ${parsingProgress}%`} />
                </div>
            )}

            {inputType === 'file' && pdfPages.length > 1 && !isParsing && (
                <div className="page-selection-container">
                    <div className="page-selection-header">
                        <h4>Select Pages for Quiz</h4>
                        <button onClick={toggleSelectAllPages}>{selectedPages.size === pdfPages.length ? 'Deselect' : 'Select'} All</button>
                    </div>
                    <div className="page-selection-grid">
                        {pdfPages.map((_, index) => (
                        <label key={index}>
                            <input
                            type="checkbox"
                            checked={selectedPages.has(index)}
                            onChange={() => handlePageSelect(index)}
                            />
                            Page {index + 1}
                        </label>
                        ))}
                    </div>
                </div>
            )}
            
            {isContentProvided && !isParsing && (
              <>
                <div className="quiz-options">
                    <h3 className="options-title">Quiz Options</h3>
                    <div className="option-group">
                        <div className="option-label">Difficulty</div>
                        <div className="difficulty-toggle">
                            <label><input type="radio" name="difficulty" value="normal" checked={difficulty === 'normal'} onChange={() => setDifficulty('normal')} /><span>Normal</span></label>
                            <label><input type="radio" name="difficulty" value="hard" checked={difficulty === 'hard'} onChange={() => setDifficulty('hard')} /><span>Hard</span></label>
                        </div>
                    </div>
                    <div className="option-group">
                        <div className="option-label">Number of Questions</div>
                        <div className="num-questions-container">
                            <input type="range" min="3" max="20" value={numberOfQuestions} onChange={(e) => setNumberOfQuestions(Number(e.target.value))} />
                            <span className="num-questions-value">{numberOfQuestions}</span>
                        </div>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                      className="btn listen-btn"
                      onClick={handleListen}
                      disabled={isListenDisabled || anyActionInProgress}
                      aria-label="Listen to the provided lesson text"
                    >
                      {isGeneratingAudio ? 'Synthesizing...' : 'Listen'}
                    </button>
                    <button
                      className="btn"
                      onClick={generateQuiz}
                      disabled={isGenerateDisabled || anyActionInProgress}
                    >
                      Generate Quiz
                    </button>
                </div>
              </>
            )}

          </div>
        )}

        {loading && (
          <div className="loader">
            <div className="spinner"></div>
            <ProgressBar progress={generationProgress} text="Generating your quiz..." />
          </div>
        )}
        
        {error && <p className="error-message">{error}</p>}
        {audioError && <p className="error-message">{audioError}</p>}

        {quiz && (
          <div className={`quiz-container ${submitted ? 'submitted' : ''}`}>
            {quiz.map((q, qIndex) => (
              <div key={qIndex} className="question-card">
                <h3>{qIndex + 1}. {q.question}</h3>
                <ul className="options-list">
                  {q.options.map((option, oIndex) => {
                    const isUserAnswer = userAnswers[qIndex] === option;
                    const isCorrectAnswer = q.answer === option;
                    let labelClass = '';
                    let inputClass = '';
                    if (submitted) {
                      if (isCorrectAnswer) {
                        labelClass = 'correct';
                        inputClass = 'correct';
                      }
                      else if (isUserAnswer && !isCorrectAnswer) {
                        labelClass = 'incorrect';
                        inputClass = 'incorrect';
                      }
                    }
                    return (
                      <li key={oIndex} className="option-item">
                        <label className={labelClass}>
                          <input
                            type="radio"
                            name={`question-${qIndex}`}
                            value={option}
                            checked={isUserAnswer}
                            onChange={() => handleAnswerChange(qIndex, option)}
                            disabled={submitted}
                            className={inputClass}
                          />
                          <span>{option}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {!submitted ? (
              <button className="btn" onClick={handleSubmit} disabled={isSubmitDisabled}>
                Submit Quiz
              </button>
            ) : (
              <div className="results-container">
                <h2 className="results-header">
                  Your Score: {quiz.filter((_, i) => isCorrect(i)).length} / {quiz.length}
                </h2>
                <button className="btn" onClick={handleReset}>Try Another Lesson</button>
              </div>
            )}
          </div>
        )}
        {showConfetti && <Confetti />}
      </div>
    </>
  );
};

const Confetti = () => {
    const confetti = Array.from({ length: 100 }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}vw`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
        };
        const colorClass = `c${1 + Math.floor(Math.random() * 4)}`;
        return <div key={i} className={`confetti ${colorClass}`} style={style}></div>;
    });
    return <div className="confetti-container">{confetti}</div>;
}


const root = createRoot(document.getElementById("root"));
root.render(<App />);