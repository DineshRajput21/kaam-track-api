/* eslint-disable max-len */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();
app.use(cors({origin: true})); // Consider restricting origins in production
app.use(express.json());

app.post("/addProjects", async (req, res) => {
  try {
    const {projectName} = req.body;

    // Enhanced validation
    if (!projectName || typeof projectName !== "string" || projectName.trim() === "") {
      return res.status(400).json({error: "Valid project name is required"});
    }

    const docRef = await db.collection("projects").add({projectName: projectName.trim()});
    return res.status(201).json({id: docRef.id, projectName: projectName.trim()});
  } catch (error) {
    console.error("Error adding project:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    return res.status(500).json({
      error: "Failed to add project",
      details: error.message,
    });
  }
});

app.get("/getProjects", async (req, res) => {
  try {
    const snapshot = await db.collection("projects").orderBy("createdAt", "desc").get();

    if (snapshot.empty) {
      return res.status(200).json([]); // No projects found
    }

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return res.status(500).json({
      error: "Failed to fetch projects",
      details: error.message,
    });
  }
});

// Enable CORS
app.use(cors({origin: true}));
app.use(express.json()); // For parsing JSON bodies

// GET endpoint
app.get("/hello", (req, res) => {
  res.json({message: "Hello from Firebase API!"});
});

// POST endpoint
app.post("/greet", (req, res) => {
  const {name} = req.body;
  res.json({message: `Welcome, ${name}`});
});

// Export the API
exports.api = functions.https.onRequest(app);
