// routes/labourRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../services/firebase");

// Add Labour
router.post("/addLabour", async (req, res) => {
  const { name, wages, contact, role, adhaarNo, attendance, isLoggedIn } = req.body;

  if (!name || !contact || !role || !adhaarNo) {
    return res.status(400).json({
      error: "name, wages, contact, role and adhaarNo are required",
    });
  }

  try {
    const labourData = {
      name,
      wages,
      contact: contact.toString(),
      adhaarNo: adhaarNo.toString(),
      role,
      attendance: Array.isArray(attendance)
        ? attendance.filter((entry) => entry.projectId && typeof entry.isLogin === "boolean")
        : [],
      isLoggedIn: isLoggedIn === true,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("labourList").add(labourData);
    await docRef.update({ id: docRef.id });

    res.status(201).json({ message: "Labour added", id: docRef.id });
  } catch (error) {
    console.error("Error adding labour:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Labours
router.get("/labour", async (req, res) => {
  try {
    const snapshot = await db.collection("labourList").orderBy("createdAt", "desc").get();
    const labours = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ labours });
  } catch (error) {
    console.error("Error fetching labours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add Labour Attendance
router.post("/addLabourAttendance", async (req, res) => {
  const { labourId, attendance } = req.body;

  if (!labourId || !attendance || typeof attendance.projectId === "undefined" || typeof attendance.isLogin === "undefined") {
    return res.status(400).json({
      error: "labourId and valid attendance (with projectId and isLogin) are required",
    });
  }

  try {
    const labourRef = db.collection("labourList").doc(labourId);
    const labourDoc = await labourRef.get();

    const projectRef = db.collection("projectsList").doc(attendance.projectId);
    const projectDoc = await projectRef.get();

    if (!labourDoc.exists) {
      return res.status(404).json({ error: "Labour not found" });
    }

    const labourData = labourDoc.data();
    const projectData = projectDoc.data();

    const newAttendanceEntry = {
      projectId: attendance.projectId,
      isLogin: attendance.isLogin,
      time: new Date().toISOString(),
    };

    await labourRef.update({
      isLoggedIn: attendance.isLogin,
      attendance: [...(labourData.attendance || []), newAttendanceEntry],
    });

    const updatedProjectLabours = (projectData.projectLabours || []).map((labour) =>
      labour.id === labourId ? { ...labour, isLoggedIn: attendance.isLogin } : labour
    );

    if (!updatedProjectLabours.find((l) => l.id === labourId)) {
      updatedProjectLabours.push({ id: labourId, isLoggedIn: attendance.isLogin });
    }

    await projectRef.update({ projectLabours: updatedProjectLabours });

    const updatedDoc = await labourRef.get();
    const updatedLabour = { id: updatedDoc.id, ...updatedDoc.data() };

    res.status(200).json({
      message: "Attendance and login status updated successfully",
      updatedLabour,
    });
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

module.exports = router;
