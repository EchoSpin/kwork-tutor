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
  const [copiedId, setCopiedId] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const [sessionData, setSessionData] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const feedbackRef = useRef(null);

  const SENTENCES_PER_SESSION = 10;

  const generateSentences = async () => {
    if (!apiKey.trim()) {
      setFeedback({
        type: 'error',
        title: 'API Key Required',
        message: 'Please enter your Anthropic API key in settings first.'
      });
      setShowApiInput(true);
      return;
    }

    setIsGenerating(true);
    setFeedback(null);

    try {
      const difficultyPrompt = {
        beginner: 'simple, everyday workplace interactions (greetings, basic requests, simple status updates)',
        intermediate: 'typical workplace scenarios (meetings, project updates, feedback, deadlines)',
        advanced: 'complex technical or strategic discussions (dependencies, conditionals, technical specifications)'
      };

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          system: `You are an expert Korean workplace language instructor. Generate realistic workplace sentences for translation practice.

You MUST respond ONLY with valid JSON (no markdown, no preamble). The format MUST be:
{
  "sentences": [
    {
      "english": "English sentence",
      "korean": "Korean translation",
      "context": "usage context",
      "hint": "Grammar hint for the student",
      "keyPoints": ["grammar point 1", "grammar point 2"]
    }
  ]
}

Generate ${SENTENCES_PER_SESSION} unique, realistic workplace sentences. Each should:
- Be appropriate for ${difficulty} level: ${difficultyPrompt[difficulty]}
- Have natural, professional Korean that a native speaker would use
- Include varied grammar patterns and sentence structures
- Cover different workplace scenarios (requests, reports, feedback, planning, etc.)
- NOT repeat any common patterns within the same batch

Make the Korean natural and idiomatic, not textbook-like.`,
          messages: [
            {
              role: 'user',
              content: `Generate ${SENTENCES_PER_SESSION} workplace translation sentences for ${difficulty} level Korean learners.`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        setFeedback({
          type: 'error',
          title: 'API Error',
          message: data.error.message || 'Failed to generate sentences.'
        });
        setIsGenerating(false);
        return;
      }

      if (data.content && data.content[0] && data.content[0].text) {
        const generatedText = data.content[0].text;
        let cleanJson = generatedText;
        
        if (generatedText.includes('```json')) {
          cleanJson = generatedText.split('```json')[1].split('```')[0];
        } else if (generatedText.includes('```')) {
          cleanJson = generatedText.split('```')[1].split('```')[0];
        }

        const parsed = JSON.parse(cleanJson.trim());
        setSentences(parsed.sentences);
        setCurrentIndex(0);
        setCompletedCount(0);
        setSessionData([]);
        setUserTranslation('');
        setFeedback(null);
        setShowHint(false);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to generate sentences.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    generateSentences();
  }, [difficulty]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSessionStats = () => {
    if (sessionData.length === 0) return null;

    const totalAttempts = sessionData.length;
    const correctAnswers = sessionData.filter(d => d.isCorrect).length;
    const accuracy = Math.round((correctAnswers / totalAttempts) * 100);

    const errorsByType = {};
    sessionData.forEach(item => {
      if (item.errors) {
        item.errors.forEach(error => {
          errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
        });
      }
    });

    const strengths = sessionData.filter(d => d.isCorrect && d.strengths).flatMap(d => d.strengths);
    const strengthCounts = {};
    strengths.forEach(s => {
      strengthCounts[s] = (strengthCounts[s] || 0) + 1;
    });

    return {
      totalAttempts,
      correctAnswers,
      accuracy,
      errorsByType: Object.entries(errorsByType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      topStrengths: Object.entries(strengthCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    };
  };

  const evaluateTranslation = async () => {
    if (!userTranslation.trim()) {
      setFeedback({
        type: 'error',
        title: 'Empty translation',
        message: 'Please enter a translation before submitting.'
      });
      return;
    }

    if (!apiKey.trim()) {
      setFeedback({
        type: 'error',
        title: 'API Key Required',
        message: 'Please enter your Anthropic API key. Click the settings icon to add it.'
      });
      setShowApiInput(true);
      return;
    }

    if (sentences.length === 0) {
      setFeedback({
        type: 'error',
        title: 'No Sentences',
        message: 'Sentences are still generating. Please wait.'
      });
      return;
    }

    const currentSentence = sentences[currentIndex];
    setIsLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an expert Korean language tutor specializing in workplace Korean. Your task is to evaluate Korean translations and provide constructive feedback.

IMPORTANT: You MUST respond ONLY with valid JSON (no markdown, no code blocks, no preamble). The JSON structure MUST be:
{
  "isCorrect": boolean,
  "accuracy": number (0-100),
  "errors": [
    {
      "type": "grammar|particle|verb|vocabulary|formality|structure",
      "location": "specific part",
      "issue": "what's wrong",
      "explanation": "why and the rule",
      "correction": "correct form"
    }
  ],
  "strengths": ["what they did well"],
  "suggestion": "assessment and next steps",
  "alternativeCorrect": ["other acceptable translations"]
}`,
          messages: [
            {
              role: 'user',
              content: `Evaluate this Korean translation.

English: "${currentSentence.english}"
Correct Korean: "${currentSentence.korean}"
User's translation: "${userTranslation}"

Evaluate for grammatical accuracy, particles, verb tenses, formality, and structure.`
            }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        setFeedback({
          type: 'error',
          title: 'API Error',
          message: data.error.message || 'Failed to evaluate.'
        });
        return;
      }

      if (data.content && data.content[0] && data.content[0].text) {
        const evaluationText = data.content[0].text;

        let cleanJson = evaluationText;
        if (evaluationText.includes('```json')) {
          cleanJson = evaluationText.split('```json')[1].split('```')[0];
        } else if (evaluationText.includes('```')) {
          cleanJson = evaluationText.split('```')[1].split('```')[0];
        }

        const evaluation = JSON.parse(cleanJson.trim());
        const feedbackData = {
          type: evaluation.isCorrect ? 'success' : 'error',
          ...evaluation
        };

        setFeedback(feedbackData);

        const newSessionData = [...sessionData, {
          english: currentSentence.english,
          korean: currentSentence.korean,
          userTranslation,
          isCorrect: evaluation.isCorrect,
          errors: evaluation.errors,
          strengths: evaluation.strengths,
          accuracy: evaluation.accuracy
        }];

        setSessionData(newSessionData);

        if (evaluation.isCorrect) {
          setCompletedCount(prev => prev + 1);
        }

        if (newSessionData.length === sentences.length) {
          setTimeout(() => setShowSummary(true), 1000);
        }
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to evaluate.'
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

  const resetSession = () => {
    setShowSummary(false);
    generateSentences();
  };

  const currentSentence = sentences.length > 0 ? sentences[currentIndex] : null;
  const stats = getSessionStats();
  const isSessionComplete = sessionData.length === sentences.length && sentences.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 p-4 md:p-6">
      {showApiInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-cyan-400 mb-4">Anthropic API Key</h2>
            <p className="text-slate-300 text-sm mb-4">
              Enter your API key to enable AI-powered feedback. Get one at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">console.anthropic.com</a>
            </p>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowApiInput(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (apiKey.trim()) {
                    setShowApiInput(false);
                    generateSentences();
                  }
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Save & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {showSummary && stats && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-cyan-400 flex items-center gap-2">
                <TrendingUp size={24} /> Session Summary
              </h2>
              <button
                onClick={() => setShowSummary(false)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
                <div className="text-3xl font-bold text-cyan-400">{stats.accuracy}%</div>
                <div className="text-xs text-slate-400 mt-1">Accuracy</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
                <div className="text-3xl font-bold text-green-400">{stats.correctAnswers}/{stats.totalAttempts}</div>
                <div className="text-xs text-slate-400 mt-1">Correct</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center border border-slate-600">
                <div className="text-3xl font-bold text-blue-400">{stats.totalAttempts}</div>
                <div className="text-xs text-slate-400 mt-1">Questions</div>
              </div>
            </div>

            {stats.errorsByType.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-red-300 mb-3 flex items-center gap-2">
                  <AlertCircle size={18} /> Areas to Improve
                </h3>
                <div className="space-y-2">
                  {stats.errorsByType.map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-red-600/30">
                      <span className="text-sm capitalize">{type}</span>
                      <span className="font-bold text-red-400">{count} error{count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stats.topStrengths.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                  <CheckCircle size={18} /> What You Did Well
                </h3>
                <div className="space-y-2">
                  {stats.topStrengths.map(([strength, count]) => (
                    <div key={strength} className="flex items-center gap-2 bg-slate-700/50 p-3 rounded-lg border border-green-600/30">
                      <span className="text-green-400">✓</span>
                      <span className="text-sm">{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowSummary(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Continue Practicing
              </button>
              <button
                onClick={resetSession}
                className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> New Session
              </button>
            </div>
          </div>
        </div>
      )}

      {currentSentence && (
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Korean Workplace Tutor
              </h1>
              <p className="text-slate-400 mt-2 text-sm">Dynamic sentence generation • AI-powered feedback</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-cyan-400">{completedCount}</div>
                <div className="text-xs md:text-sm text-slate-400">Correct</div>
              </div>
              <button
                onClick={() => setShowApiInput(!showApiInput)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="API Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            {['beginner', 'intermediate', 'advanced'].map(level => (
              <button
                key={level}
                onClick={() => {
                  setDifficulty(level);
                }}
                disabled={isGenerating}
                className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${
                  difficulty === level
                    ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-50'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs md:text-sm text-slate-400">
                Progress: {sessionData.length} / {sentences.length}
              </span>
              {isSessionComplete && (
                <button
                  onClick={resetSession}
                  className="flex items-center gap-2 px-3 py-1 text-xs md:text-sm bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  <RotateCcw size={14} /> New Session
                </button>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${sentences.length > 0 ? ((sessionData.length) / sentences.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-8 text-center">
            <div className="animate-spin text-cyan-400 mb-4">
              <BarChart3 size={32} className="mx-auto" />
            </div>
            <h2 className="text-lg font-semibold text-cyan-400 mb-2">Generating New Sentences</h2>
            <p className="text-slate-400">Creating {SENTENCES_PER_SESSION} unique {difficulty} level sentences for you...</p>
          </div>
        </div>
      )}

      {!isGenerating && currentSentence && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 md:p-6 mb-6">
            <div className="text-xs md:text-sm text-slate-400 mb-2 uppercase tracking-wider">English Sentence</div>
            <div className="text-lg md:text-xl font-semibold text-slate-100 mb-2">{currentSentence.english}</div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500">
              <span className="inline-block px-3 py-1 bg-slate-700/50 rounded">
                {currentSentence.context}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 md:p-6 mb-6">
            <div className="text-xs md:text-sm text-slate-400 mb-3 uppercase tracking-wider">Your Translation</div>
            <textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  evaluateTranslation();
                }
              }}
              placeholder="Type your Korean translation here..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-base md:text-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 resize-none h-24 md:h-32 font-korean"
            />
            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                onClick={evaluateTranslation}
                disabled={isLoading || !userTranslation.trim()}
                className="flex-1 min-w-[150px] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-2 md:py-3 px-4 md:px-6 rounded-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin">⟳</div>
                    <span className="hidden sm:inline">Evaluating...</span>
                  </>
                ) : (
                  <>
                    Check
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
              <button
                onClick={() => setShowHint(!showHint)}
                className="px-4 md:px-6 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-2 text-sm md:text-base"
              >
                <Lightbulb size={16} />
                <span className="hidden sm:inline">{showHint ? 'Hide' : 'Show'}</span> Hint
              </button>
            </div>
          </div>

          {showHint && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <Lightbulb className="text-blue-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <div className="font-semibold text-blue-300 mb-2 text-sm md:text-base">{currentSentence.hint}</div>
                  <div className="text-xs md:text-sm text-blue-200/80">
                    Key points: {currentSentence.keyPoints.join(' • ')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {feedback && (
            <div ref={feedbackRef} className="mb-6 animate-in fade-in duration-300">
              {feedback.type === 'success' ? (
                <div className="bg-green-900/30 border border-green-700 rounded-xl p-4 md:p-6">
                  <div className="flex gap-3 mb-4">
                    <CheckCircle className="text-green-400 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-bold text-green-300">Perfect!</h3>
                      <p className="text-green-200/80 mt-1 text-xs md:text-sm">{feedback.suggestion}</p>
                    </div>
                  </div>
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <div className="bg-green-900/20 rounded-lg p-3 mt-4">
                      <div className="text-xs md:text-sm font-semibold text-green-300 mb-2">What you did well:</div>
                      <ul className="text-xs md:text-sm text-green-200/80 space-y-1">
                        {feedback.strengths.map((strength, i) => (
                          <li key={i}>✓ {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <button
                    onClick={nextSentence}
                    disabled={currentIndex >= sentences.length - 1}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    {currentIndex >= sentences.length - 1 ? 'Session Complete' : 'Next Sentence'}
                    {currentIndex < sentences.length - 1 && <ChevronRight size={16} />}
                  </button>
                </div>
              ) : (
                <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 md:p-6">
                  <div className="flex gap-3 mb-4">
                    <AlertCircle className="text-red-400 flex-shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-bold text-red-300">Room for improvement</h3>
                      <p className="text-red-200/80 mt-1 text-xs md:text-sm">{feedback.suggestion}</p>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-3 md:p-4 mb-4 border border-slate-700">
                    <div className="text-xs md:text-sm text-slate-400 mb-2">Correct translation:</div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base md:text-lg text-cyan-300 font-semibold">{currentSentence.korean}</div>
                      <button
                        onClick={() => copyToClipboard(currentSentence.korean, 'correct')}
                        className="p-2 hover:bg-slate-800 rounded transition-colors flex-shrink-0"
                      >
                        {copiedId === 'correct' ? (
                          <Check size={16} className="text-green-400" />
                        ) : (
                          <Copy size={16} className="text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>

                  {feedback.errors && feedback.errors.length > 0 && (
                    <div className="space-y-3 mb-4">
                      <div className="text-xs md:text-sm font-semibold text-red-300">Issues found:</div>
                      {feedback.errors.map((error, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-lg p-3 md:p-4 border-l-4 border-red-500">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 text-xs md:text-sm">
                              <div className="font-semibold text-red-300">{error.type?.charAt(0)?.toUpperCase()}{error.type?.slice(1)}</div>
                              <div className="text-slate-300 mt-1">
                                <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-cyan-300">{error.location}</span>
                              </div>
                              <div className="text-slate-400 mt-2">
                                <div className="font-semibold text-slate-300 mb-1">Issue:</div>
                                {error.issue}
                              </div>
                              <div className="text-slate-400 mt-2">
                                <div className="font-semibold text-slate-300 mb-1">Explanation:</div>
                                {error.explanation}
                              </div>
                              {error.correction && (
                                <div className="text-slate-400 mt-2">
                                  <div className="font-semibold text-slate-300 mb-1">Correction:</div>
                                  <div className="font-mono bg-slate-900 px-3 py-2 rounded border border-slate-700 text-cyan-300 text-xs">
                                    {error.correction}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => {
                        setUserTranslation('');
                        setFeedback(null);
                        setShowHint(false);
                      }}
                      className="flex-1 min-w-[120px] bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm md:text-base"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={nextSentence}
                      disabled={currentIndex >= sentences.length - 1}
                      className="flex-1 min-w-[120px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm md:text-base"
                    >
                      {currentIndex >= sentences.length - 1 ? 'Session Complete' : 'Next'}
                      {currentIndex < sentences.length - 1 && <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="max-w-3xl mx-auto mt-8 md:mt-12 text-center text-slate-500 text-xs md:text-sm">
        <p>💡 Ctrl+Enter to submit • Every session generates unique sentences</p>
      </div>
    </div>
  );
}
