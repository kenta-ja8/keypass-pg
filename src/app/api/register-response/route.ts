import { RegistrationResponseJSON, verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { store } from "../memory-store";

export async function POST(request: Request) {
  try {
    const response: RegistrationResponseJSON = await request.json();
    const challenge = request.headers.get("Challenge");
    if (!challenge) {
      throw new Error("Challenge が見つかりません");
    }
    const origin = new URL(request.url).origin;

    // 認証情報の検証
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      // PRID(ドメイン)
      expectedRPID: "localhost",
      // requireUserVerification: ユーザー検証が必要かどうかを指定する
      // falseの場合、認証器はユーザーの存在を確認するだけで、特定のユーザーが認証器を操作していることを検証しない
      requireUserVerification: false,
    });

    if (!verified || !registrationInfo) {
      throw new Error("認証情報の検証に失敗しました");
    }
    const { credential } = registrationInfo;
   

    // 公開鍵のID,公開鍵をBase64URL形式に変換
    // const base64CredentialID = isoBase64URL.fromBuffer(credentialID);
    // const base64PublicKey = isoBase64URL.fromBuffer(credentialPublicKey);

    // 実際の実装では、ユーザーのIDもセッションに含めユーザーを識別する必要がある
    const userId = store[challenge];
    console.log("userId", userId, challenge, store);
    const userData = {
      userId: userId,
      id: credential.id,
      // publicKey: credential.publicKey,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      transports: response.response.transports,
    };
    const jsonUserData = JSON.stringify({ [credential.id]: userData });
    const dirPath = path.join(process.cwd(), "db");
    const filePath = path.join(dirPath, "user.json");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, jsonUserData);

    return NextResponse.json({ success: verified });
  } catch (e) {
    console.error("パスキーの登録に失敗しました", e);
    return new NextResponse("error", {
      status: 400,
    });
  }
}
