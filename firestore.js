import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

// ==================== USERS COLLECTION ====================

/**
 * Create a new user document
 * @param {string} userId - User ID (typically from Firebase Auth)
 * @param {string} name - User's name
 * @param {string} profilePicURL - URL to profile picture
 * @returns {Promise} void
 */
export const createUser = async (userId, name, profilePicURL = '') => {
  try {
    await setDoc(doc(db, 'users', userId), {
      userID: userId,
      name,
      friends: [],
      profilePicURL,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get a user by ID
 * @param {string} userId - User ID
 * @returns {Promise} User data
 */
export const getUser = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {object} updates - Fields to update
 * @returns {Promise} void
 */
export const updateUser = async (userId, updates) => {
  try {
    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    throw error;
  }
};

/**
 * Add a friend to user's friends array
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise} void
 */
export const addFriend = async (userId, friendId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      friends: arrayUnion(friendId)
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Remove a friend from user's friends array
 * @param {string} userId - User ID
 * @param {string} friendId - Friend's user ID
 * @returns {Promise} void
 */
export const removeFriend = async (userId, friendId) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      friends: arrayRemove(friendId)
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Get user's friends list
 * @param {string} userId - User ID
 * @returns {Promise} Array of friend user objects
 */
export const getUserFriends = async (userId) => {
  try {
    const user = await getUser(userId);
    if (!user || !user.friends || user.friends.length === 0) {
      return [];
    }

    const friendsData = await Promise.all(
      user.friends.map(friendId => getUser(friendId))
    );
    return friendsData.filter(friend => friend !== null);
  } catch (error) {
    throw error;
  }
};

// ==================== WORKOUTS COLLECTION ====================

/**
 * Create a new workout
 * @param {string} userId - User ID
 * @param {Date} date - Workout date
 * @param {number} caloriesConsumed - Calories consumed
 * @param {string} muscleGroup - Muscle group worked
 * @param {boolean} completed - Whether workout is completed
 * @returns {Promise} Workout document reference
 */
export const createWorkout = async (userId, date, caloriesConsumed, muscleGroup, completed = false) => {
  try {
    const workoutRef = await addDoc(collection(db, 'workouts'), {
      userID: userId,
      date: Timestamp.fromDate(date),
      caloriesConsumed,
      muscleGroup,
      completed,
      createdAt: Timestamp.now()
    });
    return workoutRef;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all workouts for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of workout objects
 */
export const getUserWorkouts = async (userId) => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('userID', '==', userId),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Get completed workouts for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of completed workout objects
 */
export const getCompletedWorkouts = async (userId) => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('userID', '==', userId),
      where('completed', '==', true),
      orderBy('date', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Update a workout
 * @param {string} workoutId - Workout document ID
 * @param {object} updates - Fields to update
 * @returns {Promise} void
 */
export const updateWorkout = async (workoutId, updates) => {
  try {
    await updateDoc(doc(db, 'workouts', workoutId), updates);
  } catch (error) {
    throw error;
  }
};

/**
 * Mark a workout as completed
 * @param {string} workoutId - Workout document ID
 * @returns {Promise} void
 */
export const markWorkoutCompleted = async (workoutId) => {
  try {
    await updateDoc(doc(db, 'workouts', workoutId), {
      completed: true
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a workout
 * @param {string} workoutId - Workout document ID
 * @returns {Promise} void
 */
export const deleteWorkout = async (workoutId) => {
  try {
    await deleteDoc(doc(db, 'workouts', workoutId));
  } catch (error) {
    throw error;
  }
};

// ==================== FRIEND REQUESTS COLLECTION ====================

/**
 * Send a friend request
 * @param {string} fromUserId - Sender's user ID
 * @param {string} toUserId - Recipient's user ID
 * @returns {Promise} Friend request document reference
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    // Check if request already exists
    const existingRequest = await getFriendRequest(fromUserId, toUserId);
    if (existingRequest) {
      throw new Error('Friend request already sent');
    }

    const requestRef = await addDoc(collection(db, 'friendRequests'), {
      from: fromUserId,
      to: toUserId,
      status: 'pending',
      createdAt: Timestamp.now()
    });
    return requestRef;
  } catch (error) {
    throw error;
  }
};

/**
 * Get a specific friend request
 * @param {string} fromUserId - Sender's user ID
 * @param {string} toUserId - Recipient's user ID
 * @returns {Promise} Friend request object or null
 */
export const getFriendRequest = async (fromUserId, toUserId) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('from', '==', fromUserId),
      where('to', '==', toUserId)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all pending friend requests for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of friend request objects
 */
export const getPendingFriendRequests = async (userId) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('to', '==', userId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

/**
 * Accept a friend request
 * @param {string} requestId - Friend request document ID
 * @returns {Promise} void
 */
export const acceptFriendRequest = async (requestId) => {
  try {
    // Get the friend request
    const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();
    const { from, to } = requestData;

    // Add each user to the other's friends list
    await addFriend(from, to);
    await addFriend(to, from);

    // Update request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'accepted',
      acceptedAt: Timestamp.now()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Reject a friend request
 * @param {string} requestId - Friend request document ID
 * @returns {Promise} void
 */
export const rejectFriendRequest = async (requestId) => {
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'rejected',
      rejectedAt: Timestamp.now()
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a friend request
 * @param {string} requestId - Friend request document ID
 * @returns {Promise} void
 */
export const deleteFriendRequest = async (requestId) => {
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  } catch (error) {
    throw error;
  }
};

/**
 * Get sent friend requests for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of friend request objects
 */
export const getSentFriendRequests = async (userId) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('from', '==', userId),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    throw error;
  }
};

// ==================== REAL-TIME LISTENERS ====================

/**
 * Get start and end timestamps for today (local timezone)
 * @returns {Object} { startOfDay: Timestamp, endOfDay: Timestamp }
 */
export const getTodayDateRange = () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startOfDay: Timestamp.fromDate(startOfDay),
    endOfDay: Timestamp.fromDate(endOfDay)
  };
};

/**
 * Subscribe to real-time updates for today's workouts for multiple users
 * @param {Array<string>} userIds - Array of user IDs to monitor
 * @param {function} callback - Callback function receiving workouts array
 * @param {function} errorCallback - Callback for errors
 * @returns {function} Unsubscribe function
 */
export const subscribeToDailyWorkouts = (userIds, callback, errorCallback) => {
  if (!userIds || userIds.length === 0) {
    callback([]);
    return () => {}; // Return empty unsubscribe function
  }

  const { startOfDay, endOfDay } = getTodayDateRange();

  try {
    // Firestore 'in' queries support max 30 items
    // If more friends, need to batch queries
    const batchSize = 30;
    const unsubscribers = [];
    const workoutBatches = new Map();

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const batchIndex = i;

      const q = query(
        collection(db, 'workouts'),
        where('userID', 'in', batch),
        where('date', '>=', startOfDay),
        where('date', '<=', endOfDay)
      );

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const workouts = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Store this batch
          workoutBatches.set(batchIndex, workouts);

          // Merge all batches and send to callback
          const allWorkouts = Array.from(workoutBatches.values()).flat();
          callback(allWorkouts);
        },
        (error) => {
          if (errorCallback) errorCallback(error);
        }
      );

      unsubscribers.push(unsubscribe);
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  } catch (error) {
    if (errorCallback) errorCallback(error);
    return () => {};
  }
};

/**
 * Subscribe to real-time updates for user's friends list
 * @param {string} userId - User ID
 * @param {function} callback - Callback receiving array of friend user objects
 * @param {function} errorCallback - Callback for errors
 * @returns {function} Unsubscribe function
 */
export const subscribeToUserFriends = (userId, callback, errorCallback) => {
  try {
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId),
      async (userDoc) => {
        if (!userDoc.exists()) {
          callback([]);
          return;
        }

        const userData = userDoc.data();
        if (!userData.friends || userData.friends.length === 0) {
          callback([]);
          return;
        }

        // Fetch all friend user documents
        // Firestore 'in' queries max 30 items
        const batchSize = 30;
        const allFriends = [];

        for (let i = 0; i < userData.friends.length; i += batchSize) {
          const batch = userData.friends.slice(i, i + batchSize);
          const q = query(
            collection(db, 'users'),
            where('userID', 'in', batch)
          );

          const querySnapshot = await getDocs(q);
          const friends = querySnapshot.docs.map(doc => doc.data());
          allFriends.push(...friends);
        }

        callback(allFriends);
      },
      (error) => {
        if (errorCallback) errorCallback(error);
      }
    );

    return unsubscribe;
  } catch (error) {
    if (errorCallback) errorCallback(error);
    return () => {};
  }
};
