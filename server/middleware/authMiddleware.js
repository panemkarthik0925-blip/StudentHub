
import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Access denied. Please log in.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.includes("REPLACE_WITH")) {
      return res.status(500).json({
        message: "Server authentication is not configured.",
      });
    }

    const decoded = jwt.verify(token, secret);

    if (decoded.role !== "admin" || !decoded.sub) {
      return res.status(403).json({
        message: "Admin access required.",
      });
    }

    req.admin = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

export default authMiddleware;
