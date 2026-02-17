import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { toDateKey, calculateHoursWorked, formatHoursMinutes, getWageForEntry } from '../utils/helpers';
import { TipEntry, ShiftType } from '../types';

interface AddTipModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: string;
  editingEntry?: TipEntry;
}

export default function AddTipModal({ visible, onClose, initialDate, editingEntry }: AddTipModalProps) {
  const { addEntry, updateEntry, workplaces, profile } = useApp();
  const [date, setDate] = useState(initialDate || toDateKey(new Date()));

  useEffect(() => {
    if (visible) {
      if (editingEntry) {
        // Populate form with existing entry data
        setDate(editingEntry.date);
        setHoursWorked(editingEntry.hoursWorked.toString());
        setCashTips(editingEntry.cashTips.toString());
        setCardTips(editingEntry.cardTips.toString());
        setTipOut(editingEntry.tipOut.toString());
        setTotalSales(editingEntry.totalSales ? editingEntry.totalSales.toString() : '');
        setSelectedWorkplaceId(editingEntry.workplaceId);
        setShiftType(editingEntry.shiftType || 'other');
        setNotes(editingEntry.notes || '');
        if (editingEntry.startTime && editingEntry.endTime) {
          setUseTimeCalculator(true);
          setStartTime(editingEntry.startTime);
          setEndTime(editingEntry.endTime);
        } else {
          setUseTimeCalculator(false);
        }
      } else {
        setDate(initialDate || toDateKey(new Date()));
      }
    }
  }, [visible, initialDate, editingEntry]);
  const [useTimeCalculator, setUseTimeCalculator] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [cardTips, setCardTips] = useState('');
  const [tipOut, setTipOut] = useState('');
  const [totalSales, setTotalSales] = useState('');
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | undefined>(undefined);
  const [shiftType, setShiftType] = useState<ShiftType>('other');
  const [notes, setNotes] = useState('');

  // Auto-select if only one workplace
  useEffect(() => {
    if (workplaces.length === 1) {
      setSelectedWorkplaceId(workplaces[0].id);
    }
  }, [workplaces]);

  const resetForm = () => {
    setDate(initialDate || toDateKey(new Date()));
    setUseTimeCalculator(true);
    setStartTime('');
    setEndTime('');
    setHoursWorked('');
    setCashTips('');
    setCardTips('');
    setTipOut('');
    setTotalSales('');
    setSelectedWorkplaceId(workplaces.length === 1 ? workplaces[0].id : undefined);
    setShiftType('other');
    setNotes('');
  };

  const handleSave = () => {
    let calculatedHours = 0;

    if (useTimeCalculator && startTime && endTime) {
      const hours = calculateHoursWorked(startTime, endTime);
      if (hours !== null) {
        calculatedHours = hours;
      }
    } else {
      calculatedHours = parseFloat(hoursWorked) || 0;
    }

    const entry = {
      date,
      hoursWorked: calculatedHours,
      startTime: useTimeCalculator ? startTime : undefined,
      endTime: useTimeCalculator ? endTime : undefined,
      cashTips: parseFloat(cashTips) || 0,
      cardTips: parseFloat(cardTips) || 0,
      tipOut: parseFloat(tipOut) || 0,
      totalSales: parseFloat(totalSales) || undefined,
      shiftType,
      notes: notes.trim() || undefined,
      workplaceId: selectedWorkplaceId,
    };

    if (entry.hoursWorked <= 0 && entry.cashTips <= 0 && entry.cardTips <= 0) return;

    if (editingEntry) {
      updateEntry(editingEntry.id, entry);
    } else {
      addEntry(entry);
    }
    resetForm();
    onClose();
  };

  const totalNet = (parseFloat(cashTips) || 0) + (parseFloat(cardTips) || 0) - (parseFloat(tipOut) || 0);

  // Calculate hours in real-time
  const calculatedHours = useTimeCalculator && startTime && endTime
    ? calculateHoursWorked(startTime, endTime) || 0
    : parseFloat(hoursWorked) || 0;

  // Calculate wage earnings
  const selectedWorkplace = workplaces.find(w => w.id === selectedWorkplaceId);
  const hourlyWage = selectedWorkplace
    ? getWageForEntry({ date, workplaceId: selectedWorkplaceId, hoursWorked: calculatedHours, cashTips: 0, cardTips: 0, tipOut: 0, shiftType: 'other', id: '' }, workplaces, profile.hourlyWage || 0)
    : (profile.hourlyWage || 0);
  const wageEarnings = calculatedHours * hourlyWage;
  const grandTotal = totalNet + wageEarnings;

  // Date navigation
  const changeDate = (offset: number) => {
    const parts = date.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + offset);
    setDate(toDateKey(d));
  };

  const formattedDate = (() => {
    const parts = date.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  })();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { resetForm(); onClose(); }}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{editingEntry ? 'Edit Tips' : 'Enter Tips'}</Text>
              <TouchableOpacity onPress={handleSave}>
                <Text style={styles.saveBtn}>Save</Text>
              </TouchableOpacity>
            </View>

            {/* Date Selector */}
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateNav}>
                <Text style={styles.dateNavText}>{'<'}</Text>
              </TouchableOpacity>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateNav}>
                <Text style={styles.dateNavText}>{'>'}</Text>
              </TouchableOpacity>
            </View>

            {/* Workplace Selector */}
            {workplaces.length > 0 && (
              <>
                <Text style={styles.label}>Job</Text>
                <View style={styles.shiftRow}>
                  {workplaces.map(wp => (
                    <TouchableOpacity
                      key={wp.id}
                      style={[styles.shiftBtn, selectedWorkplaceId === wp.id && styles.shiftBtnActive]}
                      onPress={() => setSelectedWorkplaceId(wp.id)}
                    >
                      <Text style={[styles.shiftBtnText, selectedWorkplaceId === wp.id && styles.shiftBtnTextActive]}>
                        {wp.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Shift Type */}
            <Text style={styles.label}>Shift</Text>
            <View style={styles.shiftRow}>
              {(['breakfast', 'lunch', 'dinner'] as ShiftType[]).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.shiftBtn, shiftType === type && styles.shiftBtnActive]}
                  onPress={() => setShiftType(type)}
                >
                  <Text style={[styles.shiftBtnText, shiftType === type && styles.shiftBtnTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hours - Toggle between time calculator and manual */}
            <View style={styles.hoursHeader}>
              <Text style={styles.label}>Hours Worked</Text>
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setUseTimeCalculator(!useTimeCalculator)}
              >
                <Text style={styles.toggleText}>
                  {useTimeCalculator ? '⏰ Time' : '✏️ Manual'}
                </Text>
              </TouchableOpacity>
            </View>

            {useTimeCalculator ? (
              <>
                {/* Start Time */}
                <Text style={styles.subLabel}>Start Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="10:00 AM"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />

                {/* End Time */}
                <Text style={styles.subLabel}>End Time</Text>
                <TextInput
                  style={styles.timeInput}
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="3:30 PM"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />

                {/* Show calculated hours */}
                {calculatedHours > 0 && (
                  <View style={styles.calculatedHoursRow}>
                    <Text style={styles.calculatedHoursLabel}>Total:</Text>
                    <Text style={styles.calculatedHoursValue}>
                      {formatHoursMinutes(calculatedHours)} ({calculatedHours.toFixed(2)} hrs)
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={hoursWorked}
                  onChangeText={setHoursWorked}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputSuffix}>hrs</Text>
              </View>
            )}

            {/* Cash Tips */}
            <Text style={styles.label}>Cash Tips</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={cashTips}
                onChangeText={setCashTips}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Card Tips */}
            <Text style={styles.label}>Card Tips</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={cardTips}
                onChangeText={setCardTips}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Tip Out */}
            <Text style={styles.label}>Tip Out</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={tipOut}
                onChangeText={setTipOut}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Total Sales (optional) */}
            <Text style={styles.label}>Total Sales (optional)</Text>
            <View style={styles.inputRow}>
              <Text style={styles.inputPrefix}>$</Text>
              <TextInput
                style={styles.input}
                value={totalSales}
                onChangeText={setTotalSales}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Wage Earnings (auto-calculated) */}
            {calculatedHours > 0 && hourlyWage > 0 && (
              <>
                <Text style={styles.label}>Wage Earned</Text>
                <View style={styles.wageRow}>
                  <Text style={styles.wageDetail}>
                    {calculatedHours.toFixed(2)} hrs × ${hourlyWage.toFixed(2)}/hr
                  </Text>
                  <Text style={styles.wageValue}>${wageEarnings.toFixed(2)}</Text>
                </View>
              </>
            )}

            {/* Notes */}
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. busy night, event, etc."
              placeholderTextColor={colors.textMuted}
              multiline
            />

            {/* Totals */}
            <View style={styles.totalsCard}>
              <View style={styles.totalsRow}>
                <Text style={styles.netLabel}>Net Tips</Text>
                <Text style={[styles.netValue, totalNet < 0 && { color: colors.red }]}>
                  ${totalNet.toFixed(2)}
                </Text>
              </View>
              {calculatedHours > 0 && hourlyWage > 0 && (
                <>
                  <View style={styles.totalsDivider} />
                  <View style={styles.totalsRow}>
                    <Text style={styles.grandTotalLabel}>Total Earned</Text>
                    <Text style={[styles.grandTotalValue, grandTotal < 0 && { color: colors.red }]}>
                      ${grandTotal.toFixed(2)}
                    </Text>
                  </View>
                </>
              )}
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cancelBtn: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  saveBtn: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  dateNav: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNavText: {
    fontSize: fontSize.lg,
    color: colors.accent,
    fontWeight: '700',
  },
  dateText: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shiftBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  shiftBtnActive: {
    backgroundColor: colors.accent,
  },
  shiftBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  shiftBtnTextActive: {
    color: colors.background,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
  },
  inputPrefix: {
    fontSize: fontSize.xl,
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
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    minHeight: 60,
  },
  wageRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wageDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  wageValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.gold,
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  netValue: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  totalsDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  grandTotalLabel: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.accent,
  },
  hoursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  toggleBtn: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  toggleText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
  },
  subLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  timeInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  calculatedHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  calculatedHoursLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  calculatedHoursValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.accent,
  },
});
