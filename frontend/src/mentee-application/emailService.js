import emailjs from "@emailjs/browser";

// EmailJS Configuration - use env vars if available, fallback to provided values
const EMAILJS_CONFIG = {
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
  gmailServiceId: process.env.REACT_APP_EMAILJS_GMAIL_SERVICE_ID,
  outlookServiceId: process.env.REACT_APP_EMAILJS_OUTLOOK_SERVICE_ID,
  menteeTemplateId: process.env.REACT_APP_EMAILJS_MENTEE_TEMPLATE_ID,
  mentorTemplateId: process.env.REACT_APP_EMAILJS_MENTOR_TEMPLATE_ID,
};

// Debug: Log the configuration to see what's being loaded
console.log("MENTEE APPLICATION - EmailJS Config:", EMAILJS_CONFIG);
console.log("MENTEE APPLICATION - Environment variables:");
console.log("REACT_APP_EMAILJS_PUBLIC_KEY:", process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
console.log("REACT_APP_EMAILJS_GMAIL_SERVICE_ID:", process.env.REACT_APP_EMAILJS_GMAIL_SERVICE_ID);
console.log("REACT_APP_EMAILJS_OUTLOOK_SERVICE_ID:", process.env.REACT_APP_EMAILJS_OUTLOOK_SERVICE_ID);
console.log("REACT_APP_EMAILJS_MENTEE_TEMPLATE_ID:", process.env.REACT_APP_EMAILJS_MENTEE_TEMPLATE_ID);
console.log("REACT_APP_EMAILJS_MENTOR_TEMPLATE_ID:", process.env.REACT_APP_EMAILJS_MENTOR_TEMPLATE_ID);

// Note: EmailJS initialization removed to avoid conflicts with mentee dashboard
// The mentee dashboard EmailJS V2 will handle all email sending

// Helper: choose service by domain; default to gmail service id
const getEmailService = (emailAddress) => {
  const domain = emailAddress.toLowerCase();

  // Use Outlook service for Microsoft domains
  if (
    domain.includes("outlook.com") ||
    domain.includes("hotmail.com") ||
    domain.includes("live.com") ||
    domain.includes("msn.com")
  ) {
    return EMAILJS_CONFIG.outlookServiceId;
  }

  // Use Gmail service for Gmail and other domains
  return EMAILJS_CONFIG.gmailServiceId;
};

// Send meeting confirmation emails
export const sendMeetingEmails = async (meetingData, selectedDate) => {
  console.log("Starting email sending process...");
  console.log("Meeting data:", meetingData);
  console.log("Selected date:", selectedDate);
  
  // Verify configuration
  if (
    !EMAILJS_CONFIG.publicKey ||
    (!EMAILJS_CONFIG.gmailServiceId && !EMAILJS_CONFIG.outlookServiceId) ||
    !EMAILJS_CONFIG.menteeTemplateId ||
    !EMAILJS_CONFIG.mentorTemplateId
  ) {
    console.error("Missing EmailJS configuration:", EMAILJS_CONFIG);
    return {
      success: false,
      error:
        "Missing EmailJS configuration. Ensure REACT_APP_EMAILJS_* env vars are set.",
    };
  }

  // Validate inputs
  if (!meetingData.menteeEmail || !meetingData.mentorEmail) {
    return {
      success: false,
      error: "Missing email addresses for mentee or mentor",
    };
  }
  if (!selectedDate) {
    return { success: false, error: "No meeting date selected" };
  }

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const errors = [];
  let mentee = null;
  let mentor = null;
  
  console.log("MENTEE APPLICATION - Sending email to mentee:", meetingData.menteeEmail);
  console.log("MENTEE APPLICATION - Using service:", getEmailService(meetingData.menteeEmail));
  console.log("MENTEE APPLICATION - Using template:", EMAILJS_CONFIG.menteeTemplateId);
  console.log("MENTEE APPLICATION - Gmail service ID:", EMAILJS_CONFIG.gmailServiceId);
  console.log("MENTEE APPLICATION - Outlook service ID:", EMAILJS_CONFIG.outlookServiceId);
  
  try {
    mentee = await emailjs.send(
      getEmailService(meetingData.menteeEmail),
      EMAILJS_CONFIG.menteeTemplateId,
      {
        mentee_name: meetingData.menteeName,
        mentor_name: meetingData.mentorName,
        meeting_date: formattedDate,
        meeting_time: meetingData.meetingTime,
        mentee_email: meetingData.menteeEmail,
      }
    );
    console.log("Mentee email sent successfully:", mentee);
  } catch (e) {
    console.error("Mentee email error:", e);
    errors.push(`mentee: ${e?.text || e?.message || "unknown error"}`);
  }
  console.log("MENTEE APPLICATION - Sending email to mentor:", meetingData.mentorEmail);
  console.log("MENTEE APPLICATION - Using service:", getEmailService(meetingData.mentorEmail));
  console.log("MENTEE APPLICATION - Using template:", EMAILJS_CONFIG.mentorTemplateId);
  
  try {
    mentor = await emailjs.send(
      getEmailService(meetingData.mentorEmail),
      EMAILJS_CONFIG.mentorTemplateId,
      {
        mentor_name: meetingData.mentorName,
        mentee_name: meetingData.menteeName,
        meeting_date: formattedDate,
        meeting_time: meetingData.meetingTime,
        mentor_email: meetingData.mentorEmail,
      }
    );
    console.log("Mentor email sent successfully:", mentor);
  } catch (e) {
    console.error("Mentor email error:", e);
    errors.push(`mentor: ${e?.text || e?.message || "unknown error"}`);
  }

  if (errors.length) {
    return { success: false, error: errors.join(" | "), mentee, mentor };
  }
  return { success: true, mentee, mentor };
};
