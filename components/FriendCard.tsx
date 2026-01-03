import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface FriendCardProps {
  name: string;
  profilePicURL: string;
  workedOutToday: boolean;
  totalCalories: number;
  muscleGroups: string[];
}

const FriendCard = React.memo(({
  name,
  profilePicURL,
  workedOutToday,
  totalCalories,
  muscleGroups
}: FriendCardProps) => {
  return (
    <View style={[
      styles.card,
      workedOutToday ? styles.cardActive : styles.cardInactive
    ]}>
      {/* Profile Picture */}
      <View style={styles.imageContainer}>
        {profilePicURL ? (
          <Image
            source={{ uri: profilePicURL }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>💪</Text>
          </View>
        )}
      </View>

      {/* Friend Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{name}</Text>

        {workedOutToday ? (
          <>
            <Text style={styles.caloriesText}>
              {totalCalories} calories
            </Text>
            {muscleGroups.length > 0 && (
              <Text style={styles.muscleGroupsText}>
                {muscleGroups.join(', ')}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.inactiveText}>No workout today</Text>
        )}
      </View>

      {/* Status Indicator */}
      <View style={[
        styles.statusIndicator,
        workedOutToday ? styles.statusActive : styles.statusInactive
      ]} />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  return (
    prevProps.workedOutToday === nextProps.workedOutToday &&
    prevProps.totalCalories === nextProps.totalCalories &&
    prevProps.muscleGroups.join() === nextProps.muscleGroups.join() &&
    prevProps.name === nextProps.name &&
    prevProps.profilePicURL === nextProps.profilePicURL
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 3,
  },
  cardActive: {
    borderColor: '#34C759', // Green for worked out
  },
  cardInactive: {
    borderColor: '#FF3B30', // Red for didn't work out
  },
  imageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  placeholderText: {
    fontSize: 30,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#34C759',
    marginBottom: 2,
  },
  muscleGroupsText: {
    fontSize: 14,
    color: '#666',
  },
  inactiveText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#34C759',
  },
  statusInactive: {
    backgroundColor: '#FF3B30',
  },
});

export default FriendCard;
