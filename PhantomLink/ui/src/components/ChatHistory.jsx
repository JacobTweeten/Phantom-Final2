import React, { useEffect, useState } from "react";
import { Layout, Menu, Button, Space, notification, Card, Typography, Dropdown } from "antd";
import { useNavigate } from "react-router-dom";
import { HomeOutlined, HistoryOutlined, EnvironmentOutlined, LogoutOutlined, LoginOutlined } from "@ant-design/icons";
import styles from "../css/ChatHistory.module.css";

const API_URL = process.env.REACT_APP_API_URL || "/api";

const { Header, Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

const ChatLog = ({ chatLog }) => (
  <div className={styles.chatLog}>
    <Paragraph>
      {chatLog.split("\n").map((line, index) => (
        <span key={index}>
          {line}
          <br />
        </span>
      ))}
    </Paragraph>
  </div>
);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 720);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

const ChatHistory = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [conversations, setConversations] = useState([]);
  const [expandedConversation, setExpandedConversation] = useState(null);

  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const res = await fetch(`${API_URL}/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.username) {
            setUsername(data.username);
            setLoggedIn(true);
            fetchConversations();
          } else {
            navigate("/login");
          }
        }
      } catch (err) {
        console.error("Failed to check user session:", err);
        navigate("/login");
      }
    };
    checkUserSession();
  }, [navigate]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_URL}/conversations`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      } else {
        notification.error({ message: "Error", description: "Failed to load conversations." });
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
      notification.error({ message: "Error", description: "An unexpected error occurred." });
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setLoggedIn(false);
        setUsername("");
        notification.success({ message: "Logged Out", description: "You have been logged out successfully." });
        navigate("/login");
      }
    } catch (err) {
      console.error("Logout error:", err);
      notification.error({ message: "Logout Failed", description: "There was an error logging you out." });
    }
  };

  const toggleExpansion = (id) => {
    setExpandedConversation((prev) => (prev === id ? null : id));
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
          <Dropdown overlay={dropdownMenu} trigger={["click"]}>
            <Button className={styles.dropdownTrigger}>☰ Menu</Button>
          </Dropdown>
        ) : (
          <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["2"]} className={styles.menu}>
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
      <Title level={2} style={{ color: 'white' }}>Your Chat History</Title>
        <div className={styles.cardContainer}>
          {conversations.length === 0 ? (
            <p className={styles.noConvoText}>
              No conversations found. Start a chat with a ghost!
            </p>
          ) : (
            conversations.map((conversation) => (
              <Card
                key={conversation.id}
                hoverable
                className={styles.convoCard}
                title={
                  <span className={expandedConversation === conversation.id ? styles.cardTitleExpanded : styles.cardTitle}>
                    Conversation with: {conversation.ghost_name || "Unknown"} ({conversation.location || "Unknown Location"})
                  </span>
                }
                onClick={() => toggleExpansion(conversation.id)}
              >
                {expandedConversation === conversation.id ? (
                  <div className={styles.chatLogExpanded}>
                    <ChatLog chatLog={conversation.chat_log} />
                  </div>
                ) : (
                  <Paragraph ellipsis={{ rows: 3 }}>
                    {conversation.chat_log}
                  </Paragraph>
                )}
              </Card>
            ))
          )}
        </div>
      </Content>

      <Footer className={styles.footer}>
        Phantom-Link 2025 Created by Jacob Tweeten
      </Footer>
    </Layout>
  );
};

export default ChatHistory;
