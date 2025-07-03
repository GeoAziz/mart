/**
 * Script to create an admin user in Firebase Auth and Firestore for ZilaCart.
 *
 * Usage:
 *   1. Ensure you have a valid serviceAccountKey.json in your project root.
 *   2. Run: npx ts-node scripts/create-admin-user.ts
 */

import admin from "firebase-admin";
import path from "path";
import fs from "fs";

// Load service account key
const keyPath = path.resolve(process.cwd(), "serviceAccountKey.json");
if (!fs.existsSync(keyPath)) {
  console.error("serviceAccountKey.json not found in project root.");
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || "admin@zilacart.io";
  const password = process.env.ADMIN_PASSWORD || "password";
  const fullName = process.env.ADMIN_FULLNAME || "Admin User";

  try {
    // 1. Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: fullName,
        emailVerified: true,
      });
      console.log("Created new Firebase Auth user:", userRecord.uid);
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        userRecord = await auth.getUserByEmail(email);
        console.log("User already exists. Using existing UID:", userRecord.uid);
      } else {
        throw err;
      }
    }

    // 2. Create user profile in Firestore
    const userDocRef = db.collection("users").doc(userRecord.uid);
    const now = new Date();
    const userProfile = {
      uid: userRecord.uid,
      email,
      fullName,
      role: "admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await userDocRef.set(userProfile, { merge: true });
    console.log("Admin user profile created/updated in Firestore.");
    console.log("\nAdmin user ready:");
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}`);
    console.log("\nYou can now log in to the admin UI with these credentials.");
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

createAdminUser();
