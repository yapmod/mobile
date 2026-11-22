import Constants from 'expo-constants';
import { Modal, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Action, styles } from '../components/controls';

type Props = {
  open: boolean; enabled: boolean | null; status: string; canReload: boolean;
  onClose: () => void; onToggle: (value: boolean) => void; onReload: () => void;
};

export function Settings(p: Props) {
  return <Modal visible={p.open} animationType="slide" onRequestClose={p.onClose}>
    <SafeAreaProvider><SafeAreaView style={styles.screen}>
      <View style={styles.bar}><Text accessibilityRole="header" style={styles.title}>Paramètres</Text>
        <Action title="Fermer" onPress={p.onClose} /></View>
      <ScrollView contentContainerStyle={styles.group}>
        <View style={styles.row}><Text style={styles.label}>Version</Text>
          <Text style={styles.detail}>{Constants.expoConfig?.version}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Modifications locales</Text>
          <Switch accessibilityLabel="Modifications locales" disabled={p.enabled === null}
            value={p.enabled === true} onValueChange={p.onToggle} /></View>
        <View><Text style={styles.label}>Diagnostic de développement</Text>
          <Text accessibilityLiveRegion="polite" style={styles.detail}>{p.status}</Text></View>
        <Action title="Recharger Yapin" disabled={!p.canReload} onPress={p.onReload} />
      </ScrollView>
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
