import React, { useState, useEffect } from "react";
import { Button, Layout, notification } from "antd";
import { useNavigate } from "react-router-dom";
import { ReactTyped } from "react-typed"; // For typing effect
import styles from "../css/SpeakWithGhosts.module.css";

const API_URL = process.env.REACT_APP_API_URL || "/api";

const { Header, Content, Footer } = Layout;

const SpeakWithGhosts = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [ghostMessage, setGhostMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [waveGif, setWaveGif] = useState("/pics/wave1.gif");
  const [background, setBackground] = useState("linear-gradient(to bottom, #b865ad, white)");
  const [sentimentThreshold, setSentimentThreshold] = useState(false);

  const positiveAudio = new Audio("/sounds/positiveSentiment.mp3");
  const negativeAudio = new Audio("/sounds/negativeSentiment.mp3");

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
  
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const ziraVoice = voices.find(v => v.name.includes("Mark")); // Find Microsoft Zira voice
  
      if (ziraVoice) {
        utterance.voice = ziraVoice; // Assign Zira's voice
      } else {
        utterance.voice = voices[0]; // Default fallback voice
      }
  
      window.speechSynthesis.speak(utterance);
    };
  
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
  
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 0.9;
  };
  

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      notification.error({
        message: "Unsupported Feature",
        description: "Speech recognition is not supported in this browser.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setWaveGif("/pics/wavefull.gif");

      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: transcript }),
          credentials: "include",
        });

        const data = await response.json();
        if (data.reply) {
          setIsTyping(true);
          setGhostMessage(data.reply);
          handleBackgroundChange(data.sentiment);
          speakText(data.reply);

          setTimeout(() => {
            setIsTyping(false);
            setWaveGif("/pics/wave1.gif");
          }, data.reply.length * 50 + 500);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };

    recognition.onerror = () => {
      notification.error({
        message: "Error",
        description: "There was an error with speech recognition.",
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleBackgroundChange = (sentiment) => {
    if (sentimentThreshold) return;

    if (sentiment >= 2) {
        setBackground("#7ab865");
        positiveAudio.play();
        setTimeout(() => setBackground("linear-gradient(to bottom, #b865ad, white)"), 3000);
        setSentimentThreshold(true);
    } else if (sentiment <= -2) {
        setBackground("#b8211d");
        negativeAudio.play();
        setTimeout(() => setBackground("linear-gradient(to bottom, #b865ad, white)"), 3000);
        setSentimentThreshold(true);
    }
  };

  const handleEndConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/end-conversation`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      if (data.message === "Conversation saved successfully.") {
        notification.success({
          message: "Conversation Ended",
          description: "Your conversation has been saved.",
        });
        navigate("/home");
      } else {
        notification.error({
          message: "Error",
          description: data.error || "There was an error ending the conversation.",
        });
      }
    } catch (error) {
      notification.error({
        message: "Server Error",
        description: "There was an error with the server.",
      });
    }
  };

  return (
    <Layout className={styles.container} style={{ background }}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <img src="/pics/ghostlogo.png" alt="Ghost Logo" className={styles.logoImage} />
          <span className={styles.logoText}>Phantom Link</span>
        </div>
      </Header>

      <Content className={styles.chatContent}>
        {/* Ghost Status Indicator */}
        <div className={styles.ghostStatus}>
          <span>GHOST CONNECTED</span>
        </div>

        {/* Ghost Animation & Message */}
        <div className={styles.ghostContainer}>
          <img src={waveGif} alt="Ghost Animation" className={styles.ghostGif} />
          {ghostMessage && (
            <div className={styles.ghostMessage}>
              {isTyping ? (
                <ReactTyped strings={[ghostMessage]} typeSpeed={50} backSpeed={30} startDelay={500} loop={false} />
              ) : (
                ghostMessage
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className={styles.buttonContainer}>
          <Button className={styles.speakButton} onClick={startListening}>
            {isListening ? "Listening..." : "Press to Speak"}
          </Button>
          <Button className={styles.endButton} onClick={handleEndConversation}>
            End Conversation
          </Button>
        </div>
      </Content>

      <Footer className={styles.footer}>Phantom-Link 2025 Created by Jacob Tweeten</Footer>
    </Layout>
  );
};

export default SpeakWithGhosts;