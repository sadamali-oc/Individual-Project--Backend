const jwt = require("jsonwebtoken");
require("dotenv").config();


const verifyJWT = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log("[AUTH] Authorization header:", authHeader ? "Present" : "Missing");

    if (!authHeader) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing Authorization header. Expected format: 'Authorization: Bearer <token>'",
      });
    }

    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== "bearer") {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Authorization header format. Expected 'Authorization: Bearer <token>'",
      });
    }

    const token = tokenParts[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log("[AUTH] Token verified. User ID:", decoded.user_id, "Role:", decoded.role);

    req.user = {
      id: decoded.user_id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("[AUTH] Token verification error:", error.message);
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Token has expired",
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      error: "Internal Server Error",
      message: "Error verifying token",
    });
  }
};

module.exports = {
  verifyJWT,
};
