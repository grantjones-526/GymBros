import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../firebase";
import { createWorkout, getTodaysWorkout, updateWorkout, getUser } from "../../firestore";

const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Legs",
  "Arms",
  "Shoulders",
  "Cardio",
];

const STAT_LABELS: { [key: string]: string } = {
  pr: "Personal Record",
  cardio: "Cardio (minutes)",
  stretch: "Stretch (minutes)",
  weight: "Weight (lbs)",
  reps: "Total Reps",
  duration: "Duration (minutes)",
};

export default function LogWorkout() {
  const router = useRouter();
  const user = auth.currentUser;

  const [muscleGroup, setMuscleGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [workoutId, setWorkoutId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingWorkout, setLoadingWorkout] = useState(true);
  const [statPreferences, setStatPreferences] = useState<string[]>([]);
  const [statValues, setStatValues] = useState<{ [key: string]: string }>({});
  const [savingStatId, setSavingStatId] = useState<string | null>(null);

  // Check if today's workout exists on mount
  useEffect(() => {
    const loadTodaysWorkout = async () => {
      try {
        const userId = user?.uid;
        if (!userId) return;

        const todaysWorkout = await getTodaysWorkout(userId);

        if (todaysWorkout) {
          // Found existing workout, populate form
          setWorkoutId(todaysWorkout.id);
          setMuscleGroup(todaysWorkout.muscleGroup || "");
          setIsEditing(true);

          // Load existing stat values
          if (todaysWorkout.stats) {
            setStatValues(todaysWorkout.stats);
          }
        }
      } catch (error) {
        console.error("Error loading today's workout:", error);
        // Don't show error to user, just let them create new
      } finally {
        setLoadingWorkout(false);
      }
    };

    loadTodaysWorkout();
  }, [user]);

  // Load user's stat preferences
  useEffect(() => {
    const loadStatPreferences = async () => {
      try {
        const userId = user?.uid;
        if (!userId) return;

        const userData = await getUser(userId);
        if (userData?.statPreferences) {
          setStatPreferences(userData.statPreferences);
        }
      } catch (error) {
        console.error("Error loading stat preferences:", error);
      }
    };

    loadStatPreferences();
  }, [user]);

  const handleSaveStat = async (statId: string) => {
    const statValue = statValues[statId];
    if (!statValue || !statValue.trim()) {
      Alert.alert("Value Required", `Please enter a value for ${STAT_LABELS[statId]}`);
      return;
    }

    setSavingStatId(statId);
    try {
      const userId = user?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      // Get or create today's workout
      let todaysWorkout = await getTodaysWorkout(userId);

      if (!todaysWorkout) {
        // Create a basic workout entry for stats
        const workoutRef = await createWorkout(
          userId,
          new Date(),
          0,
          "Stats Only",
          false
        );
        todaysWorkout = { id: workoutRef.id };
        setWorkoutId(workoutRef.id);
      }

      // Save the stat
      const existingStats = todaysWorkout.stats || {};
      await updateWorkout(todaysWorkout.id, {
        stats: { ...existingStats, [statId]: statValue }
      });

      Alert.alert("Success", `${STAT_LABELS[statId]} saved!`);
    } catch (error) {
      console.error("Save stat error:", error);
      Alert.alert("Error", "Failed to save stat. Please try again.");
    } finally {
      setSavingStatId(null);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!muscleGroup) {
      Alert.alert("Muscle Group Required", "Please select a muscle group");
      return;
    }

    setLoading(true);
    try {
      const userId = user?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      if (isEditing && workoutId) {
        // Update existing workout
        await updateWorkout(workoutId, {
          muscleGroup,
          caloriesConsumed: 0,
          completed: true,
        });

        Alert.alert("Success", "Workout updated successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        // Create new workout
        await createWorkout(
          userId,
          new Date(),
          0, // Calories tracked separately
          muscleGroup,
          true // Mark as completed
        );

        Alert.alert("Success", "Workout logged successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      }

      // Reset form
      setMuscleGroup("");
      setWorkoutId(null);
      setIsEditing(false);
    } catch (error) {
      console.error("Workout log error:", error);
      Alert.alert("Error", `Failed to ${isEditing ? 'update' : 'log'} workout. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingWorkout) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 12, fontSize: 16, color: "#666" }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.header}>{isEditing ? "Edit Today's Workout" : "Log Workout"}</Text>
        <Text style={styles.subheader}>
          {isEditing
            ? "Update the muscle group you worked today"
            : "Select which muscle group you worked today"}
        </Text>

        {/* Muscle Group Dropdown */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Muscle Group *</Text>
          <TouchableOpacity
            style={[styles.dropdown, showDropdown && styles.dropdownActive]}
            onPress={() => setShowDropdown(!showDropdown)}
            disabled={loading}
          >
            <Text
              style={[
                styles.dropdownText,
                !muscleGroup && styles.dropdownPlaceholder,
              ]}
            >
              {muscleGroup || "Select muscle group"}
            </Text>
            <Text style={styles.dropdownArrow}>{showDropdown ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {/* Dropdown Options */}
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {MUSCLE_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.dropdownOption,
                    muscleGroup === group && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => {
                    setMuscleGroup(group);
                    setShowDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      muscleGroup === group &&
                        styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? "Update Workout" : "Log Workout"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Individual Stat Sections */}
      {statPreferences.length > 0 && (
        <View style={styles.statsSectionsContainer}>
          <Text style={styles.statsSectionsHeader}>Track Your Stats</Text>
          {statPreferences.map((statId) => (
            <View key={statId} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Ionicons
                  name={
                    statId === 'pr' ? 'trophy-outline' :
                    statId === 'cardio' ? 'heart-outline' :
                    statId === 'stretch' ? 'body-outline' :
                    statId === 'weight' ? 'scale-outline' :
                    statId === 'reps' ? 'repeat-outline' :
                    'time-outline'
                  }
                  size={24}
                  color="#007AFF"
                />
                <Text style={styles.statCardTitle}>{STAT_LABELS[statId]}</Text>
              </View>

              <TextInput
                style={styles.statInput}
                placeholder={`Enter ${STAT_LABELS[statId].toLowerCase()}`}
                value={statValues[statId] || ""}
                onChangeText={(text) =>
                  setStatValues((prev) => ({ ...prev, [statId]: text }))
                }
                keyboardType={statId === 'pr' ? 'default' : 'numeric'}
              />

              <TouchableOpacity
                style={[
                  styles.saveStatButton,
                  savingStatId === statId && styles.disabledButton
                ]}
                onPress={() => handleSaveStat(statId)}
                disabled={savingStatId === statId}
              >
                {savingStatId === statId ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveStatButtonText}>Save {STAT_LABELS[statId]}</Text>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  formContainer: {
    padding: 20,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
    position: "relative",
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownActive: {
    borderColor: "#007AFF",
  },
  dropdownText: {
    fontSize: 16,
    color: "#000",
  },
  dropdownPlaceholder: {
    color: "#999",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#666",
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      android: {
        position: "relative",
      },
      ios: {
        position: "absolute",
        top: 80,
        left: 0,
        right: 0,
      },
    }),
  },
  dropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  dropdownOptionSelected: {
    backgroundColor: "#E6F4FE",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#000",
  },
  dropdownOptionTextSelected: {
    color: "#007AFF",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  submitButton: {
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  cancelButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#666",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  statsSection: {
    marginTop: 8,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  statsSectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statsSectionsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  statsSectionsHeader: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
    marginTop: 8,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginLeft: 12,
  },
  statInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
  },
  saveStatButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  saveStatButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
