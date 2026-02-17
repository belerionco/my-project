import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { UserProfile, Workplace } from '../types';
import ImportModal from '../components/ImportModal';

const ROLES = ['Server', 'Bartender', 'Delivery Driver', 'Barista', 'Expo', 'Food Runner'];
const WEEK_DAYS: { key: NonNullable<UserProfile['weekStartsOn']>; label: string }[] = [
  { key: 0, label: 'Sunday' },
  { key: 1, label: 'Monday' },
  { key: 2, label: 'Tuesday' },
  { key: 3, label: 'Wednesday' },
  { key: 4, label: 'Thursday' },
  { key: 5, label: 'Friday' },
  { key: 6, label: 'Saturday' },
];

export default function SettingsScreen() {
  const {
    profile, updateProfile, resetOnboarding,
    workplaces, addWorkplace, updateWorkplace, deleteWorkplace, addWageRate, deleteWageRate,
  } = useApp();

  const [name, setName] = useState(profile.name || '');
  const [workplace, setWorkplace] = useState(profile.workplace || '');
  const [role, setRole] = useState(profile.role || '');
  const [customRole, setCustomRole] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [hourlyWage, setHourlyWage] = useState(profile.hourlyWage?.toString() || '');
  const [weekStartsOn, setWeekStartsOn] = useState<NonNullable<UserProfile['weekStartsOn']>>(profile.weekStartsOn ?? 0);
  const [dailyGoal, setDailyGoal] = useState(profile.dailyGoal?.toString() || '');
  const [monthlyGoal, setMonthlyGoal] = useState(profile.monthlyGoal?.toString() || '');
  const [yearlyGoal, setYearlyGoal] = useState(profile.yearlyGoal?.toString() || '');

  // Import modal
  const [importVisible, setImportVisible] = useState(false);

  // Workplace management
  const [expandedWp, setExpandedWp] = useState<string | null>(null);
  const [newWpName, setNewWpName] = useState('');
  const [newWpWage, setNewWpWage] = useState('');
  const [newWpRole, setNewWpRole] = useState('');
  const [newWpOvertime, setNewWpOvertime] = useState('');
  const [showAddWp, setShowAddWp] = useState(false);

  // Add wage rate
  const [addingWageFor, setAddingWageFor] = useState<string | null>(null);
  const [newRateDate, setNewRateDate] = useState('');
  const [newRateWage, setNewRateWage] = useState('');
  const [newRateOvertime, setNewRateOvertime] = useState('');

  useEffect(() => {
    if (profile.role && !ROLES.includes(profile.role)) {
      setIsCustomRole(true);
      setCustomRole(profile.role);
      setRole('');
    } else {
      setRole(profile.role || '');
    }
  }, []);

  const hasChanges = () => {
    const currentRole = isCustomRole ? customRole.trim() : role;
    const wage = parseFloat(hourlyWage);
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    const yearly = parseFloat(yearlyGoal);

    return (
      name.trim() !== (profile.name || '') ||
      workplace.trim() !== (profile.workplace || '') ||
      currentRole !== (profile.role || '') ||
      (isNaN(wage) ? undefined : wage) !== profile.hourlyWage ||
      weekStartsOn !== (profile.weekStartsOn ?? 0) ||
      (isNaN(daily) ? undefined : daily) !== profile.dailyGoal ||
      (isNaN(monthly) ? undefined : monthly) !== profile.monthlyGoal ||
      (isNaN(yearly) ? undefined : yearly) !== profile.yearlyGoal
    );
  };

  const handleSave = () => {
    const currentRole = isCustomRole ? customRole.trim() : role;
    const wage = parseFloat(hourlyWage);
    const daily = parseFloat(dailyGoal);
    const monthly = parseFloat(monthlyGoal);
    const yearly = parseFloat(yearlyGoal);

    const updates: Partial<UserProfile> = {
      name: name.trim() || undefined,
      workplace: workplace.trim() || undefined,
      role: currentRole || undefined,
      hourlyWage: !isNaN(wage) && wage > 0 ? wage : undefined,
      weekStartsOn: weekStartsOn,
      dailyGoal: !isNaN(daily) && daily > 0 ? daily : undefined,
      monthlyGoal: !isNaN(monthly) && monthly > 0 ? monthly : undefined,
      yearlyGoal: !isNaN(yearly) && yearly > 0 ? yearly : undefined,
    };

    updateProfile(updates);

    if (Platform.OS === 'web') {
      // Simple feedback on web
    } else {
      Alert.alert('Saved', 'Your settings have been updated.');
    }
  };

  const handleAddWorkplace = () => {
    if (!newWpName.trim()) return;
    const wage = parseFloat(newWpWage) || 0;
    const overtime = parseFloat(newWpOvertime) || undefined;
    addWorkplace(newWpName.trim(), wage, newWpRole.trim() || undefined, overtime);
    setNewWpName('');
    setNewWpWage('');
    setNewWpRole('');
    setNewWpOvertime('');
    setShowAddWp(false);
  };

  const handleDeleteWorkplace = (wp: Workplace) => {
    const doDelete = () => deleteWorkplace(wp.id);
    if (Platform.OS === 'web') {
      if (confirm(`Remove ${wp.name}? Existing entries will keep their data.`)) doDelete();
    } else {
      Alert.alert('Remove Workplace', `Remove ${wp.name}? Existing entries will keep their data.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const handleAddWageRate = (wpId: string) => {
    const wage = parseFloat(newRateWage);
    if (!newRateDate || isNaN(wage)) return;
    // Expect YYYY-MM-DD or YYYY format
    let effectiveDate = newRateDate.trim();
    if (/^\d{4}$/.test(effectiveDate)) {
      effectiveDate = `${effectiveDate}-01-01`;
    }
    const overtime = parseFloat(newRateOvertime) || undefined;
    addWageRate(wpId, effectiveDate, wage, overtime);
    setAddingWageFor(null);
    setNewRateDate('');
    setNewRateWage('');
    setNewRateOvertime('');
  };

  const handleRestartOnboarding = () => {
    const doReset = () => resetOnboarding();

    if (Platform.OS === 'web') {
      if (confirm('This will restart the onboarding setup. Your tip data will be kept. Continue?')) {
        doReset();
      }
    } else {
      Alert.alert(
        'Restart Onboarding',
        'This will restart the onboarding setup. Your tip data will be kept.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restart', style: 'destructive', onPress: doReset },
        ]
      );
    }
  };

  const getCurrentWage = (wp: Workplace): number => {
    if (wp.wageHistory.length === 0) return 0;
    const sorted = [...wp.wageHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    return sorted[0].hourlyWage;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Profile</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Workplace</Text>
        <TextInput
          style={styles.input}
          value={workplace}
          onChangeText={setWorkplace}
          placeholder="Restaurant or business name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Role</Text>
        <View style={styles.chipRow}>
          {ROLES.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.chip, role === r && !isCustomRole && styles.chipActive]}
              onPress={() => { setRole(r); setIsCustomRole(false); }}
            >
              <Text style={[styles.chipText, role === r && !isCustomRole && styles.chipTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, isCustomRole && styles.chipActive]}
            onPress={() => { setIsCustomRole(true); setRole(''); }}
          >
            <Text style={[styles.chipText, isCustomRole && styles.chipTextActive]}>Other...</Text>
          </TouchableOpacity>
        </View>
        {isCustomRole && (
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            value={customRole}
            onChangeText={setCustomRole}
            placeholder="Enter your role"
            placeholderTextColor={colors.textMuted}
          />
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Default Hourly Wage</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={hourlyWage}
            onChangeText={setHourlyWage}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          <Text style={styles.suffix}>/hr</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Week Starts On</Text>
        <View style={styles.chipRow}>
          {WEEK_DAYS.map(d => (
            <TouchableOpacity
              key={d.key}
              style={[styles.chip, weekStartsOn === d.key && styles.chipActive]}
              onPress={() => setWeekStartsOn(d.key)}
            >
              <Text style={[styles.chipText, weekStartsOn === d.key && styles.chipTextActive]}>
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, !hasChanges() && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges()}
      >
        <Text style={[styles.saveBtnText, !hasChanges() && styles.saveBtnTextDisabled]}>
          Save Changes
        </Text>
      </TouchableOpacity>

      {/* Workplaces & Wages */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Workplaces & Pay</Text>
      <Text style={styles.sectionSub}>
        Manage per-job pay rates. Add a new rate when you get a raise — previous entries keep the old rate.
      </Text>

      {workplaces.map(wp => {
        const isExpanded = expandedWp === wp.id;
        const sortedRates = [...wp.wageHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
        const currentWage = getCurrentWage(wp);

        return (
          <View key={wp.id} style={styles.wpCard}>
            <TouchableOpacity
              style={styles.wpHeader}
              onPress={() => setExpandedWp(isExpanded ? null : wp.id)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.wpName}>{wp.name}</Text>
                <Text style={styles.wpMeta}>
                  {wp.role ? `${wp.role} · ` : ''}${currentWage.toFixed(2)}/hr
                </Text>
              </View>
              <Text style={styles.wpChevron}>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.wpBody}>
                <Text style={styles.wpSubTitle}>Wage History</Text>
                {sortedRates.map(rate => (
                  <View key={rate.id} style={styles.rateRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rateWage}>${rate.hourlyWage.toFixed(2)}/hr
                        {rate.overtimeRate ? ` (OT: $${rate.overtimeRate.toFixed(2)})` : ''}
                      </Text>
                      <Text style={styles.rateDate}>From {rate.effectiveDate}</Text>
                    </View>
                    {sortedRates.length > 1 && (
                      <TouchableOpacity onPress={() => deleteWageRate(wp.id, rate.id)} style={styles.rateDeleteBtn}>
                        <Text style={styles.rateDeleteText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {addingWageFor === wp.id ? (
                  <View style={styles.addRateForm}>
                    <TextInput
                      style={styles.rateInput}
                      value={newRateDate}
                      onChangeText={setNewRateDate}
                      placeholder="Effective date (YYYY-MM-DD or YYYY)"
                      placeholderTextColor={colors.textMuted}
                    />
                    <View style={styles.rateInputRow}>
                      <View style={[styles.currencyRow, { flex: 1 }]}>
                        <Text style={styles.dollar}>$</Text>
                        <TextInput
                          style={styles.currencyInput}
                          value={newRateWage}
                          onChangeText={setNewRateWage}
                          placeholder="Wage"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.suffix}>/hr</Text>
                      </View>
                      <View style={[styles.currencyRow, { flex: 1, marginLeft: spacing.sm }]}>
                        <Text style={styles.dollar}>$</Text>
                        <TextInput
                          style={styles.currencyInput}
                          value={newRateOvertime}
                          onChangeText={setNewRateOvertime}
                          placeholder="OT (opt)"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="decimal-pad"
                        />
                        <Text style={styles.suffix}>/hr</Text>
                      </View>
                    </View>
                    <View style={styles.rateInputRow}>
                      <TouchableOpacity
                        style={styles.rateCancelBtn}
                        onPress={() => { setAddingWageFor(null); setNewRateDate(''); setNewRateWage(''); setNewRateOvertime(''); }}
                      >
                        <Text style={styles.rateCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rateSaveBtn} onPress={() => handleAddWageRate(wp.id)}>
                        <Text style={styles.rateSaveText}>Add Rate</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addRateBtn} onPress={() => setAddingWageFor(wp.id)}>
                    <Text style={styles.addRateBtnText}>+ Add Pay Rate</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.removeWpBtn} onPress={() => handleDeleteWorkplace(wp)}>
                  <Text style={styles.removeWpText}>Remove Workplace</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {showAddWp ? (
        <View style={styles.addWpForm}>
          <TextInput
            style={styles.input}
            value={newWpName}
            onChangeText={setNewWpName}
            placeholder="Workplace name"
            placeholderTextColor={colors.textMuted}
          />
          <TextInput
            style={[styles.input, { marginTop: spacing.sm }]}
            value={newWpRole}
            onChangeText={setNewWpRole}
            placeholder="Role (optional)"
            placeholderTextColor={colors.textMuted}
          />
          <View style={[styles.rateInputRow, { marginTop: spacing.sm }]}>
            <View style={[styles.currencyRow, { flex: 1 }]}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.currencyInput}
                value={newWpWage}
                onChangeText={setNewWpWage}
                placeholder="Wage"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.suffix}>/hr</Text>
            </View>
            <View style={[styles.currencyRow, { flex: 1, marginLeft: spacing.sm }]}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={styles.currencyInput}
                value={newWpOvertime}
                onChangeText={setNewWpOvertime}
                placeholder="OT (opt)"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.suffix}>/hr</Text>
            </View>
          </View>
          <View style={[styles.rateInputRow, { marginTop: spacing.sm }]}>
            <TouchableOpacity style={styles.rateCancelBtn} onPress={() => { setShowAddWp(false); setNewWpName(''); setNewWpWage(''); setNewWpRole(''); setNewWpOvertime(''); }}>
              <Text style={styles.rateCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rateSaveBtn} onPress={handleAddWorkplace}>
              <Text style={styles.rateSaveText}>Add Workplace</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addWpBtn} onPress={() => setShowAddWp(true)}>
          <Text style={styles.addWpBtnText}>+ Add Workplace</Text>
        </TouchableOpacity>
      )}

      {/* Goals */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Goals</Text>

      <View style={styles.field}>
        <Text style={styles.label}>Daily Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={dailyGoal}
            onChangeText={setDailyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Monthly Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={monthlyGoal}
            onChangeText={setMonthlyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Yearly Tip Goal</Text>
        <View style={styles.currencyRow}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            style={styles.currencyInput}
            value={yearlyGoal}
            onChangeText={setYearlyGoal}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Data & Import */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Data</Text>

      <TouchableOpacity style={styles.importBtn} onPress={() => setImportVisible(true)}>
        <Text style={styles.importBtnText}>Import from CSV</Text>
        <Text style={styles.importBtnSub}>
          Import tip data from another app (CSV format)
        </Text>
      </TouchableOpacity>

      {/* Setup */}
      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Setup</Text>

      <TouchableOpacity style={styles.onboardingBtn} onPress={handleRestartOnboarding}>
        <Text style={styles.onboardingBtnText}>Restart Onboarding</Text>
        <Text style={styles.onboardingBtnSub}>
          Re-run the initial setup wizard. Your tip data will be kept.
        </Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.versionText}>v2026.02.17 — 5:15 PM</Text>

      <View style={{ height: spacing.xxl }} />

      <ImportModal visible={importVisible} onClose={() => setImportVisible(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
    marginTop: -spacing.sm,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accentDim,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.accent,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dollar: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.sm,
  },
  currencyInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.md,
  },
  suffix: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveBtnDisabled: {
    backgroundColor: colors.surfaceLight,
  },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.background,
  },
  saveBtnTextDisabled: {
    color: colors.textMuted,
  },

  // Workplace styles
  wpCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  wpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  wpName: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
  },
  wpMeta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wpChevron: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  wpBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  wpSubTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  rateWage: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  rateDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  rateDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.redDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateDeleteText: {
    fontSize: fontSize.md,
    color: colors.red,
    fontWeight: '700',
  },
  addRateBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addRateBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  addRateForm: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  rateInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  rateInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rateCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  rateCancelText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  rateSaveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  rateSaveText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.background,
  },
  removeWpBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  removeWpText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.red,
  },
  addWpBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addWpBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
  },
  addWpForm: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  // Import
  importBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  importBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  importBtnSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  onboardingBtn: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onboardingBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  onboardingBtnSub: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  versionText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
