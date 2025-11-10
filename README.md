# Lesson Quiz Generator 🧠

Welcome to Lesson Quiz Generator, your personal AI-powered study buddy! This application allows you to create lessons from text or by uploading files (images/PDFs), and then generates various study tools like quizzes, flashcards, summaries, and concept maps to help you master the material.

## ✨ Features

- **Create Lessons from Text or Files:** Paste text directly or upload an image or PDF to create a new lesson.
- **AI-Powered OCR:** Extracts text from your uploaded documents with high accuracy.
- **Learning Objectives:** Automatically generates key learning objectives for each lesson.
- **Interactive Study Tools:**
    - **Quizzes:** Test your knowledge with multiple-choice questions.
    - **Flashcards:** Practice active recall with generated flashcards.
    - **Summaries:** Get comprehensive summaries and key takeaways.
    - **Concept Maps:** Visualize connections between ideas.
- **AI Tutor:** Chat with an AI tutor that helps you understand the lesson content better without giving away the answers directly.
- **Multi-language Support:** The app automatically detects the lesson's language and adapts the UI.

## 🚀 Getting Started

This project is a static web application built with React and TypeScript, using the Gemini API for its AI capabilities.

### Prerequisites

- A modern web browser.
- An API key for the Gemini API.

### Running Locally

This application is designed to be run in a managed environment where the `index.tsx` file is automatically compiled and served. To run it on a standard local machine:

1.  **Set up a build tool:** Use a tool like Vite, Create React App, or esbuild to handle the JSX/TSX compilation.
2.  **Environment Variables:** Create a `.env` file and add your Gemini API key:
    ```
    API_KEY=YOUR_GEMINI_API_KEY
    ```
3.  **Install dependencies and run:**
    ```bash
    npm install
    npm start
    ```

## 🌐 Deployment

This application is ready for deployment on Netlify.

1.  **Push to GitHub:** Create a new repository on GitHub and push the project files.
2.  **Connect to Netlify:**
    - Log in to your Netlify account.
    - Click "New site from Git".
    - Choose your GitHub repository.
3.  **Configure Build Settings:**
    - The `netlify.toml` file included in this repository pre-configures the build settings. Netlify will automatically detect and use it.
    - **Build command:** `echo 'No build step required'`
    - **Publish directory:** `/` (root)
4.  **Set Environment Variables:**
    - In the Netlify site settings, go to "Site configuration" > "Environment variables".
    - Add a new variable:
        - **Key:** `API_KEY`
        - **Value:** Your Gemini API key.
5.  **Deploy!** Click "Deploy site" and Netlify will handle the rest.

---
Built with ❤️ and the power of AI.
