// App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import ChatPage from "./components/ChatPage";
import Login from "./components/accountPages/Login";
import RegisterPage from "./components/accountPages/RegisterPage";
import Verification from './components/accountPages/Verification';
import ForgotPassword from './components/accountPages/ForgotPassword';
import ResetPassword from './components/accountPages/ResetPassword';
import WelcomePage from './components/WelcomePage';
import ChatHistory from './components/ChatHistory';
import GhostsinYourArea from './components/GhostsInYourArea';
import LoadingScreen from './components/LoadingScreen';
import SpeakWithGhosts from './components/SpeakWithGhosts'


const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path = "/login" element={<Login />} />
      <Route path = "/register" element={<RegisterPage />} />
      <Route path = "/verify" element={<Verification />} />
      <Route path = "/forgot-password" element={<ForgotPassword />} />
      <Route path = "/reset-password" element={<ResetPassword />} />
      <Route path = "/chat-history" element={<ChatHistory />} />
      <Route path = "/ghosts-in-area-chat" element={<GhostsinYourArea />} />
      <Route path = "/loading-screen" element={<LoadingScreen />} />
      <Route path = "/speak-with-ghosts" element={<SpeakWithGhosts />} />
    </Routes>
  </Router>
);

export default App;
