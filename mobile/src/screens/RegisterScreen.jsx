import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <TextInput
        placeholder="Name"
        placeholderTextColor={colors.inkMuted}
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.inkMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password (min 6 characters)"
        placeholderTextColor={colors.inkMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={handleSubmit} disabled={loading} style={styles.button}>
        <Text style={styles.buttonText}>{loading ? 'Creating…' : 'Sign up'}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.canvas },
    title: { fontSize: 24, fontWeight: '700', marginBottom: 20, color: colors.ink },
    input: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.surface,
      color: colors.ink,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    },
    error: { color: colors.danger, marginBottom: 8 },
    button: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
    buttonText: { color: 'white', fontWeight: '600' },
  });
}
