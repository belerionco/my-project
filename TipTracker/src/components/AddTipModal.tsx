import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { ShiftType } from '../types';
import { toDateKey, calculateHoursWorked, formatHoursMinutes } from '../utils/helpers';

interface AddTipModalProps {
  visible: boolean;
  onClose: () => void;
  initialDate?: string;
}

const SHIFT_TYPES: { value: ShiftType; label: string }[] = [
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'double', label: 'Double' },
  { value: 'other', label: 'Other' },
];

export default function AddTipModal({ visible, onClose, initialDate }: AddTipModalProps) {
  const { addEntry } = useApp();
  const [date, setDate] = useState(initialDate || toDateKey(new Date()));
  const [useTimeCalculator, setUseTimeCalculator] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [cashTips, setCashTips] = useState('');
  const [cardTips, setCardTips] = useState('');
  const [tipOut, setTipOut] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType>('dinner');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setDate(initialDate || toDateKey(new Date()));
    setUseTimeCalculator(true);
    setStartTime('');
    setEndTime('');
    setHoursWorked('');
    setCashTips('');
    setCardTips('');
    setTipOut('');
    setShiftType('dinner');
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
      shiftType,
      notes: notes.trim() || undefined,
    };

    if (entry.hoursWorked <= 0 && entry.cashTips <= 0 && entry.cardTips <= 0) return;

    addEntry(entry);
    resetForm();
    onClose();
  };

  const totalNet = (parseFloat(cashTips) || 0) + (parseFloat(cardTips) || 0) - (parseFloat(tipOut) || 0);

  // Calculate hours in real-time
  const calculatedHours = useTimeCalculator && startTime && endTime
    ? calculateHoursWorked(startTime, endTime) || 0
    : parseFloat(hoursWorked) || 0;

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
              <Text style={styles.title}>Enter Tips</Text>
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

            {/* Shift Type */}
            <Text style={styles.label}>Shift Type</Text>
            <View style={styles.shiftRow}>
              {SHIFT_TYPES.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.shiftBtn, shiftType === s.value && styles.shiftBtnActive]}
                  onPress={() => setShiftType(s.value)}
                >
                  <Text style={[styles.shiftBtnText, shiftType === s.value && styles.shiftBtnTextActive]}>
                    {s.label}
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

            {/* Total Preview */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Net Tips</Text>
              <Text style={[styles.totalValue, totalNet < 0 && { color: colors.red }]}>
                ${totalNet.toFixed(2)}
              </Text>
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
  totalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  totalValue: {
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
