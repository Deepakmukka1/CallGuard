import { NativeModules } from 'react-native';

interface UserPreferencesInterface {
  savePhoneNumber(phoneNumber: string): Promise<boolean>;
  getPhoneNumber(): Promise<string | null>;
  clearPhoneNumber(): Promise<boolean>;
  setCallScreeningEnabled(enabled: boolean): Promise<boolean>;
  isCallScreeningEnabled(): Promise<boolean>;
}

const { UserPreferences } = NativeModules;

export const savePhoneNumber = async (phoneNumber: string): Promise<boolean> => {
  try {
    return await UserPreferences.savePhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Error saving phone number:', error);
    throw error;
  }
};

export const getPhoneNumber = async (): Promise<string | null> => {
  try {
    return await UserPreferences.getPhoneNumber();
  } catch (error) {
    console.error('Error getting phone number:', error);
    return null;
  }
};

export const clearPhoneNumber = async (): Promise<boolean> => {
  try {
    return await UserPreferences.savePhoneNumber('');
  } catch (error) {
    console.error('Error clearing phone number:', error);
    throw error;
  }
};

export const setCallScreeningEnabled = async (enabled: boolean): Promise<boolean> => {
  try {
    return await UserPreferences.setCallScreeningEnabled(enabled);
  } catch (error) {
    console.error('Error setting call screening preference:', error);
    throw error;
  }
};

export const isCallScreeningEnabled = async (): Promise<boolean> => {
  try {
    return await UserPreferences.isCallScreeningEnabled();
  } catch (error) {
    console.error('Error getting call screening preference:', error);
    return true; // Default to enabled on error
  }
};

export default {
  savePhoneNumber,
  getPhoneNumber,
  clearPhoneNumber,
  setCallScreeningEnabled,
  isCallScreeningEnabled,
} as UserPreferencesInterface;
