import { Typography } from '@/constants/Typography';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function WriteEntryScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryType, setEntryType] = useState<'Private' | 'Friend' | 'Public'>('Private');

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving entry:', { title, content, entryType });
    router.back();
  };

  const renderTypeButton = (type: 'Private' | 'Friend' | 'Public') => (
    <TouchableOpacity
      key={type}
      style={[
        styles.typeButton,
        entryType === type && styles.activeTypeButton,
      ]}
      onPress={() => setEntryType(type)}
    >
      <Text
        style={[
          styles.typeButtonText,
          entryType === type ? styles.activeTypeButtonText : styles.inactiveTypeButtonText,
        ]}
      >
        {type}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write Entry</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Entry Type Selection */}
        <View style={styles.typeSection}>
          <Text style={styles.sectionTitle}>Entry Type</Text>
          <View style={styles.typeRow}>
            {(['Private', 'Friend', 'Public'] as const).map(renderTypeButton)}
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Enter entry title..."
            value={title}
            onChangeText={setTitle}
            multiline={false}
          />
        </View>

        {/* Content Input */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Content</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Start writing your thoughts..."
            value={content}
            onChangeText={setContent}
            multiline={true}
            textAlignVertical="top"
          />
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  cancelButton: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.base,
    color: '#637D87',
  },
  headerTitle: {
    fontFamily: Typography.fonts.bold,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: '#121417',
  },
  saveButton: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.sizes.base,
    color: '#121417',
  },
  typeSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semiBold,
    color: '#121417',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    backgroundColor: '#F8FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E8EB',
  },
  activeTypeButton: {
    backgroundColor: '#121417',
    borderColor: '#121417',
  },
  typeButtonText: {
    fontFamily: Typography.fonts.medium,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  inactiveTypeButtonText: {
    color: '#637D87',
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  inputLabel: {
    fontFamily: Typography.fonts.semiBold,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semiBold,
    color: '#121417',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.base,
    color: '#121417',
  },
  contentInput: {
    backgroundColor: '#F8FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E8EB',
    fontFamily: Typography.fonts.regular,
    fontSize: Typography.sizes.base,
    color: '#121417',
    minHeight: 200,
  },
}); 