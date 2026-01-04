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
  FlatList,
} from "react-native";
import { auth } from "../../firebase";
import {
  createCalorieEntry,
  getTodaysCalorieEntries,
  deleteCalorieEntry,
} from "../../firestore";

interface CalorieEntry {
  id: string;
  amount: number;
  description: string;
  createdAt: any;
}

export default function LogCalories() {
  const user = auth.currentUser;

  const [entries, setEntries] = useState<CalorieEntry[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingEntries, setLoadingEntries] = useState(true);

  // Load today's entries on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        const userId = user?.uid;
        if (!userId) return;

        const todaysEntries = await getTodaysCalorieEntries(userId);
        setEntries(todaysEntries);
      } catch (error) {
        console.error("Error loading calorie entries:", error);
      } finally {
        setLoadingEntries(false);
      }
    };

    loadEntries();
  }, [user]);

  // Calculate total calories
  const totalCalories = entries.reduce(
    (sum, entry) => sum + (entry.amount || 0),
    0
  );

  // Add entry (meal with description or quick total)
  const handleAddEntry = async (isQuickAdd: boolean) => {
    // Validation
    if (!amount.trim()) {
      Alert.alert("Amount Required", "Please enter calorie amount");
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid positive number");
      return;
    }

    if (!isQuickAdd && !description.trim()) {
      Alert.alert(
        "Description Required",
        "Please enter a description or use Quick Add"
      );
      return;
    }

    setLoading(true);
    try {
      const userId = user?.uid;
      if (!userId) {
        Alert.alert("Error", "You must be logged in");
        return;
      }

      const desc = isQuickAdd ? "" : description.trim();
      await createCalorieEntry(userId, new Date(), amountNum, desc);

      // Reload entries
      const updatedEntries = await getTodaysCalorieEntries(userId);
      setEntries(updatedEntries);

      // Reset form
      setAmount("");
      setDescription("");

      Alert.alert(
        "Success",
        `Added ${amountNum} calories${desc ? ` (${desc})` : ""}`
      );
    } catch (error) {
      console.error("Error adding entry:", error);
      Alert.alert("Error", "Failed to add entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete entry
  const handleDeleteEntry = async (entryId: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCalorieEntry(entryId);

              // Reload entries
              const userId = user?.uid;
              if (userId) {
                const updatedEntries = await getTodaysCalorieEntries(userId);
                setEntries(updatedEntries);
              }
            } catch (error) {
              console.error("Error deleting entry:", error);
              Alert.alert("Error", "Failed to delete entry.");
            }
          },
        },
      ]
    );
  };

  // Render individual entry
  const renderEntry = ({ item }: { item: CalorieEntry }) => (
    <View style={styles.entryItem}>
      <View style={styles.entryInfo}>
        <Text style={styles.entryAmount}>{item.amount} cal</Text>
        {item.description && (
          <Text style={styles.entryDescription}>{item.description}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteEntry(item.id)}
      >
        <Text style={styles.deleteButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  if (loadingEntries) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Log Calories</Text>
        <Text style={styles.subheader}>Track your daily intake</Text>

        {/* Total Display */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total Today</Text>
          <Text style={styles.totalAmount}>
            {totalCalories.toLocaleString()} cal
          </Text>
        </View>

        {/* Entries List */}
        {entries.length > 0 ? (
          <View style={styles.entriesContainer}>
            <Text style={styles.sectionTitle}>Today's Entries</Text>
            <FlatList
              data={entries}
              renderItem={renderEntry}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.entriesList}
            />
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No entries yet today</Text>
          </View>
        )}

        {/* Input Form */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Add Entry</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Calories *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 500"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Breakfast, Lunch, Snack"
              value={description}
              onChangeText={setDescription}
              editable={!loading}
            />
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.mealButton, loading && styles.disabledButton]}
              onPress={() => handleAddEntry(false)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Add Meal Entry</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.quickButton, loading && styles.disabledButton]}
              onPress={() => handleAddEntry(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={[styles.buttonText, styles.quickButtonText]}>
                  Quick Add Total
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: 20,
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
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  totalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#34C759",
  },
  entriesContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  entriesList: {
    gap: 8,
  },
  entryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  entryInfo: {
    flex: 1,
  },
  entryAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  entryDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    fontStyle: "italic",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonRow: {
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  mealButton: {
    backgroundColor: "#007AFF",
  },
  quickButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  quickButtonText: {
    color: "#007AFF",
  },
});
