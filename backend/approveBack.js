import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebase";

const functions = getFunctions(app);

export const approve = async (email) => {
  const approveUser = httpsCallable(functions, "approveUser");

  try {
    const result = await approveUser({ email});
    console.log("Approved user:", result.data);
    return result.data;
  } catch (err) {
    console.error("Approval error", err);
    throw err;
  }
};