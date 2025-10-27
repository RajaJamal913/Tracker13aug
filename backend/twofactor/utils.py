import pyotp
import base64
from typing import Tuple

def generate_base32_secret() -> str:
    return pyotp.random_base32()

def get_totp(secret: str):
    return pyotp.TOTP(secret)

def make_otpauth_url(secret: str, user_email: str, issuer: str = "MyProject") -> str:
    # otp auth url that authenticator apps understand
    return pyotp.totp.TOTP(secret).provisioning_uri(name=user_email, issuer_name=issuer)

def qrcode_data_uri_from_otpauth(otpauth_url: str) -> str:
    """
    Return a data:image/png;base64,.... string if qrcode is installed.
    If qrcode is not installed, raise ImportError to be handled by caller.
    """
    import io
    import qrcode
    buf = io.BytesIO()
    img = qrcode.make(otpauth_url)
    img.save(buf, format="PNG")
    buf.seek(0)
    data = base64.b64encode(buf.read()).decode("ascii")
    return f"data:image/png;base64,{data}"
