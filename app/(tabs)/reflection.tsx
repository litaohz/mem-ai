import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ReflectionScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Self-Reflection</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AI Analysis</Text>
            
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Emotion Analysis</Text>
              <Text style={styles.cardDescription}>
                Track your emotional patterns over time
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Theme Identification</Text>
              <Text style={styles.cardDescription}>
                Discover recurring themes in your entries
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Trend Prediction</Text>
              <Text style={styles.cardDescription}>
                Get insights into your personal growth trends
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Writing Suggestions</Text>
              <Text style={styles.cardDescription}>
                Receive personalized prompts to enhance your journaling
              </Text>
            </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
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
}); 