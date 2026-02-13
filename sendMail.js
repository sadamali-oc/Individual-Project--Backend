const nodemailer = require("nodemailer");
require("dotenv").config({ path: "./.env" });

// Check if environment variables are loaded
console.log("Loaded EMAIL_USER:", process.env.EMAIL_USER || "Not Loaded");
console.log("Loaded EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded" : "Not Loaded");

// Create a transporter using SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER, // Your email from .env
    pass: process.env.EMAIL_PASS, // Your email password from .env
  },
});

// Function to send an email
const sendEmail = async (req, res) => {
  console.log("Incoming email request:", req.body);

  const { to, subject, text } = req.body; // Get recipient, subject, and text from request

  if (!to || !subject || !text) {
    console.log("Error: Missing email details");
    return res.status(400).json({ message: "Missing email details" });
  }

  const mailOptions = {
    from: {
      name: "Fred Foo", // Sender name
      address: process.env.EMAIL_USER, // Sender email from .env
    },
    to, // Dynamic recipient email
    subject, // Dynamic subject
    text, // Dynamic message body
  };

  console.log("Mail options:", mailOptions);

  try {
    console.log("Sending email...");
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info);
    res.status(200).json({ message: "Email sent successfully", info });
  } catch (error) {
    console.error("Error sending email:", error);
    res
      .status(500)
      .json({ message: "Error sending email", error: error.message });
  }
};

module.exports = { sendEmail };
