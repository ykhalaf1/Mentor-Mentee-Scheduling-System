import emailjs from "@emailjs/browser";

// EmailJS Configuration - use env vars if available, fallback to provided values
const EMAILJS_CONFIG = {
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
  gmailServiceId: process.env.REACT_APP_EMAILJS_GMAIL_SERVICE_ID,
  outlookServiceId: process.env.REACT_APP_EMAILJS_OUTLOOK_SERVICE_ID,
  menteeTemplateId: process.env.REACT_APP_EMAILJS_MENTEE_TEMPLATE_ID,
  mentorTemplateId: process.env.REACT_APP_EMAILJS_MENTOR_TEMPLATE_ID,
};

// EmailJS V2 Configuration for dashboard emails
const EMAILJS_V2_CONFIG = {
  publicKey: process.env.REACT_APP_EMAILJSV2_PUBLIC_KEY,
  gmailServiceId: process.env.REACT_APP_EMAILJSV2_SERVICE_ID,
  outlookServiceId: process.env.REACT_APP_EMAILJSV2_SERVICE_ID, // Using same service for now
  meetingConfirmedTemplateId:
    process.env.REACT_APP_EMAILJSV2_TEMPLATE_MEETING_CONFIRMED,
  newTimeProposedTemplateId:
    process.env.REACT_APP_EMAILJSV2_TEMPLATE_NEW_TIME_PROPOSED,
};

// Initialize EmailJS V2 only for dashboard functionality
// Note: Regular EmailJS is initialized by the mentee application
if (EMAILJS_V2_CONFIG.publicKey) {
  console.log("MENTEE DASHBOARD - Initializing EmailJS V2 with key:", EMAILJS_V2_CONFIG.publicKey);
  emailjs.init(EMAILJS_V2_CONFIG.publicKey);
} else {
  console.error("MENTEE DASHBOARD - EmailJS V2 public key not found!");
}

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

// Helper: choose EmailJS V2 service by domain
const getEmailJSV2Service = (emailAddress) => {
  const domain = emailAddress.toLowerCase();

  // Use Outlook service for Microsoft domains
  if (
    domain.includes("outlook.com") ||
    domain.includes("hotmail.com") ||
    domain.includes("live.com") ||
    domain.includes("msn.com")
  ) {
    return EMAILJS_V2_CONFIG.outlookServiceId;
  }

  // Use Gmail service for Gmail and other domains
  return EMAILJS_V2_CONFIG.gmailServiceId;
};

