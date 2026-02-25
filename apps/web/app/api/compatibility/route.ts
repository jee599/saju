import { NextRequest, NextResponse } from "next/server";
import {
  generateCompatibility,
  isValidPerson,
  type CompatibilityPerson,
} from "../../../lib/compatibilityEngine";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      personA?: CompatibilityPerson;
      personB?: CompatibilityPerson;
    };

    const { personA, personB } = body;

    if (!personA || !personB || !isValidPerson(personA) || !isValidPerson(personB)) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_INPUT", message: "두 사람의 정보를 모두 입력해 주세요." } },
        { status: 400 }
      );
    }

    const result = generateCompatibility(personA, personB);
    return NextResponse.json({ ok: true, data: result });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } },
      { status: 500 }
    );
  }
}
