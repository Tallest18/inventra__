// components/finance/PeriodPickerSheet.tsx
//
// The Finance summary picker, as a bottom sheet. What it offers depends on the
// filter:
//   Today -> a calendar of one month (other months' days greyed out)
//   Week  -> 7-day (Mon–Sun) intervals, newest first
//   Month -> the months of a year
// Future days/weeks/months can't be picked (no sales there yet).
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { Period } from "@/app/types/finance.types";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  addDays,
  DateRange,
  dayRange,
  MONTH_NAMES,
  monthRange,
  sameDay,
  shortMonth,
  startOfDay,
  startOfWeek,
  weekLabel,
  weekRange,
} from "@/utils/periodRange";

const BLUE = "#1155CC";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKS_SHOWN = 16;

interface Props {
  visible: boolean;
  period: Period;
  value: DateRange;
  onSelect: (range: DateRange) => void;
  onClose: () => void;
}

export const PeriodPickerSheet: React.FC<Props> = ({ visible, period, value, onSelect, onClose }) => {
  const title = period === "Today" ? "Select Day" : period === "Week" ? "Select Week" : "Select Month";
  const choose = (r: DateRange) => {
    onSelect(r);
    onClose();
  };
  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      {period === "Today" ? (
        <DayCalendar value={value.start} onPick={(d) => choose(dayRange(d))} visible={visible} />
      ) : period === "Week" ? (
        <WeekList value={value} onPick={choose} />
      ) : (
        <MonthGrid value={value.start} onPick={(y, m) => choose(monthRange(y, m))} visible={visible} />
      )}
    </BottomSheet>
  );
};

// ─── Today: month calendar ────────────────────────────────────────────────────

