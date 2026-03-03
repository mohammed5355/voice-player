import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  I18nManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

I18nManager.forceRTL(true);

interface PlaybackState {
  isPlaying: boolean;
  duration: number;
  position: number;
  rate: number;
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

export default function AudioPlayerScreen() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    duration: 0,
    position: 0,
    rate: 1.0,
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

  // Generate simulated waveform data
  const generateWaveformData = (duration: number) => {
    const data: number[] = [];
    const numBars = 100;
    for (let i = 0; i < numBars; i++) {
      // Create a more natural-looking waveform
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

  // Update playback position
  const updatePlaybackStatus = async () => {
    if (sound) {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setPlaybackState(prev => ({
          ...prev,
          position: status.positionMillis || 0,
          isPlaying: status.isPlaying,
        }));

        // Check loop boundaries
        if (loopState.enabled && loopState.startPoint !== null && loopState.endPoint !== null) {
          const pos = status.positionMillis || 0;
          if (pos >= loopState.endPoint) {
            await sound.setPositionAsync(loopState.startPoint);
            await sound.playAsync();
          }
        }
      }
    }
  };

  // Effect to update playback status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sound && playbackState.isPlaying) {
      interval = setInterval(updatePlaybackStatus, 100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sound, playbackState.isPlaying, loopState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Load and play audio
  const loadSound = async (uri: string, isVideoFile: boolean = false) => {
    try {
      setIsLoading(true);
      setFileName(uri.split('/').pop() || 'Unknown File');
      setIsVideo(isVideoFile);

      // Note: If this is a video file, we'd need FFmpeg for audio extraction
      // This is a limitation - we'll try to play it directly, but video files may not work
      if (isVideoFile) {
        Alert.alert(
          'تنبيه',
          'ملاحظة: قد لا يعمل تشغيل الفيديو مباشرة. تحتاج معالجة صوتية متقدمة لاستخراج الصوت من ملفات الفيديو.',
          [{ text: 'حسناً' }]
        );
      }

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri },
        {
          shouldPlay: false,
          rate: playbackState.rate,
        }
      );

      soundRef.current = newSound;
      setSound(newSound);
      setPlaybackState(prev => ({
        ...prev,
        duration: status.durationMillis || 0,
        position: 0,
        isPlaying: false,
      }));

      // Reset loop state
      setLoopState({
        enabled: false,
        startPoint: null,
        endPoint: null,
      });

      // Generate waveform data
      setWaveformData(generateWaveformData(status.durationMillis || 30000));

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackState(prev => ({
            ...prev,
            position: status.positionMillis || 0,
            isPlaying: status.isPlaying,
            duration: status.durationMillis || 0,
          }));
        }
      });

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

        // If the file is already accessible via URI, use it directly
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
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        } else {
          await sound.playAsync();
          setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        }
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // Skip forward/backward
  const skip = async (milliseconds: number) => {
    if (!sound || !playbackState.duration) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(
          0,
          Math.min(
            playbackState.duration,
            (status.positionMillis || 0) + milliseconds
          )
        );
        await sound.setPositionAsync(newPosition);
      }
    } catch (error) {
      console.error('Error skipping:', error);
    }
  };

  // Change playback rate
  const changeRate = async (rate: number) => {
    if (!sound) return;

    try {
      await sound.setRateAsync(rate);
      setPlaybackState(prev => ({ ...prev, rate }));
    } catch (error) {
      console.error('Error changing rate:', error);
    }
  };

  // Set loop A point
  const setLoopStart = async () => {
    if (!sound) return;

    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      setLoopState(prev => ({
        ...prev,
        startPoint: status.positionMillis || 0,
      }));
    }
  };

  // Set loop B point
  const setLoopEnd = async () => {
    if (!sound || loopState.startPoint === null) {
      Alert.alert('تنبيه', 'يجب تحديد نقطة البداية أولاً');
      return;
    }

    const status = await sound.getStatusAsync();
    if (status.isLoaded) {
      const endPoint = status.positionMillis || 0;
      if (endPoint <= loopState.startPoint) {
        Alert.alert('تنبيه', 'يجب أن تكون نقطة النهاية بعد نقطة البداية');
        return;
      }
      setLoopState(prev => ({
        ...prev,
        endPoint,
        enabled: true,
      }));
      await sound.setPositionAsync(loopState.startPoint);
      await sound.playAsync();
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
    }
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
    if (!sound || !playbackState.duration) return;

    const newPosition = (percentage / 100) * playbackState.duration;
    await sound.setPositionAsync(newPosition);
  };

  // Check if current position is in loop
  const isInLoop = (position: number) => {
    if (!loopState.enabled || loopState.startPoint === null || loopState.endPoint === null) {
      return false;
    }
    return position >= loopState.startPoint && position <= loopState.endPoint;
  };

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
      {sound && (
        <View style={styles.waveformContainer}>
          <View style={styles.waveform}>
            {waveformData.map((amplitude, index) => {
              const positionInMs = (index / waveformData.length) * playbackState.duration;
              const isPlayed = positionInMs <= playbackState.position;
              const inLoopRange = isInLoop(positionInMs);
              const isStartPoint = loopState.startPoint !== null &&
                Math.abs(positionInMs - loopState.startPoint) < playbackState.duration / waveformData.length;
              const isEndPoint = loopState.endPoint !== null &&
                Math.abs(positionInMs - loopState.endPoint) < playbackState.duration / waveformData.length;

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
      {sound && (
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>
            {formatTime(playbackState.position)} / {formatTime(playbackState.duration)}
          </Text>
        </View>
      )}

      {/* Playback Controls */}
      {sound && (
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
              onPress={() => skip(-10000)}
            >
              <RewindIcon size={32} color="#333" />
              <Text style={styles.controlLabel}>10ث</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
            >
              {playbackState.isPlaying ? (
                <PauseIcon size={40} color="#fff" />
              ) : (
                <PlayIcon size={40} color="#fff" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => skip(10000)}
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

          {/* Pitch Control Note */}
          <View style={styles.pitchNote}>
            <Text style={styles.pitchNoteText}>
              ⚠️ ملاحظة: تعديل النغمة (Pitch) يتطلب مكتبة صوتية متقدمة - يمكن إضافتها باستخدام React Native Audio Processing
            </Text>
          </View>
        </View>
      )}

      {/* Initial State */}
      {!sound && !isLoading && (
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
  pitchNote: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  pitchNoteText: {
    fontSize: 11,
    color: '#E65100',
    textAlign: 'center',
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
