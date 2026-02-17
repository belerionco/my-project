import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, ScrollView, Platform, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { colors, spacing, borderRadius, fontSize } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { TipEntry, Workplace, WageRate } from '../types';

interface ImportModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ParsedRow {
  date: string;
  isDayOff: boolean;
  hoursWorked: number;
  amount: number;
  cashAmount: number;
  creditAmount: number;
  tipOut: number;
  hourlyWage: number;
  job: string;
  startTime: string;
  endTime: string;
  shift: string;
  notes: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function convertDate(dateStr: string): string {
  const s = dateStr.trim();
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // MM/DD/YYYY or M/D/YYYY
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const [mm, dd, yyyy] = slashParts;
    if (yyyy.length === 4) {
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    // Could be YYYY/MM/DD
    if (mm.length === 4) {
      return `${mm}-${dd.padStart(2, '0')}-${yyyy.padStart(2, '0')}`;
    }
  }
  // MM-DD-YYYY
  const dashParts = s.split('-');
  if (dashParts.length === 3 && dashParts[2].length === 4) {
    const [mm, dd, yyyy] = dashParts;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return '';
}

function guessShiftType(shift: string): TipEntry['shiftType'] {
  const s = shift.toLowerCase();
  if (s.includes('lunch') || s.includes('am')) return 'lunch';
  if (s.includes('dinner') || s.includes('pm')) return 'dinner';
  if (s.includes('double')) return 'double';
  return 'other';
}

function findColumn(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.indexOf(c);
    if (idx !== -1) return idx;
  }
  // Partial match: check if any header contains a candidate
  for (const c of candidates) {
    const idx = headers.findIndex(h => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const dateIdx = findColumn(headers, 'date', 'day', 'workdate', 'shiftdate');
  const dayOffIdx = findColumn(headers, 'dayoff', 'off', 'isoff', 'isdayoff');
  const hoursIdx = findColumn(headers, 'hoursworked', 'hours', 'hrs', 'totalhours', 'workhours', 'duration');
  const amountIdx = findColumn(headers, 'amount', 'total', 'totaltips', 'tips', 'totalearnings', 'earnings', 'tipamount');
  const cashIdx = findColumn(headers, 'cashamount', 'cash', 'cashtips', 'cashtip');
  const creditIdx = findColumn(headers, 'creditamount', 'credit', 'credittips', 'card', 'cardtips', 'cardtip', 'creditcard', 'cc');
  const tipOutIdx = findColumn(headers, 'tipout', 'tipouts', 'tippedout', 'tipshare');
  const wageIdx = findColumn(headers, 'hourlywage', 'wage', 'hourlyrate', 'rate', 'payrate', 'hourly', 'basepay');
  const jobIdx = findColumn(headers, 'job', 'workplace', 'employer', 'restaurant', 'location', 'work', 'company', 'place', 'venue');
  const startIdx = findColumn(headers, 'starttime', 'start', 'clockin', 'timein', 'startat');
  const endIdx = findColumn(headers, 'endtime', 'end', 'clockout', 'timeout', 'endat');
  const shiftIdx = findColumn(headers, 'shift', 'shifttype', 'shiftname', 'period');
  const noteIdx = findColumn(headers, 'note', 'notes', 'comments', 'comment', 'memo', 'description');

  if (dateIdx === -1) return []; // No date column found

  const parseMoney = (v: string | undefined): number =>
    parseFloat((v || '').replace(/[$€£,]/g, '')) || 0;

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i]);
    if (!vals[dateIdx]) continue;

    rows.push({
      date: vals[dateIdx] || '',
      isDayOff: (vals[dayOffIdx] || '').toUpperCase() === 'TRUE',
      hoursWorked: parseFloat(vals[hoursIdx]) || 0,
      amount: parseMoney(vals[amountIdx]),
      cashAmount: parseMoney(vals[cashIdx]),
      creditAmount: parseMoney(vals[creditIdx]),
      tipOut: parseMoney(vals[tipOutIdx]),
      hourlyWage: parseMoney(vals[wageIdx]),
      job: vals[jobIdx] || '',
      startTime: vals[startIdx] || '',
      endTime: vals[endIdx] || '',
      shift: vals[shiftIdx] || '',
      notes: vals[noteIdx] || '',
    });
  }
  return rows;
}

