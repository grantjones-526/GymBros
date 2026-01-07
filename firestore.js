import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from './firebase';

// ==================== USERS COLLECTION ====================

/**
 * Generate a unique 4-digit friend code
 * @returns {Promise<string>} 4-digit code
 */
export const generateUniqueFriendCode = async () => {
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    // Generate random 4-digit number (1000-9999)
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // Check if code already exists
    const q = query(collection(db, 'users'), where('friendCode', '==', code));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return code;
    }
  }

  throw new Error('Unable to generate unique friend code');
};

/**
 * Create a new user document
 * @param {string} userId - User ID (typically from Firebase Auth)
 * @param {string} name - User's name
 * @param {string} profilePicURL - URL to profile picture
 * @param {string} friendCode - 4-digit friend code
 * @returns {Promise} void
 */
export const createUser = async (userId, name, profilePicURL = '', friendCode) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      userID: userId,
      name,
      friends: [],
      profilePicURL,
      friendCode,
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
 * Search for a user by name and friend code
 * @param {string} name - User's name
 * @param {string} friendCode - 4-digit friend code
 * @returns {Promise} User data or null
 */
export const searchUserByNameAndCode = async (name, friendCode) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('name', '==', name),
      where('friendCode', '==', friendCode)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    return {
      id: userDoc.id,
      ...userDoc.data()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Send a friend request
 * @param {string} fromUserId - User sending the request
 * @param {string} toUserId - User receiving the request
 * @returns {Promise} Friend request document reference
 */
export const sendFriendRequest = async (fromUserId, toUserId) => {
  try {
    // Check if request already exists
    const q = query(
      collection(db, 'friendRequests'),
      where('fromUserID', '==', fromUserId),
      where('toUserID', '==', toUserId),
      where('status', '==', 'pending')
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error('Friend request already sent');
    }

    // Check if they're already friends
    const fromUser = await getUser(fromUserId);
    if (fromUser.friends && fromUser.friends.includes(toUserId)) {
      throw new Error('Already friends');
    }

    // Create friend request
    const requestRef = await addDoc(collection(db, 'friendRequests'), {
      fromUserID: fromUserId,
      toUserID: toUserId,
      status: 'pending',
      createdAt: Timestamp.now()
    });

    return requestRef;
  } catch (error) {
    throw error;
  }
};

/**
 * Accept a friend request
 * @param {string} requestId - Friend request ID
 * @returns {Promise} void
 */
export const acceptFriendRequest = async (requestId) => {
  try {
    const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();

    // Add both users to each other's friends arrays
    await addFriend(requestData.fromUserID, requestData.toUserID);
    await addFriend(requestData.toUserID, requestData.fromUserID);

    // Update request status
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'accepted'
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Reject a friend request
 * @param {string} requestId - Friend request ID
 * @returns {Promise} void
 */
export const rejectFriendRequest = async (requestId) => {
  try {
    await updateDoc(doc(db, 'friendRequests', requestId), {
      status: 'rejected'
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
 * Get today's workout for a user
 * @param {string} userId - User ID
 * @returns {Promise} Today's workout object or null
 */
export const getTodaysWorkout = async (userId) => {
  try {
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Simplified query to avoid composite index requirement
    const q = query(
      collection(db, 'workouts'),
      where('userID', '==', userId),
      where('date', '>=', startOfDay)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    // Filter for today and get most recent
    const todaysWorkouts = querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(workout => {
        const workoutDate = workout.date.toDate();
        const endDate = endOfDay.toDate();
        return workoutDate <= endDate;
      })
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());

    return todaysWorkouts.length > 0 ? todaysWorkouts[0] : null;
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

// ==================== CALORIE ENTRIES COLLECTION ====================

/**
 * Create a calorie entry
 * @param {string} userId - User ID
 * @param {Date} date - Entry date
 * @param {number} amount - Calories consumed
 * @param {string} description - Meal description (optional)
 * @param {object} macros - Optional macros object with protein, carbs, fat in grams
 * @returns {Promise} Document reference
 */
export const createCalorieEntry = async (userId, date, amount, description = '', macros = null) => {
  try {
    // Normalize date to start of day
    const entryDate = new Date(date);
    entryDate.setHours(0, 0, 0, 0);

    const entryData = {
      userID: userId,
      date: Timestamp.fromDate(entryDate),
      amount,
      description,
      createdAt: Timestamp.now()
    };

    // Only add macro fields if they exist and are valid numbers
    if (macros) {
      if (macros.protein != null && macros.protein >= 0) {
        entryData.protein = macros.protein;
      }
      if (macros.carbs != null && macros.carbs >= 0) {
        entryData.carbs = macros.carbs;
      }
      if (macros.fat != null && macros.fat >= 0) {
        entryData.fat = macros.fat;
      }
    }

    const entryRef = await addDoc(collection(db, 'calorieEntries'), entryData);
    return entryRef;
  } catch (error) {
    throw error;
  }
};

/**
 * Get today's calorie entries for a user
 * @param {string} userId - User ID
 * @returns {Promise} Array of calorie entry objects
 */
export const getTodaysCalorieEntries = async (userId) => {
  try {
    const { startOfDay, endOfDay } = getTodayDateRange();

    const q = query(
      collection(db, 'calorieEntries'),
      where('userID', '==', userId),
      where('date', '>=', startOfDay)
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(entry => {
        const entryDate = entry.date.toDate();
        return entryDate <= endOfDay.toDate();
      })
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a calorie entry
 * @param {string} entryId - Entry document ID
 * @returns {Promise} void
 */
export const deleteCalorieEntry = async (entryId) => {
  try {
    await deleteDoc(doc(db, 'calorieEntries', entryId));
  } catch (error) {
    throw error;
  }
};

/**
 * Get daily calories for multiple users (for feed)
 * @param {Array<string>} userIds - Array of user IDs
 * @returns {Promise} Object mapping userID to total calories
 */
export const getDailyCaloriesForUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  try {
    const { startOfDay, endOfDay } = getTodayDateRange();

    // Batch by 30 (Firestore 'in' limit)
    const batchSize = 30;
    const allEntries = [];

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      const q = query(
        collection(db, 'calorieEntries'),
        where('userID', 'in', batch),
        where('date', '>=', startOfDay)
      );

      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs
        .map(doc => doc.data())
        .filter(entry => entry.date.toDate() <= endOfDay.toDate());

      allEntries.push(...entries);
    }

    // Aggregate by user
    const caloriesByUser = {};
    allEntries.forEach(entry => {
      if (!caloriesByUser[entry.userID]) {
        caloriesByUser[entry.userID] = 0;
      }
      caloriesByUser[entry.userID] += entry.amount || 0;
    });

    return caloriesByUser;
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

/**
 * Subscribe to real-time updates for pending friend requests for a user
 * @param {string} userId - User ID
 * @param {function} callback - Callback receiving array of pending request objects
 * @param {function} errorCallback - Callback for errors
 * @returns {function} Unsubscribe function
 */
export const subscribeToPendingFriendRequests = (userId, callback, errorCallback) => {
  try {
    const q = query(
      collection(db, 'friendRequests'),
      where('toUserID', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const requests = [];

        for (const requestDoc of querySnapshot.docs) {
          const requestData = requestDoc.data();

          // Fetch the sender's user data
          const fromUser = await getUser(requestData.fromUserID);

          requests.push({
            id: requestDoc.id,
            fromUserID: requestData.fromUserID,
            fromUser: fromUser,
            createdAt: requestData.createdAt
          });
        }

        callback(requests);
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
