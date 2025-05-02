# Firebase Express API for Projects & Labours

This project provides a structured Express.js API hosted on Firebase Functions, used for managing **Projects** and **Labours** in a Firestore database. It supports features like adding, retrieving, updating projects, managing labour profiles, and tracking attendance.

---

## 📁 Folder Structure

```
functions/
├── index.js                 # Entry point of Firebase Function
├── routes/
│   ├── projectRoutes.js     # All project-related routes
│   └── labourRoutes.js      # All labour-related routes
├── services/
│   └── firebase.js          # Firebase Admin SDK init and Firestore instance
├── package.json             # Dependencies
└── .eslintrc.js             # Optional linting setup
```

---

## 🧩 APIs

### 🔧 Project Routes

| Method | Endpoint              | Description                 |
| ------ | --------------------- | --------------------------- |
| POST   | `/addProject`         | Add a new project           |
| GET    | `/projects`           | Get all projects            |
| POST   | `/addLabourToProject` | Assign labours to a project |
| POST   | `/markProjectStatus`  | Mark a project as completed |
| GET    | `/getProjectById`     | Fetch project by ID         |

### 👷 Labour Routes

| Method | Endpoint               | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| POST   | `/addLabour`           | Add a new labour                        |
| GET    | `/labour`              | Get all labours                         |
| POST   | `/addLabourAttendance` | Mark attendance and update login status |

---

## ⚙️ Setup Instructions

### 🔐 Prerequisites

* Node.js (v18+ recommended)
* Firebase CLI installed globally (`npm install -g firebase-tools`)
* A Firebase project set to Blaze plan (required for functions deployment)

### 📦 Install Dependencies

```bash
cd functions
npm install
```

### 🧪 Local Testing (Optional)

```bash
firebase emulators:start
```

### 🚀 Deploy to Firebase

```bash
firebase login
firebase use --add      # Select your project
firebase deploy --only functions
```

### 🔁 Refresh Functions after Code Changes

```bash
firebase deploy --only functions
```

---

## 🔐 Firebase Initialization

File: `services/firebase.js`

```js
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
module.exports = db;
```

---

## 📤 Firebase Function Export (index.js)

```js
const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

const projectRoutes = require("./routes/projectRoutes");
const labourRoutes = require("./routes/labourRoutes");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.use("/", projectRoutes);
app.use("/", labourRoutes);

exports.api = onRequest({ cors: true }, app);
```

---

## ✅ Firestore Collections Used

* `projectsList`
* `labourList`

Each document includes a field `createdAt` and a unique `id` added after creation.

---

## 💬 Contact

For improvements, bugs, or feature requests, feel free to open an issue or pull request.
