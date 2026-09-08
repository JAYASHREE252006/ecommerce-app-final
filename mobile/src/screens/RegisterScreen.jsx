import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export function RegisterScreen({ navigation }) {
  const { register } = useAuth();
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
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="Password (min 6 characters)"
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

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'white' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#DDD9CF', borderRadius: 8, padding: 12, marginBottom: 12 },
  error: { color: '#DC2626', marginBottom: 8 },
  button: { backgroundColor: '#1B1F23', borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: '600' },
});
