import User from "../models/User.js";
import { getAdminEmails } from "../utils/adminAccess.js";

export default async function isAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    const tokenEmail = req.user?.email?.toLowerCase();
    const adminEmails = getAdminEmails();

    if (tokenEmail && adminEmails.includes(tokenEmail)) {
      return next();
    }

    if (userId) {
      const user = await User.findById(userId).select("email isAdmin");
      if (
        user?.isAdmin ||
        (user?.email && adminEmails.includes(user.email.toLowerCase()))
      ) {
        return next();
      }
    }

    return res.status(403).json({ message: "Admin access required." });
  } catch (error) {
    console.error("isAdmin middleware error:", error);
    return res.status(500).json({ message: "Could not verify admin access." });
  }
}
