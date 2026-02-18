import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { formatCurrency } from '../utils/helpers';
import PaycheckScreen from './PaycheckScreen';

type Tab = 'paycheck' | 'cash';

const BILLS = [
  { label: '$1', value: 1 },
  { label: '$2', value: 2 },
  { label: '$5', value: 5 },
  { label: '$10', value: 10 },
  { label: '$20', value: 20 },
  { label: '$100', value: 100 },
];

function CashCalculator() {
  const [counts, setCounts] = useState<Record<number, number>>({
    1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 100: 0,
  });

  const updateCount = (denomination: number, text: string) => {
    const num = parseInt(text, 10);
    setCounts(prev => ({ ...prev, [denomination]: isNaN(num) ? 0 : Math.max(0, num) }));
  };

  const increment = (denomination: number) => {
    setCounts(prev => ({ ...prev, [denomination]: prev[denomination] + 1 }));
  };

  const decrement = (denomination: number) => {
    setCounts(prev => ({ ...prev, [denomination]: Math.max(0, prev[denomination] - 1) }));
  };

  const total = BILLS.reduce((sum, bill) => sum + bill.value * counts[bill.value], 0);
  const totalBills = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const reset = () => {
    setCounts({ 1: 0, 2: 0, 5: 0, 10: 0, 20: 0, 100: 0 });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.titleRow}>
        <Text style={styles.title}>Cash Calculator</Text>
        <TouchableOpacity onPress={reset} style={styles.resetBtn}>
          <Text style={styles.resetBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Total at top */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Cash</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        <Text style={styles.totalBills}>{totalBills} bill{totalBills !== 1 ? 's' : ''}</Text>
      </View>

      {/* Bill denominations */}
      <View style={styles.billsCard}>
        {BILLS.map((bill) => {
          const subtotal = bill.value * counts[bill.value];
          return (
            <View key={bill.value} style={styles.billRow}>
              <View style={styles.billLabelCol}>
                <Text style={styles.billLabel}>{bill.label}</Text>
              </View>

              <View style={styles.billControls}>
                <TouchableOpacity
                  style={[styles.stepBtn, counts[bill.value] === 0 && styles.stepBtnDisabled]}
                  onPress={() => decrement(bill.value)}
                  disabled={counts[bill.value] === 0}
                >
                  <Text style={[styles.stepBtnText, counts[bill.value] === 0 && styles.stepBtnTextDisabled]}>-</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.countInput}
                  value={counts[bill.value] === 0 ? '' : counts[bill.value].toString()}
                  onChangeText={(text) => updateCount(bill.value, text)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  textAlign="center"
                />

                <TouchableOpacity style={styles.stepBtn} onPress={() => increment(bill.value)}>
                  <Text style={styles.stepBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.billSubtotal}>
                {subtotal > 0 ? formatCurrency(subtotal) : '-'}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Breakdown summary */}
      {total > 0 && (
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Breakdown</Text>
          {BILLS.filter(b => counts[b.value] > 0).map(bill => (
            <View key={bill.value} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {counts[bill.value]} x {bill.label}
              </Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(bill.value * counts[bill.value])}
              </Text>
            </View>
          ))}
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownTotalLabel}>Total</Text>
            <Text style={styles.breakdownTotalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
      )}

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
  );
}

export default function AdvancedScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('paycheck');

  return (
    <View style={styles.outerContainer}>
      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'paycheck' && styles.tabBtnActive]}
          onPress={() => setActiveTab('paycheck')}
        >
          <Text style={[styles.tabText, activeTab === 'paycheck' && styles.tabTextActive]}>
            Paycheck
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'cash' && styles.tabBtnActive]}
          onPress={() => setActiveTab('cash')}
        >
          <Text style={[styles.tabText, activeTab === 'cash' && styles.tabTextActive]}>
            Cash Counter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'paycheck' ? <PaycheckScreen /> : <CashCalculator />}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
  },

  // Cash Calculator
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
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
  resetBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  resetBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },
  totalLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    color: colors.accent,
  },
  totalBills: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  billsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  billLabelCol: {
    width: 50,
  },
  billLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  billControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  stepBtnText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.background,
  },
  stepBtnTextDisabled: {
    color: colors.textMuted,
  },
  countInput: {
    width: 60,
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    textAlign: 'center',
  },
  billSubtotal: {
    width: 70,
    textAlign: 'right',
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  breakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  breakdownTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  breakdownTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
  },
});
