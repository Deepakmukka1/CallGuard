import { useState } from 'react';
import {
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Smartphone, VerifiedIcon } from 'lucide-react-native';
import RNOtpVerify from 'react-native-otp-verify';
import { useAlert } from './utils/AlertContext';

const BASE_URL = 'https://echo.internal.svc.uat.glkmny.tech';

type LoginStep = 'phone' | 'otp' | 'name';

interface LoginScreenProps {
  onLoginSuccess: (name: string, phone: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const { showAlert } = useAlert();
  const [step, setStep] = useState<LoginStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    isExistingUser: boolean;
    userDetails?: {
      userId: string;
      name: string;
      phoneNumber: string;
    };
  } | null>(null);

  const generateOTP = () => {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    return otp;
  };

  const handleGetPhoneNumber = async () => {
    try {
      const retrievedPhoneNumber = await RNOtpVerify.requestHint();
      console.log('📱 Phone number hint:', retrievedPhoneNumber);
      const digitsOnly = retrievedPhoneNumber.replace(/\D/g, '');
      const last10Digits = digitsOnly.slice(-10);
      setPhoneNumber(last10Digits);
    } catch (error: any) {
      console.error('Error getting phone number hint:', error);
      showAlert('Error', 'Failed to retrieve phone number', 'error');
    }
  };

  const handleSendOTP = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      showAlert('Error', 'Please enter a valid phone number', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // Generate OTP client-side
      const newOTP = generateOTP();
      setGeneratedOTP(newOTP);

      // Send OTP via WhatsApp
      const response = await fetch(`${BASE_URL}/sendWhatsappMsg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.slice(-10).trim(),
          otp: newOTP,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data.error || 'Failed to send OTP', 'error');
        return;
      }

      // Store user info from backend response
      if (data.isExistingUser) {
        setUserInfo({
          isExistingUser: data.isExistingUser,
          userDetails: data.userDetails,
        });
      }

      // Alert.alert('Success', 'OTP sent to your WhatsApp');
      setStep('otp');
    } catch (error: any) {
      console.error('❌ Error sending OTP:', error);
      showAlert('Error', 'Failed to send OTP. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = () => {
    if (!otp.trim() || otp.length < 6) {
      showAlert('Error', 'Please enter a valid 6-digit OTP', 'error');
      return;
    }

    // Verify OTP client-side
    if (otp.trim() === generatedOTP) {
      console.log('✅ OTP verified successfully');

      // Check if existing user
      if (userInfo?.isExistingUser && userInfo.userDetails) {
        console.log('✅ Existing user logged in:', userInfo.userDetails);
        onLoginSuccess(userInfo.userDetails.name, phoneNumber.slice(-10).trim());
      } else {
        // New user, proceed to name entry
        setStep('name');
      }
    } else {
      showAlert('Error', 'Invalid OTP. Please try again.', 'error');
    }
  };

  const handleSubmit = async () => {
    if (!nameInput.trim()) {
      showAlert('Error', 'Please enter your name', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/registerUser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.slice(-10).trim(),
          name: nameInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showAlert('Error', data.error || 'Failed to register user', 'error');
        return;
      }

      console.log('✅ User registered:', data);
      onLoginSuccess(nameInput.trim(), phoneNumber.slice(-10).trim());
    } catch (error: any) {
      console.error('❌ Error registering user:', error);
      showAlert('Error', 'Failed to register user. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar backgroundColor={'#fafafa'} barStyle={'dark-content'} />
      <View
        style={{
          flex: 1,
          backgroundColor: '#fafafa',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: 'white',
            padding: 32,
            borderRadius: 16,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#2d3748',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            Welcome
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: '#718096',
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            {step === 'phone' &&
              'Enter your phone number to receive OTP via WhatsApp'}
            {step === 'otp' && 'Enter the OTP sent to your WhatsApp'}
            {step === 'name' && 'Complete your profile'}
          </Text>

          {/* Phone Number Step */}
          {step === 'phone' && (
            <>
              <View style={{ marginBottom: 16 }}>
                <View
                  style={{
                    backgroundColor: '#f7fafc',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingRight: 4,
                  }}
                >
                  <TextInput
                    style={{
                      flex: 1,
                      padding: 16,
                      fontSize: 16,
                      color: '#2d3748',
                    }}
                    placeholder="Phone number"
                    placeholderTextColor="#a0aec0"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={10}
                    autoFocus
                  />
                  <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={handleGetPhoneNumber}
                    style={{
                      backgroundColor: '#5a67d8',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Smartphone size={16} color="white" />
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      Auto-fill
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    color: '#a0aec0',
                    marginTop: 6,
                    marginLeft: 4,
                  }}
                >
                  Tap "Auto-fill" to use your device's phone number
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSendOTP}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#a0aec0' : '#5a67d8',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {isLoading ? 'Sending...' : 'Send OTP'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* OTP Verification Step */}
          {step === 'otp' && (
            <>
              <View
                style={{
                  backgroundColor: '#d4f4dd',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: '#2f855a',
                    textAlign: 'center',
                  }}
                >
                  OTP sent to WhatsApp{' '}
                  <Text style={{ fontWeight: '600' }}>+91{phoneNumber}</Text>
                </Text>
              </View>

              <TextInput
                style={{
                  backgroundColor: '#f7fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  fontSize: 16,
                  color: '#2d3748',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
                placeholder="Enter OTP"
                placeholderTextColor="#a0aec0"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleVerifyOTP}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#a0aec0' : '#5a67d8',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {isLoading ? 'Verifying...' : 'Verify OTP'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setStep('phone')}
                style={{
                  paddingVertical: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: '#5a67d8',
                    fontSize: 14,
                    fontWeight: '500',
                  }}
                >
                  Change phone number
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Name Input Step */}
          {step === 'name' && (
            <>
              <View
                style={{
                  backgroundColor: '#c6f6d5',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  flexDirection:'row',
                  justifyContent:'center',
                  gap: 10
                }}
              >
                <VerifiedIcon
                  color={'#2f855a'}
                  size={16}
                  style={{ marginTop: 2 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: '#2f855a',
                    textAlign: 'center',
                    fontWeight: '600',
                    alignItems: 'center',
                  }}
                >
                  Verification successfull
                </Text>
              </View>

              <TextInput
                style={{
                  backgroundColor: '#f7fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 10,
                  padding: 16,
                  fontSize: 16,
                  color: '#2d3748',
                  marginBottom: 16,
                }}
                placeholder="Your name"
                placeholderTextColor="#a0aec0"
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
              />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSubmit}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? '#a0aec0' : '#5a67d8',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                  }}
                >
                  {isLoading ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </>
  );
}
