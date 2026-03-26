import * as Speech from 'expo-speech';
import { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Clipboard,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API_URL = 'https://pinyingpt2.onrender.com'; // Replace with your Render URL

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg:         '#FAF8F5',
  surface:    '#FFFFFF',
  border:     '#EBEBEB',
  accent:     '#C0392B',
  accentSoft: '#FDECEA',
  text:       '#1A1A1A',
  textMid:    '#555555',
  textLight:  '#999999',
  likely:     '#2E7D32',
  likelySoft: '#E8F5E9',
  possible:   '#E65100',
  possibleSoft:'#FFF3E0',
};

// ─── LIKELIHOOD BADGE ────────────────────────────────────────────────────────
function LikelihoodBadge({ value }) {
  const isVeryLikely = value === 'very likely';
  const isLikely     = value === 'likely';
  const bg    = isVeryLikely ? T.likelySoft  : isLikely ? T.likelySoft   : T.possibleSoft;
  const color = isVeryLikely ? T.likely      : isLikely ? T.likely       : T.possible;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{value}</Text>
    </View>
  );
}

// ─── RESULT CARD ─────────────────────────────────────────────────────────────
function ResultCard({ item, index }) {
  const [speaking, setSpeaking] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useState(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  });

  const handleCopy = useCallback(() => {
    Clipboard.setString(item.characters);
    Alert.alert('Copied', `${item.characters} copied to clipboard`);
  }, [item.characters]);

  const handleSpeak = useCallback(() => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(item.characters, {
      language: 'zh-CN',
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [speaking, item.characters]);

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Characters — hero element */}
      <Text style={styles.characters}>{item.characters}</Text>

      {/* Pinyin */}
      <Text style={styles.pinyin}>{item.pinyin_toned}</Text>

      {/* English */}
      <Text style={styles.english}>{item.english}</Text>

      {/* Notes */}
      {item.notes && (
        <Text style={styles.notes}>{item.notes}</Text>
      )}

      {/* Footer row */}
      <View style={styles.cardFooter}>
        <LikelihoodBadge value={item.likelihood} />
        <View style={styles.cardActions}>
          {/* Copy button */}
          <TouchableOpacity style={styles.iconBtn} onPress={handleCopy} activeOpacity={0.7}>
            <Text style={styles.iconBtnText}>复</Text>
          </TouchableOpacity>
          {/* Audio button */}
          <TouchableOpacity
            style={[styles.iconBtn, speaking && styles.iconBtnActive]}
            onPress={handleSpeak}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnText, speaking && styles.iconBtnTextActive]}>
              {speaking ? '■' : '▶'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ─── HISTORY ITEM ────────────────────────────────────────────────────────────
function HistoryItem({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.historyItem} onPress={() => onPress(item.pinyin)} activeOpacity={0.6}>
      <Text style={styles.historyPinyin} numberOfLines={1}>{item.pinyin}</Text>
      <Text style={styles.historyChars} numberOfLines={1}>
        {item.results.map(r => r.characters).join('  /  ')}
      </Text>
    </TouchableOpacity>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [input,       setInput]       = useState('');
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [history,     setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const translate = useCallback(async (pinyinOverride) => {
    const pinyin = (pinyinOverride ?? input).trim();
    if (!pinyin) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setShowHistory(false);

    try {
      const res = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinyin }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail ?? 'Server error');
      }

      const data = await res.json();
      setResults(data.results);

      // Add to history (most recent first, no duplicates)
      setHistory(prev => {
        const filtered = prev.filter(h => h.pinyin !== pinyin);
        return [{ pinyin, results: data.results }, ...filtered].slice(0, 20);
      });

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleHistoryPress = useCallback((pinyin) => {
    setInput(pinyin);
    translate(pinyin);
  }, [translate]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>拼音</Text>
          <Text style={styles.headerSub}>Pinyin Translator</Text>
        </View>

        {/* ── Input ── */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="e.g. ni hao chi fan le ma"
            placeholderTextColor={T.textLight}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => translate()}
          />
        </View>

        {/* ── Translate Button ── */}
        <TouchableOpacity
          style={[styles.translateBtn, (!input.trim() || loading) && styles.translateBtnDisabled]}
          onPress={() => translate()}
          activeOpacity={0.85}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.translateBtnText}>Translate</Text>
          }
        </TouchableOpacity>

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Results ── */}
        {results.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              {results.length} interpretation{results.length !== 1 ? 's' : ''}
            </Text>
            {results.map((item, i) => (
              <ResultCard key={i} item={item} index={i} />
            ))}
          </View>
        )}

        {/* ── History ── */}
        {history.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.historyHeader}
              onPress={() => setShowHistory(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLabel}>History</Text>
              <Text style={styles.historyToggle}>{showHistory ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showHistory && history.map((item, i) => (
              <HistoryItem key={i} item={item} onPress={handleHistoryPress} />
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },

  // Header
  header: {
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 52,
    color: T.accent,
    fontWeight: '300',
    letterSpacing: 8,
  },
  headerSub: {
    fontSize: 13,
    color: T.textLight,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // Input
  inputRow: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: T.text,
    letterSpacing: 0.3,
  },

  // Translate button
  translateBtn: {
    backgroundColor: T.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 28,
  },
  translateBtnDisabled: {
    opacity: 0.45,
  },
  translateBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Error
  errorBox: {
    backgroundColor: T.accentSoft,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  errorText: {
    color: T.accent,
    fontSize: 14,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textLight,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  characters: {
    fontSize: 42,
    color: T.text,
    fontWeight: '300',
    letterSpacing: 4,
    marginBottom: 8,
  },
  pinyin: {
    fontSize: 17,
    color: T.accent,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  english: {
    fontSize: 15,
    color: T.textMid,
    marginBottom: 8,
    lineHeight: 22,
  },
  notes: {
    fontSize: 13,
    color: T.textLight,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },

  // Badge
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Icon buttons
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  iconBtnText: {
    fontSize: 14,
    color: T.textMid,
  },
  iconBtnTextActive: {
    color: '#fff',
  },

  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyToggle: {
    color: T.textLight,
    fontSize: 12,
  },
  historyItem: {
    backgroundColor: T.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  historyPinyin: {
    fontSize: 14,
    color: T.text,
    fontWeight: '500',
    marginBottom: 3,
  },
  historyChars: {
    fontSize: 13,
    color: T.textLight,
  },
});

import { registerRootComponent } from 'expo';
registerRootComponent(App);
