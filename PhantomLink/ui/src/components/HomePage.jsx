import React, { useEffect, useState } from "react";
import { Layout, Menu, Button, Typography, Space, notification, Dropdown  } from "antd";
import { HomeOutlined, HistoryOutlined, EnvironmentOutlined, SearchOutlined, LoginOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "../css/HomePage.module.css";

const API_URL = process.env.REACT_APP_API_URL || "/api";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const HomePage = () => {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [locationShared, setLocationShared] = useState(false);

  useEffect(() => {
    checkLoginStatus();
    checkLocationStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();
      if (data.username) {
        setLoggedIn(true);
        setUsername(data.username);
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error("Error checking login status:", error);
    }
  };

  const checkLocationStatus = () => {
    const location = localStorage.getItem("locationShared");
    setLocationShared(location === "true");
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      setLoggedIn(false);
      setUsername("");
      notification.success({ message: "Logged Out", description: "You have been logged out successfully." });
      navigate("/");
    } catch (error) {
      console.error("Error during logout:", error);
      notification.error({ message: "Logout Failed", description: "There was an error logging you out. Please try again." });
    }
  };

  const shareLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          fetch(`${API_URL}/location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              location_allowed: true,
            }),
            credentials: "include",
          })
            .then((response) => response.json())
            .then((data) => {
              localStorage.setItem("locationShared", "true");
              setLocationShared(true);
              notification.success({
                message: "Location Shared",
                description: "Your location has been successfully shared!",
              });
            })
            .catch((error) => {
              console.error("Error sharing location:", error);
              notification.error({
                message: "Error",
                description: "There was an error sharing your location.",
              });
            });
        },
        (error) => {
          console.error("Geolocation error:", error);
          notification.error({
            message: "Geolocation Error",
            description: "Unable to retrieve your location.",
          });
        }
      );
    } else {
      notification.error({
        message: "Unsupported Feature",
        description: "Geolocation is not supported by this browser.",
      });
    }
  };

  const handleFindGhostsClick = async () => {
    if (!locationShared) {
      notification.warning({
        message: "Location Required",
        description: "You must share your location before searching for ghosts. Click 'Share Location' first.",
      });
      return;
    }
  
    try {
      // Reset session before starting a new ghost search
      await fetch(`${API_URL}/reset-session`, {
        method: "POST",
        credentials: "include",
      });
  
      navigate("/loading-screen");
    } catch (error) {
      console.error("Error resetting session:", error);
      notification.error({
        message: "Session Reset Failed",
        description: "There was a problem preparing your ghost search. Please try again.",
      });
    }
  };

  const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 720);
  
    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 720);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);
  
    return isMobile;

  
  };

  const isMobile = useIsMobile();

    const dropdownMenu = (
      <Menu>
        <Menu.Item key="1" icon={<HomeOutlined />} onClick={() => navigate("/home")}>Home</Menu.Item>
        <Menu.Item key="2" icon={<HistoryOutlined />} onClick={() => navigate("/chat-history")}>Chat History</Menu.Item>
        <Menu.Item key="3" icon={<EnvironmentOutlined />} onClick={() => navigate("/ghosts-in-area-chat")}>Ghosts in Your Area</Menu.Item>
      </Menu>
    );

  return (
    <div className={styles.homepage}>
      <Layout className={styles.layout}>
        <Header className={styles.header}>
          <div className={styles.logo}>
            <img src="/pics/ghostlogo.png" alt="Ghost Logo" className={styles.logoImage} />
            <span className={styles.logoText}>Phantom Link</span>
          </div>
          {isMobile ? (
            <Dropdown overlay={dropdownMenu} trigger={['click']}>
              <Button className={styles.dropdownTrigger}>
                ☰ Menu
              </Button>
            </Dropdown>
          ) : (
            <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["1"]} className={styles.menu}>
              <Menu.Item key="1" icon={<HomeOutlined />} onClick={() => navigate("/home")}>Home</Menu.Item>
              <Menu.Item key="2" icon={<HistoryOutlined />} onClick={() => navigate("/chat-history")}>Chat History</Menu.Item>
              <Menu.Item key="3" icon={<EnvironmentOutlined />} onClick={() => navigate("/ghosts-in-area-chat")}>Ghosts in Your Area</Menu.Item>
            </Menu>
          )}
          <div className={styles.authButtonWrapper}>
            {loggedIn ? (
              <Button type="primary" icon={<LogoutOutlined />} onClick={handleLogout} className={styles.logoutButton}>
                Hello, {username} (Logout)
              </Button>
            ) : (
              <Button type="default" icon={<LoginOutlined />} onClick={() => navigate("/login")} className={styles.loginButton}>
                Login
              </Button>
            )}
          </div>

        </Header>

        <Content className={styles.content}>
          <Space direction="vertical" size="large" align="center">
            <Title level={1} className={styles.titleText}>Explore the Spirits Around You</Title>
            <Paragraph className={styles.bodyText}>
              Use Phantom Link to connect with the ghosts of historical figures near your location. Discover hidden stories from the past.
            </Paragraph>
            <Space direction="vertical" size="middle" style={{ width: "100%", maxWidth: 300 }}>
              <Button className={styles.findGhostsButton} size="large" icon={<SearchOutlined />} onClick={handleFindGhostsClick} disabled={!locationShared}>
                Search for Ghosts
              </Button>
              <Button className={styles.shareLocationButton} size="large" icon={<EnvironmentOutlined />} onClick={shareLocation}>
                Share Location
              </Button>
            </Space>
          </Space>

          <div className={styles.infoContainer}>
            <Paragraph className={styles.infoParagraph}>
            To unlock the full Phantom Link experience, please share your location and grant your browser permission to access it. Your location data will never be sold or shared with third parties. Instead, it will be used solely to uncover historical events, figures, and mysteries specific to your area, creating a truly immersive and personalized ghost-hunting adventure. By allowing location access, you’ll be able to interact with spectral echoes of the past and explore the hidden history that surrounds you.
            </Paragraph>
          </div>
        </Content>

        <Footer className={styles.footer}>Phantom Link 2025 Created by Jacob Tweeten</Footer>
      </Layout>
    </div>
  );
};

export default HomePage;
