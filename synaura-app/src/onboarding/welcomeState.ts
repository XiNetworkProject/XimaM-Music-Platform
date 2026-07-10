import AsyncStorage from '@react-native-async-storage/async-storage';

const WELCOME_KEY = 'synaura.welcome.completed.v1';

export async function isWelcomeCompleted() {
  return (await AsyncStorage.getItem(WELCOME_KEY)) === '1';
}

export async function completeWelcome() {
  await AsyncStorage.setItem(WELCOME_KEY, '1');
}
