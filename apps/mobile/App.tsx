import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator
} from "react-native";
import { StatusBar } from "expo-status-bar";
import type {
  ApiErrorPayload,
  ApiResponse,
  CheckoutConfirmResponse,
  CheckoutCreateResponse,
  FortuneInput,
  GetReportResponse,
  ProductCode,
  ReportPreview
} from "@saju/shared";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

type Screen = "input" | "preview" | "paywall" | "report";

type ApiClientError = {
  code: string;
  message: string;
};

const readErrorMessage = (value: unknown): string => {
  if (value && typeof value === "object" && "message" in value) {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return "요청 처리 중 오류가 발생했습니다.";
};

const defaultInput: FortuneInput = {
  name: "",
  birthDate: "",
  birthTime: "",
  gender: "male",
  calendarType: "solar"
};

const request = async <TBody, TData>(path: string, body?: TBody, method: "GET" | "POST" = "POST"): Promise<TData> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      throw { code: "HTTP_ERROR", message: `요청 실패 (${response.status})` } as ApiClientError;
    }

    if (payload && payload.ok === false) {
      throw { code: payload.error.code, message: payload.error.message } as ApiClientError;
    }

    throw { code: "HTTP_ERROR", message: `요청 실패 (${response.status})` } as ApiClientError;
  }

  const payload = (await response.json()) as ApiResponse<TData>;
  if (payload.ok === false) {
    throw { code: payload.error.code, message: payload.error.message } as ApiClientError;
  }

  return payload.data;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>("input");
  const [input, setInput] = useState<FortuneInput>(defaultInput);
  const [preview, setPreview] = useState<ReportPreview | null>(null);
  const [report, setReport] = useState<GetReportResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductCode>("standard");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => input.name.trim().length >= 2 && Boolean(input.birthDate), [input]);

  const loadPreview = async () => {
    if (!canSubmit) {
      setError("이름(2자 이상)과 생년월일을 입력하세요.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await request<FortuneInput, ReportPreview>("/report/preview", input);
      setPreview(data);
      setScreen("preview");
    } catch (e) {
      setError(readErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const runCheckout = async () => {
    setError(null);
    setLoading(true);

    try {
      const created = await request<{ productCode: ProductCode; input: FortuneInput }, CheckoutCreateResponse>(
        "/checkout/create",
        {
          productCode: selectedProduct,
          input
        }
      );

      setOrderId(created.order.orderId);

      const confirmed = await request<{ orderId: string }, CheckoutConfirmResponse>("/checkout/confirm", {
        orderId: created.order.orderId
      });

      setOrderId(confirmed.order.orderId);
      setScreen("report");
    } catch (e) {
      setError(readErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    if (!orderId) {
      setError("주문번호가 없어 리포트를 조회할 수 없습니다.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const data = await request<undefined, GetReportResponse>(`/report/${orderId}`, undefined, "GET");
      setReport(data);
    } catch (e) {
      setError(readErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>사주는 빅데이터</Text>
        <Text style={styles.subtitle}>확률 기반 참고 리포트 (iPhone-ready V1)</Text>

        {screen === "input" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1) 입력</Text>
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
              onChangeText={(gender) =>
                setInput((prev) => ({ ...prev, gender: gender as FortuneInput["gender"] }))
              }
              placeholder="male"
            />

            <Text style={styles.label}>달력유형 (solar/lunar)</Text>
            <TextInput
              style={styles.input}
              value={input.calendarType}
              onChangeText={(calendarType) =>
                setInput((prev) => ({ ...prev, calendarType: calendarType as FortuneInput["calendarType"] }))
              }
              placeholder="solar"
            />

            <Pressable style={styles.button} onPress={() => void loadPreview()}>
              <Text style={styles.buttonText}>미리보기 생성</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === "preview" && preview ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>2) 결과 미리보기</Text>
            <Text style={styles.headline}>{preview.free.headline}</Text>
            <Text>{preview.free.summary}</Text>
            {preview.free.sections.map((section) => (
              <View key={section.key} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text>{section.text}</Text>
              </View>
            ))}

            <Text style={styles.label}>상품 선택</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.productButton, selectedProduct === "standard" && styles.productButtonActive]}
                onPress={() => setSelectedProduct("standard")}
              >
                <Text style={styles.productText}>표준 ₩4,900</Text>
              </Pressable>
              <Pressable
                style={[styles.productButton, selectedProduct === "deep" && styles.productButtonActive]}
                onPress={() => setSelectedProduct("deep")}
              >
                <Text style={styles.productText}>심화 ₩12,900</Text>
              </Pressable>
            </View>

            <Pressable style={styles.button} onPress={() => setScreen("paywall")}>
              <Text style={styles.buttonText}>페이월 이동</Text>
            </Pressable>
            <Pressable style={styles.buttonOutline} onPress={() => setScreen("input")}>
              <Text style={styles.buttonOutlineText}>입력 수정</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === "paywall" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3) 결제 시뮬레이션</Text>
            <Text>선택 상품: {selectedProduct === "deep" ? "심화 리포트" : "표준 리포트"}</Text>
            <Text style={styles.subtitle}>V1은 모의결제이며 실제 청구가 발생하지 않습니다.</Text>
            <Pressable style={styles.button} onPress={() => void runCheckout()}>
              <Text style={styles.buttonText}>모의 결제 진행</Text>
            </Pressable>
            <Pressable style={styles.buttonOutline} onPress={() => setScreen("preview")}>
              <Text style={styles.buttonOutlineText}>이전으로</Text>
            </Pressable>
          </View>
        ) : null}

        {screen === "report" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>4) 잠금 해제 리포트</Text>
            <Pressable style={styles.button} onPress={() => void loadReport()}>
              <Text style={styles.buttonText}>리포트 불러오기</Text>
            </Pressable>
            {report ? (
              <>
                <Text style={styles.headline}>{report.report.headline}</Text>
                <Text>{report.report.summary}</Text>
                {report.report.sections.map((section) => (
                  <View key={section.key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>
                    <Text>{section.text}</Text>
                  </View>
                ))}
                <Text style={styles.disclaimer}>{report.report.disclaimer}</Text>
                <Pressable
                  style={styles.buttonOutline}
                  onPress={() => {
                    setInput(defaultInput);
                    setPreview(null);
                    setReport(null);
                    setOrderId(null);
                    setScreen("input");
                  }}
                >
                  <Text style={styles.buttonOutlineText}>처음으로</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#0f172a" />
            <Text>처리 중...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
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
    gap: 12
  },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: "#0f172a"
  },
  subtitle: {
    color: "#475569"
  },
  card: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "white",
    gap: 8
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700"
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
    marginTop: 4,
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  buttonOutline: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  buttonOutlineText: {
    color: "#0f172a",
    fontWeight: "600"
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  productButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center"
  },
  productButtonActive: {
    borderColor: "#0f172a",
    backgroundColor: "#e2e8f0"
  },
  productText: {
    fontWeight: "600"
  },
  headline: {
    fontSize: 17,
    fontWeight: "700"
  },
  section: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0"
  },
  sectionTitle: {
    fontWeight: "700"
  },
  disclaimer: {
    color: "#475569",
    marginTop: 10
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  error: {
    color: "#b91c1c"
  }
});