const DayCalendar: React.FC<{ value: Date; onPick: (d: Date) => void; visible: boolean }> = ({
  value,
  onPick,
  visible,
}) => {
  const today = startOfDay(new Date());
  const [view, setView] = useState({ y: value.getFullYear(), m: value.getMonth() });
  // Reopening jumps back to the month of the selected day.
  useEffect(() => {
    if (visible) setView({ y: value.getFullYear(), m: value.getMonth() });
  }, [visible, value]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const gridStart = addDays(first, -first.getDay()); // back to Sunday
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
    const total = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
    return Array.from({ length: total }, (_, i) => addDays(gridStart, i));
  }, [view]);

  const atCurrentMonth = view.y === today.getFullYear() && view.m === today.getMonth();
  const shift = (n: number) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <View style={styles.pad}>
      <NavRow
        label={`${MONTH_NAMES[view.m]} ${view.y}`}
        onPrev={() => shift(-1)}
        onNext={() => shift(1)}
        nextDisabled={atCurrentMonth}
      />
      <View style={styles.weekHeader}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.weekday}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d) => {
          const otherMonth = d.getMonth() !== view.m;
          const future = d > today;
          const disabled = otherMonth || future;
          const selected = !otherMonth && sameDay(d, value);
          const isToday = sameDay(d, today);
          return (
            <View key={d.toISOString()} style={styles.cellWrap}>
              <TouchableOpacity
                disabled={disabled}
                onPress={() => onPick(d)}
                style={[
                  styles.cell,
                  isToday && !selected && !otherMonth && styles.cellToday,
                  selected && styles.cellSelected,
                ]}
                accessibilityLabel={d.toDateString()}
              >
                <Text
                  style={[
                    styles.cellText,
                    otherMonth && styles.cellTextOther,
                    future && !otherMonth && styles.cellTextFuture,
                    selected && styles.cellTextSelected,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── Week: 7-day intervals ────────────────────────────────────────────────────

const WeekList: React.FC<{ value: DateRange; onPick: (r: DateRange) => void }> = ({ value, onPick }) => {
  const thisWeek = startOfWeek(new Date());
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, i) => weekRange(addDays(thisWeek, -7 * i)));
  return (
    <View>
      {weeks.map((w, i) => {
        const selected = sameDay(w.start, value.start);
        const note = i === 0 ? "This week" : i === 1 ? "Last week" : `${w.start.getFullYear()}`;
        return (
          <TouchableOpacity
            key={w.start.toISOString()}
            style={[styles.row, selected && styles.rowSelected]}
            onPress={() => onPick(w)}
            activeOpacity={0.6}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{weekLabel(w)}</Text>
              <Text style={styles.rowNote}>{note}</Text>
            </View>
            {selected && <Ionicons name="checkmark" size={20} color={BLUE} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── Month: months of the year ────────────────────────────────────────────────

const MonthGrid: React.FC<{ value: Date; onPick: (y: number, m: number) => void; visible: boolean }> = ({
  value,
  onPick,
  visible,
}) => {
  const now = new Date();
  const [year, setYear] = useState(value.getFullYear());
  useEffect(() => {
    if (visible) setYear(value.getFullYear());
  }, [visible, value]);

  return (
    <View style={styles.pad}>
      <NavRow
        label={`${year}`}
        onPrev={() => setYear((y) => y - 1)}
        onNext={() => setYear((y) => y + 1)}
        nextDisabled={year >= now.getFullYear()}
      />
      <View style={styles.monthGrid}>
        {MONTH_NAMES.map((name, m) => {
          const future = year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());
          const selected = value.getFullYear() === year && value.getMonth() === m;
          return (
            <View key={name} style={styles.monthWrap}>
              <TouchableOpacity
                disabled={future}
                onPress={() => onPick(year, m)}
                style={[styles.monthCell, selected && styles.cellSelected]}
                accessibilityLabel={`${name} ${year}`}
              >
                <Text
                  style={[
                    styles.monthText,
                    future && styles.cellTextFuture,
                    selected && styles.cellTextSelected,
                  ]}
                >
                  {shortMonth(m)}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// ─── shared ───────────────────────────────────────────────────────────────────

const NavRow: React.FC<{ label: string; onPrev: () => void; onNext: () => void; nextDisabled: boolean }> = ({
  label,
  onPrev,
  onNext,
  nextDisabled,
}) => (
  <View style={styles.navRow}>
    <TouchableOpacity onPress={onPrev} style={styles.navBtn} hitSlop={8} accessibilityLabel="Previous">
      <Ionicons name="chevron-back" size={20} color={BLUE} />
    </TouchableOpacity>
    <Text style={styles.navLabel}>{label}</Text>
    <TouchableOpacity
      onPress={onNext}
      disabled={nextDisabled}
      style={[styles.navBtn, nextDisabled && { opacity: 0.3 }]}
      hitSlop={8}
      accessibilityLabel="Next"
    >
      <Ionicons name="chevron-forward" size={20} color={BLUE} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 16, paddingBottom: 8 },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 4,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF3FC",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontSize: 16, color: "#1C1C1C", fontFamily: "DMSans_600SemiBold" },
  weekHeader: { flexDirection: "row", marginBottom: 6 },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    color: "#98A2B3",
    fontFamily: "DMSans_500Medium",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cellWrap: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3 },
  cell: { flex: 1, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  cellToday: { borderWidth: 1.5, borderColor: BLUE },
  cellSelected: { backgroundColor: BLUE },
  cellText: { fontSize: 15, color: "#1C1C1C", fontFamily: "DMSans_500Medium" },
  cellTextOther: { color: "#D0D5DD" },
  cellTextFuture: { color: "#C0C6D1" },
  cellTextSelected: { color: "#FFFFFF", fontFamily: "DMSans_700Bold" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F4",
  },
  rowSelected: { backgroundColor: "#F3F7FE" },
  rowText: { fontSize: 15, color: "#2D3748", fontFamily: "DMSans_500Medium" },
  rowTextSelected: { color: BLUE },
  rowNote: { fontSize: 12, color: "#98A2B3", marginTop: 2, fontFamily: "DMSans_400Regular" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthWrap: { width: "33.333%", padding: 6 },
  monthCell: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  monthText: { fontSize: 15, color: "#1C1C1C", fontFamily: "DMSans_500Medium" },
});

export default PeriodPickerSheet;
