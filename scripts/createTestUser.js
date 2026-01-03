/**
 * Script to create a test admin user for development
 * Run with: node scripts/createTestUser.js
 */

const { initializeApp } = require('firebase/app');
const {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} = require('firebase/auth');
const {
  getFirestore,
  doc,
  setDoc,
  Timestamp
} = require('firebase/firestore');

// Load environment variables
require('dotenv').config();

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Test user credentials
const TEST_USER = {
  email: 'admin@gymbros.test',
  password: 'Admin123!',
  name: 'Admin User',
  profilePicURL: ''
};

async function createTestUser() {
  console.log('🚀 Starting test user creation...\n');

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    console.log('✓ Firebase initialized');

    // Try to create the user
    let userCredential;
    let userId;

    try {
      console.log(`\n📝 Creating user: ${TEST_USER.email}...`);
      userCredential = await createUserWithEmailAndPassword(
        auth,
        TEST_USER.email,
        TEST_USER.password
      );
      userId = userCredential.user.uid;
      console.log(`✓ User created with UID: ${userId}`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  User already exists, signing in...`);
        userCredential = await signInWithEmailAndPassword(
          auth,
          TEST_USER.email,
          TEST_USER.password
        );
        userId = userCredential.user.uid;
        console.log(`✓ Signed in with UID: ${userId}`);
      } else {
        throw error;
      }
    }

    // Update Firebase Auth profile
    console.log('\n📝 Updating Auth profile...');
    await updateProfile(userCredential.user, {
      displayName: TEST_USER.name
    });
    console.log('✓ Auth profile updated');

    // Create Firestore user document
    console.log('\n📝 Creating Firestore user document...');
    await setDoc(doc(db, 'users', userId), {
      userID: userId,
      name: TEST_USER.name,
      friends: [],
      profilePicURL: TEST_USER.profilePicURL,
      createdAt: Timestamp.now(),
      isAdmin: true, // Mark as admin for testing
      isTestUser: true // Mark as test user
    });
    console.log('✓ Firestore document created');

    console.log('\n✅ Test user setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:    ${TEST_USER.email}`);
    console.log(`Password: ${TEST_USER.password}`);
    console.log(`Name:     ${TEST_USER.name}`);
    console.log(`UID:      ${userId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 You can now log in with these credentials in your app!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating test user:');
    console.error(`Code: ${error.code}`);
    console.error(`Message: ${error.message}`);
    process.exit(1);
  }
}

// Run the script
createTestUser();
