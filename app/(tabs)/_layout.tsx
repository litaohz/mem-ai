import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Typography } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#121417',
        tabBarInactiveTintColor: '#667A82',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#F0F2F5',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 12,
          height: Platform.OS === 'ios' ? 84 : 64,
          ...Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        },
        tabBarLabelStyle: {
          fontFamily: Typography.fonts.medium,
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.medium,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Diary',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reflection"
        options={{
          title: 'Reflection',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="world"
        options={{
          title: 'World',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="earth-outline" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size || 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
