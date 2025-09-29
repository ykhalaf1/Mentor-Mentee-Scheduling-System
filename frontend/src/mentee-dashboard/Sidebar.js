import React from "react";
import {
  FaBars,
  FaUser,
  FaHome,
  FaInfoCircle,
  FaCommentDots,
  FaSignOutAlt,
} from "react-icons/fa";
import "./Sidebar.css";

const navLinks = [
  { label: "Dashboard", icon: <FaHome />, key: "dashboard" },
  { label: "Profile", icon: <FaUser />, key: "profile" },
  { label: "Request a Mentor", icon: <FaCommentDots />, key: "request" },
  { label: "Feedback", icon: <FaCommentDots />, key: "feedback" },
  { label: "Information", icon: <FaInfoCircle />, key: "information" },
];

export default function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  activeKey,
  user,
  onLogout,
}) {
  return (
    <div className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo-section">
          <img src="/logo.png" alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">UMMAH PROFESSIONALS</span>
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          <FaBars />
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="sidebar-avatar-section">
            <img
              className="sidebar-avatar"
              src={
                user?.profilePic || "https://www.gravatar.com/avatar/?d=mp&f=y"
              }
              alt="avatar"
            />
            <div className="sidebar-user-name">
              {user?.firstName} {user?.lastName}
            </div>
            <div className="sidebar-user-role">Mentee</div>
          </div>
          <nav className="sidebar-nav">
            {navLinks.map((link) => (
              <div
                key={link.key}
                className={`sidebar-nav-link${activeKey === link.key ? " active" : ""}`}
                onClick={() => onNavigate(link.key)}
              >
                <span className="sidebar-nav-icon">{link.icon}</span>
                <span className="sidebar-nav-label">{link.label}</span>
              </div>
            ))}
          </nav>
          <button className="sidebar-logout-btn" onClick={onLogout}>
            <FaSignOutAlt style={{ marginRight: 12 }} /> Logout
          </button>
        </>
      )}
    </div>
  );
}
