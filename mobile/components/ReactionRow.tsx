import { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { API_URL } from '../constants/api';
import { authHeaders, getToken } from '../constants/auth';

interface ReactionRowProps {
  checkInId: number;
  challengeId: number | null;
  initialReactions: { '🔥': number; '💪': number; '👏': number };
  initialViewerReactions?: { '🔥': boolean; '💪': boolean; '👏': boolean };
}

function ReactionRow({ checkInId, challengeId, initialReactions, initialViewerReactions }: ReactionRowProps) {
  const [reactions, setReactions] = useState(initialReactions);
  const [viewerReactions, setViewerReactions] = useState(
    initialViewerReactions ?? { '🔥': false, '💪': false, '👏': false }
  );
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    setReactions(initialReactions);
  }, [initialReactions]);

  useEffect(() => {
    setViewerReactions(initialViewerReactions ?? { '🔥': false, '💪': false, '👏': false });
  }, [initialViewerReactions]);

  const handleReaction = useCallback((emoji: keyof typeof initialReactions) => {
    if (!challengeId || submitting === emoji) return;

    const previousValue = reactions[emoji];
    const wasActive = viewerReactions[emoji];
    const nextValue = wasActive ? Math.max(0, previousValue - 1) : previousValue + 1;

    setReactions(prev => ({
      ...prev,
      [emoji]: nextValue
    }));
    setViewerReactions(prev => ({
      ...prev,
      [emoji]: !wasActive,
    }));

    setSubmitting(emoji);
    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('Missing token');

        const response = await fetch(`${API_URL}/feed/reactions`, {
          method: 'POST',
          headers: authHeaders(token),
          body: JSON.stringify({ checkInId, emojiType: emoji }),
        });

        if (!response.ok) {
          throw new Error('Failed to send reaction');
        }

        const data = await response.json();
        setReactions(prev => ({
          ...prev,
          [emoji]: data.active ? previousValue + 1 : Math.max(0, previousValue - 1),
        }));
        setViewerReactions(prev => ({
          ...prev,
          [emoji]: Boolean(data.active),
        }));
      } catch (error) {
        console.error('Reaction error:', error);
        setReactions(prev => ({
          ...prev,
          [emoji]: previousValue,
        }));
        setViewerReactions(prev => ({
          ...prev,
          [emoji]: wasActive,
        }));
      } finally {
        setSubmitting(null);
      }
    })();
  }, [challengeId, checkInId, submitting, viewerReactions, reactions]);

  return (
    <View className="flex-row justify-around p-3 bg-[#111]">
      {(Object.keys(reactions) as (keyof typeof reactions)[]).map(emoji => (
        <TouchableOpacity 
          key={emoji} 
          onPress={() => handleReaction(emoji)}
          disabled={submitting === emoji}
          className={`rounded-full w-10 h-10 items-center justify-center border shadow-sm ${viewerReactions[emoji] ? 'bg-neonGreen/20 border-neonGreen/40' : 'bg-[#2A2A2A] border-[#444]'}`}
        >
          <View className="absolute -top-1 -right-1 bg-neonOrange rounded-full w-4 h-4 items-center justify-center z-10">
            <Text className="text-[8px] text-white font-bold">{reactions[emoji]}</Text>
          </View>
          <Text className="text-lg">{emoji}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function areEqual(prev: ReactionRowProps, next: ReactionRowProps) {
  return (
    prev.checkInId === next.checkInId &&
    prev.challengeId === next.challengeId &&
    prev.initialReactions['🔥'] === next.initialReactions['🔥'] &&
    prev.initialReactions['💪'] === next.initialReactions['💪'] &&
    prev.initialReactions['👏'] === next.initialReactions['👏'] &&
    (prev.initialViewerReactions?.['🔥'] ?? false) === (next.initialViewerReactions?.['🔥'] ?? false) &&
    (prev.initialViewerReactions?.['💪'] ?? false) === (next.initialViewerReactions?.['💪'] ?? false) &&
    (prev.initialViewerReactions?.['👏'] ?? false) === (next.initialViewerReactions?.['👏'] ?? false)
  );
}

export default memo(ReactionRow, areEqual);
