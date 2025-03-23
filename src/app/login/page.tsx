"use client"
import { useEffect, useRef, useState } from "react";
import base64url from 'base64url';
import { AuthenticatorTransportFuture, RegistrationResponseJSON } from "@simplewebauthn/server";
import { clsx } from "clsx";
import { useRouter } from 'next/navigation'

export default function Page() {
  const [tab, setTab] = useState<"login" | "register">("login");

  return (
    <div className="bg-gray-100 h-screen relative">
      <div className="h-[400px] w-[600px] absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 rounded-md">
        <div className="flex justify-center font-bold">
          <button
            className={clsx("border-gray-200 border flex-1 rounded-t-lg p-4", tab === "login" ? 'bg-blue-200' : 'bg-gray-200')}
            onClick={() => setTab("login")}
          >Login</button>
          <button
            className={clsx("border-gray-200 border flex-1 rounded-t-lg p-4", tab === "register" ? 'bg-blue-200' : 'bg-gray-200')}
            onClick={() => setTab("register")}
          >Register</button>
        </div>
        <div className="flex border-gray-200 border h-full bg-white">
          {tab === "login" ? <Login /> : <Register onRegistered={() => setTab('login')} />}
        </div>

      </div>
    </div>
  );
}


function Register({ onRegistered }: { onRegistered: () => void }) {
  const [isEnable, setIsEnable] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    (async () => {
      setIsEnable(await isWebAuthnEnabled());
    })();
  }, []);

  return (
    <div className="flex flex-col flex-grow p-8 w-full">
      {isEnable ? (
        <>
          <label
            className="block text-sm font-medium text-gray-700"
          >
            email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 border w-full mb-4"
          />
          <button
            onClick={() => {
              // パスキーの登録処理を開始
              registerCredential(email);
              alert("パスキーの登録が完了しました");
              onRegistered();
            }}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            Register Passkey
          </button>
        </>
      ) : (
        <div>このデバイスは、パスキーに対応していません</div>
      )}
    </div>
  );
}

function Login() {
  const router = useRouter();
  const [invalidMessage, setInvalidMessage] = useState<string>();
  // const didOnce = useRef(false);
  console.log('render')

  useEffect(() => {
    const abortController = new AbortController();
    void (async () => {
      if (window.PublicKeyCredential) {
        // 画面読み込み時にパスキー情報取得のAPIを呼び出しておく
        console.log('call authentication', new Date())
        const success = await authentication('conditional', abortController);
        console.log('result', success)
        if (success) {
          router.push('/')
        }
      }
    })()
    return () => {
      console.log('abort', new Date())
      abortController.abort("cleanup");
    }
  }, []);
  return <div className="w-full p-8 space-y-8">
    <div className="center space-y-2">
      <label
        className="block text-sm font-medium text-gray-700"
      >
        email
      </label>
      <input
        type="email"
        id="username"
        className="px-3 py-2 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 border w-full"
        aria-labelledby="username-label"
        name="username"
        autoComplete="username webauthn"
        autoFocus
      />
      <label
        className="block text-sm font-medium text-gray-700"
        id="password-label"
      >
        password
      </label>
      <input
        type="password"
        className="px-3 py-2 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:shadow-outline-blue focus:border-blue-300 border w-full"
        aria-labelledby="password-label"
        name="password"
        autoComplete="current-password"
      />
      <button onClick={() => setInvalidMessage('未実装')} type="button" className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Login With Password
      </button>
      {invalidMessage && (
        <div className="text-red-500">{invalidMessage}</div>
      )}
    </div>
    <div className="border border-gray-200" />
    <div>
      <button onClick={() => authentication('optional')} type="button" className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Login With Passkey
      </button>
    </div>
  </div>

}

