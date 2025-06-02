import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>T</Text>
          </View>
          <Text style={styles.userName}>Thomas Li</Text>
          <Text style={styles.userEmail}>thomas@example.com</Text>
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Diary Statistics</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>24</Text>
                <Text style={styles.statLabel}>Total Entries</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>7</Text>
                <Text style={styles.statLabel}>Days Streak</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entry Types</Text>
            
            <View style={styles.card}>
              <View style={styles.entryTypeRow}>
                <Text style={styles.entryTypeLabel}>Private Entries</Text>
                <Text style={styles.entryTypeCount}>18</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.entryTypeRow}>
                <Text style={styles.entryTypeLabel}>Friend Entries</Text>
                <Text style={styles.entryTypeCount}>4</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.entryTypeRow}>
                <Text style={styles.entryTypeLabel}>Public Entries</Text>
                <Text style={styles.entryTypeCount}>2</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Privacy</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <Text style={styles.settingText}>Export Data</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#121417',
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#121417',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userName: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 20,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 4,
  },
  userEmail: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#637D87',
    marginBottom: 16,
  },
  editButton: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 24,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#121417',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 18,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  statNumber: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 24,
    fontWeight: '700',
    color: '#121417',
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: '#637D87',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    marginBottom: 8,
  },
  entryTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryTypeLabel: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#121417',
  },
  entryTypeCount: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 14,
    fontWeight: '600',
    color: '#637D87',
  },
  settingItem: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    marginBottom: 8,
  },
  settingText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    fontWeight: '500',
    color: '#121417',
  },
}); 