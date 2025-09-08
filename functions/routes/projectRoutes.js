const express = require("express");
const router = express.Router();
const db = require("../services/firebase");
const admin = require("firebase-admin");

// Add Project
router.post("/addProject", async (req, res) => {
  const {
    uid,
    projectName,
    location,
    description,
    startDate,
    endDate,
    isCompleted,
    projectLabours,
    projectMaterial,
  } = req.body;
  console.log("Body:", req.body);
  if (!projectName || !location) {
    return res
        .status(400)
        .json({ error: "projectName and location are required" });
  }
  if (!uid) {
    return res.status(401).json({ error: "user id is required" });
  }

  try {
    const projectData = {
      uid,
      projectName,
      location,
      description: description || "",
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date().toISOString(),
      isCompleted: isCompleted === true,
      projectLabours: Array.isArray(projectLabours) ? projectLabours : [],
      projectMaterial: Array.isArray(projectMaterial) ? projectMaterial : [],
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
  const { uid } = req.query;
  if (!uid) {
    return res.status(400).json({ error: "uid is required" });
  }

  try {
    const snapshot = await db
        .collection("projectsList")
        .where("uid", "==", uid)
        .get();

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

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
    const allProjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res
        .status(200)
        .json({ message: "Labour added to project", projects: allProjects });
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
    const allProjects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res
        .status(200)
        .json({ message: "Project Completed", projects: allProjects });
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

    res
        .status(200)
        .json({ project: { id: projectDoc.id, ...projectDoc.data() } });
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// ADD MATERIAL TO PROJECT
router.post("/addMaterialToProject", async (req, res) => {
  const { projectMaterial, projectId } = req.body;

  try {
    const docRef = db.collection("projectsList").doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const materialWithId = {
      ...projectMaterial,
      id: db.collection("random").doc().id,
    };
    await docRef.update({
      projectMaterials: admin.firestore.FieldValue.arrayUnion(materialWithId),
    });
    const materialRef = db.collection("materialList").doc(projectMaterial.id);
    const materialDoc = await materialRef.get();

    if (!materialDoc.exists) {
      return res.status(404).json({ error: "Material not found" });
    }
    const currentData = materialDoc.data();
    const updatedQuantity =
      Number(currentData.quantity) - Number(projectMaterial.quantity);

    await materialRef.update({
      ...currentData,
      quantity: updatedQuantity,
    });
    res.status(200).json({
      message: "Material added to project with new IDs",
    });
  } catch (error) {
    console.error("Error adding material to project:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// EDIT MATERIAL IN PROJECT
router.put("/editMaterialInProject", async (req, res) => {
  const { projectId, updatedMaterial } = req.body;

  if (!projectId || !updatedMaterial || !updatedMaterial.id) {
    return res.status(400).json({
      error: "projectId and valid updatedMaterial with id are required",
    });
  }

  try {
    const projectRef = db.collection("projectsList").doc(projectId);
    const doc = await projectRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const projectData = doc.data();
    const projectMaterials = projectData.projectMaterial || [];

    const updatedMaterials = projectMaterials.map((material) =>
      material.id === updatedMaterial.id ?
        { ...material, ...updatedMaterial } :
        material,
    );

    await projectRef.update({ projectMaterial: updatedMaterials });

    res.status(200).json({
      message: "Project material updated successfully",
      updatedMaterial,
    });
  } catch (error) {
    console.error("Error updating project material:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
module.exports = router;
