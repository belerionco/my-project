import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  totalTips, totalHours, formatCurrency, getWageForEntry,
  toDateKey, parseDate,
} from '../utils/helpers';
import { TipEntry } from '../types';

type PayPeriodType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
type TaxMode = 'actual' | 'estimate';

interface OtherDeduction {
  id: string;
  label: string;
  amount: string;
}

interface PaycheckScreenProps {
  visible: boolean;
  onClose: () => void;
}

function getDefaultDates(type: PayPeriodType): { start: string; end: string } {
  const today = new Date();
  const end = toDateKey(today);
  let start = new Date(today);
  switch (type) {
    case 'weekly':      start.setDate(today.getDate() - 6);  break;
    case 'biweekly':    start.setDate(today.getDate() - 13); break;
    case 'semimonthly': start.setDate(today.getDate() - 14); break;
    case 'monthly':     start.setMonth(today.getMonth() - 1); break;
  }
  return { start: toDateKey(start), end };
}

function getEntriesInRange(entries: TipEntry[], start: string, end: string): TipEntry[] {
  return entries.filter(e => e.date >= start && e.date <= end);
}

function changeDateByOne(dateStr: string, offset: number): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] + offset);
  return toDateKey(d);
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PaycheckScreen({ visible, onClose }: PaycheckScreenProps) {
  const { entries, profile, workplaces } = useApp();

  // Pay Period
  const [payPeriodType, setPayPeriodType] = useState<PayPeriodType>('biweekly');
  const [startDate, setStartDate] = useState(() => getDefaultDates('biweekly').start);
  const [endDate, setEndDate] = useState(() => getDefaultDates('biweekly').end);

  // Hours Verification
  const [paycheckHours, setPaycheckHours] = useState('');

  // Earnings
  const [grossWages, setGrossWages] = useState('');
  const [declaredTips, setDeclaredTips] = useState('');

  // Deductions
  const [healthInsurance, setHealthInsurance] = useState('');
  const [retirement401k, setRetirement401k] = useState('');
  const [otherDeductions, setOtherDeductions] = useState<OtherDeduction[]>([]);
  const [newDeductLabel, setNewDeductLabel] = useState('');
  const [newDeductAmount, setNewDeductAmount] = useState('');

  // Taxes
  const [taxMode, setTaxMode] = useState<TaxMode>('actual');
  const [federalTaxActual, setFederalTaxActual] = useState('');
  const [stateTaxActual, setStateTaxActual] = useState('');
  const [ficaTaxActual, setFicaTaxActual] = useState('');
  const [federalTaxRate, setFederalTaxRate] = useState('22');
  const [stateTaxRate, setStateTaxRate] = useState('5');

  // App-tracked data for the date range
  const periodEntries = useMemo(
    () => getEntriesInRange(entries, startDate, endDate),
    [entries, startDate, endDate],
  );

  const appHours = useMemo(() => totalHours(periodEntries), [periodEntries]);
  const appTips = useMemo(() => periodEntries.reduce((s, e) => s + totalTips(e), 0), [periodEntries]);
  const fallbackWage = profile.hourlyWage || 0;
  const appWages = useMemo(
    () => periodEntries.reduce((s, e) => s + getWageForEntry(e, workplaces, fallbackWage) * e.hoursWorked, 0),
    [periodEntries, workplaces, fallbackWage],
  );

  // Computed paycheck values
  const grossWagesNum = parseFloat(grossWages) || 0;
  const declaredTipsNum = parseFloat(declaredTips) || 0;
  const grossPay = grossWagesNum + declaredTipsNum;

  const healthNum = parseFloat(healthInsurance) || 0;
  const k401Num = parseFloat(retirement401k) || 0;
  const otherDeductTotal = otherDeductions.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);
  const totalDeductions = healthNum + k401Num + otherDeductTotal;

  let federalTax = 0, stateTax = 0, ficaTax = 0;
  if (taxMode === 'actual') {
    federalTax = parseFloat(federalTaxActual) || 0;
    stateTax = parseFloat(stateTaxActual) || 0;
    ficaTax = parseFloat(ficaTaxActual) || 0;
  } else {
    // Estimate: FICA is always 7.65% on wages (Social Security 6.2% + Medicare 1.45%)
    federalTax = grossPay * ((parseFloat(federalTaxRate) || 0) / 100);
    stateTax = grossPay * ((parseFloat(stateTaxRate) || 0) / 100);
    ficaTax = grossWagesNum * 0.0765;
  }
  const totalTaxes = federalTax + stateTax + ficaTax;

  const netPay = grossPay - totalDeductions - totalTaxes;

  // Hours discrepancy
  const paycheckHoursNum = parseFloat(paycheckHours) || 0;
  const hoursDiff = paycheckHoursNum > 0 ? paycheckHoursNum - appHours : null;
  const hoursMatch = hoursDiff !== null && Math.abs(hoursDiff) <= 0.25;

  const applyPayPeriodType = (type: PayPeriodType) => {
    setPayPeriodType(type);
    const dates = getDefaultDates(type);
    setStartDate(dates.start);
    setEndDate(dates.end);
  };

  const addOtherDeduction = () => {
    if (!newDeductLabel.trim() || !newDeductAmount) return;
    setOtherDeductions(prev => [
      ...prev,
      { id: Date.now().toString(), label: newDeductLabel.trim(), amount: newDeductAmount },
    ]);
    setNewDeductLabel('');
    setNewDeductAmount('');
  };

  const removeOtherDeduction = (id: string) => {
    setOtherDeductions(prev => prev.filter(d => d.id !== id));
  };

  const reset = () => {
    const dates = getDefaultDates(payPeriodType);
    setStartDate(dates.start);
    setEndDate(dates.end);
    setPaycheckHours('');
    setGrossWages('');
    setDeclaredTips('');
    setHealthInsurance('');
    setRetirement401k('');
    setOtherDeductions([]);
    setNewDeductLabel('');
    setNewDeductAmount('');
    setFederalTaxActual('');
    setStateTaxActual('');
    setFicaTaxActual('');
  };

  const renderSectionHeader = (title: string) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const renderInputRow = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { suffix?: string; hint?: string; keyboardType?: 'decimal-pad' | 'default' },
  ) => (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {opts?.hint && <Text style={styles.inputHint}>{opts.hint}</Text>}
      </View>
      <View style={styles.inputRow}>
        {!opts?.suffix && <Text style={styles.inputPrefix}>$</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType={opts?.keyboardType ?? 'decimal-pad'}
        />
        {opts?.suffix && <Text style={styles.inputSuffix}>{opts.suffix}</Text>}
      </View>
    </View>
  );

  const renderDatePicker = (label: string, value: string, onChange: (v: string) => void) => (
    <View style={styles.datePickerRow}>
      <Text style={styles.datePickerLabel}>{label}</Text>
      <View style={styles.datePicker}>
        <TouchableOpacity style={styles.dateNav} onPress={() => onChange(changeDateByOne(value, -1))}>
          <Text style={styles.dateNavText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.dateValue}>{formatDate(value)}</Text>
        <TouchableOpacity style={styles.dateNav} onPress={() => onChange(changeDateByOne(value, 1))}>
          <Text style={styles.dateNavText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Paycheck Calculator</Text>
          <TouchableOpacity onPress={reset} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.textMuted }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ── PAY PERIOD ─────────────────────────────────── */}
          {renderSectionHeader('Pay Period')}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Period Type</Text>
            <View style={styles.toggleRow}>
              {(['weekly', 'biweekly', 'semimonthly', 'monthly'] as PayPeriodType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.toggleBtn, payPeriodType === type && styles.toggleBtnActive]}
                  onPress={() => applyPayPeriodType(type)}
                >
                  <Text style={[styles.toggleText, payPeriodType === type && styles.toggleTextActive]}>
                    {type === 'biweekly' ? 'Bi-wkly' : type === 'semimonthly' ? 'Semi-mo' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: spacing.md }}>
              {renderDatePicker('Start', startDate, setStartDate)}
              {renderDatePicker('End', endDate, setEndDate)}
            </View>

            <View style={styles.appDataRow}>
              <Text style={styles.appDataLabel}>Shifts in period</Text>
              <Text style={styles.appDataValue}>{periodEntries.length}</Text>
            </View>
          </View>

          {/* ── HOURS VERIFICATION ─────────────────────────── */}
          {renderSectionHeader('Hours Verification')}
          <View style={styles.card}>
            <View style={styles.hoursCompareRow}>
              <View style={styles.hoursBox}>
                <Text style={styles.hoursBoxLabel}>App Tracked</Text>
                <Text style={styles.hoursBoxValue}>{appHours.toFixed(2)}</Text>
                <Text style={styles.hoursBoxUnit}>hrs</Text>
              </View>
              <View style={styles.hoursVs}>
                {hoursDiff !== null ? (
                  hoursMatch ? (
                    <Text style={styles.hoursMatch}>Match</Text>
                  ) : (
                    <>
                      <Text style={[styles.hoursDiff, { color: colors.red }]}>
                        {hoursDiff > 0 ? '+' : ''}{hoursDiff.toFixed(2)} hrs
                      </Text>
                      <Text style={styles.hoursDiffLabel}>discrepancy</Text>
                    </>
                  )
                ) : (
                  <Text style={styles.hoursVsText}>vs</Text>
                )}
              </View>
              <View style={styles.hoursBox}>
                <Text style={styles.hoursBoxLabel}>On Paycheck</Text>
                <TextInput
                  style={styles.hoursInput}
                  value={paycheckHours}
                  onChangeText={setPaycheckHours}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  textAlign="center"
                />
                <Text style={styles.hoursBoxUnit}>hrs</Text>
              </View>
            </View>

            {hoursDiff !== null && !hoursMatch && (
              <View style={styles.discrepancyBanner}>
                <Text style={styles.discrepancyText}>
                  Your paycheck shows {hoursDiff > 0 ? Math.abs(hoursDiff).toFixed(2) + ' more hours than' : Math.abs(hoursDiff).toFixed(2) + ' fewer hours than'} the app tracked. Verify with your employer.
                </Text>
              </View>
            )}

            <View style={[styles.appDataRow, { marginTop: spacing.md }]}>
              <Text style={styles.appDataLabel}>App-tracked wages</Text>
              <Text style={styles.appDataValue}>{formatCurrency(appWages)}</Text>
            </View>
            <View style={styles.appDataRow}>
              <Text style={styles.appDataLabel}>App-tracked tips (net)</Text>
              <Text style={styles.appDataValue}>{formatCurrency(appTips)}</Text>
            </View>
          </View>

          {/* ── EARNINGS ───────────────────────────────────── */}
          {renderSectionHeader('Earnings')}
          <View style={styles.card}>
            {renderInputRow('Gross Wages on Paycheck', grossWages, setGrossWages, { hint: 'Before deductions & tax' })}
            {renderInputRow('Tips Declared on Paycheck', declaredTips, setDeclaredTips, { hint: 'If employer includes tips' })}
            <View style={[styles.totalRow, { marginTop: spacing.sm }]}>
              <Text style={styles.totalLabel}>Gross Pay</Text>
              <Text style={styles.totalValue}>{formatCurrency(grossPay)}</Text>
            </View>
          </View>

          {/* ── DEDUCTIONS ─────────────────────────────────── */}
          {renderSectionHeader('Deductions')}
          <View style={styles.card}>
            {renderInputRow('Health Insurance', healthInsurance, setHealthInsurance)}
            {renderInputRow('401(k) / Retirement', retirement401k, setRetirement401k)}

            {/* Other Deductions List */}
            {otherDeductions.map(d => (
              <View key={d.id} style={styles.otherDeductRow}>
                <Text style={styles.otherDeductLabel}>{d.label}</Text>
                <Text style={styles.otherDeductAmount}>-{formatCurrency(parseFloat(d.amount) || 0)}</Text>
                <TouchableOpacity onPress={() => removeOtherDeduction(d.id)} style={styles.removeBtn}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Other Deduction */}
            <Text style={styles.cardLabel}>Add Other Deduction</Text>
            <View style={styles.addDeductRow}>
              <TextInput
                style={[styles.input, styles.deductLabelInput]}
                value={newDeductLabel}
                onChangeText={setNewDeductLabel}
                placeholder="Label (e.g. Dental)"
                placeholderTextColor={colors.textMuted}
                keyboardType="default"
              />
              <View style={styles.deductAmountWrap}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newDeductAmount}
                  onChangeText={setNewDeductAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <TouchableOpacity
                style={[styles.addBtn, (!newDeductLabel.trim() || !newDeductAmount) && styles.addBtnDisabled]}
                onPress={addOtherDeduction}
              >
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.totalRow, { marginTop: spacing.sm }]}>
              <Text style={styles.totalLabel}>Total Deductions</Text>
              <Text style={[styles.totalValue, { color: colors.red }]}>-{formatCurrency(totalDeductions)}</Text>
            </View>
          </View>

          {/* ── TAXES ──────────────────────────────────────── */}
          {renderSectionHeader('Tax Breakdown')}
          <View style={styles.card}>
            {/* Tax Mode Toggle */}
            <View style={styles.taxModeRow}>
              <TouchableOpacity
                style={[styles.taxModeBtn, taxMode === 'actual' && styles.taxModeBtnActive]}
                onPress={() => setTaxMode('actual')}
              >
                <Text style={[styles.taxModeText, taxMode === 'actual' && styles.taxModeTextActive]}>
                  Enter Actual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.taxModeBtn, taxMode === 'estimate' && styles.taxModeBtnActive]}
                onPress={() => setTaxMode('estimate')}
              >
                <Text style={[styles.taxModeText, taxMode === 'estimate' && styles.taxModeTextActive]}>
                  Estimate
                </Text>
              </TouchableOpacity>
            </View>

            {taxMode === 'actual' ? (
              <>
                <Text style={styles.taxModeHint}>Enter amounts withheld from your pay stub</Text>
                {renderInputRow('Federal Income Tax', federalTaxActual, setFederalTaxActual)}
                {renderInputRow('State Income Tax', stateTaxActual, setStateTaxActual)}
                {renderInputRow('FICA (SS + Medicare)', ficaTaxActual, setFicaTaxActual)}
              </>
            ) : (
              <>
                <Text style={styles.taxModeHint}>Estimates based on your gross pay. FICA is auto-calculated at 7.65%.</Text>
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.inputLabel}>Federal Tax Rate</Text>
                    <Text style={styles.inputHint}>{formatCurrency(federalTax)}</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={federalTaxRate}
                      onChangeText={setFederalTaxRate}
                      placeholder="22"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelRow}>
                    <Text style={styles.inputLabel}>State Tax Rate</Text>
                    <Text style={styles.inputHint}>{formatCurrency(stateTax)}</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={stateTaxRate}
                      onChangeText={setStateTaxRate}
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                </View>
                <View style={styles.appDataRow}>
                  <Text style={styles.appDataLabel}>FICA (7.65% of wages)</Text>
                  <Text style={styles.appDataValue}>{formatCurrency(ficaTax)}</Text>
                </View>
              </>
            )}

            <View style={[styles.totalRow, { marginTop: spacing.sm }]}>
              <Text style={styles.totalLabel}>Total Taxes</Text>
              <Text style={[styles.totalValue, { color: colors.red }]}>-{formatCurrency(totalTaxes)}</Text>
            </View>
          </View>

          {/* ── SUMMARY ────────────────────────────────────── */}
          {renderSectionHeader('Summary')}
          <View style={[styles.card, styles.summaryCard]}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Pay</Text>
              <Text style={styles.summaryValue}>{formatCurrency(grossPay)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelGroup}>
                <Text style={styles.summaryLabel}>Deductions</Text>
                {totalDeductions > 0 && (
                  <Text style={styles.summarySubLabel}>
                    Health {healthNum > 0 ? formatCurrency(healthNum) : '$0.00'}  •  401k {k401Num > 0 ? formatCurrency(k401Num) : '$0.00'}
                    {otherDeductions.length > 0 ? `  •  Other ${formatCurrency(otherDeductTotal)}` : ''}
                  </Text>
                )}
              </View>
              <Text style={[styles.summaryValue, { color: colors.red }]}>-{formatCurrency(totalDeductions)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelGroup}>
                <Text style={styles.summaryLabel}>Taxes Withheld</Text>
                {totalTaxes > 0 && (
                  <Text style={styles.summarySubLabel}>
                    Fed {formatCurrency(federalTax)}  •  State {formatCurrency(stateTax)}  •  FICA {formatCurrency(ficaTax)}
                  </Text>
                )}
              </View>
              <Text style={[styles.summaryValue, { color: colors.red }]}>-{formatCurrency(totalTaxes)}</Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.netPayRow}>
              <Text style={styles.netPayLabel}>Net Pay</Text>
              <Text style={[styles.netPayValue, netPay < 0 && { color: colors.red }]}>
                {formatCurrency(netPay)}
              </Text>
            </View>

            {/* App Comparison */}
            {appWages > 0 && (
              <>
                <View style={styles.summaryDivider} />
                <Text style={styles.comparisonTitle}>App Tracked This Period</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Wages (tracked)</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(appWages)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Net Tips (tracked)</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(appTips)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total (tracked)</Text>
                  <Text style={[styles.summaryValue, { color: colors.accent }]}>
                    {formatCurrency(appWages + appTips)}
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={{ height: spacing.xxl }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBtn: {
    minWidth: 60,
  },
  headerBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  scroll: {
    padding: spacing.lg,
  },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: colors.accent + '44',
  },
  cardLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  // Period type toggle
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: colors.accent,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
  },
  // Date picker
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  datePickerLabel: {
    width: 44,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  datePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  dateNav: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavText: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '700',
  },
  dateValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  // App data
  appDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  appDataLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  appDataValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  // Hours comparison
  hoursCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hoursBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  hoursBoxLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  hoursBoxValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  hoursInput: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    minWidth: 80,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.xs,
  },
  hoursBoxUnit: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  hoursVs: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  hoursVsText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '700',
  },
  hoursMatch: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '800',
    textAlign: 'center',
  },
  hoursDiff: {
    fontSize: fontSize.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  hoursDiffLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  discrepancyBanner: {
    backgroundColor: colors.redDim,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.red + '66',
  },
  discrepancyText: {
    fontSize: fontSize.xs,
    color: colors.red,
    fontWeight: '600',
    lineHeight: 18,
  },
  // Inputs
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputPrefix: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent,
    marginRight: spacing.xs,
  },
  inputSuffix: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  // Other deductions
  otherDeductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  otherDeductLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  otherDeductAmount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.red,
    marginRight: spacing.sm,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 10,
    color: colors.red,
    fontWeight: '800',
  },
  addDeductRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  deductLabelInput: {
    flex: 1.5,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
  },
  deductAmountWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  addBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.background,
  },
  // Tax mode
  taxModeRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  taxModeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  taxModeBtnActive: {
    backgroundColor: colors.accent,
  },
  taxModeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  taxModeTextActive: {
    color: colors.background,
  },
  taxModeHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  // Totals
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  totalValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  summaryLabelGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  summarySubLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 14,
  },
  summaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  netPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  netPayLabel: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  netPayValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
  },
  comparisonTitle: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
});
