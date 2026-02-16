import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Animated,
  Dimensions,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { UserProfile, SavingsGoal } from '../types';

// Simple unique ID generator (no crypto dependency)
const generateId = (): string =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROLES = ['Server', 'Bartender', 'Delivery Driver', 'Barista', 'Expo', 'Food Runner'];
const TIP_METHODS = [
  { key: 'cash' as const, label: 'Cash' },
  { key: 'card' as const, label: 'Card' },
  { key: 'both' as const, label: 'Both' },
  { key: 'pooled' as const, label: 'Pooled Tips' },
];

const TOTAL_STEPS = 6;

interface Props {
  onComplete: (profile: Partial<UserProfile>) => void;
}

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Step 1: Name
  const [name, setName] = useState('');
  // Step 2: Workplace
  const [workplace, setWorkplace] = useState('');
  // Step 3: Role
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [showCustomRole, setShowCustomRole] = useState(false);
  // Step 4: Hourly wage
  const [hourlyWage, setHourlyWage] = useState('');
  // Step 5: Tip method
  const [tipMethod, setTipMethod] = useState<UserProfile['tipMethod']>(undefined);
  // Step 6: Goals
  const [dailyGoal, setDailyGoal] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [yearlyGoal, setYearlyGoal] = useState('');
  const [savingsName, setSavingsName] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [savingsContribution, setSavingsContribution] = useState('');

  const animateTransition = (next: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const goSkip = () => {
    if (step < TOTAL_STEPS - 1) {
      animateTransition(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = () => {
    const role = showCustomRole ? customRole : selectedRole;
    const wage = parseFloat(hourlyWage);
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    const yearly = parseFloat(yearlyGoal);
    const savTarget = parseFloat(savingsTarget);
    const savContrib = parseFloat(savingsContribution);

    const profileData: Partial<UserProfile> = {};

    if (name.trim()) profileData.name = name.trim();
    if (workplace.trim()) profileData.workplace = workplace.trim();
    if (role.trim()) profileData.role = role.trim();
    if (!isNaN(wage) && wage > 0) profileData.hourlyWage = wage;
    if (tipMethod) profileData.tipMethod = tipMethod;
    if (!isNaN(daily) && daily > 0) profileData.dailyGoal = daily;
    if (!isNaN(monthly) && monthly > 0) profileData.monthlyGoal = monthly;
    if (!isNaN(yearly) && yearly > 0) profileData.yearlyGoal = yearly;

    if (savingsName.trim() && !isNaN(savTarget) && savTarget > 0 && !isNaN(savContrib) && savContrib > 0) {
      profileData.savingsGoal = {
        id: generateId(),
        name: savingsName.trim(),
        targetAmount: savTarget,
        contributionPerShift: savContrib,
        totalContributed: 0,
        createdAt: new Date().toISOString(),
      };
    }

    onComplete(profileData);
  };

  const renderProgressDots = () => (
    <View style={styles.dotsContainer}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === step && styles.dotActive,
            i < step && styles.dotCompleted,
          ]}
        />
      ))}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>👋</Text>
            <Text style={styles.stepTitle}>What's your name?</Text>
            <Text style={styles.stepSubtitle}>Let's personalize your experience</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={goNext}
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>🏢</Text>
            <Text style={styles.stepTitle}>Where do you work?</Text>
            <Text style={styles.stepSubtitle}>Your workplace name</Text>
            <TextInput
              style={styles.textInput}
              value={workplace}
              onChangeText={setWorkplace}
              placeholder="Restaurant or business name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={goNext}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>💼</Text>
            <Text style={styles.stepTitle}>What's your role?</Text>
            <Text style={styles.stepSubtitle}>Select your position or add a custom one</Text>
            <View style={styles.rolesGrid}>
              {ROLES.map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleChip,
                    selectedRole === role && !showCustomRole && styles.roleChipActive,
                  ]}
                  onPress={() => {
                    setSelectedRole(role);
                    setShowCustomRole(false);
                  }}
                >
                  <Text style={[
                    styles.roleChipText,
                    selectedRole === role && !showCustomRole && styles.roleChipTextActive,
                  ]}>
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.roleChip,
                  showCustomRole && styles.roleChipActive,
                ]}
                onPress={() => {
                  setShowCustomRole(true);
                  setSelectedRole('');
                }}
              >
                <Text style={[
                  styles.roleChipText,
                  showCustomRole && styles.roleChipTextActive,
                ]}>
                  Other...
                </Text>
              </TouchableOpacity>
            </View>
            {showCustomRole && (
              <TextInput
                style={[styles.textInput, { marginTop: spacing.md }]}
                value={customRole}
                onChangeText={setCustomRole}
                placeholder="Enter your role"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>💰</Text>
            <Text style={styles.stepTitle}>What's your hourly wage?</Text>
            <Text style={styles.stepSubtitle}>Your base pay before tips</Text>
            <View style={styles.wageInputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.wageInput}
                value={hourlyWage}
                onChangeText={setHourlyWage}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.perHour}>/hr</Text>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepEmoji}>💳</Text>
            <Text style={styles.stepTitle}>How do you receive tips?</Text>
            <Text style={styles.stepSubtitle}>Select your primary tip method</Text>
            <View style={styles.tipMethodGrid}>
              {TIP_METHODS.map(method => (
                <TouchableOpacity
                  key={method.key}
                  style={[
                    styles.tipMethodBtn,
                    tipMethod === method.key && styles.tipMethodBtnActive,
                  ]}
                  onPress={() => setTipMethod(method.key)}
                >
                  <Text style={[
                    styles.tipMethodText,
                    tipMethod === method.key && styles.tipMethodTextActive,
                  ]}>
                    {method.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <ScrollView
            style={styles.goalsScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.stepContent}
          >
            <Text style={styles.stepEmoji}>🎯</Text>
            <Text style={styles.stepTitle}>Set your tip goals</Text>
            <Text style={styles.stepSubtitle}>Optional — you can always change these later</Text>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>Daily tip goal</Text>
              <View style={styles.goalInputRow}>
                <Text style={styles.goalDollar}>$</Text>
                <TextInput
                  style={styles.goalInput}
                  value={dailyGoal}
                  onChangeText={setDailyGoal}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>Monthly tip goal</Text>
              <View style={styles.goalInputRow}>
                <Text style={styles.goalDollar}>$</Text>
                <TextInput
                  style={styles.goalInput}
                  value={monthlyGoal}
                  onChangeText={setMonthlyGoal}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>Yearly tip goal</Text>
              <View style={styles.goalInputRow}>
                <Text style={styles.goalDollar}>$</Text>
                <TextInput
                  style={styles.goalInput}
                  value={yearlyGoal}
                  onChangeText={setYearlyGoal}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.savingsDivider} />
            <Text style={styles.savingsTitle}>Custom Savings Goal</Text>
            <Text style={styles.savingsSubtitle}>
              Set aside a portion of each shift's tips toward something you're saving for
            </Text>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>What are you saving for?</Text>
              <TextInput
                style={styles.textInput}
                value={savingsName}
                onChangeText={setSavingsName}
                placeholder="e.g. New car, vacation, emergency fund"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>How much does it cost?</Text>
              <View style={styles.goalInputRow}>
                <Text style={styles.goalDollar}>$</Text>
                <TextInput
                  style={styles.goalInput}
                  value={savingsTarget}
                  onChangeText={setSavingsTarget}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={styles.goalInputGroup}>
              <Text style={styles.goalLabel}>How much to set aside per shift?</Text>
              <View style={styles.goalInputRow}>
                <Text style={styles.goalDollar}>$</Text>
                <TextInput
                  style={styles.goalInput}
                  value={savingsContribution}
                  onChangeText={setSavingsContribution}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {step === 0 ? (
          <Text style={styles.welcomeText}>Welcome to TipTracker</Text>
        ) : (
          <Text style={styles.stepCounter}>Step {step + 1} of {TOTAL_STEPS}</Text>
        )}
        {renderProgressDots()}
      </View>

      <Animated.View style={[styles.body, { opacity: fadeAnim }]}>
        {renderStep()}
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.skipBtn} onPress={goSkip}>
          <Text style={styles.skipBtnText}>
            {step === TOTAL_STEPS - 1 ? 'Skip & Finish' : 'Skip'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={goNext}>
          <Text style={styles.continueBtnText}>
            {step === TOTAL_STEPS - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.md,
  },
  stepCounter: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  dotCompleted: {
    backgroundColor: colors.accent,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContent: {
    paddingHorizontal: spacing.lg,
  },
  stepEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  roleChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleChipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  roleChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleChipTextActive: {
    color: colors.accent,
  },
  wageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dollarSign: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.xs,
  },
  wageInput: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.text,
    minWidth: 120,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.sm,
  },
  perHour: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  tipMethodGrid: {
    gap: spacing.sm,
  },
  tipMethodBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipMethodBtnActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  tipMethodText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tipMethodTextActive: {
    color: colors.accent,
  },
  goalsScroll: {
    flex: 1,
  },
  goalInputGroup: {
    marginBottom: spacing.md,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  goalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalDollar: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.sm,
  },
  goalInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  savingsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  savingsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.gold,
    marginBottom: spacing.xs,
  },
  savingsSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  skipBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textMuted,
  },
  continueBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.background,
  },
});
