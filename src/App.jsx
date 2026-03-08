import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, RotateCcw, AlertCircle, CheckCircle, Lightbulb, Copy, Check, Settings, TrendingUp, BarChart3, X } from 'lucide-react';

export default function KoreanTranslationTutor() {
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userTranslation, setUserTranslation] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState('intermediate');
  const [completedCount, setCompletedCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(true);
  const [sessionData, setSessionData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);

  const SENTENCES_PER_SESSION = 10;

  const generateSentences = async (keyToUse = apiKey) => {
    if (!keyToUse || !keyToUse.trim()) {
      setFeedback({
        type: 'error',
        title: 'API Key Required',
        message: 'Please enter your Anthropic API key'
      });
      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: keyToUse,
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [
            {
              role: 'user',
              content: `Generate exactly 10 unique workplace Korean translation practice sentences for ${difficulty} level learners.

Format your response ONLY as valid JSON with this exact structure (no markdown, no extra text):
{
  "sentences": [
    {
      "english": "An English workplace sentence",
      "korean": "한국어 번역",
      "context": "context type",
      "hint": "grammar hint",
      "keyPoints": ["point1", "point2"]
    }
  ]
}

For ${difficulty} level, make sentences about: ${
                difficulty === 'beginner'
                  ? 'greetings, simple requests, basic updates'
                  : difficulty === 'intermediate'
                  ? 'meetings, project updates, feedback, deadlines'
                  : 'complex discussions, conditionals, technical details'
              }

Make sure the Korean is natural and professional.`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        setFeedback({
          type: 'error',
          title: 'API Error',
          message: `${data.error.type || 'Error'}: ${data.error.message}`
        });
        setIsGenerating(false);
        return;
      }

      if (data.content && data.content[0] && data.content[0].text) {
        const text = data.content[0].text;
        let json = text;

        if (text.includes('```json')) {
          json = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
          json = text.split('```')[1].split('```')[0];
        }

        const parsed = JSON.parse(json.trim());
        
        if (!parsed.sentences || !Array.isArray(parsed.sentences)) {
          throw new Error('Invalid response format');
        }

        setSentences(parsed.sentences);
        setCurrentIndex(0);
        setCompletedCount(0);
        setSessionData([]);
        setUserTranslation('');
        setFeedback(null);
        setShowHint(false);
        setShowApiInput(false);
      }
    } catch (error) {
      console.error('Generation error:', error);
      setFeedback({
        type: 'error',
        title: 'Error Generating Sentences',
        message: error.message || 'Failed to generate sentences. Check your API key and try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const evaluateTranslation = async () => {
    if (!userTranslation.trim()) {
      setFeedback({
        type: 'error',
        title: 'Empty Translation',
        message: 'Please enter a translation'
      });
      return;
    }

    if (!apiKey.trim()) {
      setShowApiInput(true);
      return;
    }

    if (sentences.length === 0) return;

    const currentSentence = sentences[currentIndex];
    setIsLoading(true);

    try {
      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Evaluate this Korean translation. Respond ONLY with valid JSON (no markdown):

English: "${currentSentence.english}"
Correct Korean: "${currentSentence.korean}"
User's translation: "${userTranslation}"

JSON format:
{
  "isCorrect": boolean,
  "accuracy": number (0-100),
  "errors": [{"type": "grammar|particle|verb|vocabulary|formality|structure", "location": "...", "issue": "...", "explanation": "...", "correction": "..."}],
  "strengths": ["..."],
  "suggestion": "...",
  "alternativeCorrect": ["..."]
}`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        setFeedback({
          type: 'error',
          title: 'Evaluation Error',
          message: data.error.message
        });
        return;
      }

      if (data.content && data.content[0]) {
        let text = data.content[0].text;
        let json = text;

        if (text.includes('```json')) {
          json = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
          json = text.split('```')[1].split('```')[0];
        }

        const evaluation = JSON.parse(json.trim());

        setFeedback({
          type: evaluation.isCorrect ? 'success' : 'error',
          ...evaluation
        });

        const newSessionData = [
          ...sessionData,
          {
            english: currentSentence.english,
            korean: currentSentence.korean,
            userTranslation,
            isCorrect: evaluation.isCorrect,
            errors: evaluation.errors || [],
            strengths: evaluation.strengths || [],
            accuracy: evaluation.accuracy
          }
        ];

        setSessionData(newSessionData);

        if (evaluation.isCorrect) {
          setCompletedCount(prev => prev + 1);
        }

        if (newSessionData.length === sentences.length) {
          setTimeout(() => setShowSummary(true), 1000);
        }
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      setFeedback({
        type: 'error',
        title: 'Error',
        message: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextSentence = () => {
    if (currentIndex < sentences.length - 1) {
      setUserTranslation('');
      setFeedback(null);
      setShowHint(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      generateSentences(apiKey);
    }
  };

  const getSessionStats = () => {
    if (sessionData.length === 0) return null;

    const totalAttempts = sessionData.length;
    const correctAnswers = sessionData.filter(d => d.isCorrect).length;
    const accuracy = Math.round((correctAnswers / totalAttempts) * 100);

    const errorsByType = {};
    sessionData.forEach(item => {
      if (item.errors && Array.isArray(item.errors)) {
        item.errors.forEach(error => {
          errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });
      }
    });

    return {
      totalAttempts,
      correctAnswers,
      accuracy,
      errorsByType: Object.entries(errorsByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    };
  };

  const currentSentence = sentences[currentIndex];
  const stats = getSessionStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4">
      {/* API Key Modal */}
      {showApiInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">🔑 Anthropic API Key</h2>
            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
              Enter your API key to start. Get a free one at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-semibold">
                console.anthropic.com
              </a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') handleSaveApiKey();
              }}
              placeholder="sk-ant-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 mb-4"
              autoFocus
            />
            {feedback && feedback.type === 'error' && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4 text-red-200 text-sm">
                {feedback.message}
              </div>
            )}
            <button
              onClick={handleSaveApiKey}
              disabled={!apiKey.trim() || isGenerating}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Save & Start'}
            </button>
          </div>
        </div>
      )}

      {/* Session Summary Modal */}
      {showSummary && stats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">📊 Session Summary</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-cyan-400">{stats.accuracy}%</div>
                <div className="text-xs text-slate-400 mt-1">Accuracy</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-400">{stats.correctAnswers}/{stats.totalAttempts}</div>
                <div className="text-xs text-slate-400 mt-1">Correct</div>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-400">{stats.totalAttempts}</div>
                <div className="text-xs text-slate-400 mt-1">Total</div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSummary(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowSummary(false);
                  generateSentences(apiKey);
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> New Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {!showApiInput && sentences.length > 0 && currentSentence && (
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-4xl font-bold text-cyan-400">Korean Workplace Tutor</h1>
              <button
                onClick={() => setShowApiInput(true)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
              >
                <Settings size={20} />
              </button>
            </div>

            <div className="flex gap-2 mb-6">
              {['beginner', 'intermediate', 'advanced'].map(level => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-lg font-semibold ${
                    difficulty === level
                      ? 'bg-cyan-500 text-slate-900'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="flex justify-between mb-2 text-sm text-slate-400">
                <span>Progress</span>
                <span>{completedCount} correct</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all"
                  style={{ width: `${sentences.length > 0 ? (sessionData.length / sentences.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {isGenerating ? (
            <div className="text-center py-12">
              <BarChart3 className="animate-spin mx-auto mb-4 text-cyan-400" size={32} />
              <p className="text-slate-400">Generating sentences...</p>
            </div>
          ) : (
            <>
              {/* English Sentence */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6 mb-6">
                <div className="text-xs text-slate-400 mb-2 uppercase">English Sentence</div>
                <div className="text-xl font-semibold mb-3">{currentSentence.english}</div>
                <span className="inline-block px-3 py-1 bg-slate-700/50 text-xs rounded">
                  {currentSentence.context}
                </span>
              </div>

              {/* Translation Input */}
              <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-6 mb-6">
                <div className="text-xs text-slate-400 mb-3 uppercase">Your Korean Translation</div>
                <textarea
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) evaluateTranslation();
                  }}
                  placeholder="Type your translation here..."
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 h-24 font-korean resize-none"
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={evaluateTranslation}
                    disabled={isLoading || !userTranslation.trim()}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 py-2 rounded-lg font-bold"
                  >
                    {isLoading ? 'Checking...' : 'Check Answer'}
                  </button>
                  <button
                    onClick={() => setShowHint(!showHint)}
                    className="px-6 bg-slate-700 hover:bg-slate-600 rounded-lg"
                  >
                    <Lightbulb size={18} />
                  </button>
                </div>
              </div>

              {/* Hint */}
              {showHint && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
                  <div className="font-semibold text-blue-300 mb-2">{currentSentence.hint}</div>
                  <div className="text-sm text-blue-200/80">
                    Key points: {currentSentence.keyPoints.join(' • ')}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div
                  className={`rounded-xl p-6 mb-6 border ${
                    feedback.type === 'success'
                      ? 'bg-green-900/30 border-green-700'
                      : 'bg-red-900/30 border-red-700'
                  }`}
                >
                  <div className="flex gap-3 mb-4">
                    {feedback.type === 'success' ? (
                      <CheckCircle className="text-green-400 flex-shrink-0" size={20} />
                    ) : (
                      <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                    )}
                    <div className="flex-1">
                      <h3 className={`font-bold text-lg ${feedback.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                        {feedback.type === 'success' ? '✓ Correct!' : '✗ Not quite'}
                      </h3>
                      <p className={`text-sm mt-1 ${feedback.type === 'success' ? 'text-green-200/80' : 'text-red-200/80'}`}>
                        {feedback.suggestion}
                      </p>
                    </div>
                  </div>

                  {feedback.type === 'error' && (
                    <>
                      <div className="bg-slate-900/50 p-3 rounded mb-4 border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">Correct answer:</div>
                        <div className="text-cyan-300 font-semibold">{currentSentence.korean}</div>
                      </div>

                      {feedback.errors && feedback.errors.length > 0 && (
                        <div className="space-y-3 mb-4">
                          <div className="text-sm font-semibold text-red-300">Issues:</div>
                          {feedback.errors.map((error, i) => (
                            <div key={i} className="bg-slate-800/50 p-3 rounded border-l-4 border-red-500 text-sm">
                              <div className="font-semibold text-red-300 mb-1">{error.type}</div>
                              <div className="text-slate-300">{error.explanation}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex gap-3">
                    {feedback.type === 'error' && (
                      <button
                        onClick={() => {
                          setUserTranslation('');
                          setFeedback(null);
                        }}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg"
                      >
                        Try Again
                      </button>
                    )}
                    <button
                      onClick={nextSentence}
                      disabled={currentIndex >= sentences.length - 1}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg"
                    >
                      {currentIndex >= sentences.length - 1 ? 'Finish' : 'Next'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!showApiInput && isGenerating && (
        <div className="max-w-3xl mx-auto text-center py-20">
          <BarChart3 className="animate-spin mx-auto mb-4 text-cyan-400" size={48} />
          <p className="text-slate-400 text-lg">Loading new sentences...</p>
        </div>
      )}

      {!showApiInput && sentences.length === 0 && !isGenerating && (
        <div className="max-w-3xl mx-auto text-center py-20">
          <p className="text-slate-400 mb-4">No sentences loaded. Click settings to refresh.</p>
          <button
            onClick={() => setShowApiInput(true)}
            className="bg-cyan-600 hover:bg-cyan-700 px-6 py-2 rounded-lg"
          >
            Settings
          </button>
        </div>
      )}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;600;700&display=swap');
        .font-korean {
          font-family: 'Noto Sans KR', sans-serif;
        }
      `}</style>
    </div>
  );
}
