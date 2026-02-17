import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AppProvider, useApp } from './src/context/AppContext';
import DashboardScreen from './src/screens/DashboardScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import StatsScreen from './src/screens/StatsScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import AddTipModal from './src/components/AddTipModal';
import { colors, fontSize, spacing } from './src/utils/theme';
import { TipEntry } from './src/types';

const Tab = createMaterialTopTabNavigator();

function MainTabs() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>();
  const [editingEntry, setEditingEntry] = useState<TipEntry | undefined>();

  const openModal = (date?: string, entry?: TipEntry) => {
    setModalDate(date);
    setEditingEntry(entry);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalDate(undefined);
    setEditingEntry(undefined);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarScrollEnabled: true,
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          tabBarItemStyle: {
            width: 'auto',
            paddingHorizontal: spacing.md,
          },
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: '700',
            textTransform: 'none',
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIndicatorStyle: {
            backgroundColor: colors.accent,
            height: 3,
            borderRadius: 2,
          },
          swipeEnabled: true,
          lazy: true,
        }}
      >
        <Tab.Screen name="Dashboard">
          {() => <DashboardScreen onAddTip={() => openModal()} />}
        </Tab.Screen>
        <Tab.Screen name="Calendar">
          {() => <CalendarScreen onAddTip={openModal} />}
        </Tab.Screen>
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Earnings" component={EarningsScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>

      <AddTipModal
        visible={modalVisible}
        onClose={closeModal}
        initialDate={modalDate}
        editingEntry={editingEntry}
      />
    </>
  );
}

function AppContent() {
  const { profile, completeOnboarding, resetOnboarding, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profile.onboardingCompleted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={completeOnboarding} />
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <MainTabs />
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
