import { Pressable, StyleSheet, Text } from 'react-native';

export const colors = {
  background: '#111618', surface: '#20282b', line: '#394649',
  text: '#edf5f2', secondary: '#b2c1be', accent: '#89e2ca',
};

export function Action({ title, onPress, disabled = false }: {
  title: string; onPress: () => void; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.action, { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 }]}>
    <Text style={styles.actionText}>{title}</Text>
  </Pressable>;
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line },
  title: { color: colors.text, fontSize: 21, fontWeight: '600', flexShrink: 1 },
  label: { color: colors.text, fontSize: 17, flexShrink: 1 },
  detail: { color: colors.secondary, fontSize: 16 },
  action: { paddingHorizontal: 14, minHeight: 46, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10, backgroundColor: colors.surface },
  actionText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  center: { flex: 1, padding: 24, gap: 16, alignItems: 'center', justifyContent: 'center' },
  group: { padding: 20, gap: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
});
