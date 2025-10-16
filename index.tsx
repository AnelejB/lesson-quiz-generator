import React, { useState, useCallback, useMemo, useEffect } from "react";
import { createRoot } from "react-dom/client";

const App = () => {
  const [inputType, setInputType] = useState('text');
  const [lessonText, setLessonText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string | null; name: string; type: string}[]>([]);
  const [difficulty, setDifficulty] = useState('normal'); // 'normal' or 'hard'
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const newPreviews = uploadedFiles.map(file => ({
        url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        name: file.name,
        type: file.type,
    }));
    setPreviews(newPreviews);

    return () => {
        newPreviews.forEach(p => {
            if (p.url) {
                URL.revokeObjectURL(p.url);
            }
        });
    };
  }, [uploadedFiles]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setUploadedFiles(prev => [...prev, ...files]);
      setLessonText(''); // Clear text input when files are added
      setError('');
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const handleTextChange = (e) => {
      setLessonText(e.target.value);
      if (uploadedFiles.length > 0) { // Clear files if user starts typing
        setUploadedFiles([]);
      }
      setError('');
  }

  const generateQuiz = async () => {
    if (!lessonText && uploadedFiles.length === 0) {
      setError("Please provide some lesson material first.");
      return;
    }
    setLoading(true);
    setQuiz(null);
    setSubmitted(false);
    setUserAnswers({});
    setError('');

    try {
      let payload: { lessonText?: string; uploadedFiles?: { data: string; mimeType: string }[]; difficulty: string; };

      if (uploadedFiles.length > 0) {
        const filesData = await Promise.all(
          uploadedFiles.map(async (file) => ({
            data: await fileToBase64(file),
            mimeType: file.type,
          }))
        );
        payload = { uploadedFiles: filesData, difficulty };
      } else {
        payload = { lessonText, difficulty };
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
      setError(e.message || "An error occurred while generating the quiz. Please check your connection and try again.");
    } finally {
      setLoading(false);
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
    setUploadedFiles([]);
    setLoading(false);
    setQuiz(null);
    setUserAnswers({});
    setSubmitted(false);
    setShowConfetti(false);
    setError('');
    setDifficulty('normal');
  };

  const isGenerateDisabled = !lessonText && uploadedFiles.length === 0;
  const isSubmitDisabled = Object.keys(userAnswers).length !== (quiz?.length || 0);

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
        .image-preview-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 1rem;
          width: 100%;
          padding: 1rem;
        }
        .preview-item {
          position: relative;
          aspect-ratio: 1 / 1;
        }
        .preview-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
        }
        .pdf-preview {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.3);
          border-radius: 8px;
          padding: 10px;
          text-align: center;
          word-break: break-word;
        }
        .pdf-preview svg {
          width: 40px;
          height: 40px;
          margin-bottom: 8px;
          fill: var(--text-color);
          opacity: 0.8;
        }
        .pdf-preview span {
          font-size: 12px;
          opacity: 0.8;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .remove-image-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--error-color);
          color: white;
          border: 2px solid var(--background-start);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          line-height: 1;
          padding: 0;
          transition: transform 0.2s ease;
          z-index: 10;
        }
        .remove-image-btn:hover { transform: scale(1.1); }
        
        .difficulty-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 1.5rem 0 0;
        }
        .difficulty-label {
            margin-bottom: 0.5rem;
            font-weight: 500;
            opacity: 0.8;
        }
        .difficulty-toggle {
            display: flex;
            background-color: rgba(0,0,0,0.2);
            border-radius: 20px;
            padding: 4px;
            border: 1px solid var(--border-color-alpha);
        }
        .difficulty-toggle label { position: relative; }
        .difficulty-toggle span {
            padding: 0.5rem 1.5rem;
            cursor: pointer;
            border-radius: 16px;
            transition: all 0.3s ease;
            color: var(--text-color);
            opacity: 0.7;
            display: block;
        }
        .difficulty-toggle input { display: none; }
        .difficulty-toggle input:checked + span {
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            color: white;
            opacity: 1;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .btn {
          display: block;
          width: 100%;
          padding: 1rem;
          font-size: 1.2rem;
          font-weight: bold;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
          color: white;
          margin-top: 1.5rem;
          background-size: 200% 100%;
          transition: background-position 0.4s ease;
        }
        .btn:hover:not(:disabled) {
          background-position: 100% 0;
        }
        .btn:disabled {
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          cursor: not-allowed;
        }

        .loader {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2rem;
            flex-direction: column;
        }
        .spinner {
            border: 4px solid rgba(255,255,255,0.2);
            border-left-color: var(--secondary-color);
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .quiz-container { margin-top: 2rem; animation: fadeIn 0.5s ease-out; }
        .question-card {
            margin-bottom: 1.5rem;
            background-color: rgba(0,0,0,0.15);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--border-color-alpha);
        }
        .question-card h3 { margin-top: 0; }
        .options-list { list-style: none; padding: 0; }
        .option-item { margin-bottom: 0.75rem; }
        .option-item label {
            display: block;
            border: 1px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            background-color: rgba(255,255,255,0.05);
        }
        .option-item input[type="radio"] { display: none; }
        .option-item span {
            display: flex;
            align-items: center;
            padding: 0.8rem 1rem;
        }
        .option-item span::before {
            content: '';
            width: 18px;
            height: 18px;
            border-radius: 50%;
            border: 2px solid var(--border-color-alpha);
            margin-right: 1rem;
            transition: all 0.2s ease;
        }
        .option-item input:checked + span::before {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            box-shadow: 0 0 5px var(--primary-color);
        }
        .option-item label:hover { background-color: rgba(255,255,255,0.1); }
        .submitted .option-item label { cursor: default; }
        .submitted .option-item label.correct {
            background-color: rgba(80, 250, 123, 0.15);
            border-color: var(--correct-color);
        }
        .submitted .option-item label.incorrect {
            background-color: rgba(255, 85, 85, 0.15);
            border-color: var(--incorrect-color);
        }
        .submitted .option-item input.correct + span::before {
            background-color: var(--correct-color);
            border-color: var(--correct-color);
            content: '✔';
            color: black;
            text-align: center;
            font-size: 12px;
            line-height: 18px;
        }
        .submitted .option-item input.incorrect + span::before {
            background-color: var(--incorrect-color);
            border-color: var(--incorrect-color);
            content: '✖';
            color: black;
            text-align: center;
            font-size: 12px;
            line-height: 18px;
        }

        .results-container { margin-top: 2rem; }
        .results-header { text-align: center; font-size: 1.5rem; margin-bottom: 1rem; }
        .error-message {
            color: var(--error-color);
            background-color: rgba(255, 85, 85, 0.15);
            border: 1px solid var(--error-color);
            text-align: center;
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 8px;
        }
        
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
          <p>Paste text or upload files to test your knowledge!</p>
        </div>
        
        {!quiz && !loading && (
          <div className="input-container">
            <div className="tabs">
              <button className={`tab ${inputType === 'text' ? 'active' : ''}`} onClick={() => setInputType('text')}>Enter Text</button>
              <button className={`tab ${inputType === 'file' ? 'active' : ''}`} onClick={() => setInputType('file')}>Upload Files</button>
            </div>
            {inputType === 'text' ? (
              <textarea
                placeholder="Paste your lesson notes here..."
                value={lessonText}
                onChange={handleTextChange}
              />
            ) : (
              <label className="file-input-wrapper">
                <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} multiple />
                {previews.length > 0 ? (
                    <div className="image-preview-grid">
                      {previews.map((preview, index) => (
                        <div key={`${preview.name}-${index}`} className="preview-item">
                          {preview.url ? (
                            <img src={preview.url} alt={`Preview of ${preview.name}`} />
                          ) : (
                            <div className="pdf-preview">
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                               <span>{preview.name}</span>
                            </div>
                          )}
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFile(index); }}
                            className="remove-image-btn"
                            aria-label={`Remove file ${preview.name}`}
                          >&times;</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>Click to upload image(s) or PDF(s) of your notes</span>
                  )}
              </label>
            )}

            <div className="difficulty-container">
              <div className="difficulty-label">Quiz Difficulty</div>
              <div className="difficulty-toggle">
                <label>
                  <input type="radio" name="difficulty" value="normal" checked={difficulty === 'normal'} onChange={() => setDifficulty('normal')} />
                  <span>Normal</span>
                </label>
                <label>
                  <input type="radio" name="difficulty" value="hard" checked={difficulty === 'hard'} onChange={() => setDifficulty('hard')} />
                  <span>Hard</span>
                </label>
              </div>
            </div>

            <button className="btn" onClick={generateQuiz} disabled={isGenerateDisabled}>
              Generate Quiz
            </button>
          </div>
        )}

        {loading && (
          <div className="loader">
            <div className="spinner"></div>
            <p>Generating your quiz...</p>
          </div>
        )}
        
        {error && <p className="error-message">{error}</p>}

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