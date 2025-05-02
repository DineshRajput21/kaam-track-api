const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

const projectRoutes = require("./routes/projectRoutes");
const labourRoutes = require("./routes/labourRoutes");

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

app.use("/", projectRoutes);
app.use("/", labourRoutes);

exports.api = onRequest({cors: true, timeoutSeconds: 60}, app);
