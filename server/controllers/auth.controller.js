const User = require("../models/user.model.js");
const dotenv = require("dotenv");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const { sendNotification } = require("../middlewares/mailgun/sendMail.js");
const {
  generateToken,
  generateRefreshToken,
  generateResetToken,
} = require("../middlewares/jwt/generateToken.js");
dotenv.config();

// register
const register = async (req, res) => {
  try {
    const newUser = new User({
      ...req.body,
      password: CryptoJS.AES.encrypt(req.body.password, process.env.AES_SEC),
    });
    const savedUser = await newUser.save();
    const subject = `registration confirmation !`;

    const test = `
        Hi, ${savedUser.username}, \n You have been registered successfully !
      `;
    sendNotification(savedUser.email, savedUser.email, subject, test);
    res.status(201).json(savedUser);
  } catch (err) {
    res.status(500).json(err);
  }
};

// login
const login = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json("User not found !");
    }
    const originalPassword = CryptoJS.AES.decrypt(
      user.password,
      process.env.AES_SEC
    ).toString(CryptoJS.enc.Utf8);
    if (originalPassword !== req.body.password) {
      return res.status(401).json("password is incorrect !");
    }
    const token = generateToken(user);
    const refreshtoken = generateRefreshToken(user);
    user.refreshToken = refreshtoken;
    await user.save();

    res.cookie("accessToken", token, { httpOnly: true, maxAge: "3600000" });

    const { password, ...otherInfo } = user._doc;

    res.status(200).json({ ...otherInfo, token });
  } catch (err) {
    res.status(500).json("Internal server error " + err);
  }
};

// logout
const logout = async (req, res) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json("accesstoken is not provided !");
    }

    const decodedToken = jwt.verify(accessToken, process.env.JWT_TOKEN_SEC);
    const userId = decodedToken._id;

    const user = await User.findById(userId);

    user.refreshToken = null;
    await user.save();

    res.clearCookie("accessToken");

    res.status(200).json("User has been logged out successfully!");
  } catch (err) {
    res.status(500).json(err.message || "Internal server error");
  }
};

// reset
const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    const resetToken = generateResetToken(user);

    const resetLink = `http://localhost:8000/api/auth/update-password/${resetToken}`;

    // mailgun
    const text = `Click here to reset your password ${resetLink}`;
    sendNotification(user.email, user.email, "Reset password", text);
    res.status(200).json("Reset mail has been sent to your email");
  } catch (err) {
    res.status(500).json(err.message || "Internal sever error !");
  }
};

const updatePassword = async (req, res) => {
  try {
    const { resetToken } = req.params;

    if (!resetToken) {
      return res.status(401).json("Token not found in params");
    }

    const decodedToken = jwt.verify(
      resetToken,
      process.env.JWT_RESET_TOKEN_SEC
    );

    const user = await User.findById(decodedToken._id);

    if (!user) {
      return res.status(404).json("User not found");
    }

    user.password = CryptoJS.AES.encrypt(
      req.body.password,
      process.env.AES_SEC
    );

    await user.save();

    // Send a notification to the user
    sendNotification(
      user.email,
      user.email,
      "Password updation",
      "Your password has been updated successfully!"
    );

    res.status(200).json("Password updated successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).json(err.message || "Internal server error");
  }
};

module.exports = { register, login, logout, resetPassword, updatePassword };
