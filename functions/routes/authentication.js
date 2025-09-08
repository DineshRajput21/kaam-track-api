const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

const db = admin.firestore();
const auth = admin.auth();

// REGISTER or VERIFY USER TOKEN
router.post("/registerId", async (req, res) => {
  const { token, phoneNumber } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  try {
    const decoded = await auth.verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    if (!doc.exists) {
      await userRef.set({
        uid: decoded.uid || null,
        name: decoded.name || null,
        email: decoded.email || null,
        picture:
          decoded.picture ||
         "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsCc5E-o4z6uPnn8qn_ITbrlxdJ5kdmbztmg&s",
        phoneNumber: decoded.phone_number || phoneNumber || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.status(200).json({
      message: "User authenticated",
      uid,
      email: decoded.email || null,
      phoneNumber: decoded.phone_number || phoneNumber || null,
    });
  } catch (error) {
    console.error("Token verification failed", error);
    res.status(401).json({ error: "Unauthorized" });
  }
});
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
        .status(401)
        .json({ error: "Authorization token missing or malformed" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};

// GET CURRENT LOGGED-IN USER
router.get("/getCurrentUser", verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      user: { id: userDoc.id, ...userDoc.data() },
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// EDIT PROFILE

router.post("/editProfile", async (req, res) => {
  try {
    const { uid, email, name, phoneNumber, picture } = req.body;
    const updatedAt = new Date().toISOString();

    const updateData = {
      ...(email && { email }),
      ...(name && { name }),
      ...(phoneNumber && { phoneNumber }),
      ...(picture && { picture }),
      updatedAt,
    };

    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await userRef.update(updateData);

    return res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