// Send meeting confirmation emails (for RequestMentor functionality)
export const sendMeetingEmails = async (meetingData, selectedDate) => {
  // Verify configuration - use EmailJS V2 for dashboard functionality
  if (
    !EMAILJS_V2_CONFIG.publicKey ||
    (!EMAILJS_V2_CONFIG.gmailServiceId && !EMAILJS_V2_CONFIG.outlookServiceId) ||
    !EMAILJS_V2_CONFIG.meetingConfirmedTemplateId
  ) {
    return {
      success: false,
      error:
        "Missing EmailJS V2 configuration. Ensure REACT_APP_EMAILJSV2_* env vars are set.",
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
  
  console.log("MENTEE DASHBOARD - Sending meeting emails using EmailJS V2");
  
  try {
    mentee = await emailjs.send(
      getEmailJSV2Service(meetingData.menteeEmail),
      EMAILJS_V2_CONFIG.meetingConfirmedTemplateId,
      {
        email: meetingData.menteeEmail,
        to_name: meetingData.menteeName,
        mentee_name: meetingData.menteeName,
        mentor_name: meetingData.mentorName,
        meeting_date: formattedDate,
        meeting_time: meetingData.meetingTime,
        mentee_email: meetingData.menteeEmail,
        mentor_email: meetingData.mentorEmail,
      }
    );
    console.log("MENTEE DASHBOARD - Mentee email sent successfully");
  } catch (e) {
    console.error("MENTEE DASHBOARD - Mentee email error:", e);
    errors.push(`mentee: ${e?.text || e?.message || "unknown error"}`);
  }
  
  try {
    mentor = await emailjs.send(
      getEmailJSV2Service(meetingData.mentorEmail),
      EMAILJS_V2_CONFIG.meetingConfirmedTemplateId,
      {
        email: meetingData.mentorEmail,
        to_name: meetingData.mentorName,
        mentee_name: meetingData.menteeName,
        mentor_name: meetingData.mentorName,
        meeting_date: formattedDate,
        meeting_time: meetingData.meetingTime,
        mentee_email: meetingData.menteeEmail,
        mentor_email: meetingData.mentorEmail,
      }
    );
    console.log("MENTEE DASHBOARD - Mentor email sent successfully");
  } catch (e) {
    console.error("MENTEE DASHBOARD - Mentor email error:", e);
    errors.push(`mentor: ${e?.text || e?.message || "unknown error"}`);
  }

  if (errors.length) {
    return { success: false, error: errors.join(" | "), mentee, mentor };
  }
  return { success: true, mentee, mentor };
};

// Send meeting confirmation emails (for dashboard functionality)
export const sendMeetingConfirmationEmails = async (meetingData, meetLink) => {
  // Verify configuration
  if (
    !EMAILJS_V2_CONFIG.publicKey ||
    (!EMAILJS_V2_CONFIG.gmailServiceId && !EMAILJS_V2_CONFIG.outlookServiceId) ||
    !EMAILJS_V2_CONFIG.meetingConfirmedTemplateId
  ) {
    return {
      success: false,
      error:
        "Missing EmailJS V2 configuration. Ensure REACT_APP_EMAILJSV2_* env vars are set.",
    };
  }

  // Validate inputs
  if (!meetingData.menteeEmail || !meetingData.mentorEmail) {
    return {
      success: false,
      error: "Missing email addresses for mentee or mentor",
    };
  }

  const common = {
    meeting_date: meetingData.meetingDate,
    meeting_time: meetingData.meetingTime,
    meet_link: meetLink,
    mentor_name: meetingData.mentorName,
    mentee_name: meetingData.menteeName,
  };

  const errors = [];
  let menteeEmail = null;
  let mentorEmail = null;

  try {
    // Send email to mentee
    menteeEmail = await emailjs.send(
      getEmailJSV2Service(meetingData.menteeEmail),
      EMAILJS_V2_CONFIG.meetingConfirmedTemplateId,
      {
        email: meetingData.menteeEmail, // Changed to match template variable {{email}}
        to_name: meetingData.menteeName,
        mentee_email: meetingData.menteeEmail,
        mentee_name: meetingData.menteeName,
        mentor_email: meetingData.mentorEmail,
        mentor_name: meetingData.mentorName,
        ...common,
      }
    );
    console.log("Email sent to mentee:", meetingData.menteeEmail);
  } catch (e) {
    console.error("Error sending email to mentee:", e);
    errors.push(`mentee: ${e?.text || e?.message || "unknown error"}`);
  }

  try {
    // Send email to mentor
    mentorEmail = await emailjs.send(
      getEmailJSV2Service(meetingData.mentorEmail),
      EMAILJS_V2_CONFIG.meetingConfirmedTemplateId,
      {
        email: meetingData.mentorEmail, // Changed to match template variable {{email}}
        to_name: meetingData.mentorName,
        mentee_email: meetingData.menteeEmail,
        mentee_name: meetingData.menteeName,
        mentor_email: meetingData.mentorEmail,
        mentor_name: meetingData.mentorName,
        ...common,
      }
    );
    console.log("Email sent to mentor:", meetingData.mentorEmail);
  } catch (e) {
    console.error("Error sending email to mentor:", e);
    errors.push(`mentor: ${e?.text || e?.message || "unknown error"}`);
  }

  if (errors.length) {
    return {
      success: false,
      error: errors.join(" | "),
      menteeEmail,
      mentorEmail,
    };
  }
  return { success: true, menteeEmail, mentorEmail };
};

// Send new time proposal emails (for dashboard functionality)
export const sendNewTimeProposalEmails = async (meetingData) => {
  // Verify configuration
  if (
    !EMAILJS_V2_CONFIG.publicKey ||
    (!EMAILJS_V2_CONFIG.gmailServiceId && !EMAILJS_V2_CONFIG.outlookServiceId) ||
    !EMAILJS_V2_CONFIG.newTimeProposedTemplateId
  ) {
    return {
      success: false,
      error:
        "Missing EmailJS V2 configuration. Ensure REACT_APP_EMAILJSV2_* env vars are set.",
    };
  }

  // Validate inputs
  if (!meetingData.menteeEmail || !meetingData.mentorEmail) {
    return {
      success: false,
      error: "Missing email addresses for mentee or mentor",
    };
  }

  const common = {
    meeting_date: meetingData.meetingDate,
    meeting_time: meetingData.meetingTime,
    mentor_name: meetingData.mentorName,
    mentee_name: meetingData.menteeName,
  };

  const errors = [];
  let menteeEmail = null;
  let mentorEmail = null;

  try {
    // Send email to mentee
    menteeEmail = await emailjs.send(
      getEmailJSV2Service(meetingData.menteeEmail),
      EMAILJS_V2_CONFIG.newTimeProposedTemplateId,
      {
        email: meetingData.menteeEmail, // Changed to match template variable {{email}}
        to_name: meetingData.menteeName,
        mentee_email: meetingData.menteeEmail,
        mentee_name: meetingData.menteeName,
        mentor_email: meetingData.mentorEmail,
        mentor_name: meetingData.mentorName,
        ...common,
      }
    );
    console.log("Email sent to mentee:", meetingData.menteeEmail);
  } catch (e) {
    console.error("Error sending email to mentee:", e);
    errors.push(`mentee: ${e?.text || e?.message || "unknown error"}`);
  }

  try {
    // Send email to mentor
    mentorEmail = await emailjs.send(
      getEmailJSV2Service(meetingData.mentorEmail),
      EMAILJS_V2_CONFIG.newTimeProposedTemplateId,
      {
        email: meetingData.mentorEmail, // Changed to match template variable {{email}}
        to_name: meetingData.mentorName,
        mentee_email: meetingData.menteeEmail,
        mentee_name: meetingData.menteeName,
        mentor_email: meetingData.mentorEmail,
        mentor_name: meetingData.mentorName,
        ...common,
      }
    );
    console.log("Email sent to mentor:", meetingData.mentorEmail);
  } catch (e) {
    console.error("Error sending email to mentor:", e);
    errors.push(`mentor: ${e?.text || e?.message || "unknown error"}`);
  }

  if (errors.length) {
    return {
      success: false,
      error: errors.join(" | "),
      menteeEmail,
      mentorEmail,
    };
  }
  return { success: true, menteeEmail, mentorEmail };
};