const generateId = (): string =>
  Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);

export default function ImportModal({ visible, onClose }: ImportModalProps) {
  const { bulkImport, workplaces } = useApp();
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  const reset = () => {
    setCsvText('');
    setParsed(null);
    setStep('input');
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const text = await response.text();
        setCsvText(text);
        const rows = parseCSV(text);
        setParsed(rows);
        setStep('preview');
      } else {
        const text = await readAsStringAsync(file.uri);
        setCsvText(text);
        const rows = parseCSV(text);
        setParsed(rows);
        setStep('preview');
      }
    } catch (e) {
      console.error('Error picking file:', e);
    }
  };

  const handlePastePreview = () => {
    if (!csvText.trim()) return;
    const rows = parseCSV(csvText);
    setParsed(rows);
    setStep('preview');
  };

  const handleImport = () => {
    if (!parsed || parsed.length === 0) return;

    // Group by job name to create/find workplaces
    const jobNames = [...new Set(parsed.filter(r => r.job).map(r => r.job))];
    const newWorkplaces: Workplace[] = [];
    const jobToWorkplaceId: Record<string, string> = {};

    for (const jobName of jobNames) {
      const existing = workplaces.find(w => w.name.toLowerCase() === jobName.toLowerCase());
      if (existing) {
        jobToWorkplaceId[jobName] = existing.id;
      } else {
        // Collect unique wage rates from this job's rows
        const jobRows = parsed.filter(r => r.job === jobName && !r.isDayOff);
        const wageMap = new Map<number, string>(); // wage -> earliest date
        for (const row of jobRows) {
          if (row.hourlyWage > 0) {
            const dateKey = convertDate(row.date);
            if (!wageMap.has(row.hourlyWage) || dateKey < wageMap.get(row.hourlyWage)!) {
              wageMap.set(row.hourlyWage, dateKey);
            }
          }
        }
        const wageHistory: WageRate[] = [...wageMap.entries()]
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([wage, date]) => ({
            id: generateId(),
            effectiveDate: date,
            hourlyWage: wage,
          }));

        const wpId = generateId();
        newWorkplaces.push({
          id: wpId,
          name: jobName,
          wageHistory: wageHistory.length > 0 ? wageHistory : [{ id: generateId(), effectiveDate: '2000-01-01', hourlyWage: 0 }],
        });
        jobToWorkplaceId[jobName] = wpId;
      }
    }

    const newEntries: Omit<TipEntry, 'id'>[] = [];
    const newDaysOff: string[] = [];

    for (const row of parsed) {
      const dateKey = convertDate(row.date);
      if (!dateKey) continue;

      if (row.isDayOff) {
        newDaysOff.push(dateKey);
        continue;
      }

      // Skip rows with no meaningful data
      if (row.hoursWorked === 0 && row.amount === 0 && row.cashAmount === 0 && row.creditAmount === 0) continue;

      const entry: Omit<TipEntry, 'id'> = {
        date: dateKey,
        hoursWorked: row.hoursWorked,
        cashTips: row.cashAmount,
        cardTips: row.creditAmount,
        tipOut: row.tipOut,
        shiftType: guessShiftType(row.shift),
        notes: row.notes || undefined,
        workplaceId: row.job ? jobToWorkplaceId[row.job] : undefined,
      };

      // If only total amount is provided (no cash/credit breakdown), put it all in cashTips
      if (entry.cashTips === 0 && entry.cardTips === 0 && row.amount > 0) {
        entry.cashTips = row.amount;
      }

      newEntries.push(entry);
    }

    bulkImport(newEntries, newDaysOff, newWorkplaces.length > 0 ? newWorkplaces : undefined);

    const msg = `Imported ${newEntries.length} entries, ${newDaysOff.length} days off${newWorkplaces.length > 0 ? `, ${newWorkplaces.length} new workplace(s)` : ''}`;
    if (Platform.OS === 'web') {
      alert(msg);
    } else {
      Alert.alert('Import Complete', msg);
    }

    reset();
    onClose();
  };

  const dayOffCount = parsed?.filter(r => r.isDayOff).length || 0;
  const entryCount = parsed?.filter(r => !r.isDayOff && (r.hoursWorked > 0 || r.amount > 0 || r.cashAmount > 0 || r.creditAmount > 0)).length || 0;
  const jobNames = parsed ? [...new Set(parsed.filter(r => r.job).map(r => r.job))] : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => { reset(); onClose(); }}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.title}>Import Data</Text>
              <View style={{ width: 60 }} />
            </View>

            {step === 'input' && (
              <>
                <Text style={styles.description}>
                  Import tip data from another app. Pick a CSV file or paste the CSV content below.
                </Text>

                <TouchableOpacity style={styles.pickFileBtn} onPress={handlePickFile}>
                  <Text style={styles.pickFileBtnText}>Pick CSV File</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>— or paste CSV below —</Text>

                <TextInput
                  style={styles.pasteInput}
                  value={csvText}
                  onChangeText={setCsvText}
                  placeholder="Paste CSV content here..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.previewBtn, !csvText.trim() && styles.btnDisabled]}
                  onPress={handlePastePreview}
                  disabled={!csvText.trim()}
                >
                  <Text style={[styles.previewBtnText, !csvText.trim() && styles.btnTextDisabled]}>
                    Preview Import
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {step === 'preview' && parsed && (
              <>
                <Text style={styles.previewTitle}>Import Preview</Text>

                <View style={styles.previewCard}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total rows</Text>
                    <Text style={styles.previewValue}>{parsed.length}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Tip entries</Text>
                    <Text style={styles.previewValue}>{entryCount}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Days off</Text>
                    <Text style={styles.previewValue}>{dayOffCount}</Text>
                  </View>
                  {jobNames.length > 0 && (
                    <View style={styles.previewRow}>
                      <Text style={styles.previewLabel}>Workplaces</Text>
                      <Text style={styles.previewValue}>{jobNames.join(', ')}</Text>
                    </View>
                  )}
                </View>

                {/* Sample entries */}
                <Text style={styles.sampleTitle}>Sample Entries</Text>
                {parsed.filter(r => !r.isDayOff).slice(0, 5).map((row, i) => {
                  const dateKey = convertDate(row.date);
                  return (
                    <View key={i} style={styles.sampleRow}>
                      <Text style={styles.sampleDate}>{dateKey}</Text>
                      <Text style={styles.sampleDetail}>
                        {row.hoursWorked}h | ${row.amount || (row.cashAmount + row.creditAmount)} tips
                        {row.job ? ` | ${row.job}` : ''}
                        {row.hourlyWage > 0 ? ` | $${row.hourlyWage}/hr` : ''}
                      </Text>
                    </View>
                  );
                })}

                <View style={styles.importActions}>
                  <TouchableOpacity style={styles.backBtn} onPress={() => setStep('input')}>
                    <Text style={styles.backBtnText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.importBtn} onPress={handleImport}>
                    <Text style={styles.importBtnText}>Import {entryCount} Entries</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
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
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  pickFileBtn: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  pickFileBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.background,
  },
  orText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  pasteInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.xs,
    color: colors.text,
    minHeight: 120,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBtn: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  previewBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnTextDisabled: {
    color: colors.textMuted,
  },
  previewTitle: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  previewLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  sampleTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  sampleRow: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  sampleDate: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
  },
  sampleDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  importActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  backBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  importBtn: {
    flex: 2,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  importBtnText: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.background,
  },
});
