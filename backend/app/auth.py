"""Cryptographic password hashing and session token helpers for Process Architect."""
import hashlib
import hmac
import secrets


PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    )
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    """Verify a plaintext password against a stored PBKDF2 hash in constant time."""
    try:
        algo, iter_str, salt, expected_hex = stored_hash.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_str)
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        return hmac.compare_digest(dk.hex(), expected_hex)
    except Exception:
        return False


def generate_session_token() -> str:
    """Generate a high-entropy URL-safe session token."""
    return secrets.token_urlsafe(32)
