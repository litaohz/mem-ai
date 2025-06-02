import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function WorldScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>World</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchPlaceholder}>Search public entries...</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Explore Public Diaries</Text>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recommended for you</Text>
              <Text style={styles.cardDescription}>
                Discover entries that match your interests
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trending Topics</Text>
              <Text style={styles.cardDescription}>
                See what's popular in the community
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Entries</Text>
              <Text style={styles.cardDescription}>
                Browse the latest public diary entries
              </Text>
            </View>

            <TouchableOpacity style={styles.exploreButton}>
              <Text style={styles.exploreButtonText}>Start Exploring</Text>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  searchPlaceholder: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#637D87',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#121417',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  cardTitle: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#121417',
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    fontWeight: '400',
    color: '#637D87',
    lineHeight: 20,
  },
  exploreButton: {
    backgroundColor: '#121417',
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  exploreButtonText: {
    fontFamily: 'PlusJakartaSans-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
}); 