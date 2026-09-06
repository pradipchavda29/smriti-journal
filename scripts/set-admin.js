#!/usr/bin/env node

/**
 * scripts/set-admin.js
 *
 * Sets the Firebase custom user claim `{ role: 'admin' }` on a user identified by email.
 * This role is verified strictly server-side (and in Firebase Security Rules) to grant
 * aggregate metadata metrics access without compromising individual user journal privacy.
 *
 * Usage:
 *   node scripts/set-admin.js <user-email>
 * Example:
 *   node scripts/set-admin.js user@example.com
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const email = process.argv[2]?.trim();

if (!email) {
  console.error('\nError: Missing target user email.\n');
  console.error('Usage:');
  console.error('  node scripts/set-admin.js <user-email>\n');
  console.error('Example:');
  console.error('  node scripts/set-admin.js user@example.com\n');
  process.exit(1);
}

// Derive project ID from environment or applet config
let projectId =
  process.env.GCLOUD_PROJECT ||
  process.env.FIREBASE_PROJECT_ID;

if (!projectId) {
  try {
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      projectId = cfg.projectId;
    }
  } catch (err) {
    // ignore
  }
}

if (!projectId) {
  projectId = 'gen-lang-client-0607136846';
}

if (!getApps().length) {
  initializeApp({
    projectId,
  });
}

async function setAdminRole() {
  console.log(`[RBAC] Connecting to Firebase project: ${projectId}...`);
  console.log(`[RBAC] Looking up user by email: ${email}...`);

  try {
    const auth = getAuth();
    const userRecord = await auth.getUserByEmail(email);

    console.log(`[RBAC] Found user record: ${userRecord.email} (UID: ${userRecord.uid})`);
    console.log(`[RBAC] Existing custom claims:`, userRecord.customClaims || {});

    // Set custom claim { role: 'admin' }
    const updatedClaims = {
      ...(userRecord.customClaims || {}),
      role: 'admin',
    };

    await auth.setCustomUserClaims(userRecord.uid, updatedClaims);

    // Verify written claim
    const verifiedUser = await auth.getUser(userRecord.uid);
    console.log('\n========================================');
    console.log('✅ Admin Custom Claim Successfully Set!');
    console.log('========================================');
    console.log(`User Email:    ${verifiedUser.email}`);
    console.log(`User UID:      ${verifiedUser.uid}`);
    console.log(`Custom Claims: ${JSON.stringify(verifiedUser.customClaims, null, 2)}`);
    console.log('----------------------------------------');
    console.log('NOTE: The user MUST refresh their Firebase ID token for changes');
    console.log('to take effect. They can sign out and sign back in, or trigger a');
    console.log('token refresh in the application.\n');
  } catch (error) {
    console.error('\n❌ Failed to set admin custom claim:');
    if (error.code === 'auth/user-not-found') {
      console.error(`No user found with email "${email}". Please ensure the user has signed in at least once.`);
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  }
}

setAdminRole();
