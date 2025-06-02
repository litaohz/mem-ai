import { Typography } from '@/constants/Typography';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type EntryType = 'Private' | 'Friend' | 'Public';

export default function MyDiaryScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<EntryType>('Private');

  const handleWriteEntry = () => {
    router.push('/write-entry');
  };

  const renderTabButton = (tab: EntryType) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        selectedTab === tab && styles.activeTabButton,
      ]}
      onPress={() => setSelectedTab(tab)}
    >
      <Text
        style={[
          styles.tabText,
          selectedTab === tab ? styles.activeTabText : styles.inactiveTabText,
        ]}
      >
        {tab} Entries
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Image
        source={require('@/assets/images/empty-diary-bg.png')}
        style={styles.emptyImage}
        resizeMode="cover"
      />
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No private entries yet</Text>
        <Text style={styles.emptyDescription}>
          Write your first entry to record your daily life and thoughts.
        </Text>
      </View>
      <TouchableOpacity style={styles.writeButton} onPress={handleWriteEntry}>
        <Text style={styles.writeButtonText}>Write Entry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.backButton}>
              {/* You can add a back icon here if needed */}
            </View>
          </View>
          <Text style={styles.headerTitle}>My Diary</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <View style={styles.tabRow}>
            {(['Private', 'Friend', 'Public'] as EntryType[]).map(renderTabButton)}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderEmptyState()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: '#121417',
    textAlign: 'center',
  },
  headerRight: {
    width: 48,
  },
  tabContainer: {
    paddingBottom: 12,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#DBE3E5',
  },
  tabButton: {
    paddingVertical: 16,
    paddingBottom: 13,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#E5E8EB',
  },
  tabText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    lineHeight: 21,
  },
  activeTabText: {
    color: '#121417',
  },
  inactiveTabText: {
    color: '#637D87',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  emptyState: {
    alignItems: 'center',
    gap: 24,
  },
  emptyImage: {
    width: '100%',
    height: 201,
    borderRadius: 12,
  },
  emptyContent: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: '#121417',
    textAlign: 'center',
    lineHeight: 23,
  },
  emptyDescription: {
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.regular,
    color: '#121417',
    textAlign: 'center',
    lineHeight: 21,
  },
  writeButton: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeButtonText: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: '#121417',
    textAlign: 'center',
    lineHeight: 21,
  },
});
