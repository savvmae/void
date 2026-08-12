import React, { useCallback, useEffect, useState } from "react";
import { Vortex } from "react-loader-spinner";
import {
  isConfigured,
  supabase,
  supabaseAnonKey,
  submitAnswerUrl,
} from "./supabaseClient";
import "./Void.css";

const MAX_ANSWER_LENGTH = 200;

export const Void = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [loadError, setLoadError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAnswer, setNewAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  const loadAnswers = useCallback(async () => {
    if (!isConfigured) return;
    const { data, error } = await supabase
      .from("answers")
      .select("text")
      .eq("status", "approved");

    if (error) {
      setLoadError("the void is unreachable right now. try again later");
      return;
    }
    setLoadError("");
    setAnswers((data || []).map((row) => row.text));
  }, []);

  useEffect(() => {
    loadAnswers();
  }, [loadAnswers]);

  const handleAskQuestion = () => {
    if (!answers.length) return;
    setIsLoading(true);
    setAnswer("");
    // A beat of suspense, then an answer. The void does not rush.
    window.setTimeout(() => {
      const pick = answers[Math.floor(Math.random() * answers.length)];
      setAnswer(pick);
      setIsLoading(false);
    }, 900);
  };

  const handleReset = () => {
    if (answer) setQuestion("");
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!isConfigured || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch(submitAnswerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ text: newAnswer }),
      });
      const data = await response.json();

      if (data.ok && data.status === "approved") {
        setSubmitResult({ tone: "good", text: data.message });
        setNewAnswer("");
        loadAnswers();
      } else if (data.ok && data.status === "rejected") {
        setSubmitResult({
          tone: "bad",
          text: `${data.message}: ${data.reason}`,
        });
      } else {
        setSubmitResult({
          tone: "bad",
          text: data.error || "something went wrong",
        });
      }
    } catch (err) {
      setSubmitResult({
        tone: "bad",
        text: "couldn't reach the void. try again in a bit",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const askDisabled = !isConfigured || isLoading || !answers.length;

  return (
    <div className="wrapper">
      <p className="message">
        ask it anything. have some fun in the void
      </p>

      {!isConfigured ? (
        <p className="void-notice">
          the void isn't hooked up yet. add REACT_APP_SUPABASE_URL and
          REACT_APP_SUPABASE_ANON_KEY to your .env and restart.
        </p>
      ) : null}
      {loadError ? <p className="void-notice">{loadError}</p> : null}

      <input
        className="question-input"
        onChange={(e) => setQuestion(e.target.value)}
        value={question}
        onFocus={handleReset}
        aria-label="ask the void a question"
      />
      <button
        className="ask-button"
        onClick={handleAskQuestion}
        disabled={askDisabled}
      >
        ask it
      </button>

      <div className="answer-wrapper">
        <Vortex
          visible={isLoading}
          height="150"
          width="150"
          ariaLabel="vortex-loading"
          colors={["white", "purple", "blue", "turqoise", "silver"]}
        />
        {answer ? <p className="answer">{answer}!</p> : null}
      </div>

      {isConfigured ? (
        <div className="add-answer">
          <button
            type="button"
            className="add-answer-toggle"
            onClick={() => setIsFormOpen((open) => !open)}
          >
            {isFormOpen ? "never mind" : "add an answer"}
          </button>

          {isFormOpen ? (
            <form className="add-answer-form" onSubmit={handleSubmitAnswer}>
              <input
                className="question-input add-answer-input"
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                maxLength={MAX_ANSWER_LENGTH}
                placeholder="the stars say yes"
                aria-label="your answer"
              />
              <button
                className="ask-button"
                type="submit"
                disabled={isSubmitting || !newAnswer.trim()}
              >
                {isSubmitting ? "checking..." : "send it"}
              </button>
              {submitResult ? (
                <p className={`add-answer-result ${submitResult.tone}`}>
                  {submitResult.text}
                </p>
              ) : null}
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
