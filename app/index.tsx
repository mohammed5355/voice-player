import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  ActivityIndicator,
  Alert,
  AppState,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import TrackPlayer, {
  Event,
  State,
  useTrackPlayerEvents,
  usePlaybackState,
  useProgress,
  Capability,
} from 'react-native-track-player';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

I18nManager.forceRTL(true);

interface PlaybackState {
  rate: number;
  pitch: number;
}

interface LoopState {
  enabled: boolean;
  startPoint: number | null;
  endPoint: number | null;
}

type IconProps = {
  size: number;
  color: string;
};

// Simple SVG-like icons using React components
const PlayIcon = ({ size, color }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: 0,
      height: 0,
      borderLeftWidth: size * 0.4,
      borderLeftColor: color,
      borderTopWidth: size * 0.25,
      borderTopColor: 'transparent',
      borderBottomWidth: size * 0.25,
      borderBottomColor: 'transparent',
    }} />
  </View>
);

const PauseIcon = ({ size, color }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', gap: size * 0.15 }}>
      <View style={{ width: size * 0.25, height: size * 0.6, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: size * 0.25, height: size * 0.6, backgroundColor: color, borderRadius: 2 }} />
    </View>
  </View>
);

const RewindIcon = ({ size, color }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 0,
        height: 0,
        borderRightWidth: size * 0.3,
        borderRightColor: color,
        borderTopWidth: size * 0.2,
        borderTopColor: 'transparent',
        borderBottomWidth: size * 0.2,
        borderBottomColor: 'transparent',
      }} />
      <View style={{
        width: 0,
        height: 0,
        borderRightWidth: size * 0.3,
        borderRightColor: color,
        borderTopWidth: size * 0.2,
        borderTopColor: 'transparent',
        borderBottomWidth: size * 0.2,
        borderBottomColor: 'transparent',
        transform: [{ translateX: -size * 0.1 }],
      }} />
    </View>
  </View>
);

const ForwardIcon = ({ size, color }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.3,
        borderLeftColor: color,
        borderTopWidth: size * 0.2,
        borderTopColor: 'transparent',
        borderBottomWidth: size * 0.2,
        borderBottomColor: 'transparent',
      }} />
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: size * 0.3,
        borderLeftColor: color,
        borderTopWidth: size * 0.2,
        borderTopColor: 'transparent',
        borderBottomWidth: size * 0.2,
        borderBottomColor: 'transparent',
        transform: [{ translateX: -size * 0.1 }],
      }} />
    </View>
  </View>
);

const UploadIcon = ({ size, color }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.6,
      height: size * 0.8,
      borderTopWidth: 3,
      borderTopColor: color,
      borderRightWidth: 3,
      borderRightColor: color,
      borderBottomWidth: 3,
      borderBottomColor: color,
      borderLeftWidth: 3,
      borderLeftColor: color,
      borderTopLeftRadius: size * 0.15,
      borderTopRightRadius: size * 0.15,
      borderBottomLeftRadius: size * 0.15,
      borderBottomRightRadius: size * 0.15,
    }} />
  </View>
);

const LoopIcon = ({ size, color, enabled }: IconProps & { enabled?: boolean }) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{
      width: size * 0.7,
      height: size * 0.5,
      borderRadius: size * 0.3,
      borderWidth: 2,
      borderColor: color,
      borderTopWidth: 2,
      borderTopColor: color,
      borderRightWidth: 2,
      borderRightColor: 'transparent',
      borderLeftWidth: 2,
      borderLeftColor: color,
      transform: [{ rotate: '90deg' }],
    }} />
    <View style={{
      position: 'absolute',
      width: 0,
      height: 0,
      borderTopWidth: size * 0.15,
      borderTopColor: color,
      borderLeftWidth: size * 0.1,
      borderLeftColor: 'transparent',
      transform: [{ translateX: -size * 0.25 }, { translateY: -size * 0.1 }],
    }} />
    <View style={{
      position: 'absolute',
      width: 0,
      height: 0,
      borderTopWidth: size * 0.15,
      borderTopColor: color,
      borderLeftWidth: size * 0.1,
      borderLeftColor: 'transparent',
      transform: [{ rotate: '180deg' }, { translateX: size * 0.25 }, { translateY: size * 0.1 }],
    }} />
    {enabled && (
      <View style={{
        position: 'absolute',
        width: size * 0.3,
        height: size * 0.15,
        backgroundColor: color,
        borderRadius: 2,
      }} />
    )}
  </View>
);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Setup track player
const setupPlayer = async () => {
  try {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SeekTo,
      ],
    });
  } catch (error) {
    console.log('Player setup failed, might already be setup');
  }
};

