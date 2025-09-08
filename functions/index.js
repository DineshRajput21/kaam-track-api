const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

admin.initializeApp();

const projectRoutes = require("./routes/projectRoutes");
const labourRoutes = require("./routes/labourRoutes");
const authenticationRoutes = require("./routes/authentication");
const aiRoutes = require("./routes/ai");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/", projectRoutes);
app.use("/", labourRoutes);
app.use("/", authenticationRoutes);
app.use("/", aiRoutes);

exports.api = onRequest({ cors: true, timeoutSeconds: 60 }, app);
