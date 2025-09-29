const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv").config();
const path = require("path");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const crypto = require("crypto");
const admin = require("firebase-admin");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const cors = require("cors");
const { google } = require("googleapis");

// node-fetch v3 ESM import shim for CommonJS
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());

const randomFileName = () => {
  return crypto.randomBytes(16).toString("hex");
};

const mentorBucketName = process.env.MENTOR_AWS_BUCKET_NAME;
const mentorRegion = process.env.MENTOR_AWS_BUCKET_REGION;
const mentorAccessKeyId = process.env.MENTOR_AWS_ACCESS_KEY;
const mentorSecretAccessKey = process.env.MENTOR_AWS_SECRET_ACCESS_KEY;

const s3Mentor = new S3Client({
  credentials: {
    accessKeyId: mentorAccessKeyId,
    secretAccessKey: mentorSecretAccessKey,
  },
  region: mentorRegion,
});

// Removed SendGrid; email handled via EmailJS on the frontend

// AWS S3 setup for resume uploads
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const bucketName = process.env.AWS_BUCKET_NAME;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Initialize Firebase Admin SDK
const serviceAccount = require("./ummahprof-55270-firebase-adminsdk-fbsvc-472c1e3eca.json");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

console.log("Service account loaded:", !!serviceAccount);

upload.single("resume");

app.use(express.json());

// Handle resume upload for Mentor
app.post("/api/applications", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded",
    });
  }

  // Handle resume upload to S3
  let resumeUrl = "";
  if (req.file) {
    const ext = path.extname(req.file.originalname);
    const key = `resumes/${crypto.randomUUID()}${ext}`;
    await s3Mentor.send(
      new PutObjectCommand({
        Bucket: mentorBucketName,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      })
    );
    resumeUrl = `https://${mentorBucketName}.s3Mentor.${process.env.MENTOR_AWS_BUCKET_REGION}.amazonaws.com/${key}`;
  }

  // Send the URL back to frontend
  res.send({ resumeUrl });
});

// Google OAuth Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI ||
    "http://localhost:3001/auth/google/callback"
);

// Store OAuth tokens in mentee collection
async function storeOAuthToken(userId, tokens) {
  await db
    .collection("mentees")
    .doc(userId)
    .set(
      {
        googleOAuth: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date,
          updatedAt: new Date(),
        },
      },
      { merge: true }
    ); // merge: true creates the document if it doesn't exist
}

async function getOAuthToken(userId) {
  // userId can be either email (for OAuth check) or Firebase UID (for existing users)
  let userDoc = await db.collection("mentees").doc(userId).get();

  // If not found and it looks like an email, try searching by email
  if (!userDoc.exists && userId.includes("@")) {
    const emailQuery = await db
      .collection("mentees")
      .where("email", "==", userId)
      .get();
    if (!emailQuery.empty) {
      userDoc = emailQuery.docs[0];
    }
  }

  if (!userDoc.exists) {
    throw new Error("No user found");
  }
  const userData = userDoc.data();
  if (!userData.googleOAuth) {
    throw new Error("No OAuth token found for user");
  }
  return userData.googleOAuth;
}

async function refreshOAuthToken(userId, refreshToken) {
  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });
    const { credentials } = await oauth2Client.refreshAccessToken();
    await storeOAuthToken(userId, credentials);
    return credentials;
  } catch (error) {
    console.error("Error refreshing OAuth token:", error);
    throw error;
  }
}

// OAuth endpoints
app.get("/auth/google", (req, res) => {
  const userId = req.query.userId;
  const userEmail = req.query.userEmail;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: JSON.stringify({ userId, userEmail }), // Pass both userId and userEmail in state
  });

  res.json({ authUrl });
});

