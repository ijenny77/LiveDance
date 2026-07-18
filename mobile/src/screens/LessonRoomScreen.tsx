import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LiveKitRoom,
  AudioSession,
  useTracks,
  useLocalParticipant,
  useChat,
  VideoTrack,
  isTrackReference,
  type TrackReferenceOrPlaceholder,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Badge } from '../components/Badge';
import { colors } from '../theme';
import { Lesson } from '../types';
import { resolveSession, leaveLessonAttendance, getLiveKitToken } from '../lib/api';
import { supabase } from '../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'LessonRoom'>;

export function LessonRoomScreen({ route, navigation }: Props) {
  const { lessonId, token } = route.params;
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const leftRef = useRef(false);
  const insets = useSafeAreaInsets();

  // The native audio engine WebRTC captures/plays through must be started before
  // connecting to a room and stopped when leaving, independent of React lifecycle.
  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    const verify = async () => {
      // Admin/instructor bypass — skip the student session entirely, just confirm
      // an authenticated admin session, mirroring app/lesson/[id]/page.tsx on the web.
      if (token === 'admin') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigation.replace('AdminLogin');
          return;
        }
        const { data: lessonData, error } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
        if (error || !lessonData) {
          navigation.replace('AdminDashboard');
          return;
        }
        const lkRes = await getLiveKitToken(lessonId, 'admin', session.access_token);
        if (!lkRes.success || !lkRes.url || !lkRes.token) {
          navigation.replace('AdminDashboard');
          return;
        }
        setLesson(lessonData as Lesson);
        setLivekitUrl(lkRes.url);
        setLivekitToken(lkRes.token);
        setLoading(false);
        return;
      }

      const res = await resolveSession(token);
      if (!res.success || !res.lesson || res.lesson.id !== lessonId || res.lesson.status !== 'live' || res.paymentStatus !== 'approved') {
        navigation.replace('Status', { token });
        return;
      }
      const lkRes = await getLiveKitToken(lessonId, token);
      if (!lkRes.success || !lkRes.url || !lkRes.token) {
        navigation.replace('Status', { token });
        return;
      }
      setLesson(res.lesson);
      setLivekitUrl(lkRes.url);
      setLivekitToken(lkRes.token);
      setLoading(false);
    };
    verify();
  }, [lessonId, token, navigation]);

  const handleLeave = React.useCallback(async () => {
    if (leftRef.current) return;
    leftRef.current = true;
    if (token === 'admin') {
      navigation.replace('AdminDashboard');
      return;
    }
    try {
      await leaveLessonAttendance(token);
    } finally {
      navigation.replace('Status', { token });
    }
  }, [token, navigation]);

  // Watch for the instructor ending the lesson while the student is still in the room.
  useEffect(() => {
    if (!lesson) return;
    const channel = supabase
      .channel(`lesson-room:${lesson.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lessons', filter: `id=eq.${lesson.id}` },
        (payload) => {
          const updated = payload.new as Lesson;
          if (updated.status === 'ended') handleLeave();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lesson, handleLeave]);

  if (loading || !lesson || !livekitUrl || !livekitToken) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.uvPurple} size="large" />
        <Text style={styles.loadingText}>Connecting to Live Room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View>
          <Text style={styles.title}>{lesson.title}</Text>
          <Text style={styles.subtitle}>LiveDance Room</Text>
        </View>
        <View style={styles.headerRight}>
          <Badge status="live" label="LIVE" />
          <Pressable style={styles.leaveBtn} onPress={handleLeave}>
            <Text style={styles.leaveText}>Leave</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.room}>
        <LiveKitRoom serverUrl={livekitUrl} token={livekitToken} connect audio video={false} onDisconnected={handleLeave}>
          <CallView insetsBottom={insets.bottom} />
        </LiveKitRoom>
      </View>
    </View>
  );
}

function initials(label: string) {
  return label.trim().charAt(0).toUpperCase() || '?';
}

function CallView({ insetsBottom }: { insetsBottom: number }) {
  // withPlaceholder keeps every participant visible (as an avatar) even before
  // they've published a camera track — otherwise anyone joining camera-off is
  // invisible instead of just showing without video.
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShareTracks = useTracks([Track.Source.ScreenShare]);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const { chatMessages, send, isSending } = useChat();

  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const seenMessageCount = useRef(0);

  useEffect(() => {
    if (!chatOpen && chatMessages.length > seenMessageCount.current) {
      setUnreadCount(chatMessages.length - seenMessageCount.current);
    }
  }, [chatMessages.length, chatOpen]);

  const openChat = () => {
    setChatOpen(true);
    setUnreadCount(0);
    seenMessageCount.current = chatMessages.length;
  };

  const handleSend = async () => {
    const text = chatText.trim();
    if (!text) return;
    setChatText('');
    await send(text);
  };

  // An active screen share always takes over the main view — someone sharing
  // their screen wants everyone looking at it, overriding any manual focus.
  const activeScreenShare = screenShareTracks[0];
  const focusedCameraTrack = cameraTracks.find((t) => t.participant.identity === focusedIdentity);
  const mainTrack: TrackReferenceOrPlaceholder | undefined = activeScreenShare || focusedCameraTrack;
  const mainLabel = mainTrack ? mainTrack.participant.name || mainTrack.participant.identity : '';

  return (
    <View style={styles.callArea}>
      {mainTrack ? (
        <Pressable
          style={styles.videoTileFull}
          onPress={() => !activeScreenShare && setFocusedIdentity(null)}
        >
          {isTrackReference(mainTrack) ? (
            <VideoTrack trackRef={mainTrack} style={styles.video} objectFit="contain" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>{initials(mainLabel)}</Text>
              </View>
            </View>
          )}
          <Text style={styles.videoLabel} numberOfLines={1}>
            {mainLabel}
            {activeScreenShare ? ' — Sharing Screen' : ''}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.videoGrid}>
          {cameraTracks.map((track) => {
            const label = track.participant.name || track.participant.identity;
            return (
              <Pressable
                key={`${track.participant.identity}-${track.source}`}
                style={cameraTracks.length === 1 ? styles.videoTileFull : styles.videoTileGrid}
                onPress={() => setFocusedIdentity(track.participant.identity)}
              >
                {isTrackReference(track) ? (
                  <VideoTrack trackRef={track} style={styles.video} objectFit="cover" />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarInitial}>{initials(label)}</Text>
                    </View>
                  </View>
                )}
                <Text style={styles.videoLabel} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Modal visible={chatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView
          style={styles.chatBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.chatPanel}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Chat</Text>
              <Pressable onPress={() => setChatOpen(false)}>
                <Text style={styles.chatClose}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={chatMessages}
              keyExtractor={(item) => item.id}
              style={styles.chatList}
              contentContainerStyle={{ gap: 10, paddingVertical: 10 }}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.chatSender}>{item.from?.name || item.from?.identity || 'Someone'}</Text>
                  <Text style={styles.chatMessageText}>{item.message}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyCallText}>No messages yet — say hi!</Text>}
            />
            <View style={[styles.chatInputRow, { paddingBottom: insetsBottom + 10 }]}>
              <TextInput
                style={styles.chatInput}
                value={chatText}
                onChangeText={setChatText}
                placeholder="Message"
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <Pressable style={styles.chatSendBtn} disabled={isSending || !chatText.trim()} onPress={handleSend}>
                <Text style={styles.controlText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={[styles.controls, { paddingBottom: insetsBottom + 14 }]}>
        <Pressable
          style={[styles.controlBtn, !isMicrophoneEnabled && styles.controlBtnOff]}
          onPress={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        >
          <Text style={styles.controlText}>{isMicrophoneEnabled ? 'Mute' : 'Unmute'}</Text>
        </Pressable>
        <Pressable
          style={[styles.controlBtn, !isCameraEnabled && styles.controlBtnOff]}
          onPress={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        >
          <Text style={styles.controlText}>{isCameraEnabled ? 'Camera Off' : 'Camera On'}</Text>
        </Pressable>
        <Pressable
          style={[styles.controlBtn, isScreenShareEnabled && styles.controlBtnOff]}
          onPress={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
        >
          <Text style={styles.controlText}>{isScreenShareEnabled ? 'Stop Sharing' : 'Share Screen'}</Text>
        </Pressable>
        <Pressable style={styles.controlBtn} onPress={openChat}>
          <Text style={styles.controlText}>Chat</Text>
          {unreadCount > 0 && (
            <View style={styles.chatBadge}>
              <Text style={styles.chatBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  leaveBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  leaveText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  room: {
    flex: 1,
    backgroundColor: '#000',
  },
  callArea: {
    flex: 1,
  },
  videoGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  videoTileFull: {
    width: '100%',
    height: '100%',
  },
  videoTileGrid: {
    width: '50%',
    height: '50%',
  },
  video: {
    flex: 1,
    backgroundColor: '#111',
  },
  videoLabel: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.uvPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlBtn: {
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.bgElevated2,
  },
  controlBtnOff: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  controlText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  chatBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  chatPanel: {
    height: '65%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  chatTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  chatClose: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
  },
  chatSender: {
    color: colors.uvBlue,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  chatMessageText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  emptyCallText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 20,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  chatSendBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.bgElevated2,
  },
});
