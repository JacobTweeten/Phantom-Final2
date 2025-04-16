import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Typography } from "antd";
import styles from "../css/LoadingScreen.module.css";

const { Title, Paragraph } = Typography;

const hints = [
  "There are spirits all around us",
  "Try making your presence welcomed",
  "Commence a séance beforehand",
  "Try Speaking kindly. The spirits are sensitive."
];

const LoadingScreen = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState(null);
  const [searchText, setSearchText] = useState("Searching for ghosts");
  const [dots, setDots] = useState("...");
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    let audio = null;
    if (loading) {
      audio = new Audio("/sounds/loadingSong2.mp3");
      audio.loop = true;
      audio.play();

      const searchTimeout = setTimeout(() => {
        setSearchText("Potential ghost connection found!");
      }, 10000);

      const dotInterval = setInterval(() => {
        setDots((prevDots) => (prevDots.length < 3 ? prevDots + "." : ""));
      }, 500);

      const hintInterval = setInterval(() => {
        setHintIndex((prevIndex) => (prevIndex + 1) % hints.length);
      }, 4000);

      const redirectTimeout = setTimeout(() => {
        navigate(selectedMode === "text" ? "/chat" : "/speak-with-ghosts");
      }, 15000);

      return () => {
        clearTimeout(searchTimeout);
        clearTimeout(redirectTimeout);
        clearInterval(dotInterval);
        clearInterval(hintInterval);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      };
    }
  }, [loading, selectedMode, navigate]);

  const handleSelection = (mode) => {
    setSelectedMode(mode);
    setLoading(true);
  };

  return (
    <div className={styles.container}  style={{
      background: "linear-gradient(to bottom, #8865b9, white)",
      backgroundColor: "transparent"
    }}>
      <div className={styles.hintBox}>
        <Paragraph className={styles.hint}>{hints[hintIndex]}</Paragraph>
      </div>
      {loading ? (
        <div className={styles.loadingWrapper}>
          <img src="/pics/loading.gif" alt="Loading..." className={styles.loadingGif} />
          <Title level={3} className={styles.searchText}>{searchText}{dots}</Title>
        </div>
      ) : (
        <>
          <Title level={2} className={styles.title}>Choose Your Interaction Mode</Title>
          <div className={styles.buttonContainer}>
            <Button className={styles.textButton} type="primary" size="large" onClick={() => handleSelection("text")}>
              Use Text
            </Button>
            <Button className={styles.speechButton} type="default" size="large" onClick={() => handleSelection("speech")}>
              Use Speech
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default LoadingScreen;