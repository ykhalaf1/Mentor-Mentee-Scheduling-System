import React, { useState, useEffect } from "react";
import "./GoogleOAuth.css";

const GoogleOAuth = ({ userId, userEmail, onAuthSuccess, onAuthError }) => {
  const [authStatus, setAuthStatus] = useState("checking"); // 'checking', 'authenticated', 'needs-auth', 'error'
  const [isLoading, setIsLoading] = useState(false);
  const [emailMismatch, setEmailMismatch] = useState(false);

  useEffect(() => {
    if (userId) {
      checkAuthStatus();
    }
  }, [userId]);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `http://localhost:3001/auth/google/status/${userId}`
      );
      const data = await response.json();

      if (data.hasToken && data.valid) {
        setAuthStatus("authenticated");
        if (onAuthSuccess) onAuthSuccess();
      } else if (data.needsReauth) {
        setAuthStatus("needs-auth");
      } else {
        setAuthStatus("needs-auth");
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setAuthStatus("error");
      if (onAuthError) onAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const initiateOAuth = async () => {
    try {
      setIsLoading(true);
      setEmailMismatch(false);

      const response = await fetch(
        `http://localhost:3001/auth/google?userId=${userId}&userEmail=${encodeURIComponent(userEmail)}`
      );
      const data = await response.json();

      if (data.authUrl) {
        // Open popup window for OAuth
        const popup = window.open(
          data.authUrl,
          "googleOAuth",
          "width=500,height=600,scrollbars=yes,resizable=yes"
        );

        // Listen for popup close or message
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Check if OAuth was successful after popup closes
            setTimeout(() => {
              checkAuthStatus();
            }, 1000);
          }
        }, 1000);

        // Listen for message from popup
        const handleMessage = (event) => {
          console.log(
            "Received message:",
            event.data,
            "from origin:",
            event.origin
          );

          // Allow messages from localhost origins for development
          const allowedOrigins = [
            window.location.origin,
            "http://localhost:3000",
            "http://localhost:3001",
          ];
          if (!allowedOrigins.includes(event.origin)) {
            console.log("Origin not allowed:", event.origin);
            return;
          }

          if (event.data.type === "OAUTH_SUCCESS") {
            console.log("OAuth success received!");
            clearInterval(checkClosed);
            if (popup && !popup.closed) {
              popup.close();
            }
            setAuthStatus("authenticated");
            if (onAuthSuccess) onAuthSuccess(userId);
          } else if (event.data.type === "OAUTH_ERROR") {
            clearInterval(checkClosed);
            if (popup && !popup.closed) {
              popup.close();
            }
            setAuthStatus("error");
            if (onAuthError)
              onAuthError(new Error(event.data.error || "OAuth failed"));
          } else if (event.data.type === "EMAIL_MISMATCH") {
            clearInterval(checkClosed);
            if (popup && !popup.closed) {
              popup.close();
            }
            setEmailMismatch(true);
            setAuthStatus("needs-auth");
          }
        };

        window.addEventListener("message", handleMessage);

        // Add debugging
        console.log("OAuth popup opened, listening for messages...");

        // Cleanup listener when component unmounts
        return () => {
          window.removeEventListener("message", handleMessage);
          clearInterval(checkClosed);
        };
      } else {
        throw new Error("No auth URL received");
      }
    } catch (error) {
      console.error("Error initiating OAuth:", error);
      setAuthStatus("error");
      if (onAuthError) onAuthError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSuccess = () => {
    setAuthStatus("authenticated");
    if (onAuthSuccess) onAuthSuccess();
  };

  const handleOAuthError = () => {
    setAuthStatus("error");
    if (onAuthError) onAuthError(new Error("OAuth authentication failed"));
  };

  // Check for OAuth callback parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthSuccess = urlParams.get("oauth-success");
    const oauthError = urlParams.get("oauth-error");

    if (oauthSuccess) {
      handleOAuthSuccess();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      handleOAuthError();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="oauth-container">
        <div className="oauth-loading">
          <p>Checking calendar permissions...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "authenticated") {
    return (
      <div className="oauth-container">
        <div className="oauth-success">
          <p style={{ fontSize: "16px", fontWeight: "bold" }}>
            ✅ Google Calendar Access Approved
          </p>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>
            Your calendar is now connected. You can proceed with your
            application.
          </p>
          <button
            disabled
            className="oauth-button"
            style={{
              backgroundColor: "#28a745",
              fontSize: "14px",
              padding: "8px 16px",
              fontWeight: "normal",
              cursor: "not-allowed",
              marginTop: "8px",
            }}
          >
            ✓ Calendar Connected
          </button>
        </div>
      </div>
    );
  }

  if (authStatus === "needs-auth") {
    return (
      <div className="oauth-container">
        <div className="oauth-prompt">
          {emailMismatch && (
            <div
              style={{
                color: "#dc3545",
                marginBottom: "12px",
                padding: "8px",
                backgroundColor: "#f8d7da",
                borderRadius: "4px",
              }}
            >
              <p style={{ margin: 0, fontSize: "14px" }}>
                <strong>Email Mismatch:</strong> Please sign in with the same
                email address you used in the form ({userEmail}).
              </p>
            </div>
          )}
          <p>
            <strong>Required:</strong> Please grant access to your Google
            Calendar to continue with your application.
          </p>
          <p
            style={{ fontSize: "0.9rem", color: "#666", marginBottom: "12px" }}
          >
            <strong>Important:</strong> You must sign in with the email:{" "}
            <strong>{userEmail}</strong>
          </p>
          <button
            onClick={initiateOAuth}
            disabled={isLoading}
            className="oauth-button"
            style={{
              backgroundColor: "#dc3545",
              fontSize: "16px",
              padding: "12px 24px",
              fontWeight: "bold",
            }}
          >
            {isLoading ? "Connecting..." : "Allow Google Calendar Access"}
          </button>
          <p style={{ fontSize: "0.9rem", color: "#666", marginTop: "8px" }}>
            This allows us to automatically add mentoring sessions to your
            calendar when meetings are confirmed.
          </p>
        </div>
      </div>
    );
  }

  if (authStatus === "error") {
    return (
      <div className="oauth-container">
        <div className="oauth-error">
          <p>❌ Failed to connect to Google Calendar</p>
          <button onClick={checkAuthStatus} className="oauth-retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleOAuth;
