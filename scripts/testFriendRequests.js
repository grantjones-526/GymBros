/**
 * Script to test friend request functionality
 * Run with: node scripts/testFriendRequests.js
 *
 * Usage:
 *   node scripts/testFriendRequests.js view <userId>         - View pending requests for a user
 *   node scripts/testFriendRequests.js accept <requestId>    - Accept a friend request
 *   node scripts/testFriendRequests.js reject <requestId>    - Reject a friend request
 *   node scripts/testFriendRequests.js send <fromId> <toId>  - Send a friend request
 *   node scripts/testFriendRequests.js users                 - List all users
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  Timestamp,
  arrayUnion
} = require('firebase/firestore');

require('dotenv').config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper function to get user info
async function getUserInfo(userId) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return userDoc.data();
  }
  return null;
}

// View all pending friend requests for a user
async function viewPendingRequests(userId) {
  console.log(`\n🔍 Searching for pending requests for user: ${userId}\n`);

  try {
    // Get user info
    const userInfo = await getUserInfo(userId);
    if (!userInfo) {
      console.log('❌ User not found');
      return;
    }

    console.log(`User: ${userInfo.name} (${userInfo.friendCode})\n`);

    // Query incoming requests
    const incomingQuery = query(
      collection(db, 'friendRequests'),
      where('toUserID', '==', userId),
      where('status', '==', 'pending')
    );

    const incomingSnapshot = await getDocs(incomingQuery);

    if (incomingSnapshot.empty) {
      console.log('📭 No pending incoming friend requests');
    } else {
      console.log('📬 INCOMING REQUESTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const requestDoc of incomingSnapshot.docs) {
        const request = requestDoc.data();
        const fromUser = await getUserInfo(request.fromUserID);

        console.log(`Request ID: ${requestDoc.id}`);
        console.log(`From: ${fromUser?.name || 'Unknown'} (${fromUser?.friendCode || 'N/A'})`);
        console.log(`User ID: ${request.fromUserID}`);
        console.log(`Created: ${request.createdAt.toDate().toLocaleString()}`);
        console.log('---');
      }
    }

    // Query outgoing requests
    const outgoingQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserID', '==', userId),
      where('status', '==', 'pending')
    );

    const outgoingSnapshot = await getDocs(outgoingQuery);

    if (!outgoingSnapshot.empty) {
      console.log('\n📤 OUTGOING REQUESTS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      for (const requestDoc of outgoingSnapshot.docs) {
        const request = requestDoc.data();
        const toUser = await getUserInfo(request.toUserID);

        console.log(`Request ID: ${requestDoc.id}`);
        console.log(`To: ${toUser?.name || 'Unknown'} (${toUser?.friendCode || 'N/A'})`);
        console.log(`User ID: ${request.toUserID}`);
        console.log(`Created: ${request.createdAt.toDate().toLocaleString()}`);
        console.log('---');
      }
    }

    console.log('\n💡 To accept a request, run:');
    console.log('   node scripts/testFriendRequests.js accept <requestId>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Accept a friend request
async function acceptFriendRequest(requestId) {
  console.log(`\n✅ Accepting friend request: ${requestId}\n`);

  try {
    const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));

    if (!requestDoc.exists()) {
      console.log('❌ Friend request not found');
      return;
    }

    const requestData = requestDoc.data();

    if (requestData.status !== 'pending') {
      console.log(`⚠️  Request status is already: ${requestData.status}`);
      return;
    }

    // Get user info
    const fromUser = await getUserInfo(requestData.fromUserID);
    const toUser = await getUserInfo(requestData.toUserID);

    console.log(`From: ${fromUser?.name} → To: ${toUser?.name}`);

    // Add both users to each other's friends arrays
    await updateDoc(doc(db, 'users', requestData.fromUserID), {
      friends: arrayUnion(requestData.toUserID)
    });

    await updateDoc(doc(db, 'users', requestData.toUserID), {
      friends: arrayUnion(requestData.fromUserID)
    });

    // Update request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'accepted'
    });

    console.log('\n✅ Friend request accepted!');
    console.log(`${fromUser?.name} and ${toUser?.name} are now friends! 🎉\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Reject a friend request
async function rejectFriendRequest(requestId) {
  console.log(`\n❌ Rejecting friend request: ${requestId}\n`);

  try {
    const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));

    if (!requestDoc.exists()) {
      console.log('❌ Friend request not found');
      return;
    }

    const requestData = requestDoc.data();

    if (requestData.status !== 'pending') {
      console.log(`⚠️  Request status is already: ${requestData.status}`);
      return;
    }

    // Get user info
    const fromUser = await getUserInfo(requestData.fromUserID);
    const toUser = await getUserInfo(requestData.toUserID);

    console.log(`From: ${fromUser?.name} → To: ${toUser?.name}`);

    // Update request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'rejected'
    });

    console.log('\n✅ Friend request rejected\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Send a friend request
async function sendFriendRequest(fromUserId, toUserId) {
  console.log(`\n📤 Sending friend request...\n`);

  try {
    const fromUser = await getUserInfo(fromUserId);
    const toUser = await getUserInfo(toUserId);

    if (!fromUser) {
      console.log('❌ From user not found');
      return;
    }

    if (!toUser) {
      console.log('❌ To user not found');
      return;
    }

    console.log(`From: ${fromUser.name} (${fromUser.friendCode})`);
    console.log(`To: ${toUser.name} (${toUser.friendCode})\n`);

    // Check if request already exists
    const q = query(
      collection(db, 'friendRequests'),
      where('fromUserID', '==', fromUserId),
      where('toUserID', '==', toUserId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log('⚠️  Friend request already exists');
      return;
    }

    // Check if they're already friends
    if (fromUser.friends && fromUser.friends.includes(toUserId)) {
      console.log('⚠️  Already friends');
      return;
    }

    // Create friend request
    const requestRef = await addDoc(collection(db, 'friendRequests'), {
      fromUserID: fromUserId,
      toUserID: toUserId,
      status: 'pending',
      createdAt: Timestamp.now()
    });

    console.log('✅ Friend request sent!');
    console.log(`Request ID: ${requestRef.id}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// List all users
async function listUsers() {
  console.log('\n👥 All Users:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));

    if (usersSnapshot.empty) {
      console.log('No users found');
      return;
    }

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      console.log(`User ID: ${userDoc.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Friend Code: ${user.friendCode || 'N/A'}`);
      console.log(`Friends: ${user.friends?.length || 0}`);
      console.log('---');
    }

    console.log('\n💡 To view requests for a user, run:');
    console.log('   node scripts/testFriendRequests.js view <userId>\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('\n📖 Friend Request Test Script\n');
    console.log('Usage:');
    console.log('  node scripts/testFriendRequests.js view <userId>         - View pending requests');
    console.log('  node scripts/testFriendRequests.js accept <requestId>    - Accept a request');
    console.log('  node scripts/testFriendRequests.js reject <requestId>    - Reject a request');
    console.log('  node scripts/testFriendRequests.js send <fromId> <toId>  - Send a request');
    console.log('  node scripts/testFriendRequests.js users                 - List all users\n');
    process.exit(0);
  }

  switch (command) {
    case 'view':
      if (!args[1]) {
        console.log('❌ Please provide a user ID');
        process.exit(1);
      }
      await viewPendingRequests(args[1]);
      break;

    case 'accept':
      if (!args[1]) {
        console.log('❌ Please provide a request ID');
        process.exit(1);
      }
      await acceptFriendRequest(args[1]);
      break;

    case 'reject':
      if (!args[1]) {
        console.log('❌ Please provide a request ID');
        process.exit(1);
      }
      await rejectFriendRequest(args[1]);
      break;

    case 'send':
      if (!args[1] || !args[2]) {
        console.log('❌ Please provide both fromUserId and toUserId');
        process.exit(1);
      }
      await sendFriendRequest(args[1], args[2]);
      break;

    case 'users':
      await listUsers();
      break;

    default:
      console.log(`❌ Unknown command: ${command}`);
      process.exit(1);
  }

  process.exit(0);
}

// Run the script
main();
