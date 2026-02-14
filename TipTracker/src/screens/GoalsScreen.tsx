import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  getEntriesForMonth,
  getEntriesForWeek,
  totalEarnings,
  formatCurrency,
  MONTH_NAMES,
} from '../utils/helpers';

export default function GoalsScreen() {
  const { goals, setGoal, entries } = useApp();
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [weeklyInput, setWeeklyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');

  const now = new Date();
  const weeklyGoal = goals.find(g => g.type === 'weekly');
  const monthlyGoal = goals.find(g => g.type === 'monthly');

  const weekEntries = useMemo(() => getEntriesForWeek(entries, now), [entries]);
  const monthEntries = useMemo(() => getEntriesForMonth(entries, now.getFullYear(), now.getMonth()), [entries]);

  const weekTotal = totalEarnings(weekEntries);
  const monthTotal = totalEarnings(monthEntries);

  const weekProgress = weeklyGoal ? Math.min(1, weekTotal / weeklyGoal.amount) : 0;
  const monthProgress = monthlyGoal ? Math.min(1, monthTotal / monthlyGoal.amount) : 0;

  const saveWeeklyGoal = () => {
    const amount = parseFloat(weeklyInput);
    if (amount > 0) {
      setGoal('weekly', amount);
      setEditingWeekly(false);
      setWeeklyInput('');
    }
  };

  const saveMonthlyGoal = () => {
    const amount = parseFloat(monthlyInput);
    if (amount > 0) {
      setGoal('monthly', amount);
      setEditingMonthly(false);
      setMonthlyInput('');
    }
  };

  // Calculate days/shifts remaining projections
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const dayOfWeek = now.getDay();
  const daysLeftInWeek = 6 - dayOfWeek;

  const avgPerShift = monthEntries.length > 0 ? monthTotal / monthEntries.length : 0;
  const monthlyRemaining = monthlyGoal ? Math.max(0, monthlyGoal.amount - monthTotal) : 0;
  const shiftsNeeded = avgPerShift > 0 ? Math.ceil(monthlyRemaining / avgPerShift) : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Goals</Text>

        {/* Weekly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🎯</Text>
            <Text style={styles.goalType}>Weekly Goal</Text>
            <TouchableOpacity onPress={() => {
              setEditingWeekly(!editingWeekly);
              if (weeklyGoal) setWeeklyInput(String(weeklyGoal.amount));
            }}>
              <Text style={styles.editBtn}>{weeklyGoal ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingWeekly ? (
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={weeklyInput}
                onChangeText={setWeeklyInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveWeeklyGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : weeklyGoal ? (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount}>{formatCurrency(weekTotal)}</Text>
                <Text style={styles.progressOf}>of {formatCurrency(weeklyGoal.amount)}</Text>
              </View>
              <View style={styles.progressBarLg}>
                <View style={[styles.progressFill, { width: `${weekProgress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressPercent}>{Math.round(weekProgress * 100)}%</Text>
                {weekTotal < weeklyGoal.amount && (
                  <Text style={styles.progressRemaining}>
                    {formatCurrency(weeklyGoal.amount - weekTotal)} to go · {daysLeftInWeek} days left
                  </Text>
                )}
                {weekTotal >= weeklyGoal.amount && (
                  <Text style={styles.goalReached}>Goal reached!</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a weekly earnings goal</Text>
          )}
        </View>

        {/* Monthly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🏆</Text>
            <Text style={styles.goalType}>Monthly Goal</Text>
            <TouchableOpacity onPress={() => {
              setEditingMonthly(!editingMonthly);
              if (monthlyGoal) setMonthlyInput(String(monthlyGoal.amount));
            }}>
              <Text style={styles.editBtn}>{monthlyGoal ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingMonthly ? (
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={monthlyInput}
                onChangeText={setMonthlyInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveMonthlyGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : monthlyGoal ? (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount}>{formatCurrency(monthTotal)}</Text>
                <Text style={styles.progressOf}>of {formatCurrency(monthlyGoal.amount)}</Text>
              </View>
              <View style={styles.progressBarLg}>
                <View style={[styles.progressFill, styles.progressGold, { width: `${monthProgress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressPercent}>{Math.round(monthProgress * 100)}%</Text>
                {monthTotal < monthlyGoal.amount ? (
                  <Text style={styles.progressRemaining}>
                    {formatCurrency(monthlyRemaining)} to go · {daysLeftInMonth} days left
                  </Text>
                ) : (
                  <Text style={styles.goalReached}>Goal reached!</Text>
                )}
              </View>

              {/* Projection */}
              {monthTotal < monthlyGoal.amount && avgPerShift > 0 && (
                <View style={styles.projectionCard}>
                  <Text style={styles.projectionTitle}>Projection</Text>
                  <Text style={styles.projectionText}>
                    At your avg of {formatCurrency(avgPerShift)}/shift, you need ~{shiftsNeeded} more shifts to reach your goal.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a monthly earnings goal</Text>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Text style={styles.quickStatsTitle}>{MONTH_NAMES[now.getMonth()]} Summary</Text>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{monthEntries.length}</Text>
              <Text style={styles.quickStatLabel}>Shifts</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{formatCurrency(monthTotal)}</Text>
              <Text style={styles.quickStatLabel}>Earned</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue}>{formatCurrency(avgPerShift)}</Text>
              <Text style={styles.quickStatLabel}>Per Shift</Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.lg,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  goalType: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  editBtn: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginLeft: spacing.md,
  },
  saveBtnText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: fontSize.sm,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  progressAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  progressOf: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  progressBarLg: {
    height: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressGold: {
    backgroundColor: colors.gold,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.accent,
  },
  progressRemaining: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  goalReached: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.success,
  },
  noGoal: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  projectionCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  projectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  projectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  quickStats: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  quickStatsTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
