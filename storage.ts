import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePhoneNumber as savePhoneToNative,
  clearPhoneNumber as clearPhoneFromNative,
} from './UserPreferences';

const STORAGE_KEYS = {
  USER_NAME: '@user_name',
  PHONE_NUMBER: '@phone_number',
  IS_REGISTERED: '@is_registered',
};

export interface UserData {
  userName: string;
  phoneNumber: string;
  isRegistered: boolean;
}

/**
 * Save user data to AsyncStorage and SharedPreferences
 */
export const saveUserData = async (userData: UserData): Promise<void> => {
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER_NAME, userData.userName],
      [STORAGE_KEYS.PHONE_NUMBER, userData.phoneNumber],
      [STORAGE_KEYS.IS_REGISTERED, JSON.stringify(userData.isRegistered)],
    ]);

    // Also save phone number to native SharedPreferences for background worker access
    await savePhoneToNative(userData.phoneNumber);

    console.log('✅ User data saved to storage');
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    throw error;
  }
};

/**
 * Load user data from AsyncStorage
 */
export const loadUserData = async (): Promise<UserData | null> => {
  try {
    const values = await AsyncStorage.multiGet([
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.PHONE_NUMBER,
      STORAGE_KEYS.IS_REGISTERED,
    ]);

    const userName = values[0][1];
    const phoneNumber = values[1][1];
    const isRegistered = values[2][1];

    // If any value is missing, return null
    if (!userName || !phoneNumber || !isRegistered) {
      return null;
    }

    const userData: UserData = {
      userName,
      phoneNumber,
      isRegistered: JSON.parse(isRegistered),
    };

    console.log('✅ User data loaded from storage');
    return userData;
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    return null;
  }
};

/**
 * Clear user data from AsyncStorage and SharedPreferences (logout)
 */
export const clearUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_NAME,
      STORAGE_KEYS.PHONE_NUMBER,
      STORAGE_KEYS.IS_REGISTERED,
    ]);

    // Also clear phone number from native SharedPreferences
    await clearPhoneFromNative();

    console.log('✅ User data cleared from storage');
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
    throw error;
  }
};
