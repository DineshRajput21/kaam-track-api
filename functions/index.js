/* eslint-disable max-len */
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// POST PROJECT
app.post("/addProject", async (req, res) => {
  const {
    projectName,
    location,
    description,
    startDate,
    endDate,
    isCompleted,
    projectLabours,
  } = req.body;

  if (!projectName || !location) {
    return res
        .status(400)
        .json({error: "projectName and location are required"});
  }

  try {
    const projectData = {
      projectName,
      location,
      description: description || "",
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date().toISOString(),
      isCompleted: isCompleted === true,
      projectLabours: Array.isArray(projectLabours) ? projectLabours : [],
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("projectsList").add(projectData);
    await docRef.update({id: docRef.id});

    res.status(201).json({message: "Project added", id: docRef.id});
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

// GET PROJECTS
app.get("/projects", async (req, res) => {
  try {
    const snapshot = await db
        .collection("projectsList")
        .orderBy("createdAt", "desc")
        .get();
    const projects = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({projects});
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

// POST LABOUR
app.post("/addLabour", async (req, res) => {
  const {name, wages, contact, role, adhaarNo, attendance, isLoggedIn} =
    req.body;

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
      attendance: Array.isArray(attendance) ?
        attendance.filter(
            (entry) => entry.projectId && typeof entry.isLogin === "boolean",
        ) :
        [],
      isLoggedIn: isLoggedIn === true,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("labourList").add(labourData);
    await docRef.update({id: docRef.id});

    res.status(201).json({message: "Labour added", id: docRef.id});
  } catch (error) {
    console.error("Error adding labour:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

// GET LABOURS
app.get("/labour", async (req, res) => {
  try {
    const snapshot = await db
        .collection("labourList")
        .orderBy("createdAt", "desc")
        .get();
    const labours = snapshot.docs.map((doc) => doc.data());

    res.status(200).json({labours});
  } catch (error) {
    console.error("Error fetching labours:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});

// POST LABOURS TO PROJECTS
app.post("/addLabourToProject", async (req, res) => {
  const {projectLabours, projectId} = req.body;

  if (!Array.isArray(projectLabours)) {
    return res.status(400).json({error: "projectLabours must be an array"});
  }

  try {
    const docRef = db.collection("projectsList").doc(projectId);
    await docRef.update({projectLabours});

    const snapshot = await db.collection("projectsList").get();
    const allProjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      message: "Labour added to project",
      projects: allProjects,
    });
  } catch (error) {
    console.error("Error adding labour to project:", error);
    res.status(500).json({error: "Internal Server Error"});
  }
});
// POST /addLabourAttendance
app.post("/addLabourAttendance", async (req, res) => {
  const {labourId, attendance} = req.body;

  // Validate input
  if (
    !labourId ||
    !attendance ||
    typeof attendance.projectId === "undefined" ||
    typeof attendance.isLogin === "undefined"
  ) {
    return res.status(400).json({
      error:
        "labourId and valid attendance (with projectId and isLogin) are required",
    });
  }

  try {
    // Fetch existing labour document
    const labourRef = db.collection("labourList").doc(labourId);
    const labourDoc = await labourRef.get();

    const projectRef = db.collection("projectsList").doc(attendance.projectId);
    const projectDoc = await projectRef.get();

    if (!labourDoc.exists) {
      return res.status(404).json({error: "Labour not found"});
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
      labour.id === labourId ? {...labour, isLoggedIn: attendance.isLogin} : labour,
    );

    if (!updatedProjectLabours.find((l) => l.id === labourId)) {
      updatedProjectLabours.push({id: labourId, isLoggedIn: attendance.isLogin});
    }

    await projectRef.update({projectLabours: updatedProjectLabours});


    const updatedDoc = await labourRef.get();
    const updatedLabour = {id: updatedDoc.id, ...updatedDoc.data()};

    return res.status(200).json({
      message: "Attendance and login status updated successfully",
      updatedLabour,
    });
  } catch (error) {
    console.error("Error updating attendance:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// POST PROJECT COMPLETION
app.post("/markProjectStatus", async (req, res) => {
  const {projectId, isCompleted} = req.body;
  if (!projectId) {
    return res.status(400).json({error: "projectId is required"});
  }

  try {
    const docRef = db.collection("projectsList").doc(projectId);
    await docRef.update({isCompleted: isCompleted});

    const snapshot = await db.collection("projectsList").get();
    const allProjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      message: "Project Completed",
      projects: allProjects,
    });
  } catch (error) {
    console.error("Error completing project:", error);
    return res.status(500).json({error: "Internal Server Error"});
  }
});
// GET PROJECT FROM ID
app.get("/getProjectById", async (req, res) => {
  const {projectId} = req.query;

  if (!projectId) {
    return res.status(400).json({error: "projectId is required"});
  }

  try {
    const projectRef = db.collection("projectsList").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({error: "Project not found"});
    }

    return res.status(200).json({
      project: {
        id: projectDoc.id,
        ...projectDoc.data(),
      },
    });
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
});

// Export the Express app via Firebase HTTPS function
exports.api = onRequest({cors: true, timeoutSeconds: 60}, app);
