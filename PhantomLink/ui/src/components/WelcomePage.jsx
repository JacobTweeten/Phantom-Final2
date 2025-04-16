import { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from "../css/WelcomePage.module.css";

const Login = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);

    const audio = new Audio("/sounds/landingsong2.mp3");
    audio.loop = true;
    audio.play();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      audio.pause();
      audio.currentTime = 0;
    };
  }, []);

  // Parallax effect movement calculations
  const bgMove = scrollY * 0.0;
  const cloud1Move = scrollY * 0.3;
  const midMove2 = scrollY * 0.1;
  const midMove = scrollY * 0.2;
  const cloud2Move = scrollY * 0.1;
  const fgMove = scrollY * 0.0;

  return (
    <div className={styles.pageContainer}>
      {/* Parallax Container */}
      <div className={styles.parallaxContainer}>

        {/* Background */}
        <div className={styles.parallaxLayer} style={{ backgroundImage: "url('/pics/Parralax1.gif')", transform: `translateY(${bgMove}px)` }} />
        
        {/* Cloud 1 */}
        <div className={styles.parallaxLayer} style={{ backgroundImage: "url('/pics/cloud1.png')", transform: `translateY(${cloud1Move}px)`, top: "120px" }} />

        {/* Logo */}
        <div className={styles.parallaxLayer} style={{ backgroundImage: "url('/pics/logoforparalax.png')", transform: `translateY(${midMove2 + 100}px)`, backgroundSize: "contain" }} />

        {/* Midground Hills */}
        <div className={styles.parallaxLayer} style={{ backgroundImage: "url('/pics/backhills.png')", transform: `translateY(${midMove}px)` }} />

        {/* Cloud 2 */}
        <div className={`${styles.parallaxLayer} ${styles.cloud2}`} style={{ backgroundImage: "url('/pics/cloud2.png')", transform: `translateY(${cloud2Move}px)`, top: "150px" }} />

        {/* Foreground Graves */}
        <div className={styles.parallaxLayer} style={{ backgroundImage: "url('/pics/frontgraves.png')", transform: `translateY(${fgMove}px)` }} />
      </div>

      {/* Welcome Message and Button */}
      <div className={styles.contentContainer}>
        <h2 className={styles.headerText}>Welcome to Phantom-Link</h2>
        <Button className={styles.EnterButton} onClick={() => navigate('/login')}>
          Enter
        </Button>
        <p className={styles.bodyText}>
        Phantom-Link is a location-based web application that blends history and technology, enabling users to interact with "ghosts" of historical figures from their area. By leveraging AI and historical data, the application generates engaging, era-appropriate conversations that provide a unique educational and storytelling experience.
        </p>
        
      </div>
    </div>
  );
};

export default Login;
