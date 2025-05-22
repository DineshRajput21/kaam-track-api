/* eslint-disable max-len */
// routes/labourRoutes.js
const express = require("express");
const router = express.Router();
const db = require("../services/firebase");

// Add Labour
router.post("/addLabour", async (req, res) => {
  const {
    userId,
    name,
    wages,
    contact,
    role,
    adhaarNo,
    attendance,
    isLoggedIn,
  } = req.body;

  if (!userId || !name || !contact || !role || !adhaarNo) {
    return res.status(400).json({
      error: "userId, name, contact, role, and adhaarNo are required",
    });
  }

  try {
    const labourData = {
      userId,
      name,
      wages: wages || null,
      contact: contact.toString(),
      adhaarNo: adhaarNo.toString(),
      role,
      attendance: Array.isArray(attendance) ?
        attendance.filter(
            (entry) =>
              entry.projectId &&
              typeof entry.isLogin === "boolean" &&
              typeof entry.isLoggedOut === "boolean",
        ) :
        [],
      isLoggedIn: isLoggedIn === true,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("labourList").add(labourData);
    await docRef.update({ id: docRef.id });

    res.status(201).json({ message: "Labour added successfully", id: docRef.id });
  } catch (error) {
    console.error("Error adding labour:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Labours
router.get("/labour", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    const snapshot = await db
        .collection("labourList")
        .where("userId", "==", userId)
        .get();

    const labours = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ labours });
  } catch (error) {
    console.error("Error fetching labour:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add Labour Attendance
router.post("/addLabourAttendance", async (req, res) => {
  const { labourId, attendance } = req.body;

  if (
    !labourId ||
    !attendance ||
    typeof attendance.projectId === "undefined" ||
    typeof attendance.isLogin === "undefined" ||
    typeof attendance.isLoggedOut === "undefined"
  ) {
    return res.status(400).json({
      error:
        "labourId and valid attendance (with projectId and isLogin/isLoggedOut) are required",
    });
  }

  try {
    const labourRef = db.collection("labourList").doc(labourId);
    const labourDoc = await labourRef.get();
    if (!labourDoc.exists) {
      return res.status(404).json({ error: "Labour not found" });
    }

    const projectRef = db.collection("projectsList").doc(attendance.projectId);
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const labourData = labourDoc.data();
    const projectData = projectDoc.data();

    const loginStatus = attendance.isLogin && !attendance.isLoggedOut;

    const newAttendanceEntry = {
      projectId: attendance.projectId,
      isLogin: attendance.isLogin,
      isLoggedOut: attendance.isLoggedOut,
      time: new Date().toISOString(),
    };

    const updatedAttendance = Array.isArray(labourData.attendance) ?
      [...labourData.attendance, newAttendanceEntry] :
      [newAttendanceEntry];

    await labourRef.update({
      isLoggedIn: loginStatus,
      attendance: updatedAttendance,
    });

    const existingLabourIndex = (projectData.projectLabours || []).findIndex(
        (l) => l.id === labourId,
    );

    const updatedProjectLabours = [...(projectData.projectLabours || [])];

    if (existingLabourIndex > -1) {
      updatedProjectLabours[existingLabourIndex] = {
        ...updatedProjectLabours[existingLabourIndex],
        isLoggedIn: loginStatus,
      };
    } else {
      updatedProjectLabours.push({
        id: labourId,
        isLoggedIn: loginStatus,
      });
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
    res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
  }
});

// ADD MATERIAL
router.post("/addMaterial", async (req, res) => {
  const { material, quantity, unit, status, userId } = req.body;

  if (!material || !quantity || !unit || !status || !userId) {
    return res.status(400).json({
      error: "material, quantity, unit, status, and userId are required",
    });
  }

  try {
    const timestamp = new Date().toISOString();

    const materialData = {
      userId,
      material,
      quantity,
      unit,
      status,
      createdAt: timestamp,
    };

    const docRef = await db.collection("materialList").add(materialData);
    await docRef.update({ id: docRef.id });

    return res.status(201).json({
      message: "Material added successfully",
      id: docRef.id,
    });
  } catch (error) {
    console.error("Error adding material:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET MATERIAL
router.get("/material", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }
  try {
    const snapshot = await db
        .collection("materialList")
        .where("userId", "==", userId)
        .get();

    const materials = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ materials });
  } catch (error) {
    console.error("Error fetching materials:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});
//  GET MATERIAL BY ID
router.get("/getMaterialById", async (req, res) => {
  const { materialId } = req.query;

  if (!materialId) {
    return res.status(400).json({ error: "Material Id is required" });
  }

  try {
    const materialRef = db.collection("materialList").doc(materialId);
    const materialDoc = await materialRef.get();

    if (!materialDoc.exists) {
      return res.status(404).json({ error: "Material not found" });
    }
    res
        .status(200)
        .json({ material: { id: materialDoc.id, ...materialDoc.data() } });
  } catch (error) {
    console.error("Error fetching Material by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// UPDATE MATERIAL
router.post("/updateMaterial", async (req, res) => {
  const { id, material, quantity, unit, status } = req.body;

  if (!id || !material || !quantity || !unit || !status) {
    return res.status(400).json({
      error: "id, material, quantity, unit, and status are required",
    });
  }

  try {
    const updatedAt = new Date().toISOString();

    const updateData = {
      material,
      quantity,
      unit,
      status,
      updatedAt,
    };

    const materialRef = db.collection("materialList").doc(id);
    const materialDoc = await materialRef.get();

    if (!materialDoc.exists) {
      return res.status(404).json({ error: "Material not found" });
    }

    await materialRef.update(updateData);

    return res.status(200).json({ message: "Material updated successfully" });
  } catch (error) {
    console.error("Error updating Material:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
