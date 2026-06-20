import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Speech from "expo-speech";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "https://monyet-ai.vercel.app/api/chat";

type ChatItem = {
  role: "user" | "assistant";
  text: string;
};

export default function Index() {
  const [mode, setMode] = useState<"AMAN" | "BRUTAL">("AMAN");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState(
    "Ketik sesuatu dulu. Gue bakal inget obrolan kita selama lu belum restart."
  );
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastAudioUrl, setLastAudioUrl] = useState("");

  const audioPlayer = useAudioPlayer(null);
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const isVoicePlaying = speaking || audioStatus.playing;

  const speakText = async (text: string) => {
    if (!text) return;

    await Speech.stop();

    try {
      audioPlayer.pause();
    } catch {}

    setSpeaking(true);

    Speech.speak(text, {
      language: "id-ID",
      rate: mode === "BRUTAL" ? 1.08 : 0.96,
      pitch: mode === "BRUTAL" ? 0.78 : 0.92,
      volume: 1.0,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const playAudioUrl = async (audioUrl: string, fallbackText: string) => {
    try {
      await Speech.stop();
      setSpeaking(false);

      audioPlayer.pause();
      audioPlayer.replace({ uri: audioUrl });
      audioPlayer.play();

      setLastAudioUrl(audioUrl);
    } catch (error) {
      console.log("Gagal play audio URL:", error);
      speakText(fallbackText);
    }
  };

  const repeatVoice = async () => {
    if (lastAudioUrl) {
      try {
        await Speech.stop();
        setSpeaking(false);

        audioPlayer.pause();
        audioPlayer.replace({ uri: lastAudioUrl });
        audioPlayer.play();
        return;
      } catch (error) {
        console.log("Gagal ulang audio:", error);
      }
    }

    speakText(reply);
  };

  const stopSpeaking = async () => {
    await Speech.stop();

    try {
      audioPlayer.pause();
    } catch {}

    setSpeaking(false);
  };

  const resetConversation = async () => {
    await stopSpeaking();

    setHistory([]);
    setMessage("");
    setLastAudioUrl("");
    setReply(
      "Percakapan di-reset. Otak gue kosong lagi, kayak chat grup jam 3 pagi."
    );
  };

  const confirmReset = () => {
    Alert.alert(
      "Restart percakapan?",
      "Memori obrolan MONYET bakal dihapus dan mulai dari awal.",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Restart",
          style: "destructive",
          onPress: resetConversation,
        },
      ]
    );
  };

  const generateReply = async () => {
    const text = message.trim();

    if (!text) {
      const emptyReply =
        "Lah, ngetik aja belum. Gue disuruh nebak isi kepala lu?";
      setReply(emptyReply);
      speakText(emptyReply);
      return;
    }

    try {
      setLoading(true);
      setReply(
        "Sabar tod, gw lagi nyari info dulu biar ga goblok kayak lu yang cuma bisa asumsi tanpa bukti."
      );
      setLastAudioUrl("");
      await stopSpeaking();

      const currentHistory = history.slice(-12);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          mode,
          history: currentHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || "Backend error");
      }

      const aiReply =
        data.reply ||
        "Gue jawab kosong. Ini AI-nya lagi bengong kayak printer rusak.";

      const userChat: ChatItem = {
        role: "user",
        text,
      };

      const assistantChat: ChatItem = {
        role: "assistant",
        text: aiReply,
      };

      const newHistory: ChatItem[] = [
        ...history,
        userChat,
        assistantChat,
      ].slice(-20);

      setHistory(newHistory);
      setReply(aiReply);
      setMessage("");

      if (data.audioUrl) {
        await playAudioUrl(data.audioUrl, aiReply);
      } else {
        speakText(aiReply);
      }
    } catch (error: any) {
      const errorReply = `Yah error. MONYET-nya kepeleset: ${
        error.message || "nggak jelas errornya"
      }`;

      setReply(errorReply);
      speakText("Yah error. MONYET-nya kepeleset. Cek backend lu dulu, bro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>🐒</Text>

        <Text style={styles.title}>MONYET AI</Text>

        <Text style={styles.subtitle}>
          AI nyolot, sarkas, brutal, tapi masih punya rem.
        </Text>

        <View style={styles.modeBox}>
          <TouchableOpacity
            style={[styles.modeButton, mode === "AMAN" && styles.activeMode]}
            onPress={() => setMode("AMAN")}
          >
            <Text
              style={[
                styles.modeText,
                mode === "AMAN" && styles.activeModeText,
              ]}
            >
              AMAN
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === "BRUTAL" && styles.activeMode]}
            onPress={() => setMode("BRUTAL")}
          >
            <Text
              style={[
                styles.modeText,
                mode === "BRUTAL" && styles.activeModeText,
              ]}
            >
              BRUTAL
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.memoryBox}>
          <Text style={styles.memoryText}>
            Memori aktif: {Math.floor(history.length / 2)} obrolan
          </Text>

          <TouchableOpacity style={styles.resetButton} onPress={confirmReset}>
            <Text style={styles.resetButtonText}>RESTART</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Mau lu omongin apa?</Text>

        <TextInput
          style={styles.input}
          placeholder="Contoh: gue mau bikin konten horor Minecraft"
          placeholderTextColor="#777"
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={generateReply}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.buttonText}>BACOTIN</Text>
          )}
        </TouchableOpacity>

        <View style={styles.voiceRow}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={repeatVoice}
            disabled={loading}
          >
            <Text style={styles.smallButtonText}>ULANGI SUARA</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.smallButtonDark} onPress={stopSpeaking}>
            <Text style={styles.smallButtonDarkText}>
              {isVoicePlaying ? "DIAMIN" : "STOP"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>MONYET JAWAB:</Text>
          <Text style={styles.replyText}>{reply}</Text>
        </View>

        {history.length > 0 && (
          <View style={styles.historyBox}>
            <Text style={styles.historyTitle}>RIWAYAT SINGKAT</Text>

            {history.slice(-6).map((item, index) => (
              <View key={`${item.role}-${index}`} style={styles.historyItem}>
                <Text style={styles.historyRole}>
                  {item.role === "user" ? "LU" : "MONYET"}
                </Text>
                <Text style={styles.historyText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.note}>
          Memori cuma aktif selama percakapan ini. Klik RESTART untuk mulai dari
          nol.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f0f",
  },
  content: {
    padding: 24,
    alignItems: "center",
  },
  logo: {
    fontSize: 72,
    marginTop: 30,
  },
  title: {
    fontSize: 38,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 8,
    letterSpacing: 1,
  },
  subtitle: {
    color: "#b5b5b5",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 22,
  },
  modeBox: {
    width: "100%",
    flexDirection: "row",
    backgroundColor: "#1f1f1f",
    borderRadius: 18,
    padding: 6,
    marginBottom: 14,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  activeMode: {
    backgroundColor: "#ffcc00",
  },
  modeText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },
  activeModeText: {
    color: "#111111",
  },
  memoryBox: {
    width: "100%",
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#2d2d2d",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memoryText: {
    color: "#bdbdbd",
    fontWeight: "700",
  },
  resetButton: {
    backgroundColor: "#2b2b2b",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
  },
  resetButtonText: {
    color: "#ffcc00",
    fontWeight: "900",
    fontSize: 12,
  },
  label: {
    width: "100%",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  input: {
    width: "100%",
    minHeight: 120,
    backgroundColor: "#1c1c1c",
    color: "#ffffff",
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#333333",
  },
  button: {
    width: "100%",
    backgroundColor: "#ffcc00",
    paddingVertical: 17,
    borderRadius: 18,
    marginTop: 16,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#111111",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 1,
  },
  voiceRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  smallButton: {
    flex: 1,
    backgroundColor: "#2b2b2b",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  smallButtonText: {
    color: "#ffcc00",
    fontWeight: "900",
    fontSize: 13,
  },
  smallButtonDark: {
    flex: 1,
    backgroundColor: "#171717",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#444",
  },
  smallButtonDarkText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },
  replyBox: {
    width: "100%",
    backgroundColor: "#1c1c1c",
    borderRadius: 18,
    padding: 18,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#333333",
  },
  replyLabel: {
    color: "#ffcc00",
    fontWeight: "900",
    marginBottom: 10,
    fontSize: 14,
  },
  replyText: {
    color: "#ffffff",
    fontSize: 17,
    lineHeight: 26,
  },
  historyBox: {
    width: "100%",
    backgroundColor: "#151515",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#2c2c2c",
  },
  historyTitle: {
    color: "#ffcc00",
    fontWeight: "900",
    marginBottom: 12,
    fontSize: 13,
  },
  historyItem: {
    marginBottom: 12,
  },
  historyRole: {
    color: "#999",
    fontWeight: "900",
    fontSize: 12,
    marginBottom: 4,
  },
  historyText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  note: {
    color: "#777777",
    textAlign: "center",
    marginTop: 24,
    fontSize: 13,
    lineHeight: 19,
  },
});