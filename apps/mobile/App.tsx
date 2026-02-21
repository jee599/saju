import { useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, View, StyleSheet, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { CalendarType, FortuneInput, FortuneResult, Gender } from "@saju/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

export default function App() {
  const [input, setInput] = useState<FortuneInput>(defaultInput);
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!input.name || !input.birthDate) {
      setError("이름과 생년월일을 입력하세요.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/fortune/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });

      if (!response.ok) {
        throw new Error("결과 조회 실패");
      }

      const data = (await response.json()) as FortuneResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "알 수 없는 오류");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>무료 사주</Text>

        <Text style={styles.label}>이름</Text>
        <TextInput
          style={styles.input}
          value={input.name}
          onChangeText={(name) => setInput((prev) => ({ ...prev, name }))}
          placeholder="홍길동"
        />

        <Text style={styles.label}>생년월일 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={input.birthDate}
          onChangeText={(birthDate) => setInput((prev) => ({ ...prev, birthDate }))}
          placeholder="1995-05-12"
        />

        <Text style={styles.label}>출생시간 (HH:mm, 선택)</Text>
        <TextInput
          style={styles.input}
          value={input.birthTime}
          onChangeText={(birthTime) => setInput((prev) => ({ ...prev, birthTime }))}
          placeholder="09:30"
        />

        <Text style={styles.label}>성별 (male/female/other)</Text>
        <TextInput
          style={styles.input}
          value={input.gender}
          onChangeText={(gender) => setInput((prev) => ({ ...prev, gender: gender as Gender }))}
          placeholder="male"
        />

        <Text style={styles.label}>달력유형 (solar/lunar)</Text>
        <TextInput
          style={styles.input}
          value={input.calendarType}
          onChangeText={(calendarType) =>
            setInput((prev) => ({ ...prev, calendarType: calendarType as CalendarType }))
          }
          placeholder="solar"
        />

        <Pressable style={styles.button} onPress={submit}>
          <Text style={styles.buttonText}>{loading ? "분석 중..." : "결과 보기"}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>결과 영역</Text>
          {result ? (
            <>
              <Text>{result.summary}</Text>
              <Text>행운 색상: {result.luckyColor}</Text>
              <Text>행운 숫자: {result.luckyNumber}</Text>
              <Text>강점: {result.traits.join(", ")}</Text>
              <Text>주의점: {result.caution}</Text>
            </>
          ) : (
            <Text>입력 후 결과를 확인할 수 있습니다. (Mock)</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  container: {
    padding: 20,
    gap: 8
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8
  },
  label: {
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white"
  },
  button: {
    marginTop: 8,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  error: {
    color: "#dc2626"
  },
  resultCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "white",
    gap: 4
  },
  resultTitle: {
    fontWeight: "700",
    marginBottom: 4
  }
});
