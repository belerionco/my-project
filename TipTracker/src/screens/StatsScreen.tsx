import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  totalTips,
  totalEarnings,
  totalHours,
  averageHourlyRate,
  averageTipsPerShift,
  getEntriesForMonth,
  getWeekStart,
  formatCurrency,
  MONTH_NAMES,
  DAY_NAMES,
} from '../utils/helpers';
import { TipEntry } from '../types';

type Period = 'week' | 'month' | 'year';

export default function StatsScreen() {
  const { entries, profile } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const now = new Date();
  const weekStartsOn = profile.weekStartsOn ?? 0;

  const filteredEntries = useMemo(() => {
    const today = new Date();
    switch (period) {
      case 'week': {
        const weekStart = getWeekStart(today, weekStartsOn);
        return entries.filter(e => new Date(e.date + 'T12:00:00') >= weekStart);
      }
      case 'month':
        return getEntriesForMonth(entries, today.getFullYear(), today.getMonth());
      case 'year':
        return entries.filter(e => e.date.startsWith(String(today.getFullYear())));
    }
  }, [entries, period]);

  const total = totalEarnings(filteredEntries);
  const hours = totalHours(filteredEntries);
  const avgHourly = averageHourlyRate(filteredEntries);
  const avgShift = averageTipsPerShift(filteredEntries);
  const totalTipOut = filteredEntries.reduce((sum, e) => sum + e.tipOut, 0);
  const totalCash = filteredEntries.reduce((sum, e) => sum + e.cashTips, 0);
  const totalCard = filteredEntries.reduce((sum, e) => sum + e.cardTips, 0);

  // Best day
  const bestDay = useMemo(() => {
    if (filteredEntries.length === 0) return null;
    const dayMap: Record<string, number> = {};
    filteredEntries.forEach(e => {
      dayMap[e.date] = (dayMap[e.date] || 0) + totalTips(e);
    });
    const best = Object.entries(dayMap).sort((a, b) => b[1] - a[1])[0];
    return best ? { date: best[0], amount: best[1] } : null;
  }, [filteredEntries]);

  // Best shift type
  const shiftStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    filteredEntries.forEach(e => {
      if (!stats[e.shiftType]) stats[e.shiftType] = { total: 0, count: 0 };
      stats[e.shiftType].total += totalTips(e);
      stats[e.shiftType].count += 1;
    });
    return Object.entries(stats)
      .map(([type, data]) => ({ type, avg: data.total / data.count, count: data.count, total: data.total }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredEntries]);

  // Day of week breakdown
  const dayOfWeekStats = useMemo(() => {
    const stats = DAY_NAMES.map(() => ({ total: 0, count: 0 }));
    filteredEntries.forEach(e => {
      const day = new Date(e.date + 'T12:00:00').getDay();
      stats[day].total += totalTips(e);
      stats[day].count += 1;
    });
    return stats;
  }, [filteredEntries]);

  const maxDayAvg = Math.max(...dayOfWeekStats.map(d => d.count > 0 ? d.total / d.count : 0), 1);

  // Simple bar chart for monthly breakdown (last 6 months)
  const monthlyBreakdown = useMemo(() => {
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEntries = getEntriesForMonth(entries, d.getFullYear(), d.getMonth());
      months.push({
        label: MONTH_NAMES[d.getMonth()].substring(0, 3),
        total: totalEarnings(mEntries),
      });
    }
    return months;
  }, [entries]);

  const maxMonthly = Math.max(...monthlyBreakdown.map(m => m.total), 1);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Stats & Trends</Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(total)}</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{filteredEntries.length}</Text>
            <Text style={styles.statLabel}>Shifts</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(avgHourly)}</Text>
            <Text style={styles.statLabel}>Avg $/hr</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(avgShift)}</Text>
            <Text style={styles.statLabel}>Avg/Shift</Text>
          </View>
        </View>

        {/* Earnings Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.breakdownLabel}>Cash Tips</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(totalCash)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: colors.gold }]} />
            <Text style={styles.breakdownLabel}>Card Tips</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(totalCard)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownDot, { backgroundColor: colors.red }]} />
            <Text style={styles.breakdownLabel}>Tip Out</Text>
            <Text style={styles.breakdownValue}>-{formatCurrency(totalTipOut)}</Text>
          </View>
          <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm }]}>
            <View style={[styles.breakdownDot, { backgroundColor: 'transparent' }]} />
            <Text style={[styles.breakdownLabel, { fontWeight: '800', color: colors.text }]}>Net Total</Text>
            <Text style={[styles.breakdownValue, { fontWeight: '800', color: colors.accent }]}>{formatCurrency(total)}</Text>
          </View>
        </View>

        {/* Day of Week */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Best Days to Work</Text>
          {DAY_NAMES.map((day, i) => {
            const avg = dayOfWeekStats[i].count > 0 ? dayOfWeekStats[i].total / dayOfWeekStats[i].count : 0;
            const barWidth = (avg / maxDayAvg) * 100;
            return (
              <View key={day} style={styles.barRow}>
                <Text style={styles.barLabel}>{day}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${barWidth}%` }]} />
                </View>
                <Text style={styles.barValue}>
                  {dayOfWeekStats[i].count > 0 ? formatCurrency(avg) : '-'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Shift Type Breakdown */}
        {shiftStats.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>By Shift Type</Text>
            {shiftStats.map(s => (
              <View key={s.type} style={styles.shiftRow}>
                <Text style={styles.shiftType}>{s.type.charAt(0).toUpperCase() + s.type.slice(1)}</Text>
                <Text style={styles.shiftCount}>{s.count} shifts</Text>
                <Text style={styles.shiftAvg}>{formatCurrency(s.avg)} avg</Text>
              </View>
            ))}
          </View>
        )}

        {/* Monthly Trend */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Last 6 Months</Text>
          <View style={styles.chartContainer}>
            {monthlyBreakdown.map((m, i) => {
              const height = (m.total / maxMonthly) * 120;
              return (
                <View key={i} style={styles.chartBar}>
                  <Text style={styles.chartValue}>{m.total > 0 ? `$${Math.round(m.total)}` : ''}</Text>
                  <View style={[styles.chartFill, { height: Math.max(height, 4) }]} />
                  <Text style={styles.chartLabel}>{m.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Best Day */}
        {bestDay && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Best Day</Text>
            <Text style={styles.bestDayDate}>
              {new Date(bestDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.bestDayAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(bestDay.amount)}</Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barLabel: {
    width: 36,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  barValue: {
    width: 60,
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  shiftType: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  shiftCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginRight: spacing.md,
  },
  shiftAvg: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingTop: spacing.md,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartValue: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  chartFill: {
    width: '60%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  bestDayDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  bestDayAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.gold,
    marginTop: spacing.xs,
  },
});
