import React, { useState, useEffect } from "react";
import { Layout, Typography, Button, Row, Col, Card, notification, Menu, Dropdown } from "antd";
import { EnvironmentOutlined, HomeOutlined, HistoryOutlined, LogoutOutlined, LoginOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import styles from "../css/GhostsInYourArea.module.css";

const API_URL = process.env.REACT_APP_API_URL || "/api";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

const GhostsInYourArea = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [userLocation, setUserLocation] = useState(null);
  const [ghosts, setGhosts] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    fetchUserLocation();
    checkLoginStatus();
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

  const fetchUserLocation = async () => {
    try {
      const response = await fetch(`${API_URL}/location`, {
        method: "GET",
        credentials: "include",
      });
      const data = await response.json();

      if (data.city && data.state) {
        setUserLocation(`${data.city}, ${data.state}`);
        fetchGhosts(data.city, data.state);
      } else {
        notification.warning({
          message: "Location Required",
          description: "Please share your location to see ghosts in your area.",
        });
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      notification.error({
        message: "Error",
        description: "There was an error fetching your location.",
      });
    }
  };

  const fetchGhosts = async (city, state) => {
    try {
      const response = await fetch(`${API_URL}/ghosts?city=${city}&state=${state}`);
      const data = await response.json();
      if (data.ghosts) {
        const shuffledGhosts = data.ghosts.sort(() => Math.random() - 0.5);
        setGhosts(shuffledGhosts.slice(0, 4));
      }
    } catch (error) {
      console.error("Error fetching ghosts:", error);
      notification.error({
        message: "Error",
        description: "There was an error fetching ghosts.",
      });
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
            body: JSON.stringify({ latitude, longitude, location_allowed: true }),
            credentials: "include",
          })
            .then((res) => res.json())
            .then((data) => {
              const match = data.message.match(/city=(.*?), state=(.*?)\b/);
              if (match) {
                const city = match[1];
                const state = match[2];
                setUserLocation(`${city}, ${state}`);
                fetchGhosts(city, state);
              }
              notification.success({
                message: "Location Shared",
                description: "Your location has been successfully shared!",
              });
              window.location.reload();
            })
            .catch((err) => {
              console.error("Error sharing location:", err);
              notification.error({
                message: "Error",
                description: "There was an error sharing your location.",
              });
            });
        },
        (err) => {
          console.error("Geolocation error:", err);
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

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setLoggedIn(false);
        setUsername("");
        navigate("/login");
        notification.success({
          message: "Logged Out",
          description: "You have been logged out successfully.",
        });
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const dropdownMenu = (
    <Menu>
      <Menu.Item key="1" icon={<HomeOutlined />} onClick={() => navigate("/home")}>Home</Menu.Item>
      <Menu.Item key="2" icon={<HistoryOutlined />} onClick={() => navigate("/chat-history")}>Chat History</Menu.Item>
      <Menu.Item key="3" icon={<EnvironmentOutlined />} onClick={() => navigate("/ghosts-in-area-chat")}>Ghosts in Your Area</Menu.Item>
    </Menu>
  );

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <img src="/pics/ghostlogo.png" alt="Ghost Logo" className={styles.logoImage} />
          <span className={styles.logoText}>Phantom Link</span>
        </div>

        {isMobile ? (
          <Dropdown overlay={dropdownMenu} trigger={['click']}>
            <Button className={styles.dropdownTrigger}>☰ Menu</Button>
          </Dropdown>
        ) : (
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["3"]} className={styles.menu}>
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
        {userLocation ? (
          <>
            <Title level={1} className={styles.ghostTitle}>Ghosts in {userLocation}</Title>
            <Row gutter={[16, 16]} justify="center" className={styles.row}>
              {ghosts.map((ghost) => (
                <Col xs={24} sm={12} md={8} lg={6} key={ghost.id}>
                  <Card
                    hoverable
                    className={styles.card}
                    cover={<div className={styles.ghostImage}><img alt={ghost.name} src={ghost.image_url} /></div>}
                  >
                    <Card.Meta title={ghost.name} description={`City: ${ghost.city}`} />
                    <Button
                      type="primary"
                      className={styles.button}
                      onClick={() => {
                        document.cookie = `selectedGhostId=${ghost.id}; path=/; max-age=3600`;
                        localStorage.setItem("selectedGhost", JSON.stringify(ghost));
                        navigate("/loading-screen");
                      }}
                    >
                      Chat
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          <div className={styles.locationRequired}>
            <Title level={2} style={{ color: "white", fontFamily: "'Lakki Reddy', cursive", textAlign: "center" }}>
              First, you must share your location
            </Title>
            <Paragraph style={{ color: "white", fontFamily: "Helvetica, Arial, sans-serif", textAlign: "center" }}>
              To explore ghosts in your area, please share your location.
            </Paragraph>
            <div className={styles.shareLocationWrapper}>
              <Button
                type="primary"
                icon={<EnvironmentOutlined />}
                onClick={shareLocation}
                className={styles.shareLocationButton}
              >
                Share Location
              </Button>
            </div>
          </div>
        )}
      </Content>

      <Footer className={styles.footer}>
        Phantom Link 2025 Created by Jacob Tweeten
      </Footer>
    </Layout>
  );
};

export default GhostsInYourArea;