function base64ToArrayBuffer(base64UrlString: string) {
  // Base64URL形式の文字列をBase64に変換
  base64UrlString = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
  // 必要に応じてパディングを追加
  const pad = base64UrlString.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('Invalid base64url string.');
    }
    base64UrlString += new Array(5 - pad).join('=');
  }
  const binaryString = window.atob(base64UrlString);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function authentication(mediation: CredentialMediationRequirement, abortController?: AbortController) {
  try {
    // 条件付きUIがサポートされているかの確認
    if (!(await PublicKeyCredential.isConditionalMediationAvailable())) {
      return;
    }
    const res = await fetch("/api/signin-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const options = await res.json();
    options.challenge = base64ToArrayBuffer(options.challenge);

    options.allowCredentials = [];
    // パスキーの公開鍵認証情報を取得
    const credential = await navigator.credentials.get({
      publicKey: options,
      // mediation: "conditional",
      mediation: mediation,
      signal: abortController?.signal,
    });

    const publicKeyCredential = credential as PublicKeyCredential;
    const authenticatorAssertionResponse =
      publicKeyCredential.response as AuthenticatorAssertionResponse;

    // simplewebauthnで用意されている認証用の型に変換
    const responseJSON = {
      id: publicKeyCredential.id,
      rawId: publicKeyCredential.id,
      type: publicKeyCredential.type as PublicKeyCredentialType,
      // response: authenticatorAssertionResponse,
      response: {
        authenticatorData: arrayBufferToBase64url(
          authenticatorAssertionResponse.authenticatorData
        ),
        clientDataJSON: arrayBufferToBase64url(
          publicKeyCredential.response.clientDataJSON
        ),
        signature: arrayBufferToBase64url(authenticatorAssertionResponse.signature),
        userHandle: arrayBufferToBase64url(authenticatorAssertionResponse.userHandle!),
      },
      clientExtensionResults: publicKeyCredential.getClientExtensionResults(),
    };

    // サーバーにレスポンスボディを送信
    const result = await fetch("/api/signin-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // サーバーで生成したチャレンジをヘッダーに含める
        Challenge: base64url.encode(options.challenge),
      },
      body: JSON.stringify(responseJSON),
    });

    alert(`認証に${(await result.json()).success ? "成功" : "失敗"}しました`);
    return true

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('AbortError: Fetch request aborted', error, abortController?.signal);
      return
    }
    console.error(error);
  }
}


async function isWebAuthnEnabled(): Promise<boolean> {
  if (
    // 1.WebAuthnが有効かどうかを判定する
    window.PublicKeyCredential &&
    // 2.ユーザーがプラットフォーム認証器（例えば、指紋認証や顔認証などのバイオメトリクス、またはPINなど）を利用可能かどうかを判定
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
    // 3.ユーザーが条件付きのユーザー認証を利用可能かどうかを判定
    PublicKeyCredential.isConditionalMediationAvailable
  ) {
    try {
      const results = await Promise.all([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        PublicKeyCredential.isConditionalMediationAvailable(),
      ]);
      return results.every((r) => r === true);
    } catch (e) {
      console.error(e);
      return false;
    }
  } else {
    return false;
  }
}


async function registerCredential(email: string) {
  const res = await fetch("/api/register-request", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  const options = await res.json();

  // base64をデコードしてArrayBufferに変換する必要がある
  options.user.id = Buffer.from(options.user.id)
  options.challenge = Buffer.from(options.challenge)
  console.log(options)

  try {
    // ユーザーが認証を拒否(キャンセルされたときは、例外がスローされる)
    const credential = await navigator.credentials.create({
      publicKey: options,
    });
    if (!credential) {
      console.error("Credential の作成に失敗しました");
      return;
    }
    console.log("credential:", credential);
    // 公開鍵認証情報をサーバーへ送信する
    const publicKeyCredential = credential as PublicKeyCredential;
    const authResponse =
      publicKeyCredential.response as AuthenticatorAttestationResponse;
    // simplewebauthnのRegistrationResponseJSONを作成してサーバーに送信
    const responseJSON: RegistrationResponseJSON = {
      id: publicKeyCredential.id,
      rawId: publicKeyCredential.id,
      type: publicKeyCredential.type as PublicKeyCredentialType,
      clientExtensionResults: publicKeyCredential.getClientExtensionResults(),
      response: {
        // ArrayBuffer型のデータはbase64urlエンコードする
        attestationObject: base64url.encode(Buffer.from(authResponse.attestationObject)),
        clientDataJSON: base64url.encode(Buffer.from(authResponse.clientDataJSON)),
        transports:
          authResponse.getTransports() as AuthenticatorTransportFuture[],
      },
    };
    // 認証器のアタッチメントが存在する場合はレスポンスボディに追加
    if (publicKeyCredential.authenticatorAttachment) {
      responseJSON.authenticatorAttachment =
        publicKeyCredential.authenticatorAttachment as AuthenticatorAttachment;
    }
    // サーバーにレスポンスボディを送信
    await fetch("/api/register-response", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // サーバーで生成したチャレンジをヘッダーに含める
        Challenge: base64url.encode(options.challenge)
      },
      body: JSON.stringify(responseJSON),
    });
  } catch (e) {
    console.error("Credential の作成に失敗しました", e);
  }
}

