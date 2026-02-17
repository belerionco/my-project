import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import {
  getEntriesForMonth,
  getEntriesForWeek,
  totalEarnings,
  formatCurrency,
  MONTH_NAMES,
} from '../utils/helpers';

export default function GoalsScreen() {
  const { goals, setGoal, addCustomGoal, updateCustomGoal, deleteGoal, entries, profile, updateProfile } = useApp();
  const [editingWeekly, setEditingWeekly] = useState(false);
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [weeklyInput, setWeeklyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');
  const [editingSavings, setEditingSavings] = useState(false);
  const [savingsName, setSavingsName] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [savingsPerShift, setSavingsPerShift] = useState('');
  const [editingYearly, setEditingYearly] = useState(false);
  const [yearlyInput, setYearlyInput] = useState('');
  const [addingCustomGoal, setAddingCustomGoal] = useState(false);
  const [customGoalName, setCustomGoalName] = useState('');
  const [customGoalAmount, setCustomGoalAmount] = useState('');
  const [customGoalContribution, setCustomGoalContribution] = useState('');
  const [editingCustomGoalId, setEditingCustomGoalId] = useState<string | null>(null);
  const [editCustomName, setEditCustomName] = useState('');
  const [editCustomAmount, setEditCustomAmount] = useState('');
  const [editCustomContribution, setEditCustomContribution] = useState('');

  const now = new Date();
  const weeklyGoal = goals.find(g => g.type === 'weekly');
  const monthlyGoal = goals.find(g => g.type === 'monthly');
  const customGoals = goals.filter(g => g.type === 'custom');

  const weekStartsOn = profile.weekStartsOn ?? 0;
  const weekEntries = useMemo(() => getEntriesForWeek(entries, now, weekStartsOn), [entries, weekStartsOn]);
  const monthEntries = useMemo(() => getEntriesForMonth(entries, now.getFullYear(), now.getMonth()), [entries]);

  const weekTotal = totalEarnings(weekEntries);
  const monthTotal = totalEarnings(monthEntries);

  const weekProgress = weeklyGoal ? Math.min(1, weekTotal / weeklyGoal.amount) : 0;
  const monthProgress = monthlyGoal ? Math.min(1, monthTotal / monthlyGoal.amount) : 0;

  const saveWeeklyGoal = () => {
    const amount = parseFloat(weeklyInput);
    if (amount > 0) {
      setGoal('weekly', amount);
      setEditingWeekly(false);
      setWeeklyInput('');
    }
  };

  const saveMonthlyGoal = () => {
    const amount = parseFloat(monthlyInput);
    if (amount > 0) {
      setGoal('monthly', amount);
      setEditingMonthly(false);
      setMonthlyInput('');
    }
  };

  const saveSavingsGoal = () => {
    const target = parseFloat(savingsTarget);
    const perShift = parseFloat(savingsPerShift);
    if (target > 0 && perShift > 0 && savingsName.trim()) {
      updateProfile({
        savingsGoal: {
          id: profile.savingsGoal?.id || Date.now().toString(36),
          name: savingsName.trim(),
          targetAmount: target,
          contributionPerShift: perShift,
          totalContributed: profile.savingsGoal?.totalContributed || 0,
          createdAt: profile.savingsGoal?.createdAt || new Date().toISOString(),
        },
      });
      setEditingSavings(false);
      setSavingsName('');
      setSavingsTarget('');
      setSavingsPerShift('');
    }
  };

  const deleteSavingsGoal = () => {
    updateProfile({ savingsGoal: undefined });
  };

  const saveYearlyGoal = () => {
    const amount = parseFloat(yearlyInput);
    if (amount > 0) {
      updateProfile({ yearlyGoal: amount });
      setEditingYearly(false);
      setYearlyInput('');
    }
  };

  const saveCustomGoal = () => {
    const amount = parseFloat(customGoalAmount);
    const contribution = parseFloat(customGoalContribution);
    if (amount > 0 && contribution > 0 && customGoalName.trim()) {
      addCustomGoal(customGoalName.trim(), amount, contribution);
      setAddingCustomGoal(false);
      setCustomGoalName('');
      setCustomGoalAmount('');
      setCustomGoalContribution('');
    }
  };

  const saveEditCustomGoal = () => {
    if (!editingCustomGoalId) return;
    const amount = parseFloat(editCustomAmount);
    const contribution = parseFloat(editCustomContribution);
    if (amount > 0 && contribution > 0 && editCustomName.trim()) {
      updateCustomGoal(editingCustomGoalId, editCustomName.trim(), amount, contribution);
      setEditingCustomGoalId(null);
      setEditCustomName('');
      setEditCustomAmount('');
      setEditCustomContribution('');
    }
  };

  const yearlyGoalAmount = profile.yearlyGoal || 0;
  const yearEntries = useMemo(() => entries.filter(e => e.date.startsWith(String(now.getFullYear()))), [entries]);
  const yearTotal = totalEarnings(yearEntries);
  const yearProgress = yearlyGoalAmount > 0 ? Math.min(1, yearTotal / yearlyGoalAmount) : 0;

  // Calculate days/shifts remaining projections
  const daysLeftInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const dayOfWeek = (now.getDay() - weekStartsOn + 7) % 7;
  const daysLeftInWeek = 6 - dayOfWeek;

  const avgPerShift = monthEntries.length > 0 ? monthTotal / monthEntries.length : 0;
  const monthlyRemaining = monthlyGoal ? Math.max(0, monthlyGoal.amount - monthTotal) : 0;
  const shiftsNeeded = avgPerShift > 0 ? Math.ceil(monthlyRemaining / avgPerShift) : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Goals</Text>
          <TouchableOpacity
            style={styles.addGoalBtn}
            onPress={() => setAddingCustomGoal(!addingCustomGoal)}
          >
            <Text style={styles.addGoalBtnText}>+ Add Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Add Custom Goal Form */}
        {addingCustomGoal && (
          <View style={styles.addGoalCard}>
            <View style={styles.savingsInputGroup}>
              <Text style={styles.savingsInputLabel}>Goal Name</Text>
              <TextInput
                style={styles.savingsInput}
                value={customGoalName}
                onChangeText={setCustomGoalName}
                placeholder="e.g. New Car, Emergency Fund"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <View style={styles.savingsInputGroup}>
              <Text style={styles.savingsInputLabel}>Target Amount</Text>
              <View style={styles.inputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.input}
                  value={customGoalAmount}
                  onChangeText={setCustomGoalAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.savingsInputGroup}>
              <Text style={styles.savingsInputLabel}>Save Per Shift</Text>
              <View style={styles.inputRow}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={styles.input}
                  value={customGoalContribution}
                  onChangeText={setCustomGoalContribution}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.savingsBtnRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={saveCustomGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAddingCustomGoal(false);
                  setCustomGoalName('');
                  setCustomGoalAmount('');
                  setCustomGoalContribution('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Weekly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🎯</Text>
            <Text style={styles.goalType}>Weekly Goal</Text>
            <TouchableOpacity onPress={() => {
              setEditingWeekly(!editingWeekly);
              if (weeklyGoal) setWeeklyInput(String(weeklyGoal.amount));
            }}>
              <Text style={styles.editBtn}>{weeklyGoal ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingWeekly ? (
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={weeklyInput}
                onChangeText={setWeeklyInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveWeeklyGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : weeklyGoal ? (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(weekTotal)}</Text>
                <Text style={styles.progressOf}>of {formatCurrency(weeklyGoal.amount)}</Text>
              </View>
              <View style={styles.progressBarLg}>
                <View style={[styles.progressFill, { width: `${weekProgress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressPercent}>{Math.round(weekProgress * 100)}%</Text>
                {weekTotal < weeklyGoal.amount && (
                  <Text style={styles.progressRemaining}>
                    {formatCurrency(weeklyGoal.amount - weekTotal)} to go · {daysLeftInWeek} days left
                  </Text>
                )}
                {weekTotal >= weeklyGoal.amount && (
                  <Text style={styles.goalReached}>Goal reached!</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a weekly earnings goal</Text>
          )}
        </View>

        {/* Monthly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🏆</Text>
            <Text style={styles.goalType}>Monthly Goal</Text>
            <TouchableOpacity onPress={() => {
              setEditingMonthly(!editingMonthly);
              if (monthlyGoal) setMonthlyInput(String(monthlyGoal.amount));
            }}>
              <Text style={styles.editBtn}>{monthlyGoal ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingMonthly ? (
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={monthlyInput}
                onChangeText={setMonthlyInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveMonthlyGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : monthlyGoal ? (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(monthTotal)}</Text>
                <Text style={styles.progressOf}>of {formatCurrency(monthlyGoal.amount)}</Text>
              </View>
              <View style={styles.progressBarLg}>
                <View style={[styles.progressFill, styles.progressGold, { width: `${monthProgress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={styles.progressPercent}>{Math.round(monthProgress * 100)}%</Text>
                {monthTotal < monthlyGoal.amount ? (
                  <Text style={styles.progressRemaining}>
                    {formatCurrency(monthlyRemaining)} to go · {daysLeftInMonth} days left
                  </Text>
                ) : (
                  <Text style={styles.goalReached}>Goal reached!</Text>
                )}
              </View>

              {/* Projection */}
              {monthTotal < monthlyGoal.amount && avgPerShift > 0 && (
                <View style={styles.projectionCard}>
                  <Text style={styles.projectionTitle}>Projection</Text>
                  <Text style={styles.projectionText}>
                    At your avg of {formatCurrency(avgPerShift)}/shift, you need ~{shiftsNeeded} more shifts to reach your goal.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a monthly earnings goal</Text>
          )}
        </View>

        {/* Custom Savings Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>🐷</Text>
            <Text style={styles.goalType}>{profile.savingsGoal ? `Savings: ${profile.savingsGoal.name}` : 'Savings Goal'}</Text>
            <TouchableOpacity onPress={() => {
              setEditingSavings(!editingSavings);
              if (profile.savingsGoal) {
                setSavingsName(profile.savingsGoal.name);
                setSavingsTarget(String(profile.savingsGoal.targetAmount));
                setSavingsPerShift(String(profile.savingsGoal.contributionPerShift));
              }
            }}>
              <Text style={styles.editBtn}>{profile.savingsGoal ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingSavings ? (
            <View>
              <View style={styles.savingsInputGroup}>
                <Text style={styles.savingsInputLabel}>Goal Name</Text>
                <TextInput
                  style={styles.savingsInput}
                  value={savingsName}
                  onChangeText={setSavingsName}
                  placeholder="e.g. Vacation Fund"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
              </View>
              <View style={styles.savingsInputGroup}>
                <Text style={styles.savingsInputLabel}>Target Amount</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={savingsTarget}
                    onChangeText={setSavingsTarget}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.savingsInputGroup}>
                <Text style={styles.savingsInputLabel}>Per Shift Contribution</Text>
                <View style={styles.inputRow}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.input}
                    value={savingsPerShift}
                    onChangeText={setSavingsPerShift}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={styles.savingsBtnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveSavingsGoal}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                {profile.savingsGoal && (
                  <TouchableOpacity style={styles.deleteGoalBtn} onPress={deleteSavingsGoal}>
                    <Text style={styles.deleteGoalBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : profile.savingsGoal ? (
            (() => {
              const sg = profile.savingsGoal!;
              const contributed = sg.contributionPerShift * entries.length;
              const progress = Math.min(1, contributed / sg.targetAmount);
              const remaining = Math.max(0, sg.targetAmount - contributed);
              const totalTipsEarned = totalEarnings(entries);
              const afterSavings = totalTipsEarned - contributed;

              return (
                <>
                  <View style={styles.progressSection}>
                    <Text style={styles.progressAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(contributed)}</Text>
                    <Text style={styles.progressOf}>of {formatCurrency(sg.targetAmount)}</Text>
                  </View>
                  <View style={styles.progressBarLg}>
                    <View style={[styles.progressFill, styles.progressSavings, { width: `${progress * 100}%` }]} />
                  </View>
                  <View style={styles.progressMeta}>
                    <Text style={[styles.progressPercent, { color: colors.gold }]}>{Math.round(progress * 100)}%</Text>
                    {contributed < sg.targetAmount ? (
                      <Text style={styles.progressRemaining}>
                        {formatCurrency(remaining)} to go
                      </Text>
                    ) : (
                      <Text style={styles.goalReached}>Goal reached!</Text>
                    )}
                  </View>

                  <View style={styles.savingsDetails}>
                    <View style={styles.savingsDetailRow}>
                      <Text style={styles.savingsDetailLabel}>Per shift contribution</Text>
                      <Text style={styles.savingsDetailValue}>{formatCurrency(sg.contributionPerShift)}</Text>
                    </View>
                    <View style={styles.savingsDetailRow}>
                      <Text style={styles.savingsDetailLabel}>Tips after savings</Text>
                      <Text style={styles.savingsDetailValue}>{formatCurrency(Math.max(0, afterSavings))}</Text>
                    </View>
                    {remaining > 0 && sg.contributionPerShift > 0 && (
                      <View style={styles.savingsDetailRow}>
                        <Text style={styles.savingsDetailLabel}>Shifts remaining</Text>
                        <Text style={styles.savingsDetailValue}>~{Math.ceil(remaining / sg.contributionPerShift)}</Text>
                      </View>
                    )}
                  </View>
                </>
              );
            })()
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a savings goal</Text>
          )}
        </View>

        {/* Yearly Goal */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={styles.goalIcon}>📅</Text>
            <Text style={styles.goalType}>Yearly Goal</Text>
            <TouchableOpacity onPress={() => {
              setEditingYearly(!editingYearly);
              if (yearlyGoalAmount > 0) setYearlyInput(String(yearlyGoalAmount));
            }}>
              <Text style={styles.editBtn}>{yearlyGoalAmount > 0 ? 'Edit' : 'Set'}</Text>
            </TouchableOpacity>
          </View>

          {editingYearly ? (
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={yearlyInput}
                onChangeText={setYearlyInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveYearlyGoal}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : yearlyGoalAmount > 0 ? (
            <>
              <View style={styles.progressSection}>
                <Text style={styles.progressAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(yearTotal)}</Text>
                <Text style={styles.progressOf}>of {formatCurrency(yearlyGoalAmount)}</Text>
              </View>
              <View style={styles.progressBarLg}>
                <View style={[styles.progressFill, { backgroundColor: colors.success, width: `${yearProgress * 100}%` }]} />
              </View>
              <View style={styles.progressMeta}>
                <Text style={[styles.progressPercent, { color: colors.success }]}>{Math.round(yearProgress * 100)}%</Text>
                {yearTotal < yearlyGoalAmount ? (
                  <Text style={styles.progressRemaining}>
                    {formatCurrency(yearlyGoalAmount - yearTotal)} to go
                  </Text>
                ) : (
                  <Text style={styles.goalReached}>Goal reached!</Text>
                )}
              </View>
            </>
          ) : (
            <Text style={styles.noGoal}>Tap "Set" to create a yearly earnings goal</Text>
          )}
        </View>

        {/* Custom Goals */}
        {customGoals.map(goal => {
          const goalStartDate = goal.createdAt.slice(0, 10); // YYYY-MM-DD
          const entriesSinceGoal = entries.filter(e => e.date >= goalStartDate);
          const contributed = (goal.contributionPerShift || 0) * entriesSinceGoal.length;
          const progress = Math.min(1, contributed / goal.amount);
          const remaining = Math.max(0, goal.amount - contributed);
          const isEditing = editingCustomGoalId === goal.id;
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalIcon}>💰</Text>
                <Text style={styles.goalType}>{goal.name}</Text>
                <TouchableOpacity onPress={() => {
                  if (isEditing) {
                    setEditingCustomGoalId(null);
                  } else {
                    setEditingCustomGoalId(goal.id);
                    setEditCustomName(goal.name || '');
                    setEditCustomAmount(String(goal.amount));
                    setEditCustomContribution(String(goal.contributionPerShift || ''));
                  }
                }}>
                  <Text style={styles.editBtn}>{isEditing ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>

              {isEditing ? (
                <View>
                  <View style={styles.savingsInputGroup}>
                    <Text style={styles.savingsInputLabel}>Goal Name</Text>
                    <TextInput
                      style={styles.savingsInput}
                      value={editCustomName}
                      onChangeText={setEditCustomName}
                      placeholder="Goal name"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                    />
                  </View>
                  <View style={styles.savingsInputGroup}>
                    <Text style={styles.savingsInputLabel}>Target Amount</Text>
                    <View style={styles.inputRow}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.input}
                        value={editCustomAmount}
                        onChangeText={setEditCustomAmount}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={styles.savingsInputGroup}>
                    <Text style={styles.savingsInputLabel}>Save Per Shift</Text>
                    <View style={styles.inputRow}>
                      <Text style={styles.dollarSign}>$</Text>
                      <TextInput
                        style={styles.input}
                        value={editCustomContribution}
                        onChangeText={setEditCustomContribution}
                        placeholder="0.00"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                  <View style={styles.savingsBtnRow}>
                    <TouchableOpacity style={styles.saveBtn} onPress={saveEditCustomGoal}>
                      <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteGoalBtn} onPress={() => {
                      deleteGoal(goal.id);
                      setEditingCustomGoalId(null);
                    }}>
                      <Text style={styles.deleteGoalBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.progressSection}>
                    <Text style={styles.progressAmount} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(contributed)}</Text>
                    <Text style={styles.progressOf}>of {formatCurrency(goal.amount)}</Text>
                  </View>
                  <View style={styles.progressBarLg}>
                    <View style={[styles.progressFill, { backgroundColor: colors.gold, width: `${progress * 100}%` }]} />
                  </View>
                  <View style={styles.progressMeta}>
                    <Text style={[styles.progressPercent, { color: colors.gold }]}>{Math.round(progress * 100)}%</Text>
                    {contributed < goal.amount ? (
                      <Text style={styles.progressRemaining}>
                        {formatCurrency(remaining)} to go
                      </Text>
                    ) : (
                      <Text style={styles.goalReached}>Goal reached!</Text>
                    )}
                  </View>
                  <View style={styles.savingsDetails}>
                    <View style={styles.savingsDetailRow}>
                      <Text style={styles.savingsDetailLabel}>Per shift contribution</Text>
                      <Text style={styles.savingsDetailValue}>{formatCurrency(goal.contributionPerShift || 0)}</Text>
                    </View>
                    <View style={styles.savingsDetailRow}>
                      <Text style={styles.savingsDetailLabel}>Tracking since</Text>
                      <Text style={styles.savingsDetailValue}>{new Date(goal.createdAt).toLocaleDateString()}</Text>
                    </View>
                    <View style={styles.savingsDetailRow}>
                      <Text style={styles.savingsDetailLabel}>Shifts counted</Text>
                      <Text style={styles.savingsDetailValue}>{entriesSinceGoal.length}</Text>
                    </View>
                    {remaining > 0 && (goal.contributionPerShift || 0) > 0 && (
                      <View style={styles.savingsDetailRow}>
                        <Text style={styles.savingsDetailLabel}>Shifts remaining</Text>
                        <Text style={styles.savingsDetailValue}>~{Math.ceil(remaining / (goal.contributionPerShift || 1))}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          );
        })}

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <Text style={styles.quickStatsTitle}>{MONTH_NAMES[now.getMonth()]} Summary</Text>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue} adjustsFontSizeToFit numberOfLines={1}>{monthEntries.length}</Text>
              <Text style={styles.quickStatLabel}>Shifts</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(monthTotal)}</Text>
              <Text style={styles.quickStatLabel}>Earned</Text>
            </View>
            <View style={styles.quickStat}>
              <Text style={styles.quickStatValue} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(avgPerShift)}</Text>
              <Text style={styles.quickStatLabel}>Per Shift</Text>
            </View>
          </View>
        </View>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
  },
  addGoalBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addGoalBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.background,
  },
  addGoalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  cancelBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: fontSize.sm,
  },
  deleteBtn: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.red,
  },
  goalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  goalIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  goalType: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  editBtn: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dollarSign: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.accent,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginLeft: spacing.md,
  },
  saveBtnText: {
    color: colors.background,
    fontWeight: '800',
    fontSize: fontSize.sm,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  progressAmount: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
  },
  progressOf: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  progressBarLg: {
    height: 12,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: borderRadius.full,
  },
  progressGold: {
    backgroundColor: colors.gold,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.accent,
  },
  progressRemaining: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  goalReached: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    color: colors.success,
  },
  noGoal: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  projectionCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  projectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.gold,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  projectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  progressSavings: {
    backgroundColor: colors.gold,
  },
  savingsDetails: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  savingsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  savingsDetailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  savingsDetailValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text,
  },
  savingsInputGroup: {
    marginBottom: spacing.md,
  },
  savingsInputLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  savingsInput: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingVertical: spacing.sm,
  },
  savingsBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  deleteGoalBtn: {
    backgroundColor: colors.redDim,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  deleteGoalBtnText: {
    color: colors.red,
    fontWeight: '800',
    fontSize: fontSize.sm,
  },
  quickStats: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  quickStatsTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text,
  },
  quickStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
