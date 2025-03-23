import { generateRegistrationOptions } from "@simplewebauthn/server";
import { NextResponse } from "next/server";
import { store } from "../memory-store";
import base64url from "base64url";


export async function GET(request: Request) {
  return new Response("Hello world!");
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json(); // Get the email from the request body

    // 認証器の選択基準の定義
    const authenticatorSelection: AuthenticatorSelectionCriteria = {
      // "platform"を指定すると、プラットフォーム（例えばスマートフォンやPC）に内蔵されている認証器を使用する
      // これを指定すると、USBキーなどの外部デバイスを求められることがなくなる
      authenticatorAttachment: "platform",
      // requireResidentKeyをtrueに設定すると、認証器はユーザーの情報を保持する
      requireResidentKey: true,
    };

    // アテステーションタイプを"none"に設定 すると認証器の情報を検証しないことを意味する
    // ※ アテステーションとは、認証器（例えば、セキュリティキーなど）が正当であることを証明するための情報
    const attestationType = "none";


    const options = await generateRegistrationOptions({
      // Relying Party（信頼できるパーティ）の名前を指定する
      // 通常はサービスの名称を指定する
      rpName: "webauthn-sample",
      // Relying PartyのIDをドメイン形式で指定する
      rpID: "localhost",
      // ユーザーの一意のIDを指定する
      userID: Buffer.from(email),
      // ユーザーのメールアドレスやユーザー名を指定する。ユーザーに対して一意である必要がある。
      userName: email, // Use the email from the request
      // ユーザーの表示名を指定。この名前は一意である必要はない。
      userDisplayName: email,
      // 上で定義したアテステーションタイプ(none)
      attestationType: attestationType,
      // 除外する認証器のリストを指定します。既に登録済みの認証器(パスキー)を除外する場合は指定する。
      excludeCredentials: [],
      // 上で定義した認証器の選択基準
      authenticatorSelection: authenticatorSelection,
    });

    
    store[base64url.encode(Buffer.from(options.challenge))] = email;

    console.log("options: ", options, options.challenge, email);

    return NextResponse.json(options);
  } catch (e) {
    console.error("error: ", e);
    return new NextResponse("error", {
      status: 400,
    });
  }
}
