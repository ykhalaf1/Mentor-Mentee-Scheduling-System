const LoginStyle = {
  base: {
    width: "539px",
    height: "503px",
    flexShrink: 0,
    borderRadius: "41px",
    background: "#FFF",
    boxShadow: "0 4px 4px 0 rgba(0, 0, 0, 0.25)",
  },

  emailBarLayout: {
    width: "380px",
    height: "37px",
    flexShrink: 0,
  },
  emailBarStyle: {
    borderRadius: "5px",
    border: "1px solid #007CA6",
    background: "#E7E8EE",
  },
  emailTextLayer: {
    color: "#007CA6",
    textAlign: "center",
    fontFamily: "Poppins, sans-serif",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "normal",
  },

  passwordBarLayout: {
    width: "380px",
    height: "37px",
    flexShrink: 0,
  },
  passwordBarStyle: {
    borderRadius: "5px",
    border: "1px solid #007CA6",
    background: "#E7E8EE",
  },
  passwordTextLayer: {
    color: "#007CA6",
    textAlign: "center",
    fontFamily: "Poppins, sans-serif",
    fontSize: "16px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "normal",
  },

  forgotPasswordTextLayer: {
    color: "#000",
    textAlign: "center",
    fontFamily: "Poppins, sans-serif",
    fontSize: "13px",
    fontStyle: "normal",
    fontWeight: 400,
    lineHeight: "normal",
  },

  loginButtonLayout: {
    display: "flex",
    width: "262px",
    height: "57px",
    padding: "var(--sds-size-space-300)",
    justifyContent: "center",
    alignItems: "center",
    gap: "var(--sds-size-space-200)",
    flexShrink: 0,
  },
  loginButtonStyle: {
    borderRadius: "10px",
    background: "#003F55",
  },
  loginButtonTextLayer: {
    color: "#FFF",
    fontFamily: "Poppins, sans-serif",
    fontSize: "18px",
    fontStyle: "normal",
    fontWeight: 600,
    lineHeight: "100%",
  },
};

export default LoginStyle;
