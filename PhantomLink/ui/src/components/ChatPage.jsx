import React, { useState, useEffect, useRef } from "react";
import { Input, Button, Layout, notification } from "antd";
import { useNavigate } from "react-router-dom";
import styles from "../css/ChatPage.module.css";

const API_URL = process.env.REACT_APP_API_URL || "/api";
const { Header, Content, Footer } = Layout;

const ChatPage = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [background, setBackground] = useState("linear-gradient(to bottom, #b865ad, white)");
  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastGhostReply, setLastGhostReply] = useState("");
  const [sentimentThreshold, setSentimentThreshold] = useState(false);
  const [userMessageDisplay, setUserMessageDisplay] = useState("");

  const ghostMessageRef = useRef("");
  const intervalRef = useRef(null);

  const positiveAudioRef = useRef(null);
  const negativeAudioRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const typeGhostResponse = (message) => {
    ghostMessageRef.current = message;
    setTypedText("");
    setIsTyping(true);
    let index = 0;

    clearInterval(intervalRef.current);
    const batchSize = 2;
    intervalRef.current = setInterval(() => {
      setTypedText((prev) => {
        const nextChunk = ghostMessageRef.current.slice(index, index + batchSize);
        index += batchSize;

        if (index >= ghostMessageRef.current.length) {
          clearInterval(intervalRef.current);
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: ghostMessageRef.current },
          ]);
          setLastGhostReply(ghostMessageRef.current);
        }

        return prev + nextChunk;
      });
    }, 100);
  };

  const handleSend = async () => {
    if (!userInput.trim() || isTyping) return;

    setUserMessageDisplay(userInput);
    setTimeout(() => setUserMessageDisplay(""), 3000);

    const userMessage = { role: "user", content: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
        credentials: "include",
      });

      const data = await response.json();
      if (data.reply) {
        typeGhostResponse(data.reply);
        handleBackgroundChange(data.sentiment);
      } else {
        console.error(data.error);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleBackgroundChange = (sentiment) => {
    if (sentimentThreshold) return;

    if (sentiment >= 3 && positiveAudioRef.current) {
      setBackground("#7ab865");
      positiveAudioRef.current.currentTime = 0;
      positiveAudioRef.current.play().catch(() => {});
      setTimeout(() => setBackground("linear-gradient(to bottom, #b865ad, white)"), 3000);
      setSentimentThreshold(true);
    } else if (sentiment <= -2 && negativeAudioRef.current) {
      setBackground("#b8211d");
      negativeAudioRef.current.currentTime = 0;
      negativeAudioRef.current.play().catch(() => {});
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
        await fetch(`${API_URL}/reset-session`, {
          method: "POST",
          credentials: "include",
        });

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

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/me`, {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        if (!data.username) navigate("/login");
      } catch (error) {
        console.error("Error checking login status:", error);
      }
    };

    checkLoginStatus();
  }, []);

  return (
    <Layout className={styles.chatpageContainer} style={{ background }}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <img src="/pics/ghostlogo.png" alt="Ghost Logo" className={styles.logoImage} />
          <span className={styles.logoText}>Phantom Link</span>
        </div>
      </Header>

      <Content className={styles.chatContent}>
        <div className={styles.ghostStatus}><span>GHOST CONNECTED</span></div>

        <div className={styles.ghostContainer}>
          <img
            src={isTyping ? "/pics/wavefull.webp" : "/pics/wave1.webp"}
            alt="Ghost"
            className={styles.ghostGif}
          />

          {(typedText || lastGhostReply) && (
            <div className={styles.ghostMessage}>
              {isTyping ? (
                <>
                  {typedText}
                  <span className={styles.cursor}>|</span>
                </>
              ) : (
                lastGhostReply
              )}
            </div>
          )}
        </div>

        {userMessageDisplay && (
          <div className={styles.userMessageDisplay}>
            <strong>Your Message:</strong> {userMessageDisplay}
          </div>
        )}

        <div className={styles.inputContainer}>
          <Input
            className={styles.inputField}
            placeholder="Type your message..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onPressEnter={handleSend}
            disabled={isTyping}
          />
          <Button className={styles.sendButton} type="primary" onClick={handleSend} disabled={isTyping}>
            Send
          </Button>
        </div>

        <div className={styles.endButton}>
          <Button type="danger" onClick={handleEndConversation}>
            End Conversation
          </Button>
        </div>
      </Content>

      <Footer className={styles.footer}>
        Phantom Link 2025 Created by Jacob Tweeten
      </Footer>

      {/* Preload both ghost webo in background (for smoother transitions) */}
      <div style={{ display: "none" }}>
        <img src="/pics/wave1.webp" alt="Preload Ghost Idle" />
        <img src="/pics/wavefull.webp" alt="Preload Ghost Speaking" />
      </div>

      <audio ref={positiveAudioRef} src="/sounds/positiveSentiment.mp3" preload="auto" />
      <audio ref={negativeAudioRef} src="/sounds/negativeSentiment.mp3" preload="auto" />
    </Layout>
  );
};

export default ChatPage;
