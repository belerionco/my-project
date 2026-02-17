import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  getEntriesForMonth,
  getEntriesForWeek,
  averageHourlyRate,
  averageTipsPerShift,
  totalEarnings,
  totalHours,
  formatCurrency,
  combinedAvgForEntries,
  MONTH_NAMES,
} from '../utils/helpers';

interface DashboardScreenProps {
  onAddTip: () => void;
}

export default function DashboardScreen({ onAddTip }: DashboardScreenProps) {
  const { entries, goals, profile, workplaces } = useApp();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthEntries = useMemo(() => getEntriesForMonth(entries, year, month), [entries, year, month]);
  const weekStartsOn = profile.weekStartsOn ?? 0;
  const weekEntries = useMemo(() => getEntriesForWeek(entries, now, weekStartsOn), [entries, weekStartsOn]);

  const monthlyGoal = goals.find(g => g.type === 'monthly');
  const weeklyGoal = goals.find(g => g.type === 'weekly');

  const monthTotal = totalEarnings(monthEntries);
  const weekTotal = totalEarnings(weekEntries);
  const avgHourly = averageHourlyRate(monthEntries);
  const avgTips = averageTipsPerShift(monthEntries);
  const combinedAvg = combinedAvgForEntries(monthEntries, workplaces, profile.hourlyWage || 0);

  const monthGoalRemaining = monthlyGoal ? Math.max(0, monthlyGoal.amount - monthTotal) : null;
  const weekGoalRemaining = weeklyGoal ? Math.max(0, weeklyGoal.amount - weekTotal) : null;
  const monthGoalProgress = monthlyGoal ? Math.min(1, monthTotal / monthlyGoal.amount) : 0;
  const weekGoalProgress = weeklyGoal ? Math.min(1, weekTotal / weeklyGoal.amount) : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.greeting}>TipTracker</Text>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>

        {/* Monthly Averages */}
        <View style={styles.avgRow}>
          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>Avg Hourly</Text>
            <Text style={styles.avgValue}>{formatCurrency(avgHourly)}</Text>
            <Text style={styles.avgSub}>/hr</Text>
          </View>
          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>Avg Tips</Text>
            <Text style={styles.avgValue}>{formatCurrency(avgTips)}</Text>
            <Text style={styles.avgSub}>/shift</Text>
          </View>
          <View style={styles.avgCard}>
            <Text style={styles.avgLabel}>Combined</Text>
            <Text style={styles.avgValue}>{formatCurrency(combinedAvg)}</Text>
            <Text style={styles.avgSub}>/hr</Text>
          </View>
        </View>

        {/* Earnings Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>This Week</Text>
              <Text style={styles.summaryValue}>{formatCurrency(weekTotal)}</Text>
              <Text style={styles.summaryShifts}>{weekEntries.length} shifts</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryValue}>{formatCurrency(monthTotal)}</Text>
              <Text style={styles.summaryShifts}>{monthEntries.length} shifts</Text>
            </View>
          </View>
        </View>

        {/* Goal Progress */}
        {weeklyGoal && (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Weekly Goal</Text>
              <Text style={styles.goalAmount}>{formatCurrency(weekTotal)} / {formatCurrency(weeklyGoal.amount)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${weekGoalProgress * 100}%` }]} />
            </View>
            {weekGoalRemaining !== null && weekGoalRemaining > 0 && (
              <Text style={styles.goalRemaining}>{formatCurrency(weekGoalRemaining)} to go</Text>
            )}
            {weekGoalRemaining === 0 && <Text style={styles.goalMet}>Goal reached!</Text>}
          </View>
        )}

        {monthlyGoal && (
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalLabel}>Monthly Goal</Text>
              <Text style={styles.goalAmount}>{formatCurrency(monthTotal)} / {formatCurrency(monthlyGoal.amount)}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, styles.progressFillGold, { width: `${monthGoalProgress * 100}%` }]} />
            </View>
            {monthGoalRemaining !== null && monthGoalRemaining > 0 && (
              <Text style={styles.goalRemaining}>{formatCurrency(monthGoalRemaining)} to go</Text>
            )}
            {monthGoalRemaining === 0 && <Text style={styles.goalMet}>Goal reached!</Text>}
          </View>
        )}

        {!weeklyGoal && !monthlyGoal && (
          <View style={styles.noGoalCard}>
            <Text style={styles.noGoalText}>Set a goal to track your progress</Text>
            <Text style={styles.noGoalSub}>Swipe to Goals tab to get started</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.addButton} onPress={onAddTip} activeOpacity={0.8}>
        <Text style={styles.addButtonIcon}>+</Text>
        <Text style={styles.addButtonText}>Add Tips</Text>
      </TouchableOpacity>
    </View>
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
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 1,
  },
  monthLabel: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  avgRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avgCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  avgValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  avgSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xs,
  },
  summaryShifts: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 0,
  },
  goalAmount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flexShrink: 1,
    textAlign: 'right',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressFillGold: {
    backgroundColor: colors.gold,
  },
  goalRemaining: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  goalMet: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  noGoalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  noGoalText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  noGoalSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  addButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonIcon: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.background,
    marginRight: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.background,
  },
});
