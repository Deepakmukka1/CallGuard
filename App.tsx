import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Bot,
  Clock,
  ContactRoundIcon,
  InfoIcon,
  MessageCircleMore,
  Newspaper,
  Phone,
  PhoneIncoming,
  RefreshCw,
  Settings,
  ShieldAlert,
  Smartphone,
  User,
  X,
} from 'lucide-react-native';
import LoginScreen from './LoginScreen';
import { clearUserData, loadUserData, saveUserData } from './utils/storage';
import { useAlert, AlertProvider } from './utils/AlertContext';
import {
  setCallScreeningEnabled,
  isCallScreeningEnabled,
} from './utils/UserPreferences';

const { AiCall } = NativeModules;

// Check if AiCall module is loaded
if (!AiCall) {
  console.error('❌ AiCall module not found!');
} else {
  console.log('✅ AiCall module loaded:', Object.keys(AiCall));
}

const eventEmitter = new NativeEventEmitter(NativeModules.AiCall);

const BASE_URL = 'https://echo.internal.svc.uat.glkmny.tech';

const CLOUD_NUMBER_MAIN = '8046809151';

function AppContent() {
  const { showAlert } = useAlert();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [callScreened, setCallScreened] = useState<any>(null);
  // const [callActive, setCallActive] = useState(false);
  const [conversations, setConversations] = useState<any>({});
  const [expandedConversations, setExpandedConversations] = useState<{
    [key: string]: boolean;
  }>({});
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [callScreeningEnabled, setCallScreeningEnabledState] = useState(true);

  // Load user data from storage on app mount
  useEffect(() => {
    async function loadStoredUserData() {
      try {
        const userData = await loadUserData();
        if (userData) {
          setUserName(userData.userName);
          setPhoneNumber(userData.phoneNumber);
          setIsRegistered(userData.isRegistered);
          console.log('✅ Restored user session from storage');
        }

        // Load call screening preference
        const screeningEnabled = await isCallScreeningEnabled();
        setCallScreeningEnabledState(screeningEnabled);
        console.log(
          '✅ Call screening status:',
          screeningEnabled ? 'ENABLED' : 'DISABLED',
        );
      } catch (error) {
        console.error('❌ Error loading stored user data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadStoredUserData();
  }, []);

  useEffect(() => {
    async function init() {
      if (!isRegistered) return;

      // Request all necessary permissions
      try {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
          PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS,
          PermissionsAndroid.PERMISSIONS.ANSWER_PHONE_CALLS,
          PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        if (
          permissions['android.permission.READ_CONTACTS'] ===
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          // const contacts = await ContactsModule.getContacts();
          // setContacts(contacts);
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }

      // Fetch conversation history
      fetchConversations();
    }
    init();
  }, [isRegistered, userName]);

  useEffect(() => {
    // Listen for call screening events
    const screenedListener = eventEmitter.addListener(
      'CALL_SCREENED',
      async event => {
        console.log('📞 Call screened:', event);
        setCallScreened(event);
        // Note: connectUser API call is now handled natively in ScreeningService.kt
        // This ensures it works even when the app is locked/backgrounded
      },
    );

    // // Listen for call active
    // const activeListener = eventEmitter.addListener('CALL_ACTIVE', () => {
    //   console.log('🟢 Call active');
    //   // setCallActive(true);
    //   setCallEvents(prev => ['🟢 Call Active', ...prev.slice(0, 9)]);
    // });

    // // Listen for call ended
    // const endedListener = eventEmitter.addListener('CALL_ENDED', () => {
    //   console.log('🔴 Call ended');
    //   setCallActive(false);
    //   setCallEvents(prev => ['🔴 Call Ended', ...prev.slice(0, 9)]);
    // });

    return () => {
      screenedListener.remove();
      // activeListener.remove();
      // endedListener.remove();
      // transcriptionListener.remove();
    };
  }, [phoneNumber]);

  const requestCallScreeningRole = async () => {
    if (!AiCall) {
      showAlert(
        'Error',
        'AiCall module not loaded. Try restarting the app.',
        'error',
      );
      return;
    }

    try {
      console.log('📱 Calling AiCall.requestRole()...');
      const result = await AiCall.requestRole();
      showAlert('Call Screening', result, 'info');
      console.log('✅ Request role result:', result);
    } catch (error: any) {
      console.error('❌ Error requesting call screening role:', error);
      showAlert(
        'Error',
        error.message || 'Failed to request call screening',
        'error',
      );
    }
  };

  const checkServiceStatus = async () => {
    try {
      const status = await AiCall.checkServiceStatus();
      console.log('Service status:', status);
      showAlert('Service Status', status.message, 'info');
    } catch (error: any) {
      console.error('Error checking service status:', error);
      showAlert(
        'Error',
        error.message || 'Failed to check service status',
        'error',
      );
    }
  };

  const handleLoginSuccess = async (name: string, phone: string) => {
    setUserName(name);
    setPhoneNumber(phone);
    setIsRegistered(true);

    // Save to persistent storage
    try {
      await saveUserData({
        userName: name,
        phoneNumber: phone,
        isRegistered: true,
      });
    } catch (error) {
      console.error('❌ Error saving user data to storage:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await clearUserData();
      setUserName('');
      setPhoneNumber('');
      setIsRegistered(false);
      setSettingsModalVisible(false);
      showAlert('Success', 'Logged out successfully', 'success');
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Error logging out:', error);
      showAlert('Error', 'Failed to logout. Please try again.', 'error');
    }
  };

  const handleToggleCallScreening = async (enabled: boolean) => {
    try {
      await setCallScreeningEnabled(enabled);
      setCallScreeningEnabledState(enabled);
      showAlert(
        'Call Screening',
        `Call screening ${enabled ? 'enabled' : 'disabled'}`,
        'success',
      );
      console.log(`✅ Call screening ${enabled ? 'ENABLED' : 'DISABLED'}`);
    } catch (error) {
      console.error('❌ Error toggling call screening:', error);
      showAlert('Error', 'Failed to update call screening preference', 'error');
    }
  };

  const fetchConversations = async () => {
    try {
      const userId = phoneNumber;
      const response = await fetch(`${BASE_URL}/allConversations/${userId}`);
      const data = await response.json();
      console.log('Conversation history', data);
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      showAlert('Error', 'Failed to fetch conversations', 'error');
    }
  };

  const handleRefreshConversations = async () => {
    setIsRefreshing(true);
    try {
      await fetchConversations();
      showAlert('Success', 'Conversations refreshed', 'success');
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRedial = (phoneNumber: string) => {
    const telUrl = `tel:${phoneNumber}`;
    Linking.canOpenURL(telUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          showAlert('Error', 'Unable to make phone calls', 'error');
        }
      })
      .catch(err => {
        console.error('Error opening dialer:', err);
        showAlert('Error', 'Failed to open dialer', 'error');
      });
  };

  // Loading Screen
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#fafafa',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#5a67d8" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#718096' }}>
          Loading...
        </Text>
      </View>
    );
  }

  // // Registration Screen
  if (!isRegistered) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Main App Screen
  return (
    <>
      <StatusBar backgroundColor={'#fafafa'} barStyle={'dark-content'} />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#fafafa' }}
        contentContainerStyle={{
          padding: 20,
          paddingTop: 50,
        }}
      >
        {/* Header */}
        <View
          style={{
            marginBottom: 24,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#2d3748',
                marginBottom: 4,
              }}
            >
              Hi, {userName}
            </Text>
            <View>
              <Text
                style={{
                  fontSize: 13,
                  color: '#718096',
                  lineHeight: 20,
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#5a67d8' }}>1.</Text>{' '}
                Enable{' '}
                <Text style={{ fontWeight: '600', color: '#2d3748' }}>
                  Call Screening
                </Text>{' '}
                from settings
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: '#718096',
                  lineHeight: 20,
                }}
              >
                <Text style={{ fontWeight: '700', color: '#5a67d8' }}>2.</Text>{' '}
                Enable{' '}
                <Text style={{ fontWeight: '600', color: '#2d3748' }}>
                  Call Forwarding
                </Text>{' '}
                from settings
              </Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSettingsModalVisible(true)}
            style={{
              backgroundColor: 'black',
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Settings size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Call Status Card */}
        {callScreened && (
          <View
            style={{
              backgroundColor: 'white',
              padding: 20,
              borderRadius: 12,
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
              borderLeftWidth: 4,
              borderLeftColor: '#48bb78',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: 12,
              }}
            >
              Last Screened Call
            </Text>
            <View
              style={{
                backgroundColor: '#f7fafc',
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ fontSize: 14, color: '#718096', marginBottom: 6 }}>
                <PhoneIncoming size={12} color={'#718096'} />{' '}
                {callScreened.phoneNumber}
              </Text>
              <Text style={{ fontSize: 14, color: '#718096' }}>
                <ContactRoundIcon size={14} color={'#718096'} /> {''}
                {callScreened?.isInContacts ? 'In contacts' : 'Not in contacts'}
              </Text>
              {callScreened.simNumber && (
                <Text
                  style={{ fontSize: 14, color: '#718096', marginBottom: 6 }}
                >
                  📞 SIM Number: {callScreened.simNumber}
                </Text>
              )}
              <Text style={{ fontSize: 14, color: '#718096', marginBottom: 6 }}>
                <InfoIcon size={12} color={'#718096'} />{' '}
                {callScreened.action.replace('_', ' ')}
              </Text>
              <Text style={{ fontSize: 14, color: '#718096' }}>
                <ShieldAlert size={14} color={'#718096'} /> {''}
                {callScreened.verificationStatus === 1
                  ? 'Verified'
                  : callScreened.verificationStatus === 2
                  ? 'Failed Verification'
                  : 'Not Verified'}
              </Text>
            </View>
          </View>
        )}

        {/* Call Events Log */}
        {/* <View
        style={{
          backgroundColor: '#f8f9fa',
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
        }}
      >
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
          Call Events:
        </Text>
        {callEvents.length === 0 ? (
          <Text style={{ color: 'gray', fontStyle: 'italic' }}>
            No events yet. Make a test call!
          </Text>
        ) : (
          callEvents.map((event, index) => (
            <Text key={index} style={{ marginBottom: 5, fontSize: 12 }}>
              {event}
            </Text>
          ))
        )}
      </View> */}

        {/* Conversation History */}
        <View
          style={{
            backgroundColor: 'white',
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
            shadowRadius: 6,
            // borderWidth: 0.2
            // elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* <History size={20} style={{ marginTop: 2 }} /> */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: 32,
                textAlign: 'center',
                textDecorationLine: 'underline',
                flex: 1,
                // marginB: 12
                // paddingBottom: 18
              }}
            >
              Conversation History
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRefreshConversations}
              disabled={isRefreshing}
              style={{
                backgroundColor: isRefreshing ? '#cbd5e0' : '#5a67d8',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                marginBottom: 32,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isRefreshing ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                    Refreshing...
                  </Text>
                </>
              ) : (
                <>
                  <RefreshCw size={16} color="white" />
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                    Refresh
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {Object.keys(conversations).length === 0 ? (
            <View
              style={{
                padding: 20,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: '#a0aec0',
                  fontSize: 14,
                  fontStyle: 'italic',
                }}
              >
                No conversations
              </Text>
            </View>
          ) : (
            Object.entries(conversations).map(
              ([key, data]: [string, any], idx) => {
                const { conversation = [], summary } = data;
                const summaryData = summary || {};
                const isLastItem =
                  idx === Object.entries(conversations).length - 1;
                return (
                  <View key={key}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <View>
                        <Text
                          style={{
                            fontWeight: '600',
                            fontSize: 14,
                            color: '#4a5568',
                            flex: 1,
                          }}
                        >
                          <PhoneIncoming
                            fill={'black'}
                            size={12}
                            style={{ marginRight: 6 }}
                          />{' '}
                          Call from{' '}
                          {summaryData.fromNumber || key.split('_')[0]}
                        </Text>
                        <Text>
                          at {new Date(summaryData.timestamp).toDateString()}{' '}
                          {new Date(summaryData.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() =>
                          handleRedial(
                            summaryData.fromNumber || key.split('_')[0],
                          )
                        }
                        style={{
                          backgroundColor: '#222222',
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Phone fill={'white'} size={14} />
                        <Text
                          style={{
                            color: 'white',
                            fontWeight: '600',
                            fontSize: 13,
                          }}
                        >
                          Redial
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        backgroundColor: '#f7fafc',
                        padding: 16,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                      }}
                    >
                      {/* Summary Section */}
                      {summaryData.summary && (
                        <View
                          style={{
                            backgroundColor: '#fefcbf',
                            padding: 12,
                            borderRadius: 8,
                            marginBottom: 12,
                            borderLeftWidth: 3,
                            borderLeftColor: '#ecc94b',
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: '600',
                              marginBottom: 8,
                              fontSize: 13,
                              color: '#744210',
                            }}
                          >
                            <Newspaper size={13} color={'#744210'} /> Summary
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              marginBottom: 8,
                              color: '#975a16',
                              lineHeight: 18,
                            }}
                          >
                            {summaryData.summary}
                          </Text>

                          {/* View Conversation Button */}
                          {conversation.length > 0 && (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => {
                                setExpandedConversations(prev => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }));
                              }}
                              style={{
                                backgroundColor: '#975a16',
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: 6,
                                alignSelf: 'flex-start',
                                marginTop: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: '#fffff0',
                                  fontSize: 11,
                                  fontWeight: '600',
                                }}
                              >
                                {expandedConversations[key]
                                  ? 'Hide Conversation'
                                  : 'View Conversation'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {/* Expanded Details - shown only when expanded */}
                      {expandedConversations[key] && (
                        <>
                          {/* Call Details */}
                          <View
                            style={{
                              backgroundColor: '#fffff0',
                              padding: 12,
                              borderRadius: 8,
                              marginBottom: 12,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#744210',
                                marginBottom: 3,
                              }}
                            >
                              <Smartphone size={12} color={'#744210'} />{' '}
                              {summaryData.fromNumber || 'Unknown'}
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                color: '#744210',
                                marginBottom: 3,
                              }}
                            >
                              <Clock size={12} color={'#744210'} />{' '}
                              {summaryData.timestamp
                                ? new Date(
                                    summaryData.timestamp,
                                  ).toLocaleString()
                                : 'N/A'}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#744210' }}>
                              <MessageCircleMore size={12} color={'#744210'} />{' '}
                              {summaryData.conversationLength ||
                                conversation.length}{' '}
                              messages
                            </Text>
                          </View>

                          {/* Conversation Messages */}
                          {conversation.map((convo: any, index: number) => (
                            <View key={index} style={{ marginBottom: 12 }}>
                              <View
                                style={{
                                  backgroundColor: '#e6f2ff',
                                  padding: 10,
                                  borderRadius: 8,
                                  marginBottom: 6,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#4c51bf',
                                    fontWeight: '600',
                                    marginBottom: 4,
                                  }}
                                >
                                  <User size={11} color={'#4c51bf'} /> User
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    color: '#434190',
                                    lineHeight: 18,
                                  }}
                                >
                                  {convo.user}
                                </Text>
                              </View>
                              <View
                                style={{
                                  backgroundColor: '#c6f6d5',
                                  padding: 10,
                                  borderRadius: 8,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: '#2f855a',
                                    fontWeight: '600',
                                    marginBottom: 4,
                                  }}
                                >
                                  <Bot color={'#2f855a'} size={11} /> Assistant
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 13,
                                    color: '#276749',
                                    lineHeight: 18,
                                  }}
                                >
                                  {convo.bot}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                    </View>

                    {/* Separator */}
                    {!isLastItem && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: '#e2e8f0',
                          marginVertical: 20,
                          marginHorizontal: 4,
                        }}
                      />
                    )}
                  </View>
                );
              },
            )
          )}
        </View>

        {/* Contacts List */}
        <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
          {/* Contacts ({contacts.length}): */}
        </Text>
        {/* {contacts.map((contact: any, index) => (
        <Text key={index} style={{ marginBottom: 5 }}>
          {contact.name}
        </Text>
      ))} */}
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={settingsModalVisible}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <StatusBar
            backgroundColor="rgba(0, 0, 0, 0.5)"
            barStyle="light-content"
          />
        </View>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 20,
              width: '90%',
              maxWidth: 380,
            }}
          >
            {/* Modal Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#e2e8f0',
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#1a202c',
                }}
              >
                Settings
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSettingsModalVisible(false)}
              >
                <X size={20} color="#4a5568" />
              </TouchableOpacity>
            </View>

            {/* Call Screening Status Section */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: 8,
                }}
              >
                Call Screening Status
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleToggleCallScreening(true)}
                  style={{
                    flex: 1,
                    backgroundColor: callScreeningEnabled
                      ? '#48bb78'
                      : '#e2e8f0',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: callScreeningEnabled ? 'white' : '#718096',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Enabled
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleToggleCallScreening(false)}
                  style={{
                    flex: 1,
                    backgroundColor: !callScreeningEnabled
                      ? '#e53e3e'
                      : '#e2e8f0',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: !callScreeningEnabled ? 'white' : '#718096',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Disabled
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  backgroundColor: callScreeningEnabled ? '#e6fffa' : '#fff5f5',
                  padding: 8,
                  borderRadius: 6,
                  borderLeftWidth: 3,
                  borderLeftColor: callScreeningEnabled ? '#48bb78' : '#e53e3e',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: callScreeningEnabled ? '#234e52' : '#742a2a',
                    lineHeight: 16,
                  }}
                >
                  {callScreeningEnabled
                    ? 'ℹ️ Unknown numbers will receive busy signal'
                    : '⚠️ All calls will ring normally'}
                </Text>
              </View>
            </View>

            {/* Call Screening Role Section */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: 8,
                }}
              >
                Call Screening Permission
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={requestCallScreeningRole}
                  style={{
                    flex: 1,
                    backgroundColor: 'black',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Enable
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={checkServiceStatus}
                  style={{
                    flex: 1,
                    backgroundColor: '#4a5568',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Check Status
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  backgroundColor: '#e8f4fd',
                  padding: 8,
                  borderRadius: 6,
                  borderLeftWidth: 3,
                  borderLeftColor: '#5a67d8',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: '#2c5282',
                    lineHeight: 16,
                  }}
                >
                  ℹ️ Choose "VoiceCall" when dialog popup appears
                </Text>
              </View>
            </View>

            {/* Call Forwarding Section */}
            <View style={{ marginBottom: 14 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: 8,
                }}
              >
                Call Forwarding
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const ussdCode = `tel:**67*${CLOUD_NUMBER_MAIN}%23`;
                    Linking.openURL(ussdCode).catch(() =>
                      showAlert(
                        'Error',
                        'Failed to execute call forwarding',
                        'error',
                      ),
                    );
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: 'black',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Enable
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const ussdCode = `tel:%23%2367%23`;
                    Linking.openURL(ussdCode).catch(() =>
                      showAlert(
                        'Error',
                        'Failed to disable call forwarding',
                        'error',
                      ),
                    );
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: '#4a5568',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    Disable
                  </Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  backgroundColor: '#fef5e7',
                  padding: 8,
                  borderRadius: 6,
                  borderLeftWidth: 3,
                  borderLeftColor: '#f39c12',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: '#d68910',
                    lineHeight: 16,
                  }}
                >
                  ⚠️ Wait for activation code to complete before closing dailer
                </Text>
              </View>
            </View>

            {/* Logout Section */}
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: '#4a5568',
                  marginBottom: 8,
                }}
              >
                Account
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleLogout}
                style={{
                  backgroundColor: '#e53e3e',
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 13,
                    fontWeight: '500',
                  }}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <AlertProvider>
      <AppContent />
    </AlertProvider>
  );
}
