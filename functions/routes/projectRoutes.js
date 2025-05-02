const express = require("express");
const router = express.Router();
const db = require("../services/firebase");

// Add Project
router.post("/addProject", async (req, res) => {
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
    return res.status(400).json({ error: "projectName and location are required" });
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
    await docRef.update({ id: docRef.id });

    res.status(201).json({ message: "Project added", id: docRef.id });
  } catch (error) {
    console.error("Error adding project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Projects
router.get("/projects", async (req, res) => {
  try {
    const snapshot = await db.collection("projectsList").orderBy("createdAt", "desc").get();
    const projects = snapshot.docs.map((doc) => doc.data());
    res.status(200).json({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add Labour to Project
router.post("/addLabourToProject", async (req, res) => {
  const { projectLabours, projectId } = req.body;

  if (!Array.isArray(projectLabours)) {
    return res.status(400).json({ error: "projectLabours must be an array" });
  }

  try {
    const docRef = db.collection("projectsList").doc(projectId);
    await docRef.update({ projectLabours });

    const snapshot = await db.collection("projectsList").get();
    const allProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ message: "Labour added to project", projects: allProjects });
  } catch (error) {
    console.error("Error adding labour to project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Mark Project Completion
router.post("/markProjectStatus", async (req, res) => {
  const { projectId, isCompleted } = req.body;

  if (!projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }

  try {
    const docRef = db.collection("projectsList").doc(projectId);
    await docRef.update({ isCompleted });

    const snapshot = await db.collection("projectsList").get();
    const allProjects = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ message: "Project Completed", projects: allProjects });
  } catch (error) {
    console.error("Error completing project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Get Project By ID
router.get("/getProjectById", async (req, res) => {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ error: "projectId is required" });
  }

  try {
    const projectRef = db.collection("projectsList").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.status(200).json({ project: { id: projectDoc.id, ...projectDoc.data() } });
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