app.get("/auth/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res
        .status(400)
        .json({ error: "Authorization code and state are required" });
    }

    // Parse state to get userId and userEmail
    const { userId, userEmail } = JSON.parse(state);

    const { tokens } = await oauth2Client.getToken(code);

    // Get user info to verify email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Check if email matches
    if (userInfo.data.email !== userEmail) {
      // Email mismatch - send error message to popup
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Email Mismatch</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #dc3545;">❌ Email Mismatch</h2>
          <p>You signed in with a different email address.</p>
          <p>Please use: <strong>${userEmail}</strong></p>
          <p>This window will close automatically...</p>
          <script>
            try {
              window.opener.postMessage({
                type: 'EMAIL_MISMATCH',
                error: 'Email mismatch'
              }, '${process.env.FRONTEND_URL || "http://localhost:3000"}');
            } catch (e) {
              console.log('PostMessage failed:', e);
            }
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
        </html>
      `;
      return res.send(errorHtml);
    }

    // Email matches - store token and send success message
    await storeOAuthToken(userId, tokens);

    const successHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Success</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #28a745;">✅ Success!</h2>
        <p>Google Calendar access has been granted.</p>
        <p>This window will close automatically...</p>
        <script>
          try {
            // Try multiple origins for better compatibility
            const origins = [
              '${process.env.FRONTEND_URL || "http://localhost:3000"}',
              'http://localhost:3000',
              'http://localhost:3001',
              '*'
            ];
            
            origins.forEach(origin => {
              try {
                window.opener.postMessage({
                  type: 'OAUTH_SUCCESS',
                  userId: '${userId}'
                }, origin);
              } catch (e) {
                console.log('PostMessage failed for origin:', origin, e);
              }
            });
          } catch (e) {
            console.log('PostMessage failed:', e);
          }
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `;
    res.send(successHtml);
  } catch (error) {
    console.error("OAuth callback error:", error);

    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Error</title></head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #dc3545;">❌ Error</h2>
        <p>Something went wrong with the authentication.</p>
        <p>Please try again.</p>
        <p>This window will close automatically...</p>
        <script>
          try {
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              error: '${error.message}'
            }, '${process.env.FRONTEND_URL || "http://localhost:3000"}');
          } catch (e) {
            console.log('PostMessage failed:', e);
          }
          setTimeout(() => {
            window.close();
          }, 3000);
        </script>
      </body>
      </html>
    `;
    res.send(errorHtml);
  }
});

// Check if user has OAuth token
app.get("/auth/google/status/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // userId can be either email (for OAuth check) or Firebase UID (for existing users)
    let userDoc = await db.collection("mentees").doc(userId).get();

    // If not found and it looks like an email, try searching by email
    if (!userDoc.exists && userId.includes("@")) {
      const emailQuery = await db
        .collection("mentees")
        .where("email", "==", userId)
        .get();
      if (!emailQuery.empty) {
        userDoc = emailQuery.docs[0];
      }
    }

    if (!userDoc.exists) {
      return res.json({ hasToken: false });
    }

    const userData = userDoc.data();
    if (!userData.googleOAuth) {
      return res.json({ hasToken: false });
    }

    const tokenData = userData.googleOAuth;
    const now = Date.now();

    // Check if token is expired
    if (tokenData.expiry_date && now > tokenData.expiry_date) {
      // Try to refresh the token
      try {
        await refreshOAuthToken(userId, tokenData.refresh_token);
        return res.json({ hasToken: true, valid: true });
      } catch (refreshError) {
        // Token refresh failed, user needs to re-authenticate
        await db.collection("mentees").doc(userId).update({
          googleOAuth: admin.firestore.FieldValue.delete(),
        });
        return res.json({ hasToken: false, needsReauth: true });
      }
    }

    res.json({ hasToken: true, valid: true });
  } catch (error) {
    console.error("OAuth status check error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/mentee", upload.single("resume"), async (req, res) => {
  try {
    let form = req.body;
    // Parse JSON strings back to objects
    if (typeof form.industry === "string") {
      try {
        form.industry = JSON.parse(form.industry);
      } catch {}
    }
    if (typeof form.generalAvailability === "string") {
      try {
        form.generalAvailability = JSON.parse(form.generalAvailability);
      } catch {}
    }
    if (typeof form.skillsToLearn === "string") {
      try {
        form.skillsToLearn = JSON.parse(form.skillsToLearn);
      } catch {}
    }
    if (typeof form.companySizePreference === "string") {
      try {
        form.companySizePreference = JSON.parse(form.companySizePreference);
      } catch {}
    }

    // Check if user with this email already exists
    try {
      const existingUser = await admin.auth().getUserByEmail(form.email);
      if (existingUser) {
        return res.json({
          success: false,
          error:
            "An account with this email already exists. Please login to the user portal instead.",
        });
      }
    } catch (e) {
      // If error is not user-not-found, rethrow
      if (e.code !== "auth/user-not-found") {
        throw e;
      }
      // else, continue to create user
    }

    // Handle resume upload to S3
    let resumeUrl = "";
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const key = `resumes/${crypto.randomUUID()}${ext}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );
      resumeUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: form.email,
      password: form.password,
      displayName: form.name,
    });

    // Save mentee data to Firestore (excluding password)
    const menteeData = { ...form };
    delete menteeData.password;
    delete menteeData.confirmPassword;
    menteeData.resumeUrl = resumeUrl;
    menteeData.uid = userRecord.uid;
    menteeData.createdAt = new Date();

    // Check if there are existing OAuth tokens for this user (using email as key)
    try {
      const existingOAuthDoc = await db
        .collection("mentees")
        .doc(form.email)
        .get();
      if (existingOAuthDoc.exists) {
        const existingData = existingOAuthDoc.data();
        if (existingData.googleOAuth) {
          // Merge OAuth tokens with mentee data
          menteeData.googleOAuth = existingData.googleOAuth;
          // Delete the temporary document
          await db.collection("mentees").doc(form.email).delete();
        }
      }
    } catch (error) {
      console.log(
        "No existing OAuth tokens found or error checking:",
        error.message
      );
    }

    await db.collection("mentees").doc(userRecord.uid).set(menteeData);

    res.json({
      success: true,
      uid: userRecord.uid,
      resumeUrl: resumeUrl,
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all approved mentors
app.get("/api/mentors", async (req, res) => {
  try {
    const mentorsSnapshot = await db
      .collection("mentors")
      .where("status", "==", "approved")
      .get();

    const mentors = [];
    mentorsSnapshot.forEach((doc) => {
      const mentorData = { id: doc.id, ...doc.data() };

      // Convert old availability format to new grouped format if needed
      if (mentorData.availability && Array.isArray(mentorData.availability)) {
        // Convert from ["Monday-11:00 AM", "Monday-1:00 PM"] to {Monday: ["11:00 AM", "1:00 PM"]}
        const newAvailability = {};
        mentorData.availability.forEach((slot) => {
          const [day, time] = slot.split("-");
          if (!newAvailability[day]) {
            newAvailability[day] = [];
          }
          newAvailability[day].push(time);
        });
        mentorData.availability = newAvailability;
        console.log(
          `Converted array format to grouped format for mentor ${mentorData.name || mentorData.id}`
        );
      } else if (
        mentorData.availability &&
        typeof mentorData.availability === "object" &&
        !Array.isArray(mentorData.availability)
      ) {
        // Already in new grouped format, ensure each day has an array of times
        Object.keys(mentorData.availability).forEach((day) => {
          if (!Array.isArray(mentorData.availability[day])) {
            mentorData.availability[day] = [mentorData.availability[day]];
          }
        });
        console.log(
          `Ensured grouped format has arrays for mentor ${mentorData.name || mentorData.id}`
        );
      } else if (!mentorData.availability) {
        // Add mock availability data for testing if none exists
        mentorData.availability = {
          Monday: ["11am-12pm", "2pm-3pm"],
          Tuesday: ["10am-11am", "3pm-4pm"],
          Wednesday: ["1pm-2pm", "4pm-5pm"],
          Thursday: ["9am-10am", "2pm-3pm"],
          Friday: ["11am-12pm", "3pm-4pm"],
          Saturday: ["10am-11am", "1pm-2pm"],
          Sunday: ["2pm-3pm", "4pm-5pm"],
        };
        console.log(
          `Added mock availability for mentor ${mentorData.name || mentorData.id}`
        );
      }

      // Normalize day names to ensure consistency (capitalize first letter)
      if (mentorData.availability) {
        const normalizedAvailability = {};
        Object.keys(mentorData.availability).forEach((day) => {
          const normalizedDay =
            day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
          normalizedAvailability[normalizedDay] = mentorData.availability[day];
        });
        mentorData.availability = normalizedAvailability;
      }

      // Debug logging to see what availability looks like
      console.log(
        `Mentor ${mentorData.name || mentorData.id} final availability:`,
        JSON.stringify(mentorData.availability, null, 2)
      );

      mentors.push(mentorData);
    });

    res.json({ success: true, mentors });
  } catch (err) {
    console.error("Mentors API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get individual mentor by ID
app.get("/api/mentors/:mentorId", async (req, res) => {
  try {
    const { mentorId } = req.params;
    const mentorDoc = await db.collection("mentors").doc(mentorId).get();

    if (!mentorDoc.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Mentor not found" });
    }

    const mentorData = { id: mentorDoc.id, ...mentorDoc.data() };

    // Convert old availability format to new grouped format if needed
    if (mentorData.availability && Array.isArray(mentorData.availability)) {
      const newAvailability = {};
      mentorData.availability.forEach((slot) => {
        const [day, time] = slot.split("-");
        if (!newAvailability[day]) {
          newAvailability[day] = [];
        }
        newAvailability[day].push(time);
      });
      mentorData.availability = newAvailability;
    }

    res.json({ success: true, mentor: mentorData });
  } catch (err) {
    console.error("Get mentor API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new meeting
app.post("/api/meetings", async (req, res) => {
  try {
    const meetingData = req.body;

    // Ensure mentorId is included for OAuth token lookup
    if (!meetingData.mentorId) {
      return res
        .status(400)
        .json({ error: "mentorId is required for meeting creation" });
    }

    // Add meeting to Firestore
    const meetingRef = await db.collection("pendingMeetings").add({
      ...meetingData,
      createdAt: new Date(),
    });

    // Note: Email sending is handled by the frontend using EmailJS
    console.log("Meeting saved to database:", meetingRef.id);

    res.json({
      success: true,
      meetingId: meetingRef.id,
    });
  } catch (err) {
    console.error("Meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all meetings (pending and confirmed) for a mentee
app.get("/api/meetings/mentee/:menteeId", async (req, res) => {
  try {
    const { menteeId } = req.params;

    const meetings = [];

    // Fetch pending meetings
    const pendingSnapshot = await db
      .collection("pendingMeetings")
      .where("menteeId", "==", menteeId)
      .orderBy("createdAt", "desc")
      .get();

    pendingSnapshot.forEach((doc) => {
      meetings.push({
        id: doc.id,
        ...doc.data(),
        status: "pending",
        collection: "pendingMeetings",
      });
    });

    // Fetch confirmed meetings
    const confirmedSnapshot = await db
      .collection("confirmedMeeting")
      .where("menteeId", "==", menteeId)
      .orderBy("confirmedAt", "desc")
      .get();

    confirmedSnapshot.forEach((doc) => {
      meetings.push({
        id: doc.id,
        ...doc.data(),
        status: "confirmed",
        collection: "confirmedMeeting",
      });
    });

    // Sort all meetings by date (newest first)
    meetings.sort((a, b) => {
      const dateA = a.confirmedAt || a.createdAt;
      const dateB = b.confirmedAt || b.createdAt;
      return new Date(dateB) - new Date(dateA);
    });

    res.json({ success: true, meetings });
  } catch (err) {
    console.error("Get meetings API Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Mentee accepts a mentor-proposed time (forms backend mirror)
app.post("/api/meetings/:id/accept", async (req, res) => {
  try {
    const { id } = req.params;
    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ menteeApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, menteeApproved: true };
    if (updatedMeeting.mentorApproved) {
      // Generate Google Meet link
      const meetLink = await generateGoogleMeetLink(updatedMeeting);

      // Move to confirmedMeeting with meet link
      await db.collection("confirmedMeeting").add({
        ...updatedMeeting,
        status: "confirmed",
        confirmedAt: new Date(),
        meetLink: meetLink,
      });

      // Send confirmation emails with meet link
      try {
        console.log("Attempting to send confirmation emails...");
        console.log("Meeting data:", updatedMeeting);
        console.log("Meet link:", meetLink);
        await sendConfirmedMeetingEmails(updatedMeeting, meetLink);
        console.log("Confirmation emails sent with meet link for meeting:", id);
      } catch (e) {
        console.error("Failed to send confirmation emails:", e.message);
        console.error("Full error:", e);
      }

      await meetingRef.delete();
      return res.json({
        success: true,
        movedToConfirmed: true,
        meetLink: meetLink,
      });
    }

    return res.json({ success: true, movedToConfirmed: false });
  } catch (err) {
    console.error("Accept meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mentee proposes a new time (forms backend mirror)
app.post("/api/meetings/:id/propose", async (req, res) => {
  try {
    const { id } = req.params;
    const { meetingDate, meetingTime } = req.body || {};
    if (!meetingDate || !meetingTime) {
      return res.status(400).json({
        success: false,
        error: "meetingDate and meetingTime are required",
      });
    }

    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    await meetingRef.update({
      meetingDate,
      meetingTime,
      menteeApproved: true,
      mentorApproved: false,
      status: "pending",
      updatedAt: new Date(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Propose meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mentor approves a mentee-proposed time
app.post("/api/meetings/:id/mentor-approve", async (req, res) => {
  try {
    const { id } = req.params;
    const meetingRef = db.collection("pendingMeetings").doc(id);
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Meeting not found" });
    }

    const meeting = meetingSnap.data();
    await meetingRef.update({ mentorApproved: true, updatedAt: new Date() });

    const updatedMeeting = { ...meeting, mentorApproved: true };
    if (updatedMeeting.menteeApproved) {
      // Generate Google Meet link
      const meetLink = await generateGoogleMeetLink(updatedMeeting);

      // Move to confirmedMeeting with meet link
      await db.collection("confirmedMeeting").add({
        ...updatedMeeting,
        status: "confirmed",
        confirmedAt: new Date(),
        meetLink: meetLink,
      });

      // Send confirmation emails with meet link
      try {
        console.log("Attempting to send confirmation emails...");
        console.log("Meeting data:", updatedMeeting);
        console.log("Meet link:", meetLink);
        await sendConfirmedMeetingEmails(updatedMeeting, meetLink);
        console.log("Confirmation emails sent with meet link for meeting:", id);
      } catch (e) {
        console.error("Failed to send confirmation emails:", e.message);
        console.error("Full error:", e);
      }

      await meetingRef.delete();
      return res.json({
        success: true,
        movedToConfirmed: true,
        meetLink: meetLink,
      });
    }

    return res.json({ success: true, movedToConfirmed: false });
  } catch (err) {
    console.error("Mentor approve meeting API Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3001, () => console.log("Server running on port 3001"));

// ---------------- EmailJS (server-side) -----------------
async function sendEmailJS(templateId, templateParams) {
  const payload = {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJS_PUBLIC_KEY, // public key
    accessToken: process.env.EMAILJS_PRIVATE_KEY, // private key
    template_params: templateParams,
  };

  if (
    !payload.service_id ||
    !payload.template_id ||
    !payload.user_id ||
    !payload.accessToken
  ) {
    throw new Error("Missing EmailJS env configuration");
  }

  const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`EmailJS request failed: ${resp.status} ${txt}`);
  }
}

// ---------------- EmailJS V2 (server-side) -----------------
async function sendEmailJSV2(templateId, templateParams) {
  console.log("sendEmailJSV2 called with:", { templateId, templateParams });

  const payload = {
    service_id: process.env.EMAILJSV2_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJSV2_PUBLIC_KEY, // public key
    accessToken: process.env.EMAILJSV2_PRIVATE_KEY, // private key
    template_params: templateParams,
  };

  console.log("EmailJS V2 payload:", payload);

  if (
    !payload.service_id ||
    !payload.template_id ||
    !payload.user_id ||
    !payload.accessToken
  ) {
    console.error("Missing EmailJS V2 env configuration:", {
      service_id: !!payload.service_id,
      template_id: !!payload.template_id,
      user_id: !!payload.user_id,
      accessToken: !!payload.accessToken,
    });
    throw new Error("Missing EmailJS V2 env configuration");
  }

  console.log("Making EmailJS V2 API request...");
  const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("EmailJS V2 response status:", resp.status);

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("EmailJS V2 error response:", txt);
    throw new Error(`EmailJS V2 request failed: ${resp.status} ${txt}`);
  }

  console.log("EmailJS V2 request successful");
}

// Generate a Google Meet link using Google Calendar API with OAuth
async function generateGoogleMeetLink(meetingData) {
  console.log("generateGoogleMeetLink called with:", meetingData);
  console.log("Meeting data keys:", Object.keys(meetingData));
  console.log("Mentor ID:", meetingData.mentorId);
  console.log("Mentor Email:", meetingData.mentorEmail);
  console.log("Mentee ID:", meetingData.menteeId);
  console.log("Mentee Email:", meetingData.menteeEmail);
  console.log("Meeting Date:", meetingData.meetingDate);
  console.log("Meeting Time:", meetingData.meetingTime);

  try {
    let meetLink = null;
    let eventId = null;

    // First try to create event in mentor's calendar with Meet link (mentor as host)
    try {
      const mentorToken = await getOAuthToken(meetingData.mentorId);

      // Check if token is expired and refresh if needed
      const now = Date.now();
      if (mentorToken.expiry_date && now > mentorToken.expiry_date) {
        await refreshOAuthToken(
          meetingData.mentorId,
          mentorToken.refresh_token
        );
      }

      // Set OAuth credentials for mentor
      oauth2Client.setCredentials({
        access_token: mentorToken.access_token,
        refresh_token: mentorToken.refresh_token,
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });

      // Create event in mentor's calendar with Meet link
      const event = await createCalendarEvent(calendar, meetingData, true);
      meetLink = event.hangoutLink;
      eventId = event.id;

      console.log("Event created in mentor calendar with Meet link:", eventId);
    } catch (mentorError) {
      console.error("Failed to create event in mentor calendar:", mentorError);

      // Try by email if ID failed
      try {
        const mentorToken = await getOAuthToken(meetingData.mentorEmail);

        // Check if token is expired and refresh if needed
        const now = Date.now();
        if (mentorToken.expiry_date && now > mentorToken.expiry_date) {
          await refreshOAuthToken(
            meetingData.mentorEmail,
            mentorToken.refresh_token
          );
        }

        // Set OAuth credentials for mentor
        oauth2Client.setCredentials({
          access_token: mentorToken.access_token,
          refresh_token: mentorToken.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Create event in mentor's calendar with Meet link
        const event = await createCalendarEvent(calendar, meetingData, true);
        meetLink = event.hangoutLink;
        eventId = event.id;

        console.log(
          "Event created in mentor calendar with Meet link (by email):",
          eventId
        );
      } catch (emailError) {
        console.error(
          "Failed to create event in mentor calendar by email:",
          emailError
        );
      }
    }

    // If mentor OAuth failed, try mentee's OAuth as fallback
    if (!meetLink) {
      try {
        const menteeToken = await getOAuthToken(meetingData.menteeId);

        // Check if token is expired and refresh if needed
        const now = Date.now();
        if (menteeToken.expiry_date && now > menteeToken.expiry_date) {
          await refreshOAuthToken(
            meetingData.menteeId,
            menteeToken.refresh_token
          );
        }

        // Set OAuth credentials for mentee
        oauth2Client.setCredentials({
          access_token: menteeToken.access_token,
          refresh_token: menteeToken.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Create event in mentee's calendar with Meet link (fallback)
        const menteeEvent = await createCalendarEvent(
          calendar,
          meetingData,
          true
        );
        meetLink = menteeEvent.hangoutLink;

        console.log(
          "Event created in mentee calendar with Meet link (fallback):",
          menteeEvent.id
        );
      } catch (menteeError) {
        console.error(
          "Failed to create event in mentee calendar:",
          menteeError
        );

        // Try by email if ID failed
        try {
          const menteeToken = await getOAuthToken(meetingData.menteeEmail);

          // Check if token is expired and refresh if needed
          const now = Date.now();
          if (menteeToken.expiry_date && now > menteeToken.expiry_date) {
            await refreshOAuthToken(
              meetingData.menteeEmail,
              menteeToken.refresh_token
            );
          }

          // Set OAuth credentials for mentee
          oauth2Client.setCredentials({
            access_token: menteeToken.access_token,
            refresh_token: menteeToken.refresh_token,
          });

          const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client,
          });

          // Create event in mentee's calendar with Meet link (fallback)
          const menteeEvent = await createCalendarEvent(
            calendar,
            meetingData,
            true
          );
          meetLink = menteeEvent.hangoutLink;

          console.log(
            "Event created in mentee calendar with Meet link (fallback by email):",
            menteeEvent.id
          );
        } catch (emailError) {
          console.error(
            "Failed to create event in mentee calendar by email:",
            emailError
          );
        }
      }
    }

    // If we got a meet link, also try to create calendar events for both parties
    if (meetLink) {
      // Try to create calendar event for mentee (without Meet link to avoid conflicts)
      try {
        const menteeToken = await getOAuthToken(meetingData.menteeId);

        // Check if token is expired and refresh if needed
        const now = Date.now();
        if (menteeToken.expiry_date && now > menteeToken.expiry_date) {
          await refreshOAuthToken(
            meetingData.menteeId,
            menteeToken.refresh_token
          );
        }

        // Set OAuth credentials for mentee
        oauth2Client.setCredentials({
          access_token: menteeToken.access_token,
          refresh_token: menteeToken.refresh_token,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Create event in mentee's calendar (without Meet link to avoid conflicts)
        const menteeEvent = await createCalendarEvent(
          calendar,
          meetingData,
          false
        );

        console.log("Calendar event created for mentee:", menteeEvent.id);
      } catch (menteeError) {
        console.error(
          "Failed to create calendar event for mentee:",
          menteeError
        );

        // Try by email
        try {
          const menteeToken = await getOAuthToken(meetingData.menteeEmail);

          // Check if token is expired and refresh if needed
          const now = Date.now();
          if (menteeToken.expiry_date && now > menteeToken.expiry_date) {
            await refreshOAuthToken(
              meetingData.menteeEmail,
              menteeToken.refresh_token
            );
          }

          // Set OAuth credentials for mentee
          oauth2Client.setCredentials({
            access_token: menteeToken.access_token,
            refresh_token: menteeToken.refresh_token,
          });

          const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client,
          });

          // Create event in mentee's calendar (without Meet link to avoid conflicts)
          const menteeEvent = await createCalendarEvent(
            calendar,
            meetingData,
            false
          );

          console.log(
            "Calendar event created for mentee (by email):",
            menteeEvent.id
          );
        } catch (emailError) {
          console.error(
            "Failed to create calendar event for mentee by email:",
            emailError
          );
        }
      }
    }

    // Return Meet link from mentor's calendar, or fallback
    if (meetLink) {
      return meetLink;
    } else {
      // Fallback to simple link generation if no OAuth tokens work
      const meetingId =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      return `https://meet.google.com/${meetingId}`;
    }
  } catch (error) {
    console.error("Error creating Google Calendar events:", error);
    // Fallback to simple link generation if API fails
    const meetingId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    return `https://meet.google.com/${meetingId}`;
  }
}

// Helper function to create calendar event
async function createCalendarEvent(
  calendar,
  meetingData,
  includeMeetLink = true
) {
  // Parse meeting date and time
  const meetingDate = new Date(meetingData.meetingDate);

  // Safety check for meeting time
  if (!meetingData.meetingTime) {
    throw new Error("Meeting time is missing from meeting data");
  }

  let startTime, endTime;

  // Check if it's a time range (contains dash) or single time
  if (meetingData.meetingTime.includes("-")) {
    // Time range format: "1:00 PM - 2:00 PM" or "3pm-4pm"
    [startTime, endTime] = meetingData.meetingTime
      .split("-")
      .map((t) => t.trim());

    // Handle "3pm-4pm" format by converting to "3:00 PM - 4:00 PM"
    if (!startTime.includes(":")) {
      // Format like "3pm" - convert to "3:00 PM"
      const startMatch = startTime.match(/(\d+)(am|pm)/i);
      const endMatch = endTime.match(/(\d+)(am|pm)/i);

      if (startMatch && endMatch) {
        startTime = `${startMatch[1]}:00 ${startMatch[2].toUpperCase()}`;
        endTime = `${endMatch[1]}:00 ${endMatch[2].toUpperCase()}`;
      }
    }
  } else {
    // Single time format: "1:00 PM" or "3pm" - create 1 hour duration
    startTime = meetingData.meetingTime.trim();

    // Handle "3pm" format
    if (!startTime.includes(":")) {
      const timeMatch = startTime.match(/(\d+)(am|pm)/i);
      if (timeMatch) {
        startTime = `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}`;
      }
    }

    // Calculate end time (1 hour later)
    const timeMatch = startTime.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toLowerCase();

      // Add 1 hour
      hour += 1;
      if (hour > 12) {
        hour = 1;
        // Keep same period for now (simplified)
      }

      endTime = `${hour}:${minute.toString().padStart(2, "0")} ${period}`;
    } else {
      throw new Error(
        'Invalid time format. Expected format: "1:00 PM", "3pm", "1:00 PM - 2:00 PM", or "3pm-4pm"'
      );
    }
  }

  console.log("Parsed times:", { startTime, endTime });

  // Helper function to parse time to 24-hour format
  function parseTimeTo24Hour(timeStr) {
    console.log("Parsing time to 24-hour format:", timeStr);

    // Handle "3pm" format (no minutes)
    let timeMatch = timeStr.match(/(\d+)(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const period = timeMatch[2].toLowerCase();

      // Convert to 24-hour format
      if (period === "pm" && hour !== 12) {
        hour += 12;
      } else if (period === "am" && hour === 12) {
        hour = 0;
      }

      console.log(`Converted ${timeStr} to ${hour}:00`);
      return { hour, minute: 0 };
    }

    // Handle "3:00 PM" format (with minutes)
    timeMatch = timeStr.match(/(\d+):(\d+)\s*(am|pm)/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2]);
      const period = timeMatch[3].toLowerCase();

      // Convert to 24-hour format
      if (period === "pm" && hour !== 12) {
        hour += 12;
      } else if (period === "am" && hour === 12) {
        hour = 0;
      }

      console.log(`Converted ${timeStr} to ${hour}:${minute}`);
      return { hour, minute };
    }

    throw new Error(`Invalid time format: ${timeStr}`);
  }

  // Create start and end times
  const startDateTime = new Date(meetingDate);
  const startTime24 = parseTimeTo24Hour(startTime);
  startDateTime.setHours(startTime24.hour, startTime24.minute, 0, 0);

  const endDateTime = new Date(meetingDate);
  const endTime24 = parseTimeTo24Hour(endTime);
  endDateTime.setHours(endTime24.hour, endTime24.minute, 0, 0);

  // If end time is before start time, it means the meeting goes into the next day
  if (endDateTime <= startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }

  // Create calendar event
  const event = {
    summary: `Mentoring Session: ${meetingData.menteeName} & ${meetingData.mentorName}`,
    description: `Mentoring session between ${meetingData.menteeName} and ${meetingData.mentorName}`,
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: "UTC",
    },
    attendees: [
      { email: meetingData.menteeEmail },
      { email: meetingData.mentorEmail },
    ],
  };

  // Only add Meet link to the primary event (mentor's calendar)
  if (includeMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: `meeting-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    };
  }

  const response = await calendar.events.insert({
    calendarId: "primary",
    resource: event,

    conferenceDataVersion: includeMeetLink ? 1 : 0,
  });

  return response.data;
}

// Send confirmation emails with Google Meet link
async function sendConfirmedMeetingEmails(meetingData, meetLink) {
  console.log("sendConfirmedMeetingEmails called with:", {
    meetingData,
    meetLink,
  });

  const common = {
    meeting_date: meetingData.meetingDate,
    meeting_time: meetingData.meetingTime,

    meet_link: meetLink,
    mentor_name: meetingData.mentorName,
    mentee_name: meetingData.menteeName,
  };

  console.log("Common template params:", common);
  console.log("Template ID:", process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED);

  // Send email to mentee

  console.log("Sending email to mentee:", meetingData.menteeEmail);
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED, {
    to_email: meetingData.menteeEmail,
    to_name: meetingData.menteeName,
    ...common,
  });

  // Send email to mentor

  console.log("Sending email to mentor:", meetingData.mentorEmail);
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_MEETING_CONFIRMED, {
    to_email: meetingData.mentorEmail,
    to_name: meetingData.mentorName,
    ...common,
  });
}

async function sendMeetingEmailsServer(meetingData) {
  const common = {
    meeting_date: meetingData.meetingDate,

    meeting_time: meetingData.meetingTime,
    mentor_name: meetingData.mentorName,
    mentee_name: meetingData.menteeName,

    accept_link: `${process.env.FRONTEND_URL}/meeting/${meetingData.id}/accept`,
    propose_link: `${process.env.FRONTEND_URL}/meeting/${meetingData.id}/propose`,
  };

  // Send email to mentee
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_NEW_TIME_PROPOSED, {
    to_email: meetingData.menteeEmail,
    to_name: meetingData.menteeName,
    ...common,
  });

  // Send email to mentor
  await sendEmailJSV2(process.env.EMAILJSV2_TEMPLATE_NEW_TIME_PROPOSED, {
    to_email: meetingData.mentorEmail,
    to_name: meetingData.mentorName,
    ...common,
  });
}

// Explicit endpoint to trigger emails from the client if needed
app.post("/api/notify/meeting", async (req, res) => {
  try {
    const meetingData = req.body;
    await sendMeetingEmailsServer(meetingData);
    res.json({ success: true });
  } catch (err) {
    console.error("Notify meeting email failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test endpoint to verify OAuth setup
app.get("/api/test/oauth", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const tokenDoc = await db.collection("oauthTokens").doc(userId).get();
    if (tokenDoc.exists) {
      const tokenData = tokenDoc.data();
      res.json({
        success: true,
        hasToken: true,
        tokenType: tokenData.token_type,
        scope: tokenData.scope,
        updatedAt: tokenData.updatedAt,
      });
    } else {
      res.json({ success: true, hasToken: false });
    }
  } catch (error) {
    console.error("OAuth test error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
