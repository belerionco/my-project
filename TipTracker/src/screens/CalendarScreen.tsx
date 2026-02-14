import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  getEntriesForMonth,
  getDaysInMonth,
  getFirstDayOfMonth,
  totalTips,
  formatCurrency,
  toDateKey,
  MONTH_NAMES,
  DAY_NAMES,
} from '../utils/helpers';
import { TipEntry } from '../types';

interface CalendarScreenProps {
  onAddTip: (date?: string) => void;
}

export default function CalendarScreen({ onAddTip }: CalendarScreenProps) {
  const { entries, deleteEntry } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthEntries = useMemo(() => getEntriesForMonth(entries, year, month), [entries, year, month]);

  const entryMap = useMemo(() => {
    const map: Record<string, TipEntry[]> = {};
    monthEntries.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [monthEntries]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const selectedEntries = selectedDate ? entryMap[selectedDate] || [] : [];
  const selectedTotal = selectedEntries.reduce((sum, e) => sum + totalTips(e), 0);

  const monthTotal = monthEntries.reduce((sum, e) => sum + totalTips(e), 0);

  const getAmountColor = (amount: number): string => {
    if (amount >= 200) return colors.accent;
    if (amount >= 100) return colors.gold;
    if (amount > 0) return colors.textSecondary;
    return 'transparent';
  };

  const renderCalendar = () => {
    const cells: React.ReactNode[] = [];

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDateKey(new Date(year, month, day));
      const dayEntries = entryMap[dateKey] || [];
      const dayTotal = dayEntries.reduce((sum, e) => sum + totalTips(e), 0);
      const isSelected = selectedDate === dateKey;
      const isToday = dateKey === toDateKey(new Date());
      const hasEntries = dayEntries.length > 0;

      cells.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && styles.dayCellSelected,
            isToday && !isSelected && styles.dayCellToday,
          ]}
          onPress={() => setSelectedDate(dateKey)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
            {day}
          </Text>
          {hasEntries && (
            <Text style={[styles.dayAmount, { color: getAmountColor(dayTotal) }]}>
              ${Math.round(dayTotal)}
            </Text>
          )}
          {!hasEntries && <View style={styles.dayAmountPlaceholder} />}
        </TouchableOpacity>
      );
    }

    return cells;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Month Header */}
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.navButton}>
            <Text style={styles.navText}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
            <Text style={styles.monthTotal}>Total: {formatCurrency(monthTotal)}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
            <Text style={styles.navText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Day Labels */}
        <View style={styles.dayLabels}>
          {DAY_NAMES.map(d => (
            <View key={d} style={styles.dayLabelCell}>
              <Text style={styles.dayLabelText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calendarGrid}>
          {renderCalendar()}
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.addDayButton}
                onPress={() => onAddTip(selectedDate)}
              >
                <Text style={styles.addDayButtonText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {selectedEntries.length === 0 ? (
              <Text style={styles.noEntries}>No entries for this day</Text>
            ) : (
              <>
                {selectedEntries.map(entry => (
                  <View key={entry.id} style={styles.entryRow}>
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryShift}>{entry.shiftType.charAt(0).toUpperCase() + entry.shiftType.slice(1)}</Text>
                      <Text style={styles.entryHours}>{entry.hoursWorked}h</Text>
                    </View>
                    <View style={styles.entryAmounts}>
                      <Text style={styles.entryTotal}>{formatCurrency(totalTips(entry))}</Text>
                      <Text style={styles.entryBreakdown}>
                        Cash: ${entry.cashTips} | Card: ${entry.cardTips} | Out: ${entry.tipOut}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteEntry(entry.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.dayTotalRow}>
                  <Text style={styles.dayTotalLabel}>Day Total</Text>
                  <Text style={styles.dayTotalValue}>{formatCurrency(selectedTotal)}</Text>
                </View>
              </>
            )}
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
    padding: spacing.md,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
    fontSize: fontSize.lg,
    color: colors.text,
    fontWeight: '700',
  },
  monthCenter: {
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  monthTotal: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  dayLabelText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
  },
  dayCellToday: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  dayNumber: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: colors.background,
    fontWeight: '800',
  },
  dayAmount: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  dayAmountPlaceholder: {
    height: 14,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  detailsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  addDayButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addDayButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  noEntries: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryInfo: {
    marginRight: spacing.md,
  },
  entryShift: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  entryHours: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  entryAmounts: {
    flex: 1,
  },
  entryTotal: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  entryBreakdown: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: fontSize.lg,
    color: colors.red,
    fontWeight: '700',
  },
  dayTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  dayTotalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dayTotalValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.accent,
  },
});
