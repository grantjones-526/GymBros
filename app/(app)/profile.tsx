import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../../firebase";
import { getUser, getUserWorkouts } from "../../firestore";

export default function Profile() {
  const router = useRouter();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStats, setSelectedStats] = useState<string[]>([]);

  // Available stat options
  const availableStats = [
    { id: 'pr', label: 'Personal Records (PR)', icon: 'trophy-outline' },
    { id: 'cardio', label: 'Cardio Goals', icon: 'heart-outline' },
    { id: 'stretch', label: 'Stretch Goals', icon: 'body-outline' },
    { id: 'weight', label: 'Weight Tracking', icon: 'scale-outline' },
    { id: 'reps', label: 'Reps & Sets', icon: 'repeat-outline' },
    { id: 'duration', label: 'Workout Duration', icon: 'time-outline' },
  ];

  // Load current user data
  useEffect(() => {
    const loadCurrentUser = async () => {
      const userId = user?.uid;
      if (!userId) return;

      try {
        const userData = await getUser(userId);
        setCurrentUser(userData);
        // Load user's stat preferences
        if (userData?.statPreferences) {
          setSelectedStats(userData.statPreferences);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [user]);

  // Load user's workouts
  useEffect(() => {
    const loadWorkouts = async () => {
      const userId = user?.uid;
      if (!userId) return;

      try {
        const workoutData = await getUserWorkouts(userId);
        setWorkouts(workoutData);
      } catch (error) {
        console.error("Error loading workouts:", error);
      }
    };

    loadWorkouts();
  }, [user]);

  // Generate calendar data for current month
  const generateCalendarData = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // Get user signup date
    const signupDate = currentUser?.createdAt?.toDate
      ? currentUser.createdAt.toDate()
      : new Date(0); // Default to epoch if no signup date

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Create workout date map
    const workoutDates = new Set();
    workouts.forEach((workout) => {
      const workoutDate = workout.date?.toDate ? workout.date.toDate() : new Date(workout.date);
      if (workoutDate.getMonth() === month && workoutDate.getFullYear() === year) {
        workoutDates.add(workoutDate.getDate());
      }
    });

    // Build calendar days
    const calendarDays = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push({ day: null, status: 'empty' });
    }

    // Add actual days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today && date.toDateString() !== today.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const isFuture = date > today;
      const isBeforeSignup = date < signupDate;

      let status = 'grey';
      if (workoutDates.has(day)) {
        status = 'green';
      } else if (isBeforeSignup) {
        // Days before user signed up should be grey, not red
        status = 'grey';
      } else if (isPast) {
        status = 'red';
      } else if (isToday) {
        status = workoutDates.has(day) ? 'green' : 'grey';
      } else if (isFuture) {
        status = 'grey';
      }

      calendarDays.push({ day, status, isToday });
    }

    return calendarDays;
  };

  const calendarDays = generateCalendarData();
  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Toggle stat selection
  const toggleStat = (statId: string) => {
    setSelectedStats((prev) => {
      if (prev.includes(statId)) {
        return prev.filter((id) => id !== statId);
      } else {
        return [...prev, statId];
      }
    });
  };

  // Save stat preferences
  const saveStatPreferences = async () => {
    if (!user?.uid) return;

    try {
      const { updateUser } = await import("../../firestore");
      await updateUser(user.uid, { statPreferences: selectedStats });
      setShowStatsModal(false);
    } catch (error) {
      console.error("Error saving stat preferences:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: currentUser?.profilePicURL || user?.photoURL || "",
            }}
            style={styles.profileImage}
          />
        </View>

        {/* Name */}
        <View style={styles.nameSection}>
          <Text style={styles.name}>
            {currentUser?.name || user?.displayName || "Gym Bro"}
          </Text>
          {currentUser?.friendCode && (
            <Text style={styles.friendCode}>#{currentUser.friendCode}</Text>
          )}
        </View>

        {/* Workout Calendar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{monthName}</Text>
          <View style={styles.calendarCard}>
            {/* Day Labels */}
            <View style={styles.calendarHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <Text key={index} style={styles.dayLabel}>
                  {day}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {calendarDays.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.calendarDay,
                    item.status === 'empty' && styles.emptyDay,
                    item.status === 'green' && styles.greenDay,
                    item.status === 'red' && styles.redDay,
                    item.status === 'grey' && styles.greyDay,
                    item.isToday && styles.todayBorder,
                  ]}
                >
                  {item.day !== null && (
                    <Text
                      style={[
                        styles.dayNumber,
                        (item.status === 'green' || item.status === 'red') &&
                          styles.dayNumberLight,
                      ]}
                    >
                      {item.day}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stats</Text>
          {selectedStats.length === 0 ? (
            <View style={styles.setupCard}>
              <Ionicons name="bar-chart-outline" size={48} color="#007AFF" />
              <Text style={styles.setupText}>
                Customize your workout stats
              </Text>
              <TouchableOpacity
                style={styles.setupButton}
                onPress={() => setShowStatsModal(true)}
              >
                <Text style={styles.setupButtonText}>Set Up Stats</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.statsCard}>
              <Text style={styles.comingSoonText}>Stats Coming Soon</Text>
              <Text style={styles.comingSoonSubtext}>
                Your selected stats will appear here
              </Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setShowStatsModal(true)}
              >
                <Ionicons name="settings-outline" size={20} color="#007AFF" />
                <Text style={styles.editButtonText}>Edit Stats</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Additional Info Section (Coming Soon) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.comingSoonCard}>
            <Ionicons name="person-outline" size={48} color="#999" />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>
              Bio, goals, and personal information
            </Text>
          </View>
        </View>

        {/* Settings Section (Coming Soon) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.comingSoonCard}>
            <Ionicons name="settings-outline" size={48} color="#999" />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
            <Text style={styles.comingSoonSubtext}>
              Preferences and account settings
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Stats Preferences Modal */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>What You Care About</Text>
              <TouchableOpacity
                onPress={() => setShowStatsModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Stat Options */}
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSubtext}>
                Select the stats you want to track during your workouts
              </Text>
              {availableStats.map((stat) => (
                <TouchableOpacity
                  key={stat.id}
                  style={[
                    styles.statOption,
                    selectedStats.includes(stat.id) && styles.statOptionSelected,
                  ]}
                  onPress={() => toggleStat(stat.id)}
                >
                  <View style={styles.statOptionLeft}>
                    <Ionicons
                      name={stat.icon as any}
                      size={24}
                      color={selectedStats.includes(stat.id) ? "#007AFF" : "#666"}
                    />
                    <Text
                      style={[
                        styles.statOptionLabel,
                        selectedStats.includes(stat.id) && styles.statOptionLabelSelected,
                      ]}
                    >
                      {stat.label}
                    </Text>
                  </View>
                  {selectedStats.includes(stat.id) && (
                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 20 }]}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  selectedStats.length === 0 && styles.saveButtonDisabled,
                ]}
                onPress={saveStatPreferences}
                disabled={selectedStats.length === 0}
              >
                <Text style={styles.saveButtonText}>
                  Save ({selectedStats.length} selected)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e0e0e0",
  },
  nameSection: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  friendCode: {
    fontSize: 18,
    color: "#999",
    fontWeight: "600",
  },
  section: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  comingSoonCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comingSoonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    width: 40,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 4,
  },
  emptyDay: {
    backgroundColor: "transparent",
  },
  greenDay: {
    backgroundColor: "#34C759",
  },
  redDay: {
    backgroundColor: "#FF3B30",
  },
  greyDay: {
    backgroundColor: "#e0e0e0",
  },
  todayBorder: {
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  dayNumberLight: {
    color: "#fff",
  },
  setupCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  setupText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  setupButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  setupButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalBodyContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  statOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  statOptionSelected: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f7ff",
  },
  statOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statOptionLabel: {
    fontSize: 16,
    color: "#000",
    marginLeft: 12,
  },
  statOptionLabelSelected: {
    fontWeight: "600",
    color: "#007AFF",
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: "#ccc",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
