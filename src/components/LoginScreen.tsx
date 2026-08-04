import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function LoginScreen() {
  const { clientId, allowedConfigured, error, signInWithCredential, clearError } = useAuth()
  const [popupError, setPopupError] = useState<string | null>(null)

  const handleSuccess = (response: CredentialResponse) => {
    clearError()
    setPopupError(null)
    if (!response.credential) {
      return
    }
    signInWithCredential(response.credential)
  }

  const handleError = () => {
    setPopupError('Google 로그인에 실패했습니다. 다시 시도해 주세요.')
  }

  const displayError = error ?? popupError

  return (
    <div className="login-screen">
      <div className="login-screen__atmosphere" aria-hidden />
      <div className="login-screen__card">
        <p className="brand">ReelBudget</p>
        <h1 className="login-screen__title">로그인이 필요합니다</h1>
        <p className="login-screen__sub muted">
          개인 예산 데이터 보호를 위해 Google 계정으로만 접속할 수 있습니다.
        </p>

        {!clientId ? (
          <div className="login-screen__setup" role="alert">
            <ShieldAlert size={20} aria-hidden />
            <div>
              <strong>Google 로그인 설정 필요</strong>
              <p className="muted">
                프로젝트 루트에 <code>.env</code> 파일을 만들고 아래 값을 설정하세요.
              </p>
              <pre className="login-screen__code">{`VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
VITE_ALLOWED_EMAILS=your@gmail.com`}</pre>
              <p className="muted login-screen__hint">
                Google Cloud Console → OAuth 2.0 클라이언트 ID (웹) 생성 후
                승인된 JavaScript 원본에 <code>http://localhost:5173</code>을
                추가하세요.
              </p>
            </div>
          </div>
        ) : !allowedConfigured ? (
          <div className="login-screen__setup" role="alert">
            <ShieldAlert size={20} aria-hidden />
            <div>
              <strong>허용 이메일 설정 필요</strong>
              <p className="muted">
                <code>VITE_ALLOWED_EMAILS</code>에 본인 Gmail 주소를 넣어 주세요.
              </p>
            </div>
          </div>
        ) : (
          <div className="login-screen__actions">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              text="signin_with"
              shape="rectangular"
              theme="outline"
              size="large"
            />
          </div>
        )}

        {displayError && (
          <p className="login-screen__error" role="alert">
            {displayError}
          </p>
        )}
      </div>
    </div>
  )
}
