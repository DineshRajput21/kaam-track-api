/* eslint-disable require-jsdoc */
const express = require("express");
const router = express.Router();
const db = require("../services/firebase");

// Basic validation
function isPositiveNumber(n) {
  return typeof n === "number" && isFinite(n) && n > 0;
}

router.post("/estimateMaterialCost", async (req, res) => {
  const { projectType, areaSqft, floors, quality, location } = req.body || {};

  if (!["residential", "commercial"].includes(projectType || "")) {
    return res.status(400).json({ error: "Invalid projectType" });
  }
  if (!isPositiveNumber(areaSqft)) {
    return res
        .status(400)
        .json({ error: "areaSqft must be a positive number" });
  }
  if (!Number.isInteger(floors) || floors <= 0) {
    return res.status(400).json({ error: "floors must be a positive integer" });
  }
  if (!["economy", "standard", "premium"].includes(quality || "")) {
    return res.status(400).json({ error: "Invalid quality" });
  }
  if (!location || typeof location !== "string") {
    return res.status(400).json({ error: "location is required" });
  }

  try {
    const coeffSnap = await db
        .collection("coefficients")
        .doc(projectType)
        .get();
    if (!coeffSnap.exists) {
      return res
          .status(404)
          .json({ error: "Coefficients not found for project type" });
    }
    const coeff = coeffSnap.data();
    const grade = coeff?.[quality];
    if (!grade) {
      return res.status(400).json({ error: "Quality coefficients missing" });
    }
    const materials = ["cement", "steel", "sand", "bricks", "paint"];
    const priceDocs = await Promise.all(
        materials.map(async (m) => {
          const s = await db.collection("prices").doc(m).get();
          if (!s.exists) throw new Error(`Price not found for ${m}`);
          return { key: m, ...s.data() };
        }),
    );

    const currency = priceDocs[0]?.currency || "SAR";
    const areaTotal = areaSqft * floors;

    const consumption = {
      cement: grade.cement_bag_per_sqft * areaTotal,
      steel: grade.steel_kg_per_sqft * areaTotal,
      sand: grade.sand_cft_per_sqft * areaTotal,
      bricks: grade.bricks_per_sqft * areaTotal,
      paint: grade.paint_ltr_per_sqft * areaTotal,
    };

    const items = priceDocs.map((doc) => {
      const unit = doc.unit;
      const locMult = doc.locations?.[location] ?? 1.0;
      const sorted = Object.entries(doc.brands || {})
          .map(([brand, price]) => ({
            brand,
            unitPrice: Number(price) * locMult,
          }))
          .sort((a, b) => a.unitPrice - b.unitPrice);

      const cheapest = sorted[0];
      if (!cheapest) {
        throw new Error(`No brands available for ${doc.key}`);
      }

      const qty = Number(consumption[doc.key] ?? 0);
      const subtotal = qty * cheapest.unitPrice;

      return {
        material: doc.key,
        unit,
        qty,
        brand: cheapest.brand,
        unitPrice: cheapest.unitPrice,
        subtotal,
        alternatives: sorted.slice(1, 3),
      };
    });

    const materialsTotal = items.reduce((a, b) => a + b.subtotal, 0);
    const laborCost = materialsTotal * Number(grade.labor_pct || 0);
    const total = materialsTotal + laborCost;

    // Basic heuristic suggestions (can plug AI later)
    const suggestions = [
      `Bulk purchase popular materials near ${location} to reduce logistics cost.`,
      `Current quality: ${quality}. Consider mixing premium paint only for exterior.`,
    ];

    return res.status(200).json({
      items,
      laborCost,
      total,
      currency,
      suggestions,
    });
  } catch (err) {
    console.error("estimateMaterialCost error:", err);
    return res.status(500).json({ error: "Failed to estimate" + err });
  }
});

// ---------------------------
// POST /saveEstimate
// Body: { userId?, input, result }
// ---------------------------
router.post("/saveEstimate", async (req, res) => {
  const { userId, input, result } = req.body || {};
  if (!input || !result) {
    return res.status(400).json({ error: "input and result are required" });
  }
  try {
    const doc = await db.collection("estimates").add({
      userId: userId || null,
      createdAt: new Date(),
      input,
      result,
    });
    return res.status(200).json({ message: "Estimate saved", id: doc.id });
  } catch (err) {
    console.error("saveEstimate error:", err);
    return res.status(500).json({ error: "Failed to save estimate" });
  }
});

// ---------------------------
// GET /myEstimates?userId=...&limit=20
// ---------------------------
router.get("/myEstimates", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    const snap = await db
        .collection("estimates")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ estimates: items });
  } catch (err) {
    console.error("myEstimates error:", err);
    return res.status(500).json({ error: "Failed to fetch estimates" });
  }
});

// ---------------------------
// Helpers: read prices and coefficients
// ---------------------------
router.get("/prices", async (_req, res) => {
  try {
    const snap = await db.collection("prices").get();
    const data = {};
    snap.docs.forEach((d) => (data[d.id] = d.data()));
    return res.status(200).json(data);
  } catch (e) {
    console.error("prices error:", e);
    return res.status(500).json({ error: "Failed to fetch prices" });
  }
});

router.get("/coefficients/:projectType", async (req, res) => {
  const { projectType } = req.params;
  try {
    const doc = await db.collection("coefficients").doc(projectType).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(doc.data());
  } catch (e) {
    console.error("coefficients error:", e);
    return res.status(500).json({ error: "Failed to fetch coefficients" });
  }
});


// TEMPORARY API
router.post("/coefficients", async (req, res) => {
  try {
    const { coefficients } = req.body || {};
    if (!coefficients || typeof coefficients !== "object") {
      return res.status(400).json({ error: "coefficients object is required" });
    }

    const writes = Object.entries(coefficients).map(([projectType, doc]) =>
      db.collection("coefficients").doc(projectType).set(doc, { merge: true }),
    );
    await Promise.all(writes);

    res.status(200).json({
      message: "Coefficients upserted",
      count: Object.keys(coefficients).length,
      docs: Object.keys(coefficients),
    });
  } catch (e) {
    console.error("coefficients seed error:", e);
    res.status(500).json({ error: "Failed to upsert coefficients" });
  }
});

// POST /temp-seed/prices  — upsert prices
router.post("/prices", async (req, res) => {
  try {
    const { prices } = req.body || {};
    if (!prices || typeof prices !== "object") {
      return res.status(400).json({ error: "prices object is required" });
    }

    const writes = Object.entries(prices).map(([material, doc]) =>
      db.collection("prices").doc(material).set(doc, { merge: true }),
    );
    await Promise.all(writes);

    res.status(200).json({
      message: "Prices upserted",
      count: Object.keys(prices).length,
      docs: Object.keys(prices),
    });
  } catch (e) {
    console.error("prices seed error:", e);
    res.status(500).json({ error: "Failed to upsert prices" });
  }
});

module.exports = router;
