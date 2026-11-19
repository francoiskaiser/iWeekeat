import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const STAR_COLOR = '#F59E0B';

/** Moyenne affichee en etoiles pleines, demi-etoiles et vides. */
export function StarsDisplay({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`${value.toFixed(1).replace('.', ',')} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const name = value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half' : 'star-outline';
        return <Ionicons key={i} name={name} size={size} color={STAR_COLOR} />;
      })}
    </View>
  );
}

/** Resume compact : "★ 4,3 (12)" ou "Pas encore notée". */
export function RatingSummary({ average, count, color }: { average: number | null; count: number; color: string }) {
  if (average === null) {
    return <Text style={[styles.summaryEmpty, { color }]}>Pas encore notée</Text>;
  }
  return (
    <View style={styles.summary}>
      <Ionicons name="star" size={13} color={STAR_COLOR} />
      <Text style={[styles.summaryValue, { color }]}>{average.toFixed(1).replace('.', ',')}</Text>
      <Text style={[styles.summaryCount, { color }]}>({count})</Text>
    </View>
  );
}

/** Saisie de 1 a 5 etoiles. */
export function StarInput({
  value, onChange, size = 34, disabled,
}: { value: number | null; onChange: (stars: number) => void; size?: number; disabled?: boolean }) {
  return (
    <View style={styles.inputRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onChange(i)}
          disabled={disabled}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`Donner ${i} étoile${i > 1 ? 's' : ''}`}
        >
          <Ionicons name={value !== null && value >= i ? 'star' : 'star-outline'} size={size} color={STAR_COLOR} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
  inputRow: { flexDirection: 'row', gap: 10 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryValue: { fontSize: 12, fontWeight: '800' },
  summaryCount: { fontSize: 12, fontWeight: '500' },
  summaryEmpty: { fontSize: 12, fontWeight: '500', fontStyle: 'italic' },
});
