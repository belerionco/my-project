import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  totalTips,
  totalHours,
  getEntriesForWeek,
  getEntriesForMonth,
  formatCurrency,
  getWageForEntry,
} from '../utils/helpers';
import PaycheckScreen from './PaycheckScreen';

type Period = 'week' | 'month' | 'all';

export default function EarningsScreen() {
  const { entries, profile, workplaces } = useApp();
  const [period, setPeriod] = useState<Period>('week');
  const [showPaycheck, setShowPaycheck] = useState(false);

  // Filter entries based on selected period
  const getFilteredEntries = () => {
    const now = new Date();
    switch (period) {
      case 'week':
        return getEntriesForWeek(entries, now, profile.weekStartsOn ?? 0);
      case 'month':
        return getEntriesForMonth(entries, now.getFullYear(), now.getMonth());
      case 'all':
        return entries;
      default:
        return entries;
    }
  };

  const filteredEntries = getFilteredEntries();
  const totalTipsEarned = filteredEntries.reduce((sum, e) => sum + totalTips(e), 0);
  const totalHoursWorked = totalHours(filteredEntries);
  const fallbackWage = profile.hourlyWage || 0;
  const totalWages = filteredEntries.reduce((sum, e) => sum + getWageForEntry(e, workplaces, fallbackWage) * e.hoursWorked, 0);
  const totalEarnings = totalTipsEarned + totalWages;
  // Avg tips/hour = total tips across all shifts / total hours across all shifts
  const tipsPerHour = totalHoursWorked > 0 ? totalTipsEarned / totalHoursWorked : 0;
  // Avg combined/hour = total earnings (wages + tips) / total hours across all shifts
  const combinedPerHour = totalHoursWorked > 0 ? totalEarnings / totalHoursWorked : 0;

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <View style={styles.container}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Earnings Breakdown</Text>
        <TouchableOpacity style={styles.paycheckBtn} onPress={() => setShowPaycheck(true)}>
          <Text style={styles.paycheckBtnText}>Paycheck</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodBtn, period === p.key && styles.periodBtnActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hourly Rates Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Hourly Rates</Text>

        <View style={styles.rateRow}>
          <View style={styles.rateLabel}>
            <Text style={styles.rateLabelText}>💵 Avg Tips/Hour</Text>
            <Text style={styles.rateNote}>
              {formatCurrency(totalTipsEarned)} tips / {totalHoursWorked.toFixed(1)} hrs
            </Text>
          </View>
          <Text style={styles.rateValue}>{formatCurrency(tipsPerHour)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rateRow}>
          <View style={styles.rateLabel}>
            <Text style={styles.rateLabelTextBold}>🎯 Avg Combined/Hour</Text>
            <Text style={styles.rateNote}>
              {formatCurrency(totalEarnings)} total / {totalHoursWorked.toFixed(1)} hrs
            </Text>
          </View>
          <Text style={styles.rateValueLarge}>{formatCurrency(combinedPerHour)}</Text>
        </View>
      </View>

      {/* Total Earnings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Total Earnings</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Hours Worked</Text>
          <Text style={styles.summaryValue}>{totalHoursWorked.toFixed(1)} hrs</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tips Earned</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalTipsEarned)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Wages Earned</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalWages)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabelBold}>Total Income</Text>
          <Text style={styles.summaryValueLarge}>{formatCurrency(totalEarnings)}</Text>
        </View>
      </View>

      {/* Per Shift Breakdown */}
      {filteredEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Per Shift Average</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tips per Shift</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalTipsEarned / filteredEntries.length)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Wages per Shift</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totalWages / filteredEntries.length)}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabelBold}>Total per Shift</Text>
            <Text style={styles.summaryValueLarge}>
              {formatCurrency(totalEarnings / filteredEntries.length)}
            </Text>
          </View>
        </View>
      )}

      {filteredEntries.length === 0 && (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No entries for this period</Text>
        </View>
      )}
    </ScrollView>

    <PaycheckScreen visible={showPaycheck} onClose={() => setShowPaycheck(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  paycheckBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  paycheckBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.background,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: colors.accent,
  },
  periodText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  rateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rateLabel: {
    flex: 1,
  },
  rateLabelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  rateLabelTextBold: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  rateNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rateValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  rateValueLarge: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  summaryLabelBold: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  summaryValueLarge: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
