import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
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
  getWeekEnd,
  toDateKey,
  parseDate,
  formatCurrency,
  MONTH_NAMES,
  DAY_NAMES,
} from '../utils/helpers';
import { TipEntry } from '../types';

type Period = 'day' | 'week' | 'month' | 'year';
type CompareMode = 'prev_week' | 'prev_year' | 'custom';

function getEntriesInRange(entries: TipEntry[], start: Date, end: Date): TipEntry[] {
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  return entries.filter(e => e.date >= startKey && e.date <= endKey);
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PeriodStats {
  entries: TipEntry[];
  total: number;
  shifts: number;
  hours: number;
  avgHourly: number;
  avgShift: number;
  label: string;
  startDate: Date;
  endDate: Date;
}

function computeStats(entries: TipEntry[], label: string, start: Date, end: Date): PeriodStats {
  return {
    entries,
    total: totalEarnings(entries),
    shifts: entries.length,
    hours: totalHours(entries),
    avgHourly: averageHourlyRate(entries),
    avgShift: averageTipsPerShift(entries),
    label,
    startDate: start,
    endDate: end,
  };
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export default function StatsScreen() {
  const { entries, profile } = useApp();
  const [period, setPeriod] = useState<Period>('month');
  const [showCompare, setShowCompare] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>('prev_week');
  const now = new Date();
  const weekStartsOn = profile.weekStartsOn ?? 0;

  // Custom date range state (YYYY-MM-DD strings)
  const [customAStart, setCustomAStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 13);
    return toDateKey(d);
  });
  const [customAEnd, setCustomAEnd] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return toDateKey(d);
  });
  const [customBStart, setCustomBStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    return toDateKey(d);
  });
  const [customBEnd, setCustomBEnd] = useState(() => toDateKey(new Date()));

  const filteredEntries = useMemo(() => {
    const today = new Date();
    switch (period) {
      case 'day': {
        const todayKey = toDateKey(today);
        return entries.filter(e => e.date === todayKey);
      }
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

  // Tip percentage based on sales
  const entriesWithSales = filteredEntries.filter(e => e.totalSales && e.totalSales > 0);
  const totalSalesAmount = entriesWithSales.reduce((sum, e) => sum + (e.totalSales || 0), 0);
  const totalTipsOnSales = entriesWithSales.reduce((sum, e) => sum + e.cashTips + e.cardTips - e.tipOut, 0);
  const avgTipPercentage = totalSalesAmount > 0 ? (totalTipsOnSales / totalSalesAmount) * 100 : null;

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

  // --- Comparison logic ---
  const comparison = useMemo(() => {
    const today = new Date();
    if (compareMode === 'prev_week') {
      const thisWeekStart = getWeekStart(today, weekStartsOn);
      const thisWeekEnd = getWeekEnd(today, weekStartsOn);
      const prevWeekEnd = new Date(thisWeekStart);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
      const prevWeekStart = getWeekStart(prevWeekEnd, weekStartsOn);

      const currentEntries = getEntriesInRange(entries, thisWeekStart, thisWeekEnd);
      const prevEntries = getEntriesInRange(entries, prevWeekStart, prevWeekEnd);

      return {
        current: computeStats(currentEntries, 'This Week', thisWeekStart, thisWeekEnd),
        previous: computeStats(prevEntries, 'Last Week', prevWeekStart, prevWeekEnd),
      };
    } else if (compareMode === 'prev_year') {
      const thisWeekStart = getWeekStart(today, weekStartsOn);
      const thisWeekEnd = getWeekEnd(today, weekStartsOn);
      const lastYearStart = new Date(thisWeekStart);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(thisWeekEnd);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const currentEntries = getEntriesInRange(entries, thisWeekStart, thisWeekEnd);
      const prevEntries = getEntriesInRange(entries, lastYearStart, lastYearEnd);

      return {
        current: computeStats(currentEntries, 'This Week', thisWeekStart, thisWeekEnd),
        previous: computeStats(prevEntries, 'Same Week Last Year', lastYearStart, lastYearEnd),
      };
    } else {
      // Custom
      const aStart = parseDate(customAStart);
      const aEnd = parseDate(customAEnd);
      const bStart = parseDate(customBStart);
      const bEnd = parseDate(customBEnd);

      const aEntries = getEntriesInRange(entries, aStart, aEnd);
      const bEntries = getEntriesInRange(entries, bStart, bEnd);

      return {
        previous: computeStats(aEntries, 'Period A', aStart, aEnd),
        current: computeStats(bEntries, 'Period B', bStart, bEnd),
      };
    }
  }, [entries, compareMode, weekStartsOn, customAStart, customAEnd, customBStart, customBEnd]);

  const changeDateStr = useCallback((current: string, offset: number): string => {
    const parts = current.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + offset);
    return toDateKey(d);
  }, []);

  const renderChangeIndicator = (current: number, previous: number, isCurrency = true) => {
    const pct = pctChange(current, previous);
    if (pct === null) return null;
    const isPositive = pct >= 0;
    const arrow = isPositive ? '+' : '';
    return (
      <Text style={[styles.changeText, { color: isPositive ? colors.success : colors.red }]}>
        {arrow}{pct.toFixed(1)}%
      </Text>
    );
  };

  const renderCompareRow = (label: string, prevVal: number, curVal: number, isCurrency = true) => (
    <View style={styles.compareRow}>
      <Text style={styles.compareMetricLabel}>{label}</Text>
      <View style={styles.compareValues}>
        <Text style={styles.comparePrevValue}>
          {isCurrency ? formatCurrency(prevVal) : prevVal.toFixed(1)}
        </Text>
        <Text style={styles.compareArrow}>vs</Text>
        <Text style={styles.compareCurValue}>
          {isCurrency ? formatCurrency(curVal) : curVal.toFixed(1)}
        </Text>
        {renderChangeIndicator(curVal, prevVal, isCurrency)}
      </View>
    </View>
  );

  const renderDatePicker = (label: string, value: string, onChange: (v: string) => void) => (
    <View style={styles.customDateRow}>
      <Text style={styles.customDateLabel}>{label}</Text>
      <View style={styles.customDatePicker}>
        <TouchableOpacity
          style={styles.customDateNav}
          onPress={() => onChange(changeDateStr(value, -1))}
        >
          <Text style={styles.customDateNavText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.customDateValue}>
          {(() => {
            const parts = value.split('-').map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
          })()}
        </Text>
        <TouchableOpacity
          style={styles.customDateNav}
          onPress={() => onChange(changeDateStr(value, 1))}
        >
          <Text style={styles.customDateNavText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Stats & Trends</Text>

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
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
          {avgTipPercentage !== null && (
            <View style={styles.statCard}>
              <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{avgTipPercentage.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Tip %</Text>
            </View>
          )}
          {avgTipPercentage !== null && (
            <View style={styles.statCard}>
              <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totalSalesAmount)}</Text>
              <Text style={styles.statLabel}>Total Sales</Text>
            </View>
          )}
        </View>

        {/* Compare Periods Toggle */}
        <TouchableOpacity
          style={[styles.compareToggle, showCompare && styles.compareToggleActive]}
          onPress={() => setShowCompare(!showCompare)}
        >
          <Text style={[styles.compareToggleText, showCompare && styles.compareToggleTextActive]}>
            Compare Periods
          </Text>
          <Text style={[styles.compareToggleArrow, showCompare && styles.compareToggleTextActive]}>
            {showCompare ? 'Hide' : 'Show'}
          </Text>
        </TouchableOpacity>

        {/* Compare Section */}
        {showCompare && (
          <View style={styles.compareSection}>
            {/* Compare Mode Selector */}
            <View style={styles.compareModeRow}>
              {([
                { key: 'prev_week' as CompareMode, label: 'vs Last Week' },
                { key: 'prev_year' as CompareMode, label: 'vs Last Year' },
                { key: 'custom' as CompareMode, label: 'Custom' },
              ]).map(mode => (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.compareModeBtn, compareMode === mode.key && styles.compareModeBtnActive]}
                  onPress={() => setCompareMode(mode.key)}
                >
                  <Text style={[styles.compareModeText, compareMode === mode.key && styles.compareModeTextActive]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Date Ranges */}
            {compareMode === 'custom' && (
              <View style={styles.customDatesContainer}>
                <View style={styles.customPeriodBlock}>
                  <Text style={styles.customPeriodTitle}>Period A (Previous)</Text>
                  {renderDatePicker('Start', customAStart, setCustomAStart)}
                  {renderDatePicker('End', customAEnd, setCustomAEnd)}
                </View>
                <View style={styles.customPeriodBlock}>
                  <Text style={styles.customPeriodTitle}>Period B (Current)</Text>
                  {renderDatePicker('Start', customBStart, setCustomBStart)}
                  {renderDatePicker('End', customBEnd, setCustomBEnd)}
                </View>
              </View>
            )}

            {/* Period Labels */}
            <View style={styles.comparePeriodLabels}>
              <View style={styles.comparePeriodLabelBox}>
                <Text style={styles.comparePeriodLabelTitle}>{comparison.previous.label}</Text>
                <Text style={styles.comparePeriodLabelDates}>
                  {formatShortDate(comparison.previous.startDate)} - {formatShortDate(comparison.previous.endDate)}
                </Text>
              </View>
              <Text style={styles.comparePeriodVs}>vs</Text>
              <View style={styles.comparePeriodLabelBox}>
                <Text style={styles.comparePeriodLabelTitle}>{comparison.current.label}</Text>
                <Text style={styles.comparePeriodLabelDates}>
                  {formatShortDate(comparison.current.startDate)} - {formatShortDate(comparison.current.endDate)}
                </Text>
              </View>
            </View>

            {/* Big Total Comparison */}
            <View style={styles.compareBigRow}>
              <View style={styles.compareBigCard}>
                <Text style={styles.compareBigValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formatCurrency(comparison.previous.total)}
                </Text>
                <Text style={styles.compareBigLabel}>{comparison.previous.shifts} shifts</Text>
              </View>
              <View style={styles.compareBigChange}>
                {(() => {
                  const pct = pctChange(comparison.current.total, comparison.previous.total);
                  if (pct === null) return <Text style={styles.compareBigPct}>--</Text>;
                  const isPositive = pct >= 0;
                  return (
                    <Text style={[styles.compareBigPct, { color: isPositive ? colors.success : colors.red }]}>
                      {isPositive ? '+' : ''}{pct.toFixed(0)}%
                    </Text>
                  );
                })()}
              </View>
              <View style={styles.compareBigCard}>
                <Text style={styles.compareBigValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formatCurrency(comparison.current.total)}
                </Text>
                <Text style={styles.compareBigLabel}>{comparison.current.shifts} shifts</Text>
              </View>
            </View>

            {/* Detailed Metrics */}
            <View style={styles.compareMetrics}>
              {renderCompareRow('Total Earned', comparison.previous.total, comparison.current.total)}
              {renderCompareRow('Shifts', comparison.previous.shifts, comparison.current.shifts, false)}
              {renderCompareRow('Hours', comparison.previous.hours, comparison.current.hours, false)}
              {renderCompareRow('Avg $/hr', comparison.previous.avgHourly, comparison.current.avgHourly)}
              {renderCompareRow('Avg/Shift', comparison.previous.avgShift, comparison.current.avgShift)}
            </View>
          </View>
        )}

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
  // Compare Toggle
  compareToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compareToggleActive: {
    backgroundColor: colors.accentDim,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  compareToggleText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  compareToggleTextActive: {
    color: colors.accent,
  },
  compareToggleArrow: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
  },
  // Compare Section
  compareSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  compareModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  compareModeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  compareModeBtnActive: {
    backgroundColor: colors.accent,
  },
  compareModeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  compareModeTextActive: {
    color: colors.background,
  },
  // Custom Dates
  customDatesContainer: {
    marginBottom: spacing.md,
  },
  customPeriodBlock: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  customPeriodTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  customDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  customDateLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    width: 40,
  },
  customDatePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  customDateNav: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customDateNavText: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '700',
  },
  customDateValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: spacing.sm,
    minWidth: 100,
    textAlign: 'center',
  },
  // Period Labels
  comparePeriodLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  comparePeriodLabelBox: {
    flex: 1,
    alignItems: 'center',
  },
  comparePeriodLabelTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparePeriodLabelDates: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  comparePeriodVs: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '700',
    marginHorizontal: spacing.sm,
  },
  // Big Comparison
  compareBigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  compareBigCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  compareBigValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  compareBigLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  compareBigChange: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  compareBigPct: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textMuted,
  },
  // Detailed Compare Rows
  compareMetrics: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  compareRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  compareMetricLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  compareValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparePrevValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    flex: 1,
  },
  compareArrow: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },
  compareCurValue: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  changeText: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    marginLeft: spacing.sm,
    minWidth: 50,
    textAlign: 'right',
  },
  // Existing styles
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
