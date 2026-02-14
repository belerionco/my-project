import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AppProvider } from './src/context/AppContext';
import DashboardScreen from './src/screens/DashboardScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import StatsScreen from './src/screens/StatsScreen';
import GoalsScreen from './src/screens/GoalsScreen';
import AddTipModal from './src/components/AddTipModal';
import { colors, fontSize } from './src/utils/theme';

const Tab = createMaterialTopTabNavigator();

function MainTabs() {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDate, setModalDate] = useState<string | undefined>();

  const openModal = (date?: string) => {
    setModalDate(date);
    setModalVisible(true);
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: colors.background,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
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
        <Tab.Screen name="Goals" component={GoalsScreen} />
      </Tab.Navigator>

      <AddTipModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialDate={modalDate}
      />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <MainTabs />
        </SafeAreaView>
      </NavigationContainer>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
