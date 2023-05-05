import React, { useState } from "react";
import axios from "axios";
import { Vortex } from "react-loader-spinner";
import "./Void.css";

export const Void = () => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAskQuestion = async () => {
    setIsLoading(true);
    if (answer) setAnswer("");
    const response = await axios({
      method: "get",
      url: "https://magic-8-ball4.p.rapidapi.com/magic_8_ball",
      headers: {
        "X-RapidAPI-Key": "5baffa8991mshc4499d602bb16bep1e3a17jsn51b5b6bd5c94",
        "X-RapidAPI-Host": "magic-8-ball4.p.rapidapi.com",
      },
      params: {
        question,
      },
    });
    setAnswer(response.data.response);
    setIsLoading(false);
  };

  const handleReset = () => {
    if (answer) setQuestion("");
  };

  return (
    <div className="wrapper">
      <p className="message">
        hey baby girl. i love you. have some fun in the void
      </p>
      <input
        className="question-input"
        onChange={(e) => setQuestion(e.target.value)}
        value={question}
        onFocus={handleReset}
      />
      <button className="ask-button" onClick={handleAskQuestion}>
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
    </div>
  );
};