export default function AudioPlayerScreen() {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    rate: 1.0,
    pitch: 1.0,
  });
  const [loopState, setLoopState] = useState<LoopState>({
    enabled: false,
    startPoint: null,
    endPoint: null,
  });
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isVideo, setIsVideo] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const playerState = usePlaybackState();
  const { position, duration } = useProgress();

  // Generate simulated waveform data
  const generateWaveformData = (dur: number) => {
    const data: number[] = [];
    const numBars = 100;
    for (let i = 0; i < numBars; i++) {
      const baseAmplitude = 0.2 + Math.random() * 0.3;
      const variation = Math.sin(i * 0.2) * 0.15;
      data.push(Math.max(0.1, Math.min(0.9, baseAmplitude + variation)));
    }
    return data;
  };

  // Format time helper
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Request storage permission for Android
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Initialize player
  useEffect(() => {
    setupPlayer().then(() => setIsReady(true));

    return () => {
      TrackPlayer.destroy();
    };
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && playerState === State.Ready) {
        TrackPlayer.play();
      }
    });

    return () => subscription.remove();
  }, [playerState]);

  // Loop checking
  useTrackPlayerEvents([Event.PlaybackProgress], async (event) => {
    if (loopState.enabled && loopState.startPoint !== null && loopState.endPoint !== null) {
      if (event.position >= loopState.endPoint) {
        await TrackPlayer.seekTo(loopState.startPoint);
        if (playerState === State.Playing) {
          await TrackPlayer.play();
        }
      }
    }
  });

  // Load and play audio
  const loadSound = async (uri: string, isVideoFile: boolean = false) => {
    try {
      setIsLoading(true);
      setFileName(uri.split('/').pop() || 'Unknown File');
      setIsVideo(isVideoFile);

      if (isVideoFile) {
        Alert.alert(
          'تنبيه',
          'ملاحظة: قد لا يعمل تشغيل الفيديو مباشرة. تحتاج معالجة صوتية متقدمة لاستخراج الصوت من ملفات الفيديو.',
          [{ text: 'حسناً' }]
        );
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        url: uri,
      });

      // Reset loop state
      setLoopState({
        enabled: false,
        startPoint: null,
        endPoint: null,
      });

      // Generate waveform data
      setWaveformData(generateWaveformData(duration || 30000));

      // Apply current settings
      await TrackPlayer.setRate(playbackState.rate);
      await TrackPlayer.setPitch(playbackState.pitch);

    } catch (error) {
      console.error('Error loading sound:', error);
      Alert.alert('خطأ', 'فشل في تحميل الملف');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    try {
      const hasPermission = await requestStoragePermission();
      if (!hasPermission) {
        Alert.alert('تنبيه', 'يحتاج إذن الوصول للملفات الصوتية');
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'audio/*',
          'video/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const mimeType = file.mimeType || '';
        const isVideoFile = mimeType.startsWith('video/');

        if (file.uri) {
          await loadSound(file.uri, isVideoFile);
        }
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('خطأ', 'فشل في اختيار الملف');
    }
  };

  // Play/Pause toggle
  const togglePlayPause = async () => {
    if (playerState === State.Playing) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  // Skip forward/backward
  const skip = async (milliseconds: number) => {
    try {
      const newPosition = Math.max(0, position + milliseconds / 1000);
      await TrackPlayer.seekTo(newPosition);
    } catch (error) {
      console.error('Error skipping:', error);
    }
  };

  // Change playback rate (speed only)
  const changeRate = async (rate: number) => {
    try {
      await TrackPlayer.setRate(rate);
      setPlaybackState(prev => ({ ...prev, rate }));
    } catch (error) {
      console.error('Error changing rate:', error);
    }
  };

  // Change pitch (independent of speed with react-native-track-player)
  const changePitch = async (pitch: number) => {
    try {
      await TrackPlayer.setPitch(pitch);
      setPlaybackState(prev => ({ ...prev, pitch }));
    } catch (error) {
      console.error('Error changing pitch:', error);
    }
  };

  // Set loop A point
  const setLoopStart = async () => {
    setLoopState(prev => ({
      ...prev,
      startPoint: position,
    }));
  };

  // Set loop B point
  const setLoopEnd = async () => {
    if (loopState.startPoint === null) {
      Alert.alert('تنبيه', 'يجب تحديد نقطة البداية أولاً');
      return;
    }

    const endPoint = position;
    if (endPoint <= loopState.startPoint) {
      Alert.alert('تنبيه', 'يجب أن تكون نقطة النهاية بعد نقطة البداية');
      return;
    }
    setLoopState(prev => ({
      ...prev,
      endPoint,
      enabled: true,
    }));
    await TrackPlayer.seekTo(loopState.startPoint);
    await TrackPlayer.play();
  };

  // Clear loop
  const clearLoop = () => {
    setLoopState({
      enabled: false,
      startPoint: null,
      endPoint: null,
    });
  };

  // Seek to position (from waveform tap)
  const seekToPosition = async (percentage: number) => {
    if (duration === 0) return;

    const newPosition = (percentage / 100) * duration;
    await TrackPlayer.seekTo(newPosition);
  };

  // Check if current position is in loop
  const isInLoop = (pos: number) => {
    if (!loopState.enabled || loopState.startPoint === null || loopState.endPoint === null) {
      return false;
    }
    return pos >= loopState.startPoint && pos <= loopState.endPoint;
  };

  const isPlaying = playerState === State.Playing;

  if (!isReady) {
    return (
      <View style={styles.container}>
        <View style={styles.initialState}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.initialText}>جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مشغل الصوت</Text>
        {fileName && (
          <Text style={styles.fileName} numberOfLines={1}>
            {isVideo && '🎬 '}{fileName}
          </Text>
        )}
      </View>

      {/* File Upload Button */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleFileUpload}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <>
            <UploadIcon size={32} color="#fff" />
            <Text style={styles.uploadButtonText}>
              {fileName ? 'تغيير الملف' : 'اختيار ملف صوتي أو فيديو'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Waveform Visualization */}
      {fileName && (
        <View style={styles.waveformContainer}>
          <View style={styles.waveform}>
            {waveformData.map((amplitude, index) => {
              const positionInSec = (index / waveformData.length) * duration;
              const isPlayed = positionInSec <= position;
              const inLoopRange = isInLoop(positionInSec);
              const isStartPoint = loopState.startPoint !== null &&
                Math.abs(positionInSec - loopState.startPoint) < duration / waveformData.length;
              const isEndPoint = loopState.endPoint !== null &&
                Math.abs(positionInSec - loopState.endPoint) < duration / waveformData.length;

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => seekToPosition((index / waveformData.length) * 100)}
                >
                  <View
                    style={[
                      styles.waveBar,
                      {
                        height: amplitude * 80,
                        backgroundColor: inLoopRange ? '#FF6B6B' :
                          isPlayed ? '#4CAF50' : '#888',
                      },
                      isStartPoint && styles.loopStartMarker,
                      isEndPoint && styles.loopEndMarker,
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Time Display */}
      {fileName && (
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(position * 1000)} / {formatTime(duration * 1000)}
          </Text>
        </View>
      )}

      {/* Playback Controls */}
      {fileName && (
        <View style={styles.controlsContainer}>
          {/* A-B Loop Controls */}
          <View style={styles.loopControls}>
            <TouchableOpacity
              style={[
                styles.loopButton,
                loopState.startPoint !== null && styles.loopButtonActive,
              ]}
              onPress={setLoopStart}
            >
              <Text style={[
                styles.loopButtonText,
                loopState.startPoint !== null && styles.loopButtonTextActive,
              ]}>
                A
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.loopButton,
                loopState.enabled && styles.loopButtonActive,
              ]}
              onPress={setLoopEnd}
              disabled={loopState.startPoint === null}
            >
              <Text style={[
                styles.loopButtonText,
                loopState.enabled && styles.loopButtonTextActive,
              ]}>
                B
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clearLoopButton}
              onPress={clearLoop}
              disabled={!loopState.enabled}
            >
              <LoopIcon size={20} color={loopState.enabled ? '#FF6B6B' : '#888'} enabled={loopState.enabled} />
            </TouchableOpacity>
          </View>

          {/* Main Controls */}
          <View style={styles.mainControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => skip(-10)}
            >
              <RewindIcon size={32} color="#333" />
              <Text style={styles.controlLabel}>10ث</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
            >
              {isPlaying ? (
                <PauseIcon size={40} color="#fff" />
              ) : (
                <PlayIcon size={40} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => skip(10)}
            >
              <ForwardIcon size={32} color="#333" />
              <Text style={styles.controlLabel}>10ث</Text>
            </TouchableOpacity>
          </View>

          {/* Speed Slider */}
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>السرعة: {playbackState.rate.toFixed(1)}×</Text>
            <View style={styles.slider}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.speedButton,
                    playbackState.rate === rate && styles.speedButtonActive,
                  ]}
                  onPress={() => changeRate(rate)}
                >
                  <Text
                    style={[
                      styles.speedButtonText,
                      playbackState.rate === rate && styles.speedButtonTextActive,
                    ]}
                  >
                    {rate}×
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pitch Control */}
          <View style={styles.pitchContainer}>
            <Text style={styles.sliderLabel}>النغمة: {playbackState.pitch.toFixed(1)}×</Text>
            <View style={styles.pitchSlider}>
              {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((pitch) => (
                <TouchableOpacity
                  key={pitch}
                  style={[
                    styles.pitchButton,
                    playbackState.pitch === pitch && styles.pitchButtonActive,
                  ]}
                  onPress={() => changePitch(pitch)}
                >
                  <Text
                    style={[
                      styles.pitchButtonText,
                      playbackState.pitch === pitch && styles.pitchButtonTextActive,
                    ]}
                  >
                    {pitch}×
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.pitchInfoText}>
              ✓ النغمة تعمل بشكل مستقل عن السرعة
            </Text>
          </View>
        </View>
      )}

      {/* Initial State */}
      {!fileName && !isLoading && (
        <View style={styles.initialState}>
          <UploadIcon size={64} color="#888" />
          <Text style={styles.initialText}>
            اضغط على الزر أعلاه لاختيار ملف صوتي أو فيديو
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  waveformContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    justifyContent: 'space-between',
  },
  waveBar: {
    width: Math.max(2, (SCREEN_WIDTH - 80) / 100),
    backgroundColor: '#888',
    borderRadius: 2,
  },
  loopStartMarker: {
    borderTopColor: '#FF6B6B',
    borderTopWidth: 3,
  },
  loopEndMarker: {
    borderBottomColor: '#FF6B6B',
    borderBottomWidth: 3,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  controlsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loopControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  loopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loopButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  loopButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  loopButtonTextActive: {
    color: '#fff',
  },
  clearLoopButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlButton: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  slider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  speedButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: '#4CAF50',
  },
  speedButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  speedButtonTextActive: {
    color: '#fff',
  },
  pitchContainer: {
    marginBottom: 16,
  },
  pitchSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pitchButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  pitchButtonActive: {
    backgroundColor: '#2196F3',
  },
  pitchButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  pitchButtonTextActive: {
    color: '#fff',
  },
  pitchInfoText: {
    fontSize: 11,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  initialState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
  },
});
