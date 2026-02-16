import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { UserProfile } from '../types';

const ROLES = ['Server', 'Bartender', 'Delivery Driver', 'Barista', 'Expo', 'Food Runner'];
const TIP_METHODS: { key: NonNullable<UserProfile['tipMethod']>; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'both', label: 'Both' },
  { key: 'pooled', label: 'Pooled' },
];

export default function SettingsScreen() {
  const { profile, updateProfile, resetOnboarding } = useApp();

  const [name, setName] = useState(profile.name || '');
  const [workplace, setWorkplace] = useState(profile.workplace || '');
  const [role, setRole] = useState(profile.role || '');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [hourlyWage, setHourlyWage] = useState(profile.hourlyWage?.toString() || '');
  const [tipMethod, setTipMethod] = useState<UserProfile['tipMethod']>(profile.tipMethod);
  const [dailyGoal, setDailyGoal] = useState(profile.dailyGoal?.toString() || '');
  const [monthlyGoal, setMonthlyGoal] = useState(profile.monthlyGoal?.toString() || '');
  const [yearlyGoal, setYearlyGoal] = useState(profile.yearlyGoal?.toString() || '');

  useEffect(() => {
    if (profile.role && !ROLES.includes(profile.role)) {
      setIsCustomRole(true);
      setCustomRole(profile.role);
      setRole('');
    } else {
      setRole(profile.role || '');
    }
  }, []);

  const hasChanges = () => {
    const currentRole = isCustomRole ? customRole.trim() : role;
    const wage = parseFloat(hourlyWage);
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    const yearly = parseFloat(yearlyGoal);

    return (
      name.trim() !== (profile.name || '') ||
      workplace.trim() !== (profile.workplace || '') ||
      currentRole !== (profile.role || '') ||
      (isNaN(wage) ? undefined : wage) !== profile.hourlyWage ||
      tipMethod !== profile.tipMethod ||
      (isNaN(daily) ? undefined : daily) !== profile.dailyGoal ||
      (isNaN(monthly) ? undefined : monthly) !== profile.monthlyGoal ||
      (isNaN(yearly) ? undefined : yearly) !== profile.yearlyGoal
    );
  };

  const handleSave = () => {
    const currentRole = isCustomRole ? customRole.trim() : role;
    const wage = parseFloat(hourlyWage);
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    const yearly = parseFloat(yearlyGoal);

    const updates: Partial<UserProfile> = {
      name: name.trim() || undefined,
      workplace: workplace.trim() || undefined,
      role: currentRole || undefined,
      hourlyWage: !isNaN(wage) && wage > 0 ? wage : undefined,
      tipMethod: tipMethod,
      dailyGoal: !isNaN(daily) && daily > 0 ? daily : undefined,
      monthlyGoal: !isNaN(monthly) && monthly > 0 ? monthly : undefined,
      yearlyGoal: !isNaN(yearly) && yearly > 0 ? yearly : undefined,
    };

    updateProfile(updates);

    if (Platform.OS === 'web') {
      // Simple feedback on web
    } else {
      Alert.alert('Saved', 'Your settings have been updated.');
    }
  };

  const handleRestartOnboarding = () => {
    const doReset = () => resetOnboarding();

    if (Platform.OS === 'web') {
      if (confirm('This will restart the onboarding setup. Your tip data will be kept. Continue?')) {
        doReset();
      }
    } else {
      Alert.alert(
        'Restart Onboarding',
        'This will restart the onboarding setup. Your tip data will be kept.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restart', style: 'destructive', onPress: doReset },
        ]
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Profile</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Workplace</Text>
        <TextInput
          style={styles.input}
          value={workplace}
          onChangeText={setWorkplace}
          placeholder="Restaurant or business name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.chipRow}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, role === r && !isCustomRole && styles.chipActive]}
              onPress={() => { setRole(r); setIsCustomRole(false); }}
            >
              <Text style={[styles.chipText, role === r && !isCustomRole && styles.chipTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, isCustomRole && styles.chipActive]}
            onPress={() => { setIsCustomRole(true); setRole(''); }}
          >
            <Text style={[styles.chipText, isCustomRole && styles.chipTextActive]}>Other...</Text>
          </TouchableOpacity>
        </View>
        {isCustomRole && (
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            value={customRole}
            onChangeText={setCustomRole}
            placeholder="Enter your role"
            placeholderTextColor={colors.textMuted}
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Hourly Wage</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={hourlyWage}
            onChangeText={setHourlyWage}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.suffix}>/hr</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Tip Method</Text>
        <View style={styles.chipRow}>
          {TIP_METHODS.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[styles.chip, tipMethod === m.key && styles.chipActive]}
              onPress={() => setTipMethod(m.key)}
            >
              <Text style={[styles.chipText, tipMethod === m.key && styles.chipTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Goals</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Daily Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={dailyGoal}
            onChangeText={setDailyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Monthly Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={monthlyGoal}
            onChangeText={setMonthlyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Yearly Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={yearlyGoal}
            onChangeText={setYearlyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, !hasChanges() && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges()}
      >
        <Text style={[styles.saveBtnText, !hasChanges() && styles.saveBtnTextDisabled]}>
          Save Changes
        </Text>
      </TouchableOpacity>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Setup</Text>

      <TouchableOpacity style={styles.onboardingBtn} onPress={handleRestartOnboarding}>
        <Text style={styles.onboardingBtnText}>Restart Onboarding</Text>
        <Text style={styles.onboardingBtnSub}>
          Re-run the initial setup wizard. Your tip data will be kept.
        </Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>v2026.02.16 — 3:07 PM</Text>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dollar: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.sm,
  },
  currencyInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  suffix: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.background,
  },
  saveBtnTextDisabled: {
    color: colors.textMuted,
  },
  onboardingBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onboardingBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  onboardingBtnSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
