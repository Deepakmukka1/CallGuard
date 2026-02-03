import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { AlertCircle, CheckCircle, InfoIcon } from 'lucide-react-native';

interface AlertConfig {
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info';
}

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    type?: 'error' | 'success' | 'info',
  ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({
    title: '',
    message: '',
    type: 'info',
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'error' | 'success' | 'info' = 'info',
  ) => {
    setConfig({ title, message, type });
    setVisible(true);
  };

  const hideAlert = () => {
    setVisible(false);
  };

  const getAlertColor = () => {
    switch (config.type) {
      case 'error':
        return {
          bg: '#fee',
          border: '#e53e3e',
          icon: '#c53030',
          text: '#742a2a',
        };
      case 'success':
        return {
          bg: '#d4f4dd',
          border: '#48bb78',
          icon: '#2f855a',
          text: '#22543d',
        };
      case 'info':
      default:
        return {
          bg: '#e6f2ff',
          border: '#5a67d8',
          icon: '#4c51bf',
          text: '#2c5282',
        };
    }
  };

  const getIcon = () => {
    const colors = getAlertColor();
    switch (config.type) {
      case 'error':
        return <AlertCircle size={24} color={colors.icon} />;
      case 'success':
        return <CheckCircle size={24} color={colors.icon} />;
      case 'info':
      default:
        return <InfoIcon size={24} color={colors.icon} />;
    }
  };

  const colors = getAlertColor();

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={hideAlert}
      >
        <View style={styles.overlay}>
          <StatusBar
            backgroundColor="rgba(0, 0, 0, 0.5)"
            barStyle="dark-content"
          />
          <View style={styles.container}>
            <View
              style={[
                styles.alertBox,
                {
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.iconContainer}>{getIcon()}</View>
              <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {config.title}
                </Text>
                <Text style={[styles.message, { color: colors.text }]}>
                  {config.message}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={hideAlert}
                style={[styles.button, { backgroundColor: colors.border }]}
              >
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  alertBox: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
